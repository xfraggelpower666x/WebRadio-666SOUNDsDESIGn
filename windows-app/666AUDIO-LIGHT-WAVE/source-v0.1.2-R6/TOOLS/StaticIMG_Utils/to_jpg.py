import shutil, subprocess, os, sys
import blobfile as bf
from PIL import Image, ImageOps, ImageEnhance, ImageFilter

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

  _all_files = []
  print("LOΛDING FILΣS... ")
  for _ in range(10):
    try:
      _all_files = _list_image_files_recursively(images_filepath)
      break
    except TimeoutError:
      print("GoogleDrive Timeout Error... trying again...")
      pass
    except Exception:
      pass
  print("OK")

  return _all_files

INPUT_PATH  = f"F:/yyy/PNG_2"
OUTPUT_PATH = f"F:/yyy/JPG"

_all_all_files = Generate_Filelist(f"{INPUT_PATH}")
print("num_files: ", len(_all_all_files))

for each in _all_all_files:
    base_filename = each.replace("\\", "/")
    base_filename = base_filename.split("/")
    base_filename = base_filename[len(base_filename)-1]
    base_filename = base_filename.split(".png")
    base_filename = base_filename[0]
    print(f"base_filename = {base_filename}")

    tmp_img_str = f"{INPUT_PATH}/{base_filename}.png"
    tmp_img = Image.open(tmp_img_str).convert('RGB')

    save_filename = f"{OUTPUT_PATH}/{base_filename}.jpg"
    print(f"save_filename = {save_filename}\n")

    dst_img = tmp_img
    dst_img.save(save_filename, format="JPEG", quality=95)


