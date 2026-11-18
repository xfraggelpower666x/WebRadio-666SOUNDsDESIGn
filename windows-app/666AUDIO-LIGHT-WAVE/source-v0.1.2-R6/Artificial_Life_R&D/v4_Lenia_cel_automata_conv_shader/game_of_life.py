import shader_manager

import pygame
import sys
import os
import time
import ctypes
import traceback
import random
import math
import argparse
import threading
import queue
import numpy as np

import torch
import torch.nn as nn
import moderngl

# Enable TF32 for PyTorch speedup
torch.backends.cuda.matmul.allow_tf32 = True
torch.backends.cudnn.allow_tf32 = True

if sys.stdout.encoding != 'utf-8':
    sys.stdout.reconfigure(encoding='utf-8')

os.environ['SDL_VIDEO_MINIMIZE_ON_FOCUS_LOSS'] = '0'


# =========================================================================
# LENIA SIMULATOR (FFT-BASED)
# =========================================================================

class LeniaSimulator:
    def __init__(self, width, height, device, pure_random=False):
        self.W = width
        self.H = height
        self.device = device
        self.pure_random = pure_random
        
        # Orbium default parameters
        self.R = 25.0
        self.mu = 0.15
        self.sigma = 0.017
        self.dt = 0.1

        if pure_random:
            # PURE RANDOM INIT: Fill the entire screen with uniform noise
            # We scale it by 0.5 so it doesn't instantly overpopulate and crash the ecosystem
            self.A = torch.rand((height, width), device=device) * 0.5
        else:        
            # Initialize state with a central noisy blob
            self.A = torch.rand((height, width), device=device)
            y, x = torch.meshgrid(torch.arange(height, device=device), torch.arange(width, device=device), indexing='ij')
            dist = torch.sqrt((x - width//2)**2 + (y - height//2)**2)
            self.A[dist > min(width, height) // 4] = 0.0
        
        self.H_hist = torch.zeros((height, width), device=device)
        self.K_fft = self.compute_kernel()

    def compute_kernel(self):
        """Creates the Lenia spatial convolution kernel and stores its FFT."""
        y, x = torch.meshgrid(torch.arange(self.H, device=self.device), 
                              torch.arange(self.W, device=self.device), indexing='ij')
        x = x - self.W // 2
        y = y - self.H // 2
        r = torch.sqrt(x**2 + y**2) / self.R

        K = torch.zeros((self.H, self.W), device=self.device)
        mask = (r > 0.0) & (r < 1.0)
        
        # Bell-shaped Lenia core function
        K[mask] = torch.exp(4.0 - 1.0 / (r[mask] * (1.0 - r[mask])))
        K = K / torch.sum(K) 
        
        # Shift and compute FFT once
        return torch.fft.fft2(torch.fft.ifftshift(K))

    def step(self, nn_value, inject_trigger):
        if not self.pure_random:
            # 1. NN "Evolves" Species: Modulate mu & sigma smoothly based on Neural input stream
            target_mu = 0.15 + (math.sin(nn_value * 2.1) * 0.05)       # Ranges roughly [0.10, 0.20]
            target_sigma = 0.017 + (math.cos(nn_value * 1.7) * 0.007)  # Ranges roughly [0.010, 0.024]
        
            # Add inertia so the species smoothly shifts rather than jarringly breaks
            self.mu = self.mu * 0.95 + target_mu * 0.05
            self.sigma = self.sigma * 0.95 + target_sigma * 0.05

        # (If pure_random is True, self.mu and self.sigma remain locked at 0.15 and 0.017)

        # 2. Convolution via Fast Fourier Transform (Instant gigantic neighborhoods!)
        A_fft = torch.fft.fft2(self.A)
        U = torch.real(torch.fft.ifft2(A_fft * self.K_fft))
        
        # 3. Apply Continuous Growth Function
        G = 2.0 * torch.exp(-((U - self.mu)**2) / (2.0 * self.sigma**2)) - 1.0
        
        # 4. Integrate Step
        self.A = torch.clamp(self.A + self.dt * G, 0.0, 1.0)

        # 5. NN Trigger Fluid Injection
        if inject_trigger > 0.5:
            cx = self.W * (math.sin(nn_value * 2.0) * 0.5 + 0.5)
            cy = self.H * (math.cos(nn_value * 3.0) * 0.5 + 0.5)
            y, x = torch.meshgrid(torch.arange(self.H, device=self.device), torch.arange(self.W, device=self.device), indexing='ij')
            dist = torch.sqrt((x - cx)**2 + (y - cy)**2)
            injection = torch.exp(-(dist**2) / (2.0 * 15.0**2))
            self.A = torch.clamp(self.A + injection, 0.0, 1.0)

        # 6. Decay History for visual trailing
        self.H_hist = self.H_hist * 0.95 + self.A * 0.05
        
        # 7. Stack Channels for Shader (Red = Alive, Green = History, Blue = Empty)
        out = torch.stack([self.A, self.H_hist, torch.zeros_like(self.A)], dim=-1)
        
        return out.cpu().numpy().astype('float32').tobytes()


# =========================================================================
# NEURAL NETWORK ARCHITECTURE & GENERATION
# =========================================================================

class PatchedContinuousTransformer(nn.Module):
    def __init__(self, patch_size=16, embed_size=256, num_heads=8, num_layers=8):
        super().__init__()
        self.patch_size = patch_size
        self.embed_size = embed_size
        self.input_proj = nn.Linear(patch_size, embed_size)
        encoder_layer = nn.TransformerEncoderLayer(d_model=embed_size, nhead=num_heads, batch_first=True, norm_first=True)
        self.transformer = nn.TransformerEncoder(encoder_layer, num_layers=num_layers)
        self.fc = nn.Linear(embed_size, patch_size)
        self.dropout = nn.Dropout(0.1)

    def _get_positional_encoding(self, num_patches, d_model, device):
        position = torch.arange(0, num_patches, dtype=torch.float, device=device).unsqueeze(1)
        div_term = torch.exp(torch.arange(0, d_model, 2, dtype=torch.float, device=device) * (-math.log(10000.0) / d_model))
        pe = torch.zeros(num_patches, d_model, device=device)
        pe[:, 0::2] = torch.sin(position * div_term)
        pe[:, 1::2] = torch.cos(position * div_term)
        return pe.unsqueeze(0)

    def generate_mask(self, num_patches, device):
        return torch.triu(torch.ones(num_patches, num_patches, device=device) * float('-inf'), diagonal=1)

    def forward(self, x):
        batch_size, seq_len, _ = x.size() 
        num_patches = seq_len // self.patch_size
        x = x.view(batch_size, num_patches, self.patch_size)
        x = self.input_proj(x)
        pe = self._get_positional_encoding(num_patches, self.embed_size, x.device)
        x = x + pe
        x = self.dropout(x)
        tgt_mask = self.generate_mask(num_patches, x.device)
        out = self.transformer(x, mask=tgt_mask, is_causal=True)
        out = self.fc(out)
        out = out.view(batch_size, seq_len, 1)
        return out

def generate_patched_floats(model, seed_nums, mean, std, patch_size, length=500, temperature=1.0, device='cpu'):
    """Generates continuous floats without converting to integer bounds."""
    model.eval()
    seed_norm = [(float(n) - mean) / std for n in seed_nums]
    
    while len(seed_norm) % patch_size != 0:
        seed_norm.insert(0, 0.0)
        
    input_seq = torch.tensor(seed_norm, dtype=torch.float32, device=device).unsqueeze(0).unsqueeze(-1)
    num_iterations = math.ceil(length / patch_size)
    
    with torch.no_grad():
        for _ in range(num_iterations):
            max_context = 1024 
            context = input_seq[:, -max_context:, :]
            output = model(context)
            next_patch = output[:, -patch_size:, :]
            
            if temperature > 0.0:
                noise = torch.randn_like(next_patch) * (temperature * 0.1)
                next_patch = next_patch + noise

            input_seq = torch.cat((input_seq, next_patch), dim=1)

    # Return the raw normalized floats directly for Shader consumption
    generated_norm = input_seq.squeeze().cpu().tolist()
    return generated_norm[len(seed_norm):len(seed_norm)+length]


# =========================================================================
# BACKGROUND THREAD FOR INFERENCE
# =========================================================================
NN_QUEUE = queue.Queue()
STOP_EVENT = threading.Event()

def model_worker_thread(checkpoint_path, patch_size, embed_size, temp, pure_random):

    if pure_random:
        # In baseline mode, we don't need the neural network or queue at all
        return 

    """Runs continuously in the background filling a queue with Float Data"""
    device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
    print(f"Loading Model on {device}...")

    """if pure_random:
        print("Starting in PURE RANDOM baseline mode. Bypassing Neural Network...")
        while not STOP_EVENT.is_set():
            if NN_QUEUE.qsize() < 200:
                # Generate raw normal Gaussian noise (mean 0, std 1)
                for _ in range(500):
                    NN_QUEUE.put(random.gauss(0.0, 1.0))
            else:
                time.sleep(0.1)
        return # Exit thread normally"""

    checkpoint = torch.load(checkpoint_path, map_location=device, weights_only=True)
    mean, std = checkpoint['mean'], checkpoint['std']
    
    model = PatchedContinuousTransformer(patch_size=patch_size, embed_size=embed_size).to(device)
    model.load_state_dict(checkpoint['model_state_dict'])
    model.eval()
    
    print("Model ready. Generating stream...")

    while not STOP_EVENT.is_set():
        # Keep a healthy buffer of floats. If queue drops below 200, generate 500 more.
        if NN_QUEUE.qsize() < 200:
            seed_nums = [random.randint(1, 5000) for _ in range(patch_size)]
            new_floats = generate_patched_floats(
                model=model, 
                seed_nums=seed_nums, 
                mean=mean, 
                std=std, 
                patch_size=patch_size, 
                length=500, 
                temperature=temp, 
                device=device
            )
            for f in new_floats:
                NN_QUEUE.put(f)
        else:
            time.sleep(0.1)


# =========================================================================
# MAIN RENDER LOOP
# =========================================================================

def play_fullscreen(args):
    try:
        try: ctypes.windll.user32.SetProcessDPIAware()
        except AttributeError: pass

        pygame.init()
        screen_info = pygame.display.Info()
        SCREEN_WIDTH = screen_info.current_w
        SCREEN_HEIGHT = screen_info.current_h
        
        flags = pygame.OPENGL | pygame.DOUBLEBUF | pygame.FULLSCREEN
        pygame.display.set_caption("Neural Lenia")
        screen = pygame.display.set_mode((SCREEN_WIDTH, SCREEN_HEIGHT), flags, vsync=1)

        main_ctx = moderngl.create_context()
        device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
        
        # Load Main Display Shader (We no longer need Buffer A!)
        prog_main, vao_main = shader_manager.load_shadertoy(main_ctx, "game_of_life.txt")
        
        # Setup Simulation Texture
        # We run the simulation at half-res to ensure stable 60FPS while computing FFTs
        SIM_WIDTH = SCREEN_WIDTH # // 2
        SIM_HEIGHT = SCREEN_HEIGHT # // 2
        simulator = LeniaSimulator(SIM_WIDTH, SIM_HEIGHT, device, pure_random=args.pure_random)
        
        # Create a float32 texture to receive the PyTorch tensor directly
        sim_tex = main_ctx.texture((SIM_WIDTH, SIM_HEIGHT), 3, dtype='f4')
        sim_tex.filter = (moderngl.LINEAR, moderngl.LINEAR)

        clock = pygame.time.Clock()
        running = True
        start_time = time.perf_counter()
        iFrame = 0

        print(f"Starting Lenia Evolution at Sim Res {SIM_WIDTH}x{SIM_HEIGHT}...")

        while running:
            current_time = time.perf_counter() - start_time

            for event in pygame.event.get():
                if event.type == pygame.QUIT:
                    running = False
                elif event.type == pygame.KEYDOWN:
                    if event.key == pygame.K_ESCAPE or event.key == pygame.K_x:
                        running = False

            if not running: break

            # Process Neural Data
            current_nn_value = 0.0
            if not NN_QUEUE.empty():
                current_nn_value = NN_QUEUE.get_nowait()
            
            keys = pygame.key.get_pressed()
            nn_trigger = 1.0 if keys[pygame.K_SPACE] else 0.0

            # -------------------------------------------------------------
            # PASS 1: PYTORCH FFT SIMULATION UPDATE
            # -------------------------------------------------------------
            sim_bytes = simulator.step(current_nn_value, nn_trigger)
            sim_tex.write(sim_bytes)

            # -------------------------------------------------------------
            # PASS 2: RENDER MAIN IMAGE (Map Tensor to Screen)
            # -------------------------------------------------------------
            main_ctx.screen.use()
            main_ctx.clear(0.0, 0.0, 0.0)

            sim_tex.use(location=0)
            shader_manager.set_uniform(prog_main, 'iChannel0', 0)
            shader_manager.set_uniform(prog_main, 'iResolution', (SCREEN_WIDTH, SCREEN_HEIGHT, 1.0))
            shader_manager.set_uniform(prog_main, 'iTime', current_time)
            shader_manager.set_uniform(prog_main, 'iFrame', iFrame)

            vao_main.render(moderngl.TRIANGLE_STRIP)

            pygame.display.flip()
            iFrame += 1
            clock.tick(60)

        STOP_EVENT.set()
        sim_tex.release()
        main_ctx.release()
        pygame.quit()

    except Exception as e:
        STOP_EVENT.set()
        traceback.print_exc()

if __name__ == '__main__':
    parser = argparse.ArgumentParser(description="Neural Lenia Evolution")
    parser.add_argument('--checkpoint', type=str, required=True, help="Path to the .pth model checkpoint")
    parser.add_argument('--patch_size', type=int, default=16)
    parser.add_argument('--embed_size', type=int, default=1024)
    parser.add_argument('--temperature', type=float, default=1.0)
    parser.add_argument('--pure_random', action='store_true', help="Use pure random noise instead of Neural Network")
    args = parser.parse_args()

    worker = threading.Thread(
        target=model_worker_thread, 
        args=(args.checkpoint, args.patch_size, args.embed_size, args.temperature, args.pure_random),
        daemon=True
    )
    worker.start()

    if not args.pure_random:
        while NN_QUEUE.empty():
            time.sleep(0.1)

    play_fullscreen(args)
    sys.exit()