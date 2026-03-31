import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const category = searchParams.get('category')
  const sort = searchParams.get('sort') ?? 'liquidity'
  const page = parseInt(searchParams.get('page') ?? '1')
  const limit = Math.min(parseInt(searchParams.get('limit') ?? '24'), 100)
  const offset = (page - 1) * limit

  const service = createServiceClient()
  let query = service
    .from('markets')
    .select('*', { count: 'exact' })
    .eq('status', 'active')

  if (category && category !== 'all') {
    query = query.ilike('category', `%${category}%`)
  }

  const sortMap: Record<string, string> = {
    liquidity: 'liquidity',
    volume:    'volume',
    end_date:  'end_date',
  }
  const sortCol = sortMap[sort] ?? 'liquidity'
  query = query.order(sortCol, { ascending: false })

  const { data, error, count } = await query.range(offset, offset + limit - 1)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({
    markets: data,
    total: count,
    page,
    limit,
    pages: Math.ceil((count ?? 0) / limit),
  })
}
