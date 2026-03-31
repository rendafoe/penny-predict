import { NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

export async function POST() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const service = createServiceClient()

  const walletRes = await service
    .from('wallets')
    .select('*')
    .eq('user_id', user.id)
    .single()

  if (walletRes.error || !walletRes.data) {
    return NextResponse.json({ error: 'Wallet not found' }, { status: 404 })
  }

  const wallet = walletRes.data

  if (!wallet.start_fresh_eligible) {
    return NextResponse.json({ error: 'Not eligible for Start Fresh' }, { status: 403 })
  }

  if (wallet.cooldown_ends_at && new Date(wallet.cooldown_ends_at) > new Date()) {
    return NextResponse.json({ error: 'Already in cooldown' }, { status: 403 })
  }

  // Fetch all open positions to forfeit
  const { data: openPositions } = await service
    .from('positions')
    .select('*')
    .eq('user_id', user.id)
    .eq('status', 'open')

  const cooldownEndsAt = new Date()
  cooldownEndsAt.setHours(cooldownEndsAt.getHours() + 24)

  // Forfeit all open positions
  if (openPositions && openPositions.length > 0) {
    const forfeitTransactions = openPositions.map((p) => ({
      user_id: user.id,
      type: 'forfeit' as const,
      amount: -p.total_cost,
      position_id: p.id,
      market_id: p.market_id,
      description: `Position forfeited via Start Fresh`,
    }))

    await service
      .from('positions')
      .update({ status: 'forfeited', closed_at: new Date().toISOString(), pnl: 0 })
      .eq('user_id', user.id)
      .eq('status', 'open')

    await service.from('transactions').insert(forfeitTransactions)
  }

  // Zero balance, set cooldown, increment top_up_count
  await service
    .from('wallets')
    .update({
      cash_balance: 0,
      start_fresh_eligible: false,
      cooldown_ends_at: cooldownEndsAt.toISOString(),
      top_up_count: wallet.top_up_count + 1,
    })
    .eq('user_id', user.id)

  return NextResponse.json({ cooldown_ends_at: cooldownEndsAt.toISOString() })
}
