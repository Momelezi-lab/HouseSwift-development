# Deployment Guide for HomeSwift App

This guide will help you deploy your Next.js application so it can be accessed from any device.

## Option 1: Vercel (Recommended - Easiest for Next.js)

Vercel is made by the creators of Next.js and offers the easiest deployment experience.

### Prerequisites
1. A GitHub account (you already have this)
2. A Vercel account (free tier available)

### Steps:

1. **Push your code to GitHub** (if not already done)
   ```bash
   git add .
   git commit -m "Ready for deployment"
   git push origin main
   ```

2. **Sign up for Vercel**
   - Go to https://vercel.com
   - Click "Sign Up" and choose "Continue with GitHub"
   - Authorize Vercel to access your GitHub account

3. **Import your project**
   - Click "Add New..." → "Project"
   - Find your `House-Hero-development` repository
   - Click "Import"

4. **Configure your project**
   - **Framework Preset**: Next.js (should auto-detect)
   - **Root Directory**: `nextjs-app` (important!)
   - **Build Command**: `npm run build` (default)
   - **Output Directory**: `.next` (default)
   - **Install Command**: `npm install` (default)

5. **Environment Variables**
   Add these in the Vercel dashboard under "Environment Variables":
   ```
   DATABASE_URL=your_database_url_here
   ```
   
   **For production, you'll need a database:**
   - **Option A**: Use Vercel Postgres (easiest)
     - In Vercel dashboard, go to Storage → Create Database → Postgres
     - Copy the connection string and add it as `DATABASE_URL`
   
   - **Option B**: Use Supabase (free tier available)
     - Sign up at https://supabase.com
     - Create a new project
     - Go to Settings → Database → Connection string
     - Copy the connection string and add it as `DATABASE_URL`
   
   - **Option C**: Use Railway, Render, or PlanetScale
     - All offer free tiers for PostgreSQL

6. **Deploy**
   - Click "Deploy"
   - Wait for the build to complete (usually 2-3 minutes)
   - Your app will be live at `your-project-name.vercel.app`

7. **Update Prisma for production**
   After deployment, you'll need to run migrations:
   ```bash
   # In Vercel dashboard, go to your project → Settings → Environment Variables
   # Add a build command override:
   ```
   Or add this to your `package.json`:
   ```json
   "scripts": {
     "postinstall": "prisma generate && prisma db push"
   }
   ```

### Custom Domain (Optional)
- In Vercel dashboard → Settings → Domains
- Add your custom domain
- Follow DNS configuration instructions

---

## Option 2: Netlify

### Steps:
1. Sign up at https://netlify.com
2. Connect your GitHub account
3. Click "New site from Git"
4. Select your repository
5. Configure:
   - **Base directory**: `nextjs-app`
   - **Build command**: `npm run build`
   - **Publish directory**: `.next`
6. Add environment variables
7. Deploy

---

## Option 3: Railway

### Steps:
1. Sign up at https://railway.app
2. Click "New Project" → "Deploy from GitHub repo"
3. Select your repository
4. Set root directory to `nextjs-app`
5. Railway will auto-detect Next.js
6. Add environment variables
7. Railway provides a PostgreSQL database automatically

---

## Option 4: Render

### Steps:
1. Sign up at https://render.com
2. Click "New" → "Web Service"
3. Connect your GitHub repository
4. Configure:
   - **Name**: Your app name
   - **Environment**: Node
   - **Build Command**: `cd nextjs-app && npm install && npm run build`
   - **Start Command**: `cd nextjs-app && npm start`
5. Add environment variables
6. Deploy

---

## Important: Database Migration

Before deploying, you need to set up a production database:

### Using Vercel Postgres:
1. In Vercel dashboard → Storage → Create Database
2. Select Postgres
3. Copy the connection string
4. Update your `.env` or environment variables

### Using Supabase:
1. Create account at https://supabase.com
2. Create new project
3. Go to Settings → Database
4. Copy connection string (use the "URI" format)
5. Update your Prisma schema if needed:
   ```prisma
   datasource db {
     provider = "postgresql"
     url      = env("DATABASE_URL")
   }
   ```

### After setting up database:
```bash
# Update DATABASE_URL in your environment
# Then run migrations
npx prisma db push
npx prisma generate
```

---

## Quick Start Checklist

- [ ] Code is pushed to GitHub
- [ ] Vercel account created
- [ ] Project imported to Vercel
- [ ] Root directory set to `nextjs-app`
- [ ] Production database created (Vercel Postgres/Supabase/etc.)
- [ ] DATABASE_URL environment variable added
- [ ] Build command configured
- [ ] Deploy button clicked
- [ ] App is live!

---

## Troubleshooting

### Build fails:
- Check that root directory is set to `nextjs-app`
- Verify all environment variables are set
- Check build logs in Vercel dashboard

### Database connection errors:
- Verify DATABASE_URL is correct
- Ensure database allows connections from Vercel IPs
- Run `npx prisma db push` to create tables

### App works locally but not in production:
- Check environment variables
- Verify database is accessible
- Check server logs in Vercel dashboard

---

## Recommended: Vercel + Vercel Postgres

This is the easiest combination:
1. Deploy to Vercel (automatic Next.js optimization)
2. Use Vercel Postgres (integrated, no separate setup)
3. Everything in one dashboard
4. Free tier is generous for small apps

---

## Need Help?

- Vercel Docs: https://vercel.com/docs
- Next.js Deployment: https://nextjs.org/docs/deployment
- Prisma Deployment: https://www.prisma.io/docs/guides/deployment

