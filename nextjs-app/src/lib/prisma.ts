import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

// Log DATABASE_URL in development for debugging (first 20 chars only)
if (process.env.NODE_ENV === 'development') {
  const dbUrl = process.env.DATABASE_URL || 'NOT SET'
  console.log('[Prisma] DATABASE_URL:', dbUrl.substring(0, 30) + (dbUrl.length > 30 ? '...' : ''))
}

// Create Prisma client optimized for serverless (Vercel)
export const prisma = globalForPrisma.prisma ?? new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
})

// Handle connection errors gracefully
if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
}
