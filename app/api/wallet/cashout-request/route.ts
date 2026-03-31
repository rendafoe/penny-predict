import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { amount, paypal_email } = await request.json()

  if (!amount || !paypal_email) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }
  if (amount < 200) {
    return NextResponse.json({ error: 'Minimum cashout is $200' }, { status: 400 })
  }

  const service = createServiceClient()

  const [walletRes, userRes] = await Promise.all([
    service.from('wallets').select('cash_balance').eq('user_id', user.id).single(),
    service.from('users').select('cashout_eligible_at').eq('id', user.id).single(),
  ])

  if (!walletRes.data) return NextResponse.json({ error: 'Wallet not found' }, { status: 404 })
  if (!userRes.data) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  // Validate balance
  if (walletRes.data.cash_balance < amount) {
    return NextResponse.json({ error: 'Insufficient cash balance' }, { status: 400 })
  }

  // Validate account age
  if (new Date(userRes.data.cashout_eligible_at) > new Date()) {
    const daysLeft = Math.ceil(
      (new Date(userRes.data.cashout_eligible_at).getTime() - Date.now()) / 86400000
    )
    return NextResponse.json(
      { error: `Account must be 30 days old. ${daysLeft} days remaining.` },
      { status: 403 }
    )
  }

  // Create cashout request
  const { error } = await service.from('cashout_requests').insert({
    user_id: user.id,
    amount,
    paypal_email,
    status: 'pending',
    identity_verified: false,
  })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Record transaction
  await service.from('transactions').insert({
    user_id: user.id,
    type: 'cashout_request',
    amount: -amount,
    description: `Cashout request for $${amount} via PayPal (${paypal_email})`,
  })

  // Log IP for fraud detection
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0] ?? request.headers.get('x-real-ip') ?? 'unknown'
  await service.from('ip_logs').insert({ user_id: user.id, event_type: 'cashout_request', ip_address: ip })

  return NextResponse.json({ ok: true })
}
