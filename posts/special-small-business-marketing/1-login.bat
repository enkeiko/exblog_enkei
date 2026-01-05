@echo off
chcp 65001 >nul
echo ========================================
echo  1단계: 네이버 로그인 세션 저장
echo ========================================
echo.
echo 브라우저가 열리면 네이버에 로그인해주세요.
echo 로그인 완료 후 메인 페이지로 이동하면 자동 저장됩니다.
echo.

cd /d "%~dp0"
node auto-publish-with-notify.js login

pause
