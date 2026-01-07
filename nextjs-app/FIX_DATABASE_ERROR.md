# Fix Database Connection Error

## The Problem
You're getting "Database connection failed" even though the database exists.

## Solution

### Step 1: Make sure you've restarted the dev server

**This is critical!** Next.js only loads `.env.local` when the server starts.

1. **Stop your dev server** (press `Ctrl+C` in the terminal where it's running)
2. **Wait a few seconds** for it to fully stop
3. **Start it again**:
   ```bash
   cd nextjs-app
   npm run dev
   ```

### Step 2: Verify .env.local exists

Check that `.env.local` exists in the `nextjs-app` folder with:
```env
DATABASE_URL="file:./prisma/dev.db"
```

### Step 3: Check the terminal output

When you start the dev server, you should see in the terminal:
```
[Prisma] DATABASE_URL: file:./prisma/dev.db
```

If you don't see this, the environment variable isn't loading.

### Step 4: If still not working

Try this:

1. **Delete `.env` file** if it exists (it might override `.env.local`):
   ```bash
   cd nextjs-app
   Remove-Item .env -ErrorAction SilentlyContinue
   ```

2. **Regenerate Prisma client**:
   ```bash
   npx prisma generate
   ```

3. **Restart dev server again**

### Step 5: Test the connection

Visit: `http://localhost:3000/api/health`

You should see:
```json
{
  "status": "healthy",
  "database": "connected"
}
```

## Common Issues

### Issue: "Environment variable not found: DATABASE_URL"
- **Fix**: Make sure `.env.local` exists and has `DATABASE_URL="file:./prisma/dev.db"`

### Issue: "Can't reach database"
- **Fix**: Make sure `prisma/dev.db` file exists (it should be ~140KB)

### Issue: "Tables don't exist"
- **Fix**: Run `npx prisma db push` to create tables

## Still Not Working?

1. Check the browser console for the exact error
2. Check the terminal where `npm run dev` is running for error messages
3. Make sure you're in the `nextjs-app` directory when running commands

