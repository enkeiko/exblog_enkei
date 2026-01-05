@echo off
chcp 65001 >nul
title 소상공인 AI 마케팅 - 자동 발행 스케줄러

echo ========================================
echo  매일 오전 9시 자동 발행 스케줄러
echo ========================================
echo.
echo 이 창을 열어두면 매일 오전 9시에 자동 발행합니다.
echo 컴퓨터가 켜져 있어야 합니다!
echo.
echo 닫으려면: Ctrl+C 또는 창 닫기
echo ========================================
echo.

cd /d "%~dp0"
node daily-scheduler.js

pause
