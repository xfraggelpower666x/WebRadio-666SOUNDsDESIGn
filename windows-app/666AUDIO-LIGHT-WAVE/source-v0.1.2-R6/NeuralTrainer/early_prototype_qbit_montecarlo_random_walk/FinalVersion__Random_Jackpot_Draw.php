<?php
if (PHP_SAPI !== 'cli' || getenv('LWT_ENABLE_LEGACY_EXPERIMENTS') !== '1') {
    if (PHP_SAPI !== 'cli') {
        http_response_code(404);
    }
    exit;
}

// http://localhost/Quantum_Connection/Utils/jackpot_lottery/Random_Jackpot_Draw.php

include_once("../../Config/config.php");
include_once("../../Include/mysql_handler.php");

//____!!!___USE__Draw_Simulation.php to Init:
//____!!!_____Transfer_Occurrences();
//____!!!_____Import_Draw_Cycle_Median_Numbers();

function Test_Matches($iteration_number, $match_median_value, $adjusted_threshold)
{
    echo "NOT ENOUGH MATCHES (#$iteration_number): WIDENING PARAMETERS... ";

    $match_median_floor   = $match_median_value - $adjusted_threshold;
    $match_median_ceiling = $match_median_value + $adjusted_threshold;

    $query = "SELECT 
                COUNT(*) AS num_matches 
              FROM tmp_calc_prediction 
              WHERE position_value > $match_median_floor
                AND position_value < $match_median_ceiling";

    $result = mysql_query($query);
    $data = mysql_fetch_object($result);

    echo "DEBUG: num_matches = $data->num_matches<br>\n";
    return $data->num_matches;
}

function Calc_Prediction_Percentage_Value($value_1, $value_2)
{
    if($value_1 && $value_2)
    {
        if($value_1 < $value_2)
        {
            $percentage = $value_1 / $value_2;
        }
        else
        {
            $percentage = $value_2 / $value_1;
        }
    }

    return $percentage;
}

function Print_Form()
{
    ?>
    <form action="Random_Jackpot_Draw.php" method="post">
      <input type="hidden" form_sent="1" name="form_sent" value="1">
      <label for="date-select">CHOOSE A DATE:</label>
      <select name="date" id="date-select">
        <option value="">--Please choose an option--</option>
        <?
            date_default_timezone_set('Europe/Helsinki');
            $current_year = date('Y');
            $current_month = date('m');
            //$current_month = 11;

            $next_year = $current_year;
            $next_month = $current_month+1;

            if($next_month >= 1 && $next_month <= 9)
            {
                $next_month = "0". $next_month;
            }

            if($next_month > 12)
            {
               $next_month = "01";
               $next_year = $current_year+1;
            }

            $query = "SELECT 
                        date 
                      FROM jackpot_dates 
                      WHERE date LIKE '$current_year-$current_month%'";
            echo "query = $query<br>\n";

            $result = mysql_query($query);
            while($data = mysql_fetch_object($result))
            {
               echo "<option value=\"$data->date\">$data->date</option>\n";
            }

            $query = "SELECT 
                        date 
                      FROM jackpot_dates 
                      WHERE date LIKE '$next_year-$next_month%'";
            echo "query = $query<br>\n";

            $result = mysql_query($query);
            while($data = mysql_fetch_object($result))
            {
               echo "<option value=\"$data->date\">$data->date</option>\n";
            }
        ?>
      </select><br>
      <button type="submit"><b style='font: 40px Philosopher; color: #AA44EE;'> >>> DRAW <<< </b></button>
    </form>
    <br><br><br><br><br><br>
    <?
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

function Save_Unique_End_Result()
{
    //Init_Final_Result_Unique_DB();

    //for($i=1; $i<=104; $i++)
    for($i=1; $i<=10000000; $i++)
    {

        $random_index = mt_rand(1, 104);

        $query = "SELECT DISTINCT
                    id,
                    date_str,
                    number_combination, 
                    number_combination_orig,
                    extra_number_1, 
                    extra_number_2, 
                    position_value, 
                    prediction_value, 
                    prediction_percentage,
                    cycle_number_final,
                    cycle_number_orig
                  FROM jackpot_end_result
                  WHERE state='1'
                    AND cycle_number_orig='$random_index'
                    AND prediction_percentage >= 95.00
                    AND prediction_percentage <= 99.99
                  ORDER BY 
                    prediction_percentage DESC, 
                    prediction_value DESC
                  LIMIT 100";

        echo "query = $query<br>\n";

        $result = mysql_query($query);

        $num_candidates = mysql_num_rows($result);
        echo "DEBUG: num_candidates: $num_candidates<br>\n";

        while($data = mysql_fetch_object($result))
        {
            $query2 = "INSERT INTO jackpot_end_result_unique        
                       (
                           date_str,
                           cycle_number_orig,
                           cycle_number_final,
                           number_combination,
                           number_combination_orig,
                           extra_number_1,
                           extra_number_2,
                           position_value,
                           prediction_value,
                           prediction_percentage
                       )
                       VALUES
                       (
                           '$data->date_str',
                           '$data->cycle_number_orig',
                           '$data->cycle_number_final',
                           '$data->number_combination',
                           '$data->number_combination_orig',
                           '$data->extra_number_1',
                           '$data->extra_number_2',
                           '$data->position_value',
                           '$data->prediction_value',
                           '$data->prediction_percentage'
                       )";
            $result2 = mysql_query($query2);

            $query2 = "UPDATE jackpot_end_result SET state='0' WHERE id='$data->id'";
            $result2 = mysql_query($query2);
            echo "query2 = $query2\n";
        } 
    }    
}

function Random_Jackpot_Draw_4($date_str)
{
    $query = "SELECT DISTINCT
                number_combination, 
                extra_number_1, 
                extra_number_2, 
                position_value, 
                prediction_value, 
                prediction_percentage,
                cycle_number_final
              FROM jackpot_end_result_unique
              WHERE date_str='$date_str'
                AND prediction_percentage >= 95.00
                AND prediction_percentage <= 99.99
              ORDER BY 
                prediction_percentage DESC, 
                prediction_value DESC";

    echo "query = $query<br>\n";

    $result = mysql_query($query);

    while($data = mysql_fetch_object($result))
    {
        $candidates_number_combination[]    = $data->number_combination;
        $candidates_extra_number_1[]        = $data->extra_number_1;
        $candidates_extra_number_2[]        = $data->extra_number_2;
        $candidates_position_value[]        = $data->position_value;
        $candidates_prediction_value[]      = $data->prediction_value;
        $candidates_prediction_percentage[] = $data->prediction_percentage;
        $candidates_cycle_number_final[]    = $data->cycle_number_final;
    }

    $num_candidates = count($candidates_number_combination)-1;
    echo "DEBUG: num_candidates: $num_candidates<br>\n";

    $unique_candidates = array_unique($candidates_number_combination);
    $unique_num_candidates = count($unique_candidates)-1;
    echo "DEBUG: unique_num_candidates: $unique_num_candidates<br>\n";

    $prediction_value_min = min($candidates_prediction_value);
    $prediction_value_max = max($candidates_prediction_value);

    $prediction_percentage_min = min($candidates_prediction_percentage);
    $prediction_percentage_max = max($candidates_prediction_percentage);

    if($num_candidates > 0)
    {
        $random_index = mt_rand(0, $num_candidates);
        echo "DEBUG: random_index: $random_index<br>\n";

        $number_combination      = $candidates_number_combination[$random_index];
        $extra_number_1          = $candidates_extra_number_1[$random_index];
        $extra_number_2          = $candidates_extra_number_2[$random_index];
        $position_value          = $candidates_position_value[$random_index];
        $prediction_value        = $candidates_prediction_value[$random_index];
        $prediction_percentage   = $candidates_prediction_percentage[$random_index];
        $cycle_number_final      = $candidates_cycle_number_final[$random_index];

        $query = "SELECT 
                    median_number, 
                    threshold_number 
                  FROM jackpot_draw_cycle_median_numbers 
                  WHERE id='$cycle_number_final'";

        $result = mysql_query($query);
        $data = mysql_fetch_object($result);

        $draw_cycle_median_value    = $data->median_number;
        $draw_cycle_threshold_value = $data->threshold_number;

        $threshold_floor   = intval($draw_cycle_median_value - $draw_cycle_threshold_value);
        $threshold_ceiling = intval($draw_cycle_median_value + $draw_cycle_threshold_value);

        echo "<br>\n$prediction_percentage_min % << $prediction_percentage % >> $prediction_percentage_max % | $prediction_value_min << $prediction_value >> $prediction_value_max ||| ($cycle_number_final) ::: POSITION: $threshold_floor << $position_value >> $threshold_ceiling<br>\n";

        $tmp_str = explode(",", $number_combination);
        $number_1 = trim($tmp_str[0]);
        $number_2 = trim($tmp_str[1]);
        $number_3 = trim($tmp_str[2]);
        $number_4 = trim($tmp_str[3]);
        $number_5 = trim($tmp_str[4]);

        $extra_number_1 = $extra_number_1;
        $extra_number_2 = $extra_number_2;

        echo "<b style='font: 40px Philosopher; color: #FFADAD;'>$number_1</b><b style='font: 40px Arial; color: #FFFFFF;'>, </b>";
        echo "<b style='font: 40px Philosopher; color: #FFD6A5;'>$number_2</b><b style='font: 40px Arial; #FFFFFF;'>, </b>";
        echo "<b style='font: 40px Philosopher; color: #FDFFB6;'>$number_3</b><b style='font: 40px Arial; #FFFFFF;'>, </b>";
        echo "<b style='font: 40px Philosopher; color: #CAFFBF;'>$number_4</b><b style='font: 40px Arial; #FFFFFF;'>, </b>";
        echo "<b style='font: 40px Philosopher; color: #9BF6FF;'>$number_5</b><b style='font: 40px Arial; #FFFFFF;'> + </b>";

        if((int)$extra_number_1 > (int)$extra_number_2) 
        {
            $tmp_number = $extra_number_1;
            $extra_number_1 = $extra_number_2;
            $extra_number_2 = $tmp_number;
            echo "<b style='font: 40px Philosopher; color: #A0C4FF;'>$extra_number_1</b><b style='font: 40px Arial; #FFFFFF;'>, </b>";
            echo "<b style='font: 40px Philosopher; color: #BDB2FF;'>$extra_number_2</b><br>\n";
        }
        else
        {
            echo "<b style='font: 40px Philosopher; color: #A0C4FF;'>$extra_number_1</b><b style='font: 40px Arial; #FFFFFF;'>, </b>";
            echo "<b style='font: 40px Philosopher; color: #BDB2FF;'>$extra_number_2</b><br>\n";
        }
    }
}


function Random_Jackpot_Draw_3($date_str)
{
    $query = "SELECT 
                cycle_number 
              FROM jackpot_dates 
              WHERE date='$date_str'";
    echo "query = $query<br>\n";

    $result = mysql_query($query);
    $data = mysql_fetch_object($result);

    $query = "SELECT DISTINCT
                number_combination, 
                extra_number_1, 
                extra_number_2, 
                position_value, 
                prediction_value, 
                prediction_percentage,
                cycle_number_final
              FROM jackpot_end_result_unique
              WHERE cycle_number_final='$data->cycle_number'
                AND prediction_percentage >= 95.00
                AND prediction_percentage <= 99.99
              ORDER BY 
                prediction_percentage DESC, 
                prediction_value DESC";

    echo "query = $query<br>\n";

    $result = mysql_query($query);

    while($data = mysql_fetch_object($result))
    {
        $candidates_number_combination[]    = $data->number_combination;
        $candidates_extra_number_1[]        = $data->extra_number_1;
        $candidates_extra_number_2[]        = $data->extra_number_2;
        $candidates_position_value[]        = $data->position_value;
        $candidates_prediction_value[]      = $data->prediction_value;
        $candidates_prediction_percentage[] = $data->prediction_percentage;
        $candidates_cycle_number_final[]    = $data->cycle_number_final;
    }

    $num_candidates = count($candidates_number_combination)-1;
    echo "DEBUG: num_candidates: $num_candidates<br>\n";

    $unique_candidates = array_unique($candidates_number_combination);
    $unique_num_candidates = count($unique_candidates)-1;
    echo "DEBUG: unique_num_candidates: $unique_num_candidates<br>\n";

    $prediction_value_min = min($candidates_prediction_value);
    $prediction_value_max = max($candidates_prediction_value);

    $prediction_percentage_min = min($candidates_prediction_percentage);
    $prediction_percentage_max = max($candidates_prediction_percentage);

    if($num_candidates > 0)
    {
        $random_index = mt_rand(0, $num_candidates);
        echo "DEBUG: random_index: $random_index<br>\n";

        $number_combination      = $candidates_number_combination[$random_index];
        $extra_number_1          = $candidates_extra_number_1[$random_index];
        $extra_number_2          = $candidates_extra_number_2[$random_index];
        $position_value          = $candidates_position_value[$random_index];
        $prediction_value        = $candidates_prediction_value[$random_index];
        $prediction_percentage   = $candidates_prediction_percentage[$random_index];
        $cycle_number_final      = $candidates_cycle_number_final[$random_index];

        $query = "SELECT 
                    median_number, 
                    threshold_number 
                  FROM jackpot_draw_cycle_median_numbers 
                  WHERE id='$cycle_number_final'";

        $result = mysql_query($query);
        $data = mysql_fetch_object($result);

        $draw_cycle_median_value    = $data->median_number;
        $draw_cycle_threshold_value = $data->threshold_number;

        $threshold_floor   = intval($draw_cycle_median_value - $draw_cycle_threshold_value);
        $threshold_ceiling = intval($draw_cycle_median_value + $draw_cycle_threshold_value);

        echo "<br>\n$prediction_percentage_min % << $prediction_percentage % >> $prediction_percentage_max % | $prediction_value_min << $prediction_value >> $prediction_value_max ||| ($cycle_number_final) ::: POSITION: $threshold_floor << $position_value >> $threshold_ceiling<br>\n";

        $tmp_str = explode(",", $number_combination);
        $number_1 = trim($tmp_str[0]);
        $number_2 = trim($tmp_str[1]);
        $number_3 = trim($tmp_str[2]);
        $number_4 = trim($tmp_str[3]);
        $number_5 = trim($tmp_str[4]);

        $extra_number_1 = $extra_number_1;
        $extra_number_2 = $extra_number_2;

        echo "<b style='font: 40px Philosopher; color: #FFADAD;'>$number_1</b><b style='font: 40px Arial; color: #FFFFFF;'>, </b>";
        echo "<b style='font: 40px Philosopher; color: #FFD6A5;'>$number_2</b><b style='font: 40px Arial; #FFFFFF;'>, </b>";
        echo "<b style='font: 40px Philosopher; color: #FDFFB6;'>$number_3</b><b style='font: 40px Arial; #FFFFFF;'>, </b>";
        echo "<b style='font: 40px Philosopher; color: #CAFFBF;'>$number_4</b><b style='font: 40px Arial; #FFFFFF;'>, </b>";
        echo "<b style='font: 40px Philosopher; color: #9BF6FF;'>$number_5</b><b style='font: 40px Arial; #FFFFFF;'> + </b>";

        if((int)$extra_number_1 > (int)$extra_number_2) 
        {
            $tmp_number = $extra_number_1;
            $extra_number_1 = $extra_number_2;
            $extra_number_2 = $tmp_number;
            echo "<b style='font: 40px Philosopher; color: #A0C4FF;'>$extra_number_1</b><b style='font: 40px Arial; #FFFFFF;'>, </b>";
            echo "<b style='font: 40px Philosopher; color: #BDB2FF;'>$extra_number_2</b><br>\n";
        }
        else
        {
            echo "<b style='font: 40px Philosopher; color: #A0C4FF;'>$extra_number_1</b><b style='font: 40px Arial; #FFFFFF;'>, </b>";
            echo "<b style='font: 40px Philosopher; color: #BDB2FF;'>$extra_number_2</b><br>\n";
        }
    }
}

function Random_Jackpot_Draw_2($date_str)
{
    //__WORK_IN_PROGRESS__ 2023-11-27
    // CODE: WHEN ALL PAST CYCLES (2012-2023) ARE DONE (jackpot_end_result)
    //   * IT TAKES 24 HOURS TO RUN A FULL CYCLE OF 100 CANDIDATES
    //   * 11 DAYS FOR FULL CYCLE >> CONTINUE AS MANY TIMES AS NEEDED
    // AFTER THAT:
    //   FIND OUT THE BEST MATCHES OR RANGE(%) CANDIDATES
    //   FROM WHICH RANDOMLY SELECT(DRAW) PREDICTED NUMBERS

/*

SELECT date_str, cycle_number_orig, cycle_number_final, number_combination, extra_number_1, extra_number_2, position_value, prediction_value, prediction_percentage FROM jackpot_end_result WHERE cycle_number_orig='$data->cycle_number' ORDER BY prediction_percentage DESC, prediction_value DESC LIMIT 10

____

SELECT  
    number_combination, 
    extra_number_1, 
    extra_number_2, 
    position_value, 
    prediction_value, 
    prediction_percentage,
    cycle_number_final
FROM jackpot_end_result
WHERE cycle_number_orig='$data->cycle_number'
    AND prediction_percentage >= (
        SELECT MIN(prediction_percentage) * 1.15
        FROM jackpot_end_result
        WHERE cycle_number_orig='$data->cycle_number'
    )
    AND prediction_percentage <= (
        SELECT MAX(prediction_percentage)
        FROM jackpot_end_result
        WHERE cycle_number_orig='$data->cycle_number'
    )
ORDER BY 
    prediction_percentage DESC, 
    prediction_value DESC;
____
*/

    $query = "SELECT 
                cycle_number 
              FROM jackpot_dates 
              WHERE date='$date_str'";
    echo "query = $query<br>\n";

    $result = mysql_query($query);
    $data = mysql_fetch_object($result);

    // ADD THESE IF NEED BE date_str, cycle_number_orig
/*
    $query = "SELECT  
                number_combination, 
                extra_number_1, 
                extra_number_2, 
                position_value, 
                prediction_value, 
                prediction_percentage,
                cycle_number_final
              FROM jackpot_end_result
              WHERE cycle_number_orig='$data->cycle_number'
                AND prediction_percentage >= (
                  SELECT AVG(prediction_percentage)
                  FROM jackpot_end_result
                  WHERE cycle_number_orig='$data->cycle_number'
                )
                AND prediction_percentage <= 99.99
              ORDER BY 
                prediction_percentage DESC, 
                prediction_value DESC";
*/

/*
    $query = "SELECT DISTINCT
                number_combination, 
                extra_number_1, 
                extra_number_2, 
                position_value, 
                prediction_value, 
                prediction_percentage,
                cycle_number_final
              FROM jackpot_end_result
              WHERE cycle_number_orig='$data->cycle_number'
                AND prediction_percentage >= 95.00
                AND prediction_percentage <= 99.99
              ORDER BY 
                prediction_percentage DESC, 
                prediction_value DESC";
*/

/* //OLD VERSION FROM REGULAR jackpot_end_result
    $query = "SELECT DISTINCT
                number_combination, 
                extra_number_1, 
                extra_number_2, 
                position_value, 
                prediction_value, 
                prediction_percentage,
                cycle_number_final,
                (
                  SELECT 
                    AVG(prediction_value) 
                  FROM jackpot_end_result 
                  WHERE prediction_percentage >= 95.00 
                    AND prediction_percentage <= 99.99
                ) AS avg_prediction_value
              FROM jackpot_end_result
              WHERE cycle_number_orig='$data->cycle_number'
                AND prediction_percentage >= 95.00
                AND prediction_percentage <= 99.99
                HAVING prediction_value > avg_prediction_value
              ORDER BY 
                prediction_percentage DESC, 
                prediction_value DESC";
*/

// NEW VERSION FROM jackpot_end_result_unique
    $query = "SELECT DISTINCT
                number_combination, 
                extra_number_1, 
                extra_number_2, 
                position_value, 
                prediction_value, 
                prediction_percentage,
                cycle_number_final
              FROM jackpot_end_result_unique
              WHERE cycle_number_orig='$data->cycle_number'
                AND prediction_percentage >= 95.00
                AND prediction_percentage <= 99.99
              ORDER BY 
                prediction_percentage DESC, 
                prediction_value DESC";

/*
// NEW VERSION FROM jackpot_end_result_unique
    $query = "SELECT DISTINCT
                number_combination, 
                extra_number_1, 
                extra_number_2, 
                position_value, 
                prediction_value, 
                prediction_percentage,
                cycle_number_final,
                (
                  SELECT 
                    AVG(prediction_value) 
                  FROM jackpot_end_result_unique 
                  WHERE prediction_percentage >= 95.00 
                    AND prediction_percentage <= 99.99
                ) AS avg_prediction_value
              FROM jackpot_end_result_unique
              WHERE cycle_number_orig='$data->cycle_number'
                AND prediction_percentage >= 95.00
                AND prediction_percentage <= 99.99
                HAVING prediction_value > avg_prediction_value
              ORDER BY 
                prediction_percentage DESC, 
                prediction_value DESC";
*/

    echo "query = $query<br>\n";

    $result = mysql_query($query);

    while($data = mysql_fetch_object($result))
    {
        $candidates_number_combination[]    = $data->number_combination;
        $candidates_extra_number_1[]        = $data->extra_number_1;
        $candidates_extra_number_2[]        = $data->extra_number_2;
        $candidates_position_value[]        = $data->position_value;
        $candidates_prediction_value[]      = $data->prediction_value;
        $candidates_prediction_percentage[] = $data->prediction_percentage;
        $candidates_cycle_number_final[]    = $data->cycle_number_final;
    }

    $num_candidates = count($candidates_number_combination)-1;
    echo "DEBUG: num_candidates: $num_candidates<br>\n";

    $unique_candidates = array_unique($candidates_number_combination);
    $unique_num_candidates = count($unique_candidates)-1;
    echo "DEBUG: unique_num_candidates: $unique_num_candidates<br>\n";

    $prediction_value_min = min($candidates_prediction_value);
    $prediction_value_max = max($candidates_prediction_value);

    $prediction_percentage_min = min($candidates_prediction_percentage);
    $prediction_percentage_max = max($candidates_prediction_percentage);

    if($num_candidates > 0)
    {
        $random_index = mt_rand(0, $num_candidates);
        echo "DEBUG: random_index: $random_index<br>\n";

        $number_combination      = $candidates_number_combination[$random_index];
        $extra_number_1          = $candidates_extra_number_1[$random_index];
        $extra_number_2          = $candidates_extra_number_2[$random_index];
        $position_value          = $candidates_position_value[$random_index];
        $prediction_value        = $candidates_prediction_value[$random_index];
        $prediction_percentage   = $candidates_prediction_percentage[$random_index];
        $cycle_number_final      = $candidates_cycle_number_final[$random_index];

        $query = "SELECT 
                    median_number, 
                    threshold_number 
                  FROM jackpot_draw_cycle_median_numbers 
                  WHERE id='$cycle_number_final'";

        $result = mysql_query($query);
        $data = mysql_fetch_object($result);

        $draw_cycle_median_value    = $data->median_number;
        $draw_cycle_threshold_value = $data->threshold_number;

        $threshold_floor   = intval($draw_cycle_median_value - $draw_cycle_threshold_value);
        $threshold_ceiling = intval($draw_cycle_median_value + $draw_cycle_threshold_value);

        echo "<br>\n$prediction_percentage_min % << $prediction_percentage % >> $prediction_percentage_max % | $prediction_value_min << $prediction_value >> $prediction_value_max ||| ($cycle_number_final) ::: POSITION: $threshold_floor << $position_value >> $threshold_ceiling<br>\n";

        $tmp_str = explode(",", $number_combination);
        $number_1 = trim($tmp_str[0]);
        $number_2 = trim($tmp_str[1]);
        $number_3 = trim($tmp_str[2]);
        $number_4 = trim($tmp_str[3]);
        $number_5 = trim($tmp_str[4]);

        $extra_number_1 = $extra_number_1;
        $extra_number_2 = $extra_number_2;

        echo "<b style='font: 40px Philosopher; color: #FFADAD;'>$number_1</b><b style='font: 40px Arial; color: #FFFFFF;'>, </b>";
        echo "<b style='font: 40px Philosopher; color: #FFD6A5;'>$number_2</b><b style='font: 40px Arial; #FFFFFF;'>, </b>";
        echo "<b style='font: 40px Philosopher; color: #FDFFB6;'>$number_3</b><b style='font: 40px Arial; #FFFFFF;'>, </b>";
        echo "<b style='font: 40px Philosopher; color: #CAFFBF;'>$number_4</b><b style='font: 40px Arial; #FFFFFF;'>, </b>";
        echo "<b style='font: 40px Philosopher; color: #9BF6FF;'>$number_5</b><b style='font: 40px Arial; #FFFFFF;'> + </b>";

        if((int)$extra_number_1 > (int)$extra_number_2) 
        {
            $tmp_number = $extra_number_1;
            $extra_number_1 = $extra_number_2;
            $extra_number_2 = $tmp_number;
            echo "<b style='font: 40px Philosopher; color: #A0C4FF;'>$extra_number_1</b><b style='font: 40px Arial; #FFFFFF;'>, </b>";
            echo "<b style='font: 40px Philosopher; color: #BDB2FF;'>$extra_number_2</b><br>\n";
        }
        else
        {
            echo "<b style='font: 40px Philosopher; color: #A0C4FF;'>$extra_number_1</b><b style='font: 40px Arial; #FFFFFF;'>, </b>";
            echo "<b style='font: 40px Philosopher; color: #BDB2FF;'>$extra_number_2</b><br>\n";
        }
    }
    
/**/

/*
SELECT COUNT(distinct number_combination) AS unique_count FROM jackpot_end_result; 

SELECT number_combination, COUNT(*) AS duplicate_count, date_str, cycle_number_orig, cycle_number_final, extra_number_1, extra_number_2, prediction_value, position_value FROM jackpot_end_result GROUP BY number_combination HAVING COUNT(*) > 1;

SELECT number_combination, COUNT(*) AS duplicate_count FROM final_table WHERE prediction_value = 'your_specific_value' GROUP BY number_combination HAVING COUNT(*) > 1;


*/

/*
    //THIS WORKS FOR THE EXISTING ALL_PAST_WINNING_NUMBERS 
    //NOT SO MUCH FOR THE FUTURE ONES

    $query = "SELECT  
                date_str, 
                cycle_number_orig, 
                cycle_number_final, 
                number_combination, 
                extra_number_1, 
                extra_number_2, 
                position_value, 
                prediction_value, 
                prediction_percentage
              FROM jackpot_end_result
              WHERE date_str='$date_str'
              ORDER BY 
                prediction_percentage DESC, 
                prediction_value DESC";
    echo "query=$query<br>\n";

    $result = mysql_query($query);
    $data = mysql_fetch_object($result);

    $query2 = "SELECT 
                 median_number, 
                 threshold_number 
               FROM jackpot_draw_cycle_median_numbers 
               WHERE id='$data->cycle_number_final'";

    $result2 = mysql_query($query2);
    $data2 = mysql_fetch_object($result2);

    $draw_cycle_median_value    = $data2->median_number;
    $draw_cycle_threshold_value = $data2->threshold_number;

    $threshold_floor   = intval($draw_cycle_median_value - $draw_cycle_threshold_value);
    $threshold_ceiling = intval($draw_cycle_median_value + $draw_cycle_threshold_value);

    echo "($data->cycle_number_final) ::: POSITION: $threshold_floor << $data->position_value >> $threshold_ceiling<br>\n";

    $tmp_str = explode(",", $data->number_combination);
    $number_1 = trim($tmp_str[0]);
    $number_2 = trim($tmp_str[1]);
    $number_3 = trim($tmp_str[2]);
    $number_4 = trim($tmp_str[3]);
    $number_5 = trim($tmp_str[4]);

    $extra_number_1 = $data->extra_number_1;
    $extra_number_2 = $data->extra_number_2;

    echo "<b style='font: 40px Philosopher; color: #FFADAD;'>$number_1</b><b style='font: 40px Arial; color: #FFFFFF;'>, </b>";
    echo "<b style='font: 40px Philosopher; color: #FFD6A5;'>$number_2</b><b style='font: 40px Arial; #FFFFFF;'>, </b>";
    echo "<b style='font: 40px Philosopher; color: #FDFFB6;'>$number_3</b><b style='font: 40px Arial; #FFFFFF;'>, </b>";
    echo "<b style='font: 40px Philosopher; color: #CAFFBF;'>$number_4</b><b style='font: 40px Arial; #FFFFFF;'>, </b>";
    echo "<b style='font: 40px Philosopher; color: #9BF6FF;'>$number_5</b><b style='font: 40px Arial; #FFFFFF;'> + </b>";

    echo "<b style='font: 40px Philosopher; color: #A0C4FF;'>$extra_number_1</b><b style='font: 40px Arial; #FFFFFF;'>, </b>";
    echo "<b style='font: 40px Philosopher; color: #BDB2FF;'>$extra_number_2</b><br>\n";
*/
}

function Random_Jackpot_Draw_1($date_str, $param_1_flag=0)
{
    $query = "SELECT 
                cycle_number 
              FROM jackpot_dates 
              WHERE date='$date_str'";
    echo "query = $query<br>\n";

    $result = mysql_query($query);
    $data = mysql_fetch_object($result);

    $year_str = explode("-", $date_str);
    $year_str = $year_str[0];

    $query = "SELECT 
                date, 
                cycle_number, 
                week_number, 
                week_day 
              FROM jackpot_dates 
              WHERE cycle_number='$data->cycle_number'
                AND date LIKE '$year_str%'
              ORDER BY date
              LIMIT 1";
    echo "query = $query<br>\n";

    $result = mysql_query($query);

    if(mysql_num_rows($result) == 1)
    {
        $data = mysql_fetch_object($result);

        echo "DATE: $data->date<br>\n";
        $date_str = $data->date;
        $week_number_str = date('W', strtotime($date_str));
        echo "WEEK_NUMBER_PHP: $week_number_str<br>\n";
        echo "WEEK_NUMBER_DB: $data->week_number<br>\n";

        $day_of_week_str = date('l', strtotime($date_str));
        echo "WEEK_DAY_PHP: $day_of_week_str<br>\n";
        echo "WEEK_DAY_DB: $data->week_day<br>\n";

        $draw_cycle_number = $data->cycle_number;
        $draw_cycle_number_orig = $data->cycle_number;
        //$draw_cycle_number = 42; //TESTING PURPOSES
        echo "DRAW_CYCLE_NUMBER_DB: $draw_cycle_number<br>\n";

        // INCLUDE DEFAULT CYCLE_NUMBER TO THE LIST
        if($param_1_flag == 1) 
        { 
            $draw_cycle_number_alts[] = $draw_cycle_number;
        }

        $query2 = "SELECT 
                     DISTINCT number_secondary 
                   FROM jackpot_draw_cycle_number_alts 
                   WHERE number_primary='$draw_cycle_number'";

        $result2 = mysql_query($query2);

        echo "DRAW_CYCLE_NUMBER_ALTS: ";
        while($data2 = mysql_fetch_object($result2))
        {
            echo "$data2->number_secondary, ";
            $draw_cycle_number_alts[] = $data2->number_secondary;
        }
        echo "<br>\n";

        $num_draw_cycle_number_alts = count($draw_cycle_number_alts);

        $query2 = "SELECT 
                     floor_value, 
                     target_value, 
                     ceiling_value 
                   FROM jackpot_cycle_number_actual_medians
                   ORDER BY id ASC";

        $result2 = mysql_query($query2);
        while($data2 = mysql_fetch_object($result2))
        {
            $draw_cycle_actual_medians_floor[] = $data2->floor_value;
            $draw_cycle_actual_medians_target[] = $data2->target_value;
            $draw_cycle_actual_medians_ceiling[] = $data2->ceiling_value;
        }

        echo "DEBUG: count(draw_cycle_actual_medians_floor) = ". count($draw_cycle_actual_medians_floor). "<br>\n";
        echo "DEBUG: count(draw_cycle_actual_medians_target) = ". count($draw_cycle_actual_medians_target). "<br>\n";
        echo "DEBUG: count(draw_cycle_actual_medians_ceiling) = ". count($draw_cycle_actual_medians_ceiling). "<br>\n";
        echo "DEBUG: count(num_draw_cycle_number_alts) = ". $num_draw_cycle_number_alts. "<br>\n";

        for($i=0; $i < $num_draw_cycle_number_alts; $i++)
        {
            $draw_cycle_number_alt = $draw_cycle_number_alts[$i];
            $draw_cycle_number_alt_index = $draw_cycle_number_alt-1;
            $tmp_floor = $draw_cycle_actual_medians_floor[$draw_cycle_number_alt_index];
            $tmp_ceiling = $draw_cycle_actual_medians_ceiling[$draw_cycle_number_alt_index];

            echo "DEBUG: draw_cycle_number_alt_index = $draw_cycle_number_alt_index<br>\n";
            echo "DEBUG: tmp_floor = $tmp_floor<br>\n";
            echo "DEBUG: tmp_ceiling = $tmp_ceiling<br>\n";

            $query2 = "SELECT 
                         position, 
                         occurrence, 
                         number_combination 
                       FROM jackpot_final 
                       WHERE state='1' 
                         AND position > $tmp_floor
                         AND position < $tmp_ceiling
                       ORDER BY occurrence DESC";

/*  
            $query2 = "SELECT 
                         position, 
                         occurrence, 
                         number_combination 
                       FROM jackpot_final 
                       WHERE state='1' 
                         AND draw_cycle_number='$draw_cycle_number_alt'
                       ORDER BY occurrence DESC";
*/

            echo "$draw_cycle_number_alt: $query2<br>\n";

            $result2 = mysql_query($query2);

            if(mysql_num_rows($result2) > 1)
            {
                while($data2 = mysql_fetch_object($result2))
                {
                    $draw_cycle_number_combination_candidates[$i][] = $data2->number_combination;
                    $draw_cycle_number_combination_candidates_position[$i][] = $data2->position;
                    $draw_cycle_number_combination_candidates_occurrence[$i][] = $data2->occurrence;
                }
            }
        }
    }

    $num_candidates_total = 0;
    echo "NUM_CANDIDATES: ". count($draw_cycle_number_combination_candidates). " (";
    for($i=0; $i < count($draw_cycle_number_combination_candidates); $i++)
    {
        $num_candidates = count($draw_cycle_number_combination_candidates[$i]);
        $num_candidates_total += $num_candidates;
        echo "$num_candidates | ";
    }
    echo ") = $num_candidates_total<br\n";

    //___CALC_PREDICTION_VALUE_AND_FILL_UP_CANDIDATES_LIST_AGAIN_WITH_NEW_VALUES
    $query = "DROP TABLE IF EXISTS `tmp_calc_prediction`";
    $result = mysql_query($query);

    $query = "CREATE TABLE `tmp_calc_prediction`
              (
                 `id` int(20) NOT NULL auto_increment,
                 `number_combination` varchar(30) default NULL,
                 `cycle_number` int(20) default '0',
                 `occurrence_value` int(20) default '0',
                 `prediction_value` float default NULL,
                 `position_value` int(20) default '0',
                 PRIMARY KEY (`id`),
                 KEY `number_combination_idx` (`number_combination`),
                 KEY `cycle_number_idx` (`cycle_number`),
                 KEY `occurrence_value_idx` (`occurrence_value`),
                 KEY `prediction_value_idx` (`prediction_value`),
                 KEY `position_value_idx` (`position_value`),
                 UNIQUE KEY `number_combination_unique_idx` (`number_combination`(30))
              ) ENGINE=MyISAM DEFAULT CHARSET=utf8";
    $result = mysql_query($query);
    //_____________________________________________________
 
    $total_calc_median_value = 0;
    $total_calc_median_value_alt = 0;

    for($i=0; $i < $num_draw_cycle_number_alts; $i++)
    {
        $tmp_cycle_number_alt = $draw_cycle_number_alts[$i];

        $query = "SELECT 
                    median_number 
                  FROM jackpot_draw_cycle_median_numbers 
                  WHERE id='$tmp_cycle_number_alt'";

        $result = mysql_query($query);
        $data = mysql_fetch_object($result);

        $calc_median_value = $data->median_number;
        $total_calc_median_value += $calc_median_value;

        $tmp_cycle_number_alt = $draw_cycle_number_alts[$i];
        $tmp_cycle_number_alt_index = $tmp_cycle_number_alt-1;
        $calc_median_value_alt = $draw_cycle_actual_medians_target[$tmp_cycle_number_alt_index];
        echo "CALC_MEDIAN_VALUE ($tmp_cycle_number_alt): $calc_median_value | ALT: $calc_median_value_alt<br>\n";

        echo "DEBUG: ($tmp_cycle_number_alt): $calc_median_value<br>\n";
        echo "DEBUG: ($tmp_cycle_number_alt): $calc_median_value_alt<br>\n";

        $total_calc_median_value_alt += $calc_median_value_alt;

        for($j=0; $j < count($draw_cycle_number_combination_candidates_position[$i]); $j++)
        {
            $calc_number_combination_value = $draw_cycle_number_combination_candidates[$i][$j];
            $calc_occurrence_value = $draw_cycle_number_combination_candidates_occurrence[$i][$j];
            $calc_position_value = $draw_cycle_number_combination_candidates_position[$i][$j];
           
            //$calc_prediction_value = Calc_Prediction_Percentage_Value($calc_position_value, $calc_median_value);
            $calc_prediction_value = Calc_Prediction_Percentage_Value($calc_position_value, $calc_median_value_alt);

            $query = "INSERT INTO tmp_calc_prediction 
                      (
                          number_combination, 
                          cycle_number,
                          occurrence_value, 
                          prediction_value,
                          position_value
                      ) 
                      VALUES 
                      (
                          '$calc_number_combination_value', 
                          '$tmp_cycle_number_alt',
                          '$calc_occurrence_value', 
                          '$calc_prediction_value',
                          '$calc_position_value'
                      )";
            $result = mysql_query($query);            
        }
    }

    $adjusted_threshold = 0;

    $total_final_match_median_value = Get_Random_Final_Match_Median_Value($total_calc_median_value_alt, 
                                                                          $num_draw_cycle_number_alts);

    echo "DEBUG: total_final_match_median_value = $total_final_match_median_value<br>\n";

    $total_final_match_median_value_floor   = $total_final_match_median_value - 20000;
    $total_final_match_median_value_ceiling = $total_final_match_median_value + 20000;

    echo "DEBUG: total_calc_median_value = $total_calc_median_value | / $num_draw_cycle_number_alts = ". intval($total_calc_median_value / $num_draw_cycle_number_alts). "<br>\n";

    echo "DEBUG: total_calc_median_value_alt = $total_calc_median_value_alt | / $num_draw_cycle_number_alts = ". intval($total_calc_median_value_alt / $num_draw_cycle_number_alts). "<br>\n";

    $query = "SELECT 
                COUNT(*) AS num_matches 
              FROM tmp_calc_prediction 
              WHERE position_value > $total_final_match_median_value_floor
                AND position_value < $total_final_match_median_value_ceiling";

    $result = mysql_query($query);
    $data = mysql_fetch_object($result);

    $num_matches = $data->num_matches;
    echo "DEBUG: num_matches = $data->num_matches<br>\n";

    // IF NOT SUCCESSFUL WIDEN THE PARAMETERS
    if($num_matches < 77888) { $num_matches = Test_Matches(1, $total_final_match_median_value, 40000);  $adjusted_threshold = 20000;  }
    if($num_matches < 77888) { $num_matches = Test_Matches(2, $total_final_match_median_value, 60000);  $adjusted_threshold = 40000;  }
    if($num_matches < 77888) { $num_matches = Test_Matches(3, $total_final_match_median_value, 80000);  $adjusted_threshold = 60000;  }
    if($num_matches < 77888) { $num_matches = Test_Matches(4, $total_final_match_median_value, 100000); $adjusted_threshold = 80000;  }
    if($num_matches < 77888) { $num_matches = Test_Matches(5, $total_final_match_median_value, 120000); $adjusted_threshold = 100000; }
    if($num_matches < 77888) { $num_matches = Test_Matches(6, $total_final_match_median_value, 140000); $adjusted_threshold = 120000; }
    if($num_matches < 77888) { $num_matches = Test_Matches(7, $total_final_match_median_value, 160000); $adjusted_threshold = 140000; }

    if($adjusted_threshold != 0)
    {
        $total_final_match_median_value_floor   -= $adjusted_threshold; 
        $total_final_match_median_value_ceiling += $adjusted_threshold;
    }

    unset($draw_cycle_number_combination_candidates);

    $query = "SELECT 
                number_combination, 
                cycle_number, 
                prediction_value
              FROM tmp_calc_prediction 
              WHERE position_value > $total_final_match_median_value_floor
                AND position_value < $total_final_match_median_value_ceiling
              ORDER BY prediction_value DESC, occurrence_value DESC 
              LIMIT 50000";
    echo "query = $query<br>\n";

    $result = mysql_query($query);
    while($data = mysql_fetch_object($result))
    {
        $draw_cycle_number_combination_candidates[] = $data->number_combination;
        $draw_cycle_number_combination_candidates_cycle_number[] = $data->cycle_number;
        $draw_cycle_number_combination_candidates_prediction_value[] = $data->prediction_value;
    }

    $num_candidates = count($draw_cycle_number_combination_candidates);
    echo "num_candidates = $num_candidates<br>\n";


//_____ RUN 2ND PREDICTION

    //___CALC_PREDICTION_VALUE_AND_FILL_UP_CANDIDATES_LIST_AGAIN_WITH_NEW_VALUES
    $query = "DROP TABLE IF EXISTS `tmp_calc_prediction_random`";
    $result = mysql_query($query);

    $query = "CREATE TABLE `tmp_calc_prediction_random`
              (
                 `id` int(20) NOT NULL auto_increment,
                 `number_combination` varchar(30) default NULL,
                 `cycle_number` int(20) default '0',
                 `prediction_value` float default NULL,
                 `occurrence` int(20) default '0',
                 PRIMARY KEY (`id`),
                 KEY `number_combination_idx` (`number_combination`),
                 KEY `cycle_number_idx` (`cycle_number`),
                 KEY `prediction_value_idx` (`prediction_value`),
                 KEY `occurrence_idx` (`occurrence`),
                 UNIQUE KEY `number_combination_unique_idx` (`number_combination`(30))
              ) ENGINE=MyISAM DEFAULT CHARSET=utf8";
    $result = mysql_query($query);
    //_____________________________________________________

    for($i=0; $i<100000; $i++)
    {
        $random_index = mt_rand(0, $num_candidates-1);
        $tmp_number_combination = $draw_cycle_number_combination_candidates[$random_index];
        $tmp_prediction_value = $draw_cycle_number_combination_candidates_prediction_value[$random_index];
        $tmp_cycle_number = $draw_cycle_number_combination_candidates_cycle_number[$random_index];

        $query = "SELECT 
                    occurrence 
                  FROM jackpot_random_occurrence 
                  WHERE number_combination='$tmp_number_combination'";

        $result = mysql_query($query);
        $data = mysql_fetch_object($result);
        $tmp_random_occurrence_value = intval($data->occurrence/50);

        $query = "SELECT
                    id 
                  FROM tmp_calc_prediction_random 
                  WHERE number_combination='$tmp_number_combination'";

        $result = mysql_query($query);

        if(mysql_num_rows($result) == 0)
        {
            $query = "INSERT INTO tmp_calc_prediction_random
                      (
                          number_combination,
                          cycle_number,
                          prediction_value,
                          occurrence
                      )
                      VALUES
                      (
                          '$tmp_number_combination',
                          '$tmp_cycle_number',
                          '$tmp_prediction_value',
                          '$tmp_random_occurrence_value'
                      )";

            mysql_query($query);
        }
        else
        {
            $data = mysql_fetch_object($result);

            $query = "UPDATE tmp_calc_prediction_random 
                      SET occurrence = occurrence + $tmp_random_occurrence_value 
                      WHERE id='$data->id'";

            $result = mysql_query($query);
        }
    }

    unset($draw_cycle_number_combination_candidates);
    unset($draw_cycle_number_combination_candidates_prediction_value);

    //$query = "SELECT prediction_value, number_combination FROM tmp_calc_prediction_random ORDER BY occurrence DESC LIMIT 5000";
    $query = "SELECT 
                occurrence*(prediction_value*2) AS prediction_value, 
                number_combination 
              FROM tmp_calc_prediction_random 
              ORDER BY prediction_value DESC LIMIT 5000";

    $result = mysql_query($query);

    while($data = mysql_fetch_object($result))
    {
        $draw_cycle_number_combination_candidates[] = $data->number_combination;
        $draw_cycle_number_combination_candidates_prediction_value[] = $data->prediction_value;
    }

//________________________

    $num_candidates = count($draw_cycle_number_combination_candidates);
    echo "num_candidates = $num_candidates<br>\n";

    //__GET MIN-MAX OF ALL THE CANDIDATES
    foreach($draw_cycle_number_combination_candidates as $candidate_value)
    {
        $query = "SELECT 
                    position 
                  FROM jackpot_final 
                  WHERE number_combination='$candidate_value'";

        $result = mysql_query($query);
        $data = mysql_fetch_object($result);
        $candidate_values[] = $data->position;
    }

    $candidate_min = min($candidate_values);
    $candidate_max = max($candidate_values);

    echo "ALL_CANDIDATES_POSITION_MIN: $candidate_min<br>\n";
    echo "ALL_CANDIDATES_POSITION_MAX: $candidate_max<br>\n";
    //___

    for($i=0; $i<10; $i++)
    {
        $random_index = mt_rand(0, $num_candidates);
        echo "RANDOM_INDEX: $random_index<br>\n";

        $draw_cycle_number_combination_value = $draw_cycle_number_combination_candidates[$random_index];
        $draw_cycle_number_combination_prediction_value = $draw_cycle_number_combination_candidates_prediction_value[$random_index];

        echo "PREDICTION_VALUE: $draw_cycle_number_combination_prediction_value<br>\n";

        Print_End_Result($date_str, 
                         $draw_cycle_number_orig, 
                         $draw_cycle_number_combination_value, 
                         $draw_cycle_number_combination_prediction_value, 
                         $candidate_min, 
                         $candidate_max);
    }
}

function Get_Random_Final_Match_Median_Value($total_calc_median_value_alt, 
                                             $num_draw_cycle_number_alts)
{
    $query = "SELECT 
                position_value 
              FROM tmp_calc_prediction 
              ORDER BY 
                prediction_value DESC, 
                occurrence_value DESC 
              LIMIT 100000";

    $result = mysql_query($query);
    while($data = mysql_fetch_object($result))
    {
        $candidate_values[] = $data->position_value;
    }

    echo "DEBUG: Get_Random_Final_Match_Median_Value():: num_candidates: ". count($candidate_values). "<br>\n";

    $tmp_random_threshold_value = mt_rand(0, 45000);
    $tmp_random_threshold_value += 75000;
    $candidate_min = min($candidate_values) + $tmp_random_threshold_value;
    $candidate_max = max($candidate_values) - $tmp_random_threshold_value;
    $candidate_avg = intval($total_calc_median_value_alt / $num_draw_cycle_number_alts);

    echo "DEBUG: Get_Random_Final_Match_Median_Value():: candidate_min: $candidate_min<br>\n";
    echo "DEBUG: Get_Random_Final_Match_Median_Value():: candidate_max: $candidate_max<br>\n";
    echo "DEBUG: Get_Random_Final_Match_Median_Value():: candidate_avg: $candidate_avg<br>\n";

    $tmp_random_value = mt_rand(0, 2);
    echo "DEBUG: Get_Random_Final_Match_Median_Value():: tmp_random_value = $tmp_random_value<br>\n";

    if($tmp_random_value == 0) 
    { 
        $total_final_match_median_value = $candidate_min;
    }
    else if($tmp_random_value == 1) 
    { 
        $total_final_match_median_value = $candidate_max; 
    }
    else if($tmp_random_value == 2) 
    { 
        $total_final_match_median_value = $candidate_avg;
    }

    return $total_final_match_median_value;
}

function Import_Random_Occurrence_Values()
{
    echo "Creating Database 'jackpot_random_occurrence'... ";
    //___
    $query = "DROP TABLE IF EXISTS `jackpot_random_occurrence`";
    $result = mysql_query($query);

    $query = "CREATE TABLE `jackpot_random_occurrence`
              (
                 `id` int(20) NOT NULL auto_increment,
                 `number_combination` varchar(30) default NULL,
                 `occurrence` int(20) default '0',
                 PRIMARY KEY (`id`),
                 KEY `number_combination_idx` (`number_combination`),
                 KEY `occurrence_idx` (`occurrence`),
                 UNIQUE KEY `number_combination_unique_idx` (`number_combination`(30))
              ) ENGINE=MyISAM DEFAULT CHARSET=utf8";
    $result = mysql_query($query);
    //_____________________________________________________
    echo "OK!<br>\n";

    echo "Importing Random Occurrence Values... ";

    for($i=0; $i<=9; $i++)
    {
        $filepath = "F:/Deep_Learning_Local/QUANTUM_AI_INIT/eurojackpot_data/further_simulation_data/random_occurrence";
        $filename = "all_numbers_random_value_END_RESULT_$i.txt";
        $number_combination_filename = $filepath. "/". $filename;
        echo "  number_combination_filename = $number_combination_filename\n";

        if(file_exists($number_combination_filename))
        {
            $fp = fopen($number_combination_filename, "rt");

            while(($buffer = fgets($fp, 4096)) !== false)
            {
                $data_str = trim($buffer);
                $data_str = explode("check_jackpot():: ", $data_str);
                $data_str = $data_str[1];

                $number_combination_occurrence = explode("{", $data_str);
                $number_combination = trim($number_combination_occurrence[0]);
                $number_combination_occurrence = str_replace("}", "", $number_combination_occurrence[1]);
                //print("number_combination = $number_combination\n");
                //print("number_combination_occurrence = $number_combination_occurrence\n");

                $query = "SELECT 
                            id AS number_combination_id 
                          FROM jackpot_random_occurrence 
                          WHERE number_combination='$number_combination'";
                //echo "query=$query\n";

                $result = mysql_query("$query");

                if(mysql_num_rows($result) == 0)
                {
                    $query = "INSERT INTO jackpot_random_occurrence
                              (
                                 number_combination,
                                 occurrence
                              )
                              VALUES
                              (
                                 '$number_combination',
                                 '$number_combination_occurrence'
                              )";

                    //echo "query=$query\n";
                    mysql_query($query);
                }
                else
                {
                    $data = mysql_fetch_object($result);

                    $query = "UPDATE jackpot_random_occurrence 
                              SET occurrence = occurrence + $number_combination_occurrence 
                              WHERE id='$data->number_combination_id'";
                    //echo "$query\n";

                    $result = mysql_query($query);
                }
            }

            fclose($fp);
        }
    }

    echo "OK!<br>\n";
}

function Init_Final_Result_DB()
{
    echo "Creating Database 'jackpot_end_result'... ";
    //___
    $query = "DROP TABLE IF EXISTS `jackpot_end_result`";
    $result = mysql_query($query);

    $query = "CREATE TABLE `jackpot_end_result`
              (
                 `id` int(20) NOT NULL auto_increment,
                 `state` VARBINARY(1) default '1',
                 `date_str` varchar(30) default NULL,
                 `cycle_number_orig` int(20) default '0',
                 `cycle_number_final` int(20) default '0',
                 `number_combination` varchar(30) default NULL,
                 `number_combination_orig` varchar(30) default NULL,
                 `extra_number_1` int(20) default '0',
                 `extra_number_2` int(20) default '0',
                 `position_value` int(20) default '0',
                 `prediction_value` float default NULL,
                 `prediction_percentage` float default NULL,
                 PRIMARY KEY (`id`),
                 KEY `date_str_idx` (`date_str`),
                 KEY `state_idx` (`state`),
                 KEY `cycle_number_orig_idx` (`cycle_number_orig`),
                 KEY `cycle_number_final_idx` (`cycle_number_final`),
                 KEY `number_combination_idx` (`number_combination`),
                 KEY `number_combination_orig_idx` (`number_combination_orig`),
                 KEY `position_value_idx` (`position_value`),
                 KEY `prediction_value_idx` (`prediction_value`),
                 KEY `prediction_percentage_idx` (`prediction_percentage`)
              ) ENGINE=MyISAM DEFAULT CHARSET=utf8";
    $result = mysql_query($query);   
    //_____________________________________________________
    echo "OK!<br>\n";
}

function Init_Final_Result_Unique_DB()
{
    echo "Creating Database 'jackpot_end_result_unique'... ";
    //___
    $query = "DROP TABLE IF EXISTS `jackpot_end_result_unique`";
    $result = mysql_query($query);

    $query = "CREATE TABLE `jackpot_end_result_unique`
              (
                 `id` int(20) NOT NULL auto_increment,
                 `state` VARBINARY(1) default '1',
                 `date_str` varchar(30) default NULL,
                 `cycle_number_orig` int(20) default '0',
                 `cycle_number_final` int(20) default '0',
                 `number_combination` varchar(30) default NULL,
                 `number_combination_orig` varchar(30) default NULL,
                 `extra_number_1` int(20) default '0',
                 `extra_number_2` int(20) default '0',
                 `position_value` int(20) default '0',
                 `prediction_value` float default NULL,
                 `prediction_percentage` float default NULL,
                 PRIMARY KEY (`id`),
                 KEY `date_str_idx` (`date_str`),
                 KEY `state_idx` (`state`),
                 KEY `cycle_number_orig_idx` (`cycle_number_orig`),
                 KEY `cycle_number_final_idx` (`cycle_number_final`),
                 KEY `number_combination_idx` (`number_combination`),
                 KEY `number_combination_orig_idx` (`number_combination_orig`),
                 KEY `position_value_idx` (`position_value`),
                 KEY `prediction_value_idx` (`prediction_value`),
                 KEY `prediction_percentage_idx` (`prediction_percentage`),
                 UNIQUE KEY `number_combination_unique_idx` (`number_combination`(30))
              ) ENGINE=MyISAM DEFAULT CHARSET=utf8";
    $result = mysql_query($query);   
    //_____________________________________________________
    echo "OK!<br>\n";
}


function Save_Final_Result_To_DB($date_str, 
                                 $cycle_number_orig, 
                                 $cycle_number_final, 
                                 $number_combination, 
                                 $extra_number_1, 
                                 $extra_number_2, 
                                 $position_value, 
                                 $prediction_value)
{
    $query = "INSERT INTO jackpot_end_result
              (
                  date_str, 
                  cycle_number_orig, 
                  cycle_number_final, 
                  number_combination, 
                  extra_number_1, 
                  extra_number_2, 
                  position_value, 
                  prediction_value
              )
              VALUES
              (
                  '$date_str', 
                  '$cycle_number_orig', 
                  '$cycle_number_final', 
                  '$number_combination', 
                  '$extra_number_1', 
                  '$extra_number_2', 
                  '$position_value', 
                  '$prediction_value'
              )";
    mysql_query($query);
}

function Print_End_Result($date_str, 
                          $draw_cycle_number_orig, 
                          $draw_cycle_number_combination_value, 
                          $draw_cycle_number_combination_prediction_value, 
                          $candidate_min, 
                          $candidate_max)
{
    $query = "SELECT 
                position, 
                draw_cycle_number 
              FROM jackpot_final 
              WHERE number_combination='$draw_cycle_number_combination_value'";

    $result = mysql_query($query);
    $data = mysql_fetch_object($result);

    $draw_cycle_position_value = $data->position;
    $cycle_final_value = $data->draw_cycle_number;

    $query = "SELECT 
                median_number, 
                threshold_number 
              FROM jackpot_draw_cycle_median_numbers 
              WHERE id='$cycle_final_value'";

    $result = mysql_query($query);
    $data = mysql_fetch_object($result);

    $draw_cycle_median_value = $data->median_number;
    $draw_cycle_threshold_value = $data->threshold_number;

    $threshold_floor   = $candidate_min; //intval($draw_cycle_median_value - $draw_cycle_threshold_value);
    $threshold_ceiling = $candidate_max; //intval($draw_cycle_median_value + $draw_cycle_threshold_value);

    echo "($cycle_final_value) ::: POSITION: $threshold_floor << $draw_cycle_position_value >> $threshold_ceiling<br>\n";

    $tmp_str = explode(",", $draw_cycle_number_combination_value);
    $number_1 = trim($tmp_str[0]);
    $number_2 = trim($tmp_str[1]);
    $number_3 = trim($tmp_str[2]);
    $number_4 = trim($tmp_str[3]);
    $number_5 = trim($tmp_str[4]);

    $random_extra_numbers = Random_Extra_Numbers();
    $tmp_str = explode(",", $random_extra_numbers);
    $extra_number_1 = trim($tmp_str[0]);
    $extra_number_2 = trim($tmp_str[1]);

    echo "<b style='font: 40px Philosopher; color: #FFADAD;'>$number_1</b><b style='font: 40px Arial; color: #FFFFFF;'>, </b>";
    echo "<b style='font: 40px Philosopher; color: #FFD6A5;'>$number_2</b><b style='font: 40px Arial; #FFFFFF;'>, </b>";
    echo "<b style='font: 40px Philosopher; color: #FDFFB6;'>$number_3</b><b style='font: 40px Arial; #FFFFFF;'>, </b>";
    echo "<b style='font: 40px Philosopher; color: #CAFFBF;'>$number_4</b><b style='font: 40px Arial; #FFFFFF;'>, </b>";
    echo "<b style='font: 40px Philosopher; color: #9BF6FF;'>$number_5</b><b style='font: 40px Arial; #FFFFFF;'> + </b>";

    echo "<b style='font: 40px Philosopher; color: #A0C4FF;'>$extra_number_1</b><b style='font: 40px Arial; #FFFFFF;'>, </b>";
    echo "<b style='font: 40px Philosopher; color: #BDB2FF;'>$extra_number_2</b><br>\n";

    //$query = "UPDATE jackpot_final SET state='0' WHERE number_combination='$draw_cycle_number_combination_value'";
    //$result = mysql_query($query);
    //echo "$query<br>\n";

    echo "FINAL RESULT >>> $date_str ($draw_cycle_number_orig) | $cycle_final_value | $draw_cycle_number_combination_value | $extra_number_1, $extra_number_2 | $draw_cycle_position_value | $draw_cycle_number_combination_prediction_value<br><br>\n";

    Save_Final_Result_To_DB($date_str, 
                            $draw_cycle_number_orig, 
                            $cycle_final_value, 
                            $draw_cycle_number_combination_value, 
                            $extra_number_1, 
                            $extra_number_2, 
                            $draw_cycle_position_value, 
                            $draw_cycle_number_combination_prediction_value);
}


/******************
JACKPOT PALETTE:
#FFADAD
#FFD6A5
#FDFFB6
#CAFFBF
#9BF6FF

#A0C4FF
#BDB2FF

LOTTERY PALETTE:

#FFADAD
#FFD6A5
#FDFFB6
#CAFFBF
#9BF6FF
#A0C4FF

#BDB2FF
#FFC6FF
******************/

?>
<html>
<head>
    <?
        echo "<title>". SYSTEM_NAME. " ". SYSTEM_VERSION. "</title>\n";
    ?>
    <meta http-equiv="content-type" content="text/html; charset=utf-8" />
    <link rel="shortcut icon" type="image/ico" href="Images_UI/Favicon/favicon_64x64.png" />
    <link href="https://fonts.googleapis.com/css?family=Philosopher&display=swap" rel="stylesheet">    
    <style>
       body { background: #000000; color: #ffffff; }
       a:link { color: #FFADAD; }
       a:visited { color: #FFD6A5; }
       a:hover { color: #FDFFB6; }
       a:active { color: #CAFFBF; }
    </style>
</head>

<body style="margin:0; padding:0">
<center>
<br>
<?
$mysql_handler = new Mysql_Handler;
$mysql_handler->Init();

//__ONLY_FIRST_TIME_OR_IN_CASE_OF_RESET
//Init_Final_Result_DB();
//Import_Random_Occurrence_Values();

/*
EXPORT:
SELECT date_str, cycle_number_orig, cycle_number_final, number_combination, extra_number_1, extra_number_2, position_value, prediction_value, prediction_percentage INTO OUTFILE '2012-2018.txt' FROM jackpot_end_result;

IMPORT:
LOAD DATA INFILE '2012-2016.txt' INTO TABLE jackpot_end_result FIELDS TERMINATED BY '\t' LINES TERMINATED BY '\n';
*/

//Generate_Candidates();
Random_Jackpot_Draw_Form(); // NORMAL USE
//Save_Unique_End_Result(); // USE THIS TO SAVE DATA TO jackpot_end_result_unique 


function Generate_Candidates()
{
/*
DELETE FROM jackpot_end_result WHERE TRIM(number_combination) = '';

SELECT date_str, cycle_number_orig, cycle_number_final, number_combination, extra_number_1, extra_number_2, position_value, COUNT(*) AS duplicate_count FROM jackpot_end_result GROUP BY cycle_number_orig, number_combination, position_value HAVING COUNT(*) > 1;
*/

    // FILL THE DATABASE WITH CANDIDATES
    //$current_year = "2023"; this goes now

    //$current_month = "01";

    //$query = "SELECT date FROM jackpot_dates WHERE date LIKE '$current_year-$current_month%'";
    $query = "SELECT date FROM jackpot_dates WHERE date LIKE '$current_year%'";
    echo "query = $query<br>\n";

    $result = mysql_query($query);
    while($data = mysql_fetch_object($result))
    {
        for($i=0; $i<10; $i++)
        {
            $end_result = Random_Jackpot_Draw_1($data->date, $param_1_flag=1);
            echo "$end_result<br>\n";
        }
    }
}

function Random_Jackpot_Draw_Form()
{
    if(isset($_POST['form_sent']) && $_POST['form_sent'] == 1)
    {
        $date_str = trim($_POST['date']);
        if(strlen($date_str > 1))
        {
            ?>
            <table cellpadding=10 cellspacing=10 width=1200 border=1>
              <tr>
                <td width=50% valign='top'><? Random_Jackpot_Draw_2($date_str); ?></td>
              </tr>
              <tr>
                <td width=50% valign='top'><? Random_Jackpot_Draw_3($date_str); ?></td>
              </tr>
              <tr>
                <td width=50% valign='top'><? Random_Jackpot_Draw_4($date_str); ?></td>
              </tr>
            </table>
            <b><h2><a href="http://localhost/Quantum_Connection/Utils/jackpot_lottery/Random_Jackpot_Draw.php">RETURN</a></b></h2><br>
            <?
        }
        else
        {
            echo "DATE NOT SET!<br>\n";
            Print_Form();
        }
    }
    else
    {
        Print_Form();
    }
}

$mysql_handler->Deinit();
?>

</center>
</body>
</html>

