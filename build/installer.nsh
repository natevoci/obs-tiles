; Custom NSIS script to preserve user data during reinstall

!include "WordFunc.nsh"

; Generate a unique backup folder name based on installation path
; This prevents data from one installation being restored to another
!macro GetBackupPath OUTPUT_VAR PATH_TO_HASH
  ; Create a simple hash by replacing problematic characters
  ; Result: obs-tiles-backup-C_Users_Name_AppFolder
  StrCpy ${OUTPUT_VAR} "${PATH_TO_HASH}"
  ${WordReplace} ${OUTPUT_VAR} ":" "_" "+" ${OUTPUT_VAR}
  ${WordReplace} ${OUTPUT_VAR} "\" "_" "+" ${OUTPUT_VAR}
  ${WordReplace} ${OUTPUT_VAR} "/" "_" "+" ${OUTPUT_VAR}
  ${WordReplace} ${OUTPUT_VAR} " " "_" "+" ${OUTPUT_VAR}
  StrCpy ${OUTPUT_VAR} "$TEMP\obs-tiles-backup-${OUTPUT_VAR}"
!macroend

!macro customInit
  ; Nothing needed here
!macroend

!macro preInit
  ; Nothing needed here
!macroend

; customUnInit runs at the START of uninstall, BEFORE files are removed
!macro customUnInit
  ; Generate backup path unique to this installation location
  !insertmacro GetBackupPath $0 $INSTDIR
  
  ; Remove old backup if exists
  RMDir /r "$0"
  CreateDirectory "$0"
  
  ; Backup settings.json if it exists
  IfFileExists "$INSTDIR\settings.json" 0 +2
    CopyFiles /SILENT "$INSTDIR\settings.json" "$0\settings.json"
  
  ; Backup data folder if it exists
  IfFileExists "$INSTDIR\data\*.*" 0 +3
    CreateDirectory "$0\data"
    CopyFiles /SILENT "$INSTDIR\data\*.*" "$0\data"
!macroend

!macro customUnInstall
  ; Runs after files are removed - nothing to do here
!macroend

!macro customInstall
  ; Generate backup path unique to this installation location
  !insertmacro GetBackupPath $0 $INSTDIR
  
  ; Restore settings.json if backup exists
  IfFileExists "$0\settings.json" 0 +2
    CopyFiles /SILENT "$0\settings.json" "$INSTDIR\settings.json"
  
  ; Restore data folder if backup exists
  IfFileExists "$0\data\*.*" 0 +3
    CreateDirectory "$INSTDIR\data"
    CopyFiles /SILENT "$0\data\*.*" "$INSTDIR\data"
  
  ; Clean up backup folder
  RMDir /r "$0"
!macroend

