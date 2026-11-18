"""
import pandas as pd
import numpy as np

def import_audio_keyframes(csv_path):
    print(f"Loading data from {csv_path}...")
    
    # 1. Read the CSV back into a pandas DataFrame
    df = pd.read_csv(csv_path)
    
    # 2. Modify the Time_ms column
    # We use .round() to ensure 53.8 becomes 54 (better audio sync)
    # Then we use .astype(int) to convert them from floats to integers
    df['Time_ms'] = df['Time_ms'].round().astype(int)
    
    # Optional but recommended: Group by the new integer milliseconds.
    # Because we rounded, we might have two rows that share the exact same 
    # millisecond. Taking the maximum or average amplitude of duplicates keeps data clean.
    df = df.groupby('Time_ms', as_index=False)['Bass_Amplitude'].mean()
    
    print("Import successful. Milliseconds converted to integers.")
    return df

# --- Run the Function ---
audio_path = "Cybernetic Nirvana Upload.wav"
audio_base_filename = audio_path.replace("\\", "/")
audio_base_filename = audio_base_filename.split("/")
audio_base_filename = audio_base_filename[len(audio_base_filename)-1]
audio_base_filename = audio_base_filename.split(".wav")
audio_base_filename = audio_base_filename[0]
print(f"audio_base_filename = {audio_base_filename}")

audio_sync_data_bass  = import_audio_keyframes(f"{audio_base_filename}_bass_keyframes.csv")
audio_sync_data_snare = import_audio_keyframes(f"{audio_base_filename}_snare_keyframes.csv")
audio_sync_data_hihat = import_audio_keyframes(f"{audio_base_filename}_hihat_keyframes.csv")

# Look at the first 5 rows to verify the clean integers
print(audio_sync_data_bass.head())
print(audio_sync_data_snare.head())
print(audio_sync_data_hihat.head())
"""


import pygame
import csv
import sys
import pandas as pd

def load_animation_data(filepath):
    print(f"Loading data from {filepath}...")
    
    # 1. Read the CSV into a pandas DataFrame
    # Note: If your CSV DOES NOT have headers (as mentioned in the original 2nd function), 
    # change this to: pd.read_csv(filepath, header=None, names=['Time_ms', 'Bass_Amplitude'])
    df = pd.read_csv(filepath)
    
    # 2. Round the time to the nearest whole number and convert to integer
    df['Time_ms'] = df['Time_ms'].round().astype(int)
    
    # 3. Group by the integer milliseconds and take the average of the amplitude
    # This prevents errors from having multiple data points at the exact same millisecond
    df = df.groupby('Time_ms', as_index=False)['Bass_Amplitude'].mean()
    
    # 4. Convert the cleaned DataFrame back into a list of tuples: [(time, amplitude), ...]
    # index=False prevents the row index from being included
    # name=None ensures it returns standard Python tuples instead of pandas namedtuples
    data = list(df.itertuples(index=False, name=None))
    
    print("Import successful. Data grouped and converted to a list of tuples.")
    return data


# --- CONFIGURATION ---
THRESHOLD = 0.40

THRESHOLD_BASS  = 0.40
THRESHOLD_SNARE = 0.50
THRESHOLD_HIHAT = 0.40

BLACK = (0, 0, 0)
WHITE = (255, 255, 255)
CYAN = (8, 224, 240)
MAGENTA = (250, 34, 197)
PURPLE = (187, 34, 250)
GREEN = (8, 240, 224)


# Mode switch: Set to True for Binary (On/Off), False for Intensity (Smooth fading)
USE_BINARY_FLASH = False 
#USE_BINARY_FLASH = True

def main():
    pygame.init()
    screen = pygame.display.set_mode((800, 600))
    pygame.display.set_caption("Audio React Pygame")
    clock = pygame.time.Clock()

    # 1. Load Data
    print("Loading data...")

    audio_path = "Cybernetic Nirvana Upload.wav"
    audio_base_filename = audio_path.replace("\\", "/")
    audio_base_filename = audio_base_filename.split("/")
    audio_base_filename = audio_base_filename[len(audio_base_filename)-1]
    audio_base_filename = audio_base_filename.split(".wav")
    audio_base_filename = audio_base_filename[0]
    print(f"audio_base_filename = {audio_base_filename}")

    anim_data_1 = load_animation_data(f"{audio_base_filename}_bass_keyframes.csv")
    anim_data_index_1 = 0
    anim_max_index_1 = len(anim_data_1) - 1

    anim_data_2 = load_animation_data(f"{audio_base_filename}_snare_keyframes.csv")
    anim_data_index_2 = 0
    anim_max_index_2 = len(anim_data_2) - 1

    anim_data_3 = load_animation_data(f"{audio_base_filename}_hihat_keyframes.csv")
    anim_data_index_3 = 0
    anim_max_index_3 = len(anim_data_3) - 1

    # 2. Load and Play Audio
    pygame.mixer.music.load(audio_path)
    pygame.mixer.music.play()
    
    print("Playing...")

    running = True
    while running:
        for event in pygame.event.get():
            if event.type == pygame.QUIT:
                running = False
            elif event.type == pygame.KEYDOWN:
                if event.key == pygame.K_ESCAPE:
                    running = False

        # 3. Get the current time of the song in milliseconds
        current_time_ms = pygame.mixer.music.get_pos()

        # 4. Fast-forward our CSV data index to match the song's current time
        # This ensures the visuals stay perfectly in sync even if the frame rate drops
        while anim_data_index_1 < anim_max_index_1 and anim_data_1[anim_data_index_1 + 1][0] < current_time_ms:
            anim_data_index_1 += 1

        # Get the current amplitude for this exact moment
        current_amplitude_bass = anim_data_1[anim_data_index_1][1]

        while anim_data_index_2 < anim_max_index_2 and anim_data_2[anim_data_index_2 + 1][0] < current_time_ms:
            anim_data_index_2 += 1

        # Get the current amplitude for this exact moment
        current_amplitude_snare = anim_data_2[anim_data_index_2][1]

        while anim_data_index_3 < anim_max_index_3 and anim_data_3[anim_data_index_3 + 1][0] < current_time_ms:
            anim_data_index_3 += 1

        # Get the current amplitude for this exact moment
        current_amplitude_hihat = anim_data_3[anim_data_index_3][1]

        # 5. DRAWING THE EFFECT
        
        if USE_BINARY_FLASH:
            # --- EXAMPLE 1: BINARY (Threshold Trigger Only, No Intensity) ---
            if current_amplitude_bass >= THRESHOLD_BASS:
                screen.fill(WHITE)

            elif current_amplitude_snare >= THRESHOLD_SNARE:
                screen.fill(MAGENTA)

            elif current_amplitude_hihat >= THRESHOLD_HIHAT:
                screen.fill(CYAN)
            else:
                screen.fill(BLACK)
                
        else:

            BASE_COLOR = (180, 0, 255) 

            # --- EXAMPLE 2: ANALOG (Controlled Intensity of ANY color) ---
            if current_amplitude_bass >= THRESHOLD:
                # 1. Ensure amplitude doesn't exceed 1.0 (prevents color values going over 255)
                amp = min(1.0, current_amplitude_bass)
    
                # 2. Multiply each channel of your base color by the amplitude
                r = int(BASE_COLOR[0] * amp)
                g = int(BASE_COLOR[1] * amp)
                b = int(BASE_COLOR[2] * amp)
    
                # 3. Fill the screen with the newly calculated color
                screen.fill((r, g, b)) # Fades between Pitch Black and BASE_COLOR
            else:
                screen.fill((0, 0, 0)) # Pitch black

            """# --- EXAMPLE 2: ANALOG (Controlled Intensity) ---
            # We map the amplitude (0.0 to 1.0) to a color value (0 to 255)
            # You can still use the threshold to keep it pitch black during quiet parts!
            if current_amplitude_bass >= THRESHOLD:
                # Multiply amplitude by 255. (e.g., 0.65 * 255 = 165)
                # We use min() to ensure it never exceeds 255 and causes an error
                color_val = min(255, int(current_amplitude_bass * 255))
                screen.fill((color_val, color_val, color_val)) # Grey to White depending on strength
            else:
                screen.fill((0, 0, 0)) # Pitch black"""

        pygame.display.flip()
        
        # Limit to 60 FPS
        clock.tick(60)

    pygame.quit()
    sys.exit()

if __name__ == "__main__":
    main()








""" _________ 1st EXAMPLE PSEUDO USE-CASE:

# Create a dictionary for ultra-fast lookups during rendering
# Format: { 0: 0.12, 23: 0.45, 46: 0.88 ... }
amplitude_dict = dict(zip(audio_data['Time_ms'], audio_data['Bass_Amplitude']))

# Example Render Loop over a timeline
render_length_ms = 100 

for current_ms in range(render_length_ms):
    # Try to fetch the bass amplitude for the current millisecond.
    # If we don't have data for this exact ms, default to 0.0
    current_bass_value = amplitude_dict.get(current_ms, 0.0)
    
    if current_bass_value > 0.0:
        print(f"Rendering MS {current_ms:03d} | Bass Value: {current_bass_value:.3f} - applying effect!")
    else:
        print(f"Rendering MS {current_ms:03d} | Bass Value: {current_bass_value:.3f}")
        
    # --> YOUR RENDER CODE GOES HERE <--
    # e.g., scale_object_by(1.0 + current_bass_value)

___AND:

FPS = 30 # Change to 24, 60, etc. based on your video

# Convert Milliseconds to Video Frame Numbers
# Formula: Frame = (Time_ms / 1000) * FPS
audio_data['Frame_Number'] = (audio_data['Time_ms'] / 1000) * FPS

# Round and convert to integer to get exact Frame Numbers
audio_data['Frame_Number'] = audio_data['Frame_Number'].round().astype(int)

"""