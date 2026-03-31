import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const service = createServiceClient()

  const [marketRes, positionRes] = await Promise.all([
    service.from('markets').select('*').eq('id', params.id).single(),
    service
      .from('positions')
      .select('*')
      .eq('user_id', user.id)
      .eq('market_id', params.id)
      .eq('status', 'open')
      .maybeSingle(),
  ])

  if (marketRes.error || !marketRes.data) {
    return NextResponse.json({ error: 'Market not found' }, { status: 404 })
  }

  return NextResponse.json({
    market: marketRes.data,
    user_position: positionRes.data ?? null,
  })
}
