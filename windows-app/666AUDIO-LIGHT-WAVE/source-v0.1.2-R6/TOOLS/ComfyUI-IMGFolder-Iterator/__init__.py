import os

from .media_paths import media_path

class ImageFolderIterator:
    @classmethod
    def INPUT_TYPES(cls):
        return {
            "required": {
                "folder_path": ("STRING", {"default": "C:/your_image_folder/"}),
                "index": ("INT", {"default": 0, "min": 0, "max": 999999, "step": 1}),
            },
        }

    RETURN_TYPES = ("STRING", "INT")
    RETURN_NAMES = ("image_path", "total_files")
    FUNCTION = "get_image_path"
    CATEGORY = "CustomFolderTools"

    def get_image_path(self, folder_path, index):
        folder_path = media_path(folder_path)
        # 1. Check if folder exists
        if not os.path.exists(folder_path):
            raise ValueError(f"Folder does not exist: {folder_path}")

        # 2. Define valid image types
        valid_exts = {".png", ".jpg"}
        
        # 3. Find all image files in the folder
        files =[f for f in os.listdir(folder_path) 
                 if os.path.isfile(os.path.join(folder_path, f)) and 
                 os.path.splitext(f)[1].lower() in valid_exts]
        
        if not files:
            raise ValueError(f"No image files found in: {folder_path}")

        # 4. Sort alphabetically so the order is always the same
        files.sort()
        
        # 5. Use modulo math to select the file. 
        # (This means if index is 15 but you only have 10 images, it loops back safely instead of crashing)
        safe_index = index % len(files)
        selected_file = files[safe_index]
        
        # 6. Build the full path
        full_path = os.path.join(folder_path, selected_file)
        full_path = os.path.normpath(media_path(full_path)) # Fixes slashes for Windows/Mac/Linux

        print(f"\n[Folder Iterator] Loaded image {safe_index + 1} of {len(files)}: {selected_file}")

        return (full_path, len(files))

from PIL import Image, ImageOps
import torch
import numpy as np

class LoadImageFromAbsolutePath:
    @classmethod
    def INPUT_TYPES(cls):
        return {
            "required": {
                # forceInput=True means this node won't have a text box, 
                # it FORCES you to connect a wire to it.
                "image_path": ("STRING", {"forceInput": True}), 
            }
        }

    RETURN_TYPES = ("IMAGE",)
    FUNCTION = "load_image"
    CATEGORY = "CustomFolderTools"

    def load_image(self, image_path):
        # 1. Open the image
        with Image.open(media_path(image_path)) as source:
            img = ImageOps.exif_transpose(source).convert("RGB")
        
        # 2. Fix rotation metadata (if from a smartphone camera)
        
        # 3. Convert to standard RGB 
        
        # 4. Convert to ComfyUI's tensor format [Batch, Height, Width, Channels]
        img_np = np.array(img).astype(np.float32) / 255.0
        img_tensor = torch.from_numpy(img_np).unsqueeze(0)
        
        return (img_tensor,)

# Tell ComfyUI to load both of your nodes
NODE_CLASS_MAPPINGS = {
    "ImageFolderIterator": ImageFolderIterator,
    "LoadImageFromAbsolutePath": LoadImageFromAbsolutePath
}

NODE_DISPLAY_NAME_MAPPINGS = {
    "ImageFolderIterator": "Simple Image Folder Iterator",
    "LoadImageFromAbsolutePath": "Load Image From Absolute Path"
}
