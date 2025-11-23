# Vercel Deployment Guide

## Important: Database Migration Required

This project needs to use **PostgreSQL** instead of SQLite for Vercel deployment, as SQLite doesn't work in serverless environments.

## Step 1: Set Up PostgreSQL Database

You have several options:

### Option A: Vercel Postgres (Recommended - Easiest)
1. Go to your Vercel project dashboard
2. Navigate to **Storage** tab
3. Click **Create Database** → Select **Postgres**
4. Choose a name and region
5. Once created, go to **Settings** → **Environment Variables**
6. Copy the `POSTGRES_URL` connection string

### Option B: Supabase (Free tier available)
1. Go to [supabase.com](https://supabase.com)
2. Create a new project
3. Go to **Settings** → **Database**
4. Copy the connection string (URI format)

### Option C: Neon (Free tier available)
1. Go to [neon.tech](https://neon.tech)
2. Create a new project
3. Copy the connection string

## Step 2: Set Environment Variables in Vercel

1. Go to your Vercel project dashboard
2. Navigate to **Settings** → **Environment Variables**
3. Add the following variables:

```
DATABASE_URL=postgresql://user:password@host:port/database?sslmode=require
```

**Important:** 
- Use the connection string from your PostgreSQL provider
- Make sure to include `?sslmode=require` for secure connections
- Set this for **Production**, **Preview**, and **Development** environments

## Step 3: Run Database Migrations

After setting up the database, you need to create the tables. You can do this in two ways:

### Option A: Using Prisma Migrate (Recommended)
```bash
# In your local environment
npx prisma migrate dev --name init
```

Then push the migration:
```bash
npx prisma migrate deploy
```

### Option B: Using Prisma Push (Quick setup)
```bash
# This will create tables based on your schema
npx prisma db push
```

## Step 4: Seed the Database (Optional)

If you have seed data:
```bash
npm run db:seed
```

## Step 5: Deploy to Vercel

1. Push your changes to GitHub
2. Vercel will automatically detect and deploy
3. Monitor the build logs for any errors

## Troubleshooting

### Build Fails with Database Connection Error
- Verify `DATABASE_URL` is set correctly in Vercel environment variables
- Check that the database allows connections from Vercel's IP addresses
- Ensure SSL is enabled (`?sslmode=require`)

### "Table does not exist" Errors
- Run migrations: `npx prisma migrate deploy`
- Or use: `npx prisma db push`

### Prisma Client Not Generated
- The build script includes `prisma generate` which should handle this
- If issues persist, check that Prisma is in dependencies (not devDependencies)

## Environment Variables Checklist

Make sure these are set in Vercel:
- [ ] `DATABASE_URL` - PostgreSQL connection string
- [ ] `NEXT_PUBLIC_API_URL` - Your API URL (if needed)
- [ ] Any email configuration (if using nodemailer)

## Notes

- The build script has been updated to remove `prisma db push` (only runs `prisma generate`)
- Database migrations should be run manually or via CI/CD
- SQLite files (`dev.db`) are not included in deployment

