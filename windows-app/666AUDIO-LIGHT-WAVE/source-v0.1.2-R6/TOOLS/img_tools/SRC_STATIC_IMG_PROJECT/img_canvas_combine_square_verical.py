import os
import random
from pathlib import Path
from PIL import Image

def get_image_files(folder_path):
    """Returns a list of image paths from the given folder."""
    valid_extensions = {'.jpg', '.jpeg', '.png', '.webp'}
    return[p for p in Path(folder_path).iterdir() if p.suffix.lower() in valid_extensions]

def process_image_pair(sq_path, vt_path, output_path):
    """Processes a single pair of square and vertical images."""
    with Image.open(sq_path) as sq_img, Image.open(vt_path) as vt_img:
        
        # Fallback safety check: ensure heights are exactly 1080
        if sq_img.height != 1080: sq_img = sq_img.resize((1080, 1080))
        if vt_img.height != 1080:
            # Maintain aspect ratio for vertical image if height needs correcting
            new_w = int(vt_img.width * (1080 / vt_img.height))
            vt_img = vt_img.resize((new_w, 1080))

        vt_width = vt_img.width
        
        # Create a new completely black 1920x1080 canvas
        canvas = Image.new('RGB', (1920, 1080), (0, 0, 0))

        # CASE 1: Combined width exceeds 1920 (Vertical width > 840) -> Requires Cropping
        if vt_width > 840:
            excess = vt_width - 840
            left_crop = excess // 2
            right_crop = excess - left_crop # Ensures no pixel is left behind if excess is odd
            
            # crop() takes a tuple: (left, upper, right, lower)
            vt_cropped = vt_img.crop((left_crop, 0, vt_width - right_crop, 1080))
            
            # Paste Square at X=0, Paste Vertical at X=1080
            canvas.paste(sq_img, (0, 0))
            canvas.paste(vt_cropped, (1080, 0))

        # CASE 2: Combined width is less than or exactly 1920 -> Requires Padding
        else:

            # Paste Square shifted by the padding, Paste Vertical right next to it            
            if random.randint(0, 1) == 0:
                combined_width = 1080 + vt_width
                pad_left = (1920 - combined_width) // 2
                canvas.paste(sq_img, (pad_left, 0))
                canvas.paste(vt_img, (pad_left + 1080, 0))
            else:
                combined_width = 1080 + vt_width
                pad_left = (1920 - combined_width) // 2
                canvas.paste(vt_img, (pad_left, 0))
                canvas.paste(sq_img, (pad_left + vt_width, 0))

            
        # Save final combined image
        canvas.save(output_path, quality=95)

def batch_process_images(square_dir, vertical_dir, output_dir, batch_size=100):
    """Pairs images randomly and processes them in batches."""
    Path(output_dir).mkdir(parents=True, exist_ok=True)

    squares = get_image_files(square_dir)
    verticals = get_image_files(vertical_dir)

    if not squares or not verticals:
        print("One or both input directories are empty.")
        return

    # Randomize the arrays to pick random images from each folder
    random.shuffle(squares)
    random.shuffle(verticals)

    # zip() pairs them up. Note: It will stop when the smaller folder runs out of images.
    pairs = list(zip(squares, verticals))
    total_pairs = len(pairs)
    print(f"Found {total_pairs} pairs to process.")

    # Loop through pairs in steps of `batch_size`
    for i in range(0, total_pairs, batch_size):
        batch = pairs[i : i + batch_size]
        batch_num = (i // batch_size) + 1
        print(f"Processing Batch {batch_num} ({len(batch)} images)...")

        for j, (sq_path, vt_path) in enumerate(batch):
            # Formulate an output filename
            out_filename = f"combined_{i + j + 1:04d}.jpg"
            out_path = Path(output_dir) / out_filename
            
            try:
                process_image_pair(sq_path, vt_path, out_path)
            except Exception as e:
                print(f"Error processing {sq_path.name} & {vt_path.name}: {e}")

    print("Processing complete!")

if __name__ == "__main__":
    # --- CONFIGURATION ---
    SQUARE_FOLDER = "T:/share_t/JPG/SQUARE_CONVERT_1080p/LARGE_OVERLAY"
    VERTICAL_FOLDER = "T:/share_t/JPG/VERTICAL_CONVERT_1080p"
    OUTPUT_FOLDER = "T:/share_t/JPG/COMBINED_CANVAS_IMG"
    BATCH_AMOUNT = 100

    batch_process_images(SQUARE_FOLDER, VERTICAL_FOLDER, OUTPUT_FOLDER, BATCH_AMOUNT)