# Fix Signup Error - Quick Guide

## The Problem
- Frontend running on port **3001**
- API calls trying to reach port **3000** (CORS error)
- Signup failing

## What Was Fixed

1. ✅ **Commented out `NEXT_PUBLIC_API_URL` in `.env`**
   - Now uses relative URLs (API routes are on the same server)
   
2. ✅ **Added CORS headers to signup API route**
   - Allows cross-origin requests

3. ✅ **Updated API configuration**
   - Uses relative URLs by default

## What You Need to Do

### 1. **RESTART YOUR DEV SERVER**

This is **critical** - environment variables are loaded when the server starts!

1. **Stop the server**: Press `Ctrl+C` in the terminal where `npm run dev` is running
2. **Start it again**: Run `npm run dev`

### 2. **Verify Database Setup**

Make sure the database is ready:

```powershell
# Regenerate Prisma client (if you haven't already)
npx prisma generate

# Push schema to database
npx prisma db push
```

### 3. **Try Signing Up Again**

1. Go to: http://localhost:3001/signup (or whatever port your server is on)
2. Click the **"Service Provider"** tab
3. Fill in the form
4. Submit

## Expected Result

- ✅ No more CORS errors
- ✅ Signup should work
- ✅ You'll be redirected to `/provider-dashboard` after signup

## If It Still Doesn't Work

1. **Check the browser console** for any new errors
2. **Check the server terminal** for error messages
3. **Verify the database file exists**: `prisma/dev.db`
4. **Make sure `.env` file is in the `nextjs-app` folder**

## Notes

- Next.js API routes run on the **same server** as the frontend
- Using relative URLs (`/api/auth/signup`) automatically uses the correct port
- Environment variables require a **server restart** to take effect

