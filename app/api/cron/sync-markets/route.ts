import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import {
  fetchActiveMarkets,
  filterQualifyingMarkets,
  extractPrices,
} from '@/lib/polymarket/client'

export async function POST(request: NextRequest) {
  if (request.headers.get('x-cron-secret') !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const service = createServiceClient()
  let synced = 0
  let offset = 0
  const batchSize = 100

  try {
    while (true) {
      const raw = await fetchActiveMarkets(offset, batchSize)
      if (raw.length === 0) break

      const qualifying = filterQualifyingMarkets(raw)

      for (const market of qualifying) {
        const { yes, no } = extractPrices(market)

        await service.from('markets').upsert(
          {
            polymarket_condition_id: market.conditionId,
            polymarket_slug: market.slug ?? '',
            question: market.question,
            category: market.category ?? 'General',
            yes_price: yes,
            no_price: no,
            liquidity: market.liquidity ?? 0,
            volume: market.volume ?? 0,
            end_date: market.endDate ?? null,
            status: 'active',
            last_synced_at: new Date().toISOString(),
          },
          { onConflict: 'polymarket_condition_id' }
        )
        synced++
      }

      if (raw.length < batchSize) break
      offset += batchSize
    }

    return NextResponse.json({ ok: true, synced })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error('[sync-markets]', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
