import { NextResponse } from 'next/server'
import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/markets'

  if (!code) {
    return NextResponse.redirect(`${origin}/login?error=missing_code`)
  }

  const cookieStore = cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll(cookiesToSet: Array<{ name: string; value: string; options: CookieOptions }>) {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user }, error } = await supabase.auth.exchangeCodeForSession(code)

  if (error || !user) {
    return NextResponse.redirect(`${origin}/login?error=auth_failed`)
  }

  // Seed the user profile + wallet if this is first login (email just verified)
  await seedNewUser(supabase, user.id, user.user_metadata?.username ?? user.email!.split('@')[0])

  return NextResponse.redirect(`${origin}${next}`)
}

async function seedNewUser(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  userId: string,
  username: string
) {
  // Idempotent — only creates if not already exists
  const { data: existing } = await supabase
    .from('users')
    .select('id')
    .eq('id', userId)
    .single()

  if (existing) return

  // Create user profile
  const cashoutEligibleAt = new Date()
  cashoutEligibleAt.setDate(cashoutEligibleAt.getDate() + 30)

  await supabase.from('users').insert({
    id: userId,
    username,
    cashout_eligible_at: cashoutEligibleAt.toISOString(),
    is_verified: false,
    total_cashed_out: 0,
  })

  // Create wallet with $1.00 seed balance
  const { data: wallet } = await supabase
    .from('wallets')
    .insert({
      user_id: userId,
      cash_balance: 1.00,
      start_fresh_eligible: false,
      cooldown_ends_at: null,
      top_up_count: 0,
    })
    .select('id')
    .single()

  if (!wallet) return

  // Record seed transaction
  await supabase.from('transactions').insert({
    user_id: userId,
    type: 'seed',
    amount: 1.00,
    description: 'Welcome bonus — $1.00 starting balance',
  })
}
