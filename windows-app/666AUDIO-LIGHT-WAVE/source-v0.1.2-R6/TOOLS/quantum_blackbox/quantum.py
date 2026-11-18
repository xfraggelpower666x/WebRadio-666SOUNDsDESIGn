# quantum.py

# colab works with #!pip install qiskit-aer-gpu-cu11
# Tesla T4
# NVIDIA-SMI 580.82.07              
# Driver Version: 580.82.07      
# CUDA Version: 13.0

# RUNPOD WORKS RTX 3070 8GB
# NVIDIA-SMI 595.99.02              
# Driver Version: 595.99.02
# CUDA Version: 13.0
# TEMPLATE: PyTorch 2.13.0 on CUDA 13.0.0 and Ubuntu 24.04.

# pip install qiskit qiskit-aer qiskit-aer-gpu
# pip install qiskit-aer-gpu

from qiskit import QuantumCircuit
from qiskit_aer import AerSimulator
from qiskit.circuit import ParameterVector

import numpy as np
import random
import time
import json

class QuantumBlackBox:
    def __init__(self, filepath, num_qubits=24):
        self.qbit_string_list = self._get_qbit_strings(filepath)

        self.num_qubits = num_qubits
        self.simulator = AerSimulator()
        #self.simulator = AerSimulator(method='statevector', device='GPU')
        
        # 1. Create the circuit ONCE
        self.qc = QuantumCircuit(num_qubits, num_qubits)
        
        # 2. Create Placeholders for our angles
        self.angles = ParameterVector('theta', num_qubits)
        
        # 3. INITIAL STATE: Add the RY gates (this maps your input data to waves)
        for i in range(num_qubits):
            self.qc.ry(self.angles[i], i)

        # ---------------------------------------------------------
        # NEW STEP: Add Entanglement!
        # We will chain them together: 0 entangles 1, 1 entangles 2, etc.
        # ---------------------------------------------------------
        for i in range(num_qubits - 1):
            self.qc.cx(i, i + 1)

        # Optional: You can also close the loop by entangling the last with the first
        # self.qc.cx(num_qubits - 1, 0)
        # ---------------------------------------------------------
            
        # 4. MEASUREMENT: This collapses the entangled waves into your 'dst' string
        self.qc.measure(range(num_qubits), range(num_qubits))
        
        # Now, self.qc is locked in.

    def _get_qbit_strings(self, filepath):
        with open(filepath, 'r', encoding='utf-8', errors='replace') as f:
            text = f.read()
        strings = text.split('\n')
        random.shuffle(strings)
        print(f"num_strings: {len(strings)}")
        return strings

    def get_random_qbit_string(self):
        return random.choice(self.qbit_string_list)

    def get_influenced_binary_string(self, outside_data: list, influence_strength: float = 0.8):
        list_of_circuits_to_run = []
        for i, data_string in enumerate(outside_data):
            #print(f"{i}/{len(outside_data)}")
            # Generate the bound angles for this string
            # Calculate the math
            angle_1 = 2 * np.arcsin(np.sqrt(influence_strength))
            angle_0 = 2 * np.arcsin(np.sqrt(1 - influence_strength))
        
            # Create a list of the actual angles we want for this specific run
            bound_angles = []
            for bit in reversed(data_string):
                if bit == '1':
                    bound_angles.append(angle_1)
                else:
                    bound_angles.append(angle_0)

            # Assign parameters and ADD TO LIST
            # Inject the real angles into our placeholder circuit
            # (This creates a temporary ready-to-run circuit without mutating self.qc)
            list_of_circuits_to_run.append( self.qc.assign_parameters(bound_angles) )

        # Run it
        # The simulator will chew through all circuits in C++ very fast
        batch_result_list = []
        batch_result = self.simulator.run(list_of_circuits_to_run, shots=10000).result()
        for i in range(len(list_of_circuits_to_run)):
            counts = batch_result.get_counts(i)
            quantum_binary_str, amount = list(counts.items())[0]
            #if amount > 1: print(f"{quantum_binary_str}: {amount}")
            if amount > 1: print(f" {amount}")
            batch_result_list.append((quantum_binary_str, amount))
        
        return batch_result_list

    def xor_parity_check(self, binary_string):
        """True if odd number of 1s, False if even."""
        #print(f"# of 1's: {binary_string.count('1')}")
        return binary_string.count('1') % 2 != 0

def chunk_generator(data, size):
    for i in range(0, len(data), size):
        yield data[i : i + size]

#quantum_black_box = QuantumBlackBox("../../DATA/qbit_strings_data.txt")
quantum_black_box = QuantumBlackBox("qbit_strings_data.txt")


def filter_through_quantum_black_box(num_quantum_items=500):
    random_qbit_str_list = []
    for i in range(num_quantum_items):
        #print(f"{i}/{num_quantum_items}")
        random_qbit_str = quantum_black_box.get_random_qbit_string()
        #print(f"random_qbit_str: {random_qbit_str}")
        random_qbit_str_list.append(random_qbit_str)

    # Generate a string where there is an 85% chance each qubit matches the outside data
    batch_size = 100
    time_start = time.time()
    total_iterations = int(len(random_qbit_str_list)/batch_size)
    quantum_results_list = []

    for i, batch in enumerate(chunk_generator(random_qbit_str_list, batch_size)):

        # ---------- ETA CALCULATION ----------
        iters_done = i + 1
        elapsed_time = time.time() - time_start
        time_per_iter = elapsed_time / iters_done
        iters_left = total_iterations - iters_done
        eta_seconds = int(iters_left * time_per_iter)
                    
        m, s = divmod(eta_seconds, 60)
        h, m = divmod(m, 60)
        eta_str = f"{h:02d}:{m:02d}:{s:02d}" if h > 0 else f"{m:02d}:{s:02d}"

        # Print the progress
        print(f"Quantum_Black_Box Iteration: {iters_done}/{total_iterations} | ETA: {eta_str}", end='\r', flush=True)
        # -------------------------------------

        batch_results = quantum_black_box.get_influenced_binary_string(batch, influence_strength=0.85)
        quantum_results_list.extend(batch_results)

    print(f"LEN_random_qbit_str_list: {len(random_qbit_str_list)}")
    print(f"LEN_random_qbit_str_list: {len(quantum_results_list)}")

    return random_qbit_str_list, quantum_results_list

if __name__ == '__main__':

    #NUM_SESSIONS = 1
    NUM_SESSIONS = 100

    # Gathering results as pairs
    all_quantum_pairs = []

    time_start = time.time()
    total_iterations = NUM_SESSIONS
    session_precalc_data = []
    for i in range(NUM_SESSIONS):
        # ---------- ETA CALCULATION ----------
        iters_done = i + 1
        elapsed_time = time.time() - time_start
        time_per_iter = elapsed_time / iters_done
        iters_left = total_iterations - iters_done
        eta_seconds = int(iters_left * time_per_iter)
                    
        m, s = divmod(eta_seconds, 60)
        h, m = divmod(m, 60)
        eta_str = f"{h:02d}:{m:02d}:{s:02d}" if h > 0 else f"{m:02d}:{s:02d}"

        # Print the progress
        print(f"SESSION_PRE_CALC: {iters_done}/{total_iterations} | ETA: {eta_str}")
        # -------------------------------------

        src_qbit_str_list, dst_qbit_str_list = filter_through_quantum_black_box(num_quantum_items=500)

        # Zip them immediately and save them as pairs (dictionaries)
        for src_val, (dst_str, count) in zip(src_qbit_str_list, dst_qbit_str_list):
            all_quantum_pairs.append({
                "src": src_val,
                "dst": dst_str,
                "count": count
            })

    print(f"Gathered {len(all_quantum_pairs)} pairs.")

    # ---------------------------------------------------------
    # 2. SAVING TO JSON
    # ---------------------------------------------------------
    with open("quantum_pairs.json", "w") as f:
        json.dump(all_quantum_pairs, f, indent=4)



"""
# ---------------------------------------------------------
# 3. LOADING AND SHUFFLING
# ---------------------------------------------------------
with open("quantum_pairs.json", "r") as f:
    loaded_pairs = json.load(f)

# Because they are stored as single units, you can just shuffle the main list!
random.shuffle(loaded_pairs)

# If you ever need to use them one by one, it's very easy:
for pair in loaded_pairs[:5]: # just looking at the first 5
    current_src = pair["src"]
    current_dst = pair["dst"]
    # do something with current_src and current_dst...


OR

import json
import random
import glob

# 1. Initialize an empty master list
all_combined_pairs = []

# 2. Find all your JSON files (e.g., everything that ends in .json in a folder)
# Alternatively, you can just provide a manual list: ["file1.json", "file2.json", ...]
file_paths = glob.glob("quantum_pairs_*.json") 

# 3. Iteratively load and extend
for path in file_paths:
    with open(path, "r") as f:
        loaded_pairs = json.load(f)
        # .extend() adds the elements to the master list, rather than the list itself
        all_combined_pairs.extend(loaded_pairs)

print(f"Successfully loaded a total of {len(all_combined_pairs)} pairs!")

# 4. Because they are all in one giant list now, you can shuffle them globally
random.shuffle(all_combined_pairs)

# 5. Use them one by one
for pair in all_combined_pairs[:5]: 
    current_src = pair["src"]
    current_dst = pair["dst"]
    print(f"Source: {current_src}, Destination: {current_dst}")
    # do something with current_src and current_dst...

"""
