import os
import hashlib
import shutil
from pathlib import Path

# Common image extensions to filter out random system files
IMAGE_EXTENSIONS = {'.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp', '.tiff', '.jfif'}

def calculate_file_hash(filepath, chunk_size=8192):
    """Calculates the MD5 hash of a file in chunks to save memory."""
    hasher = hashlib.md5()
    with open(filepath, 'rb') as f:
        for chunk in iter(lambda: f.read(chunk_size), b''):
            hasher.update(chunk)
    return hasher.hexdigest()

def precalculate_hashes(large_folder, output_hash_file):
    """Scans the large folder, calculates hashes, and saves them to a text file."""
    large_folder_path = Path(large_folder)
    known_hashes = set()
    
    print(f"Scanning large folder: {large_folder}")
    
    # rglob('*') will search through all sub-directories as well
    for file_path in large_folder_path.rglob('*'):
        if file_path.is_file() and file_path.suffix.lower() in IMAGE_EXTENSIONS:
            file_hash = calculate_file_hash(file_path)
            known_hashes.add(file_hash)
            
    # Save the hashes to a plain text file
    with open(output_hash_file, 'w') as f:
        for h in known_hashes:
            f.write(h + '\n')
            
    print(f"Success! Saved {len(known_hashes)} unique hashes to {output_hash_file}")

def extract_unique_images(small_folder, unique_folder, hash_file):
    """Compares the small folder against the pre-calculated hashes and extracts unique ones."""
    # 1. Load the pre-calculated hashes
    if not os.path.exists(hash_file):
        print(f"Error: Hash file '{hash_file}' not found. Run pre-calculation first.")
        return
        
    with open(hash_file, 'r') as f:
        known_hashes = set(line.strip() for line in f)
        
    print(f"Loaded {len(known_hashes)} hashes from {hash_file}")
    
    # 2. Setup folders
    small_folder_path = Path(small_folder)
    unique_folder_path = Path(unique_folder)
    
    # Create the unique images folder if it doesn't exist
    unique_folder_path.mkdir(parents=True, exist_ok=True)
    
    copied_count = 0
    print(f"Scanning small folder: {small_folder}...")
    
    # 3. Check small folder
    for file_path in small_folder_path.rglob('*'):
        if file_path.is_file() and file_path.suffix.lower() in IMAGE_EXTENSIONS:
            file_hash = calculate_file_hash(file_path)
            
            if file_hash not in known_hashes:
                # 4. Copy the unique file
                destination = unique_folder_path / file_path.name
                
                # Prevent overwriting if two different images have the exact same filename
                if destination.exists():
                    destination = unique_folder_path / f"{file_path.stem}_{file_hash[:6]}{file_path.suffix}"
                    
                shutil.copy2(file_path, destination) # copy2 preserves original creation/modified dates
                copied_count += 1
                
                # Add this new hash to our loaded set so we don't copy duplicates 
                # that might exist internally within the small folder itself
                known_hashes.add(file_hash)
                
    print(f"Done! Copied {copied_count} unique images to {unique_folder}")

if __name__ == "__main__":
    # ==========================================
    # SET YOUR FOLDER PATHS HERE
    # ==========================================
    LARGE_FOLDER_PATH = r"D:\civitai_png\png\IMG_ORIG_DOWNLOAD_001"
    SMALL_FOLDER_PATH = r"F:\civitai_png\IMG_ORIG_DOWNLOAD_003"
    UNIQUE_FOLDER_PATH = r"F:\civitai_png\unique_img"
    HASH_FILE_PATH = "precalc_hashes.txt"
    
    # WHAT DO YOU WANT TO DO? (Uncomment the step you want to run)
    
    # STEP 1: Pre-calculate the large folder (Run this once)
    precalculate_hashes(LARGE_FOLDER_PATH, HASH_FILE_PATH)
    
    # STEP 2: Find unique images in the small folder (Run this as needed)
    extract_unique_images(SMALL_FOLDER_PATH, UNIQUE_FOLDER_PATH, HASH_FILE_PATH)
