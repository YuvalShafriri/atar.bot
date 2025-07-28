@echo off
REM --- send_feedback.bat ---------------------------------
REM שימוש:  send_feedback  <stage>  <true|false>  "comment"

REM 1) כתובת ה-Webhook מה-Apps Script
set WEBHOOK=https://script.google.com/macros/s/AKfycbxUn_w_2E2hHp_yACgRFZ3eUh_X2U73gtVQk6OjuG12hvGSaxHfvLMXrOgqfrhVkrdjLQ/exec

REM 2) מזהה סדנה קבוע
set WORKSHOP_ID=CIPA2025

REM 3) פרמטרים מקו הפקודה
set STAGE=%1
set PASSED=%2
set COMMENT=%~3

if "%STAGE%"=="" (
  echo Usage:  send_feedback ^<stage 1-5^> ^['true|false']^[ "comment"
  pause
  exit /b 1
)

curl.exe -s -X POST -H "Content-Type: application/json" ^
  -d "{\"workshop_id\":\"%WORKSHOP_ID%\",\"stage\":%STAGE%,\"passed\":%PASSED%,\"comment\":\"%COMMENT%\"}" ^
  "%WEBHOOK%"

if %errorlevel% neq 0 (
  echo ❌ Error sending feedback (errorlevel %errorlevel%)
) else (
  echo ✅ Sent successfully
)

pause