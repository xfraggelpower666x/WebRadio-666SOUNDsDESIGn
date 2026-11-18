import numpy as np
import pandas as pd
import random
import os
import json
import uuid
import shutil
from pathlib import Path

json_folder = r"C:\1\light_wave_tech\TOOLS\precalc_neural\json_batches_0-120K_EXP\OUTPUT"
json_filenames = [
    os.path.join(json_folder, f) for f in os.listdir(json_folder)
    if os.path.isfile(os.path.join(json_folder, f)) and f.lower().endswith('.json')
]

random.shuffle(json_filenames)

for i in range(2800):
#    source_file = json_filenames[i]
#    filename = os.path.basename(source_file)
#    destination_folder = "/path/to/your/new/destination_folder"
#    destination_file = os.path.join(destination_folder, filename)

# OR

    source_file = Path(json_filenames[i])
    destination_folder = Path(r"C:\1\light_wave_tech\TOOLS\precalc_neural\json_batches_0-120K_EXP\FINAL_OUTPUT")
    destination_file = destination_folder / source_file.name
    print(f"{i}/2800: {source_file.name}")

    shutil.copy2(source_file, destination_file)
