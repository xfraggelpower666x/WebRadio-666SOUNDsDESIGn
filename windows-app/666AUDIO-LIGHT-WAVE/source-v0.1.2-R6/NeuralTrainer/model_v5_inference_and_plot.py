# conda create -n llm-trainer python=3.9.12
# conda activate llm-trainer
# conda install pytorch torchvision torchaudio pytorch-cuda=12.4 -c pytorch -c nvidia
# python -c "import torch; print(torch.__version__); print(torch.cuda.is_available())"
#_____________________________________________________________________________________

# INFERENCE: python inference_and_plot_v5.py --inference --length 700 --patch_size 16 --embed_size 1024 --checkpoint model_v5_002.pth


import torch
import torch.nn as nn
import argparse
import os
import math
import time
import random
import numpy as np
import matplotlib.pyplot as plt

# Enable TF32 for massive speedup on modern GPUs
torch.backends.cuda.matmul.allow_tf32 = True
torch.backends.cudnn.allow_tf32 = True

# Helper to save uncompiled weights safely
def get_clean_state_dict(model):
    return model._orig_mod.state_dict() if hasattr(model, '_orig_mod') else model.state_dict()

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

def generate_patched(checkpoint_path, model, seed_nums, mean, std, patch_size, length=200, temperature=1.0, device='cpu'):
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



        # model.fc is nn.Linear(embed_size, patch_size)
        # The weight matrix shape is [patch_size, embed_size] (e.g., 16 x 1024)
        weights = model.fc.weight.cpu().numpy()

        # Find the top embedding features that influence each position in the patch
        # We'll just print the first 5 patch positions so it doesn't flood the console
        for p in range(min(5, weights.shape[0])): 
            # Get the indices of the highest positive weights for this position
            top_embed_dims = np.argsort(weights[p, :])[-10:]
            print(f"Patch Position {p+1}: Most influential embed dims {top_embed_dims}")

    # ---------- PLOT HEATMAP ----------
    # Because we are predicting raw values, weights can be negative or positive.
    # We use 'coolwarm' to show positive weights as red and negative as blue.
    vmax = np.max(np.abs(weights)) # Center the colormap at 0

    plt.figure(figsize=(10, 4)) # Make it wider since it's 16 x 1024

    # We'll plot the first 200 embedding dimensions (like you did before) to keep it visible, 
    # or you could remove ':200' to see all 1024!
    plt.imshow(weights[:, :200], cmap='coolwarm', aspect='auto', vmin=-vmax, vmax=vmax)
    plt.colorbar(label="Weight Value (Red=Positive, Blue=Negative)")

    plt.title("Learned Patch Projection Heatmap (Embed Dims vs. Patch Positions)")
    plt.xlabel("Embedding Dimension (First 200)")
    plt.ylabel("Position inside Patch (0 to 15)")

    # Save the image dynamically using the checkpoint path
    base_name = checkpoint_path.split('model_')[-1].split(".pth")[0]
    plt.tight_layout()
    plt.savefig(f"model_{base_name}_heatmap.png", dpi=300)
    plt.show()


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


def main():
    parser = argparse.ArgumentParser(description="Patched Continuous Transformer")
    parser.add_argument('--input_file', type=str, help="Path to the input text file")
    parser.add_argument('--checkpoint', type=str, default='model_checkpoint.pth')
    parser.add_argument('--seq_length', type=int, default=256, help="Total sequence length (must be multiple of patch_size)")
    parser.add_argument('--embed_size', type=int, default=256, help="Embedding dimension size")
    parser.add_argument('--patch_size', type=int, default=16, help="Number of steps in a patch")
    parser.add_argument('--batch_size', type=int, default=256, help="Batch size")
    parser.add_argument('--inference', action='store_true')
    parser.add_argument('--length', type=int, default=200, help="Integers to generate")
    parser.add_argument('--temperature', type=float, default=0.8)
    parser.add_argument('--seed', type=int, default=42)

# INFERENCE: python LOCAL_v5_OPTIMIZED_trainer.py --inference --length 700 --patch_size 16 --embed_size 1024 --checkpoint model_v5_002.pth

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
            checkpoint_path=args.checkpoint,
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

if __name__ == "__main__":
    main()

