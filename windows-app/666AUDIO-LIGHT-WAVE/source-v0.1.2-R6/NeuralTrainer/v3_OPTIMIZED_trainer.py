# conda create -n llm-trainer python=3.9.12
# conda activate llm-trainer
# conda install pytorch torchvision torchaudio pytorch-cuda=12.4 -c pytorch -c nvidia
# python -c "import torch; print(torch.__version__); print(torch.cuda.is_available())"
#_____________________________________________________________________________________


# python v3_OPTIMIZED_trainer.py --input_file dataset.txt --epochs 100 --batch_size 512 --seq_length 128 --checkpoint model.pth --checkpoint_interval 1 --val_split 0.1 --val_every 1 --early_stop 10 --seed 123

# TRY ON RUNPOD
# python v3_OPTIMIZED_trainer.py --input_file dataset.txt --epochs 100 --batch_size 512 --seq_length 256 --checkpoint model.pth --checkpoint_interval 1 --val_split 0.1 --val_every 1 --early_stop 10 --seed 123

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


class EarlyStopping:
    def __init__(self, patience=7, delta=0.0, path='best_model.pth'):
        self.patience = patience
        self.delta = delta
        self.path = path
        self.best = None
        self.counter = 0
        self.early_stop = False

    # FIX: Replaced 'vocab' with 'mean' and 'std'
    def __call__(self, val_loss, model, optimizer, epoch, mean, std):
        if self.best is None or val_loss < self.best - self.delta:
            self.best = val_loss
            self.counter = 0
            torch.save({
                'epoch': epoch,
                'model_state_dict': model.state_dict(),
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

class ContinuousIntegerDataset(Dataset):
    def __init__(self, numbers, seq_length, normalization=None):
        self.seq_length = seq_length
        # 1. Parse numbers as floats
        if normalization is None:
            self.mean = float(np.mean(numbers))
            self.std = float(np.std(numbers)) or 1.0
        else:
            self.mean, self.std = normalization

        normalized_numbers = [(x - self.mean) / self.std for x in numbers]
        
        # 4. Save as a continuous tensor (float32)
        self.data = torch.tensor(normalized_numbers, dtype=torch.float32).unsqueeze(1)

    def __len__(self):
        return len(self.data) - self.seq_length

    def __getitem__(self, idx):
        return self.data[idx:idx + self.seq_length], self.data[idx + 1:idx + self.seq_length + 1]

class ContinuousTransformer(nn.Module):

    # LOCAL
    #def __init__(self, embed_size=256, num_heads=4, num_layers=4):
   
    # TRY RUNPOD
    def __init__(self, embed_size=256, num_heads=8, num_layers=8):

        print(f"ContinuousTransformer.init(): embed_size: {embed_size} | num_heads: {num_heads} | num_layers: {num_layers}")
        super().__init__()
        self.embed_size = embed_size
        
        # Project 1 float into `embed_size` floats
        self.input_proj = nn.Linear(1, embed_size)

        encoder_layer = nn.TransformerEncoderLayer(d_model=embed_size, nhead=num_heads, batch_first=True, norm_first=True)
        self.transformer = nn.TransformerEncoder(encoder_layer, num_layers=num_layers)

        # Output exactly 1 continuous float
        self.fc = nn.Linear(embed_size, 1)
        self.dropout = nn.Dropout(0.1)

    def _get_positional_encoding(self, seq_len, d_model, device):
        position = torch.arange(0, seq_len, dtype=torch.float, device=device).unsqueeze(1)
        div_term = torch.exp(torch.arange(0, d_model, 2, dtype=torch.float, device=device) * (-math.log(10000.0) / d_model))
        pe = torch.zeros(seq_len, d_model, device=device)
        pe[:, 0::2] = torch.sin(position * div_term)
        pe[:, 1::2] = torch.cos(position * div_term)
        return pe.unsqueeze(0)

    def forward(self, x, tgt_mask=None):
        batch_size, seq_len, _ = x.size() 
        x = self.input_proj(x)
        pe = self._get_positional_encoding(seq_len, self.embed_size, x.device)
        x = x + pe
        x = self.dropout(x)
        out = self.transformer(x, mask=tgt_mask, is_causal=True)
        out = self.fc(out)
        return out

    def generate_mask(self, seq_len, device):
        mask = torch.triu(torch.ones(seq_len, seq_len, device=device) * float('-inf'), diagonal=1)
        return mask

def generate_continuous(model, seed_nums, mean, std, length=100, temperature=1.0, device='cpu'):
    model.eval()
    seed_norm = [(float(n) - mean) / std for n in seed_nums]
    input_seq = torch.tensor(seed_norm, dtype=torch.float32, device=device).unsqueeze(0).unsqueeze(-1)

    with torch.no_grad():
        for _ in range(length):
            seq_len = input_seq.size(1)
            tgt_mask = model.generate_mask(seq_len, device)
            output = model(input_seq, tgt_mask=tgt_mask)
            next_val = output[:, -1:, :]
            
            if temperature > 0.0:
                noise = torch.randn_like(next_val) * (temperature * 0.1)
                next_val = next_val + noise

            input_seq = torch.cat((input_seq, next_val), dim=1)

    generated_norm = input_seq.squeeze().cpu().tolist()
    generated = [int(round((val * std) + mean)) for val in generated_norm]
    return ', '.join(map(str, generated))

# FIX: Passed mean and std as arguments instead of vocab
def train(model, train_loader, val_loader, optimizer, criterion,
          device, epochs, checkpoint_path, checkpoint_interval=5,
          mean=0.0, std=1.0, val_every=1, early_stop_patience=None):
    model.train()
    start_epoch = 0
    best_val = float('inf')

    # FIX: Resuming checkpoint is now vastly simplified! 
    # Continuous networks don't change dimension sizes.
    if os.path.exists(checkpoint_path):
        ckpt = torch.load(checkpoint_path, map_location=device, weights_only=True)
        model.load_state_dict(ckpt['model_state_dict'])
        optimizer.load_state_dict(ckpt['optimizer_state_dict'])
        start_epoch = ckpt['epoch'] + 1
        print(f"Resuming from epoch {start_epoch} (Continuous Model)")
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
        for inputs, targets in train_loader:
            inputs, targets = inputs.to(device), targets.to(device)
            seq_len = inputs.size(1)
            tgt_mask = model.generate_mask(seq_len, device).to(device)

            optimizer.zero_grad()

            with torch.autocast(device_type='cuda', dtype=torch.float16):
                outputs = model(inputs, tgt_mask=tgt_mask)
                # FIX: MSE Loss just compares raw shapes [batch, seq, 1] directly! No .view() needed.
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
                for inputs, targets in val_loader:
                    inputs, targets = inputs.to(device), targets.to(device)
                    seq_len = inputs.size(1)
                    tgt_mask = model.generate_mask(seq_len, device).to(device)
                    outputs = model(inputs, tgt_mask=tgt_mask)
                    # FIX: Same as above for validation loss
                    loss = criterion(outputs, targets)
                    total_val += loss.item()
            val_loss = total_val / len(val_loader)

        if val_loss is not None:
            # FIX: Perplexity makes no sense for MSE Loss, just printing raw MSE.
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
        avg_train_str = f"{avg_train}"
        avg_train_str = avg_train_str.replace(".", "")
        checkpoint_path = f"model_{avg_train_str}.pth"

        if (epoch + 1) % checkpoint_interval == 0 or (epoch + 1) == epochs:
            torch.save({
                'epoch': epoch,
                'model_state_dict': model.state_dict(),
                'optimizer_state_dict': optimizer.state_dict(),
                'mean': float(mean),
                'std': float(std),
                'val_loss': val_loss
            }, checkpoint_path)
            print(f"  Checkpoint saved (epoch {epoch+1})")

        # ---------- EARLY STOP ----------
        if early_stopper is not None and val_loss is not None:
            # FIX: pass mean and std to early_stopper
            early_stopper(val_loss, model, optimizer, epoch, mean, std)
            if early_stopper.early_stop:
                print("Early stopping triggered!")
                break

def main():
    parser = argparse.ArgumentParser(description="Continuous Transformer Trainer with Inference for Integers")
    parser.add_argument('--input_file', type=str, help="Path to the input text file (required for training)")
    parser.add_argument('--checkpoint', type=str, default='model_checkpoint.pth', help="Path to save/load checkpoint")
    parser.add_argument('--seq_length', type=int, default=64, help="Sequence length for training")
    parser.add_argument('--batch_size', type=int, default=32, help="Batch size")
    parser.add_argument('--epochs', type=int, default=10, help="Number of epochs")
    parser.add_argument('--checkpoint_interval', type=int, default=2, help="Checkpoint every N epochs")
    parser.add_argument('--inference', action='store_true', help="Run inference/generation instead of training")
    parser.add_argument('--length', type=int, default=200, help="Number of integers to generate")
    parser.add_argument('--temperature', type=float, default=0.8, help="Sampling temperature (higher = more random)")
    parser.add_argument('--val_split', type=float, default=0.1, help="Fraction of data to keep for validation (0-0.5)")
    parser.add_argument('--val_every', type=int, default=1, help="Run validation every N epochs")
    parser.add_argument('--early_stop', type=int, default=None, help="Patience for early stopping (None = disabled)")
    parser.add_argument('--seed', type=int, default=42, help="Random seed for reproducibility")

    args = parser.parse_args()

    # ------------------- reproducibility -------------------
    torch.manual_seed(args.seed)
    random.seed(args.seed)
    np.random.seed(args.seed)
    if torch.cuda.is_available():
        torch.cuda.manual_seed_all(args.seed)

    device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')

    if args.inference:
        if not os.path.exists(args.checkpoint):
            raise FileNotFoundError(f"Checkpoint '{args.checkpoint}' not found for inference.")
        
        checkpoint = torch.load(args.checkpoint, map_location=device, weights_only=True)
        mean = checkpoint['mean']
        std = checkpoint['std']
        
        model = ContinuousTransformer(embed_size=256, num_heads=4, num_layers=4).to(device)
        model.load_state_dict(checkpoint['model_state_dict'])

        seed_number_1 = random.randint(1, 5000)
        seed_number_2 = random.randint(1, 2000)
        seed_nums = [seed_number_1, seed_number_2]
        
        print(f"SEED: {seed_nums}")

        generated_text = generate_continuous(
            model=model, 
            seed_nums=seed_nums, 
            mean=mean, 
            std=std, 
            length=args.length, 
            temperature=args.temperature, 
            device=device
        )
        
        print(f"Generated sequence:\n{generated_text}")
    else:
        if not args.input_file:
            raise ValueError("Input file required for training.")
        with open(args.input_file, 'r', encoding='utf-8') as f:
            text = f.read()

        # FIX: Completely removed the old vocabulary expansion logic!
        # The Continuous approach doesn't use vocabularies at all.
        
        # ----- dataset -----
        # FIX: Use ContinuousIntegerDataset instead of IntegerDataset
        from sequence_data import split_sequence
        train_values, val_values = split_sequence(text, args.val_split, args.seq_length + 1)
        train_dataset = ContinuousIntegerDataset(train_values, args.seq_length)
        val_dataset = ContinuousIntegerDataset(
            val_values, args.seq_length, normalization=(train_dataset.mean, train_dataset.std)
        )

        train_loader = DataLoader(train_dataset, batch_size=args.batch_size, shuffle=True,
                                  drop_last=True, num_workers=4, pin_memory=True)
        val_loader   = DataLoader(val_dataset, batch_size=args.batch_size, shuffle=False,
                                  num_workers=4, pin_memory=True)

        # FIX: Use ContinuousTransformer, completely omitting vocab_size
        model = ContinuousTransformer(embed_size=256, num_heads=4, num_layers=4).to(device)

        optimizer = optim.Adam(model.parameters(), lr=0.001)
        criterion = nn.MSELoss() # FIX: Confirmed MSELoss is defined

        # ----- launch training with validation -----
        # FIX: Pass `mean` and `std` from the dataset instead of `vocab` dict
        train(model, train_loader, val_loader,
              optimizer, criterion, device,
              epochs=args.epochs,
              checkpoint_path=args.checkpoint,
              checkpoint_interval=args.checkpoint_interval,
              mean=train_dataset.mean,
              std=train_dataset.std,
              val_every=args.val_every,
              early_stop_patience=args.early_stop)

if __name__ == "__main__":
    main()