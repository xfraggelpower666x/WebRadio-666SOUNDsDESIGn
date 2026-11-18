import random
import os
import math

import torch
import torch.nn as nn
import torch.optim as optim
from torch.utils.data import Dataset, DataLoader

import concurrent.futures

import uuid
import pickle
if __package__:
    from .index_serialization import load_indices
else:
    from index_serialization import load_indices
import gzip
import json

# Simple Transformer Model (Optimized for GPU memory and speed)
class SimpleTransformer(nn.Module):
    def __init__(self, vocab_size, embed_size=256, num_heads=4, num_layers=4):
        super().__init__()
        self.embed_size = embed_size
        self.embedding = nn.Embedding(vocab_size, embed_size)
        decoder_layer = nn.TransformerDecoderLayer(d_model=embed_size, nhead=num_heads, batch_first=True)
        self.transformer_decoder = nn.TransformerDecoder(decoder_layer, num_layers=num_layers)
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
        # Dummy memory for decoder-only (created directly on device)
        memory = torch.zeros(batch_size, 1, self.embed_size, device=x.device)
        out = self.transformer_decoder(x, memory, tgt_mask=tgt_mask)
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

 
        """indices = generated_text.split(", ")
        unique_indices = list(dict.fromkeys(indices))
        unique_indices = [int(each) for each in unique_indices]

        print(f"BEFORE: {len(indices)}")
        print(f"AFTER: {len(unique_indices)}")"""    

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


def load_neural_indices_pkl(filepath):
#    if os.path.exists(filepath):
#        print(f"Loading neural_indices from {filepath}")
#        with open(filepath, 'rb') as f:
#            return load_indices(f)

    try:
        with gzip.open(filepath, 'rb') as f:
            return load_indices(f)
    except gzip.BadGzipFile:
        print(f"ERROR: {filepath} is corrupted or not a valid gzip file!")
    except EOFError:
        print(f"ERROR: {filepath} was completely truncated/cut off during copy!")
    except FileNotFoundError:
        print("File not found.")
        return None

def load_neural_indices_json(filepath):
    try:
        print(f"Loading neural_indices from {filepath}")
        with open(filepath, 'r') as f:
            return json.load(f)
    except json.JSONDecodeError as e:
        # This triggers if the file was corrupted on the USB drive!
        print(f"CORRUPTION DETECTED: The file {filepath} is not valid JSON.")
        print(f"Specific error: {e}")
        return None
    except FileNotFoundError:
        print("File not found.")
        return None

def compute_neural_indices_pkl_test(filepath):
    print("Computing neural_indices...")
    neural_indices = Get_Neural_Indices()
    print(" --- OK!")
    
    print(f"Saving data...")
    with open(filepath, 'wb') as f:
        pickle.dump(neural_indices, f)
    print(f" --- {filepath} OK!")

    #return neural_indices

#for i in range(3):
#    neural_indices_pkl_filepath = f"neural_indices_pkl/neural_indices_{i:04d}.pkl"
#    compute_neural_indices_pkl_test(neural_indices_pkl_filepath)
#___

#unique_top_signal_indices = Get_Neural_Indices()

#___
#foo = load_neural_indices_pkl("neural_indices_pkl/2bd9cb03-2db7-4407-8a05-19c5ae9564ec.pkl")
#foo = load_neural_indices_pkl("neural_indices_pkl/2bd9cb03-2db7-4407-8a05-19c5ae9564ec.pkl.gz")
#foo = load_neural_indices_json("neural_indices_json/11cb654c-2ce1-49f1-952c-da83ebecbe47.json")
#for index in foo:
#    print(f"{index}/{NUM_VIDEOS}")


def compute_neural_indices():
    print("Computing neural_indices...")
    neural_indices = Get_Neural_Indices()
    print(" --- OK!")

    print(f"Saving data...")

    uuid_str = str(uuid.uuid4())
    print(f" --- {uuid_str}")

    #neural_indices_pkl_filepath = f"F:/precalc_test/neural_indices_pkl/{uuid_str}.pkl"
    #with open(neural_indices_pkl_filepath, 'wb') as f:
    #   pickle.dump(neural_indices, f)

    #neural_indices_pkl_filepath = f"F:/precalc_test/neural_indices_pkl/{uuid_str}.pkl.gz"
    #with gzip.open(neural_indices_pkl_filepath, 'wb') as f:
    #    pickle.dump(neural_indices, f)

    neural_indices_pkl_filepath = f"F:/precalc_test/neural_indices_json/{uuid_str}.json"
    with open(neural_indices_pkl_filepath, 'w') as f:
        json.dump(neural_indices, f)

    print(f" --- {neural_indices_pkl_filepath} OK!")

    return neural_indices

if __name__ == '__main__':
    print("Starting multiprocessing...")
    
    # Initialize the list outside the loop so it accumulates all results
    #neural_indices = []
    num_iterations = 100
    
    # Create the ProcessPoolExecutor ONCE
    with concurrent.futures.ProcessPoolExecutor(max_workers=MAX_WORKERS) as executor:
        # Submit the function 3 times to the executor and store the Future objects in a list
        futures = [executor.submit(compute_neural_indices) for i in range(num_iterations)]
        
        # as_completed expects an iterable (like our list of futures)
        for future in concurrent.futures.as_completed(futures):
            future.result()
            # .result() will wait for the specific process to finish and get its return value
            #neural_indices.append(future.result())

    #print(f"len(neural_indices): {len(neural_indices)}")
