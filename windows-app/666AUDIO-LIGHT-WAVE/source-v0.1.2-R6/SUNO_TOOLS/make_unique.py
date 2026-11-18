import argparse
import re


def main():
    parser = argparse.ArgumentParser(description='Einmalige Wörter aus einer Textdatei sammeln')
    parser.add_argument("input")
    parser.add_argument("output")
    args = parser.parse_args()
    input_file_path, output_file_path = args.input, args.output
    try:
        with open(input_file_path, 'r', encoding='utf-8', errors='replace') as file:
            lines = file.readlines() 
        
            words_all = []
            for line in lines:
                words = re.findall(r'\b\w+\b', line)
                print(f"words_in_line: {len(words)}")
            
                for word in words:
                    words_all.append(word)
          
            print(f"words_all: {len(words_all)}")
        
            # Using dict.fromkeys() to remove duplicates while preserving order
            unique_words = list(dict.fromkeys(words_all))
            unique_words = sorted(unique_words, key=len)

            print(f"unique_words: {len(unique_words)}")


        new_unique_words = []
        for word in unique_words:
            print(word)
            with open(output_file_path, "a", encoding="utf-8") as f:
               f.write(f"{word}\n")

    except FileNotFoundError:
        raise SystemExit(f'Eingabedatei fehlt: {input_file_path}')


if __name__ == "__main__":
    main()
