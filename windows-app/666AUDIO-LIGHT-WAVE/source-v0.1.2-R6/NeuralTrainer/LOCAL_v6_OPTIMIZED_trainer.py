# v6: base_lr and scheduler = optim.lr_scheduler.CosineAnnealingLR(optimizer, T_max=epochs, last_epoch=last_epoch)
# based on the following observations and notes:
#    What is the expected value for convergence?
#    Because 1.0 represents a model guessing the average, true convergence must drop significantly below 1.0.
#    If the sequence is highly predictable, you want to see MSE drop into the 0.1, 0.05, or even 0.01 range.
#    If your Val loss stays permanently flatline at ~0.98 for 20+ epochs, your model is stuck in a local minimum. 
#    To fix this, you may need a Learning Rate Scheduler (like Cosine Annealing), 
#    Gradient Clipping (e.g., torch.nn.utils.clip_grad_norm_(model.parameters(), 1.0) 
#    to prevent the Epoch 3 explosion), or a lower base learning rate.
#
#    about the dataset: 0-120k has nothing to do with the amount of data and everything to do with 
#    the range of integers from 0 to 120k range; the actual data is about 100 megabytes text file 
#    comma separated integer numbers that would amount to about 100 million numbers or so 
#    (if the math in the user's mind checks out)
#
# torch.load thing issue: https://aistudio.google.com/prompts/1zrRuUEOFWdsDBkQP4T2R8AAIYc8md8b1

# conda create -n llm-trainer python=3.9.12
# conda activate llm-trainer
# conda install pytorch torchvision torchaudio pytorch-cuda=12.4 -c pytorch -c nvidia
# python -c "import torch; print(torch.__version__); print(torch.cuda.is_available())"
#_____________________________________________________________________________________

# INFERENCE: python LOCAL_v5_OPTIMIZED_trainer.py --inference --length 700 --patch_size 16 --embed_size 1024 --checkpoint model_v5_002.pth
#

# !!! >>>___THIS_IS_IT___CHOSEN___<<< !!!
# RTX 3060 >>> ~12GB VRAM <<< @58% POWER LIMIT ~ 500/24595 = 10 minutes =~ 8 hours / epoch
# python LOCAL_v6_OPTIMIZED_trainer.py --input_file FINAL_TRAINING_dataset_0-120k.txt --epochs 100 --lr 0.0003 --batch_size 512 --embed_size 1024 --seq_length 1024 --patch_size 16 --checkpoint model_v5_012.pth --checkpoint_interval 1 --val_split 0.1 --val_every 1 --early_stop 10 --seed 123


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

    def __call__(self, val_loss, model, optimizer, scheduler, epoch, mean, std, dataset_id):
        if self.best is None or val_loss < self.best - self.delta:
            self.best = val_loss
            self.counter = 0
            torch.save({
                'epoch': epoch,
                'model_state_dict': get_clean_state_dict(model),
                'optimizer_state_dict': optimizer.state_dict(),
                'scheduler_state_dict': scheduler.state_dict(),
                'mean': float(mean),
                'std': float(std),
                'dataset_id': dataset_id,
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

        if len(numbers) < seq_length + patch_size:
            raise ValueError("Zu wenige Werte für ein vollständiges Sequenzfenster.")
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
    
    #generated = [int(round((val * std) + mean)) for val in generated_norm]
    #^^^^^^ REPLACED BY THIS
    # take care of the possible negative numbers and turn them into positive ints
    #    if wanted to eliminate these outliers 
    #    then this >> generated = [max(0, int(round((val * std) + mean))) for val in generated_norm]

    generated = [abs(int(round((val * std) + mean))) for val in generated_norm]
    return ', '.join(map(str, generated))

def train(model, train_loader, val_loader, optimizer, criterion,
          device, epochs, checkpoint_path, checkpoint_interval=5,
          mean=0.0, std=1.0, val_every=1, early_stop_patience=None, base_lr=3e-4, dataset_id=None):
    
    start_epoch = 0
    best_val = float('inf')
    ckpt = None # Keep track of whether we loaded a checkpoint

    if os.path.exists(checkpoint_path):
        ckpt = torch.load(checkpoint_path, map_location=device, weights_only=True)
        if ckpt.get("dataset_id") != dataset_id:
            raise ValueError("Checkpoint stammt aus einem anderen Datensplit. Neuen Checkpoint-Pfad verwenden.")
        model.load_state_dict(ckpt['model_state_dict'])
        optimizer.load_state_dict(ckpt['optimizer_state_dict'])
        start_epoch = ckpt['epoch'] + 1

        print(f"Resuming from epoch {start_epoch} (Patched Model).")
    else:
        print("Starting training from scratch")

    # 2. INITIALIZE COSINE ANNEALING SCHEDULER
    scheduler = optim.lr_scheduler.CosineAnnealingLR(optimizer, T_max=epochs)

    # 3. LOAD THE SCHEDULER STATE IF RESUMING
    if ckpt is not None and 'scheduler_state_dict' in ckpt:
        scheduler.load_state_dict(ckpt['scheduler_state_dict'])
        print(f"  >>> Restored learning rate curve. Current LR is: {scheduler.get_last_lr()[0]:.6e}")
    
    early_stopper = None
    if early_stop_patience is not None:
        early_stopper = EarlyStopping(patience=early_stop_patience,
                                      path=checkpoint_path.replace('.pth', '_best.pth'))

    scaler = torch.amp.GradScaler('cuda', enabled=device.type == 'cuda')

    for epoch in range(start_epoch, epochs):
        start = time.time()

        # ---------- TRAINING ----------
        model.train()
        total_train = 0.0

        # Extract the total number of iterations in the epoch
        total_iterations = len(train_loader)

        for i, (inputs, targets) in enumerate(train_loader):
            # ---------- ETA CALCULATION ----------
            iters_done = i + 1
            elapsed_time = time.time() - start
            time_per_iter = elapsed_time / iters_done
            iters_left = total_iterations - iters_done
            eta_seconds = int(iters_left * time_per_iter)
            
            # Format into HH:MM:SS
            m, s = divmod(eta_seconds, 60)
            h, m = divmod(m, 60)
            eta_str = f"{h:02d}:{m:02d}:{s:02d}" if h > 0 else f"{m:02d}:{s:02d}"

            # Print the progress
            print(f"Iteration: {iters_done}/{total_iterations} | ETA for Epoch: {eta_str}", end='\r', flush=True)
            # -------------------------------------

            inputs, targets = inputs.to(device), targets.to(device)
            optimizer.zero_grad()

            with torch.autocast(device_type='cuda', dtype=torch.float16, enabled=device.type == 'cuda'):
                # Masking is now handled internally by the Patched model!
                outputs = model(inputs)
                loss = criterion(outputs, targets)

            scaler.scale(loss).backward()

            # 3. GRADIENT CLIPPING (Prevents massive spikes like the Epoch 3 explosion)
            scaler.unscale_(optimizer)
            torch.nn.utils.clip_grad_norm_(model.parameters(), max_norm=1.0)

            scaler.step(optimizer)
            scaler.update()

            total_train += loss.item()

        avg_train = total_train / len(train_loader)

        # Step the scheduler at the end of the epoch
        scheduler.step()
        current_lr = scheduler.get_last_lr()[0]

        # ---------- VALIDATION ----------
        val_loss = None
        if (epoch + 1) % val_every == 0 or (epoch + 1) == epochs:
            model.eval()
            total_val = baseline_total = 0.0
            validation_samples = 0
            with torch.no_grad():
                # Extract the total number of val iterations in the epoch
                total_iterations = len(val_loader)
                val_start = time.time() # Track start time specifically for validation

                for i, (inputs, targets) in enumerate(val_loader):
                    # ---------- ETA CALCULATION ----------
                    iters_done = i + 1
                    elapsed_time = time.time() - val_start
                    time_per_iter = elapsed_time / iters_done
                    iters_left = total_iterations - iters_done
                    eta_seconds = int(iters_left * time_per_iter)
                    
                    m, s = divmod(eta_seconds, 60)
                    h, m = divmod(m, 60)
                    eta_str = f"{h:02d}:{m:02d}:{s:02d}" if h > 0 else f"{m:02d}:{s:02d}"

                    # Print the progress
                    print(f"Val Iteration: {iters_done}/{total_iterations} | Val ETA: {eta_str}", end='\r', flush=True)
                    # -------------------------------------

                    inputs, targets = inputs.to(device), targets.to(device)
                    outputs = model(inputs)
                    loss = criterion(outputs, targets)
                    batch_size = inputs.shape[0]
                    validation_samples += batch_size
                    total_val += loss.item() * batch_size
                    baseline_total += criterion(inputs, targets).item() * batch_size
            val_loss = total_val / validation_samples
            print(f"  Validation persistence baseline MSE: {baseline_total / validation_samples:.4f}")

        print("\n") # Clear carriage return
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
        log_line += f" | LR: {current_lr:.6e}"
        print(log_line)

        # ---------- CHECKPOINT ----------
        if (epoch + 1) % checkpoint_interval == 0 or (epoch + 1) == epochs:
            torch.save({
                'epoch': epoch,
                'model_state_dict': get_clean_state_dict(model),
                'optimizer_state_dict': optimizer.state_dict(),
                'scheduler_state_dict': scheduler.state_dict(), # Save scheduler
                'mean': float(mean),
                'std': float(std),
                'dataset_id': dataset_id,
                'val_loss': val_loss
            }, checkpoint_path)
            print(f"  Checkpoint saved (epoch {epoch+1})")

        # ---------- EARLY STOP ----------
        if early_stopper is not None and val_loss is not None:
            early_stopper(val_loss, model, optimizer, scheduler, epoch, mean, std, dataset_id)
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
    parser.add_argument('--lr', type=float, default=3e-4, help="Base learning rate")
    parser.add_argument('--checkpoint_interval', type=int, default=2)
    parser.add_argument('--inference', action='store_true')
    parser.add_argument('--length', type=int, default=200, help="Integers to generate")
    parser.add_argument('--temperature', type=float, default=0.8)
    parser.add_argument('--val_split', type=float, default=0.1)
    parser.add_argument('--val_every', type=int, default=1)
    parser.add_argument('--early_stop', type=int, default=None)
    parser.add_argument('--seed', type=int, default=42)

    parser.add_argument('--workers', type=int, default=0)
    args = parser.parse_args()
    if args.workers < 0 or min(args.patch_size, args.seq_length, args.batch_size, args.epochs,
                               args.val_every, args.checkpoint_interval) < 1:
        parser.error("Sequenz-, Batch- und Epochenparameter müssen positiv sein.")
    if args.seq_length % args.patch_size:
        parser.error("seq_length muss ein Vielfaches von patch_size sein.")

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

        from hashlib import sha256
        from sequence_data import split_sequence
        dataset_id = sha256(
            f"disjoint-v1:{args.val_split}:{args.seq_length}:{args.patch_size}\n{text}".encode("utf-8")
        ).hexdigest()
        train_values, val_values = split_sequence(
            text, args.val_split, args.seq_length + args.patch_size
        )
        train_dataset = PatchedContinuousDataset(train_values, args.seq_length, args.patch_size)
        val_dataset = PatchedContinuousDataset(
            val_values, args.seq_length, args.patch_size,
            normalization=(train_dataset.mean, train_dataset.std),
        )

        train_loader = DataLoader(train_dataset, batch_size=args.batch_size, shuffle=True, drop_last=False, num_workers=args.workers, pin_memory=device.type == 'cuda')
        val_loader   = DataLoader(val_dataset, batch_size=args.batch_size, shuffle=False, num_workers=args.workers, pin_memory=device.type == 'cuda')

        model = PatchedContinuousTransformer(patch_size=args.patch_size, embed_size=args.embed_size, num_heads=8, num_layers=8).to(device)
        #model = torch.compile(model) 

        optimizer = optim.AdamW(model.parameters(), lr=args.lr, fused=device.type == 'cuda')
        criterion = nn.MSELoss() 

        train(
            model, 
            train_loader, 
            val_loader, 
            optimizer, 
            criterion, 
            device,
            epochs=args.epochs, 
            checkpoint_path=args.checkpoint,
            checkpoint_interval=args.checkpoint_interval,
            mean=train_dataset.mean, 
            std=train_dataset.std,
            val_every=args.val_every,  
            early_stop_patience=args.early_stop,
            base_lr=args.lr,
            dataset_id=dataset_id,
        )

if __name__ == "__main__":
    main()

