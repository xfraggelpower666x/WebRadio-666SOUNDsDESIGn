import random
import os
import math
import pickle
import torch
import torch.nn as nn
import torch.optim as optim
from torch.utils.data import Dataset, DataLoader

import concurrent.futures

class SimpleTransformer(nn.Module):
    def __init__(self, vocab_size, embed_size=256, num_heads=4, num_layers=4):
        super().__init__()
        self.embed_size = embed_size
        self.embedding = nn.Embedding(vocab_size, embed_size)
        decoder_layer = nn.TransformerDecoderLayer(d_model=embed_size, nhead=num_heads, batch_first=True)
        self.transformer_decoder = nn.TransformerDecoder(decoder_layer, num_layers=num_layers)
        self.fc = nn.Linear(embed_size, vocab_size)
        self.dropout = nn.Dropout(0.1)

    def _get_positional_encoding(self, seq_len, d_model):
        pe = torch.zeros(seq_len, d_model)
        position = torch.arange(0, seq_len, dtype=torch.float).unsqueeze(1)
        div_term = torch.exp(torch.arange(0, d_model, 2).float() * (-math.log(10000.0) / d_model))
        pe[:, 0::2] = torch.sin(position * div_term)
        pe[:, 1::2] = torch.cos(position * div_term)
        return pe.unsqueeze(0)  # Shape: [1, seq_len, d_model]

    def forward(self, x, tgt_mask=None):
        batch_size, seq_len = x.size()
        x = self.embedding(x)
        pe = self._get_positional_encoding(seq_len, self.embed_size)
        x = x + pe.to(x.device)
        x = self.dropout(x)
        # Dummy memory for decoder-only
        memory = torch.zeros(batch_size, 1, self.embed_size).to(x.device)
        out = self.transformer_decoder(x, memory, tgt_mask=tgt_mask)
        out = self.fc(out)
        return out

    def generate_mask(self, seq_len):
        mask = torch.triu(torch.ones(seq_len, seq_len) * float('-inf'), diagonal=1)
        return mask

# Generation function (modified to handle integers and output as comma-separated string)
def generate(model, num_to_idx, idx_to_num, seed_text, length=100, temperature=1.0, device='cpu'):
    model.eval()
    # Parse seed as list of ints
    seed_nums = [int(num.strip()) for num in seed_text.split(',') if num.strip().isdigit()]
    generated = seed_nums[:]
    input_seq = torch.tensor([num_to_idx.get(num, 0) for num in seed_nums]).unsqueeze(0).to(device)  # Batch dim
    seq_len = input_seq.size(1)
    tgt_mask = model.generate_mask(seq_len).to(device)

    with torch.no_grad():
        for _ in range(length):
            output = model(input_seq, tgt_mask=tgt_mask)
            logits = output[0, -1, :] / temperature
            probs = torch.softmax(logits, dim=-1)
            next_idx = torch.multinomial(probs, num_samples=1).item()
            next_num = idx_to_num.get(next_idx, 0)  # Default to 0 if unknown
            generated.append(next_num)
            next_input = torch.tensor([[next_idx]]).to(device)
            input_seq = torch.cat((input_seq, next_input), dim=1)
            new_seq_len = input_seq.size(1)
            tgt_mask = model.generate_mask(new_seq_len).to(device)

    return ', '.join(map(str, generated))

MAX_WORKERS = 2
NUM_VIDEOS = 30000
NEURAL_MODEL_FILEPATH = "v3_model_007355181977456719.pth"
DEVICE = torch.device('cuda' if torch.cuda.is_available() else 'cpu')

def Get_Neural_Indices():
    num_videos = NUM_VIDEOS
    checkpoint_path = NEURAL_MODEL_FILEPATH
    device = DEVICE

    if num_videos > 0:
        if not os.path.exists(checkpoint_path):
            raise FileNotFoundError(f"Checkpoint '{checkpoint_path}' not found for inference.")
        checkpoint = torch.load(checkpoint_path, weights_only=True)
        vocab = checkpoint['vocab']
        num_to_idx, idx_to_num = vocab['num_to_idx'], vocab['idx_to_num']
        model = SimpleTransformer(len(num_to_idx)).to(device)
        model.load_state_dict(checkpoint['model_state_dict'])

        seed_number_1 = random.randint(1, num_videos // 2)
        seed_number_2 = random.randint(1, num_videos)
        seed = f"{seed_number_1}, {seed_number_2}"
        print(f"SEED: {seed}")
        generated_text_1 = generate(model, num_to_idx, idx_to_num, seed, 700, 0.5, device)

        seed_number_1 = random.randint(1, num_videos // 4)
        seed_number_2 = random.randint(1, num_videos // 2)
        seed = f"{seed_number_1}, {seed_number_2}"
        print(f"SEED: {seed}")
        generated_text_2 = generate(model, num_to_idx, idx_to_num, seed, 700, 0.5, device)

        seed_number_1 = random.randint(1, num_videos // 5)
        seed_number_2 = random.randint(1, num_videos // 3)
        seed = f"{seed_number_1}, {seed_number_2}"
        print(f"SEED: {seed}")
        generated_text_3 = generate(model, num_to_idx, idx_to_num, seed, 700, 0.5, device)

        seed_number_1 = random.randint(1, num_videos // 6)
        seed_number_2 = random.randint(1, num_videos // 4)
        seed = f"{seed_number_1}, {seed_number_2}"
        print(f"SEED: {seed}")
        generated_text_4 = generate(model, num_to_idx, idx_to_num, seed, 700, 0.5, device)


        seed_number_1 = random.randint(1, num_videos // 2)
        seed_number_2 = random.randint(1, num_videos)
        seed = f"{seed_number_1}, {seed_number_2}"
        print(f"SEED: {seed}")
        generated_text_5 = generate(model, num_to_idx, idx_to_num, seed, 700, 0.7, device)

        seed_number_1 = random.randint(1, num_videos // 4)
        seed_number_2 = random.randint(1, num_videos // 2)
        seed = f"{seed_number_1}, {seed_number_2}"
        print(f"SEED: {seed}")
        generated_text_6 = generate(model, num_to_idx, idx_to_num, seed, 700, 0.7, device)

        seed_number_1 = random.randint(1, num_videos // 5)
        seed_number_2 = random.randint(1, num_videos // 3)
        seed = f"{seed_number_1}, {seed_number_2}"
        print(f"SEED: {seed}")
        generated_text_7 = generate(model, num_to_idx, idx_to_num, seed, 700, 0.7, device)

        seed_number_1 = random.randint(1, num_videos // 6)
        seed_number_2 = random.randint(1, num_videos // 4)
        seed = f"{seed_number_1}, {seed_number_2}"
        print(f"SEED: {seed}")
        generated_text_8 = generate(model, num_to_idx, idx_to_num, seed, 700, 0.7, device)


        seed_number_1 = random.randint(1, num_videos // 2)
        seed_number_2 = random.randint(1, num_videos)
        seed = f"{seed_number_1}, {seed_number_2}"
        print(f"SEED: {seed}")
        generated_text_9 = generate(model, num_to_idx, idx_to_num, seed, 700, 1.0, device)

        seed_number_1 = random.randint(1, num_videos // 4)
        seed_number_2 = random.randint(1, num_videos // 2)
        seed = f"{seed_number_1}, {seed_number_2}"
        print(f"SEED: {seed}")
        generated_text_10 = generate(model, num_to_idx, idx_to_num, seed, 700, 1.0, device)

        seed_number_1 = random.randint(1, num_videos // 5)
        seed_number_2 = random.randint(1, num_videos // 3)
        seed = f"{seed_number_1}, {seed_number_2}"
        print(f"SEED: {seed}")
        generated_text_11 = generate(model, num_to_idx, idx_to_num, seed, 700, 1.0, device)

        seed_number_1 = random.randint(1, num_videos // 6)
        seed_number_2 = random.randint(1, num_videos // 4)
        seed = f"{seed_number_1}, {seed_number_2}"
        print(f"SEED: {seed}")
        generated_text_12 = generate(model, num_to_idx, idx_to_num, seed, 700, 1.0, device)


        seed_number_1 = random.randint(1, num_videos // 2)
        seed_number_2 = random.randint(1, num_videos)
        seed = f"{seed_number_1}, {seed_number_2}"
        print(f"SEED: {seed}")
        generated_text_13 = generate(model, num_to_idx, idx_to_num, seed, 700, 1.5, device)

        seed_number_1 = random.randint(1, num_videos // 4)
        seed_number_2 = random.randint(1, num_videos // 2)
        seed = f"{seed_number_1}, {seed_number_2}"
        print(f"SEED: {seed}")
        generated_text_14 = generate(model, num_to_idx, idx_to_num, seed, 700, 1.5, device)

        seed_number_1 = random.randint(1, num_videos // 5)
        seed_number_2 = random.randint(1, num_videos // 3)
        seed = f"{seed_number_1}, {seed_number_2}"
        print(f"SEED: {seed}")
        generated_text_15 = generate(model, num_to_idx, idx_to_num, seed, 700, 1.5, device)

        seed_number_1 = random.randint(1, num_videos // 6)
        seed_number_2 = random.randint(1, num_videos // 4)
        seed = f"{seed_number_1}, {seed_number_2}"
        print(f"SEED: {seed}")
        generated_text_16 = generate(model, num_to_idx, idx_to_num, seed, 700, 1.5, device)


        seed_number_1 = random.randint(1, num_videos // 2)
        seed_number_2 = random.randint(1, num_videos)
        seed = f"{seed_number_1}, {seed_number_2}"
        print(f"SEED: {seed}")
        generated_text_17 = generate(model, num_to_idx, idx_to_num, seed, 700, 2.0, device)

        seed_number_1 = random.randint(1, num_videos // 4)
        seed_number_2 = random.randint(1, num_videos // 2)
        seed = f"{seed_number_1}, {seed_number_2}"
        print(f"SEED: {seed}")
        generated_text_18 = generate(model, num_to_idx, idx_to_num, seed, 700, 2.0, device)

        seed_number_1 = random.randint(1, num_videos // 5)
        seed_number_2 = random.randint(1, num_videos // 3)
        seed = f"{seed_number_1}, {seed_number_2}"
        print(f"SEED: {seed}")
        generated_text_19 = generate(model, num_to_idx, idx_to_num, seed, 700, 2.0, device)

        seed_number_1 = random.randint(1, num_videos // 6)
        seed_number_2 = random.randint(1, num_videos // 4)
        seed = f"{seed_number_1}, {seed_number_2}"
        print(f"SEED: {seed}")
        generated_text_20 = generate(model, num_to_idx, idx_to_num, seed, 700, 2.0, device)


        generated_text = generated_text_1 + generated_text_2 + generated_text_3 + generated_text_4 + generated_text_5 + \
                         generated_text_6 + generated_text_7 + generated_text_8 + generated_text_9 + generated_text_10 + \
                         generated_text_11 + generated_text_12 + generated_text_13 + generated_text_14 + generated_text_15 + \
                         generated_text_16 + generated_text_17 + generated_text_18 + generated_text_19 + generated_text_20

        #generated_text = generated_text_1


        print(f"Generated sequence:\n{generated_text}")

        indices = generated_text.split(", ")
        random.shuffle(indices)
        print(f"Randomized indices:\n{indices}")

        print(f"BEFORE: {len(indices)}")

        unique_indices = list(dict.fromkeys(indices))
        unique_indices = [int(each) for each in unique_indices]
        print(f"AFTER: {len(unique_indices)}")

        int_unique_indices = []
        for each in unique_indices:
            if each <= num_videos:
                int_unique_indices.append(each)

        print(f"FINAL: {len(int_unique_indices)}")
 
        random.shuffle(int_unique_indices)
        return int_unique_indices

def compute_neural_indices_pkl():
    print("Computing neural_indices...")
    neural_indices = Get_Neural_Indices()
    print(" --- OK!")
    return neural_indices

if __name__ == '__main__':
    print("Starting multiprocessing...")
    
    # Initialize the list outside the loop so it accumulates all results
    neural_indices = []
    
    # Create the ProcessPoolExecutor ONCE
    with concurrent.futures.ProcessPoolExecutor(max_workers=MAX_WORKERS) as executor:
        # Submit the function 3 times to the executor and store the Future objects in a list
        futures = [executor.submit(compute_neural_indices_pkl) for i in range(3)]
        
        # as_completed expects an iterable (like our list of futures)
        for future in concurrent.futures.as_completed(futures):
            # .result() will wait for the specific process to finish and get its return value
            neural_indices.append(future.result())

    print(f"Total len(neural_indices): {len(neural_indices)}")

