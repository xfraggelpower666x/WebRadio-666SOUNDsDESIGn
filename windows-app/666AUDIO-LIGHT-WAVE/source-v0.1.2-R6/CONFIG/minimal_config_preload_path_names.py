import os
import random
import json
import sys
from pathlib import Path

if __package__ in (None, ""):
    sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from light_wave_config import cache_cli, cache_path, write_cache

def save_paths_to_cache(get, SHIFT_STATIC, cache_filepath=cache_path("minimal")):
    """
    Scans the directories, generates the file path lists, and saves them to a JSON file.
    Run this function only when your directory contents actually change.
    """
    
    # Extract configurations
    config_neural_indices_json                     = get("neural_indices_path", {}).get("neural_indices_json")
    config_video_folder_all_vertical_1             = get("video_filepaths", {}).get("video_folder_all_vertical_1")
#    config_video_folder_all_vertical_2             = get("video_filepaths", {}).get("video_folder_all_vertical_2")
    config_video_folder_all_horizontal             = get("video_filepaths", {}).get("video_folder_all_horizontal")
    config_video_folder_all_horizontal_static      = get("video_filepaths", {}).get("video_folder_all_horizontal_static")
    config_video_folder_all_segments               = get("video_filepaths", {}).get("video_folder_all_segments")
#    config_video_folder_all_square_1               = get("video_filepaths", {}).get("video_folder_all_square_1")
    config_video_folder_all_square_2               = get("video_filepaths", {}).get("video_folder_all_square_2")
    config_video_folder_all_square_3               = get("video_filepaths", {}).get("video_folder_all_square_3")
#    config_video_folder_all_square_g_video         = get("video_filepaths", {}).get("video_folder_all_square_g_video")

    # 1. ___JSON_FILES___
    neural_indices_filenames_all = []
    if config_neural_indices_json and os.path.exists(config_neural_indices_json):
        neural_indices_filenames_all = [
            os.path.join(config_neural_indices_json, f) for f in sorted(os.listdir(config_neural_indices_json))
            if os.path.isfile(os.path.join(config_neural_indices_json, f)) and f.lower().endswith('.json')
        ]
        # Note: Saved in a static shuffled state. If you need it newly shuffled on EVERY run, 
        # move random.shuffle() to the loading step instead.
        random.shuffle(neural_indices_filenames_all)

    # Helper function to avoid repeating the sorting/appending logic for every list
    def _get_sorted_video_files(folders):
        video_files = []
        for folder in folders:
            if not folder or not os.path.isdir(folder):
                continue
            for f in os.listdir(folder):
                if f.lower().endswith('.mp4') and os.path.isfile(os.path.join(folder, f)):
                    full_path = os.path.join(folder, f)
                    try:
                        num = int(os.path.splitext(f)[0])
                        video_files.append(((0, num, f.casefold(), f), full_path))
                    except ValueError:
                        video_files.append(((1, 0, f.casefold(), f), full_path))
                        
        video_files.sort(key=lambda x: x[0])
        return [path for num, path in video_files]

    # 2. ___VIDEO_FILES_LEFT___
    video_filenames_all_left = _get_sorted_video_files([
        config_video_folder_all_horizontal,
        config_video_folder_all_horizontal_static,
        config_video_folder_all_segments,
#        config_video_folder_all_square_1,
        config_video_folder_all_square_2,
        config_video_folder_all_square_3,
#        config_video_folder_all_square_g_video
    ])

    # 3. ___VIDEO_FILES_LEFT_WITHOUT_STATIC_IMG_VIDEOS__>>_FOR_REPLACEMENT_POOL___
    video_filenames_left_replacement = []
    video_filenames_static = []
    video_base_filenames_static = []

    if SHIFT_STATIC == 1:
        video_filenames_left_replacement = _get_sorted_video_files([
            config_video_folder_all_horizontal,
            config_video_folder_all_segments,
#            config_video_folder_all_square_1,
            config_video_folder_all_square_2,
            config_video_folder_all_square_3,
#            config_video_folder_all_square_g_video
        ])

        if config_video_folder_all_horizontal_static and os.path.exists(config_video_folder_all_horizontal_static):
            video_filenames_static = [
                os.path.join(config_video_folder_all_horizontal_static, f) 
                for f in sorted(os.listdir(config_video_folder_all_horizontal_static))
                if os.path.isfile(os.path.join(config_video_folder_all_horizontal_static, f)) and f.lower().endswith('.mp4')
            ]
            
            # Using os.path.basename replaces all the split/replace logic in the original code cleanly
            video_base_filenames_static = [os.path.basename(path) for path in video_filenames_static]

    # 4. ___VIDEO_FILES_RIGHT___
    video_filenames_all_right = _get_sorted_video_files([
        config_video_folder_all_horizontal,
#        config_video_folder_all_square_1,
        config_video_folder_all_square_2,
        config_video_folder_all_square_3,
#        config_video_folder_all_square_g_video,
        config_video_folder_all_vertical_1,
#        config_video_folder_all_vertical_2
    ])

    # 5. ___VIDEO_FILES_VERTICAL___
    video_filenames_all_vertical = _get_sorted_video_files([
        config_video_folder_all_vertical_1,
#        config_video_folder_all_vertical_2
    ])

    # Package everything into a dictionary
    cache_data = {
        "neural_indices_filenames_all": neural_indices_filenames_all,
        "video_filenames_all_left": video_filenames_all_left,
        "video_filenames_left_replacement": video_filenames_left_replacement,
        "video_filenames_static": video_filenames_static,
        "video_base_filenames_static": video_base_filenames_static,
        "video_filenames_all_right": video_filenames_all_right,
        "video_filenames_all_vertical": video_filenames_all_vertical
    }

    # Save to JSON
    write_cache(cache_filepath, cache_data)
        
    print(f"Paths successfully cached to {cache_filepath}")
    return cache_data


def load_paths_from_cache(cache_filepath=cache_path("minimal")):
    """
    Loads the previously saved directory path variables from a JSON cache file.
    """
    if not os.path.exists(cache_filepath):
        raise FileNotFoundError(f"Cache file {cache_filepath} not found. Please run the save function first.")
        
    with open(cache_filepath, 'r', encoding='utf-8') as f:
        cache_data = json.load(f)
        
    return cache_data


if __name__ == "__main__":
    cache_cli(save_paths_to_cache, "minimal")
