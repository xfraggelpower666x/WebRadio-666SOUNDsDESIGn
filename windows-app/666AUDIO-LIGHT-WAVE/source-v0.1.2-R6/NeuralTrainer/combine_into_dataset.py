import glob
import os

def combine_datasets_safely(input_pattern, output_filepath):
    # 1. Find all files that match the pattern (e.g., all .txt files)
    file_list = glob.glob(input_pattern)
    
    # Make sure we don't accidentally read the output file if it already exists!
    if output_filepath in file_list:
        file_list.remove(output_filepath)
        
    print(f"Found {len(file_list)} files to combine.")
    
    if not file_list:
        print("No files found! Check your input pattern.")
        return

    # 2. Open the new output file
    with open(output_filepath, 'w', encoding='utf-8') as outfile:
        is_first_file = True
        
        for filepath in file_list:
            # Read the individual file
            with open(filepath, 'r', encoding='utf-8', errors='replace') as infile:
                text = infile.read()
                
            # --- CLEANUP PHASE ---
            # Remove the DOS EOF character if it exists
            text = text.replace('\x1a', '')
            
            # Strip spaces, newlines, and any stray trailing commas from the very end of the text
            # This ensures we don't accidentally get ", , " between files
            text = text.strip(" \n\r\t,")
            
            # Skip perfectly empty files
            if not text:
                continue
                
            # --- WRITING PHASE ---
            if is_first_file:
                # First file just writes as-is
                outfile.write(text)
                is_first_file = False
            else:
                # Every subsequent file gets a comma and a space inserted first!
                outfile.write(', ' + text)
                
    print(f"Successfully created clean dataset: {output_filepath}")


# --- RUN THE SCRIPT ---
# Change "*.txt" if your files have a specific naming convention (e.g., "dataset_*.txt")
input_files = "*.json" 
output_file = "dataset_0-80k.txt"

combine_datasets_safely(input_files, output_file)
