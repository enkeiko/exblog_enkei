@echo off
chcp 65001 >nul
echo ========================================
echo  소상공인 AI 마케팅 시리즈 발행 도우미
echo ========================================
echo.

set /p episode="발행할 회차 번호를 입력하세요 (1-10): "

cd /d "%~dp0"
node scheduler.js now %episode%

echo.
pause
