@echo off
chcp 65001 >nul
echo ========================================
echo  Telegram 알림 설정
echo ========================================
echo.
echo Telegram Bot 만드는 방법:
echo 1. Telegram에서 @BotFather 검색
echo 2. /newbot 명령어로 봇 생성
echo 3. 봇 토큰 복사
echo.
echo Chat ID 확인:
echo 1. 봇에게 아무 메시지 전송
echo 2. https://api.telegram.org/bot^<TOKEN^>/getUpdates 접속
echo 3. chat.id 숫자 확인
echo.
echo ========================================
echo.

cd /d "%~dp0"
node auto-publish-with-notify.js setup

pause
