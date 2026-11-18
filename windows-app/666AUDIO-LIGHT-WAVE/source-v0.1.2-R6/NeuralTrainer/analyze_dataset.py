import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
import seaborn as sns
import scipy.stats as stats
import re
from statsmodels.tsa.stattools import adfuller
from statsmodels.graphics.tsaplots import plot_acf

FILE_PATH = 'dataset_0-80k.txt' # <-- CHANGE THIS to your text file

# ==========================================
# 1. MEMORY-EFFICIENT DATA LOADING (25%)
# ==========================================
def load_data_25_percent(filepath):
    print("Reading data and downsampling to 25%...")
    
    # 1. Read the raw text (60MB of text is tiny for RAM)
    with open(filepath, 'r') as file:
        content = file.read()
        
    # 2. Use a lazy iterator instead of building a massive list of strings
    iterator = re.finditer(r'-?\d+', content)
    
    # 3. Only keep 1 out of every 4 numbers (25%)
    sampled_numbers = []
    for i, match in enumerate(iterator):
        if i % 2 == 0: 
            sampled_numbers.append(int(match.group()))
            
    # 4. Convert to highly compressed 32-bit integers to save RAM
    # (If your numbers go over 2 billion, change np.int32 to np.int64)
    ts_series = pd.Series(sampled_numbers, dtype=np.int32)
    
    print(f"Done! Loaded {len(ts_series):,} numbers into memory.")
    return ts_series

try:
    ts_data = load_data_25_percent(FILE_PATH)
except FileNotFoundError:
    print(f"Could not find {FILE_PATH}.")
    exit()

# ==========================================
# 2. STATISTICAL TEXT REPORT (Fast operations)
# ==========================================
print("\n=== BASIC DESCRIPTIVE STATISTICS ===")
print(f"Total Data Points : {len(ts_data):,}")
print(f"Minimum Value     : {ts_data.min()}")
print(f"Maximum Value     : {ts_data.max()}")
print(f"Mean (Average)    : {ts_data.mean():.2f}")
print(f"Median            : {ts_data.median():.2f}")

print("\n=== DISTRIBUTION SHAPE ===")
print(f"Skewness          : {stats.skew(ts_data):.3f}")
print(f"Kurtosis          : {stats.kurtosis(ts_data):.3f}")

# Shapiro-Wilk fails/complains on datasets > 5000, so we slice it for the test
stat, p_value = stats.shapiro(ts_data[:5000])
print(f"Normality p-value : {p_value:.5f} (Tested on first 5000 pts)")

print("\n=== TIME SERIES PROPERTIES ===")
# ADF Test is very slow on millions of points, we sample it down to 10k max
adf_sample = ts_data if len(ts_data) < 10000 else ts_data[:10000]
adf_result = adfuller(adf_sample)
print(f"ADF Statistic     : {adf_result[0]:.3f} (Tested on up to 10,000 pts)")
print(f"ADF p-value       : {adf_result[1]:.5f}")


# ==========================================
# 3. VISUALIZATION DASHBOARD (Memory Optimized)
# ==========================================
print("\nGenerating plots... (Optimized for large datasets)")
sns.set_theme(style="whitegrid")
fig = plt.figure(figsize=(16, 10))
fig.suptitle("Time Series & Distribution Analysis Dashboard (25% Sample)", fontsize=16, fontweight='bold')

# Plot 1: Line Plot (REMOVED markers to save memory)
ax1 = plt.subplot(2, 3, (1, 2))
# For extreme sizes, rendering millions of lines is still heavy. 
# We use a simple line without dots, and lower linewidth.
ax1.plot(ts_data.index, ts_data.values, color='b', alpha=0.7, linewidth=0.5)
ax1.set_title("Time Series Line Plot")
ax1.set_xlabel("Time / Index")
ax1.set_ylabel("Value")

# Plot 2: Boxplot (using flierprops to make outlier dots tiny/transparent)
ax2 = plt.subplot(2, 3, 3)
sns.boxplot(y=ts_data, ax=ax2, color='lightblue', flierprops={'marker': '.', 'markersize': 1, 'alpha': 0.1})
ax2.set_title("Boxplot (Outlier Detection)")

# Plot 3: Histogram (REMOVED KDE curve as it chokes on millions of points)
ax3 = plt.subplot(2, 3, 4)
sns.histplot(ts_data, kde=False, bins=100, ax=ax3, color='purple')
ax3.set_title("Histogram (Distribution)")
ax3.set_xlabel("Value")

# Plot 4: Q-Q Plot
ax4 = plt.subplot(2, 3, 5)
# Sub-sample QQ plot to 10,000 points so Matplotlib doesn't crash drawing it
stats.probplot(ts_data[:10000], dist="norm", plot=ax4)
ax4.set_title("Q-Q Plot (First 10k points)")

# Plot 5: Autocorrelation (Added fft=True to calculate using Fast Fourier Transform!)
ax5 = plt.subplot(2, 3, 6)
if len(ts_data) > 3:
    # fft=True is CRITICAL for huge datasets, takes ms instead of hours
    plot_acf(ts_data, ax=ax5, lags=40, alpha=0.05, fft=True)
    ax5.set_title("Autocorrelation (ACF)")

plt.tight_layout(rect=[0, 0.03, 1, 0.95])
plt.show()
