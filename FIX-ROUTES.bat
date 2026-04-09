@echo off
echo Removing duplicate routes...
rmdir /s /q "src\app\(legal)\privacy" 2>nul
rmdir /s /q "src\app\(legal)\terms" 2>nul
echo Done.
