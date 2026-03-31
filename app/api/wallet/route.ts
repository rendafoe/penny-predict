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
    // Ensure public.users row exists (FK required before wallet insert)
    const { data: existingUser } = await service.from('users').select('id').eq('id', user.id).single()
    if (!existingUser) {
      const cashoutEligibleAt = new Date()
      cashoutEligibleAt.setDate(cashoutEligibleAt.getDate() + 30)
      const username = (user.user_metadata?.username ?? user.email!.split('@')[0]) as string
      await service.from('users').upsert({
        id: user.id,
        username,
        cashout_eligible_at: cashoutEligibleAt.toISOString(),
        is_verified: false,
        total_cashed_out: 0,
      }, { onConflict: 'id' })
    }

    // Seed wallet
    const { data: seeded } = await service
      .from('wallets')
      .insert({ user_id: user.id, cash_balance: 1.00, start_fresh_eligible: false, cooldown_ends_at: null, top_up_count: 0 })
      .select('*')
      .single()
    if (!seeded) return NextResponse.json({ error: 'Wallet setup failed' }, { status: 500 })
    await service.from('transactions').insert({ user_id: user.id, type: 'seed', amount: 1.00, description: 'Welcome bonus — $1.00 starting balance' })
    const state: WalletState = { cash_balance: 1.00, open_positions_value: 0, total_portfolio_value: 1.00, start_fresh_eligible: false, cooldown_ends_at: null, top_up_count: 0 }
    return NextResponse.json(state)
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
