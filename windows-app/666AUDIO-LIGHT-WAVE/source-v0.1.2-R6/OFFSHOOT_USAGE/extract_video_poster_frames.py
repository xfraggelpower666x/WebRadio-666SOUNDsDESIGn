import os
import cv2
from pathlib import Path

def generate_video_posters(folder_path, suffix="_poster", frame_number=10):
    # Commonly used web and local video formats
    video_exts = {'.mp4', '.webm', '.mkv', '.avi', '.mov', '.ogg'}
    
    # Convert string to a Path object for clean Windows path handling
    folder = Path(folder_path)
    
    if not folder.is_dir():
        print(f"Error: The folder '{folder_path}' does not exist.")
        return

    print(f"Scanning folder: {folder_path}\n")

    # Loop through all files in the given directory
    for file_path in folder.iterdir():
        # Check if the file is a video based on its extension
        if file_path.suffix.lower() in video_exts:
            print(f"Processing: {file_path.name}...")
            
            # Load the video file
            cap = cv2.VideoCapture(str(file_path))
            
            if not cap.isOpened():
                print(f"  -> Failed to open video: {file_path.name}")
                continue
            
            # --- BEST PRACTICE OPTION ---
            # To extract exactly 1 second into the video (avoids black fade-ins better than the 10th frame),
            # uncomment the next two lines and comment out the "target_frame_index" line below it:
            
            # fps = cap.get(cv2.CAP_PROP_FPS)
            # target_frame_index = int(fps * 1) if fps > 0 else 9 
            
            # Default: Jump to the 10th frame (0-indexed, so we use 9)
            target_frame_index = max(0, frame_number - 1)
            
            cap.set(cv2.CAP_PROP_POS_FRAMES, target_frame_index)
            
            # Read the specific frame
            ret, frame = cap.read()
            
            if ret:
                # Construct output filename: original_name + _poster.jpg
                # e.g., "my_video.mp4" -> "my_video_poster.jpg"
                output_filename = f"{file_path.stem}{suffix}.jpg"
                output_path = folder / output_filename
                
                # Save the frame as a high-quality JPEG
                cv2.imwrite(str(output_path), frame, [int(cv2.IMWRITE_JPEG_QUALITY), 90])
                print(f"  -> Saved poster to: {output_filename}")
            else:
                print(f"  -> Could not extract frame {frame_number} from {file_path.name}")
            
            # Release the video file to free up memory
            cap.release()

if __name__ == "__main__":
    # Replace the path below with your actual Windows folder path.
    # The 'r' before the string ensures Windows backslashes are treated correctly.
    TARGET_FOLDER = r"C:\Users\YourUsername\Videos\WebsiteAssets"
    
    # Run the function. "_poster" is the standard naming convention for HTML5 video stills.
    generate_video_posters(TARGET_FOLDER, suffix="_poster", frame_number=10)
    print("\nAll tasks completed!")
