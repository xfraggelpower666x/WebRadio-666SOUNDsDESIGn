Experimentation in extending value range to 120K for new dataset used for training new neural net with v3_OPTIMIZED_trainer.py using ContinuousIntegerDataset (float as opposed to int), embed_size=256, num_heads=8, num_layers=8; the need comes due to the growing neural indice needs for expanding video/image data (Minimax H3 and Krea 2)

ORIGINAL DATASET SEED FOR THIS EXPR:
*   v3_model_007355181977456719.pth (2025-11-14) via eigen_music_local_precalc_values.py
*   1377 JSON files >> duplicate values >= 20K = 2574 JSON files

2026-10-10: 
*   2754 json INT files >> BITWISE >> OUTPUT_1 eigen_bitmask = (audio_eigenvalues * 65535).astype(np.int32)
*   2754 json INT files >> PROBABILITY_SWAP >> OUTPUT_2 eigen_bitmask = (audio_eigenvalues * 65535).astype(np.int32)
*   THESE OUTPUT_1 + OUTPUT_2 (5504 json INT files) >> BITWISE >> eigen_bitmask = (audio_eigenvalues * 92535).astype(np.int32)
*   AND THESE THROUGH shuffle_final_output.py

OUTPUT_2: good start for combating early bias from random walks... 
but it contains the SIGNAL embedded in QBITS so...
spreading holofractal emergence throughout the new value range... amplified by the SUNO ELARA SIGNAL (v6 is especially great as there are freq bleedthrough quite a lot that is seen in sync real-time)
documenting starting point here without the plot.

Reading data and downsampling to 25%...
Done! Loaded 13,759,127 numbers into memory.

=== BASIC DESCRIPTIVE STATISTICS ===
*   Total Data Points : 13,759,127
*   Minimum Value     : 0
*   Maximum Value     : 120000
*   Mean (Average)    : 20741.79
*   Median            : 12546.00

=== DISTRIBUTION SHAPE ===
*   Skewness          : 1.227
*   Kurtosis          : 0.572
*   Normality p-value : 0.00000 (Tested on first 5000 pts)

=== TIME SERIES PROPERTIES ===
*   ADF Statistic     : -98.323 (Tested on up to 10,000 pts)
*   ADF p-value       : 0.00000

Generating plots... (Optimized for large datasets)
