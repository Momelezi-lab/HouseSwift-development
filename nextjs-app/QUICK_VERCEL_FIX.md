# Quick Vercel Deployment Fix

## The Problem
Your project uses SQLite, which doesn't work on Vercel's serverless platform. You need PostgreSQL.

## Quick Solution (3 Steps)

### Step 1: Set Up PostgreSQL Database

**Easiest Option - Vercel Postgres:**
1. In your Vercel dashboard, go to your project
2. Click **Storage** tab → **Create Database** → **Postgres**
3. Create the database and note the connection string

**Alternative - Free Options:**
- **Supabase**: https://supabase.com (free tier)
- **Neon**: https://neon.tech (free tier)
- **Railway**: https://railway.app (free tier)

### Step 2: Add Environment Variable in Vercel

1. Go to your Vercel project → **Settings** → **Environment Variables**
2. Add:
   ```
   DATABASE_URL=postgresql://user:password@host:port/database?sslmode=require
   ```
   (Use the connection string from Step 1)

3. Make sure to set it for **Production**, **Preview**, and **Development**

### Step 3: Initialize Database Tables

After setting up the database, you need to create the tables. You can do this locally:

```bash
# In your local project directory
cd nextjs-app

# Generate Prisma client
npx prisma generate

# Push schema to database (creates tables)
npx prisma db push

# Optional: Seed initial data
npm run db:seed
```

## What Changed

✅ **package.json**: Removed `prisma db push` from build script (now just runs `prisma generate && next build`)
✅ **schema.prisma**: Changed from `sqlite` to `postgresql`
✅ **vercel.json**: Updated configuration

## After Deployment

Once deployed, your database will be empty. You may need to:
1. Create an admin user manually, OR
2. Run your seed script: `npm run db:seed`
3. Set up admin: `npm run db:set-admin`

## Need Help?

Check `VERCEL_DEPLOYMENT.md` for detailed instructions.

