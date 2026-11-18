<?php
if (PHP_SAPI !== 'cli' || getenv('LWT_ENABLE_LEGACY_EXPERIMENTS') !== '1') {
    if (PHP_SAPI !== 'cli') {
        http_response_code(404);
    }
    exit;
}
/*  
  http://localhost/Quantum_Connection/Utils/3060_Import_Jackpot_Data.php

BEFORE RUNNING 3060 IMPORT: RUN THIS:

DROP TABLE IF EXISTS `jackpot`;

CREATE TABLE `jackpot` 
(
  `id` int(20) NOT NULL auto_increment,
  `occurrence` int(20) default '0',
  `state` VARBINARY(1) default '1',
  `number_combination` varchar(30) default NULL,
  `prime_num_value` int(20) default '0',
  `odd_num_value` int(20) default '0',
  `even_num_value` int(20) default '0',
  PRIMARY KEY (`id`),
  UNIQUE KEY `number_combination_unique_idx` (`number_combination`(30)),
  KEY `number_combination_idx` (`number_combination`),
  KEY `occurrence_idx` (`occurrence`),
  KEY `state_idx` (`state`),
  KEY `prime_num_value_idx` (`prime_num_value`),
  KEY `odd_num_value_idx` (`odd_num_value`),
  KEY `even_num_value_idx` (`even_num_value`)
) ENGINE=MyISAM DEFAULT CHARSET=utf8;


  BEFORE RUNNING: SQL: DELETE FROM jackpot;

  ____QUERY_WITH_THESE:
  SELECT number_combination FROM jackpot ORDER BY occurrence DESC INTO OUTFILE '2023-11-15_jackpot_normal_numbers_all_2_million.txt';
  SELECT occurrence, number_combination FROM jackpot ORDER BY occurrence DESC INTO OUTFILE '2023-11-15_WITH_OCCURRENCES_jackpot_normal_numbers_all_2_million.txt';


  SELECT occurrence, number_combination FROM jackpot ORDER BY occurrence DESC LIMIT 1000 INTO OUTFILE 'run2_top_1000.txt';
*/

include_once("../../Config/config.php");
include_once("../../Include/mysql_handler.php");

function Get_Min_Max($file)
{
    $line_count = 0;
    $fp = fopen($file, "rt");
    while(($buffer = fgets($fp, 4096)) !== false)
    {
        $data_str = trim($buffer);
        $data_str = explode("check_jackpot():: ", $data_str);
        $data_str = $data_str[1];

        $number_combination_occurrence = explode("{", $data_str);
        $number_combination = trim($number_combination_occurrence[0]);
        $number_combination_occurrence = str_replace("}", "", $number_combination_occurrence[1]);
        $number_combination_occurrence = intval($number_combination_occurrence);
        if($number_combination_occurrence > 0)
            $min_max_list[] = $number_combination_occurrence;

        $line_count++;
    }
    fclose($fp);

    $min_value = min($min_max_list);
    $max_value = max($min_max_list);
    
    return "$min_value|$max_value|$line_count";
}


function Test_Files()
{
    /*
    // SINGULAR CHECK/VALIDATION
    $filepath = "F:/Deep_Learning_Local/QUANTUM_AI_INIT/eurojackpot_data/further_simulation_data/42";
    $filename = "further_simulation_1_END_RESULT_1.txt";

    if(file_exists("$filepath/$filename"))
    {
        echo "  TEST: FILE $filepath/$filename OK!\n";
        $min_max_value = Get_Min_Max("$filepath/$filename");
        $tmp = explode("|", $min_max_value);
        $min_value = $tmp[0];
        $max_value = $tmp[1];
        $line_count = $tmp[2];
        echo "    MIN: $min_value | MAX $max_value\n";
        echo "    LINE_COUNT: $line_count\n";
    }
    */

    $line_count_total = 0;
    for($i=1; $i<=143; $i++)
    {
        echo "Processing $i/143... \n";
        for($j=1; $j<=5; $j++)
        {
            $line_count = 0;
            $min_value = 0;
            $max_value = 0;
            $filepath = "F:/Deep_Learning_Local/QUANTUM_AI_INIT/eurojackpot_data/further_simulation_data/$i";
            $filename = "further_simulation_1_END_RESULT_$j.txt";

            if(file_exists("$filepath/$filename"))
            {
                echo "  TEST: FILE $filepath/$filename OK!\n";
                $min_max_value = Get_Min_Max("$filepath/$filename");
                $tmp = explode("|", $min_max_value);
                $min_value = $tmp[0];
                $max_value = $tmp[1];
                $line_count = $tmp[2];
                if($j==1) $line_count_total += $line_count;
                echo "    MIN: $min_value | MAX $max_value | LINE_COUNT: $line_count\n";
            }
            else
            {
                echo "  $j NOT FOUND!\n";
            }
        }
        echo "OK!\n";
    }
    echo "LINE_COUNT_TOTAL: $line_count_total\n";
}


$counter_add_value_total = 0;
$counter_update_value_total = 0;

function Check_Odd_Num_Count($number_combination)
{
  $odd_num_value = 0;
  $number_combination_parts = explode(", ", $number_combination);
  $number_combination_part_1 = $number_combination_parts[0];
  $number_combination_part_2 = $number_combination_parts[1];
  $number_combination_part_3 = $number_combination_parts[2];
  $number_combination_part_4 = $number_combination_parts[3];
  $number_combination_part_5 = $number_combination_parts[4];

  if(intval($number_combination_part_1) % 2 == 1)
  {
    $odd_num_value++;
  }

  if(intval($number_combination_part_2) % 2 == 1)
  {
    $odd_num_value++;
  }

  if(intval($number_combination_part_3) % 2 == 1)
  {
    $odd_num_value++;
  }

  if(intval($number_combination_part_4) % 2 == 1)
  {
    $odd_num_value++;
  }

  if(intval($number_combination_part_5) % 2 == 1)
  {
    $odd_num_value++;
  }

  return $odd_num_value;
}

function Check_Even_Num_Count($number_combination)
{
  $even_num_value = 0;
  $number_combination_parts = explode(", ", $number_combination);
  $number_combination_part_1 = $number_combination_parts[0];
  $number_combination_part_2 = $number_combination_parts[1];
  $number_combination_part_3 = $number_combination_parts[2];
  $number_combination_part_4 = $number_combination_parts[3];
  $number_combination_part_5 = $number_combination_parts[4];

  if(intval($number_combination_part_1) % 2 == 0)
  {
    $even_num_value++;
  }

  if(intval($number_combination_part_2) % 2 == 0)
  {
    $even_num_value++;
  }

  if(intval($number_combination_part_3) % 2 == 0)
  {
    $even_num_value++;
  }

  if(intval($number_combination_part_4) % 2 == 0)
  {
    $even_num_value++;
  }

  if(intval($number_combination_part_5) % 2 == 0)
  {
    $even_num_value++;
  }

  return $even_num_value;
}

function Check_Prime_Num_Count($number_combination)
{
  $prime_num_value = 0;
  $number_combination_parts = explode(", ", $number_combination);
  $number_combination_part_1 = $number_combination_parts[0];
  $number_combination_part_2 = $number_combination_parts[1];
  $number_combination_part_3 = $number_combination_parts[2];
  $number_combination_part_4 = $number_combination_parts[3];
  $number_combination_part_5 = $number_combination_parts[4];

  if(intval($number_combination_part_1) == 2  || intval($number_combination_part_1) == 3  ||
     intval($number_combination_part_1) == 5  || intval($number_combination_part_1) == 7  ||
     intval($number_combination_part_1) == 11 || intval($number_combination_part_1) == 13 ||
     intval($number_combination_part_1) == 17 || intval($number_combination_part_1) == 19 ||
     intval($number_combination_part_1) == 23 || intval($number_combination_part_1) == 29 ||
     intval($number_combination_part_1) == 31 || intval($number_combination_part_1) == 37 ||
     intval($number_combination_part_1) == 41 || intval($number_combination_part_1) == 43 ||
     intval($number_combination_part_1) == 47)
  {
    $prime_num_value++;
  }

  if(intval($number_combination_part_2) == 2  || intval($number_combination_part_2) == 3  ||
     intval($number_combination_part_2) == 5  || intval($number_combination_part_2) == 7  ||
     intval($number_combination_part_2) == 11 || intval($number_combination_part_2) == 13 ||
     intval($number_combination_part_2) == 17 || intval($number_combination_part_2) == 19 ||
     intval($number_combination_part_2) == 23 || intval($number_combination_part_2) == 29 ||
     intval($number_combination_part_2) == 31 || intval($number_combination_part_2) == 37 ||
     intval($number_combination_part_2) == 41 || intval($number_combination_part_2) == 43 ||
     intval($number_combination_part_2) == 47)
  {
    $prime_num_value++;
  }

  if(intval($number_combination_part_3) == 2  || intval($number_combination_part_3) == 3  ||
     intval($number_combination_part_3) == 5  || intval($number_combination_part_3) == 7  ||
     intval($number_combination_part_3) == 11 || intval($number_combination_part_3) == 13 ||
     intval($number_combination_part_3) == 17 || intval($number_combination_part_3) == 19 ||
     intval($number_combination_part_3) == 23 || intval($number_combination_part_3) == 29 ||
     intval($number_combination_part_3) == 31 || intval($number_combination_part_3) == 37 ||
     intval($number_combination_part_3) == 41 || intval($number_combination_part_3) == 43 ||
     intval($number_combination_part_3) == 47)
  {
    $prime_num_value++;
  }

  if(intval($number_combination_part_4) == 2  || intval($number_combination_part_4) == 3  ||
     intval($number_combination_part_4) == 5  || intval($number_combination_part_4) == 7  ||
     intval($number_combination_part_4) == 11 || intval($number_combination_part_4) == 13 ||
     intval($number_combination_part_4) == 17 || intval($number_combination_part_4) == 19 ||
     intval($number_combination_part_4) == 23 || intval($number_combination_part_4) == 29 ||
     intval($number_combination_part_4) == 31 || intval($number_combination_part_4) == 37 ||
     intval($number_combination_part_4) == 41 || intval($number_combination_part_4) == 43 ||
     intval($number_combination_part_4) == 47)
  {
    $prime_num_value++;
  }

  if(intval($number_combination_part_5) == 2  || intval($number_combination_part_5) == 3  ||
     intval($number_combination_part_5) == 5  || intval($number_combination_part_5) == 7  ||
     intval($number_combination_part_5) == 11 || intval($number_combination_part_5) == 13 ||
     intval($number_combination_part_5) == 17 || intval($number_combination_part_5) == 19 ||
     intval($number_combination_part_5) == 23 || intval($number_combination_part_5) == 29 ||
     intval($number_combination_part_5) == 31 || intval($number_combination_part_5) == 37 ||
     intval($number_combination_part_5) == 41 || intval($number_combination_part_5) == 43 ||
     intval($number_combination_part_5) == 47)
  {
    $prime_num_value++;
  }

  return $prime_num_value;
}

function Input_Jackpot_Data($filepath, $filename)
{
    global $counter_add_value_total;
    global $counter_update_value_total;
    $counter_add_value = 0;
    $counter_update_value = 0;
    //$filename = "lottery__statistics_". $file_number. ".txt";
    $number_combination_filename = $filepath. "/". $filename;
    print("number_combination_filename = $number_combination_filename\n");

    print("Importing...");
    if(file_exists($number_combination_filename))
    {
        $fp = fopen($number_combination_filename, "rt");
        //foreach(file($number_combination_filename) as $line)
        while(($buffer = fgets($fp, 4096)) !== false)
        {
            // USE THIS WHEN LOADING RAW NUMBERS (1, 34, 88 ...)
/*
            $data_str = trim($buffer);
            $number_combination = $data_str;
            $number_combination_occurrence = 1;
*/
            //----------------------------------

/**/
            $data_str = trim($buffer);
            $data_str = explode("check_jackpot():: ", $data_str);
            $data_str = $data_str[1];
            $number_combination_occurrence = explode("{", $data_str);
            $number_combination = trim($number_combination_occurrence[0]);
            $number_combination_occurrence = str_replace("}", "", $number_combination_occurrence[1]);
            //print("number_combination = $number_combination\n");
            //print("number_combination_occurrence = $number_combination_occurrence\n");
/**/

            $prime_num_value = Check_Prime_Num_Count($number_combination);
            $odd_num_value = Check_Odd_Num_Count($number_combination);
            $even_num_value = Check_Even_Num_Count($number_combination);

            $query = "SELECT id AS number_combination_id FROM jackpot WHERE number_combination='$number_combination'";
            //print("query=$query\n");
            $result = mysql_query("$query");

            if(mysql_num_rows($result) == 0)
            {
                $query = "INSERT INTO jackpot
                         (
                            number_combination,
                            occurrence,
                            prime_num_value,
                            odd_num_value,
                            even_num_value
                         )
                         VALUES
                         (
                            '$number_combination',
                            '$number_combination_occurrence',
                            '$prime_num_value',
                            '$odd_num_value',
                            '$even_num_value'
                         )";

                //print("query=$query\n");
                mysql_query($query);
                $counter_add_value += 1;
            }
            else
            {
                $counter_update_value += 1;
                $data = mysql_fetch_object($result);
                $query = "UPDATE jackpot SET occurrence = occurrence + $number_combination_occurrence WHERE id='$data->number_combination_id'";
                $result = mysql_query($query);
                //print("$query\n");
            }
        }
        fclose($fp);
    }
    print("OK!\n");
    print("counter_add_value=$counter_add_value\n");
    print("counter_update_value=$counter_update_value\n");

    $counter_add_value_total += $counter_add_value;
    $counter_update_value_total += $counter_update_value;
}

$mysql_handler = new Mysql_Handler;
$mysql_handler->Init();

//print("Deleting old data...");
//$result = mysql_query("DELETE FROM jackpot");
//print("OK!\n");


// NORMAL_NUMBERS_2_MILLION
for($i=0; $i<=45; $i++)
{
    print("Processing $i/45... ");
    $filepath = "F:/Deep_Learning_Local/QUANTUM_AI_INIT/eurojackpot_data";
    $filename = "jackpot_normal_numbers_2_million_statistics_". $i. "_UNIQUE.txt";
    Input_Jackpot_Data($filepath, $filename);
    print("OK!\n");
}


/*
for($i=1; $i<=143; $i++)
{
    echo "Processing $i/143... \n";
    for($j=1; $j<=5; $j++)
    {
        $filepath = "F:/Deep_Learning_Local/QUANTUM_AI_INIT/eurojackpot_data/further_simulation_data/$i";
        $filename = "further_simulation_1_END_RESULT_$j.txt";

        if(file_exists("$filepath/$filename"))
        {
            echo "  Processing $j/5...";
            Input_Jackpot_Data($filepath, $filename);
            echo "OK!\n";
        }
        else
        {
            echo "  $j NOT FOUND!\n";
        }
    }
    echo "OK!\n";
}
*/

//Test_Files();


$total_value_items = $counter_add_value_total + $counter_update_value_total;
print("VALUES ADDED: $counter_add_value_total\n");
print("VALUES UPDATED: $counter_update_value_total\n");
print("TOTAL VALUE ITEMS: $total_value_items\n"); 

$mysql_handler->Deinit();

?>


