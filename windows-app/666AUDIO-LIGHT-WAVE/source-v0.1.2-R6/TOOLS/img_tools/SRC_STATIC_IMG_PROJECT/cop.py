import os
import shutil
from datetime import datetime


MAIN_FOLDER = 'T:/share_t/ORIG/OK_AS_IS/ORIG_000'
UNDESIRED_FOLDER = 'T:/share_t/ORIG/OK_AS_IS/FINAL'
TEMP_FOLDER = 'T:/share_t/ORIG/OK_AS_IS/ORIG_USE_AND_DELETE'

VIDEO_EXTENSIONS = ('.jpg', '.png')  # Add more if needed

undesired_filenames = set()

for root, _, files in os.walk(UNDESIRED_FOLDER):
    for file in files:
        if file.lower().endswith(VIDEO_EXTENSIONS):
            base_filename = file.replace("\\", "/")
            base_filename = base_filename.split("/")
            base_filename = base_filename[len(base_filename)-1]
            base_filename = base_filename.split(".png")
            base_filename = base_filename[0]
            print(f"base_filename = {base_filename}")
            undesired_filenames.add(base_filename)
print(f"Found {len(undesired_filenames)} unique undesired filenames.")

# Step 2: Scan main folder for matches
matches_found = 0
for root, _, files in os.walk(MAIN_FOLDER):
    for file in files:
        if file.lower().endswith(VIDEO_EXTENSIONS):
            file_path = os.path.join(root, file)
            base_filename = file.replace("\\", "/")
            base_filename = base_filename.split("/")
            base_filename = base_filename[len(base_filename)-1]
            base_filename = base_filename.split(".jpg")
            base_filename = base_filename[0]
            print(f"base_filename = {base_filename}")
            
            if base_filename not in undesired_filenames:
                dest_path = os.path.join(TEMP_FOLDER, file)
                shutil.copy2(file_path, dest_path)
                matches_found += 1
                print(f"Match found: {file_path} -> copied to {dest_path}")

print(f"Total matches copied for review: {matches_found}")