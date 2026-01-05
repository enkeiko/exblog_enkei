@echo off
chcp 65001 >nul
echo ========================================
echo  스케줄러 시작 (매일 오전 9시 자동 알림)
echo ========================================
echo.

cd /d "%~dp0"
node scheduler.js

pause
