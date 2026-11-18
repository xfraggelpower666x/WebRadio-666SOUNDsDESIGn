import argparse
from pathlib import Path
import os
import random

"""
V2:
4. **Semantic Clustering**:
   - Intro: serene, crystalline, inviting
   - Verses: curious, exploratory, building
   - Choruses: expansive, ecstatic (high word density), anthemic
   - Solos: sparse, breathlike, instrumental feel
   - Improvisation: freeform, spontaneous, multidimensional
"""

class CloudAILyricsGenerator:
    def __init__(self, word_list_path, api_key=None):
#        self.client = anthropic.Anthropic(api_key=api_key)
        self.words = self._load_words(word_list_path)

    def _load_words(self, path):
        with open(path, 'r', encoding='utf-8') as f:
            text = [w.strip() for w in f.readlines() if w.strip()]
        random.shuffle(text)
        return text
    
    def generate_complete_song(self):
        """
        Single-shot generation with full context
        """
        # Create compressed word list (every 10th word for token efficiency)
        word_sample = self.words[::10]  # 7000 words
        
        prompt = f"""Generate experimental song workflow for AI music (Suno v5).

WORD UNIVERSE (70,000 words - sample provided):
{', '.join(word_sample[:1000])}
[...6000 more words available from: psychedelic, cosmic, spiritual, neologistic domains]

STRUCTURE REQUIRED:
[Intro] → [Verse 1] → [Chorus 1] → [Solo 1] → [Verse 2] → [Chorus 2] → [Solo 2] → [Verse 3] → [Chorus 3] → [Solo 3] → [Improvisation] → [Outro]

CREATIVE RULES:
1. **Punctuation Rhythm**:
   - Commas = breath pauses
   - Spaces = flow
   - ~ = vibrato, ^ = pitch rise, _ = bass drop, * = glitch
   - Use --- for dramatic pauses

2. **Word Selection**:
   - Blend SHORT (2-6 char) and MEDIUM (7-14 char) and LONG (15-33 char) words
   - Create neologisms: compound unexpected words (e.g., "quantumultiversphere")
   - Use phonetic cascades: luminous→numinous→voluminous

3. **Numeric Seeds**:
   - Insert 3-5 numeric sequences (e.g., 4721, 639, 108) as melodic codes
   - Place at section transitions

4. **Semantic Clustering**:
   - Intro: serene, crystalline
   - Verses: exploratory, building
   - Choruses: expansive, ecstatic (high word density)
   - Solos: sparse, instrumental feel
   - Improvisation: freeform chaos

5. **Fractal Refrains**:
   - Choose 2-3 "anchor phrases" (e.g., "cascading light")
   - Repeat at Fibonacci intervals (positions 89, 144, 233 words)

6. **Section Lengths** (characters):
   - Intro: ~100
   - Verses: 180-250
   - Choruses: 300-400
   - Solos: 100-400 (Solo 2 longest)
   - Improvisation: 400+

OUTPUT: Complete lyric workflow, abstract & poetic, ready for Suno. No explanations.

GENERATE:"""

#        message = self.client.messages.create(
#            model="claude-sonnet-4-5-20250929",
#            max_tokens=8000,
#            temperature=0.9,
#            messages=[{"role": "user", "content": prompt}]
#        )
        
#        return message.content[0].text

        return prompt

def main():
    parser = argparse.ArgumentParser(description="Lokale Suno-Prompts aus einer Wortliste schreiben.")
    parser.add_argument("words", type=Path)
    parser.add_argument("output", type=Path)
    parser.add_argument("--count", type=int, default=40)
    args = parser.parse_args()
    if args.count < 1:
        parser.error("--count muss positiv sein.")
    args.output.mkdir(parents=True, exist_ok=True)
    for index in range(args.count):
        generator = CloudAILyricsGenerator(args.words, None)
        prompt = generator.generate_complete_song()
        with (args.output / f"ai_ai_lyrics_monte{index:03d}.txt").open("x", encoding="utf-8") as target:
            target.write(prompt)


if __name__ == "__main__":
    main()
