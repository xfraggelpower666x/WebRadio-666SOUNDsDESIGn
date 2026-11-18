import os
import glob
from pydub import AudioSegment
from pydub.silence import detect_nonsilent

input_folder = "C:/upload-to-main/audio_extract/remove_silence_from_audio_effects/audio_effects_mp3"
output_folder = "output_wav_files"
os.makedirs(output_folder, exist_ok=True)

mp3_files = glob.glob(os.path.join(input_folder, "*.mp3"))

for file_path in mp3_files:
    print(f"Processing: {os.path.basename(file_path)}")
    
    # Load audio
    audio = AudioSegment.from_mp3(file_path)
    
    # Detect all chunks of audio that are NOT silent.
    # min_silence_len: minimum length of silence in ms (100ms is a good default).
    # silence_thresh: anything quieter than -40 dBFS is considered silence.
    nonsilent_ranges = detect_nonsilent(audio, min_silence_len=100, silence_thresh=-40)
    
    if nonsilent_ranges:
        # Get the very start of the first sound, and the very end of the last sound
        start_trim = nonsilent_ranges[0][0]
        end_trim = nonsilent_ranges[-1][1]
        
        # Slice the audio (pydub uses milliseconds)
        trimmed_audio = audio[start_trim:end_trim]
    else:
        # Fallback if the whole file was completely silent
        trimmed_audio = audio

    # Create the output filename
    base_name = os.path.splitext(os.path.basename(file_path))[0]
    output_path = os.path.join(output_folder, f"{base_name}.wav")
    
    # Export as WAV
    trimmed_audio.export(output_path, format="wav")

print(f"Done! Processed {len(mp3_files)} files.")