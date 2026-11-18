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

json_folder = "F:/precalc_test/neural_indices_json"
json_filenames = [
    os.path.join(json_folder, f) for f in os.listdir(json_folder)
    if os.path.isfile(os.path.join(json_folder, f)) and f.lower().endswith('.json')
]

for json_filename in json_filenames:
    json_values = load_neural_indices_json(json_filename)
    json_values_double = []
    for val in json_values:
        int_val = int(val)
        int_val_double = int_val*2
        if int_val_double >= 19983:
           json_values_double.append(int_val_double)
        #print(f"{int_val} >> {int_val_double}")

    print(f"ORIG LEN: {len(json_values)}")
    min_value = min(json_values)
    max_value = max(json_values)
    print("   Minimum:", min_value)
    print("   Maximum:", max_value)

    print(f"DOUBLE LEN: {len(json_values_double)}")
    min_value = min(json_values_double)
    max_value = max(json_values_double)
    print("   Minimum:", min_value)
    print("   Maximum:", max_value)

    print(f"Saving data...")

    uuid_str = str(uuid.uuid4())
    print(f" --- {uuid_str}")

    #neural_indices_json_filepath = f"F:/precalc_test/neural_indices_json/{uuid_str}.json"
    #with open(neural_indices_json_filepath, 'w') as f:
    #    json.dump(json_values_double, f)

    #print(f" --- {neural_indices_json_filepath} OK!")