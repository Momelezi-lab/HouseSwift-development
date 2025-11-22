'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'
import { Logo } from './Logo'
import { isAuthenticated, logout, getUser } from '@/lib/auth'

export function Navigation() {
  const pathname = usePathname()
  const router = useRouter()
  const [isOpen, setIsOpen] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [isLoggedIn, setIsLoggedIn] = useState(false)

  // Prevent hydration mismatch - only check pathname after mount
  useEffect(() => {
    setMounted(true)
    setIsLoggedIn(isAuthenticated())
    
    // Listen for storage changes (login/logout)
    const handleStorageChange = () => {
      setIsLoggedIn(isAuthenticated())
    }
    
    window.addEventListener('storage', handleStorageChange)
    // Also check on focus in case of same-tab login
    window.addEventListener('focus', handleStorageChange)
    
    return () => {
      window.removeEventListener('storage', handleStorageChange)
      window.removeEventListener('focus', handleStorageChange)
    }
  }, [])
  
  // Also check auth state when pathname changes (e.g., after login redirect)
  useEffect(() => {
    if (mounted) {
      setIsLoggedIn(isAuthenticated())
    }
  }, [pathname, mounted])
  
  // Use a default pathname during SSR to avoid mismatch
  const currentPath = mounted ? pathname : '/'

  const handleLogout = () => {
    logout()
    setIsLoggedIn(false)
    router.push('/')
    router.refresh()
  }

  const navItems = [
    { href: '/', label: 'Home', icon: '🏠' },
    { href: '/services/cleaning', label: 'Services', icon: '🧹' },
    { href: '/book-service', label: 'Book Now', icon: '📋' },
    { href: '/faq', label: 'FAQ', icon: '❓' },
    { href: '/contact', label: 'Contact', icon: '📞' },
  ]

  return (
    <nav className="bg-white/95 backdrop-blur-sm shadow-lg border-b border-gray-200 sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Logo size="md" />

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-1">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`px-4 py-2 rounded-xl font-semibold transition-all ${
                  currentPath === item.href
                    ? 'bg-[#1A531A] text-white shadow-lg'
                    : 'text-gray-700 hover:bg-[#90B890]/20'
                }`}
              >
                <span className="mr-2">{item.icon}</span>
                {item.label}
              </Link>
            ))}
            {isLoggedIn ? (
              <button
                onClick={handleLogout}
                className="ml-4 px-6 py-2 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 hover:shadow-lg transform hover:scale-105 transition-all"
              >
                Logout
              </button>
            ) : (
              <Link
                href="/login"
                className="ml-4 px-6 py-2 bg-[#1A531A] text-white rounded-xl font-bold hover:bg-[#1A531A]/90 hover:shadow-lg transform hover:scale-105 transition-all"
              >
                Sign In
              </Link>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="md:hidden p-2 rounded-lg hover:bg-gray-100"
          >
            <span className="text-2xl">{isOpen ? '✕' : '☰'}</span>
          </button>
        </div>

        {/* Mobile Navigation */}
        {isOpen && (
          <div className="md:hidden py-4 space-y-2 animate-fade-in">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setIsOpen(false)}
                className={`block px-4 py-3 rounded-xl font-semibold transition-all ${
                  currentPath === item.href
                    ? 'bg-[#1A531A] text-white'
                    : 'text-gray-700 hover:bg-[#90B890]/20'
                }`}
              >
                <span className="mr-2">{item.icon}</span>
                {item.label}
              </Link>
            ))}
            {isLoggedIn ? (
              <button
                onClick={() => {
                  setIsOpen(false)
                  handleLogout()
                }}
                className="block mt-4 px-4 py-3 bg-red-600 text-white rounded-xl font-bold text-center hover:bg-red-700 w-full"
              >
                Logout
              </button>
            ) : (
              <Link
                href="/login"
                onClick={() => setIsOpen(false)}
                className="block mt-4 px-4 py-3 bg-[#1A531A] text-white rounded-xl font-bold text-center hover:bg-[#1A531A]/90"
              >
                Sign In
              </Link>
            )}
          </div>
        )}
      </div>
    </nav>
  )
}

