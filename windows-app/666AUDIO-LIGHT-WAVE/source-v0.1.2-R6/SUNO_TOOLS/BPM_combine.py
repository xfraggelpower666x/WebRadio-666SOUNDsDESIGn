import argparse
from pathlib import Path
import os
import random
from pydub import AudioSegment
from pydub.effects import normalize
from pydub.effects import strip_silence
from datetime import datetime
import numpy as np

def Some_Gen_Algo(num_clips):
    final_audio_indices = []

    # Example parameters - adjust these as needed
    N = num_clips  # Total number of clips (indices 0 to N-1)
    population_size = 50  # Initial population size
    sigma = 50  # Standard deviation for random walk mutation (adjust for exploration)
    threshold = 0.9  # Threshold for minimum fitness in survivors
    max_gens = 100000  # Maximum generations to prevent infinite loop

    # Dummy fitness landscape (random for demo; replace with actual fitness function if you have one,
    # e.g., based on audio analysis if you add libraries externally)
    fitness = np.random.rand(N)

    # Optional: To simulate a "hidden signal", you could define fitness with some pattern, e.g.:
    fitness += np.sin(np.arange(N) / 100.0) * 0.5 + 0.5 + np.random.rand(N) * 0.1

    # Initialize population with random indices
    population = np.random.randint(0, N, population_size)

    gen = 0
    total_num_gens = 0
    running = True
    survived = None
    total_survided = []

    while running and gen < max_gens:
    
        if not running:
            break

        if total_num_gens == 10:
            break

        # Evaluate fitness values for current population
        values = fitness[population]

        # Sort by fitness descending
        sort_idx = np.argsort(values)[::-1]

        # Select top half as survivors
        num_survivors = population_size // 2
        survivors = population[sort_idx[:num_survivors]]

        # Check if all survivors meet the threshold (using min for "threshold in survived list")
        if np.min(values[sort_idx[:num_survivors]]) > threshold:
            survived = survivors
            total_survided.append(survived)
            #break

        # Create offspring by applying random walk (mutation) to survivors
        offspring = []
        for s in survivors:
            new_pos = s + int(np.random.normal(0, sigma))
            new_pos = max(0, min(N - 1, new_pos))  # Clip to valid index range
            offspring.append(new_pos)

        # New population: survivors + offspring
        population = np.concatenate((survivors, np.array(offspring)))

        gen += 1
        total_num_gens += 1
        print(f"gen = {gen}")

    # Output the final indices (sorted for potential sequential concatenation)
    if survived is not None:
        print(f"FINAL_SIZE = {len(survived)}")
        print("Simulation ended. Final survived indices:", survived)

        print(f"FINAL_SIZE = {len(total_survided)}")
        #print("Simulation ended. Final survived indices:", total_survided)

        # REMOVE DUPLICATES AND PRINT AMOUNTS

        for i in total_survided:
            for j in i:
                #print(j)
                final_audio_indices.append(f"{j}")

    print(f"BEFORE: {len(final_audio_indices)}")
    final_audio_indices = list(dict.fromkeys(final_audio_indices))
    print(f"AFTER: {len(final_audio_indices)}")

    return final_audio_indices


def Get_Random_Audio_Clip(audio_clip_list, num_items):
    dst_audio_clips = []

    for i in range(10):
       tmp = Some_Gen_Algo(len(audio_clip_list))
       for index in tmp:
           dst_audio_clips.append(index)

    print(f"BEFORE: {len(dst_audio_clips)}")
    dst_audio_clips = list(dict.fromkeys(dst_audio_clips))
    print(f"AFTER: {len(dst_audio_clips)}")

    random.shuffle(dst_audio_clips)
    print(dst_audio_clips)
    print(dst_audio_clips[:num_items])

    return dst_audio_clips[:num_items]


def get_audio_list(input_filename):
    audio_list = []

    with open(input_filename, 'r', encoding='utf-8', errors='replace') as f:
        lines = [line.strip() for line in f.readlines()]

    for line in lines:
        parts = line.split("', array([")
        filename = parts[0]
        filename = filename.replace("('", "")
        filename = filename.replace("\\\\", "/")
        filename = filename.strip()           
        if not filename:
            continue
        #print(f"filename=|{filename}|")
        #print(f"bpm=|{bpm}|")
       
        #audio_list.append((filename, bpm))
        audio_list.append(filename)
        
    return audio_list

def match_target_amplitude(sound, target_dBFS):
    if sound.dBFS == float('-inf'):
        return sound
    change_in_dBFS = target_dBFS - sound.dBFS
    return sound.apply_gain(change_in_dBFS)

def combine_mp3(files, output_file, target_dBFS=-16, crossfade_duration=2500): # 1000ms = 1s
    print(f"combine_mp3(): output_file = {output_file}")

    combined = AudioSegment.silent(duration=0)

    total_length = 0  # Keep track of total length for overlay positioning

    for i, file in enumerate(files):
        if os.path.exists(file):
            print(f"combine_mp3(): file = {file}")
            audio = AudioSegment.from_mp3(file)
            normalized_audio = match_target_amplitude(audio, target_dBFS)

            if len(combined) == 0:
                combined = normalized_audio.fade_in(1500)
                print(f"FIRST_TRACK {i}")
            elif len(combined) > 0:  # Crossfade after the first track
                combined = combined.append(normalized_audio, crossfade=min(crossfade_duration, len(combined), len(normalized_audio)))
                
                if i < len(files) - 1: # Only add overlay if NOT the last track
                    print(f"i={i}")
                    sound_path = "C:/upload-to-main/audio_extract/audio_effects"
                    #random_value = random.randint(1, 48)
                    random_value = 46

                    
                    """sound_file = f"2024-10-20_audio_transition_{random_value:03d}.mp3"
                    overlay_sound_path = f"{sound_path}/{sound_file}"
                    print(f"overlay_sound_path: {overlay_sound_path}")

                    overlay_sound = AudioSegment.from_mp3(overlay_sound_path)
                    overlay_sound_len = len(overlay_sound)
                    print(f"len_overlay_sound: {overlay_sound_len}")
                    overlay_sound = strip_silence(overlay_sound, silence_thresh=-36, padding=100)
                    overlay_sound_len = len(overlay_sound)
                    print(f"len_overlay_sound: {overlay_sound_len}")

                    overlay_sound_normalized = match_target_amplitude(overlay_sound, -18)
                    print(f"len_overlay_sound_normalized: {len(overlay_sound_normalized)}")

                    #if random_value == 12:
                    overlay_position = total_length - 1400

                    print(f"overlay_position={overlay_position}")

                    combined = combined.overlay(overlay_sound_normalized, position=overlay_position)"""                  
                    
                else:
                    print(f"PIER {i}")
            
            if i == len(files)-1:
                print(f"LAST_TRACK {i}")
                combined = combined.fade_out(1500)

            #else:
            #    #combined = normalized_audio
            #    combined = normalized_audio.fade_out(1500)
            #    print(f"FIRST_TRACK {i}")
            total_length += len(audio)  # Update the total length
            print(f"TOTAL_LENGTH: {total_length}")
        else:
            print(f"File {file} does not exist.")

    combined.export(output_file, format="mp3", bitrate="192k")


def main():
    parser = argparse.ArgumentParser(description="Tracks anhand vorhandener BPM-Listen kombinieren.")
    parser.add_argument("lists", type=Path)
    parser.add_argument("output", type=Path)
    parser.add_argument("--count", type=int, default=10)
    args = parser.parse_args()
    if args.count < 1:
        parser.error("--count muss positiv sein.")
    groups = {}
    for name, minimum in (("medium", 1), ("high", 1), ("extra_high", 6)):
        source = args.lists / f"{name}_bpms.txt"
        files = []
        for name_in_list in get_audio_list(source):
            candidate = args.lists / name_in_list
            if candidate.is_file():
                files.append(str(candidate))
        groups[name] = list(dict.fromkeys(files))
        if len(groups[name]) < minimum:
            parser.error(f"Zu wenige Mediendateien in {source}.")
    args.output.mkdir(parents=True, exist_ok=True)
    for index in range(args.count):
        selected = []
        for group, count in (("medium", 1), ("high", 1), ("extra_high", 6), ("high", 1), ("medium", 1)):
            files = groups[group]
            choices = Get_Random_Audio_Clip(files, count)
            if len(choices) < count:
                choices = random.sample(range(len(files)), count)
            selected.extend(files[int(i)] for i in choices)
        stamp = datetime.now().strftime("%Y%m%d_%H%M%S_%f")
        combine_mp3(selected, str(args.output / f"audio_{stamp}_{index:03d}.mp3"))


if __name__ == "__main__":
    main()
