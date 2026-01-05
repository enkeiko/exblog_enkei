@echo off
chcp 65001 >nul
echo ========================================
echo  매일 오전 9시 자동 발행 스케줄러
echo ========================================
echo.
echo 이 창을 열어두면 매일 오전 9시에 자동 발행합니다.
echo 닫으려면 Ctrl+C 또는 창 닫기
echo.
echo ========================================
echo.

cd /d "%~dp0"
node auto-publish-with-notify.js schedule
