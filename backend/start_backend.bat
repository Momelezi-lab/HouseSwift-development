@echo off
echo Starting HomeSwift Backend Server...
echo.
cd /d %~dp0
python app.py
if errorlevel 1 (
    echo.
    echo Python not found. Trying 'py' command...
    py app.py
)
pause

