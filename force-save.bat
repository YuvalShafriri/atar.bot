@echo off
echo Forcing VS Code to save all files...
taskkill /f /im Code.exe 2>nul
timeout /t 2 >nul
echo Restarting VS Code...
code .
echo Done. Check that all files are saved properly.
