<?php
if (PHP_SAPI !== 'cli' || getenv('LWT_ENABLE_LEGACY_EXPERIMENTS') !== '1') {
    if (PHP_SAPI !== 'cli') {
        http_response_code(404);
    }
    exit;
}

/*
mysql> SELECT count(*) FROM jackpot_all_numbers_sorted WHERE id < 494500 LIMIT 1; SELECT count(*) FROM jackpot_all_numbers_sorted WHERE id > 494500 AND id < 989000 LIMIT 1; SELECT count(*) FROM jackpot_all_numbers_sorted WHERE id > 989000 LIMIT 1;
+----------+
| count(*) |
+----------+
|   494499 |
+----------+
+----------+
| count(*) |
+----------+
|   494499 |
+----------+
+----------+
| count(*) |
+----------+
|   494501 |
+----------+


SELECT count(*) FROM jackpot_all_numbers_sorted WHERE state=1 AND id < 494500 LIMIT 1; SELECT count(*) FROM jackpot_all_numbers_sorted WHERE state=1 AND id > 494500 AND id < 989000 LIMIT 1; SELECT count(*) FROM jackpot_all_numbers_sorted WHERE state=1 AND id > 989000 LIMIT 1;

SELECT draw_cycle_number, COUNT(*) AS count_draw_cycle FROM jackpot_final WHERE draw_cycle_number BETWEEN 1 AND 104 GROUP BY draw_cycle_number UNION ALL SELECT NULL, COUNT(*) AS count_state_zero FROM jackpot_all_numbers_sorted WHERE state = 0 UNION ALL SELECT NULL, COUNT(*) AS count_total FROM jackpot_final;
*/


include_once("../../Config/config.php");
include_once("../../Include/mysql_handler.php");

function Export_Position_Values()
{
    $number_combination_filename = "F:/Deep_Learning_Local/QUANTUM_AI_INIT/eurojackpot_data/all_past_winning_jackpot_numbers.txt";
    echo "number_combination_filename = $number_combination_filename<br>\n";

    if(file_exists($number_combination_filename))
    {
        $fp = fopen($number_combination_filename, "rt");
        while(($buffer = fgets($fp, 4096)) !== false)
        {
            $data_str = trim($buffer);
            //$data_str = "5, 12, 21, 43, 48 + 5, 6 | 2013-03-22";
            $tmp_str = explode("+", $data_str);
            $number_combination = trim($tmp_str[0]);

            $query = "SELECT position FROM jackpot_all_numbers_sorted_final WHERE number_combination='$number_combination'";
            //echo "query = $query<br>\n";
            $result = mysql_query($query);

            if(mysql_num_rows($result) == 1)
            {
                $output_filename = "F:/Deep_Learning_Local/QUANTUM_AI_INIT/eurojackpot_data/pattern/2012_-_2027.txt";
                $fp_output = fopen("$output_filename", "a");
                $data = mysql_fetch_object($result);
                echo "data->position = $data->position<br>\n";
                fputs($fp_output, "$data->position\n");
                fclose($fp_output);
            }
        }
        fclose($fp);
    }
}

function Transfer_Occurrences()
{
/*___________________________________________________

1.) CREATE DELETE-LIST: (TAKES SOME 5-6 HOURS OR SO):
https://colab.research.google.com/drive/1NjK_lSENd8unl35dz1PjCDfhBzdms5fT#scrollTo=6EjykVTVHhSJ&uniqifier=2

data_str_list1 = []
with open(f"F:/Deep_Learning_Local/QUANTUM_AI_INIT/eurojackpot_data/2023-10-01_jackpot_normal_numbers_all_2_million.txt", 'r', encoding='utf-8', errors='replace') as f:
  lines = [line.strip() for line in f.readlines()]
  for data_str in lines:
    data_str_list1.append(data_str)

data_str_list2 = []
with open(f"F:/Deep_Learning_Local/QUANTUM_AI_INIT/eurojackpot_data/TOP_200.000_ULTIMATE_NUMBERS_LIST_FINAL_DRAW_DB___UPDATED_2023-10-01.txt", 'r', encoding='utf-8', errors='replace') as f:
  lines = [line.strip() for line in f.readlines()]
  for data_str in lines:
    data_str_list2.append(data_str)

for line in data_str_list1:
  if line not in data_str_list2:
    with open(f"F:/Deep_Learning_Local/QUANTUM_AI_INIT/eurojackpot_data/TMP_DELETE_LIST.txt", "a", encoding="utf-8") as f:
      f.write(f"{line}\n")

   ___________________________________________
___OPTIMIZED VERSION (FROM 7 HOURS TO 1 SECOND)___:
# Read data from the first file and store it in a set
data_set1 = set()
with open(f"F:/Deep_Learning_Local/QUANTUM_AI_INIT/eurojackpot_data/2023-10-01_jackpot_normal_numbers_all_2_million.txt", 'r', encoding='utf-8', errors='replace') as f:
    for line in f:
        data_set1.add(line.strip())

# Read data from the second file and store it in a set
data_set2 = set()
with open(f"F:/Deep_Learning_Local/QUANTUM_AI_INIT/eurojackpot_data/TOP_200.000_ULTIMATE_NUMBERS_LIST_FINAL_DRAW_DB___UPDATED_2023-10-01.txt", 'r', encoding='utf-8', errors='replace') as f:
    for line in f:
        data_set2.add(line.strip())

# Find lines in data_set1 that are not in data_set2 and write them to a file
with open(f"F:/Deep_Learning_Local/QUANTUM_AI_INIT/eurojackpot_data/TMP_DELETE_LIST.txt", "a", encoding="utf-8") as f:
    for line in data_set1 - data_set2:
        f.write(f"{line}\n")
_____________________________________________________*/

    $delete_list_filename = "F:/Deep_Learning_Local/QUANTUM_AI_INIT/eurojackpot_data/TMP_DELETE_LIST.txt";
    echo "delete_list_filename = $delete_list_filename<br>\n";

    if(file_exists($delete_list_filename))
    {
        $fp = fopen($delete_list_filename, "rt");
        while(($buffer = fgets($fp, 4096)) !== false)
        {
            $data_str = trim($buffer);
            $query = "DELETE FROM jackpot WHERE number_combination='$data_str'";
            //echo "query=$query<br>\n";
            $result = mysql_query($query);
        }
        fclose($fp);
    }
}

function Import_Draw_Cycle_Median_Numbers()
{
    //___
    $query = "DROP TABLE IF EXISTS `jackpot_draw_cycle_median_numbers`";
    $result = mysql_query($query);

    $query = "CREATE TABLE `jackpot_draw_cycle_median_numbers`
             (
                `id` int(20) NOT NULL auto_increment,
                `median_number` int(20) default '0',
                `threshold_number` int(20) default '0',
                PRIMARY KEY (`id`),
                KEY `median_number_idx` (`median_number`),
                KEY `threshold_number_idx` (`threshold_number`)
             ) ENGINE=MyISAM DEFAULT CHARSET=utf8";
    $result = mysql_query($query);
    //_____________________________________________________

    $filepath = "F:/Deep_Learning_Local/QUANTUM_AI_INIT/eurojackpot_data/pattern";
    $filename = "draw_cycle_median_values.txt";
    $median_number_filename = $filepath. "/". $filename;
    echo "median_number_filename = $median_number_filename<br>\n";

    if(file_exists($median_number_filename))
    {
        $fp = fopen($median_number_filename, "rt");
        while(($buffer = fgets($fp, 4096)) !== false)
        {
            $data_str = trim($buffer);
            $median_values[] = $data_str;
        }
        fclose($fp);
    }

    $filepath = "F:/Deep_Learning_Local/QUANTUM_AI_INIT/eurojackpot_data/pattern";
    $filename = "draw_cycle_threshold_values.txt";
    $threshold_number_filename = $filepath. "/". $filename;
    echo "threshold_number_filename = $threshold_number_filename<br>\n";

    if(file_exists($threshold_number_filename))
    {
        $fp = fopen($threshold_number_filename, "rt");
        while(($buffer = fgets($fp, 4096)) !== false)
        {
            $data_str = trim($buffer);
            $threshold_values[] = $data_str;
        }
        fclose($fp);
    }

    for($i=0; $i<104; $i++)
    {
        $median_number = $median_values[$i];
        $threshold_number = $threshold_values[$i];

        $query = "INSERT INTO jackpot_draw_cycle_median_numbers 
                  (
                     median_number, 
                     threshold_number
                  ) 
                  VALUES
                  (
                     '$median_number', 
                     '$threshold_number'
                  )";

        $result = mysql_query($query);
    }
}

function Random_Extra_Numbers()
{
   $random_extra_number_1 = mt_rand(1, 12);
   $random_extra_number_2 = mt_rand(1, 12);

   if($random_extra_number_1 == $random_extra_number_2)
   {
      $random_extra_number_1 = mt_rand(1, 12);
      $random_extra_number_2 = mt_rand(1, 12);

      if($random_extra_number_1 == $random_extra_number_2)
      {
         $random_extra_number_1 = mt_rand(1, 12);
         $random_extra_number_2 = mt_rand(1, 12);

         if($random_extra_number_1 == $random_extra_number_2)
         {
            $random_extra_number_1 = mt_rand(1, 12);
            $random_extra_number_2 = mt_rand(1, 12);

            if($random_extra_number_1 == $random_extra_number_2)
            {
               $random_extra_number_1 = mt_rand(1, 12);
               $random_extra_number_2 = mt_rand(1, 12);
            }
         }
      }
   }

   return "$random_extra_number_1, $random_extra_number_2";
}

function Init_Random_Jackpot_Draw_Simulation()
{
    //___
    $query = "DROP TABLE IF EXISTS `jackpot_final`";
    $result = mysql_query($query);

    $query = "CREATE TABLE `jackpot_final`
            (
              `id` int(20) NOT NULL auto_increment,
              `state` VARBINARY(1) default '1',
              `position` int(20) default '0',
              `draw_cycle_number` int(20) default '0',
              `occurrence` int(20) default '0',
              `number_combination` varchar(30) default NULL,
              PRIMARY KEY (`id`),
              KEY `state_idx` (`state`),
              KEY `position_idx` (`position`),
              KEY `draw_cycle_number_idx` (`draw_cycle_number`),
              KEY `occurrence_idx` (`occurrence`),
              KEY `number_combination_idx` (`number_combination`),
              UNIQUE KEY `number_combination_unique_idx` (`number_combination`(30))
            ) ENGINE=MyISAM DEFAULT CHARSET=utf8";
    $result = mysql_query($query);
    //_____________________________________________________
}

function Random_Jackpot_Draw_Simulation()
{

   /*__________________________
     https://calcudater.com/fridays-in-2024
     34. Friday, August 25th, 2023 (8/25/23) 2023-08-25
     REPLACE . WITH . |
     REPLACE ( WITH | (
     REPLACE ) WITH ) |
     REPLACE Tuesday, WITH Tuesday |
     REPLACE Friday, WITH Friday |

     ADJUST RATIO = 1.483.501 / 2.118.760    = 0,70
     UPPER : 1.483.501	>> 989.000-1.483.501 = 494 500
     MIDDLE: 989.000	>> 494.500-989.000   = 494 500
     LOWER : 494.500	>> 1-494.500         = 494 500
     __________________________*/

/*

update jackpot_all_numbers_sorted set state=1; delete from jackpot_final;

TOTAL: 1040
LOWER_TOTAL: 230   | MIDDLE_TOTAL: 570   |  UPPER_TOTAL: 240
             22,1% |               54,8% |               23,0%

TOTAL: 9360
LOWER_TOTAL: 2070  | MIDDLE_TOTAL: 5130  | UPPER_TOTAL: 2160

select count(*) from jackpot_draw_cycle_median_numbers where median_number < 494500; select count(*) from jackpot_draw_cycle_median_numbers where median_number > 494500 and median_number < 989000; select count(*) from jackpot_draw_cycle_median_numbers where median_number > 989000;
+------------+------------+------------+
| 23 (22,1%) | 57 (54,8%) | 24 (23,0%) |
+------------+------------+------------+

*/ 

   $draw_cycle_median_value = 0;
   $draw_cycle_number = 0;
   $counter_lower = 0;
   $counter_middle = 0;
   $counter_upper = 0;

   for($draw_cycle_number=1; $draw_cycle_number <= 104; $draw_cycle_number++)
   {
      //echo "DRAW_CYCLE_NUMBER: $draw_cycle_number<br>\n";

      $query = "SELECT median_number FROM jackpot_draw_cycle_median_numbers WHERE id='$draw_cycle_number'";
      $result = mysql_query($query);

      if(mysql_num_rows($result) == 1)
      {
         $data = mysql_fetch_object($result);
         $draw_cycle_median_value = $data->median_number;
      }

      //echo "DRAW_CYCLE_MEDIAN_VALUE = $draw_cycle_median_value<br>\n";

      if($draw_cycle_median_value > 0)
      {
         $middle_median_value_ceiling = 989000;
         $min_median_value_ceiling    = 494500;

         // LOWER
         if($draw_cycle_median_value < $min_median_value_ceiling)
         {
            $counter_lower++;
            //OLD: ... ORDER BY RAND() LIMIT 1";
            $query = "SELECT id AS position, occurrence, number_combination FROM jackpot_all_numbers_sorted WHERE state=1 AND id < $min_median_value_ceiling LIMIT 1";
         }
         // MIDDLE
         else if($draw_cycle_median_value > $min_median_value_ceiling && $draw_cycle_median_value < $middle_median_value_ceiling)
         {
            $counter_middle++;
            $query = "SELECT id AS position, occurrence, number_combination FROM jackpot_all_numbers_sorted WHERE state=1 AND id > $min_median_value_ceiling AND id < $middle_median_value_ceiling LIMIT 1";
         }
         // UPPER
         else if($draw_cycle_median_value > $middle_median_value_ceiling)
         {
            $counter_upper++;
            $query = "SELECT id AS position, occurrence, number_combination FROM jackpot_all_numbers_sorted WHERE state=1 AND id > $middle_median_value_ceiling LIMIT 1";
         }
         else
         {
            $query = "NOT_SET";
            echo "SQL QUERY NOT_SET<br>\n";
         }         

         //echo "$query<br>\n";
         $result = mysql_query($query);

         if(mysql_num_rows($result) == 1)
         {
            $data = mysql_fetch_object($result);
            $draw_cycle_number_combination_value = $data->number_combination;

            $query = "INSERT INTO jackpot_final
                      (                          
                          occurrence,
                          position,
                          draw_cycle_number,
                          number_combination
                      )
                      VALUES
                      (
                          '$data->occurrence',
                          '$data->position',
                          '$draw_cycle_number',
                          '$data->number_combination'
                      )";

            $result = mysql_query($query);

            $query = "UPDATE jackpot_all_numbers_sorted SET state='0' WHERE id='$data->position'";
            $result = mysql_query($query);
            //echo "$query<br>\n";

/*
            $output_path = "F:/Deep_Learning_Local/QUANTUM_AI_INIT/eurojackpot_data/pattern/simulation";
            $output_file = "$draw_cycle_number.txt";
            $fp = fopen("$output_path/$output_file", "a");
            fputs($fp, "$data->occurrence|$data->position|$draw_cycle_number|$data->number_combination\n");
            fclose($fp);
*/
         }
      }
   }

   return "$counter_lower|$counter_middle|$counter_upper";
}

function Get_Percentage($value_1, $value_2)
{
    if($value_1 < $value_2)
    {
        $percentage = round(($value_1 / $value_2) * 100, 2);
    }
    else
    {
        $percentage = round(($value_2 / $value_1) * 100, 2);
    }

    return $percentage;
}


function Random_Jackpot_Draw_Simulation_Per_Cycle()
{
   /*__________________________
     WHEN Draw_Simulation() DONE >> 104 BLOCKS CONTAINING SOME 14.000 NUMBER COMBINATIONS EACH
     1.) SIMULATE ON WHICH BLOCK RANDOM COMBINATION FALLS = REVERSE DRAW_CYCLE_MEDIAN_VALUE

       >> SIMULATION AS FOLLOWS: 
          >> GET RANDOM NUMBER_COMBINATION:
            $query = "SELECT number_combination FROM jackpot_all_possible_numbers WHERE state=1 ORDER BY RAND() LIMIT 1";
          >> GET POSITION FOR THAT NUMBER_COMBINATION:
            $query = "SELECT position FROM jackpot_final WHERE number_combination='$data->number_combination'";
          >> CHECK IF POSITION IS IN RANGE OF THRESHOLD (XLS_NEW_MAX-MIN_VALUE)
            $query = "SELECT id FROM jackpot_draw_cycle_median_numbers WHERE median_number='$data->position'";

         > CHECK IF MATCH IS FOUND WITHIN 104 BLOCK | IF NOT: LOG(FILE) OUT OF RANGE > 68%
       ** PURPOSE IS TO FILL ANOTHER XLS TO SEE IF ANYWHERE NEAR "REAL-LIFE" NUMBERS
         ** THUS AIM IS TO FINE-TUNE FRACTAL RHYTHM/WAVE SEEN AS "EMERGENT" IN XLS

ALL_2_MILLION_MIN_MAX_HIGHEST_LOWEST_OCCURRENCE_DIFFERENCE:
2023-09-13: 5830-4713   = 1117
2023-09-20: 8895-7533   = 1362
2023-10-01: 11919-10630 = 1289

     __________________________*/


   $query = "SELECT
                 t1.number_combination,
                 t2.draw_cycle_number,
                 t2.position,
                 t3.threshold_number,
                 t3.median_number
             FROM
                 jackpot_all_possible_numbers t1
             LEFT JOIN
                 jackpot_final t2 ON t1.number_combination = t2.number_combination
             LEFT JOIN
                 jackpot_draw_cycle_median_numbers t3 ON t2.draw_cycle_number = t3.id
             WHERE
                 t1.state = 1
             ORDER BY RAND() LIMIT 1";

   $result = mysql_query($query);

   if(mysql_num_rows($result) == 1)
   {
       $data = mysql_fetch_object($result);

       if($data->draw_cycle_number)
       {
           $number_combination = $data->number_combination;
           $draw_cycle_number  = $data->draw_cycle_number;
           $position_value     = $data->position;
           $median_value       = $data->median_number;
           $threshold_value    = $data->threshold_number;
           $threshold_floor    = $position_value - $threshold_value;
           $threshold_ceiling  = $position_value + $threshold_value;
        
           if($threshold_floor < 0) $threshold_floor = 0;
           if($threshold_ceiling < 0) $threshold_ceiling = 0;

           $percentage_floor   = Get_Percentage($median_value, $threshold_floor);
           $percentage_middle  = Get_Percentage($median_value, $position_value);
           $percentage_ceiling = Get_Percentage($median_value, $threshold_ceiling);

           echo "$number_combination | CYCLE: $draw_cycle_number | $threshold_floor << $position_value >> $threshold_ceiling | TARGET MEDIAN: $median_value | TARGET_1: $percentage_floor% | TARGET_2: $percentage_middle% | TARGET_3: $percentage_ceiling%<br>\n";

           $output_path = "F:/Deep_Learning_Local/QUANTUM_AI_INIT/eurojackpot_data/pattern/simulation";
           $output_file = "$draw_cycle_number.txt";
           $fp = fopen("$output_path/$output_file", "a");
           fputs($fp, "$number_combination | CYCLE: $draw_cycle_number | $threshold_floor << $position_value >> $threshold_ceiling | TARGET MEDIAN: $median_value | TARGET_1: $percentage_floor% | TARGET_2: $percentage_middle% | TARGET_3: $percentage_ceiling%\n");
           fclose($fp);
       }
       else
       {
           echo "$data->number_combination NOT FOUND in \"jackpot_final\"<br>\n";
       }
   }
}

$mysql_handler = new Mysql_Handler;
$mysql_handler->Init();

//__________________________________________________
//___FIRST_TIME_ONLY: 
//
// 0.0.1.) PREPARE DATA/REMOVE OUTLIERS:
// http://localhost/Quantum_Connection/Utils/jackpot_lottery/Jackpot_Unique_Import.php
// RUN AGAIN FOR REMOVED OUTLIERS: oddities_1.exe

// 0.0.) THIS FIRST ON 3060:
// http://localhost/Quantum_Connection/Utils/jackpot_lottery/3060_Import_Jackpot_Data.php

// 0.1.) THIS FIRST ON 2070:
// http://localhost/Quantum_Connection/Utils/jackpot_lottery/Import_ALL_2_MIL_Jackpot_Data.php

// 0.2.) THIS FIRST ON 2070:
// http://localhost/Quantum_Connection/Utils/jackpot_lottery/Permanent_Import_ALL_2_MIL_Jackpot_Data.php

// 1.1.) 
// http://localhost/Quantum_Connection/Utils/jackpot_lottery/Fin_Jackpot_Check.php

// 1.2.) THIS REPLACES MANUAL METHOD: pattern/all_past_winning_jackpot_numbers_SQL.txt
// http://localhost/Quantum_Connection/Utils/jackpot_lottery/Random_Jackpot_Draw_Simulation.php
//Export_Position_Values();

// 2.) ___DO_THIS_AFTER_VALUES_ARE_DONE_IN_OPEN_OFFICE___
// http://localhost/Quantum_Connection/Utils/jackpot_lottery/Random_Jackpot_Draw_Simulation.php
//Import_Draw_Cycle_Median_Numbers();
//__________________________________________________

// 3.) PRUNE DOWN TO BEST NUMBERS: 
// http://localhost/Quantum_Connection/Utils/jackpot_lottery/Random_Jackpot_Draw_Simulation.php
//Transfer_Occurrences();

// 4.) ___FIRST_TIME_INIT_FOR_SIMULATION_DATA___CREATE_DB___
// http://localhost/Quantum_Connection/Utils/jackpot_lottery/Random_Jackpot_Draw_Simulation.php
//Init_Random_Jackpot_Draw_Simulation();

// 4.1) __RUN_FIN_JACKPOT_CHECK_AGAIN_FOR_PRUNED_BEST_NUMBERS:
// http://localhost/Quantum_Connection/Utils/jackpot_lottery/Fin_Jackpot_Check.php

//Random_Jackpot_Draw_Simulation_Per_Cycle();

/*___TAKES_ABOUT_SOME_4_DAYS_TO_RUN__*/

$start_date = date('Y-m-d H:i:s');
echo "start_date: $start_date<br>\n";

$total_num_lower = 0;
$total_num_middle = 0;
$total_num_upper = 0;

echo "Simulating... ";
for($i=0; $i<16000; $i++)
{
   $stats_str = Random_Jackpot_Draw_Simulation();
   $tmp_str = explode("|", $stats_str);
   $num_lower = trim($tmp_str[0]);
   $num_middle = trim($tmp_str[1]);
   $num_upper = trim($tmp_str[2]);
   $total_num_lower += $num_lower;
   $total_num_middle += $num_middle;
   $total_num_upper += $num_upper;
   echo "LOWER: $num_lower|MIDDLE: $num_middle|UPPER: $num_upper<br>\n";
}
echo "Ok!<br>\n";

$end_date = date('Y-m-d H:i:s');
echo "end_date: $end_date<br>\n";

echo "LOWER_TOTAL: $total_num_lower|MIDDLE_TOTAL: $total_num_middle|UPPER_TOTAL: $total_num_upper<br>\n";

$mysql_handler->Deinit();
?>

<!/center>
</body>
</html>

