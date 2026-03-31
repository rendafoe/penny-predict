import { NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { isStartFreshEligible } from '@/lib/wallet/helpers'
import type { DbPosition, DbMarket, WalletState } from '@/types'

export async function GET() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const service = createServiceClient()

  const [walletRes, positionsRes] = await Promise.all([
    service.from('wallets').select('*').eq('user_id', user.id).single(),
    service
      .from('positions')
      .select('*, market:markets(*)')
      .eq('user_id', user.id)
      .eq('status', 'open'),
  ])

  if (walletRes.error || !walletRes.data) {
    return NextResponse.json({ error: 'Wallet not found' }, { status: 404 })
  }

  const wallet = walletRes.data
  const positions = (positionsRes.data ?? []) as Array<DbPosition & { market: DbMarket }>

  const openPositionsValue = positions.reduce((sum, p) => {
    const price = p.side === 'yes' ? p.market.yes_price : p.market.no_price
    return sum + p.shares * price
  }, 0)

  const totalPortfolioValue = wallet.cash_balance + openPositionsValue
  const startFreshEligible = isStartFreshEligible(totalPortfolioValue, wallet.cooldown_ends_at)

  // Update start_fresh_eligible if it changed
  if (startFreshEligible !== wallet.start_fresh_eligible) {
    await service
      .from('wallets')
      .update({ start_fresh_eligible: startFreshEligible })
      .eq('user_id', user.id)
  }

  const state: WalletState = {
    cash_balance: wallet.cash_balance,
    open_positions_value: openPositionsValue,
    total_portfolio_value: totalPortfolioValue,
    start_fresh_eligible: startFreshEligible,
    cooldown_ends_at: wallet.cooldown_ends_at,
    top_up_count: wallet.top_up_count,
  }

  return NextResponse.json(state)
}
