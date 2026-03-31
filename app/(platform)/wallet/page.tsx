'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import type { WalletState, DbTransaction } from '@/types'
import { formatCountdown, secondsUntil } from '@/lib/wallet/helpers'

export default function WalletPage() {
  const [wallet, setWallet] = useState<WalletState | null>(null)
  const [transactions, setTransactions] = useState<DbTransaction[]>([])
  const [loading, setLoading] = useState(true)
  const [countdown, setCountdown] = useState(0)

  // Cashout form state
  const [showCashout, setShowCashout] = useState(false)
  const [paypalEmail, setPaypalEmail] = useState('')
  const [cashoutAmount, setCashoutAmount] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [cashoutError, setCashoutError] = useState<string | null>(null)
  const [cashoutSuccess, setCashoutSuccess] = useState(false)

  // Start Fresh state
  const [startingFresh, setStartingFresh] = useState(false)
  const [freshError, setFreshError] = useState<string | null>(null)

  const loadData = useCallback(async () => {
    const [walRes, txRes] = await Promise.all([
      fetch('/api/wallet').then((r) => r.json()),
      fetch('/api/wallet/transactions?limit=20').then((r) => r.json()),
    ])
    setWallet(walRes)
    setTransactions(txRes.transactions ?? [])
    if (walRes.cooldown_ends_at) {
      setCountdown(secondsUntil(walRes.cooldown_ends_at))
    }
    setLoading(false)
  }, [])

  useEffect(() => { loadData() }, [loadData])

  // Countdown timer
  useEffect(() => {
    if (!wallet?.cooldown_ends_at) return
    const interval = setInterval(() => {
      const secs = secondsUntil(wallet.cooldown_ends_at!)
      setCountdown(secs)
      if (secs <= 0) {
        clearInterval(interval)
        loadData()
      }
    }, 1000)
    return () => clearInterval(interval)
  }, [wallet?.cooldown_ends_at, loadData])

  async function handleStartFresh() {
    setStartingFresh(true)
    setFreshError(null)
    const res = await fetch('/api/wallet/start-fresh', { method: 'POST' })
    const data = await res.json()
    if (!res.ok) {
      setFreshError(data.error)
      setStartingFresh(false)
    } else {
      await loadData()
      setStartingFresh(false)
    }
  }

  async function handleCashoutRequest(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setCashoutError(null)
    const res = await fetch('/api/wallet/cashout-request', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount: parseFloat(cashoutAmount), paypal_email: paypalEmail }),
    })
    const data = await res.json()
    if (!res.ok) {
      setCashoutError(data.error)
      setSubmitting(false)
    } else {
      setCashoutSuccess(true)
      setSubmitting(false)
    }
  }

  const txTypeLabel: Record<string, string> = {
    seed: 'Welcome bonus',
    buy: 'Bought position',
    sell: 'Sold position',
    settle_win: 'Market won',
    settle_loss: 'Market lost',
    forfeit: 'Forfeited',
    top_up: 'Start Fresh credit',
    cashout_request: 'Cashout request',
  }

  if (loading) {
    return (
      <div className="max-w-xl mx-auto space-y-4">
        <div className="skeleton h-32 rounded-lg" />
        <div className="skeleton h-48 rounded-lg" />
      </div>
    )
  }

  const inCooldown = wallet?.cooldown_ends_at && new Date(wallet.cooldown_ends_at) > new Date()
  const cashoutEligible = (wallet?.total_portfolio_value ?? 0) >= 200

  return (
    <div className="max-w-xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-text-primary">Wallet</h1>
        <p className="text-sm text-text-muted mt-0.5">Balance, history, and cashout</p>
      </div>

      {/* Balance card */}
      <div className="card p-6 space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <div className="stat-label">Cash balance</div>
            <div className="text-3xl font-bold font-mono text-text-primary">
              ${wallet?.cash_balance.toFixed(2)}
            </div>
          </div>
          <div>
            <div className="stat-label">Total portfolio</div>
            <div className="text-3xl font-bold font-mono text-accent">
              ${wallet?.total_portfolio_value.toFixed(2)}
            </div>
          </div>
        </div>

        {/* Progress to cashout */}
        <div>
          <div className="flex justify-between text-xs text-text-muted mb-1.5">
            <span>Progress to $200 cashout</span>
            <span className="tabular-nums">{Math.min(100, ((wallet?.total_portfolio_value ?? 0) / 200) * 100).toFixed(1)}%</span>
          </div>
          <div className="h-2 rounded-full bg-bg-elevated overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-accent to-yes transition-all"
              style={{ width: `${Math.min(100, ((wallet?.total_portfolio_value ?? 0) / 200) * 100)}%` }}
            />
          </div>
        </div>
      </div>

      {/* Cooldown panel */}
      {inCooldown && (
        <div className="card p-5 border border-warning/30 bg-warning/5 space-y-2">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-warning animate-pulse" />
            <span className="text-sm font-medium text-warning">Start Fresh cooldown active</span>
          </div>
          <div className="text-4xl font-mono font-bold text-text-primary tabular-nums">
            {formatCountdown(countdown)}
          </div>
          <p className="text-xs text-text-muted">
            Your $1.00 credit will be available when the timer reaches 00:00:00.
          </p>
        </div>
      )}

      {/* Start Fresh panel */}
      {wallet?.start_fresh_eligible && !inCooldown && (
        <div id="start-fresh" className="card p-5 border border-warning/30 bg-warning/5 space-y-3">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-warning animate-pulse" />
            <span className="text-sm font-medium text-warning">Start Fresh available</span>
          </div>
          <p className="text-sm text-text-secondary">
            Your portfolio is nearly empty. Watch a short ad to forfeit remaining positions and receive a fresh $1.00 credit after a 24-hour cooldown.
          </p>
          {freshError && (
            <div className="text-xs text-no">{freshError}</div>
          )}
          <button
            onClick={handleStartFresh}
            disabled={startingFresh}
            className="btn w-full py-2.5 bg-warning text-bg-base hover:bg-accent-dim font-semibold"
          >
            {startingFresh ? 'Processing…' : 'Watch Ad & Start Fresh'}
          </button>
          <p className="text-xs text-text-muted">
            * Ad integration coming soon. Button confirms forfeiture and starts cooldown.
          </p>
        </div>
      )}

      {/* Cashout section */}
      <div className="card p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-semibold text-text-primary">Cash Out</h2>
            <p className="text-xs text-text-muted mt-0.5">Minimum $200 · Account 30+ days old</p>
          </div>
          {cashoutEligible && !showCashout && (
            <button onClick={() => setShowCashout(true)} className="btn-primary text-sm px-4 py-2">
              Request Cashout
            </button>
          )}
        </div>

        {!cashoutEligible && (
          <div className="text-sm text-text-muted">
            Reach <span className="text-accent font-semibold">$200.00</span> total portfolio value to unlock cashout.
            You need <span className="font-semibold text-text-primary">${(200 - (wallet?.total_portfolio_value ?? 0)).toFixed(2)}</span> more.
          </div>
        )}

        {cashoutSuccess && (
          <div className="p-4 rounded bg-yes-muted border border-yes-dim text-yes text-sm">
            Cashout request submitted. We&apos;ll review and process it within 1-3 business days.
          </div>
        )}

        {showCashout && !cashoutSuccess && (
          <form onSubmit={handleCashoutRequest} className="space-y-3 pt-2 border-t border-border-subtle">
            <div>
              <label className="label">PayPal email</label>
              <input
                type="email"
                value={paypalEmail}
                onChange={(e) => setPaypalEmail(e.target.value)}
                className="input"
                placeholder="you@example.com"
                required
              />
            </div>
            <div>
              <label className="label">Amount to cash out ($)</label>
              <input
                type="number"
                value={cashoutAmount}
                onChange={(e) => setCashoutAmount(e.target.value)}
                className="input font-mono"
                placeholder="200.00"
                min="200"
                max={wallet?.cash_balance.toFixed(2)}
                step="0.01"
                required
              />
            </div>
            {cashoutError && (
              <div className="text-sm text-no">{cashoutError}</div>
            )}
            <div className="flex gap-2">
              <button type="submit" disabled={submitting} className="btn-primary flex-1">
                {submitting ? 'Submitting…' : 'Submit Request'}
              </button>
              <button type="button" onClick={() => setShowCashout(false)} className="btn-secondary px-4">
                Cancel
              </button>
            </div>
            <p className="text-xs text-text-muted">
              All cashouts are manually reviewed. Identity verification will be requested via email.
            </p>
          </form>
        )}
      </div>

      {/* Transaction history */}
      <div className="space-y-3">
        <h2 className="font-semibold text-text-primary">Transaction History</h2>
        {transactions.length === 0 ? (
          <div className="card p-6 text-center text-text-muted text-sm">No transactions yet.</div>
        ) : (
          <div className="card divide-y divide-border-subtle overflow-hidden">
            {transactions.map((tx) => (
              <div key={tx.id} className="flex items-center justify-between px-4 py-3 hover:bg-bg-elevated transition-colors">
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-text-primary">{txTypeLabel[tx.type] ?? tx.type}</div>
                  <div className="text-xs text-text-muted truncate">{tx.description}</div>
                  <div className="text-xs text-text-disabled mt-0.5">
                    {new Date(tx.created_at).toLocaleDateString('en-US', {
                      month: 'short', day: 'numeric', year: 'numeric',
                      hour: '2-digit', minute: '2-digit'
                    })}
                  </div>
                </div>
                <div className={`font-mono font-semibold tabular-nums shrink-0 ml-4 ${tx.amount >= 0 ? 'text-yes' : 'text-no'}`}>
                  {tx.amount >= 0 ? '+' : ''}${Math.abs(tx.amount).toFixed(4)}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
