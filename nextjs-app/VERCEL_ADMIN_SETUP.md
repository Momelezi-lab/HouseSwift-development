# Setting Up Admin User on Vercel

## Problem
Admin logins aren't working on Vercel because the admin user doesn't exist in the production database.

## Solution: Create Admin User

You have **3 options** to create an admin user in your Vercel production database:

### Option 1: Use the API Endpoint (Easiest)

I've created an API endpoint that you can call once to create the admin user:

1. **After your Vercel deployment is live**, make a POST request to:
   ```
   https://your-app.vercel.app/api/admin/create-admin
   ```

2. **Request body:**
   ```json
   {
     "email": "admin@homeswift.com",
     "password": "admin123",
     "name": "Admin User"
   }
   ```

3. **You can do this using:**
   - **Browser Console** (on your deployed site):
     ```javascript
     fetch('/api/admin/create-admin', {
       method: 'POST',
       headers: { 'Content-Type': 'application/json' },
       body: JSON.stringify({
         email: 'admin@homeswift.com',
         password: 'admin123',
         name: 'Admin User'
       })
     }).then(r => r.json()).then(console.log)
     ```
   
   - **curl** (from terminal):
     ```bash
     curl -X POST https://your-app.vercel.app/api/admin/create-admin \
       -H "Content-Type: application/json" \
       -d '{"email":"admin@homeswift.com","password":"admin123","name":"Admin User"}'
     ```
   
   - **Postman** or any API client

### Option 2: Use Vercel CLI (Recommended for Security)

1. **Install Vercel CLI** (if not already installed):
   ```bash
   npm i -g vercel
   ```

2. **Link to your project:**
   ```bash
   vercel link
   ```

3. **Pull environment variables:**
   ```bash
   vercel env pull .env.production
   ```

4. **Set DATABASE_URL in your local .env:**
   ```bash
   # Copy the DATABASE_URL from .env.production to your .env file
   ```

5. **Create admin user locally (connected to production DB):**
   ```bash
   cd nextjs-app
   npm run db:set-admin admin@homeswift.com admin123
   ```

### Option 3: Use Prisma Studio (Visual)

1. **Connect to production database:**
   ```bash
   cd nextjs-app
   # Set DATABASE_URL to your production database
   export DATABASE_URL="your-production-database-url"
   npx prisma studio
   ```

2. **Manually create admin user:**
   - Open Prisma Studio (usually http://localhost:5555)
   - Go to "User" model
   - Click "Add record"
   - Fill in:
     - email: `admin@homeswift.com`
     - name: `Admin User`
     - passwordHash: (you'll need to hash the password - see below)
     - role: `admin`
     - registered: (today's date in YYYY-MM-DD format)

3. **To hash password:**
   ```bash
   node -e "const bcrypt = require('bcryptjs'); bcrypt.hash('admin123', 10).then(h => console.log(h))"
   ```

## Verify Admin User Exists

After creating the admin user, verify it exists:

```bash
# Using the API
curl https://your-app.vercel.app/api/admin/create-admin \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@homeswift.com","password":"admin123"}'
```

If the user already exists, it will update them to admin role.

## Troubleshooting

### "Database connection failed"
- Check that `DATABASE_URL` is set in Vercel environment variables
- Verify the connection string is correct
- Ensure the database allows connections from Vercel's IP addresses

### "User not found" when logging in
- The admin user hasn't been created yet
- Use one of the options above to create it

### "Invalid email or password"
- Verify the email and password are correct
- Check Vercel logs for more details
- Try creating the admin user again using Option 1

## Security Note

⚠️ **Important**: After creating the admin user, you may want to:
1. Remove or protect the `/api/admin/create-admin` endpoint
2. Add authentication/authorization to prevent unauthorized admin creation
3. Change the default password immediately after first login

## Quick Setup Script

You can also create a one-time setup script. Add this to your `package.json`:

```json
"scripts": {
  "setup:production": "tsx prisma/set-admin.ts admin@homeswift.com admin123"
}
```

Then run it with production DATABASE_URL:
```bash
DATABASE_URL="your-production-url" npm run setup:production
```

