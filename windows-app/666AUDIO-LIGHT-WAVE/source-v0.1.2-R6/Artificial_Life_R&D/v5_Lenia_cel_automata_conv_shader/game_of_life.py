# game_of_life.py

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
# LENIA SIMULATOR (TRUE MULTIDIMENSIONAL / MULTI-RING / MULTI-CHANNEL)
# =========================================================================

class MultiChannelLeniaSimulator:
    def __init__(self, width, height, device, pure_random=False):
        self.W = width
        self.H = height
        self.device = device
        self.pure_random = pure_random
        self.C = 3  # 3 Dimensions / Channels (R, G, B)

        self.R = 25.0        
#        self.R = 35.0
        self.dt = 0.1

        # Base multi-ring configurations for each of the 3 channels
        self.base_channel_betas = [
            torch.tensor([1.0], device=device, dtype=torch.float32),               # Channel 0 (Red)
            torch.tensor([1.0, 0.5], device=device, dtype=torch.float32),          # Channel 1 (Green)
            torch.tensor([0.5, 1.0, 0.25], device=device, dtype=torch.float32)     # Channel 2 (Blue)
        ]
        self.channel_betas = [b.clone() for b in self.base_channel_betas]

        # Base mu and sigma per channel: shape (3, 1, 1) for broadcasting
        self.base_mu = torch.tensor([0.15, 0.18, 0.14], device=device).view(3, 1, 1)
        self.base_sigma = torch.tensor([0.017, 0.020, 0.015], device=device).view(3, 1, 1)
        
        self.mu = self.base_mu.clone()
        self.sigma = self.base_sigma.clone()

        # Cross-channel interaction matrix (3x3): How much Channel X's neighborhood affects Channel Y
        self.base_interaction = torch.tensor([
            [1.0, 0.2, -0.1],  # Red likes Red, helped by Green, inhibited by Blue
            [-0.1, 1.0, 0.2],  # Green likes Green, helped by Blue, inhibited by Red
            [0.2, -0.1, 1.0]   # Blue likes Blue, helped by Red, inhibited by Green
        ], device=device)
        self.base_interaction = self.base_interaction / self.base_interaction.abs().sum(dim=1, keepdim=True)
        self.interaction = self.base_interaction.clone()

        # Initialize state tensor with shape (3, H, W)
        self.A = torch.rand((self.C, height, width), device=device)
        if pure_random:
            self.A *= 0.5
        else:
            y, x = torch.meshgrid(torch.arange(height, device=device), torch.arange(width, device=device), indexing='ij')
            rng = random.Random(42)
            self.A.fill_(0.0)

            for _ in range(8):
#                cx = rng.uniform(width * 0.25, width * 0.75)
#                cy = rng.uniform(height * 0.25, height * 0.75)
#                dist = torch.sqrt((x - cx)**2 + (y - cy)**2)
#                blob_mask = dist < (self.R * 1.8)
#                self.A[:, blob_mask] = torch.rand((self.C, blob_mask.sum()), device=device) * 0.75

                cx = rng.uniform(width * 0.15, width * 0.65)
                cy = rng.uniform(height * 0.15, height * 0.65)
                dist = torch.sqrt((x - cx)**2 + (y - cy)**2)
                blob_mask = dist < (self.R * 1.8)
                self.A[:, blob_mask] = torch.rand((self.C, blob_mask.sum()), device=device) * 0.75

        
        # Precompute ALL ring masses and rFFTs strictly once at startup!
        self.ring_masses, self.ring_ffts = self.precompute_ring_ffts()

    def precompute_ring_ffts(self):
        y, x = torch.meshgrid(torch.arange(self.H, device=self.device), 
                              torch.arange(self.W, device=self.device), indexing='ij')
        x = x - self.W // 2
        y = y - self.H // 2
        r = torch.sqrt(x**2 + y**2) / self.R

        ring_masses, ring_ffts = [], []

        for betas in self.base_channel_betas:
            num_rings = len(betas)
            br = r * num_rings
            ring_idx = torch.floor(br).long()
            local_r = br - ring_idx

            masses, ffts = [], []
            for i in range(num_rings):
                K_i = torch.zeros((self.H, self.W), dtype=torch.float32, device=self.device)
                mask = (ring_idx == i) & (local_r > 1e-5) & (local_r < 1.0 - 1e-5)
                u = local_r[mask]
                
                K_i[mask] = torch.exp(4.0 - 1.0 / (u * (1.0 - u)))

                masses.append(K_i.sum())
                # Use real-valued FFT for massive performance gains
                ffts.append(torch.fft.rfft2(torch.fft.ifftshift(K_i)))

            ring_masses.append(torch.stack(masses))
            ring_ffts.append(torch.stack(ffts))

        return ring_masses, ring_ffts

    @torch.no_grad()
    def step(self, nn_vec, inject_trigger):
        if not self.pure_random:
            # nn_vec[0:3] -> mu modulations
            # nn_vec[3:6] -> sigma modulations
            # nn_vec[6:12] -> beta (multi-ring weight) modulations (1+2+3 = 6 rings total)
            # nn_vec[12:15] -> cross-interaction matrix modulations

            mu_mod = torch.tensor(nn_vec[0:3], device=self.device).view(3, 1, 1)
            sig_mod = torch.tensor(nn_vec[3:6], device=self.device).view(3, 1, 1)

            target_mu = self.base_mu + torch.tanh(mu_mod) * (self.base_mu * 0.20)
            target_sigma = self.base_sigma + torch.tanh(sig_mod) * (self.base_sigma * 0.25)
            self.mu = self.mu * 0.95 + target_mu * 0.05
            self.sigma = self.sigma * 0.95 + target_sigma * 0.05

            # Dynamically morph the ring shells
            beta_signals = nn_vec[6:12]
            idx = 0
            for c in range(self.C):
                num_rings = len(self.base_channel_betas[c])
                ring_sigs = torch.tensor(beta_signals[idx:idx+num_rings], device=self.device)
                idx += num_rings
                
                target_betas = torch.clamp(self.base_channel_betas[c] + 0.25 * torch.tanh(ring_sigs), 0.05, 1.0)
                target_betas = target_betas / target_betas.max()
                self.channel_betas[c] = self.channel_betas[c] * 0.95 + target_betas * 0.05

            # Dynamically morph species-vs-species rules
            inter_mod = torch.zeros((3, 3), device=self.device)
            inter_mod[0, 1] = math.tanh(nn_vec[12]) * 0.2
            inter_mod[1, 2] = math.tanh(nn_vec[13]) * 0.2
            inter_mod[2, 0] = math.tanh(nn_vec[14]) * 0.2
            
            target_inter = self.base_interaction + inter_mod
            target_inter = target_inter / target_inter.abs().sum(dim=1, keepdim=True)
            self.interaction = self.interaction * 0.95 + target_inter * 0.05

        # 1. Combine precomputed ring FFTs instantaneously
        K_ffts = []
        for c in range(self.C):
            betas = self.channel_betas[c]
            masses = self.ring_masses[c]
            ffts = self.ring_ffts[c]
            
            total_mass = torch.sum(betas * masses).clamp(min=1e-8)
            K_fft = torch.sum(betas[:, None, None] * ffts, dim=0) / total_mass
            K_ffts.append(K_fft)
            
        K_fft_stacked = torch.stack(K_ffts, dim=0) # Shape: (3, H, W//2 + 1)

        # 2. Convolution via batched Real FFT (Massively optimized)
        A_fft = torch.fft.rfft2(self.A)
        U_raw = torch.fft.irfft2(A_fft * K_fft_stacked, s=(self.H, self.W)) # Shape: (3, H, W)

        # 3. Mix potentials across channels
        U = torch.einsum('ij,jhw->ihw', self.interaction, U_raw)

        # 4. Continuous Growth Function
        G = 2.0 * torch.exp(-((U - self.mu)**2) / (2.0 * self.sigma**2)) - 1.0
        self.A = torch.clamp(self.A + self.dt * G, 0.0, 1.0)

        # 5. NN Trigger Fluid Injection
        if inject_trigger > 0.5:
            cx = self.W * (math.sin(nn_vec[0] * 2.0) * 0.5 + 0.5)
            cy = self.H * (math.cos(nn_vec[1] * 3.0) * 0.5 + 0.5)
            y, x = torch.meshgrid(torch.arange(self.H, device=self.device), torch.arange(self.W, device=self.device), indexing='ij')
            dist = torch.sqrt((x - cx)**2 + (y - cy)**2)
            injection = torch.exp(-(dist**2) / (2.0 * 15.0**2))
            self.A = torch.clamp(self.A + injection.unsqueeze(0), 0.0, 1.0)

        # 6. Pack 4 Channels (R, G, B = Species | A = Combined Potential halo)
        mean_U = U.mean(dim=0)
        out = torch.cat([self.A, mean_U.unsqueeze(0)], dim=0) # Shape: (4, H, W)
        
        # Permute for OpenGL format (H, W, 4)
        out = out.permute(1, 2, 0).contiguous()
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

    generated_norm = input_seq.squeeze().cpu().tolist()
    return generated_norm[len(seed_norm):len(seed_norm)+length]


# =========================================================================
# BACKGROUND THREAD FOR INFERENCE
# =========================================================================
NN_QUEUE = queue.Queue()
STOP_EVENT = threading.Event()

def model_worker_thread(checkpoint_path, patch_size, embed_size, temp, pure_random, random_stream):
    if pure_random:
        return 

    device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
    
    if random_stream:
        print("Starting in RANDOM STREAM baseline mode. Bypassing Neural Network...")
        while not STOP_EVENT.is_set():
            if NN_QUEUE.qsize() < 1000:
                for _ in range(500):
                    NN_QUEUE.put(random.gauss(0.0, 1.0))
            else:
                time.sleep(0.1)
        return

    print(f"Loading Model on {device}...")
    if not checkpoint_path or not os.path.exists(checkpoint_path):
        print(f"Error: Checkpoint '{checkpoint_path}' not found. Please provide a valid model or select a random mode flag.")
        STOP_EVENT.set()
        return

    checkpoint = torch.load(checkpoint_path, map_location=device, weights_only=True)
    mean, std = checkpoint['mean'], checkpoint['std']
    
    model = PatchedContinuousTransformer(patch_size=patch_size, embed_size=embed_size).to(device)
    model.load_state_dict(checkpoint['model_state_dict'])
    model.eval()
    
    print("Model ready. Generating stream...")

    while not STOP_EVENT.is_set():
        if NN_QUEUE.qsize() < 1000:
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
        
        prog_main, vao_main = shader_manager.load_shadertoy(main_ctx, "game_of_life.txt")
        
        SIM_WIDTH = SCREEN_WIDTH
        SIM_HEIGHT = SCREEN_HEIGHT
        simulator = MultiChannelLeniaSimulator(SIM_WIDTH, SIM_HEIGHT, device, pure_random=args.pure_random)
        
        # Upgraded to 4-channels to pack RGB species AND Alpha convolution fields
        sim_tex = main_ctx.texture((SIM_WIDTH, SIM_HEIGHT), 4, dtype='f4')
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

            # Need 15 parameters per frame to dynamically warp the ecosystem rules
            dim_needed = 15
            nn_vec = []
            if NN_QUEUE.qsize() >= dim_needed:
                for _ in range(dim_needed):
                    nn_vec.append(NN_QUEUE.get_nowait())
            else:
                nn_vec = [0.0] * dim_needed
            
            keys = pygame.key.get_pressed()
            nn_trigger = 1.0 if keys[pygame.K_SPACE] else 0.0

            # -------------------------------------------------------------
            # PASS 1: PYTORCH FFT SIMULATION UPDATE
            # -------------------------------------------------------------
            sim_bytes = simulator.step(nn_vec, nn_trigger)
            sim_tex.write(sim_bytes)

            # -------------------------------------------------------------
            # PASS 2: RENDER MAIN IMAGE
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
    parser.add_argument('--checkpoint', type=str, default="", help="Path to the .pth model checkpoint")
    parser.add_argument('--patch_size', type=int, default=16)
    parser.add_argument('--embed_size', type=int, default=1024)
    parser.add_argument('--temperature', type=float, default=1.0)
    parser.add_argument('--pure_random', action='store_true', help="Use static random generation (bypass all streams)")
    parser.add_argument('--random_stream', action='store_true', help="Use a Gaussian random stream instead of NN")
    args = parser.parse_args()

    worker = threading.Thread(
        target=model_worker_thread, 
        args=(args.checkpoint, args.patch_size, args.embed_size, args.temperature, args.pure_random, args.random_stream),
        daemon=True
    )
    worker.start()

    # Pre-warm stream 
    if not args.pure_random and not args.random_stream:
        while NN_QUEUE.empty() and not STOP_EVENT.is_set():
            time.sleep(0.1)

    if not STOP_EVENT.is_set():
        play_fullscreen(args)
        
    sys.exit()