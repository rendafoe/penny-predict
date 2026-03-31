import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { isStartFreshEligible } from '@/lib/wallet/helpers'
import type { SellRequest } from '@/types'

export async function POST(request: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body: SellRequest = await request.json()
  const { position_id, shares_to_sell } = body

  if (!position_id || !shares_to_sell) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }
  if (shares_to_sell <= 0) {
    return NextResponse.json({ error: 'Shares must be positive' }, { status: 400 })
  }

  const service = createServiceClient()

  const [positionRes, walletRes] = await Promise.all([
    service
      .from('positions')
      .select('*, market:markets(*)')
      .eq('id', position_id)
      .eq('user_id', user.id)
      .eq('status', 'open')
      .single(),
    service.from('wallets').select('*').eq('user_id', user.id).single(),
  ])

  if (positionRes.error || !positionRes.data) {
    return NextResponse.json({ error: 'Position not found' }, { status: 404 })
  }
  if (walletRes.error || !walletRes.data) {
    return NextResponse.json({ error: 'Wallet not found' }, { status: 404 })
  }

  const position = positionRes.data
  const wallet = walletRes.data
  const market = position.market

  if (market.status !== 'active') {
    return NextResponse.json({ error: 'Market is not active — position will be settled by reconciliation' }, { status: 400 })
  }

  if (shares_to_sell > position.shares) {
    return NextResponse.json({ error: 'Cannot sell more shares than held' }, { status: 400 })
  }

  const price = position.side === 'yes' ? market.yes_price : market.no_price
  const proceeds = shares_to_sell * price
  const costBasis = shares_to_sell * position.avg_cost_per_share
  const realizedPnl = proceeds - costBasis

  const isSellAll = Math.abs(shares_to_sell - position.shares) < 0.000001

  if (isSellAll) {
    await service
      .from('positions')
      .update({
        status: 'sold',
        closed_at: new Date().toISOString(),
        pnl: realizedPnl,
      })
      .eq('id', position_id)
  } else {
    const remainingShares = position.shares - shares_to_sell
    const remainingCost = remainingShares * position.avg_cost_per_share
    await service
      .from('positions')
      .update({
        shares: remainingShares,
        total_cost: remainingCost,
      })
      .eq('id', position_id)
  }

  // Credit proceeds to wallet
  const newBalance = wallet.cash_balance + proceeds
  await service
    .from('wallets')
    .update({ cash_balance: newBalance })
    .eq('user_id', user.id)

  // Record transaction
  await service.from('transactions').insert({
    user_id: user.id,
    type: 'sell',
    amount: proceeds,
    position_id,
    market_id: position.market_id,
    description: `Sold ${shares_to_sell.toFixed(4)} ${position.side.toUpperCase()} shares @ $${price.toFixed(4)} — P&L: ${realizedPnl >= 0 ? '+' : ''}$${realizedPnl.toFixed(4)}`,
  })

  // Re-check start fresh eligibility
  const eligible = isStartFreshEligible(newBalance, wallet.cooldown_ends_at)
  if (eligible !== wallet.start_fresh_eligible) {
    await service.from('wallets').update({ start_fresh_eligible: eligible }).eq('user_id', user.id)
  }

  return NextResponse.json({ proceeds, realized_pnl: realizedPnl, cash_balance: newBalance })
}
