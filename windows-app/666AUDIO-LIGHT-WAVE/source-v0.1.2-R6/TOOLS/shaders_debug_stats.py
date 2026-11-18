import json
import glob
from collections import Counter

# 1. Setup a Counter to keep track of our stats
shader_usage_stats = Counter()

# 2. Find your JSON files (Change the path to where your JSON files are saved)
# Using glob allows you to process one or multiple files at once.
json_files = glob.glob("C:/1/light_wave_tech/DEBUG/*.json")

for filepath in json_files:
    with open(filepath, 'r', encoding='utf-8') as file:
        try:
            timeline_data = json.load(file)
            items = timeline_data.get("timeline", [])
            
            # 3. Loop through every entry in the JSON array
            for entry in items:
                
                # 4. Check if the entry is exactly what we are looking for
                if entry.get("name") == "RECONSTRUCTED_EFFECT":
                    
                    shader_file = entry.get("shader_effect_file")
                    
                    # 5. If it has a shader file, add +1 to its tally
                    if shader_file:
                        shader_usage_stats[shader_file] += 1
                        
        except json.JSONDecodeError:
            print(f"Error reading {filepath}. Make sure it is valid JSON.")

# 6. Print the results!
print("=== SHADER USAGE STATISTICS ===")

# .most_common() automatically sorts them from most used to least used
for shader, count in shader_usage_stats.most_common():
    print(f"Used {count} times : {shader}")
