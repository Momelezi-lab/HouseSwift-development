# Database Setup Instructions

## ✅ Database Created Successfully!

Your SQLite database has been created at `nextjs-app/dev.db`.

## Next Steps

### 1. Create `.env.local` file

Create a file named `.env.local` in the `nextjs-app` folder with the following content:

```env
# Database Configuration (SQLite for local development)
DATABASE_URL="file:./dev.db"

# JWT Configuration
JWT_SECRET=your-secret-key-change-in-production-min-32-chars-please-use-a-strong-random-string
JWT_ACCESS_TOKEN_EXPIRE=15m
JWT_REFRESH_TOKEN_EXPIRE=7d

# Next.js API URL (leave empty for same-origin)
NEXT_PUBLIC_API_URL=
```

### 2. Restart Your Dev Server

**Important:** Stop your current dev server (Ctrl+C) and restart it:

```bash
cd nextjs-app
npm run dev
```

### 3. Create Admin User (Optional)

If you need to create an admin user, you can:

1. Sign up through the app as a regular user
2. Then manually update the database to set the role to 'admin'

Or use the seed script if available:
```bash
npm run db:seed
```

## Troubleshooting

### If you still get "Database connection failed":

1. **Check `.env.local` exists** in `nextjs-app/` folder
2. **Verify DATABASE_URL** is set to `file:./dev.db`
3. **Restart the dev server** after creating `.env.local`
4. **Check `dev.db` exists** in `nextjs-app/` folder

### If Prisma client generation fails:

The EPERM error is normal if the dev server is running. The database is still created. You can:
- Stop the dev server
- Run `npx prisma generate`
- Restart the dev server

## Database Location

- **SQLite Database**: `nextjs-app/dev.db`
- **Prisma Schema**: `nextjs-app/prisma/schema.prisma`

## For Production (Vercel)

When deploying to Vercel, you'll need to:
1. Use PostgreSQL (not SQLite)
2. Update `prisma/schema.prisma` to use `provider = "postgresql"`
3. Set `DATABASE_URL` in Vercel environment variables

See `VERCEL_DEPLOYMENT.md` for details.

