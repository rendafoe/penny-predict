'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { WalletState } from '@/types'
import { useEffect, useState } from 'react'

const navLinks = [
  { href: '/markets',     label: 'Markets' },
  { href: '/portfolio',   label: 'Portfolio' },
  { href: '/leaderboard', label: 'Leaderboard' },
  { href: '/wallet',      label: 'Wallet' },
  { href: '/rules',       label: 'Rules' },
]

export default function TopNav() {
  const pathname = usePathname()
  const router = useRouter()
  const [wallet, setWallet] = useState<WalletState | null>(null)
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    fetch('/api/wallet')
      .then((r) => r.json())
      .then(setWallet)
      .catch(() => {})
  }, [pathname])

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <header className="sticky top-0 z-50 bg-bg-surface border-b border-border-subtle">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14">
          {/* Logo */}
          <Link href="/markets" className="flex items-center gap-2 shrink-0">
            <span className="text-lg font-bold tracking-tight">
              <span className="text-accent">Penny</span>
              <span className="text-text-primary">Predict</span>
            </span>
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-1">
            {navLinks.map(({ href, label }) => {
              const active = pathname.startsWith(href)
              return (
                <Link
                  key={href}
                  href={href}
                  className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
                    active
                      ? 'text-text-primary bg-bg-elevated'
                      : 'text-text-secondary hover:text-text-primary hover:bg-bg-elevated'
                  }`}
                >
                  {label}
                </Link>
              )
            })}
          </nav>

          {/* Wallet balance + logout */}
          <div className="hidden md:flex items-center gap-3">
            {wallet && (
              <Link
                href="/wallet"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-bg-elevated border border-border-subtle hover:border-border-default transition-colors"
              >
                <span className="text-xs text-text-muted">Balance</span>
                <span className="text-sm font-semibold font-mono text-accent tabular-nums">
                  ${wallet.total_portfolio_value.toFixed(2)}
                </span>
                {wallet.start_fresh_eligible && (
                  <span className="w-2 h-2 rounded-full bg-warning animate-pulse" title="Start Fresh available" />
                )}
              </Link>
            )}
            <button onClick={handleLogout} className="btn-ghost text-xs py-1 px-2">
              Sign out
            </button>
          </div>

          {/* Mobile menu button */}
          <button
            className="md:hidden btn-ghost p-2"
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label="Toggle menu"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              {menuOpen
                ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              }
            </svg>
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="md:hidden border-t border-border-subtle bg-bg-surface px-4 py-3 space-y-1 animate-fade-in">
          {navLinks.map(({ href, label }) => {
            const active = pathname.startsWith(href)
            return (
              <Link
                key={href}
                href={href}
                onClick={() => setMenuOpen(false)}
                className={`block px-3 py-2 rounded text-sm font-medium transition-colors ${
                  active
                    ? 'text-text-primary bg-bg-elevated'
                    : 'text-text-secondary hover:text-text-primary'
                }`}
              >
                {label}
              </Link>
            )
          })}
          {wallet && (
            <div className="pt-2 border-t border-border-subtle">
              <div className="text-xs text-text-muted mb-1">Portfolio value</div>
              <div className="text-lg font-semibold font-mono text-accent">
                ${wallet.total_portfolio_value.toFixed(2)}
              </div>
            </div>
          )}
          <button onClick={handleLogout} className="btn-ghost w-full mt-2 text-sm">
            Sign out
          </button>
        </div>
      )}
    </header>
  )
}
