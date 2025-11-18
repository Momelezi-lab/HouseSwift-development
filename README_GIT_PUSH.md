# Push to GitHub - Quick Guide

## Repository: https://github.com/Momelezi-lab/House-Hero-development.git

### Option 1: Run the Script (Easiest)

**For PowerShell:**
1. Right-click on `push_to_github.ps1`
2. Select "Run with PowerShell"
3. Or open PowerShell and run: `.\push_to_github.ps1`

**For Command Prompt:**
1. Double-click `push_to_github.bat`
2. Or open Command Prompt and run: `push_to_github.bat`

### Option 2: Manual Git Commands

If you have Git installed, open Git Bash or Command Prompt and run:

```bash
# Navigate to project directory
cd "C:\Users\fuzil\OneDrive\Desktop\House-Hero-development-main"

# Initialize git if needed
git init

# Set remote repository
git remote add origin https://github.com/Momelezi-lab/House-Hero-development.git

# Add all changes
git add .

# Commit changes
git commit -m "Fix navigation system, back buttons, UI consistency, remove menu buttons, and add callout fee"

# Push to GitHub
git push -u origin main
```

### Option 3: Using GitHub Desktop

1. Open GitHub Desktop
2. File → Add Local Repository
3. Select your project folder
4. Repository → Repository Settings → Remote
5. Set Primary remote repository: `https://github.com/Momelezi-lab/House-Hero-development.git`
6. Commit all changes with message: "Fix navigation system, back buttons, UI consistency, remove menu buttons, and add callout fee"
7. Click "Push origin"

### Option 4: Using VS Code

1. Open VS Code in your project folder
2. Source Control (Ctrl+Shift+G)
3. Click "..." → "Remote" → "Add Remote"
4. Name: `origin`, URL: `https://github.com/Momelezi-lab/House-Hero-development.git`
5. Stage all changes
6. Commit with message: "Fix navigation system, back buttons, UI consistency, remove menu buttons, and add callout fee"
7. Click "Sync Changes" or "Push"

## Changes Included in This Push

- ✅ Fixed sidebar navigation paths
- ✅ Created navigation utility (navigation.js)
- ✅ Fixed all back buttons to navigate to index.html
- ✅ Updated all headers to use consistent blue-900 color
- ✅ Removed menu buttons from customer pages
- ✅ Added R100 callout fee to bookings
- ✅ Fixed contact form functionality
- ✅ Improved FAQ toggle functionality

