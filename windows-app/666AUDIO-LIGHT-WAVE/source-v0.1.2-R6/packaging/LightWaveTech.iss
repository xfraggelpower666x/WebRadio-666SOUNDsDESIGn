[Setup]
AppId=666SOUNDsDESIGn.LightWaveTech
AppName=666AUDIO LIGHT WAVE
AppVersion=0.1.2-R6
AppVerName=666AUDIO LIGHT WAVE 0.1.2-R6
AppPublisher=666SOUNDsDESIGn
DefaultDirName={localappdata}\Programs\666AUDIO LIGHT WAVE
DefaultGroupName=666AUDIO LIGHT WAVE
PrivilegesRequired=lowest
ArchitecturesAllowed=x64compatible
OutputDir=..\dist
OutputBaseFilename=666AUDIO-LIGHT-WAVE-Setup-x64
WizardStyle=modern
LicenseFile=..\LICENSE.txt
UninstallDisplayIcon={app}\666AUDIO-LIGHT-WAVE.exe

[Languages]
Name: "german"; MessagesFile: "compiler:Languages\German.isl"
Name: "english"; MessagesFile: "compiler:Default.isl"

[Tasks]
Name: "desktopicon"; Description: "{cm:CreateDesktopIcon}"; Flags: unchecked

[Files]
Source: "..\dist\666AUDIO-LIGHT-WAVE.exe"; DestDir: "{app}"; Flags: ignoreversion
Source: "..\LICENSE.txt"; DestDir: "{app}"
Source: "..\packaging\CREDITS.txt"; DestDir: "{app}"

[Icons]
Name: "{group}\666AUDIO LIGHT WAVE"; Filename: "{app}\666AUDIO-LIGHT-WAVE.exe"
Name: "{userdesktop}\666AUDIO LIGHT WAVE"; Filename: "{app}\666AUDIO-LIGHT-WAVE.exe"; Tasks: desktopicon

[Run]
Filename: "{app}\666AUDIO-LIGHT-WAVE.exe"; Description: "{cm:LaunchProgram,666AUDIO LIGHT WAVE}"; Flags: nowait postinstall skipifsilent
