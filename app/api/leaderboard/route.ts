import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const limit = Math.min(parseInt(searchParams.get('limit') ?? '50'), 100)

  const service = createServiceClient()

  // Top N from the leaderboard view
  const { data: topRows, error } = await service
    .from('leaderboard')
    .select('*')
    .limit(limit)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Find current user's rank (may be outside top N)
  const userInTop = (topRows ?? []).find((r: { user_id: string }) => r.user_id === user.id)
  let userRank = null

  if (!userInTop) {
    const { data: userRow } = await service
      .from('leaderboard')
      .select('*')
      .eq('user_id', user.id)
      .single()
    userRank = userRow
  }

  return NextResponse.json({
    leaderboard: topRows ?? [],
    user_rank: userInTop ?? userRank,
  })
}
