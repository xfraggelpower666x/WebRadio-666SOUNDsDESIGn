import os
from html import escape
import urllib.parse
from collections import Counter

# ==========================================
# CONFIGURATION
# ==========================================
LOG_FILE_PATH = "LOG_neural_indices.txt"       # The input file containing your list of paths
OUTPUT_HTML_PATH = "top_videos.html"  # The HTML file to be generated
MAX_VIDEOS = 150                      # Number of videos to display
MAX_FILENAME_CHARS = 10               # Maximum characters of the filename to display
# ==========================================

def generate_html():
    print(f"Reading and counting paths from {LOG_FILE_PATH}...")
    
    # 1. Read the log file and count path occurrences
    path_counts = Counter()
    try:
        with open(LOG_FILE_PATH, 'r', encoding='utf-8') as f:
            for line in f:
                path = line.strip()
                if path:
                    # Normalize slashes (change \ to /) so identical paths merge correctly
                    normalized_path = path.replace('\\', '/')
                    path_counts[normalized_path] += 1
    except FileNotFoundError:
        print(f"Error: Could not find '{LOG_FILE_PATH}'. Please check the path.")
        return

    # 2. Sort paths by most frequent
    sorted_paths = path_counts.most_common()
    print(f"Found {len(sorted_paths)} unique files. Searching for the top {MAX_VIDEOS} existing files...")

    # 3. Setup HTML boilerplate with CSS
    html_content = """<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>Top Videos</title>
<style>
    body { font-family: Arial, sans-serif; background-color: #121212; color: #ffffff; padding: 20px; }
    h1 { text-align: center; }
    .video-grid {
        display: grid;
        /* Responsive grid: columns will automatically adjust based on screen size */
        grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
        gap: 15px;
    }
    .video-container {
        position: relative;
        background: #1e1e1e;
        border-radius: 8px;
        overflow: hidden;
        aspect-ratio: 16 / 9; /* fallback ratio */
    }
    video {
        width: 100%;
        height: 100%;
        object-fit: contain; /* ensures square/horizontal fit properly without stretching */
        display: block;
    }
    .overlay {
        position: absolute;
        top: 10px;
        left: 10px;
        background: rgba(0, 0, 0, 0.8);
        color: #00ffcc;
        padding: 6px 12px;
        border-radius: 6px;
        font-size: 14px;
        font-weight: bold;
        pointer-events: none;
        z-index: 10;
        box-shadow: 0 2px 4px rgba(0,0,0,0.5);
    }
</style>
</head>
<body>
    <h1>Top Video Occurrences</h1>
    <div class="video-grid">
"""

    # 4. Check existence and append to HTML
    added_count = 0
    
    for path, count in sorted_paths:
        if added_count >= MAX_VIDEOS:
            break # Stop once we've successfully found our Top N files
            
        # Only check existence for the top candidates
        if os.path.exists(path):
            # Extract just the filename (e.g., '1564612213.mp4')
            filename = os.path.basename(path)
            name, ext = os.path.splitext(filename)
            
            # Truncate string (concat)
            if len(name) > MAX_FILENAME_CHARS:
                display_name = name[:MAX_FILENAME_CHARS] + ".." + ext
            else:
                display_name = filename
                
            # Safely encode the path to a local browser URL (e.g., file:///G:/...)
            # quote handles special characters/spaces but keeps / and : intact
            safe_url = f"file:///{urllib.parse.quote(path, safe=':/')}"
            
            # Append video block to HTML
            # 'muted' is strictly required by Chromium/Webkit browsers to allow 'autoplay'
            html_content += f"""
        <div class="video-container">
            <div class="overlay">{escape(display_name)} | Count: {count}</div>
            <video src="{safe_url}" autoplay loop muted playsinline></video>
        </div>"""
            
            added_count += 1

    # 5. Close HTML tags
    html_content += """
    </div>
</body>
</html>
"""

    # 6. Write to output file
    with open(OUTPUT_HTML_PATH, 'w', encoding='utf-8') as f:
        f.write(html_content)
        
    print(f"Success! Generated '{OUTPUT_HTML_PATH}' containing {added_count} auto-playing videos.")

if __name__ == "__main__":
    generate_html()
