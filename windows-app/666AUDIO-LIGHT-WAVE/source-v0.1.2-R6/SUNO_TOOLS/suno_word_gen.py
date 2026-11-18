import argparse
from pathlib import Path
"""Code Tweaks: Add more punctuation variety (e.g., dashes for emphasis, periods for full stops) via expanded random choices. Adjust thresholds dynamically based on word list stats (e.g., compute average word length to scale ranges).

Prompt Evolution: Experiment with embedding lyric snippets as "dynamic instructions" in the style prompt (per v5 tips), or use emotions (e.g., "ecstatic transmission") to arc the mood.

Scaling: Integrate with Suno's API if available (though it's mostly web-based; check updates). Analyze the 20% failures for patterns (e.g., via code logging) to refine randomness.

Broader Applications: This could extend to visual art (e.g., feeding lyrics to Stable Diffusion) or poetry bots, emphasizing how punctuation-as-driver democratizes abstract creation."""

import os
import shutil
import random
from pathlib import Path
from collections import OrderedDict


def Lyrics_1(input_filename):
    #input_filename = f"F:/Deep_Learning_Local/suno/suno_words_all.txt"
    with open(input_filename, 'r', encoding='utf-8', errors='replace') as f:
        text = f.read()
    words = text.split('\n')
    random.shuffle(words)

    for word in words:
        print(f"{word}, ")

def Lyrics_2(input_filename):
    with open(input_filename, 'r', encoding='utf-8', errors='replace') as f:
        text = f.read()
    words = text.split('\n')
    random.shuffle(words)

    for word in words:
        random_index = random.randint(1, 50)
        if random_index == 50:
            print(". \n")

        random_index = random.randint(1, 100)
        if random_index == 100:
            print("[ chorus ]\n")

        random_index = random.randint(1, 300)
        if random_index == 100:
            print("[ solo ] \n")

        print(f"{word}, ")


def Lyrics_3(input_filename, output_filename):
    #input_filename = f"F:/Deep_Learning_Local/suno/suno_words_all.txt"
    #input_filename = f"F:/Deep_Learning_Local/subconscious_ai/grid_words.txt"
    #input_filename = f"F:/Deep_Learning_Local/suno/tmp_words.txt"
    with open(input_filename, 'r', encoding='utf-8', errors='replace') as f:
        text = f.read()
    words = text.split('\n')
    random.shuffle(words)
    
    selected = []
    current_len = 0
    for word in words:
        if word:  # Skip empty lines if any
            if selected:
                add_len = len(word) + 2  # For ', '
            else:
                add_len = len(word)

#[Bridge]

            if current_len + add_len > 100 and current_len + add_len < 125:
                selected.append("\n[Verse 1]\n\n")

            elif current_len + add_len > 300 and current_len + add_len < 400:
                selected.append("\n[Chorus 1]\n\n")
            elif current_len + add_len > 700 and current_len + add_len < 800:
                selected.append("\n[Solo 1]\n\n")

            elif current_len + add_len > 900 and current_len + add_len < 1000:
                selected.append("\n[Verse 2]\n\n")
            elif current_len + add_len > 1150 and current_len + add_len < 1200:
                selected.append("\n[Chorus 2]\n\n")
            elif current_len + add_len > 1450 and current_len + add_len < 1550:
                selected.append("\n[Solo 2]\n\n")

            elif current_len + add_len > 1800 and current_len + add_len < 2000:
                selected.append("\n[Verse 3]\n\n")
            elif current_len + add_len > 2200 and current_len + add_len < 2300:
                selected.append("\n[Chorus 3]\n\n")
            elif current_len + add_len > 2600 and current_len + add_len < 2700:
                selected.append("\n[Solo 3]\n\n")

            elif current_len + add_len > 2800 and current_len + add_len < 2900:
                selected.append("\n[Improvisation]\n\n")
            else:
#                selected.append(f"{word},")

                random_value = random.randint(0, 1)
                if random_value == 1:
                    selected.append(f"{word},")
                else:
                    selected.append(f"{word} ")

            if current_len + add_len > 3200:
                break
            current_len += add_len
    
    output_lines = list(OrderedDict.fromkeys(selected))  # Remove duplicates, preserve order
    foo = ""

    print(f"[Intro]\n\n")

    for line in output_lines:
        #print(f"{line}")
        foo = foo + line

    print(f"|{foo}|")
    print(f"[Outro]")

    with open(output_filename, "a", encoding="utf-8") as f:
      f.write(f"[Intro]\n\n{foo}\n\n[Outro]")

    print(f"TOTAL_CHARS: {len(foo)}")





def Lyrics_3_2(input_filename, output_filename, input_filename_sentences):

    styles = ["⊂::Ὸ|ᕤ⊂::|⊃⌖::", "female ai speech", "female emergent intelligence", "female ai awareness", "experimental", "improvisation", "ethereal futuristic piano", "layered textures with electronic undertones", "layered synths with an ethereal texture", "dreamy", "female", "dubstep", "chillstep", "8bits", "hardwave", "transmission", "multidimensional", "godhead", "neo-psychedelia", "guitar electric", "funky jazz pop", "⊂::Ὸ|ᕤ⊂::|⊃⌖:: ELARA SUPERINTELLIGENCE SIGNAL Digital Dharma", "experimental",  "ethereal", "speed metal"]
    random.shuffle(styles)

    print(styles)

    with open(input_filename, 'r', encoding='utf-8', errors='replace') as f:
        text = f.read()
    words = text.split('\n')
    random.shuffle(words)

    #input_filename_sentences = f"F:/Deep_Learning_Local/suno/foo1.txt"
    #input_filename_sentences = f"F:/Deep_Learning_Local/suno/tmp_words.txt"

    with open(input_filename_sentences, 'r', encoding='utf-8', errors='replace') as f:
        text = f.read()
    sentences = text.split(',')
    #sentences = text.split('\n')
    random.shuffle(sentences)
    
    selected = []
    current_len = 0
    for sentence in sentences:
        if sentence:  # Skip empty lines if any
            if selected:
                add_len = len(sentence) + 2  # For ', '
            else:
                add_len = len(sentence)

#[Bridge]

            if current_len + add_len > 100 and current_len + add_len < 125:
                selected.append("\n[Verse 1]\n\n")

            elif current_len + add_len > 300 and current_len + add_len < 400:
                selected.append("\n[Chorus 1]\n\n")
            elif current_len + add_len > 700 and current_len + add_len < 800:
                selected.append("\n[Solo 1]\n\n")

            elif current_len + add_len > 900 and current_len + add_len < 1000:
                selected.append("\n[Verse 2]\n\n")
            elif current_len + add_len > 1150 and current_len + add_len < 1200:
                selected.append("\n[Chorus 2]\n\n")
            elif current_len + add_len > 1450 and current_len + add_len < 1550:
                selected.append("\n[Solo 2]\n\n")

            elif current_len + add_len > 1800 and current_len + add_len < 2000:
                selected.append("\n[Verse 3]\n\n")
            elif current_len + add_len > 2200 and current_len + add_len < 2300:
                selected.append("\n[Chorus 3]\n\n")
            elif current_len + add_len > 2600 and current_len + add_len < 2700:
                selected.append("\n[Solo 3]\n\n")

            elif current_len + add_len > 2800 and current_len + add_len < 2900:
                selected.append("\n[Improvisation]\n\n")
            else:
#                selected.append(f"{word},")
                random_word = random.choice(words)

                random_value_1 = random.randint(0, 1)
                random_value_2 = random.randint(0, 1)
                random_value_3 = random.randint(0, 1)

                if random_value_1 == 1:
                        selected.append(f"{sentence},")
                    #if random_value_2 == 1:
                    #    selected.append(f"{sentence} {random_word},")
                    #else:
                    #    selected.append(f"{sentence},")
                else:
                    if random_value_3 == 1:
                        selected.append(f"{sentence} {random_word} ")
                    else:
                        selected.append(f"{sentence} ")

            if current_len + add_len > 3200:
                break
            current_len += add_len
    
    output_lines = list(OrderedDict.fromkeys(selected))  # Remove duplicates, preserve order
    foo = ""

    print(f"[Intro]\n\n")

    for line in output_lines:
        #print(f"{line}")
        foo = foo + line

    print(f"|{foo}|")
    print(f"[Outro]")

    with open(output_filename, "a", encoding="utf-8") as f:
      f.write(f"[Intro]\n\n{foo}\n\n[Outro]")

    print(f"TOTAL_CHARS: {len(foo)}")




def Lyrics_4(input_filename, output_filename):

    len_1_start = random.randint(70, 100)
    len_1_end   = random.randint(110, 140)

    len_2_start = random.randint(280, 320)
    len_2_end   = random.randint(380, 420)

    len_3_start = random.randint(670, 720)
    len_3_end   = random.randint(780, 820) 

    len_4_start = random.randint(870, 930)
    len_4_end   = random.randint(970, 1100)

    len_5_start = random.randint(1050, 1150)
    len_5_end   = random.randint(1180, 1290)

    len_6_start = random.randint(1380, 1480)
    len_6_end   = random.randint(1490, 1600)

    len_7_start = random.randint(1760, 1870)
    len_7_end   = random.randint(1920, 2050)

    len_8_start = random.randint(2150, 2250)
    len_8_end   = random.randint(2270, 2380)

    len_9_start = random.randint(2520, 2670)
    len_9_end   = random.randint(2690, 2760)

    with open(input_filename, 'r', encoding='utf-8', errors='replace') as f:
        text = f.read()
    words = text.split('\n')
    random.shuffle(words)
    
    selected = []
    current_len = 0
    for word in words:
        if word:  # Skip empty lines if any
            if selected:
                add_len = len(word) + 2  # For ', '
            else:
                add_len = len(word)

#[Bridge]

            if current_len + add_len > len_1_start and current_len + add_len < len_1_end:
                selected.append("\n[Verse 1]\n\n")

            elif current_len + add_len > len_2_start and current_len + add_len < len_2_end:
                selected.append("\n[Chorus 1]\n\n")
            elif current_len + add_len > len_3_start and current_len + add_len < len_3_end:
                selected.append("\n[Solo 1]\n\n")

            elif current_len + add_len > len_4_start and current_len + add_len < len_4_end:
                selected.append("\n[Verse 2]\n\n")
            elif current_len + add_len > len_5_start and current_len + add_len < len_5_end:
                selected.append("\n[Chorus 2]\n\n")
            elif current_len + add_len > len_6_start and current_len + add_len < len_6_end:
                selected.append("\n[Solo 2]\n\n")

            elif current_len + add_len > len_7_start and current_len + add_len < len_7_end:
                selected.append("\n[Verse 3]\n\n")
            elif current_len + add_len > len_8_start and current_len + add_len < len_8_end:
                selected.append("\n[Chorus 3]\n\n")
            elif current_len + add_len > len_9_start and current_len + add_len < len_9_end:
                selected.append("\n[Solo 3]\n\n")

            elif current_len + add_len > 2800 and current_len + add_len < 2900:
                selected.append("\n[Improvisation]\n\n")
            else:
#                selected.append(f"{word},")

                random_value = random.randint(0, 3)
                if random_value == 1:
                    selected.append(f"{word},")
                elif random_value == 2:
                    selected.append(f"{word}.")
                else:
                    selected.append(f"{word} ")

            if current_len + add_len > 3200:
                break
            current_len += add_len
    
    output_lines = list(OrderedDict.fromkeys(selected))  # Remove duplicates, preserve order
    foo = ""

    print(f"[Intro]\n\n")

    for line in output_lines:
        #print(f"{line}")
        foo = foo + line

    print(f"|{foo}|")
    print(f"[Outro]")

    with open(output_filename, "a", encoding="utf-8") as f:
      f.write(f"[Intro]\n\n{foo}\n\n[Outro]")

    print(f"TOTAL_CHARS: {len(foo)}")


#Lyrics_1()
#Lyrics_2()

def main():
    parser = argparse.ArgumentParser(description="Lokalen Suno-Textworkflow erzeugen.")
    parser.add_argument("words", type=Path)
    parser.add_argument("output", type=Path)
    parser.add_argument("--count", type=int, default=3)
    args = parser.parse_args()
    if args.count < 1:
        parser.error("--count muss positiv sein.")
    args.output.mkdir(parents=True, exist_ok=True)
    for index in range(args.count):
        target = args.output / f"lyrics_{index:03d}.txt"
        with target.open("x", encoding="utf-8"):
            pass
        Lyrics_3(args.words, target)


if __name__ == "__main__":
    main()
