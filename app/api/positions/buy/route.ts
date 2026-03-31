import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { isStartFreshEligible, maxBetAmount } from '@/lib/wallet/helpers'
import type { BuyRequest } from '@/types'

export async function POST(request: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body: BuyRequest = await request.json()
  const { market_id, side, dollar_amount } = body

  if (!market_id || !side || !dollar_amount) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }
  if (side !== 'yes' && side !== 'no') {
    return NextResponse.json({ error: 'Invalid side' }, { status: 400 })
  }
  if (dollar_amount <= 0) {
    return NextResponse.json({ error: 'Amount must be positive' }, { status: 400 })
  }

  const service = createServiceClient()

  // Fetch wallet and market in parallel
  const [walletRes, marketRes] = await Promise.all([
    service.from('wallets').select('*').eq('user_id', user.id).single(),
    service.from('markets').select('*').eq('id', market_id).single(),
  ])

  if (walletRes.error || !walletRes.data) {
    return NextResponse.json({ error: 'Wallet not found' }, { status: 404 })
  }
  if (marketRes.error || !marketRes.data) {
    return NextResponse.json({ error: 'Market not found' }, { status: 404 })
  }

  const wallet = walletRes.data
  const market = marketRes.data

  if (market.status !== 'active') {
    return NextResponse.json({ error: 'Market is not active' }, { status: 400 })
  }

  // Check cooldown
  if (wallet.cooldown_ends_at && new Date(wallet.cooldown_ends_at) > new Date()) {
    return NextResponse.json({ error: 'Account is in Start Fresh cooldown' }, { status: 403 })
  }

  // Validate amount
  const max = maxBetAmount(wallet.cash_balance)
  if (dollar_amount > wallet.cash_balance) {
    return NextResponse.json({ error: 'Insufficient balance' }, { status: 400 })
  }
  if (dollar_amount > max) {
    return NextResponse.json({ error: `Maximum bet is $${max.toFixed(4)} (80% of balance)` }, { status: 400 })
  }

  const price = side === 'yes' ? market.yes_price : market.no_price
  const shares = dollar_amount / price

  // Check for existing open position on same market+side
  const { data: existing } = await service
    .from('positions')
    .select('*')
    .eq('user_id', user.id)
    .eq('market_id', market_id)
    .eq('side', side)
    .eq('status', 'open')
    .maybeSingle()

  let position
  if (existing) {
    // Add to existing position — weighted average cost
    const newTotalShares = existing.shares + shares
    const newTotalCost = existing.total_cost + dollar_amount
    const newAvgCost = newTotalCost / newTotalShares

    const { data: updated, error } = await service
      .from('positions')
      .update({
        shares: newTotalShares,
        total_cost: newTotalCost,
        avg_cost_per_share: newAvgCost,
      })
      .eq('id', existing.id)
      .select()
      .single()

    if (error) return NextResponse.json({ error: 'Failed to update position' }, { status: 500 })
    position = updated
  } else {
    // Create new position
    const { data: created, error } = await service
      .from('positions')
      .insert({
        user_id: user.id,
        market_id,
        side,
        shares,
        avg_cost_per_share: price,
        total_cost: dollar_amount,
        status: 'open',
      })
      .select()
      .single()

    if (error) return NextResponse.json({ error: 'Failed to create position' }, { status: 500 })
    position = created
  }

  // Deduct from wallet
  const newBalance = wallet.cash_balance - dollar_amount
  await service
    .from('wallets')
    .update({ cash_balance: newBalance })
    .eq('user_id', user.id)

  // Record transaction
  await service.from('transactions').insert({
    user_id: user.id,
    type: 'buy',
    amount: -dollar_amount,
    position_id: position.id,
    market_id,
    description: `Bought ${shares.toFixed(4)} ${side.toUpperCase()} shares @ $${price.toFixed(4)} in "${market.question.substring(0, 60)}"`,
  })

  // Check start fresh eligibility
  const openPositionsValue = shares * price // This is the new position; full calc happens on /api/wallet
  const eligible = isStartFreshEligible(newBalance + openPositionsValue, wallet.cooldown_ends_at)
  if (eligible !== wallet.start_fresh_eligible) {
    await service.from('wallets').update({ start_fresh_eligible: eligible }).eq('user_id', user.id)
  }

  return NextResponse.json({ position, cash_balance: newBalance })
}
