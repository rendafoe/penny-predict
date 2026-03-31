import type { PolymarketMarket } from '@/types'

const API_BASE = process.env.POLYMARKET_API_BASE ?? 'https://gamma-api.polymarket.com'
const CLOB_BASE = process.env.POLYMARKET_CLOB_BASE ?? 'https://clob.polymarket.com'
const MIN_LIQUIDITY = Number(process.env.POLYMARKET_MIN_LIQUIDITY ?? 200000)

async function fetchWithRetry(url: string, retries = 3): Promise<Response> {
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const res = await fetch(url, {
        next: { revalidate: 0 },
        headers: { 'Accept': 'application/json' },
      })
      if (res.ok) return res
      if (res.status === 429) {
        // Rate limited — exponential backoff
        await new Promise((r) => setTimeout(r, 1000 * Math.pow(2, attempt)))
        continue
      }
      throw new Error(`HTTP ${res.status} fetching ${url}`)
    } catch (err) {
      if (attempt === retries - 1) throw err
      await new Promise((r) => setTimeout(r, 500 * Math.pow(2, attempt)))
    }
  }
  throw new Error(`Failed after ${retries} retries: ${url}`)
}

export async function fetchActiveMarkets(offset = 0, limit = 100): Promise<PolymarketMarket[]> {
  const url = `${API_BASE}/markets?active=true&closed=false&limit=${limit}&offset=${offset}`
  const res = await fetchWithRetry(url)
  const data = await res.json()
  return Array.isArray(data) ? data : data.data ?? []
}

export async function fetchMarketDetail(conditionId: string): Promise<PolymarketMarket | null> {
  try {
    const res = await fetchWithRetry(`${API_BASE}/markets/${conditionId}`)
    return res.json()
  } catch {
    return null
  }
}

/** Fetch YES token price from CLOB. Returns null if unavailable (use cached price). */
export async function fetchTokenPrice(tokenId: string): Promise<number | null> {
  try {
    const res = await fetchWithRetry(`${CLOB_BASE}/price?token_id=${tokenId}&side=buy`)
    const data = await res.json()
    const price = parseFloat(data.price)
    return isNaN(price) ? null : price
  } catch {
    return null
  }
}

/** Filter markets to only those meeting liquidity threshold */
export function filterQualifyingMarkets(markets: PolymarketMarket[]): PolymarketMarket[] {
  return markets.filter(
    (m) =>
      m.active &&
      !m.closed &&
      !m.resolved &&
      (m.liquidity ?? 0) >= MIN_LIQUIDITY
  )
}

/** Extract YES price from Polymarket market data */
export function extractPrices(market: PolymarketMarket): { yes: number; no: number } {
  // outcomePrices is a JSON-encoded array like '["0.70", "0.30"]'
  if (market.outcomePrices) {
    try {
      const raw = typeof market.outcomePrices === 'string'
        ? JSON.parse(market.outcomePrices)
        : market.outcomePrices
      const prices = raw as string[]
      const yes = parseFloat(prices[0])
      const no = parseFloat(prices[1])
      if (!isNaN(yes) && !isNaN(no)) {
        return {
          yes: Math.max(0.0001, Math.min(0.9999, yes)),
          no: Math.max(0.0001, Math.min(0.9999, no)),
        }
      }
    } catch {}
  }

  // Fallback: derive from tokens array
  if (market.tokens?.length === 2) {
    const yesToken = market.tokens.find((t) => t.outcome.toLowerCase() === 'yes')
    const noToken = market.tokens.find((t) => t.outcome.toLowerCase() === 'no')
    if (yesToken && noToken) {
      return {
        yes: Math.max(0.0001, Math.min(0.9999, yesToken.price)),
        no: Math.max(0.0001, Math.min(0.9999, noToken.price)),
      }
    }
  }

  // Default 50/50
  return { yes: 0.5, no: 0.5 }
}
