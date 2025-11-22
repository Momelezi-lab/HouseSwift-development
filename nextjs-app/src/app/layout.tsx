import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { Providers } from './providers'
import { Navigation } from '@/components/Navigation'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'HomeSwift - Home Services',
  description: 'Professional home services at your doorstep',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" style={{ colorScheme: 'light' }}>
      <head>
        <meta name="color-scheme" content="light" />
      </head>
      <body className={inter.className} style={{ colorScheme: 'light' }}>
        <Providers>
          <Navigation />
          {children}
        </Providers>
      </body>
    </html>
  )
}

