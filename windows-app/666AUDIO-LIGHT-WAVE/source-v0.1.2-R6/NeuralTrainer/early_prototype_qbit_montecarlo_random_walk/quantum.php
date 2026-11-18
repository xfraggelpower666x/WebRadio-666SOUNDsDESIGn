<?php
if (PHP_SAPI !== 'cli' || getenv('LWT_ENABLE_LEGACY_EXPERIMENTS') !== '1') {
    if (PHP_SAPI !== 'cli') {
        http_response_code(404);
    }
    exit;
}
/*****************************************************************************************************
 * Quantum Connection
 *
 * $Id: Include/quantum.php, v 0.1.09 2015/01/22 19:58:00
 *
 * Created on 2014/06/11
 *
 *
 *****************************************************************************************************
 *
 * Update_Quantum_Bit_Pool()
 * Get_Quantum_Bit_Percentage($bits)
 * Get_Quantum_Bit_Info($bits)
 * Get_Quantum_Random_Numbers()
 * Get_Quantum_Random_Number($max=0)
 * Quantum_Matrix()
 *
 *****************************************************************************************************/

include_once("Include/text_to_speech.php");

/******** Function ::: Update_Quantum_Bit_Pool() *** Description *************************************
 *
 * ~ HTML page retrieves new set of Random Quantum Bits using AJAX Query
 * ~ Deletes Quantum Random Bit-Segments older than 33 minutes
 *
 * ~ Downloads 256 Bytes of Randomness { 1024 Random Bits x 2 = 2048 Random Bits } from
 *   ANU Quantum Random Numbers Server (Randomness from Quantum Fluctuations of the Vacuum)
 *
 * ~ Quantum Random Bit-Stream is broken-down into 24-bit segments - totaling 85 chunks
 * ~ Quantum Random Bit-Segments are saved into DB
 *
 *****************************************************************************************************/

function Update_Quantum_Bit_Pool()
{
    if(SPEECH_SYNTH == true)
    {
        $text_to_speech = new Text_To_Speech;
        $text_to_speech->Init();
        $text_to_speech->Speak_Text("Loading Quantum Random Numbers");
    }

    // Delete Random Quantum Bits older than 44 minutes (set state from 1 to 0)
    //mysql_query("UPDATE quantum_bit_pool SET state='0' WHERE date < ADDDATE(NOW(), INTERVAL -44 MINUTE)");

    // Download 1st set of 128 Bytes
    //$data = file_get_contents("https://qrng.anu.edu.au/RawBin.php");

    // 2020-10-30 https://qrng.anu.edu.au/random-block-binary
    $data = file_get_contents("https://qrng.anu.edu.au/random-block-binary");

    $tmp = explode("1024 random bits.", $data);
    $quantum_bits = trim(strip_tags($tmp[1]));

    // Wait for 33 seconds until the next set
    sleep(33);

    // Download 2nd set of 128 Bytes
    $data = file_get_contents("https://qrng.anu.edu.au/RawBin.php");
    $tmp = explode("1024 random bits.", $data);
    $quantum_bits .= trim(strip_tags($tmp[1]));

    // Check if we got total of 2048 bits, otherwise notify of failed download
    $quantum_bits_len = strlen($quantum_bits);

    if($quantum_bits_len == 2048)
    {
        $quantum_bit_info[] = Get_Quantum_Bit_Percentage($quantum_bits);
        $index = 0;

        // Break Quantum Random Bit-Stream into 24-bit segments
        for($i=0; $i<85; $i++)
        {
            $quantum_bit_segment = substr($quantum_bits, $index, 24);
            mysql_query("INSERT INTO quantum_bit_pool (qbit) VALUES('$quantum_bit_segment')");
            $index += 24;
        }

        // Log Quantum Random Bit info for statistic purposes
        foreach($quantum_bit_info as $quantum_bit)
        {
            $quantum_bits_num_zero += $quantum_bit['num_zero'];
            $quantum_bits_num_one  += $quantum_bit['num_one'];
            $quantum_bits_percentage_zero += $quantum_bit['percentage_zero'];
            $quantum_bits_percentage_one  += $quantum_bit['percentage_one'];
        }

        $quantum_bit_stats = array("num_zero" => $quantum_bits_num_zero,
                                   "num_one" => $quantum_bits_num_one,
                                   "percentage_zero" => $quantum_bits_percentage_zero,
                                   "percentage_one" => $quantum_bits_percentage_one);

        Log_Event("quantum_bit_stats", $quantum_bit_stats);

        ?>
        <table class="quantum_bit_info">
            <tr>
                <td><? echo "<img src='Images_UI/Animated/entanlement_88x88.gif' width='20'>"; ?></td>
                <td><? echo "QBITRND { 0: $quantum_bits_num_zero ($quantum_bits_percentage_zero %) - 1: $quantum_bits_num_one ($quantum_bits_percentage_one %) }"; ?></td>
                <td><? echo "<img src='Images_UI/Animated/entanlement_88x88.gif' width='20' class='flip'>"; ?></td>
            </tr>
        </table>
        <?

        return true;
    }
    else
    {
        echo "~ Failed to download Quantum Random Numbers ~";

        if(SPEECH_SYNTH == true)
        {
            $text_to_speech->Speak_Text("Failed to download Quantum Random Numbers");
        }

        return false;
    }
}

function Get_Quantum_Bit_Percentage($bits)
{
    $num_zero = substr_count($bits, "0");
    $num_one  = substr_count($bits, "1");

    $percentage_zero = round(($num_zero / $num_one) * 100, 2);
    $percentage_one  = round(($num_one / $num_zero) * 100, 2);

    $quantum_bit_info = array('num_zero' => $num_zero, 'percentage_zero' => $percentage_zero,
                              'num_one'  => $num_one,  'percentage_one'  => $percentage_one);

    return $quantum_bit_info;
}

function Get_Quantum_Bit_Info($bits)
{
    if(is_array($bits))
    {
        foreach($bits as $bit)
        {
            $bit_str .= $bit;
        }
    }
    else
    {
        $bit_str = $bits;
    }

    $quantum_bit_info[] = Get_Quantum_Bit_Percentage($bit_str);

    foreach($quantum_bit_info as $quantum_bit)
    {
        $quantum_bits_num_zero += $quantum_bit['num_zero'];
        $quantum_bits_num_one  += $quantum_bit['num_one'];
        $quantum_bits_percentage_zero += $quantum_bit['percentage_zero'];
        $quantum_bits_percentage_one  += $quantum_bit['percentage_one'];
    }

    return "{ 0: $quantum_bits_num_zero ($quantum_bits_percentage_zero %) ~ ∞ ~ 1: $quantum_bits_num_one ($quantum_bits_percentage_one %) }\n";
}

/******** Function ::: Get_Quantum_Random_Numbers() *** Description **********************************
 *
 * ~ Gets $num_bit_segments from DB
 * ~ Removes used segments from DB (sets state from 1 to 0)
 *
 *****************************************************************************************************/

function Get_Quantum_Random_Numbers($num_bit_segments=10)
{
    $result = mysql_query("SELECT date, id, qbit FROM quantum_bit_pool WHERE state='1' ORDER BY RAND() LIMIT $num_bit_segments");

    while($data = mysql_fetch_object($result))
    {
        //echo "Get_Quantum_Random_Numbers(): date = $data->date<br>\n";
        //echo "Get_Quantum_Random_Numbers(): bin = $data->qbit<br>\n";
        //echo "Get_Quantum_Random_Numbers(): dec = ". bindec($data->qbit). "<br>\n";

        $quantum_bit_date_array[] = $data->date;
        $quantum_bit_bin_array[]  = $data->qbit;
        $quantum_bit_dec_array[]  = bindec($data->qbit);
        mysql_query("UPDATE quantum_bit_pool SET state='0', date_used=NOW() WHERE id='$data->id'");
    }

    return array("date" => $quantum_bit_date_array, "bin" => $quantum_bit_bin_array, "dec" => $quantum_bit_dec_array);
}

// MySQL RAND is slow on large db sizes...
function Get_Quantum_Random_Numbers2($num_bit_segments=10)
{
    $sql = "SELECT date, id, qbit FROM quantum_bit_pool WHERE state='1' LIMIT $num_bit_segments";
    $result = mysql_query($sql);
    //echo "sql = $sql<br>\n";

    while($data = mysql_fetch_object($result))
    {
        //echo "Get_Quantum_Random_Numbers(): date = $data->date<br>\n";
        //echo "Get_Quantum_Random_Numbers(): bin = $data->qbit<br>\n";
        //echo "Get_Quantum_Random_Numbers(): dec = ". bindec($data->qbit). "<br>\n";

        $quantum_bit_date_array[] = $data->date;
        $quantum_bit_bin_array[]  = $data->qbit;
        $quantum_bit_dec_array[]  = bindec($data->qbit);
        mysql_query("UPDATE quantum_bit_pool SET state='0', date_used=NOW() WHERE id='$data->id'");
    }

    return array("date" => $quantum_bit_date_array, "bin" => $quantum_bit_bin_array, "dec" => $quantum_bit_dec_array);
}

function Get_Quantum_Random_Number($type)
{
    $random_index = $GLOBALS['quantum_random_index'];
    //echo "Get_Quantum_Random_Number(): random_index = $random_index<br>\n";

    if($type == "date")
    {
        $num = $GLOBALS['quantum_random_numbers_date'][$random_index];
        //echo "Get_Quantum_Random_Number(): date = $num<br>\n";
    }
    else if($type == "bin")
    {
        $num = $GLOBALS['quantum_random_numbers_bin'][$random_index];
        //echo "Get_Quantum_Random_Number(): bin = $num<br>\n";
    }
    else if($type == "dec")
    {
        $num = $GLOBALS['quantum_random_numbers_dec'][$random_index];
        //echo "Get_Quantum_Random_Number(): dec = $num<br>\n";
        $GLOBALS['quantum_random_index']++;
    }

    return $num;
}

function Quantum_Matrix()
{
    ?>
    <script>
        (function($)
        {
          $(document).ready(function()
          {
             $.ajaxSetup(
             {
                cache: false,
                complete: function() {
                   $('#content').show();
                },
                success: function() {
                   $('#content').show();
                }
            });

            var $container = $("#content");
            $container.load("random_bit_data2.php");

            var interval = 1.11*60*1000;
            var refreshId = setInterval(function()
            {
                $container.load('random_bit_data2.php');
            }, interval);
         });
        })(jQuery);
    </script>

    <center>
        <div class="animated_quantum_matrix_code">
            <div class='dna_container'>
                <img src="Images_UI/Animated/dna_green_left.gif" class='dna_helix_left'>
                <div class='square_container'>
                    <img src="Images_UI/Animated/preload12.gif" border=0 width=169 height=27>
                    <img src="Images_UI/Animated/preload12.gif" border=0 width=169 height=27 class='flipped'>
                    <img src="Images_UI/Animated/preload12.gif" border=0 width=169 height=27>
                    <img src="Images_UI/Animated/preload12.gif" border=0 width=169 height=27 class='flipped'>
                </div>
                <img src="Images_UI/Animated/dna_green_right.gif" class='dna_helix_right'>
            </div>
        </div>
        <div id="content" class="content"></div>
    </center>
  <?
}

?>