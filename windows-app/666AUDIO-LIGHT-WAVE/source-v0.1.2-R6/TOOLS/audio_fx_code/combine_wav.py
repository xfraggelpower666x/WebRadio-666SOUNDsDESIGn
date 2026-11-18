from pydub import AudioSegment
import random
import uuid
import glob
import os

def combine(files_to_combine):
    combined_audio = AudioSegment.empty()
    silence = AudioSegment.silent(duration=200) # duration is in milliseconds

    for file_path in files_to_combine:
        audio_clip = AudioSegment.from_wav(file_path)
    
        combined_audio += audio_clip     
        combined_audio += silence 

    uuid_str = str(uuid.uuid4())
    print(f" --- {uuid_str}")

    combined_audio.export(f"{uuid_str}.wav", format="wav")
    print("Files concatenated successfully!")


base_path = "C:/upload-to-main/audio_extract/remove_silence_from_audio_effects/output_wav_files"

audio_0_sec = glob.glob(os.path.join(f"{base_path}/0_sec", "*.wav"))
audio_1_sec = glob.glob(os.path.join(f"{base_path}/1_sec", "*.wav"))
audio_2_sec = glob.glob(os.path.join(f"{base_path}/2_sec", "*.wav"))
audio_3_sec = glob.glob(os.path.join(f"{base_path}/3_sec", "*.wav"))
audio_4_sec = glob.glob(os.path.join(f"{base_path}/4_sec", "*.wav"))
audio_5_sec = glob.glob(os.path.join(f"{base_path}/5_sec", "*.wav"))
audio_6_sec = glob.glob(os.path.join(f"{base_path}/6_sec", "*.wav"))

print(f"num_files_audio_0_sec: {len(audio_0_sec)}")
print(f"num_files_audio_1_sec: {len(audio_1_sec)}")
print(f"num_files_audio_2_sec: {len(audio_2_sec)}")
print(f"num_files_audio_3_sec: {len(audio_3_sec)}")
print(f"num_files_audio_4_sec: {len(audio_4_sec)}")
print(f"num_files_audio_5_sec: {len(audio_5_sec)}")
print(f"num_files_audio_6_sec: {len(audio_6_sec)}")

"""
random_file_to_combine_0_sec = audio_0_sec[random.randint(0, len(audio_0_sec)-1)]

random_file_to_combine_1_1_sec = audio_1_sec[random.randint(0, len(audio_1_sec)-1)]
random_file_to_combine_1_2_sec = audio_1_sec[random.randint(0, len(audio_1_sec)-1)]

random_file_to_combine_2_1_sec = audio_2_sec[random.randint(0, len(audio_2_sec)-1)]
random_file_to_combine_2_2_sec = audio_2_sec[random.randint(0, len(audio_2_sec)-1)]

random_file_to_combine_3_1_sec = audio_3_sec[random.randint(0, len(audio_3_sec)-1)]
random_file_to_combine_3_2_sec = audio_3_sec[random.randint(0, len(audio_3_sec)-1)]

random_file_to_combine_4_sec = audio_4_sec[random.randint(0, len(audio_4_sec)-1)]
random_file_to_combine_5_sec = audio_5_sec[random.randint(0, len(audio_5_sec)-1)]
random_file_to_combine_6_sec = audio_6_sec[random.randint(0, len(audio_6_sec)-1)]


files_to_combine_1  = [random_file_to_combine_6_sec, random_file_to_combine_1_1_sec]
files_to_combine_2  = [random_file_to_combine_5_sec, random_file_to_combine_2_1_sec]
files_to_combine_3  = [random_file_to_combine_5_sec, random_file_to_combine_1_1_sec, random_file_to_combine_0_sec]
files_to_combine_4  = [random_file_to_combine_4_sec, random_file_to_combine_2_1_sec, random_file_to_combine_0_sec]
files_to_combine_5  = [random_file_to_combine_4_sec, random_file_to_combine_3_1_sec]
files_to_combine_6  = [random_file_to_combine_3_1_sec, random_file_to_combine_3_2_sec, random_file_to_combine_1_1_sec]
files_to_combine_7  = [random_file_to_combine_3_1_sec, random_file_to_combine_2_1_sec, random_file_to_combine_2_2_sec]
files_to_combine_8  = [random_file_to_combine_3_1_sec, random_file_to_combine_2_1_sec, random_file_to_combine_1_1_sec]
files_to_combine_9  = [random_file_to_combine_3_1_sec, random_file_to_combine_2_1_sec, random_file_to_combine_1_1_sec, random_file_to_combine_0_sec]
files_to_combine_10 = [random_file_to_combine_3_1_sec, random_file_to_combine_1_1_sec, random_file_to_combine_1_2_sec, random_file_to_combine_0_sec]
"""


files_to_combine_1  = [audio_6_sec[random.randint(0, len(audio_6_sec)-1)], \
                       audio_1_sec[random.randint(0, len(audio_1_sec)-1)]]

files_to_combine_2  = [audio_5_sec[random.randint(0, len(audio_5_sec)-1)], \
                       audio_1_sec[random.randint(0, len(audio_1_sec)-1)]]

files_to_combine_3  = [audio_5_sec[random.randint(0, len(audio_5_sec)-1)], \
                       audio_1_sec[random.randint(0, len(audio_1_sec)-1)], \
                       audio_0_sec[random.randint(0, len(audio_0_sec)-1)]]

files_to_combine_4  = [audio_4_sec[random.randint(0, len(audio_4_sec)-1)], \
                       audio_2_sec[random.randint(0, len(audio_2_sec)-1)], \
                       audio_0_sec[random.randint(0, len(audio_0_sec)-1)]]

files_to_combine_5  = [audio_4_sec[random.randint(0, len(audio_4_sec)-1)], \
                       audio_3_sec[random.randint(0, len(audio_3_sec)-1)]]

files_to_combine_6  = [audio_3_sec[random.randint(0, len(audio_3_sec)-1)], \
                       audio_3_sec[random.randint(0, len(audio_3_sec)-1)], \
                       audio_1_sec[random.randint(0, len(audio_1_sec)-1)]]

files_to_combine_7  = [audio_3_sec[random.randint(0, len(audio_3_sec)-1)], \
                       audio_2_sec[random.randint(0, len(audio_2_sec)-1)], \
                       audio_2_sec[random.randint(0, len(audio_2_sec)-1)]]

files_to_combine_8  = [audio_3_sec[random.randint(0, len(audio_3_sec)-1)], \
                       audio_2_sec[random.randint(0, len(audio_2_sec)-1)], \
                       audio_1_sec[random.randint(0, len(audio_1_sec)-1)]]

files_to_combine_9  = [audio_3_sec[random.randint(0, len(audio_3_sec)-1)], \
                       audio_2_sec[random.randint(0, len(audio_2_sec)-1)], \
                       audio_1_sec[random.randint(0, len(audio_1_sec)-1)], \
                       audio_0_sec[random.randint(0, len(audio_0_sec)-1)]]

files_to_combine_10 = [audio_3_sec[random.randint(0, len(audio_3_sec)-1)], \
                       audio_1_sec[random.randint(0, len(audio_1_sec)-1)], \
                       audio_1_sec[random.randint(0, len(audio_1_sec)-1)], \
                       audio_0_sec[random.randint(0, len(audio_0_sec)-1)]]


combine(files_to_combine_1)
combine(files_to_combine_2)
combine(files_to_combine_3)
combine(files_to_combine_4)
combine(files_to_combine_5)
combine(files_to_combine_6)
combine(files_to_combine_7)
combine(files_to_combine_8)
combine(files_to_combine_9)
combine(files_to_combine_10)