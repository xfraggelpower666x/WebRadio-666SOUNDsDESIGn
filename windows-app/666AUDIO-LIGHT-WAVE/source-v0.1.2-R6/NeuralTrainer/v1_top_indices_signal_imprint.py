# Reading 20K Json files each containing 5000 INT values = ~100K INTS
# Looping through all of them, applying fibonacci harmonic interval 
# fingerprinting of TOP indices signal, splitting back to 5000 INT JSONS
# for further imprinting by SUNO hihat amplitude (this time after bass is already done)

import numpy as np
import pandas as pd
import random
import os
import json
import uuid

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

top_indices = load_neural_indices_json("top_indices_117480_items.json")
num_top_indices = len(top_indices)

json_folder = r"H:\dadda\neural_indices_json"
json_filenames = [
    os.path.join(json_folder, f) for f in os.listdir(json_folder)
    if os.path.isfile(os.path.join(json_folder, f)) and f.lower().endswith('.json')
]

json_values_all = []
for json_filename in json_filenames:
    original_indices = load_neural_indices_json(json_filename)
    json_values_all.extend(original_indices)
    print(f"original_len: {len(original_indices)}")
print(f"json_values_all: {len(json_values_all)}")

def imprint_fibonacci_top_signal(json_values_all):
    fibonacci_seq = [0, 1, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89, 144, 233, 377, 610, 987, 1597, 2584, 4181, 6765, 10946, 17711, 28657, 46368, 75025]

    # 1. Convert to a SET for lightning-fast lookups (it also removes the duplicate '1')
    fib_set = set(fibonacci_seq)

    # 2. Get the highest value (75025) so we know when to restart our cycle
    max_fib_value = max(fib_set)

    # Your running counters
    cycle_index = 0
    assigned_index = 0

    # Create the new empty list to hold everything
    combined_data = []

    for i in range(len(json_values_all)):

        # Check if our cycle has passed the final Fibonacci number (75025)
        # If it has, reset the cycle back to 0 to start the frequencies again.
        if cycle_index > max_fib_value:
            cycle_index = 0

        # Because we are using a set, this lookup is mathematically instant
        if cycle_index in fib_set:
            assigned_value = top_indices[assigned_index]

            # Append the inserted value FIRST...
            combined_data.append(assigned_value)
            # ...alongside the regular item right after it.
            combined_data.append(json_values_all[i])
        
            # Print statement (Note: printing inside a loop of millions will slow 
            # your terminal down, so you might want to comment it out later!)
            print(f"Loop i: {i} | Hit at fib step: {cycle_index} | assigned_val: {assigned_value}")
        
            # This one line safely increments your assigned_index.
            # The '%' operator forces it to wrap back to 0 when it hits the end of top_indices.
            assigned_index = (assigned_index + 1) % num_top_indices
        else:
            # Else clause: just append the regular item
            combined_data.append(json_values_all[i])

        # Advance our internal Fibonacci step counter
        cycle_index += 1

    print(f"Finished! last_assigned_index: {assigned_index}")
    print(f"combined_data len: {len(combined_data)}")

    return combined_data


# Do it thrice... x2 | with rand and without
#   this amount of imprints per iter: combined_data len: 33823

iter_1_data = imprint_fibonacci_top_signal(json_values_all)
random.shuffle(iter_1_data)

iter_2_data = imprint_fibonacci_top_signal(iter_1_data)
random.shuffle(iter_2_data)

iter_3_data = imprint_fibonacci_top_signal(iter_2_data)
random.shuffle(iter_3_data)

iter_4_data = imprint_fibonacci_top_signal(iter_3_data)
iter_5_data = imprint_fibonacci_top_signal(iter_4_data)
iter_6_data = imprint_fibonacci_top_signal(iter_5_data)

print(f"orig_json_values_all LEN: {len(json_values_all)}")
print(f"iter_1_data LEN: {len(iter_1_data)}")
print(f"iter_2_data LEN: {len(iter_2_data)}")
print(f"iter_3_data LEN: {len(iter_3_data)}")
print(f"iter_1_data LEN: {len(iter_4_data)}")
print(f"iter_2_data LEN: {len(iter_5_data)}")
print(f"iter_3_data LEN: {len(iter_6_data)}")

# =================================================================
# 2. Split into smaller JSON files (Chunking)
# =================================================================

combined_data = iter_6_data[:]
chunk_size = 5000

# This 'range' jumps forward by exactly 'chunk_size' each time
for start_idx in range(0, len(combined_data), chunk_size):
    
    # Slice the massive list into a smaller part
    end_idx = start_idx + chunk_size
    chunk = combined_data[start_idx:end_idx]
    
    print(f"Saving data...")
    uuid_str = str(uuid.uuid4())
    print(f" --- {uuid_str}")

    neural_indices_filepath = f"OUTPUT/{uuid_str}.json"
    with open(neural_indices_filepath, 'w', encoding="utf-8") as file:
        json.dump(chunk, file)
        
    print(f"Saved {neural_indices_filepath} ({len(chunk)} items)")
    
print("All files saved successfully!")
