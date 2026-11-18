import os

# --- 1. The File Reader (A Generator) ---
def get_vintage_quantum_string(filepath):
    """A Python Generator that yields one string at a time from your massive file."""
    with open(filepath, 'r') as file:
        for line in file:
            # Clean up the string (remove newlines, whitespace)
            yield line.strip()

# Initialize the generator (this does not load the whole 5M lines into memory, just opens the stream)
vintage_quantum_stream = get_vintage_quantum_string("anu_2015_archive.txt")

# --- 2. The Parity Check (from earlier) ---
def xor_parity_check(binary_string):
    """True if odd number of 1s, False if even."""
    return binary_string.count('1') % 2 != 0

# --- 3. The Loop (Simulating your program running) ---
def evaluate_next_video(ai_generated_binary_string):
    try:
        # Pull the next quantum string from your 2015 archive
        vintage_q_string = next(vintage_quantum_stream)
        
        # Ensure lengths match (if your AI outputs 24 bits, slice 24 bits from the ANU string)
        vintage_q_string = vintage_q_string[:24]

        # Evaluate Parity
        ai_passed = xor_parity_check(ai_generated_binary_string)
        q_passed = xor_parity_check(vintage_q_string)
        
        if ai_passed and q_passed:
            print(f"ACTION TRIGGERED: AI aligns with 2015 Quantum Vacuum! ({vintage_q_string})")
            return True
        else:
            return False

    except StopIteration:
        print("Out of vintage quantum strings!")
        return False

# Example usage:
# ai_string = "101100101011000111001010" # (Your PyTorch output)
# evaluate_next_video(ai_string)