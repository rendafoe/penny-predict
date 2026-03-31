import { NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import type { DbPosition, DbMarket } from '@/types'
import { computePositionValue } from '@/lib/wallet/helpers'

export async function GET() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const service = createServiceClient()
  const { data, error } = await service
    .from('positions')
    .select('*, market:markets(*)')
    .eq('user_id', user.id)
    .eq('status', 'open')
    .order('opened_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const positions = (data ?? []).map((p: DbPosition & { market: DbMarket }) => {
    const currentValue = computePositionValue(p, p.market)
    const unrealizedPnl = currentValue - p.total_cost
    const unrealizedPnlPct = p.total_cost > 0 ? (unrealizedPnl / p.total_cost) * 100 : 0
    return { ...p, current_value: currentValue, unrealized_pnl: unrealizedPnl, unrealized_pnl_pct: unrealizedPnlPct }
  })

  return NextResponse.json({ positions })
}
