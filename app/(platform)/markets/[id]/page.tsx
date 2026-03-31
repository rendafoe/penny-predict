'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import type { DbMarket, DbPosition, WalletState } from '@/types'
import { formatCurrency, maxBetAmount } from '@/lib/wallet/helpers'

export default function MarketDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()

  const [market, setMarket] = useState<DbMarket | null>(null)
  const [position, setPosition] = useState<DbPosition | null>(null)
  const [wallet, setWallet] = useState<WalletState | null>(null)
  const [loading, setLoading] = useState(true)

  const [side, setSide] = useState<'yes' | 'no'>('yes')
  const [amount, setAmount] = useState('')
  const [buying, setBuying] = useState(false)
  const [selling, setSelling] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  useEffect(() => {
    Promise.all([
      fetch(`/api/markets/${id}`).then((r) => r.json()),
      fetch('/api/wallet').then((r) => r.json()),
    ]).then(([marketData, walletData]) => {
      setMarket(marketData.market)
      setPosition(marketData.user_position)
      setWallet(walletData)
      setLoading(false)
    })
  }, [id])

  async function handleBuy(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSuccess(null)
    setBuying(true)

    const res = await fetch('/api/positions/buy', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ market_id: id, side, dollar_amount: parseFloat(amount) }),
    })
    const data = await res.json()

    if (!res.ok) {
      setError(data.error)
    } else {
      const shares = parseFloat(amount) / (side === 'yes' ? market!.yes_price : market!.no_price)
      setSuccess(`Bought ${shares.toFixed(4)} ${side.toUpperCase()} shares for ${formatCurrency(parseFloat(amount))}`)
      setAmount('')
      // Refresh
      const [md, wd] = await Promise.all([
        fetch(`/api/markets/${id}`).then((r) => r.json()),
        fetch('/api/wallet').then((r) => r.json()),
      ])
      setMarket(md.market)
      setPosition(md.user_position)
      setWallet(wd)
    }
    setBuying(false)
  }

  async function handleSellAll() {
    if (!position) return
    setError(null)
    setSuccess(null)
    setSelling(true)

    const res = await fetch('/api/positions/sell', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ position_id: position.id, shares_to_sell: position.shares }),
    })
    const data = await res.json()

    if (!res.ok) {
      setError(data.error)
    } else {
      setSuccess(`Sold position for ${formatCurrency(data.proceeds)} (P&L: ${data.realized_pnl >= 0 ? '+' : ''}${formatCurrency(data.realized_pnl)})`)
      const [md, wd] = await Promise.all([
        fetch(`/api/markets/${id}`).then((r) => r.json()),
        fetch('/api/wallet').then((r) => r.json()),
      ])
      setMarket(md.market)
      setPosition(md.user_position)
      setWallet(wd)
    }
    setSelling(false)
  }

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto space-y-4">
        <div className="skeleton h-8 w-2/3 rounded" />
        <div className="skeleton h-48 rounded-lg" />
      </div>
    )
  }

  if (!market) {
    return <div className="text-center py-16 text-text-muted">Market not found.</div>
  }

  const yesProb = Math.round(market.yes_price * 100)
  const price = side === 'yes' ? market.yes_price : market.no_price
  const amountNum = parseFloat(amount) || 0
  const potentialShares = amountNum > 0 ? amountNum / price : 0
  const potentialReturn = potentialShares * 1.0
  const maxBet = wallet ? maxBetAmount(wallet.cash_balance) : 0
  const inCooldown = wallet?.cooldown_ends_at && new Date(wallet.cooldown_ends_at) > new Date()
  const canTrade = market.status === 'active' && !inCooldown

  // Current position value
  const positionCurrentPrice = position
    ? (position.side === 'yes' ? market.yes_price : market.no_price)
    : 0
  const positionCurrentValue = position ? position.shares * positionCurrentPrice : 0
  const positionPnl = position ? positionCurrentValue - position.total_cost : 0

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Back */}
      <button onClick={() => router.back()} className="btn-ghost text-sm px-0">
        ← Back to Markets
      </button>

      {/* Market header */}
      <div className="card p-6 space-y-4">
        <div className="flex items-start gap-3">
          <span className="badge-neutral shrink-0">{market.category}</span>
          {market.status === 'resolved' && (
            <span className={`badge-${market.resolution === 'yes' ? 'yes' : 'no'} shrink-0`}>
              Resolved {market.resolution?.toUpperCase()}
            </span>
          )}
        </div>
        <h1 className="text-xl font-semibold text-text-primary leading-snug">{market.question}</h1>

        {/* Probability bar */}
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <div className="text-2xl font-bold text-yes font-mono">{yesProb}%</div>
            <div className="text-right">
              <div className="text-xs text-text-muted">probability YES</div>
              <div className="text-xs text-text-muted">NO: {100 - yesProb}%</div>
            </div>
          </div>
          <div className="h-2 rounded-full bg-bg-elevated overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-yes to-yes/60 transition-all"
              style={{ width: `${yesProb}%` }}
            />
          </div>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-4 pt-2 border-t border-border-subtle">
          <div>
            <div className="stat-label">Volume</div>
            <div className="stat-value text-base">${(market.volume / 1000).toFixed(0)}k</div>
          </div>
          <div>
            <div className="stat-label">Liquidity</div>
            <div className="stat-value text-base">${(market.liquidity / 1000).toFixed(0)}k</div>
          </div>
          <div>
            <div className="stat-label">Closes</div>
            <div className="stat-value text-base text-sm">
              {market.end_date ? new Date(market.end_date).toLocaleDateString() : '—'}
            </div>
          </div>
        </div>
      </div>

      {/* Open position card */}
      {position && (
        <div className={`card-elevated p-5 border-l-2 ${position.side === 'yes' ? 'border-l-yes' : 'border-l-no'}`}>
          <div className="flex items-start justify-between mb-4">
            <div>
              <div className="text-xs text-text-muted mb-1">Your open position</div>
              <span className={`badge-${position.side}`}>{position.side.toUpperCase()}</span>
            </div>
            {canTrade && (
              <button
                onClick={handleSellAll}
                disabled={selling}
                className="btn-secondary text-xs px-3 py-1.5"
              >
                {selling ? 'Selling…' : 'Sell All'}
              </button>
            )}
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <div className="stat-label">Shares</div>
              <div className="data-value text-sm">{position.shares.toFixed(4)}</div>
            </div>
            <div>
              <div className="stat-label">Cost basis</div>
              <div className="data-value text-sm">{formatCurrency(position.total_cost)}</div>
            </div>
            <div>
              <div className="stat-label">Current value</div>
              <div className={`data-value text-sm ${positionPnl >= 0 ? 'text-yes' : 'text-no'}`}>
                {formatCurrency(positionCurrentValue)}
                <span className="text-xs ml-1">
                  ({positionPnl >= 0 ? '+' : ''}{formatCurrency(positionPnl)})
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Buy panel */}
      {market.status === 'active' && (
        <div className="card p-6 space-y-5">
          <h2 className="font-semibold text-text-primary">Place a Position</h2>

          {inCooldown ? (
            <div className="p-4 rounded bg-warning/10 border border-warning/30 text-sm text-warning">
              You&apos;re in Start Fresh cooldown. Trading resumes after cooldown expires.
            </div>
          ) : (
            <form onSubmit={handleBuy} className="space-y-4">
              {/* YES / NO selector */}
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setSide('yes')}
                  className={`py-3 rounded-md font-semibold text-sm transition-all ${
                    side === 'yes'
                      ? 'bg-yes text-bg-base shadow-yes-glow'
                      : 'bg-yes-muted border border-yes-dim text-yes hover:bg-yes/20'
                  }`}
                >
                  YES &nbsp;{yesProb}¢
                </button>
                <button
                  type="button"
                  onClick={() => setSide('no')}
                  className={`py-3 rounded-md font-semibold text-sm transition-all ${
                    side === 'no'
                      ? 'bg-no text-bg-base shadow-no-glow'
                      : 'bg-no-muted border border-no-dim text-no hover:bg-no/20'
                  }`}
                >
                  NO &nbsp;{100 - yesProb}¢
                </button>
              </div>

              {/* Amount */}
              <div>
                <div className="flex justify-between mb-1.5">
                  <label className="label mb-0">Amount ($)</label>
                  {wallet && (
                    <button
                      type="button"
                      onClick={() => setAmount(maxBet.toFixed(4))}
                      className="text-xs text-accent hover:text-accent-dim"
                    >
                      Max ${maxBet.toFixed(2)}
                    </button>
                  )}
                </div>
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  step="0.01"
                  min="0.01"
                  max={maxBet}
                  className="input font-mono"
                  required
                />
              </div>

              {/* Payout preview */}
              {amountNum > 0 && (
                <div className="p-3 rounded bg-bg-elevated border border-border-subtle text-sm space-y-1">
                  <div className="flex justify-between text-text-muted">
                    <span>Shares to buy</span>
                    <span className="font-mono text-text-primary">{potentialShares.toFixed(4)}</span>
                  </div>
                  <div className="flex justify-between text-text-muted">
                    <span>Potential return (if {side.toUpperCase()} wins)</span>
                    <span className="font-mono text-yes">{formatCurrency(potentialReturn)}</span>
                  </div>
                  <div className="flex justify-between text-text-muted">
                    <span>You&apos;re risking</span>
                    <span className="font-mono">{formatCurrency(amountNum)}</span>
                  </div>
                </div>
              )}

              {error && (
                <div className="p-3 rounded bg-no-muted border border-no-dim text-no text-sm">{error}</div>
              )}
              {success && (
                <div className="p-3 rounded bg-yes-muted border border-yes-dim text-yes text-sm">{success}</div>
              )}

              <button
                type="submit"
                disabled={buying || !amount || amountNum <= 0}
                className={`w-full py-3 rounded font-semibold text-sm transition-all active:scale-[0.98] disabled:opacity-40 ${
                  side === 'yes'
                    ? 'bg-yes text-bg-base hover:bg-yes/90'
                    : 'bg-no text-bg-base hover:bg-no/90'
                }`}
              >
                {buying ? 'Placing position…' : `Buy ${side.toUpperCase()} for ${formatCurrency(amountNum || 0)}`}
              </button>
            </form>
          )}
        </div>
      )}

      {market.status === 'resolved' && (
        <div className="card p-6 text-center">
          <div className={`text-3xl font-bold mb-2 ${market.resolution === 'yes' ? 'text-yes' : 'text-no'}`}>
            Resolved {market.resolution?.toUpperCase()}
          </div>
          <p className="text-text-muted text-sm">
            This market has been settled. Winners have been paid out.
          </p>
        </div>
      )}
    </div>
  )
}
