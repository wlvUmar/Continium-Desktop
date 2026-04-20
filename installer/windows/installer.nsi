; Continium Desktop Installer Script
; This script creates a Windows installer using NSIS

!include "MUI2.nsh"
!define PROJECT_ROOT "${__FILEDIR__}\..\.."

; Basic settings
Name "Continium"
OutFile "${PROJECT_ROOT}\dist\Continium-Setup.exe"
InstallDir "$LOCALAPPDATA\Programs\Continium"
InstallDirRegKey HKCU "Software\Continium" "Install_Dir"
!define MUI_ICON "${PROJECT_ROOT}\resources\icon.ico"
!define MUI_UNICON "${PROJECT_ROOT}\resources\icon.ico"

; Install per-user so the app works on machines without admin rights
RequestExecutionLevel user
SetShellVarContext current

; MUI Settings
!insertmacro MUI_PAGE_WELCOME
!insertmacro MUI_PAGE_DIRECTORY
!insertmacro MUI_PAGE_INSTFILES
!insertmacro MUI_PAGE_FINISH

!insertmacro MUI_LANGUAGE "English"

; Installation section
Section "Install"
  SetOutPath "$INSTDIR"
  
  ; Copy the full PyInstaller bundle so the app can run on any machine
  File /r "${PROJECT_ROOT}\dist\Continium\*"

  ; Create Start Menu shortcuts
  CreateDirectory "$SMPROGRAMS\Continium"
  CreateShortcut "$SMPROGRAMS\Continium\Continium.lnk" "$INSTDIR\Continium.exe"
  CreateShortcut "$SMPROGRAMS\Continium\Uninstall.lnk" "$INSTDIR\uninstall.exe"
  
  ; Create Desktop shortcut (optional)
  CreateShortcut "$DESKTOP\Continium.lnk" "$INSTDIR\Continium.exe"
  
  ; Write uninstaller
  WriteUninstaller "$INSTDIR\uninstall.exe"
  
  ; Write registry keys for Add/Remove Programs
  WriteRegStr HKCU "Software\Continium" "Install_Dir" "$INSTDIR"
  WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\Continium" "DisplayName" "Continium"
  WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\Continium" "UninstallString" "$INSTDIR\uninstall.exe"
  WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\Continium" "InstallLocation" "$INSTDIR"
  
SectionEnd

; Uninstall section
Section "Uninstall"
  ; Remove files
  Delete "$INSTDIR\Continium.exe"
  Delete "$INSTDIR\uninstall.exe"
  
  ; Remove shortcuts
  Delete "$SMPROGRAMS\Continium\Continium.lnk"
  Delete "$SMPROGRAMS\Continium\Uninstall.lnk"
  Delete "$DESKTOP\Continium.lnk"
  RMDir "$SMPROGRAMS\Continium"
  
  ; Remove directory
  RMDir "$INSTDIR"
  
  ; Remove registry keys
  DeleteRegKey HKCU "Software\Continium"
  DeleteRegKey HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\Continium"
  
SectionEnd
