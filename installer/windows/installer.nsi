; Continium Desktop Installer Script
; This script creates a Windows installer using NSIS

!include "MUI2.nsh"

; Basic settings
Name "Continium"
OutFile "dist\Continium-Setup.exe"
InstallDir "$PROGRAMFILES\Continium"
InstallDirRegKey HKCU "Software\Continium" "Install_Dir"

; Request admin privileges
RequestExecutionLevel admin

; MUI Settings
!insertmacro MUI_PAGE_WELCOME
!insertmacro MUI_PAGE_DIRECTORY
!insertmacro MUI_PAGE_INSTFILES
!insertmacro MUI_PAGE_FINISH

!insertmacro MUI_LANGUAGE "English"

; Installation section
Section "Install"
  SetOutPath "$INSTDIR"
  
  ; Copy the executable
  File "dist\Continium.exe"
  
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
