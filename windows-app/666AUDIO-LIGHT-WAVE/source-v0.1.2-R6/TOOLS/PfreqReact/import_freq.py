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
# Import the file we baked in the previous step
audio_data = import_audio_keyframes('bass_keyframes.csv')

# Look at the first 5 rows to verify the clean integers
#print(audio_data.head())
print(audio_data)


"""
USE CASE:

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