from pydub import AudioSegment
from pydub.effects import normalize
import random
import uuid
import glob
import os

target_dBFS=-16
base_path = "C:/1/grok-video_glitch_elara/audio_effects_wav/002"


def match_target_amplitude(sound, target_dBFS):
    change_in_dBFS = target_dBFS - sound.dBFS
    return sound.apply_gain(change_in_dBFS)

def normalize(files):
    for i, file in enumerate(files):
        print(f"{i}: {file}")
        audio = AudioSegment.from_wav(file)
        normalized_audio = match_target_amplitude(audio, target_dBFS)    
        normalized_audio.export(f"{base_path}/normalized/audio_effect_{i:03d}.wav", format="wav")


files = glob.glob(os.path.join(f"{base_path}", "*.wav"))
print(f"num_files: {len(files)}")
normalize(files)
