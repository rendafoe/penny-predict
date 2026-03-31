// ─── Database Row Types ────────────────────────────────────────────────────

export interface DbUser {
  id: string
  username: string
  created_at: string
  cashout_eligible_at: string
  is_verified: boolean
  total_cashed_out: number
}

export interface DbWallet {
  id: string
  user_id: string
  cash_balance: number
  start_fresh_eligible: boolean
  cooldown_ends_at: string | null
  top_up_count: number
  updated_at: string
}

export interface DbMarket {
  id: string
  polymarket_condition_id: string
  polymarket_slug: string
  question: string
  category: string
  yes_price: number
  no_price: number
  liquidity: number
  volume: number
  end_date: string
  status: 'active' | 'resolved' | 'voided'
  resolution: 'yes' | 'no' | 'void' | null
  resolved_at: string | null
  last_synced_at: string
  created_at: string
}

export interface DbPosition {
  id: string
  user_id: string
  market_id: string
  side: 'yes' | 'no'
  shares: number
  avg_cost_per_share: number
  total_cost: number
  status: 'open' | 'sold' | 'settled_win' | 'settled_loss' | 'forfeited'
  opened_at: string
  closed_at: string | null
  pnl: number | null
}

export interface DbTransaction {
  id: string
  user_id: string
  type: 'seed' | 'buy' | 'sell' | 'settle_win' | 'settle_loss' | 'forfeit' | 'top_up' | 'cashout_request'
  amount: number
  position_id: string | null
  market_id: string | null
  description: string
  created_at: string
}

export interface DbCashoutRequest {
  id: string
  user_id: string
  amount: number
  status: 'pending' | 'approved' | 'paid' | 'rejected'
  paypal_email: string
  identity_verified: boolean
  requested_at: string
  processed_at: string | null
  notes: string | null
}

// ─── Leaderboard ──────────────────────────────────────────────────────────

export interface LeaderboardEntry {
  rank: number
  user_id: string
  username: string
  cash_balance: number
  open_positions_value: number
  total_value: number
  account_age_days: number
}

// ─── API Response Types ───────────────────────────────────────────────────

export interface WalletState {
  cash_balance: number
  open_positions_value: number
  total_portfolio_value: number
  start_fresh_eligible: boolean
  cooldown_ends_at: string | null
  top_up_count: number
}

export interface PositionWithMarket extends DbPosition {
  market: DbMarket
  current_value: number
  unrealized_pnl: number
  unrealized_pnl_pct: number
}

export interface MarketWithPosition extends DbMarket {
  user_position?: DbPosition | null
}

// ─── Polymarket API Types ─────────────────────────────────────────────────

export interface PolymarketMarket {
  conditionId: string
  slug: string
  question: string
  category: string
  liquidity: number
  volume: number
  endDate: string
  active: boolean
  closed: boolean
  resolved: boolean
  resolutionTime?: string
  outcomePrices?: string[] // JSON-encoded array ["0.70", "0.30"]
  tokens?: Array<{
    token_id: string
    outcome: string
    price: number
  }>
}

export interface PolymarketPrice {
  price: string
}

// ─── Trading ─────────────────────────────────────────────────────────────

export interface BuyRequest {
  market_id: string
  side: 'yes' | 'no'
  dollar_amount: number
}

export interface SellRequest {
  position_id: string
  shares_to_sell: number
}
