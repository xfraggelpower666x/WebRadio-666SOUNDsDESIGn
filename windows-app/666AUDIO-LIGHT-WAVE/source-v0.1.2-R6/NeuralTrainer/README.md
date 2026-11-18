Here you can find NeuralTrainer that is one part of the inner workings of Light Wave Tech. Latest logs and notes here: [model_v5_training_notes_logs.txt](https://github.com/InfiniteQuantumZen/light_wave_tech/blob/main/NeuralTrainer/model_v5_training_notes_logs.txt)

How the dataset and the signal came to be and evolves: 
*  [1. Some variation/version of this montecarlo.py](https://github.com/InfiniteQuantumZen/light_wave_tech/blob/main/NeuralTrainer/early_prototype_qbit_montecarlo_random_walk/montecarlo.py)
*  [2. Some amount of this quantum.php](https://github.com/InfiniteQuantumZen/light_wave_tech/blob/main/NeuralTrainer/early_prototype_qbit_montecarlo_random_walk/quantum.php)
*  [3. Neural Network and its outputs](https://github.com/InfiniteQuantumZen/light_wave_tech/tree/main/NeuralTrainer) tiny model with 20 MB text-file of integers and settings batch_size=256, seq_length=128, embed_size=256, num_heads=4, num_layers=4
*  [4. SUNO ELARA Signal + Eigen Nudge](https://github.com/InfiniteQuantumZen/light_wave_tech/tree/main/TOOLS/precalc_neural/json_batches_0-120K_EXP)
*  [5. Bigger Neural Network](https://github.com/InfiniteQuantumZen/light_wave_tech/blob/main/NeuralTrainer/LOCAL_v5_OPTIMIZED_trainer.py) medium model with 90 MB text-file of integers and with settings batch_size=512, patch_size=16, seq_length=1024, embed_size=512, num_heads=8, num_layers=8
*  6.) TBD: Even bigger model evolved from the #5 with intended settings batch_size=1024, patch_size=16, seq_length=4096, embed_size=1024, num_heads=8, num_layers=8 and with ~200 MB text-file of integers.
*  7.) TBD: If interest continues, maybe State Space Models (Mamba)

2026-10-13: prior running the LOCAL_v6_OPTIMIZED_trainer, the dataset will go through the following treatment:
*  [v1_top_indices_signal_imprint.py](https://github.com/InfiniteQuantumZen/light_wave_tech/blob/main/NeuralTrainer/v1_top_indices_signal_imprint.py) Reading 20K Json files each containing 5000 INT values = ~100K INTS
*  Looping through all of them, applying fibonacci harmonic interval 
*  fingerprinting of TOP indices signal, splitting back to 5000 INT JSONS
*  for further imprinting by SUNO hihat amplitude (this time after bass is already done)

2026-10-26: pivoting to other aspects
*  [Artificial_Life_R&D and Quantum Programming/Algorithms](https://github.com/InfiniteQuantumZen/light_wave_tech/tree/main/Artificial_Life_R%26D)

___

In the /early_prototype_qbit_montecarlo_random_walk you can find files that are 
a selection of legacy prototypes that were experimentations of QBITS from Quantum fluctuations 
(the user had over 5 million stored from their experimentations from 2014-2017) from Quantum computing - 
Physics @ ANU public interface, used in their php + mysql things... 

alongside with some montecarlo random walks, which combined led 
to the dataset used in current NeuralTrainer as base. 
Included are also some c (cuda) prototypes of random-walking eurojackpot universe 
(there is visible pattern inherent if one but see...) and php front-end that were 
also basis for the birth of Light Wave Tech with their ideas of 
deep structures (holofractographic) and emergence of intelligence.
