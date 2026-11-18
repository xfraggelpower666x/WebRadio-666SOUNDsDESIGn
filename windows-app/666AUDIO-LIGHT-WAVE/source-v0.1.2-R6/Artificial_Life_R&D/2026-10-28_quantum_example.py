import torch
import math
# Assuming Qiskit is installed: pip install qiskit qiskit-aer
from qiskit import QuantumCircuit
from qiskit_aer import AerSimulator

# --- 1. Your PyTorch Function ---
# (Assuming generate_patched_floats is defined exactly as in your binary_int.txt)
# int_list, py_binary_str = generate_patched_floats(model, seed, mean, std, patch_size, length=24)

# For the sake of the example, let's say the neural network outputted a 24-bit string:
py_binary_str = "101100101011000111001010" 

# --- 2. The Quantum Function ---
def get_quantum_binary_string(length):
    """Generates a perfectly random binary string using Quantum Superposition."""
    # Create a quantum circuit with 'length' qubits and 'length' classical bits for measurement
    qc = QuantumCircuit(length, length)
    
    # Apply Hadamard gate to every qubit to put them in a 50/50 superposition
    for i in range(length):
        qc.h(i)
        
    # Measure the qubits (collapsing the wave function into classical 0s and 1s)
    qc.measure(range(length), range(length))
    
    # Run the circuit ONCE on the simulator
    simulator = AerSimulator()
    result = simulator.run(qc, shots=1).result()
    
    # Extract the resulting binary string from the counts dictionary
    counts = result.get_counts()
    quantum_binary_str = list(counts.keys())[0] 
    
    return quantum_binary_str

quantum_binary_str = get_quantum_binary_string(length=24)

# --- 3. The XOR / Parity Gate ---
def xor_parity_check(binary_string):
    """Returns True if there is an ODD number of 1s (XOR gate behavior across the string)"""
    # Simply count the '1's. If the count is not divisible by 2, parity is Odd (True)
    return binary_string.count('1') % 2 != 0

# --- 4. The Final Logic ---
# Evaluate both strings
py_passed = xor_parity_check(py_binary_str)
q_passed = xor_parity_check(quantum_binary_str)

print(f"PyTorch Binary: {py_binary_str} | Parity Passed: {py_passed}")
print(f"Quantum Binary: {quantum_binary_str} | Parity Passed: {q_passed}")

# The Action Trigger
if py_passed and q_passed:
    print("ACTION TRIGGERED: Both AI and Quantum Universe align on Odd Parity!")
else:
    print("NO ACTION: Gates did not align.")