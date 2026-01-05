@echo off
chcp 65001 >nul
echo ========================================
echo  2단계: 즉시 발행
echo ========================================
echo.

set /p episode="발행할 회차 번호 (1-10): "

cd /d "%~dp0"
node auto-publish-with-notify.js publish %episode%

pause
