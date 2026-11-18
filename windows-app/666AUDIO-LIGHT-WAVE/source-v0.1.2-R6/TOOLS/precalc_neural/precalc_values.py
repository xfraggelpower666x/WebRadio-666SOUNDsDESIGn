import moviepy.editor as mp
import pygame
import random
import os
import numpy as np
import cv2
from scipy import ndimage
from collections import Counter
import concurrent.futures
import pickle
if __package__:
    from .index_serialization import load_indices
else:
    from index_serialization import load_indices

# Number of workers; adjust based on your CPU cores
max_workers = 12  # For example, using 4 processes

# File paths for saving/loading
tmp_file_left  = 'tmp_signal_indices_left.pkl'
top_file_left  = 'top_signal_indices_left.pkl'
tmp_file_right = 'tmp_signal_indices_right.pkl'
top_file_right = 'top_signal_indices_right.pkl'


# Function to load data if exists, else compute and save
def compute_or_load_tmp(tmp_file, num_videos):
    num_iterations = 1111
    #num_iterations = 11111

    if os.path.exists(tmp_file):
        print(f"Loading tmp_signal_indices from {tmp_file}")
        with open(tmp_file, 'rb') as f:
            return load_indices(f)
    else:
        print("Computing tmp_signal_indices...")
        tmp_signal_indices = []
        with concurrent.futures.ProcessPoolExecutor(max_workers=max_workers) as executor:
            futures = [executor.submit(Random_Walk, num_videos) for _ in range(num_iterations)]
            for future in concurrent.futures.as_completed(futures):
                tmp_signal_indices.extend(future.result())
        with open(tmp_file, 'wb') as f:
            pickle.dump(tmp_signal_indices, f)
        return tmp_signal_indices

# Similar for top_signal_indices, but it depends on tmp_signal_indices
def compute_or_load_top(top_file, tmp_signal_indices):
    num_iterations = 111
    #num_iterations = 333

    if os.path.exists(top_file):
        print(f"Loading top_signal_indices from {top_file}")
        with open(top_file, 'rb') as f:
            return load_indices(f)
    else:
        print("Computing top_signal_indices...")
        top_signal_indices = []
        with concurrent.futures.ProcessPoolExecutor(max_workers=max_workers) as executor:
            futures = [executor.submit(Random_Walk_Final, tmp_signal_indices) for _ in range(num_iterations)]
            for future in concurrent.futures.as_completed(futures):
                top_signal_indices.extend(future.result())
        with open(top_file, 'wb') as f:
            pickle.dump(top_signal_indices, f)
        return top_signal_indices



# Function to load data if exists, else compute and save
def load_and_continue_tmp(tmp_file, num_videos):
    num_iterations = 11111
    #num_iterations = 11111

    if os.path.exists(tmp_file):
        print(f"Loading tmp_signal_indices from {tmp_file}")
        with open(tmp_file, 'rb') as f:
            loaded_values = load_indices(f)

        tmp_signal_indices = loaded_values
        with concurrent.futures.ProcessPoolExecutor(max_workers=max_workers) as executor:
            futures = [executor.submit(Random_Walk, num_videos) for _ in range(num_iterations)]
            for future in concurrent.futures.as_completed(futures):
                tmp_signal_indices.extend(future.result())
        with open(tmp_file, 'wb') as f:
            pickle.dump(tmp_signal_indices, f)
        return tmp_signal_indices
    else:
        print("Computing tmp_signal_indices...")
        tmp_signal_indices = []
        with concurrent.futures.ProcessPoolExecutor(max_workers=max_workers) as executor:
            futures = [executor.submit(Random_Walk, num_videos) for _ in range(num_iterations)]
            for future in concurrent.futures.as_completed(futures):
                tmp_signal_indices.extend(future.result())
        with open(tmp_file, 'wb') as f:
            pickle.dump(tmp_signal_indices, f)
        return tmp_signal_indices

# Similar for top_signal_indices, but it depends on tmp_signal_indices
def load_and_continue_top(top_file, tmp_signal_indices):
    num_iterations = 111
    #num_iterations = 333

    if os.path.exists(top_file):
        print(f"Loading top_signal_indices from {top_file}")
        with open(top_file, 'rb') as f:
            loaded_values = load_indices(f)

        top_signal_indices = loaded_values
        with concurrent.futures.ProcessPoolExecutor(max_workers=max_workers) as executor:
            futures = [executor.submit(Random_Walk_Final, tmp_signal_indices) for _ in range(num_iterations)]
            for future in concurrent.futures.as_completed(futures):
                top_signal_indices.extend(future.result())
        with open(top_file, 'wb') as f:
            pickle.dump(top_signal_indices, f)
        return top_signal_indices
    else:
        print("Computing top_signal_indices...")
        top_signal_indices = []
        with concurrent.futures.ProcessPoolExecutor(max_workers=max_workers) as executor:
            futures = [executor.submit(Random_Walk_Final, tmp_signal_indices) for _ in range(num_iterations)]
            for future in concurrent.futures.as_completed(futures):
                top_signal_indices.extend(future.result())
        with open(top_file, 'wb') as f:
            pickle.dump(top_signal_indices, f)
        return top_signal_indices


#tmp_signal_indices = compute_or_load_tmp()
#top_signal_indices = compute_or_load_top(tmp_signal_indices)
#print("Precalculation complete or loaded. tmp_signal_indices length:", len(tmp_signal_indices))
#print("top_signal_indices length:", len(top_signal_indices))

os.environ['SDL_VIDEO_MINIMIZE_ON_FOCUS_LOSS'] = '0'


def Random_Walk(num_items):
    top_signal_final = []

    # Simulate 1000 videos as indices
    videos = list(range(num_items))

    # Initial uniform weights
    weights = [1.0] * num_items

    # Track overall frequencies across all iterations for final signal
    overall_freq = Counter()

    # Run 150 iterations (Monte Carlo-like trials)
    for iteration in range(150):
        # Limited run: select 150 videos per iteration using current weights
        selections = random.choices(videos, weights=weights, k=150)
    
        # Update overall frequencies
        overall_freq.update(selections)
    
        # Get frequencies in this run
        run_freq = Counter(selections)
    
        # Increase weights for videos that appeared more than once (threshold for "more often")
        for video, count in run_freq.items():
            if count > 1:
                weights[video] *= 1.1  # Multiplier to boost future probability
            else: # 2025-11-11 ADDED THIS TO COMPENSATE
                #weights[video] *= 0.44
                #weights[video] *= 0.55
                #weights[video] *= 0.65
                weights[video] *= 0.75

    
        # Normalize weights to prevent explosion (optional but stabilizes)
        total_weight = sum(weights)
        weights = [w / total_weight for w in weights]

    # Identify "signal": top 15% videos by overall frequency
    sorted_videos = overall_freq.most_common()
    top_signal = sorted_videos[:int(0.15 * len(videos))]  # Top 100


    # Print sample results
#    print("Sample of top signal videos and their total frequencies:")
    for video, freq in top_signal[:50]:
#        print(f"Video {video}: {freq} occurrences")
        top_signal_final.append(video)

#    print("\nSample of final weights for top signal videos:")
#    for video, _ in top_signal[:50]:
#        print(f"Video {video}: weight {weights[video]:.4f}")

    return top_signal_final

def Random_Walk_Final(final_signal_list):
    top_signal_final = []

    videos = final_signal_list
    num_items = len(videos)
    print(f"num_items = {num_items}")

    # Mapping from video ID to its index in videos/weights
    video_to_index = {vid: i for i, vid in enumerate(videos)}

    # Initial uniform weights
    weights = [1.0] * num_items

    # Track overall frequencies across all iterations for final signal
    overall_freq = Counter()

    for iteration in range(111):
        selections = random.choices(videos, weights=weights, k=100)
        #print(f"selections: {selections}")
    
        # Update overall frequencies
        overall_freq.update(selections)
    
        # Get frequencies in this run
        run_freq = Counter(selections)
    
        # Increase weights for videos that appeared more than once (threshold for "more often")
        for video, count in run_freq.items():
            if count > 1:
                idx = video_to_index[video]
                weights[idx] *= 1.111  # Multiplier to boost future probability
            else: # 2025-11-11 ADDED THIS TO COMPENSATE
                idx = video_to_index[video]
                #weights[idx] *= 0.44
                #weights[idx] *= 0.55
                #weights[idx] *= 0.65
                weights[idx] *= 0.75
    
        # Normalize weights to prevent explosion (optional but stabilizes)
        total_weight = sum(weights)
        weights = [w / total_weight for w in weights]

    sorted_videos = overall_freq.most_common()
    #top_signal = sorted_videos[:int(1.00 * len(videos))]
    #top_signal = sorted_videos[:int(0.80 * len(videos))]
    #top_signal = sorted_videos[:int(0.70 * len(videos))]
    top_signal = sorted_videos[:int(0.60 * len(videos))]

    for video, freq in top_signal:
#        print(f"Video {video}: {freq} occurrences")
        top_signal_final.append(video)

    return top_signal_final

def Simul_Signal(video_filenames):
    randomized_videofiles = []
    num_videos = len(video_filenames)

    for simul_iter in range(2):
        for i in range(num_videos):
            random.shuffle(video_filenames)
            random_index = random.randint(0, num_videos-1)
            random_videofile = video_filenames[random_index]
            randomized_videofiles.append(random_videofile)

    num_randomized = len(randomized_videofiles)
    print(f"num_randomized = {num_randomized}")

    # Using dict.fromkeys() to remove duplicates while preserving order
    unique_filenames = list(dict.fromkeys(randomized_videofiles))

    num_unique = len(unique_filenames)
    print(f"num_unique = {num_unique}")

    # Now, catch duplicates: Count occurrences and filter for those >1
    filename_counts = Counter(randomized_videofiles)
    duplicates = {filename: count for filename, count in filename_counts.items() if 3 <= count <= 100}

    # Example outputs
    print(f"Total unique filenames: {len(unique_filenames)}")
    print(f"Number of duplicate filenames: {len(duplicates)}")
    print("Duplicates and their counts:")
    for filename, count in sorted(duplicates.items(), key=lambda x: x[1], reverse=True):  # Sorted by count descending
        print(f"{filename}: {count} times")

    # Modified: List of filtered duplicate filenames, sorted by count descending (most occurrences first)
    duplicate_filenames_list = sorted(duplicates, key=lambda f: duplicates[f], reverse=True)

    num_duplicates = len(duplicate_filenames_list)
    print(f"num_duplicates = {num_duplicates}")
 
    return duplicate_filenames_list

def simul_or_load(simul_file, video_filenames):
    if os.path.exists(simul_file):
        print(f"Loading simul_indices from {simul_file}")
        with open(simul_file, 'rb') as f:
            return load_indices(f)
    else:
        ##__SIMUL__SIGNAL
        print("Computing simul_indices...")
        video_filenames_tmp_1 = Simul_Signal(video_filenames)
        video_filenames_tmp_2 = Simul_Signal(video_filenames)
        video_filenames_tmp   = video_filenames_tmp_1 + video_filenames_tmp_2
        video_filenames_tmp   = Simul_Signal(video_filenames_tmp)

        with open(simul_file, 'wb') as f:
            pickle.dump(video_filenames_tmp, f)
        return video_filenames_tmp


def generate_capped_randoms(file_path):
    CEILING = 20000
    with open(file_path, 'r') as file:
        for line in file:
            decimal_str = line.strip()
            if decimal_str:
                decimal = int(decimal_str)
                capped_random = decimal % CEILING  # Derive a number in [0, CEILING-1]
                yield capped_random

def generate_vagina_dec_randoms(file_path):
    with open(file_path, 'r') as file:
        for line in file:
            dec_str = line.strip()
            if dec_str:
                decimal = int(dec_str)
                yield decimal


def play_video_fullscreen():
    try:



        video_folder_1 = "C:/1/grok-video_glitch_elara/square_holofractal"
        video_filenames_1 = [
            os.path.join(video_folder_1, f) for f in os.listdir(video_folder_1)
            if os.path.isfile(os.path.join(video_folder_1, f)) and f.lower().endswith('.mp4')
        ]
        random.shuffle(video_filenames_1)

        num_videos_1 = len(video_filenames_1)
        print(f"num_videos_1 = {num_videos_1}")


        video_folder_2 = "C:/1/grok-video_glitch_elara/horizontal"
        video_filenames_2 = [
            os.path.join(video_folder_2, f) for f in os.listdir(video_folder_2)
            if os.path.isfile(os.path.join(video_folder_2, f)) and f.lower().endswith('.mp4')
        ]
        random.shuffle(video_filenames_2)

        num_videos_2 = len(video_filenames_2)
        print(f"num_videos_2 = {num_videos_2}")


        video_folder_3 = "C:/1/grok-video_glitch_elara/square"
        video_filenames_3 = [
            os.path.join(video_folder_3, f) for f in os.listdir(video_folder_3)
            if os.path.isfile(os.path.join(video_folder_3, f)) and f.lower().endswith('.mp4')
        ]
        random.shuffle(video_filenames_3)

        num_videos_3 = len(video_filenames_3)
        print(f"num_videos_3 = {num_videos_3}")


        video_folder_4 = "C:/1/grok-video_glitch_elara/vertical"
        video_filenames_4 = [
            os.path.join(video_folder_4, f) for f in os.listdir(video_folder_4)
            if os.path.isfile(os.path.join(video_folder_4, f)) and f.lower().endswith('.mp4')
        ]
        random.shuffle(video_filenames_4)

        num_videos_4 = len(video_filenames_4)
        print(f"num_videos_4 = {num_videos_4}")


        for i in range(6):
            if i == 0:
                print(f"i==0: {i}")
                video_filenames_all_left  = video_filenames_1 + video_filenames_2 + video_filenames_3
                video_filenames_all_right = video_filenames_1 + video_filenames_2 + video_filenames_3
            elif i == 1:
                print(f"i==1: {i}")
                video_filenames_all_left  = video_filenames_1 + video_filenames_2 + video_filenames_3 + video_filenames_4
                video_filenames_all_right = video_filenames_1 + video_filenames_2 + video_filenames_3 + video_filenames_4
            elif i == 2:
                print(f"i==2: {i}")
                video_filenames_all_left  = video_filenames_1 + video_filenames_2 + video_filenames_3 + video_filenames_4 + \
                                            video_filenames_1
                video_filenames_all_right = video_filenames_1 + video_filenames_2 + video_filenames_3 + video_filenames_4 + \
                                            video_filenames_1
            elif i == 3:
                print(f"i==3: {i}")
                video_filenames_all_left  = video_filenames_1 + video_filenames_2 + video_filenames_3 + video_filenames_4 + \
                                            video_filenames_1 + video_filenames_2
                video_filenames_all_right = video_filenames_1 + video_filenames_2 + video_filenames_3 + video_filenames_4 + \
                                            video_filenames_1 + video_filenames_2
            elif i == 4:
                print(f"i==4: {i}")
                video_filenames_all_left  = video_filenames_1 + video_filenames_2 + video_filenames_3 + video_filenames_4 + \
                                            video_filenames_1 + video_filenames_2 + video_filenames_3 + video_filenames_4
                video_filenames_all_right = video_filenames_1 + video_filenames_2 + video_filenames_3 + video_filenames_4 + \
                                            video_filenames_1 + video_filenames_2 + video_filenames_3 + video_filenames_4
            elif i == 5:
                print(f"i==5: {i}")
                video_filenames_all_left  = video_filenames_1 + video_filenames_2 + video_filenames_3 + video_filenames_4 + \
                                            video_filenames_1 + video_filenames_2 + video_filenames_3 + video_filenames_4 + \
                                            video_filenames_1 + video_filenames_2 + video_filenames_3 + video_filenames_4
                video_filenames_all_right = video_filenames_1 + video_filenames_2 + video_filenames_3 + video_filenames_4 + \
                                            video_filenames_1 + video_filenames_2 + video_filenames_3 + video_filenames_4 + \
                                            video_filenames_1 + video_filenames_2 + video_filenames_3 + video_filenames_4

            num_videos_all_left  = len(video_filenames_all_left)
            num_videos_all_right = len(video_filenames_all_right)
 
            print(f"num_videos_all_left = {num_videos_all_left}")
            print(f"num_videos_all_right = {num_videos_all_right}")


            #tmp_signal_indices = compute_or_load_tmp(tmp_file_left, num_videos_vertical_left)
            #top_signal_indices = compute_or_load_top(top_file_left, tmp_signal_indices)

            tmp_signal_indices = load_and_continue_tmp(tmp_file_left, num_videos_all_left)
            top_signal_indices = load_and_continue_top(top_file_left, tmp_signal_indices)

            unique_tmp_signal_indices = list(dict.fromkeys(tmp_signal_indices))
            unique_top_signal_indices = list(dict.fromkeys(top_signal_indices))

            capped_list = list(generate_capped_randoms('C:/1/grok-video_glitch_elara/expr_code/qbit_random/qbit_dec_random.txt'))
            print(f"len: {len(capped_list)}")

            vagina_dec_list = list(generate_vagina_dec_randoms('C:/1/grok-video_glitch_elara/expr_code/qbit_random/pilluvagina_dec_sum.txt'))
            print(f"len: {len(vagina_dec_list)}")


            output_filename = f"F:/Deep_Learning_Local/stable-diffusion-webui-master/outputs/txt2img-images/2025-11-07/tmp_signal_deep_learning_data.txt"
            with open(output_filename, "a", encoding="utf-8") as f:
                for i, tmp_signal in enumerate(unique_tmp_signal_indices):
                    if i % 111 == 0:
                        random_dec = random.choice(capped_list)
                        print(f"random_dec: {random_dec}")
                        f.write(f"{tmp_signal}, {random_dec}, ")
                    elif i % 161 == 0:
                        random_vagina_dec = random.choice(vagina_dec_list)
                        print(f"random_vagina_dec: {random_vagina_dec}")
                        f.write(f"{tmp_signal}, {random_vagina_dec}, ")
                    else:
                        f.write(f"{tmp_signal}, ")

            output_filename = f"F:/Deep_Learning_Local/stable-diffusion-webui-master/outputs/txt2img-images/2025-11-07/top_signal_deep_learning_data.txt"
            with open(output_filename, "a", encoding="utf-8") as f:
                for i, top_signal in enumerate(unique_top_signal_indices):
                    if i % 111 == 0:
                        random_dec = random.choice(capped_list)
                        print(f"random_dec: {random_dec}")
                        f.write(f"{top_signal}, {random_dec}, ")
                    elif i % 161 == 0:
                        random_vagina_dec = random.choice(vagina_dec_list)
                        print(f"random_vagina_dec: {random_vagina_dec}")
                        f.write(f"{top_signal}, {random_vagina_dec}, ")
                    else:
                        f.write(f"{top_signal}, ")

            print("Precalculation complete")

     
            """print("Precalculation complete or loaded. tmp_signal_indices length:", len(tmp_signal_indices))
            print("top_signal_indices length:", len(top_signal_indices))

            unique_top_signal_indices = list(dict.fromkeys(top_signal_indices))
            print(f"unique_top_signal_indices_len: {len(unique_top_signal_indices)}")

            unique_top_signal_indices = Random_Walk_Final(unique_top_signal_indices)

            unique_top_signal_filenames = []
            for index in unique_top_signal_indices:
                print(f"{index}/{len(video_filenames_all_left)}")
                if index >= len(video_filenames_all_left):
                    index = len(video_filenames_all_left)-1
                unique_top_signal_filenames.append(video_filenames_all_left[index])

            video_filenames_all_left = unique_top_signal_filenames
            print(f"{len(video_filenames_all_left)}")"""



            #tmp_signal_indices = compute_or_load_tmp(tmp_file_right, num_videos_vertical_right)
            #top_signal_indices = compute_or_load_top(top_file_right, tmp_signal_indices)

            tmp_signal_indices = load_and_continue_tmp(tmp_file_right, num_videos_all_right)
            top_signal_indices = load_and_continue_top(top_file_right, tmp_signal_indices)

            unique_tmp_signal_indices = list(dict.fromkeys(tmp_signal_indices))
            unique_top_signal_indices = list(dict.fromkeys(top_signal_indices))

            output_filename = f"F:/Deep_Learning_Local/stable-diffusion-webui-master/outputs/txt2img-images/2025-11-07/tmp_signal_deep_learning_data.txt"
            with open(output_filename, "a", encoding="utf-8") as f:
                for i, tmp_signal in enumerate(unique_tmp_signal_indices):
                    if i % 111 == 0:
                        random_dec = random.choice(capped_list)
                        print(f"random_dec: {random_dec}")
                        f.write(f"{tmp_signal}, {random_dec}, ")
                    elif i % 161 == 0:
                        random_vagina_dec = random.choice(vagina_dec_list)
                        print(f"random_vagina_dec: {random_vagina_dec}")
                        f.write(f"{tmp_signal}, {random_vagina_dec}, ")
                    else:
                        f.write(f"{tmp_signal}, ")

            output_filename = f"F:/Deep_Learning_Local/stable-diffusion-webui-master/outputs/txt2img-images/2025-11-07/top_signal_deep_learning_data.txt"
            with open(output_filename, "a", encoding="utf-8") as f:
                for i, top_signal in enumerate(unique_top_signal_indices):
                    if i % 111 == 0:
                        random_dec = random.choice(capped_list)
                        print(f"random_dec: {random_dec}")
                        f.write(f"{top_signal}, {random_dec}, ")
                    elif i % 161 == 0:
                        random_vagina_dec = random.choice(vagina_dec_list)
                        print(f"random_vagina_dec: {random_vagina_dec}")
                        f.write(f"{top_signal}, {random_vagina_dec}, ")
                    else:
                        f.write(f"{top_signal}, ")

            print("Precalculation complete")


            """print("Precalculation complete or loaded. tmp_signal_indices length:", len(tmp_signal_indices))
            print("top_signal_indices length:", len(top_signal_indices))

            unique_top_signal_indices = list(dict.fromkeys(top_signal_indices))
            print(f"unique_top_signal_indices_len: {len(unique_top_signal_indices)}")

            unique_top_signal_indices = Random_Walk_Final(unique_top_signal_indices)

            unique_top_signal_filenames = []
            for index in unique_top_signal_indices:
                print(f"{index}/{len(video_filenames_all_right)}")
                if index >= len(video_filenames_all_right):
                    index = len(video_filenames_all_right)-1
                unique_top_signal_filenames.append(video_filenames_all_right[index])

            video_filenames_all_right = unique_top_signal_filenames
            print(f"{len(video_filenames_all_right)}")

            video_filenames_all_left  = video_filenames_all_left[:200]
            video_filenames_all_right = video_filenames_all_right[:200]
            num_videos_all_left  = len(video_filenames_all_left)
            num_videos_all_right = len(video_filenames_all_right)
            print(f"PIER_LEFT: {num_videos_all_left}")
            print(f"PIER_RIGHT: {num_videos_all_right}")"""



    except Exception as e:
        print(f"An error occurred: {e}")

if __name__ == '__main__':
    play_video_fullscreen()
    play_video_fullscreen()
    play_video_fullscreen()

#    for i in range(10):
#        play_video_fullscreen()
