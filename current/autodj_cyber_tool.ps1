
# 666SOUNDsDESIGn AutoDJ Cyber Tool V1.2 (CLEAN FIX)

Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing

$form = New-Object System.Windows.Forms.Form
$form.Text = "666SOUNDsDESIGn AutoDJ V1.2 CLEAN"
$form.Size = New-Object System.Drawing.Size(600,400)

$button = New-Object System.Windows.Forms.Button
$button.Text = "RUN TEST"
$button.Size = New-Object System.Drawing.Size(200,50)
$button.Location = New-Object System.Drawing.Point(200,150)

$log = New-Object System.Windows.Forms.TextBox
$log.Multiline = $true
$log.Size = New-Object System.Drawing.Size(550,150)
$log.Location = New-Object System.Drawing.Point(20,200)

$button.Add_Click({
    $msg = "Metadaten: Artist=666SOUNDsDESIGn, Album=AutoDJ"
    $log.AppendText($msg + "`r`n")
})

$form.Controls.Add($button)
$form.Controls.Add($log)

$form.ShowDialog()
