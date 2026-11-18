import random

"""decimals = []
with open('qbit_strings.txt', 'r') as file:
    for line in file:
        binary_str = line.strip()
        if binary_str:
            decimal = int(binary_str, 2)
            decimals.append(decimal)

print(decimals[:100])  # Example: Print first 10 for verification"""


"""def read_binaries_to_decimals(file_path):
    with open(file_path, 'r') as file:
        for line in file:
            binary_str = line.strip()
            if binary_str:
                yield int(binary_str, 2)

decimals = []
for decimal in read_binaries_to_decimals('qbit_strings.txt'):
    decimals.append(decimal)
random.shuffle(decimals)

for decimal in decimals:
    output_filename = f"qbit_dec_random.txt"
    with open(output_filename, "a", encoding="utf-8") as f:
      f.write(f"{decimal}\n")"""



def generate_capped_randoms(file_path):
    CEILING = 20000
    with open(file_path, 'r') as file:
        for line in file:
            decimal_str = line.strip()
            if decimal_str:
                decimal = int(decimal_str)
                capped_random = decimal % CEILING  # Derive a number in [0, CEILING-1]
                yield capped_random

# Example: Collect first 20 for demo
#capped_list = list(generate_capped_randoms('qbit_dec_random.txt'))[:20]
capped_list = list(generate_capped_randoms('qbit_dec_random.txt'))
print(f"len: {len(capped_list)}")
#print(capped_list)
random_dec = random.choice(capped_list)
print(f"random_dec: {random_dec}")


"""ORIG WITH BINS
CEILING = 50000

def generate_capped_randoms(file_path):
    with open(file_path, 'r') as file:
        for line in file:
            binary_str = line.strip()
            if binary_str:
                decimal = int(binary_str, 2)
                capped_random = decimal % CEILING  # Derive a number in [0, CEILING-1]
                yield capped_random

# Example: Collect first 20 for demo
capped_list = list(generate_capped_randoms('qbit_dec_random.txt'))[:20]
print(capped_list)"""
