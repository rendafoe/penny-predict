import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { fetchMarketDetail } from '@/lib/polymarket/client'
import type { DbPosition } from '@/types'

export async function POST(request: NextRequest) {
  if (request.headers.get('x-cron-secret') !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const service = createServiceClient()
  const settled: string[] = []
  const errors: string[] = []

  try {
    // ── 1. Settle resolved markets ────────────────────────────────────────
    const { data: activeMarkets } = await service
      .from('markets')
      .select('id, polymarket_condition_id, question')
      .eq('status', 'active')

    for (const market of activeMarkets ?? []) {
      try {
        const detail = await fetchMarketDetail(market.polymarket_condition_id)
        if (!detail?.resolved) continue

        // Determine resolution
        let resolution: 'yes' | 'no' | 'void' | null = null

        // Polymarket encodes resolution in outcomePrices: winning side = 1.0
        if (detail.outcomePrices) {
          try {
            const raw = typeof detail.outcomePrices === 'string'
              ? JSON.parse(detail.outcomePrices)
              : detail.outcomePrices
            const prices = raw as string[]
            if (parseFloat(prices[0]) === 1) resolution = 'yes'
            else if (parseFloat(prices[1]) === 1) resolution = 'no'
            else resolution = 'void'
          } catch {}
        }

        if (!resolution) {
          resolution = 'void' // Fallback
        }

        // Fetch all open positions for this market
        const { data: positions } = await service
          .from('positions')
          .select('*')
          .eq('market_id', market.id)
          .eq('status', 'open')

        for (const position of (positions ?? []) as DbPosition[]) {
          if (resolution === 'void') {
            // Return cost basis
            const { data: vw } = await service
              .from('wallets')
              .select('cash_balance')
              .eq('user_id', position.user_id)
              .single()
            if (vw) {
              await service
                .from('wallets')
                .update({ cash_balance: vw.cash_balance + position.total_cost })
                .eq('user_id', position.user_id)
            }
            await service.from('positions').update({
              status: 'settled_loss',
              closed_at: new Date().toISOString(),
              pnl: 0,
            }).eq('id', position.id)
            await service.from('transactions').insert({
              user_id: position.user_id,
              type: 'settle_win',
              amount: position.total_cost,
              position_id: position.id,
              market_id: market.id,
              description: `Market voided — cost basis returned`,
            })
          } else if (position.side === resolution) {
            // Winner: payout = shares × $1.00
            const payout = position.shares
            const pnl = payout - position.total_cost
            const { data: w } = await service
              .from('wallets')
              .select('cash_balance')
              .eq('user_id', position.user_id)
              .single()
            if (w) {
              await service
                .from('wallets')
                .update({ cash_balance: w.cash_balance + payout })
                .eq('user_id', position.user_id)
            }
            await service.from('positions').update({
              status: 'settled_win',
              closed_at: new Date().toISOString(),
              pnl,
            }).eq('id', position.id)
            await service.from('transactions').insert({
              user_id: position.user_id,
              type: 'settle_win',
              amount: payout,
              position_id: position.id,
              market_id: market.id,
              description: `Won — ${position.shares.toFixed(4)} shares × $1.00`,
            })
          } else {
            // Loser
            await service.from('positions').update({
              status: 'settled_loss',
              closed_at: new Date().toISOString(),
              pnl: -position.total_cost,
            }).eq('id', position.id)
            await service.from('transactions').insert({
              user_id: position.user_id,
              type: 'settle_loss',
              amount: 0,
              position_id: position.id,
              market_id: market.id,
              description: `Lost — position resolved against your side`,
            })
          }
        }

        // Mark market as resolved
        await service.from('markets').update({
          status: 'resolved',
          resolution,
          resolved_at: new Date().toISOString(),
        }).eq('id', market.id)

        settled.push(market.id)
      } catch (err) {
        errors.push(`${market.id}: ${err instanceof Error ? err.message : 'error'}`)
      }
    }

    // ── 2. Credit $1.00 for expired cooldowns ────────────────────────────
    const { data: expiredCooldowns } = await service
      .from('wallets')
      .select('user_id, cash_balance')
      .lte('cooldown_ends_at', new Date().toISOString())
      .not('cooldown_ends_at', 'is', null)
      .eq('cash_balance', 0)

    for (const wallet of expiredCooldowns ?? []) {
      await service
        .from('wallets')
        .update({
          cash_balance: 1.00,
          cooldown_ends_at: null,
          start_fresh_eligible: false,
        })
        .eq('user_id', wallet.user_id)

      await service.from('transactions').insert({
        user_id: wallet.user_id,
        type: 'top_up',
        amount: 1.00,
        description: 'Start Fresh — $1.00 credit applied after cooldown',
      })
    }

    return NextResponse.json({
      ok: true,
      settled: settled.length,
      cooldowns_credited: (expiredCooldowns ?? []).length,
      errors,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error('[reconcile]', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
