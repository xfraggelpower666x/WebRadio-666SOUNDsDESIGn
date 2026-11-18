import os

from .media_paths import media_path

class VideoFolderIterator:
    @classmethod
    def INPUT_TYPES(cls):
        return {
            "required": {
                "folder_path": ("STRING", {"default": "C:/your_video_folder/"}),
                "index": ("INT", {"default": 0, "min": 0, "max": 999999, "step": 1}),
            },
        }

    RETURN_TYPES = ("STRING", "INT")
    RETURN_NAMES = ("video_path", "total_files")
    FUNCTION = "get_video_path"
    CATEGORY = "CustomFolderTools"

    def get_video_path(self, folder_path, index):
        folder_path = media_path(folder_path)
        # 1. Check if folder exists
        if not os.path.exists(folder_path):
            raise ValueError(f"Folder does not exist: {folder_path}")

        # 2. Define valid video types
        valid_exts = {".mp4", ".mkv", ".avi", ".mov", ".webm"}
        
        # 3. Find all video files in the folder
        files =[f for f in os.listdir(folder_path) 
                 if os.path.isfile(os.path.join(folder_path, f)) and 
                 os.path.splitext(f)[1].lower() in valid_exts]
        
        if not files:
            raise ValueError(f"No video files found in: {folder_path}")

        # 4. Sort alphabetically so the order is always the same
        files.sort()
        
        # 5. Use modulo math to select the file. 
        # (This means if index is 15 but you only have 10 videos, it loops back safely instead of crashing)
        safe_index = index % len(files)
        selected_file = files[safe_index]
        
        # 6. Build the full path
        full_path = os.path.join(folder_path, selected_file)
        full_path = os.path.normpath(media_path(full_path)) # Fixes slashes for Windows/Mac/Linux

        print(f"\n[Folder Iterator] Loaded video {safe_index + 1} of {len(files)}: {selected_file}")

        return (full_path, len(files))

# Tell ComfyUI to load this node
NODE_CLASS_MAPPINGS = {
    "VideoFolderIterator": VideoFolderIterator
}

NODE_DISPLAY_NAME_MAPPINGS = {
    "VideoFolderIterator": "Simple Video Folder Iterator"
}
