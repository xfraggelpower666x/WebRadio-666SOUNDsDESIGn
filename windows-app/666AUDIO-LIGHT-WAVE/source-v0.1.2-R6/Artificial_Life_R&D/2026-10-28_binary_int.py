import torch
import math

def generate_patched_floats(model, seed_nums, mean, std, patch_size, length=500, temperature=1.0, device='cpu'):
    """Generates continuous floats without converting to integer bounds."""
    model.eval()
    seed_norm = [(float(n) - mean) / std for n in seed_nums]
    
    # Pad to ensure length is a multiple of patch_size
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

    # Use flatten() instead of squeeze() to avoid edge cases where sequence length is exactly 1
    generated_norm = input_seq.flatten().cpu().tolist()

    # Isolate ONLY the new generated floats, truncated to exact `length`
    raw_floats = generated_norm[len(seed_norm) : len(seed_norm) + length]

    # Integer list (Applied only to the newly generated raw_floats)
    # Note: Removed `abs()` here assuming you want true values. Add it back if you strictly require positive integers.
    int_list = [abs(int(round((val * std) + mean))) for val in raw_floats]
    
    # Binary list / Thresholding
    binary_list = ['1' if val > 0.0 else '0' for val in raw_floats]
    binary_list_str = "".join(binary_list) # Returns something like "10110010..."
    
    # Returning the string instead of the raw list
    return int_list, binary_list_str
