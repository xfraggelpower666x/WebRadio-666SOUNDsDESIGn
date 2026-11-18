import os
from PIL import Image

def process_images(input_folder, output_folder):
    # Set of file extensions to look for
    valid_extensions = {'.jpg', '.jpeg', '.png', '.jfif', '.webp'}

    # Create the output directory if it doesn't exist
    if not os.path.exists(output_folder):
        os.makedirs(output_folder)

    # Loop through all files in the input folder
    for filename in os.listdir(input_folder):
        ext = os.path.splitext(filename)[1].lower()
        
        # Skip files that don't match our target extensions
        if ext not in valid_extensions:
            continue

        input_path = os.path.join(input_folder, filename)
        
        # Prepare the new filename (replacing old extension with .jpg)
        base_name = os.path.splitext(filename)[0]
        output_path = os.path.join(output_folder, f"{base_name}.jpg")

        try:
            with Image.open(input_path) as img:
                
                # 1. Handle Transparency (PNG/WEBP to JPG)
                # JPEGs don't support alpha channels (transparency). 
                # We paste transparent images over a solid white background.
                if img.mode in ('RGBA', 'LA') or (img.mode == 'P' and 'transparency' in img.info):
                    alpha = img.convert('RGBA').getchannel('A')
                    bg = Image.new('RGB', img.size, (255, 255, 255)) # White background
                    bg.paste(img, mask=alpha)
                    img = bg
                elif img.mode != 'RGB':
                    img = img.convert('RGB')

                # Save as JPG with highest possible quality
                # quality=100: Minimum compression
                # subsampling=0: Keeps maximum color accuracy (turns off chroma subsampling)
                img.save(output_path, 'JPEG', quality=95, subsampling=0)
                
                print(f"✅ Processed: {filename}")

        except Exception as e:
            print(f"❌ Error processing {filename}: {e}")

# ==========================================
# Run the script
# ==========================================
if __name__ == "__main__":
    # Replace these paths with your actual folder paths
    INPUT_DIR = "./input_images"
    OUTPUT_DIR = "./output_images"
    
    print("Starting image processing...")
    process_images(INPUT_DIR, OUTPUT_DIR)
    print("Finished processing all images!")
