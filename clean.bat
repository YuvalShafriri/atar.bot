@echo off
echo ניקוי dist...
IF EXIST dist (
    rmdir /s /q dist
)
 
echo ניקוי קבצי לוג זמניים...
del /s /q *.log

echo ניקוי קבצי cache זמניים של VS Code מהמערכת...
IF EXIST "%APPDATA%\Code\Cache" (
    rmdir /s /q "%APPDATA%\Code\Cache"
)

echo ניקוי הסתיים!
pause