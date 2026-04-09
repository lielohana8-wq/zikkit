@echo off
echo.
echo ========================================
echo   ZIKKIT v9.0 — REDESIGN + PWA
echo ========================================
echo.

echo [1/7] Theme...
copy /Y "src\styles\theme.ts" "src\styles\theme.ts"

echo [2/7] Layout + CSS...
copy /Y "src\app\globals.css" "src\app\globals.css"
copy /Y "src\app\layout.tsx" "src\app\layout.tsx"

echo [3/7] Sidebar + Topbar + MobileNav...
copy /Y "src\components\layout\Sidebar.tsx" "src\components\layout\Sidebar.tsx"
copy /Y "src\components\layout\Topbar.tsx" "src\components\layout\Topbar.tsx"
copy /Y "src\components\layout\MobileNav.tsx" "src\components\layout\MobileNav.tsx"
copy /Y "src\components\layout\SectionHeader.tsx" "src\components\layout\SectionHeader.tsx"

echo [4/7] UI Components...
copy /Y "src\components\ui\KpiCard.tsx" "src\components\ui\KpiCard.tsx"
copy /Y "src\components\ui\PageTabs.tsx" "src\components\ui\PageTabs.tsx"
copy /Y "src\components\ui\Badge.tsx" "src\components\ui\Badge.tsx"
copy /Y "src\components\ui\PWAInstall.tsx" "src\components\ui\PWAInstall.tsx"

echo [5/7] PWA files...
copy /Y "public\manifest.json" "public\manifest.json"
copy /Y "public\sw.js" "public\sw.js"
copy /Y "public\icon-192.svg" "public\icon-192.svg"
copy /Y "public\icon-512.svg" "public\icon-512.svg"

echo [6/7] Fixed pages...
copy /Y "src\app\(app)\schedule\page.tsx" "src\app\(app)\schedule\page.tsx"
copy /Y "src\app\(app)\reports\page.tsx" "src\app\(app)\reports\page.tsx"

echo [7/7] Clearing cache...
rmdir /s /q .next 2>nul

echo.
echo ========================================
echo   DONE! Run: npm run dev
echo ========================================
pause
