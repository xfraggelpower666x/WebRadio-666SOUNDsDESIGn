# torch.load thing issue: https://aistudio.google.com/prompts/1zrRuUEOFWdsDBkQP4T2R8AAIYc8md8b1

# conda create -n llm-trainer python=3.9.12
# conda activate llm-trainer
# conda install pytorch torchvision torchaudio pytorch-cuda=12.4 -c pytorch -c nvidia
# python -c "import torch; print(torch.__version__); print(torch.cuda.is_available())"
#_____________________________________________________________________________________

#________________________
# RTX 3060 >>> ~8GB VRAM <<< @58% POWER LIMIT ~ 1000/24595 = 10 minutes =~ 4 hours / epoch
# python LOCAL_v5_OPTIMIZED_trainer.py --input_file FINAL_TRAINING_dataset_0-120k.txt --epochs 100 --batch_size 512 --embed_size 512 --seq_length 1024 --patch_size 16 --checkpoint model_v5.pth --checkpoint_interval 1 --val_split 0.1 --val_every 1 --early_stop 10 --seed 123

# RTX 3060 >>> ~12GB VRAM <<< @58% POWER LIMIT ~ 500/24595 = 10 minutes =~ 8 hours / epoch
# python RUNPOD_v5_OPTIMIZED_trainer.py --input_file FINAL_TRAINING_dataset_0-120k.txt --epochs 100 --batch_size 512 --embed_size 1024 --seq_length 1024 --patch_size 16 --checkpoint model_v5.pth --checkpoint_interval 1 --val_split 0.1 --val_every 1 --early_stop 10 --seed 123


#________________________
# RTX 5080 >>> 10 GB VRAM <<< 1200/26360 = 10 minutes =~ 3,5 hours / epoch
# python RUNPOD_v5_OPTIMIZED_trainer.py --input_file FINAL_TRAINING_dataset_0-120k.txt --epochs 100 --batch_size 512 --embed_size 1024 --seq_length 1024 --patch_size 16 --checkpoint model_v5.pth --checkpoint_interval 1 --val_split 0.1 --val_every 1 --early_stop 10 --seed 123

# RTX 5080 >>> 13 GB VRAM <<< 1200/21088 = 10 minutes =~ 3,0 hours / epoch
# python RUNPOD_v5_OPTIMIZED_trainer.py --input_file FINAL_TRAINING_dataset_0-120k.txt --epochs 100 --batch_size 640 --embed_size 1024 --seq_length 1024 --patch_size 16 --checkpoint model_v5.pth --checkpoint_interval 1 --val_split 0.1 --val_every 1 --early_stop 10 --seed 123


### 2026-10-14: TRY THIS NEXT 10 GB >> 15 GB OR SO (MIGHT BE TIGHT ON 16GB)
# python RUNPOD_v5_OPTIMIZED_trainer.py --input_file FINAL_TRAINING_dataset_0-120k.txt --epochs 100 --batch_size 768 --embed_size 1024 --seq_length 1024 --patch_size 16 --checkpoint model_v5.pth --checkpoint_interval 1 --val_split 0.1 --val_every 1 --early_stop 10 --seed 123


# __IF_RTX_5090 >>> --batch_size 1536 >> SHOULD BE ~30 GB | OTHERWISE TRY 1408
# python RUNPOD_v5_OPTIMIZED_trainer.py --input_file FINAL_TRAINING_dataset_0-120k.txt --epochs 100 --batch_size 640 --embed_size 1024 --seq_length 1024 --patch_size 16 --checkpoint model_v5.pth --checkpoint_interval 1 --val_split 0.1 --val_every 1 --early_stop 10 --seed 123



#   Validation MSE Loss: 1.0866
#   *** NEW BEST VAL LOSS: 1.0866 ***
# Epoch 1 took 11568.1s
# Epoch 1/100 | Train loss: 261.1968 | Val loss: 1.0866
#   Checkpoint saved (epoch 1)
#   >>> New best model saved (val loss 1.0866)

#   Validation MSE Loss: 0.9836
#   *** NEW BEST VAL LOSS: 0.9836 ***
# Epoch 2 took 11812.3s
# Epoch 2/100 | Train loss: 0.9957 | Val loss: 0.9836
#   Checkpoint saved (epoch 2)
#   >>> New best model saved (val loss 0.9836)
# Iteration: 1/21088


# RUNPOD MIGHT BE --batch_size 1024
# python RUNPOD_v5_OPTIMIZED_trainer.py --input_file FINAL_TRAINING_dataset_0-120k.txt --epochs 100 --batch_size 512 --embed_size 1024 --seq_length 4096 --patch_size 16 --checkpoint model_v5.pth --checkpoint_interval 1 --val_split 0.1 --val_every 1 --early_stop 10 --seed 123

import torch
import torch.nn as nn
import torch.optim as optim
from torch.utils.data import Dataset, DataLoader
import argparse
import os
import math
import time
import random
import numpy as np

# Enable TF32 for massive speedup on modern GPUs
torch.backends.cuda.matmul.allow_tf32 = True
torch.backends.cudnn.allow_tf32 = True

# Helper to save uncompiled weights safely
def get_clean_state_dict(model):
    return model._orig_mod.state_dict() if hasattr(model, '_orig_mod') else model.state_dict()

class EarlyStopping:
    def __init__(self, patience=7, delta=0.0, path='best_model.pth'):
        self.patience = patience
        self.delta = delta
        self.path = path
        self.best = None
        self.counter = 0
        self.early_stop = False

    def __call__(self, val_loss, model, optimizer, epoch, mean, std):
        if self.best is None or val_loss < self.best - self.delta:
            self.best = val_loss
            self.counter = 0
            torch.save({
                'epoch': epoch,
                'model_state_dict': get_clean_state_dict(model),
                'optimizer_state_dict': optimizer.state_dict(),
                'mean': float(mean),
                'std': float(std),
                'val_loss': val_loss
            }, self.path)
            print(f"  >>> New best model saved (val loss {val_loss:.4f})")
        else:
            self.counter += 1
            print(f"  EarlyStopping counter: {self.counter}/{self.patience}")
            if self.counter >= self.patience:
                self.early_stop = True

class PatchedContinuousDataset(Dataset):
    def __init__(self, numbers, seq_length, patch_size, normalization=None):
        self.seq_length = seq_length
        self.patch_size = patch_size
        print(f"PatchedDataset: seq_length: {seq_length} | patch_size: {patch_size}")

        if normalization is None:
            self.mean = float(np.mean(numbers))
            self.std = float(np.std(numbers)) or 1.0
        else:
            self.mean, self.std = normalization

        normalized_numbers = [(x - self.mean) / self.std for x in numbers]
        self.data = torch.tensor(normalized_numbers, dtype=torch.float32).unsqueeze(1)

    def __len__(self):
        # We need enough room to shift the target by a full patch_size
        return len(self.data) - self.seq_length - self.patch_size + 1

    def __getitem__(self, idx):
        # Target is now shifted by a FULL PATCH, not just 1 item!
        inputs = self.data[idx : idx + self.seq_length]
        targets = self.data[idx + self.patch_size : idx + self.seq_length + self.patch_size]
        return inputs, targets

class PatchedContinuousTransformer(nn.Module):
    def __init__(self, patch_size=16, embed_size=256, num_heads=8, num_layers=8):
        super().__init__()
        self.patch_size = patch_size
        self.embed_size = embed_size
        print(f"PatchedTransformer: patch_size: {patch_size} | embed_size: {embed_size} | num_heads: {num_heads} | num_layers: {num_layers}")
        
        # Project an entire patch of floats into embedding space
        self.input_proj = nn.Linear(patch_size, embed_size)

        encoder_layer = nn.TransformerEncoderLayer(d_model=embed_size, nhead=num_heads, batch_first=True, norm_first=True)
        self.transformer = nn.TransformerEncoder(encoder_layer, num_layers=num_layers)

        # Output predicts the entire next patch!
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
        # The mask operates on patches now, not individual tokens!
        return torch.triu(torch.ones(num_patches, num_patches, device=device) * float('-inf'), diagonal=1)

    def forward(self, x):
        batch_size, seq_len, _ = x.size() 
        
        if seq_len % self.patch_size != 0:
            raise ValueError(f"Sequence length ({seq_len}) must be divisible by patch_size ({self.patch_size})")
            
        num_patches = seq_len // self.patch_size
        
        # 1. Reshape sequence into patches
        x = x.view(batch_size, num_patches, self.patch_size)
        
        # 2. Forward pass (Notice how much less compute this uses!)
        x = self.input_proj(x)
        pe = self._get_positional_encoding(num_patches, self.embed_size, x.device)
        x = x + pe
        x = self.dropout(x)
        
        tgt_mask = self.generate_mask(num_patches, x.device)
        out = self.transformer(x, mask=tgt_mask, is_causal=True)
        
        # 3. Output prediction for the next patches
        out = self.fc(out) # Shape: [batch, num_patches, patch_size]
        
        # 4. Reshape back to flat sequence for easy loss calculation
        out = out.view(batch_size, seq_len, 1)
        return out

def generate_patched(model, seed_nums, mean, std, patch_size, length=200, temperature=1.0, device='cpu'):
    model.eval()
    seed_norm = [(float(n) - mean) / std for n in seed_nums]
    
    # Ensure seed is a multiple of patch_size by padding with the mean (0.0 in norm)
    while len(seed_norm) % patch_size != 0:
        seed_norm.insert(0, 0.0)
        
    input_seq = torch.tensor(seed_norm, dtype=torch.float32, device=device).unsqueeze(0).unsqueeze(-1)

    # We now loop fewer times, generating `patch_size` items at a time
    num_iterations = math.ceil(length / patch_size)
    
    with torch.no_grad():
        for _ in range(num_iterations):
            # Only feed the last `seq_length` items to avoid VRAM explosion
            # (Assuming seq_length was passed or hardcoded as 1024, adjust as needed)
            max_context = 1024 # Match your training seq_length
            context = input_seq[:, -max_context:, :]

            output = model(context)
            
            # Grab the last output PATCH (not just 1 item)
            next_patch = output[:, -patch_size:, :]
            
            if temperature > 0.0:
                noise = torch.randn_like(next_patch) * (temperature * 0.1)
                next_patch = next_patch + noise

            # Append the whole patch to the sequence
            input_seq = torch.cat((input_seq, next_patch), dim=1)

    generated_norm = input_seq.squeeze().cpu().tolist()
    # Strip away the initial seed to only return generated text
    generated_norm = generated_norm[len(seed_norm):len(seed_norm)+length]
    
    generated = [int(round((val * std) + mean)) for val in generated_norm]
    return ', '.join(map(str, generated))

def train(model, train_loader, val_loader, optimizer, criterion,
          device, epochs, checkpoint_path, checkpoint_interval=5,
          mean=0.0, std=1.0, val_every=1, early_stop_patience=None):
    
    start_epoch = 0
    best_val = float('inf')

    if os.path.exists(checkpoint_path):
        ckpt = torch.load(checkpoint_path, map_location=device, weights_only=True)
        # Load safely regardless of whether it was compiled or not
        model.load_state_dict(ckpt['model_state_dict'], strict=False)
        optimizer.load_state_dict(ckpt['optimizer_state_dict'])
        start_epoch = ckpt['epoch'] + 1
        print(f"Resuming from epoch {start_epoch} (Patched Model)")
    else:
        print("Starting training from scratch")

    early_stopper = None
    if early_stop_patience is not None:
        early_stopper = EarlyStopping(patience=early_stop_patience,
                                      path=checkpoint_path.replace('.pth', '_best.pth'))

    scaler = torch.amp.GradScaler('cuda')

    for epoch in range(start_epoch, epochs):
        start = time.time()

        # ---------- TRAINING ----------
        model.train()
        total_train = 0.0
        #for inputs, targets in train_loader:

        # Extract the total number of iterations in the epoch
        total_iterations = len(train_loader)

        for i, (inputs, targets) in enumerate(train_loader):
            # Print the progress
            print(f"Iteration: {i + 1}/{total_iterations}")

            inputs, targets = inputs.to(device), targets.to(device)
            optimizer.zero_grad()

            with torch.autocast(device_type='cuda', dtype=torch.float16):
                # Masking is now handled internally by the Patched model!
                outputs = model(inputs)
                loss = criterion(outputs, targets)

            scaler.scale(loss).backward()
            scaler.step(optimizer)
            scaler.update()

            total_train += loss.item()

        avg_train = total_train / len(train_loader)

        # ---------- VALIDATION ----------
        val_loss = None
        if (epoch + 1) % val_every == 0 or (epoch + 1) == epochs:
            model.eval()
            total_val = 0.0
            with torch.no_grad():
                # Extract the total number of val iterations in the epoch
                total_iterations = len(val_loader)
                for i, (inputs, targets) in enumerate(val_loader):
                    # Print the progress
                    print(f"Iteration: {i + 1}/{total_iterations}")

                    inputs, targets = inputs.to(device), targets.to(device)
                    outputs = model(inputs)
                    loss = criterion(outputs, targets)
                    total_val += loss.item()
            val_loss = total_val / len(val_loader)

        if val_loss is not None:
            print(f"  Validation MSE Loss: {val_loss:.4f}")
            if val_loss < best_val:
                best_val = val_loss
                print(f"  *** NEW BEST VAL LOSS: {val_loss:.4f} ***")

        epoch_time = time.time() - start
        print(f"Epoch {epoch+1} took {epoch_time:.1f}s")

        # ---------- LOG ----------
        log_line = f"Epoch {epoch+1}/{epochs} | Train loss: {avg_train:.4f}"
        if val_loss is not None:
            log_line += f" | Val loss: {val_loss:.4f}"
        print(log_line)

        # ---------- CHECKPOINT ----------
        if (epoch + 1) % checkpoint_interval == 0 or (epoch + 1) == epochs:
            torch.save({
                'epoch': epoch,
                'model_state_dict': get_clean_state_dict(model),
                'optimizer_state_dict': optimizer.state_dict(),
                'mean': float(mean),
                'std': float(std),
                'val_loss': val_loss
            }, checkpoint_path)
            print(f"  Checkpoint saved (epoch {epoch+1})")

        # ---------- EARLY STOP ----------
        if early_stopper is not None and val_loss is not None:
            early_stopper(val_loss, model, optimizer, epoch, mean, std)
            if early_stopper.early_stop:
                print("Early stopping triggered!")
                break

def main():
    parser = argparse.ArgumentParser(description="Patched Continuous Transformer")
    parser.add_argument('--input_file', type=str, help="Path to the input text file")
    parser.add_argument('--checkpoint', type=str, default='model_checkpoint.pth')
    parser.add_argument('--seq_length', type=int, default=256, help="Total sequence length (must be multiple of patch_size)")
    parser.add_argument('--embed_size', type=int, default=256, help="Embedding dimension size")
    parser.add_argument('--patch_size', type=int, default=16, help="Number of steps in a patch")
    parser.add_argument('--batch_size', type=int, default=256, help="Batch size")
    parser.add_argument('--epochs', type=int, default=100, help="Number of epochs")
    parser.add_argument('--checkpoint_interval', type=int, default=2)
    parser.add_argument('--inference', action='store_true')
    parser.add_argument('--length', type=int, default=200, help="Integers to generate")
    parser.add_argument('--temperature', type=float, default=0.8)
    parser.add_argument('--val_split', type=float, default=0.1)
    parser.add_argument('--val_every', type=int, default=1)
    parser.add_argument('--early_stop', type=int, default=None)
    parser.add_argument('--seed', type=int, default=42)

    args = parser.parse_args()

    torch.manual_seed(args.seed)
    random.seed(args.seed)
    np.random.seed(args.seed)
    if torch.cuda.is_available():
        torch.cuda.manual_seed_all(args.seed)

    device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')

    if args.inference:
        if not os.path.exists(args.checkpoint):
            raise FileNotFoundError(f"Checkpoint not found.")
        
        checkpoint = torch.load(args.checkpoint, map_location=device, weights_only=True)
        mean, std = checkpoint['mean'], checkpoint['std']
        
        model = PatchedContinuousTransformer(patch_size=args.patch_size, embed_size=args.embed_size, num_heads=8, num_layers=8).to(device)
        model.load_state_dict(checkpoint['model_state_dict'])

        # Generate a seed equivalent to one full patch
        seed_nums = [random.randint(1, 5000) for _ in range(args.patch_size)]
        print(f"SEED: {seed_nums}")

        generated_text = generate_patched(
            model=model, 
            seed_nums=seed_nums, 
            mean=mean, 
            std=std, 
            patch_size=args.patch_size,
            length=args.length, 
            temperature=args.temperature, 
            device=device
        )
        print(f"Generated sequence:\n{generated_text}")

    else:
        with open(args.input_file, 'r', encoding='utf-8') as f:
            text = f.read()

        from sequence_data import split_sequence
        train_values, val_values = split_sequence(text, args.val_split, args.seq_length + args.patch_size)
        train_dataset = PatchedContinuousDataset(train_values, args.seq_length, args.patch_size)
        val_dataset = PatchedContinuousDataset(
            val_values, args.seq_length, args.patch_size, normalization=(train_dataset.mean, train_dataset.std)
        )

        train_loader = DataLoader(train_dataset, batch_size=args.batch_size, shuffle=True, drop_last=True, num_workers=4, pin_memory=True)
        val_loader   = DataLoader(val_dataset, batch_size=args.batch_size, shuffle=False, num_workers=4, pin_memory=True)

        model = PatchedContinuousTransformer(patch_size=args.patch_size, embed_size=args.embed_size, num_heads=8, num_layers=8).to(device)
        model = torch.compile(model) 

        optimizer = optim.AdamW(model.parameters(), lr=0.001, fused=True)
        criterion = nn.MSELoss() 

        train(model, train_loader, val_loader, optimizer, criterion, device,
              epochs=args.epochs, checkpoint_path=args.checkpoint,
              checkpoint_interval=args.checkpoint_interval,
              mean=train_dataset.mean, std=train_dataset.std,
              val_every=args.val_every, early_stop_patience=args.early_stop)

if __name__ == "__main__":
    main()

