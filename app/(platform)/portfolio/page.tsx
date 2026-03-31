'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import type { PositionWithMarket, WalletState } from '@/types'
import { formatCurrency, formatPnl, formatPct } from '@/lib/wallet/helpers'

export default function PortfolioPage() {
  const [positions, setPositions] = useState<PositionWithMarket[]>([])
  const [wallet, setWallet] = useState<WalletState | null>(null)
  const [loading, setLoading] = useState(true)

  async function load() {
    const [posRes, walRes] = await Promise.all([
      fetch('/api/positions').then((r) => r.json()),
      fetch('/api/wallet').then((r) => r.json()),
    ])
    setPositions(posRes.positions ?? [])
    setWallet(walRes)
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const totalValue = positions.reduce((s, p) => s + p.current_value, 0)
  const totalCost = positions.reduce((s, p) => s + p.total_cost, 0)
  const totalPnl = totalValue - totalCost

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="skeleton h-8 w-48 rounded" />
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="card p-5 skeleton h-24" />
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-text-primary">Portfolio</h1>
        <p className="text-sm text-text-muted mt-0.5">Your open positions</p>
      </div>

      {/* Summary cards */}
      {wallet && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="card p-4">
            <div className="stat-label">Cash balance</div>
            <div className="stat-value">${wallet.cash_balance.toFixed(2)}</div>
          </div>
          <div className="card p-4">
            <div className="stat-label">Positions value</div>
            <div className="stat-value">${totalValue.toFixed(2)}</div>
          </div>
          <div className="card p-4">
            <div className="stat-label">Total portfolio</div>
            <div className="stat-value text-accent">${wallet.total_portfolio_value.toFixed(2)}</div>
          </div>
          <div className="card p-4">
            <div className="stat-label">Unrealized P&L</div>
            <div className={`stat-value ${totalPnl >= 0 ? 'text-yes' : 'text-no'}`}>
              {formatPnl(totalPnl)}
            </div>
          </div>
        </div>
      )}

      {/* Positions list */}
      {positions.length === 0 ? (
        <div className="card p-12 text-center">
          <p className="text-text-muted mb-4">No open positions yet.</p>
          <Link href="/markets" className="btn-primary">Browse Markets</Link>
        </div>
      ) : (
        <div className="space-y-3">
          {positions.map((p) => (
            <PositionRow key={p.id} position={p} onSold={load} />
          ))}
        </div>
      )}
    </div>
  )
}

function PositionRow({ position, onSold }: { position: PositionWithMarket; onSold: () => void }) {
  const [selling, setSelling] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSellAll() {
    setSelling(true)
    setError(null)
    const res = await fetch('/api/positions/sell', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ position_id: position.id, shares_to_sell: position.shares }),
    })
    const data = await res.json()
    if (!res.ok) {
      setError(data.error)
      setSelling(false)
    } else {
      onSold()
    }
  }

  const pnlColor = position.unrealized_pnl >= 0 ? 'text-yes' : 'text-no'

  return (
    <div className={`card p-5 border-l-2 ${position.side === 'yes' ? 'border-l-yes' : 'border-l-no'}`}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <Link
            href={`/markets/${position.market_id}`}
            className="text-sm font-medium text-text-primary hover:text-white transition-colors line-clamp-2"
          >
            {position.market.question}
          </Link>
          <div className="flex items-center gap-2 mt-2">
            <span className={`badge-${position.side}`}>{position.side.toUpperCase()}</span>
            <span className="text-xs text-text-muted">{position.shares.toFixed(4)} shares</span>
            <span className="text-xs text-text-muted">@ ${position.avg_cost_per_share.toFixed(4)}</span>
          </div>
        </div>

        <div className="text-right shrink-0 space-y-1">
          <div className={`text-sm font-semibold font-mono ${pnlColor}`}>
            {formatCurrency(position.current_value)}
          </div>
          <div className={`text-xs font-mono ${pnlColor}`}>
            {formatPnl(position.unrealized_pnl)} ({formatPct(position.unrealized_pnl_pct)})
          </div>
          <button
            onClick={handleSellAll}
            disabled={selling || position.market.status !== 'active'}
            className="btn-secondary text-xs px-2 py-1 mt-1"
          >
            {selling ? 'Selling…' : 'Sell All'}
          </button>
        </div>
      </div>

      {error && (
        <div className="mt-2 text-xs text-no">{error}</div>
      )}
    </div>
  )
}
