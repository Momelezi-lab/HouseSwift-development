# Instructions to Push Changes to GitHub

## Option 1: Using Git Bash or Command Prompt

1. **Open Git Bash** (or Command Prompt if Git is installed)

2. **Navigate to your project directory:**
   ```bash
   cd "C:\Users\fuzil\OneDrive\Desktop\House-Hero-development-main"
   ```

3. **Check git status:**
   ```bash
   git status
   ```

4. **If not initialized, initialize git (if needed):**
   ```bash
   git init
   ```

5. **Add all changes:**
   ```bash
   git add .
   ```

6. **Commit the changes:**
   ```bash
   git commit -m "Fix navigation system, back buttons, UI consistency, and remove menu buttons from customer pages"
   ```

7. **If you haven't set up remote yet, add your GitHub repository:**
   ```bash
   git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git
   ```

8. **Push to GitHub:**
   ```bash
   git push -u origin main
   ```
   (or `master` if your default branch is master)

## Option 2: Using GitHub Desktop

1. Open GitHub Desktop
2. Open your repository
3. You should see all the changed files
4. Add a commit message: "Fix navigation system, back buttons, UI consistency, and remove menu buttons from customer pages"
5. Click "Commit to main" (or your branch name)
6. Click "Push origin" to push to GitHub

## Option 3: Using VS Code

1. Open VS Code in your project folder
2. Go to the Source Control tab (Ctrl+Shift+G)
3. Stage all changes (+ icon)
4. Enter commit message: "Fix navigation system, back buttons, UI consistency, and remove menu buttons from customer pages"
5. Click "Commit"
6. Click "Sync Changes" or "Push" to push to GitHub

## Summary of Changes to Push

- Fixed sidebar navigation paths
- Created navigation utility (navigation.js)
- Fixed all back buttons to go to index.html
- Updated all headers to use blue-900 color
- Removed menu buttons from customer pages
- Added callout fee functionality
- Fixed contact form and FAQ toggle functionality

