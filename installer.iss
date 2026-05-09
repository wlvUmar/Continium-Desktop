[Setup]
AppName=Continium
AppVersion=1.0
DefaultDirName={autopf}\Continium
DefaultGroupName=Continium
OutputDir=installer
OutputBaseFilename=ContiniumSetup

Compression=lzma2
SolidCompression=yes
WizardStyle=modern

SetupIconFile=resources\icon.ico

[Files]
Source: "dist\Continium\*"; DestDir: "{app}"; Flags: recursesubdirs createallsubdirs

[Icons]
Name: "{group}\Continium"; Filename: "{app}\Continium.exe"
Name: "{autodesktop}\Continium"; Filename: "{app}\Continium.exe"

[Run]
Filename: "{app}\Continium.exe"; Description: "Launch Continium"; Flags: nowait postinstall skipifsilent