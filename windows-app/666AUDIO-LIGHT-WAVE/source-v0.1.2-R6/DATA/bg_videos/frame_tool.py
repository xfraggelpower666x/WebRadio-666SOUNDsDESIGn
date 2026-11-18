import os
from PIL import Image

# Directories (adjust these to match your actual folder paths)
INPUT_FOLDER = "G:/matrix_code_png_left"
OUTPUT_FOLDER = "G:/matrix_left_ouput_frames"

# Dimensions
CANVAS_WIDTH = 3440
CANVAS_HEIGHT = 1440
PICTURE_WIDTH = 2560
SLICE_WIDTH = 250

def process_frames():
    # Create the output directory if it doesn't exist
    if not os.path.exists(OUTPUT_FOLDER):
        os.makedirs(OUTPUT_FOLDER)

    # 1. Loop across the folder containing those png files
    for filename in os.listdir(INPUT_FOLDER):
        if filename.lower().endswith(".png"):
            input_path = os.path.join(INPUT_FOLDER, filename)
            output_path = os.path.join(OUTPUT_FOLDER, filename)
            
            # Open the original 3440x1440 image
            with Image.open(input_path) as img:
                
                # Assume the 2560x1440 picture is centered. 
                # Start X coordinate is 440.
                x_offset = (CANVAS_WIDTH - PICTURE_WIDTH) // 2 
                
                # 3. Crop the input image to the 2560x1440 picture area
                # crop() takes a tuple: (left, upper, right, lower)
                picture_area = img.crop((
                    x_offset,                  # Left: 440
                    0,                         # Upper: 0
                    x_offset + PICTURE_WIDTH,  # Right: 440 + 2560 = 3000
                    CANVAS_HEIGHT              # Lower: 1440
                ))
                
                # 4. Select 250x1440 slice from both sides of the 2560x1440 image
                # Left slice from the picture area (x=0 to x=250)
                left_slice = picture_area.crop((
                    0, 
                    0, 
                    SLICE_WIDTH, 
                    CANVAS_HEIGHT
                ))
                
                # Right slice from the picture area (x=2310 to x=2560)
                right_slice = picture_area.crop((
                    PICTURE_WIDTH - SLICE_WIDTH, 
                    0, 
                    PICTURE_WIDTH, 
                    CANVAS_HEIGHT
                ))
                
                # 2. Create a new 3440x1440 canvas with a black background
                new_canvas = Image.new("RGB", (CANVAS_WIDTH, CANVAS_HEIGHT), "black")
                
                # 5. Paste left slice to the far left side of the new canvas
                new_canvas.paste(left_slice, (0, 0))
                
                # 6. Paste right slice to the far right side of the new canvas
                # X coordinate is 3440 - 250 = 3190
                new_canvas.paste(right_slice, (CANVAS_WIDTH - SLICE_WIDTH, 0))
                
                # 7. Save the image as png
                #new_canvas.save(output_path, format="PNG")

                base_filename = input_path.replace("\\", "/")
                base_filename = base_filename.split("/")
                base_filename = base_filename[len(base_filename)-1]
                base_filename = base_filename.split(".png")
                base_filename = base_filename[0]
                print(f"base_filename = {base_filename}")
                save_filename = f"{OUTPUT_FOLDER}/{base_filename}.jpg"
                new_canvas.save(save_filename, format="JPEG", quality=99)

                print(f"Processed and saved: {filename}")

if __name__ == "__main__":
    process_frames()
    print("Done!")