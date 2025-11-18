@echo off
echo Setting up Git repository and pushing to GitHub...

REM Check if git is available
git --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Git is not installed or not in PATH.
    echo Please install Git from https://git-scm.com/download/win
    echo Or use GitHub Desktop: https://desktop.github.com/
    pause
    exit /b 1
)

REM Check if .git exists, if not initialize
if not exist .git (
    echo Initializing Git repository...
    git init
)

REM Set remote repository
echo Setting remote repository...
git remote remove origin 2>nul
git remote add origin https://github.com/Momelezi-lab/House-Hero-development.git

REM Check current branch
for /f "tokens=*" %%i in ('git branch --show-current 2^>nul') do set CURRENT_BRANCH=%%i
if "%CURRENT_BRANCH%"=="" (
    echo Creating main branch...
    git checkout -b main
    set CURRENT_BRANCH=main
)

REM Add all changes
echo Adding all changes...
git add .

REM Check if there are changes to commit
git status --porcelain >nul 2>&1
if not errorlevel 1 (
    echo Committing changes...
    git commit -m "Fix navigation system, back buttons, UI consistency, remove menu buttons, and add callout fee"
    
    REM Push to GitHub
    echo Pushing to GitHub...
    git push -u origin %CURRENT_BRANCH%
    
    echo Successfully pushed to GitHub!
) else (
    echo No changes to commit.
)

echo Done!
pause

