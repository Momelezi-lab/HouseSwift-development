# JWT Authentication Implementation

## ✅ Implemented

### Backend (API Routes)

1. **JWT Token Generation** (`src/lib/security/jwt.ts`)
   - Access token (short-lived, 15 minutes)
   - Refresh token (long-lived, 7 days)
   - Token verification functions
   - httpOnly cookie management

2. **Login Endpoint** (`/api/auth/login`)
   - Returns access token in response body
   - Sets refresh token in httpOnly cookie
   - Maintains backward compatibility

3. **Signup Endpoint** (`/api/auth/signup`)
   - Auto-login after signup
   - Returns access token
   - Sets refresh token in httpOnly cookie

4. **Refresh Endpoint** (`/api/auth/refresh`)
   - Token rotation (new access + refresh tokens)
   - Uses refresh token from httpOnly cookie
   - Returns new access token

5. **Logout Endpoint** (`/api/auth/logout`)
   - Clears refresh token cookie
   - Logs logout event

6. **Auth Middleware** (`src/lib/security/auth-middleware.ts`)
   - Verifies JWT tokens from Authorization header
   - Falls back to header-based auth for backward compatibility

### Frontend (Client-side)

1. **JWT Auth Utilities** (`src/lib/auth-jwt.ts`)
   - Token storage in localStorage
   - User data management
   - Token refresh function
   - Auth header generation

2. **API Client** (`src/lib/api.ts`)
   - Automatic token injection in requests
   - Automatic token refresh on 401 errors
   - Request queuing during token refresh
   - Logout on refresh failure

3. **Login Page** (`src/app/login/page.tsx`)
   - Stores access token on login
   - Stores user data
   - Backward compatible with old localStorage format

4. **Signup Page** (`src/app/signup/page.tsx`)
   - Stores access token on signup
   - Stores user data
   - Backward compatible

## 🔧 Configuration

### Environment Variables

Add to `.env.local`:

```env
JWT_SECRET=your-secret-key-change-in-production-min-32-chars
JWT_ACCESS_TOKEN_EXPIRE=15m
JWT_REFRESH_TOKEN_EXPIRE=7d
```

### Dependencies

Added to `package.json`:
- `jsonwebtoken` - JWT token generation/verification
- `@types/jsonwebtoken` - TypeScript types

## 📋 Usage

### Login Flow

1. User submits login form
2. Backend validates credentials
3. Backend generates access + refresh tokens
4. Access token returned in response
5. Refresh token set in httpOnly cookie
6. Frontend stores access token in localStorage
7. Frontend stores user data

### Token Refresh Flow

1. API request includes access token in Authorization header
2. If token expired (401), API client automatically:
   - Calls `/api/auth/refresh` with refresh token from cookie
   - Gets new access + refresh tokens
   - Retries original request with new access token
3. If refresh fails, user is logged out

### Logout Flow

1. Frontend calls `/api/auth/logout`
2. Backend clears refresh token cookie
3. Frontend clears access token and user data
4. User redirected to login

## 🔒 Security Features

1. **httpOnly Cookies**: Refresh tokens stored in httpOnly cookies (not accessible via JavaScript)
2. **Token Rotation**: New refresh token issued on each refresh
3. **Short-lived Access Tokens**: 15-minute expiration
4. **Automatic Refresh**: Seamless token refresh on expiration
5. **Secure Cookies**: Only sent over HTTPS in production

## 🔄 Backward Compatibility

- Old localStorage format still supported
- Falls back to header-based auth if JWT not present
- Existing code continues to work

## 📝 Next Steps

1. **Install Dependencies**:
   ```bash
   cd nextjs-app
   npm install jsonwebtoken @types/jsonwebtoken
   ```

2. **Set Environment Variables**:
   Add JWT_SECRET to `.env.local`

3. **Test**:
   - Login and verify tokens are stored
   - Make API calls and verify tokens are sent
   - Wait 15 minutes and verify token refresh works
   - Test logout

## ⚠️ Important Notes

1. **JWT_SECRET**: Must be at least 32 characters in production
2. **Token Storage**: Access tokens in localStorage (consider httpOnly cookies for production)
3. **CORS**: Ensure `withCredentials: true` is set for cookie-based auth
4. **HTTPS**: Use HTTPS in production for secure cookie transmission

