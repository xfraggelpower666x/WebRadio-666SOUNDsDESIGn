# conda create -n llm-trainer python=3.9.12
# conda activate llm-trainer
# conda install pytorch torchvision torchaudio pytorch-cuda=12.4 -c pytorch -c nvidia
# python -c "import torch; print(torch.__version__); print(torch.cuda.is_available())"
#_____________________________________________________________________________________

# RTX 3060 1 epoch = 80 min ~ 1 h 20 min
# python v2_OPTIMIZED_trainer.py --input_file dataset.txt --epochs 100 --batch_size 256 --seq_length 64 --checkpoint model.pth --checkpoint_interval 1 --val_split 0.1 --val_every 1 --early_stop 10 --seed 123

# TRY THESE ON RUNPOD: 
# python v2_OPTIMIZED_trainer.py --input_file dataset.txt --epochs 100 --batch_size 256 --seq_length 128 --checkpoint model.pth --checkpoint_interval 1 --val_split 0.1 --val_every 1 --early_stop 10 --seed 123


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

    def __call__(self, val_loss, model, optimizer, epoch, vocab):
        if self.best is None or val_loss < self.best - self.delta:
            self.best = val_loss
            self.counter = 0
            torch.save({
                'epoch': epoch,
                'model_state_dict': model.state_dict(),
                'optimizer_state_dict': optimizer.state_dict(),
                'val_loss': val_loss,
                'vocab': vocab
            }, self.path)
            print(f"  >>> New best model saved (val loss {val_loss:.4f})")
        else:
            self.counter += 1
            print(f"  EarlyStopping counter: {self.counter}/{self.patience}")
            if self.counter >= self.patience:
                self.early_stop = True

# Integer-Level Dataset (modified for comma-separated integers)
class IntegerDataset(Dataset):
    def __init__(self, numbers, seq_length, custom_vocab=None):
        # Parse comma-separated integers, ignoring spaces
        self.seq_length = seq_length
        self.numbers = numbers
        if custom_vocab:
            self.num_to_idx = custom_vocab['num_to_idx']
            self.idx_to_num = custom_vocab['idx_to_num']
            self.unique_nums = sorted(list(self.num_to_idx.keys()))
            self.vocab_size = len(self.unique_nums)
        else:
            self.unique_nums = sorted(list(set(self.numbers)))
            self.num_to_idx = {num: i for i, num in enumerate(self.unique_nums)}
            self.idx_to_num = {i: num for i, num in enumerate(self.unique_nums)}
            self.vocab_size = len(self.unique_nums)
        self.data = torch.tensor([self.num_to_idx[num] for num in self.numbers], dtype=torch.long)

    def __len__(self):
        return len(self.data) - self.seq_length

    def __getitem__(self, idx):
        return self.data[idx:idx + self.seq_length], self.data[idx + 1:idx + self.seq_length + 1]

# Simple Transformer Model (unchanged, but now embeds integer indices)
class SimpleTransformer(nn.Module):
    def __init__(self, vocab_size, embed_size=256, num_heads=4, num_layers=4):
        print(f"SimpleTransformer.init(): vocab_size: {vocab_size} | embed_size: {embed_size} | num_heads: {num_heads} | num_layers: {num_layers}")
        super().__init__()
        self.embed_size = embed_size
        self.embedding = nn.Embedding(vocab_size, embed_size)

        encoder_layer = nn.TransformerEncoderLayer(d_model=embed_size, nhead=num_heads, batch_first=True, norm_first=True)
        self.transformer = nn.TransformerEncoder(encoder_layer, num_layers=num_layers)

        self.fc = nn.Linear(embed_size, vocab_size)
        self.dropout = nn.Dropout(0.1)

    def _get_positional_encoding(self, seq_len, d_model, device):
        # OPTIMIZATION: Math done directly on the GPU, no CPU transfers
        position = torch.arange(0, seq_len, dtype=torch.float, device=device).unsqueeze(1)
        div_term = torch.exp(torch.arange(0, d_model, 2, dtype=torch.float, device=device) * (-math.log(10000.0) / d_model))
        pe = torch.zeros(seq_len, d_model, device=device)
        pe[:, 0::2] = torch.sin(position * div_term)
        pe[:, 1::2] = torch.cos(position * div_term)
        return pe.unsqueeze(0)  # Shape: [1, seq_len, d_model]

    def forward(self, x, tgt_mask=None):
        batch_size, seq_len = x.size()
        x = self.embedding(x)
        pe = self._get_positional_encoding(seq_len, self.embed_size, x.device)
        x = x + pe
        x = self.dropout(x)
        out = self.transformer(x, mask=tgt_mask, is_causal=True) # FlashAttention is automatically utilized!
        out = self.fc(out)
        return out

    def generate_mask(self, seq_len, device):
        # OPTIMIZATION: Matrix created directly on GPU
        mask = torch.triu(torch.ones(seq_len, seq_len, device=device) * float('-inf'), diagonal=1)
        return mask

# Generation function (Optimized to stay entirely on GPU until completion)
def generate(model, num_to_idx, idx_to_num, seed_text, length=100, temperature=1.0, device='cpu'):
    model.eval()
    
    # Parse seed as list of ints
    seed_nums = [int(num.strip()) for num in seed_text.split(',') if num.strip().isdigit()]
    
    # Start input entirely on device
    input_seq = torch.tensor([num_to_idx.get(num, 0) for num in seed_nums], device=device).unsqueeze(0)

    with torch.no_grad():
        for _ in range(length):
            seq_len = input_seq.size(1)
            # Create mask on device directly
            tgt_mask = model.generate_mask(seq_len, device)

            output = model(input_seq, tgt_mask=tgt_mask)
            logits = output[0, -1, :] / temperature
            probs = torch.softmax(logits, dim=-1)
            
            # OPTIMIZATION: Do not use .item(). Keep next token on the GPU
            next_idx = torch.multinomial(probs, num_samples=1).unsqueeze(0) 
            
            input_seq = torch.cat((input_seq, next_idx), dim=1)

    # OPTIMIZATION: Pull sequence back to CPU only ONCE at the very end
    generated_indices = input_seq.squeeze(0).cpu().tolist()
    
    # Convert indices back to numbers
    generated = [idx_to_num.get(idx, 0) for idx in generated_indices]

    return ', '.join(map(str, generated))

def train(model, train_loader, val_loader, optimizer, criterion,
          device, epochs, checkpoint_path, checkpoint_interval=5,
          vocab=None, val_every=1, early_stop_patience=None):
    model.train()
    start_epoch = 0
    best_val = float('inf')

    # ----- resume from checkpoint (if any) -----
    if os.path.exists(checkpoint_path):
        ckpt = torch.load(checkpoint_path, map_location=device, weights_only=True)
        old_state_dict = ckpt['model_state_dict']
        new_state_dict = model.state_dict()
        old_vocab_size = old_state_dict['embedding.weight'].shape[0]
        for name, param in old_state_dict.items():
            if name not in new_state_dict:
                continue
            if param.shape == new_state_dict[name].shape:
                new_state_dict[name].copy_(param)
            else:
                if name == 'embedding.weight' or name == 'fc.weight':
                    new_state_dict[name][:old_vocab_size, :] = param
                elif name == 'fc.bias':
                    new_state_dict[name][:old_vocab_size] = param
        model.load_state_dict(new_state_dict)

        old_opt_sd = ckpt['optimizer_state_dict']
        old_ids = old_opt_sd['param_groups'][0]['params']
        new_params = [p for group in optimizer.param_groups for p in group['params']]
        for idx, p in enumerate(new_params):
            old_id = old_ids[idx]
            if old_id in old_opt_sd['state']:
                param_state = old_opt_sd['state'][old_id]
                for k, v in param_state.items():
                    if torch.is_tensor(v) and k != 'step':
                        if v.shape != p.shape:
                            new_v = torch.zeros_like(p)
                            if len(v.shape) == 2:
                                new_v[:old_vocab_size, :] = v
                            elif len(v.shape) == 1:
                                new_v[:old_vocab_size] = v
                            else:
                                raise ValueError(f"Unexpected tensor shape for optimizer state: {v.shape}")
                            param_state[k] = new_v
        optimizer.load_state_dict(old_opt_sd)
        start_epoch = ckpt['epoch'] + 1
        print(f"Resuming from epoch {start_epoch} with vocab size {model.embedding.num_embeddings}")
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
                loss = criterion(outputs.view(-1, model.fc.out_features), targets.view(-1))

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
                    loss = criterion(outputs.view(-1, model.fc.out_features),
                                     targets.view(-1))
                    total_val += loss.item()
            val_loss = total_val / len(val_loader)

        if val_loss is not None:
            print(f"  Perplexity: {math.exp(val_loss):.2f}")
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
                'vocab': vocab,
                'val_loss': val_loss
            }, checkpoint_path)
            print(f"  Checkpoint saved (epoch {epoch+1})")

        # ---------- EARLY STOP ----------
        if early_stopper is not None and val_loss is not None:
            early_stopper(val_loss, model, optimizer, epoch, vocab)
            if early_stopper.early_stop:
                print("Early stopping triggered!")
                break

def main():
    parser = argparse.ArgumentParser(description="Simple Transformer Trainer with Inference for Integers")
    parser.add_argument('--input_file', type=str, help="Path to the input text file (required for training)")
    parser.add_argument('--checkpoint', type=str, default='model_checkpoint.pth', help="Path to save/load checkpoint")
    parser.add_argument('--seq_length', type=int, default=64, help="Sequence length for training")
    parser.add_argument('--batch_size', type=int, default=32, help="Batch size")
    parser.add_argument('--epochs', type=int, default=10, help="Number of epochs")
    parser.add_argument('--checkpoint_interval', type=int, default=2, help="Checkpoint every N epochs")
    parser.add_argument('--inference', action='store_true', help="Run inference/generation instead of training")
    parser.add_argument('--inference_seed', type=str, default="565, 489", help="Seed text (comma-separated ints) for generation")
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

    model = None
    num_to_idx = None
    idx_to_num = None

    if args.inference:
        if not os.path.exists(args.checkpoint):
            raise FileNotFoundError(f"Checkpoint '{args.checkpoint}' not found for inference.")
        checkpoint = torch.load(args.checkpoint, weights_only=True)
        vocab = checkpoint['vocab']
        num_to_idx, idx_to_num = vocab['num_to_idx'], vocab['idx_to_num']
        model = SimpleTransformer(len(num_to_idx)).to(device)
        model.load_state_dict(checkpoint['model_state_dict'])

        seed_number_1 = random.randint(1, 5000)
        seed_number_2 = random.randint(1, 2000)
        seed = f"{seed_number_1}, {seed_number_2}"
        print(f"SEED: {seed}")

        generated_text = generate(model, num_to_idx, idx_to_num, seed, args.length, args.temperature, device)
        #generated_text = generate(model, num_to_idx, idx_to_num, args.seed, args.length, args.temperature, device)
        print(f"Generated sequence:\n{generated_text}")
    else:
        if not args.input_file:
            raise ValueError("Input file required for training.")
        with open(args.input_file, 'r', encoding='utf-8') as f:
            text = f.read()

        from sequence_data import split_sequence
        train_values, val_values = split_sequence(text, args.val_split, args.seq_length + 1)
        if any(not value.is_integer() for value in train_values + val_values):
            raise ValueError("V2 erwartet ausschließlich ganzzahlige Symbole.")
        train_values = [int(value) for value in train_values]
        val_values = [int(value) for value in val_values]
        unique_nums = sorted(set(train_values))

        custom_vocab = None
        if os.path.exists(args.checkpoint):
            ckpt = torch.load(args.checkpoint, map_location='cpu', weights_only=True)
            old_vocab = ckpt.get('vocab')
            old_num_to_idx = old_vocab['num_to_idx']
            new_to_add = [n for n in unique_nums if n not in old_num_to_idx]
            if new_to_add:
                print(f"Expanding vocab with {len(new_to_add)} new unique numbers")
                num_to_idx = old_num_to_idx.copy()
                idx_to_num = old_vocab['idx_to_num'].copy()
                current_idx = len(num_to_idx)
                for num in sorted(new_to_add):
                    num_to_idx[num] = current_idx
                    idx_to_num[current_idx] = num
                    current_idx += 1
                custom_vocab = {'num_to_idx': num_to_idx, 'idx_to_num': idx_to_num}
            else:
                print("No new unique numbers; using old vocab")
                custom_vocab = old_vocab

        train_dataset = IntegerDataset(train_values, args.seq_length, custom_vocab=custom_vocab)
        vocab = {"num_to_idx": train_dataset.num_to_idx, "idx_to_num": train_dataset.idx_to_num}
        if set(val_values) - set(train_dataset.num_to_idx):
            raise ValueError("Validierung enthält Symbole außerhalb des Trainingsvokabulars.")
        val_dataset = IntegerDataset(val_values, args.seq_length, custom_vocab=vocab)

        train_loader = DataLoader(train_dataset, batch_size=args.batch_size, shuffle=True,
                                  drop_last=False, num_workers=4, pin_memory=True)  # keep batch size stable
        val_loader   = DataLoader(val_dataset, batch_size=args.batch_size, shuffle=False,
                                  num_workers=4, pin_memory=True)   # deterministic val

        model = SimpleTransformer(train_dataset.vocab_size).to(device)  # Use defaults or your custom params

        optimizer = optim.Adam(model.parameters(), lr=0.001)
        criterion = nn.CrossEntropyLoss()

        vocab = {'num_to_idx': train_dataset.num_to_idx,
                 'idx_to_num': train_dataset.idx_to_num}

        # ----- launch training with validation -----
        train(model, train_loader, val_loader,
              optimizer, criterion, device,
              epochs=args.epochs,
              checkpoint_path=args.checkpoint,
              checkpoint_interval=args.checkpoint_interval,
              vocab=vocab,
              val_every=args.val_every,
              early_stop_patience=args.early_stop)

if __name__ == "__main__":
    main()