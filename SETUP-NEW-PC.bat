@echo off
setlocal
cd /d %~dp0
echo == ZIKKIT CA SOLO V1 — fresh machine setup ==
where node >nul 2>nul || ( echo Node.js is not installed. Install Node 20 LTS from https://nodejs.org and run this again. & pause & exit /b 1 )
for /f "tokens=*" %%v in ('node -v') do echo Node %%v
if not exist .env.local (
  copy .env.example .env.local >nul
  echo Created .env.local from .env.example — OPEN IT AND FILL THE FIREBASE KEYS before running the app.
)
echo Installing dependencies (2-4 minutes)...
call npm install --no-audit --no-fund
if errorlevel 1 ( echo npm install FAILED & pause & exit /b 1 )
if exist .next rmdir /S /Q .next
echo.
echo Done. Next:
echo   1) notepad .env.local   ^(NEXT_PUBLIC_ZIKKIT_REGION=CA + Firebase keys + FIREBASE_SERVICE_ACCOUNT_KEY^)
echo   2) npm run dev          ^(http://localhost:3000^)
echo   3) npm i -g firebase-tools ^&^& firebase login ^&^& firebase use zikkit-ca ^&^& firebase deploy --only firestore:rules,firestore:indexes,storage
pause
endlocal
