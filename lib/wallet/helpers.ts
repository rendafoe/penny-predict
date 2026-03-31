import type { DbPosition, DbMarket, WalletState } from '@/types'

export function computePositionValue(position: DbPosition, market: DbMarket): number {
  const price = position.side === 'yes' ? market.yes_price : market.no_price
  return position.shares * price
}

export function computePortfolioValue(
  cashBalance: number,
  positions: Array<{ position: DbPosition; market: DbMarket }>
): number {
  const positionsValue = positions.reduce(
    (sum, { position, market }) => sum + computePositionValue(position, market),
    0
  )
  return cashBalance + positionsValue
}

export function isStartFreshEligible(totalPortfolioValue: number, cooldownEndsAt: string | null): boolean {
  if (totalPortfolioValue > 0.10) return false
  if (!cooldownEndsAt) return true
  return new Date(cooldownEndsAt) < new Date()
}

export function formatCurrency(value: number, decimals = 2): string {
  return `$${Math.abs(value).toFixed(decimals)}`
}

export function formatPnl(pnl: number): string {
  const sign = pnl >= 0 ? '+' : '-'
  return `${sign}$${Math.abs(pnl).toFixed(2)}`
}

export function formatPct(pct: number): string {
  const sign = pct >= 0 ? '+' : ''
  return `${sign}${pct.toFixed(1)}%`
}

/** Compute mark-to-market unrealized P&L for an open position */
export function computeUnrealizedPnl(position: DbPosition, market: DbMarket) {
  const currentValue = computePositionValue(position, market)
  const unrealizedPnl = currentValue - position.total_cost
  const unrealizedPnlPct = position.total_cost > 0
    ? (unrealizedPnl / position.total_cost) * 100
    : 0
  return { currentValue, unrealizedPnl, unrealizedPnlPct }
}

/** Max allowed bet = 80% of cash balance */
export function maxBetAmount(cashBalance: number): number {
  return Math.floor(cashBalance * 0.80 * 10000) / 10000
}

/** Seconds remaining until timestamp */
export function secondsUntil(timestamp: string): number {
  return Math.max(0, Math.floor((new Date(timestamp).getTime() - Date.now()) / 1000))
}

/** Format countdown HH:MM:SS */
export function formatCountdown(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  return [h, m, s].map((v) => String(v).padStart(2, '0')).join(':')
}
