// nvcc --optimize 2 --m64 --use_fast_math -lcuda -lcurand -o ultimate_numbers_1 ultimate_numbers_1.cu

#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <time.h>
#include <cuda.h>
#include <cuda_runtime.h>
#include <curand_kernel.h>

#define MAX_LENGTH 100
#define MAX_ITERATIONS 500

char filename_line_count[110] = "/workspace/jackpot_ULTIMATE_NUMBERS_LIST_FINAL_DRAW_DB_linecount_1.txt";
char filename_number_statistics[110] = "/workspace/jackpot_ULTIMATE_NUMBERS_LIST_FINAL_DRAW_DB_END_RESULT_1.txt";
char filename_number_combinations[110] = "/workspace/jackpot_ULTIMATE_NUMBERS_LIST_FINAL_DRAW_DB.txt";

__global__ void check_number(int* numbers_1, int* found_total, curandState* state, unsigned long seed)
{
    int total_iterations = 0;
    int idx = threadIdx.x + blockIdx.x * blockDim.x;
    curand_init(seed, idx, 0, &state[idx]);
    int const num_random_numbers = 5;
    int random_numbers[num_random_numbers];

/*    printf("%d, %d, %d, %d, %d == %d, %d, %d, %d, %d\n",
            numbers_1[0], numbers_1[1], numbers_1[2], numbers_1[3], numbers_1[4],
            random_numbers[0], random_numbers[1], random_numbers[2], random_numbers[3], random_numbers[4]);
*/

    for(int iteration=0; iteration<MAX_ITERATIONS; iteration++)
    {
        for (int i = 0; i < num_random_numbers; i++)
        {
            int random_num = 1 + curand_uniform(&state[idx]) * 50;
            random_numbers[i] = random_num;
        }

        for (int i = 0; i < num_random_numbers - 1; i++)
        {
            for (int j = 0; j < num_random_numbers - i - 1; j++)
            {
                if (random_numbers[j] > random_numbers[j + 1])
                {
                    int temp = random_numbers[j];
                    random_numbers[j] = random_numbers[j + 1];
                    random_numbers[j + 1] = temp;
                }
            }
        }

        if(numbers_1[0] == random_numbers[0] && numbers_1[1] == random_numbers[1] &&
           numbers_1[2] == random_numbers[2] && numbers_1[3] == random_numbers[3] &&
           numbers_1[4] == random_numbers[4])
        {
//            printf("JACKPOT! {%d}: %d, %d, %d, %d, %d == %d, %d, %d, %d, %d\n", iteration, numbers_1[0], numbers_1[1], numbers_1[2], numbers_1[3], numbers_1[4], random_numbers[0], random_numbers[1], random_numbers[2], random_numbers[3], random_numbers[4]);
            atomicAdd(found_total, 1);
        }

        total_iterations++;
      }

    //printf("total_iterations = %d\n", total_iterations);
}

int main() {
//    cudaSetDevice(1); // USE GT1030

    char str[MAX_LENGTH];
    int numbers[MAX_LENGTH];
    int line_count_start = 0;
    int line_count = 0;

    FILE* file_line_count = fopen(filename_line_count, "r");
    if (file_line_count == NULL) {
        printf("Error opening file: %s!\n", filename_line_count);
        printf("Creating one... \n");
        FILE* f = fopen(filename_line_count, "w");
        fprintf(f, "%d\n", 0);
        fclose(f);
        printf("Ok!\n");
        return 1;
    }
    fgets(str, MAX_LENGTH, file_line_count);
    line_count_start = atoi(str);
    printf("Starting from line_count_start: %d... ", line_count_start);
    fclose(file_line_count);

    FILE* file_number_combinations = fopen(filename_number_combinations, "r");
    if (file_number_combinations == NULL) {
        printf("Error opening the file: %s\n", filename_number_combinations);
        return 1;
    }

    while(fgets(str, MAX_LENGTH, file_number_combinations) != NULL)
    {
        if (line_count >= line_count_start)
        {
            //printf("  processing line: %d\n", line_count);
            FILE* file_line_count = fopen(filename_line_count, "w");
            if (file_line_count == NULL) {
                printf("While(fgets(str... Error opening file: %s\n", filename_line_count);
                return 1;
            }
            fprintf(file_line_count, "%d\n", line_count);
            fclose(file_line_count);

            //printf("String read from file: %s", str);
            int count = 0;
            char *token = strtok(str, ",");
            while (token != NULL && count < MAX_LENGTH) {
                numbers[count] = atoi(token);
                token = strtok(NULL, ",");
                count++;
            }
            
            //printf("Integer values: %d, %d, %d, %d, %d \n", numbers[0], numbers[1], numbers[2], numbers[3], numbers[4]);

            int found_total = 0;
            int numbers_1[5] = {numbers[0], numbers[1], numbers[2], numbers[3], numbers[4]};

            // Allocate device memory
            int* d_numbers_1;
            int* d_found_total;

            cudaMalloc((void**)&d_numbers_1, 5 * sizeof(int));
            cudaMalloc((void**)&d_found_total, sizeof(int));

            // Copy input data from host to device
            cudaMemcpy(d_numbers_1, numbers_1, 5 * sizeof(int), cudaMemcpyHostToDevice);
            cudaMemcpy(d_found_total, &found_total, sizeof(int), cudaMemcpyHostToDevice);

            int N = 512;
            curandState* devStates;
            cudaMalloc(&devStates, N * sizeof(curandState));

            dim3 threadsPerBlock(32, 32); // 32x32 = 256 threads per block
            dim3 numBlocks(40, 40);     // 256x256 = 65536 blocks

            // Launch the kernel
            check_number<<<numBlocks, threadsPerBlock>>>(d_numbers_1, d_found_total, devStates, time(NULL));

            // Copy result back from device to host
            cudaMemcpy(&found_total, d_found_total, sizeof(int), cudaMemcpyDeviceToHost);

            // Free device memory
            cudaFree(d_numbers_1);
            cudaFree(d_found_total);
            cudaFree(devStates);

            //printf("found total: %d\n", found_total);

            if (found_total > 0) 
            {
                FILE* f = fopen(filename_number_statistics, "a");
                if (f == NULL) {
                    printf("check_jackpot(): Error opening file: %s\n", filename_number_statistics);
                    return 0;
                }
                fprintf(f, "check_jackpot():: %d, %d, %d, %d, %d {%d}\n", numbers[0], numbers[1], numbers[2], numbers[3], numbers[4], found_total);
                fclose(f);
            }
        }
        line_count++;
    }

    fclose(file_number_combinations);

    return 0;
}
