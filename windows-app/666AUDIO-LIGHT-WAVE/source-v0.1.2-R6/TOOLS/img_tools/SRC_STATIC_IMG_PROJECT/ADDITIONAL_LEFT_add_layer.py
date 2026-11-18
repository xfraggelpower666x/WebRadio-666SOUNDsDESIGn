import shutil, subprocess, os, sys
import blobfile as bf
import random
from PIL import Image, ImageFilter, ImageOps, ImageEnhance
Image.MAX_IMAGE_PIXELS = None

def Overlay(src_img):
    base_image = src_img

    random_layer_item = random.randint(1, 2)

    if random_layer_item == 1:
        random_layer_item_filepath = "g_video_mask_001_1080p.png"
    elif random_layer_item == 2:
        random_layer_item_filepath = "g_video_mask_002_1080p.png"
#    elif random_layer_item == 3:
#        random_layer_item_filepath = "g_video_mask_003_1080p.png"
#    elif random_layer_item == 4:
#        random_layer_item_filepath = "g_video_mask_004_1080p.png"

    overlay_image = Image.open(f"T:/share_t/additional_layers/left/{random_layer_item_filepath}")

    # Get dimensions of the overlay image
    overlay_width, overlay_height = overlay_image.size

    # Get dimensions of the base image
    base_width, base_height = base_image.size

    # Crop the base image to match the overlay's dimensions if it's larger
    if base_width > overlay_width or base_height > overlay_height:
        # Calculate cropping box to center the crop
        left = (base_width - overlay_width) // 2
        top = (base_height - overlay_height) // 2
        right = left + overlay_width
        bottom = top + overlay_height
        base_image = base_image.crop((left, top, right, bottom))

    # Convert both images to RGBA mode to handle transparency
    base_image = base_image.convert("RGBA")
    overlay_image = overlay_image.convert("RGBA")

    # Composite the overlay on top of the base image
    combined_image = Image.alpha_composite(base_image, overlay_image)
    
    return combined_image


def _list_image_files_recursively(data_dir):
  results = []
  for entry in sorted(bf.listdir(data_dir)):
    full_path = bf.join(data_dir, entry)
    ext = entry.split(".")[-1]
    if "." in entry and ext.lower() in ["jpg", "jpeg", "png", "gif"]:
      results.append(full_path)
    elif bf.isdir(full_path):
      results.extend(_list_image_files_recursively(full_path))
  return results

def Generate_Filelist(images_filepath):
  def _list_image_files_recursively(data_dir):
    results = []
    for entry in sorted(bf.listdir(data_dir)):
      full_path = bf.join(data_dir, entry)
      ext = entry.split(".")[-1]
      if "." in entry and ext.lower() in ["jpg", "jpeg", "png", "gif"]:
        results.append(full_path)
      elif bf.isdir(full_path):
        results.extend(_list_image_files_recursively(full_path))
    return results

  print("LOΛDING FILΣS... ")
  _all_files = _list_image_files_recursively(images_filepath)
  print("OK")

  return _all_files


#______________________________________________________

BASE_PATH = "T:/share_t/ORIG/OK_ADD_LAYERS"
INPUT_PATH = "T:/share_t/JPG/FINAL/PNG/ADDITIONAL_LAYERS_SRC_LEFT"
OUTPUT_PATH = f"T:/share_t/JPG/FINAL/000"

_all_all_files = Generate_Filelist(INPUT_PATH)
print("num_files: ", len(_all_all_files))

for each in _all_all_files:
    base_filename = each.replace("\\", "/")
    base_filename = base_filename.split("/")
    base_filename = base_filename[len(base_filename)-1]
#    base_filename = base_filename.split("-0000.jpg")
    base_filename = base_filename.split(".png")
    base_filename = base_filename[0]
    print(f"base_filename={base_filename}")

    img_orig = Image.open(f"T:/share_t/JPG/FINAL/PNG/ADDITIONAL_LAYERS_SRC_LEFT/{base_filename}.png").convert('RGB')
    print(f"img_orig.size: {img_orig.width}x{img_orig.height}")

    #img_tmp = img_tmp.filter(ImageFilter.SHARPEN)

    final_img = Overlay(img_orig)
    final_img.save(f"{OUTPUT_PATH}/{base_filename}.png", format="PNG")


    #final_img.save(f"{OUTPUT_PATH}/{base_filename}.jpg", format="JPEG", quality=95)

