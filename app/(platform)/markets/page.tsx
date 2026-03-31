'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import type { DbMarket } from '@/types'

const CATEGORIES = ['All', 'Politics', 'Sports', 'Crypto', 'Finance', 'Science', 'Entertainment', 'World']
const SORTS = [
  { value: 'liquidity', label: 'Liquidity' },
  { value: 'volume',    label: 'Volume' },
  { value: 'end_date',  label: 'Closing Soon' },
]

export default function MarketsPage() {
  const [markets, setMarkets] = useState<DbMarket[]>([])
  const [loading, setLoading] = useState(true)
  const [category, setCategory] = useState('All')
  const [sort, setSort] = useState('liquidity')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)

  const fetchMarkets = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams({
      sort,
      page: String(page),
      limit: '24',
      ...(category !== 'All' && { category }),
    })
    const res = await fetch(`/api/markets?${params}`)
    const data = await res.json()
    setMarkets(data.markets ?? [])
    setTotalPages(data.pages ?? 1)
    setLoading(false)
  }, [category, sort, page])

  useEffect(() => { fetchMarkets() }, [fetchMarkets])

  function handleCategory(cat: string) {
    setCategory(cat)
    setPage(1)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Markets</h1>
          <p className="text-sm text-text-muted mt-0.5">Live prediction markets from Polymarket</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-text-muted">Sort by</span>
          <select
            value={sort}
            onChange={(e) => { setSort(e.target.value); setPage(1) }}
            className="input text-sm py-1.5 w-auto"
          >
            {SORTS.map((s) => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Category filters */}
      <div className="flex gap-2 flex-wrap">
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            onClick={() => handleCategory(cat)}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
              category === cat
                ? 'bg-accent text-bg-base'
                : 'bg-bg-elevated border border-border-subtle text-text-secondary hover:text-text-primary'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Market grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="card p-5 space-y-3">
              <div className="skeleton h-4 w-3/4 rounded" />
              <div className="skeleton h-3 w-1/2 rounded" />
              <div className="skeleton h-8 w-full rounded" />
            </div>
          ))}
        </div>
      ) : markets.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-text-muted">No markets found. Try a different category.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {markets.map((market) => (
            <MarketCard key={market.id} market={market} />
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-4">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="btn-secondary px-3 py-1.5 text-sm"
          >
            ← Prev
          </button>
          <span className="text-sm text-text-muted tabular-nums">
            {page} / {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="btn-secondary px-3 py-1.5 text-sm"
          >
            Next →
          </button>
        </div>
      )}
    </div>
  )
}

function MarketCard({ market }: { market: DbMarket }) {
  const yesProb = Math.round(market.yes_price * 100)
  const daysLeft = market.end_date
    ? Math.max(0, Math.ceil((new Date(market.end_date).getTime() - Date.now()) / 86400000))
    : null

  return (
    <Link href={`/markets/${market.id}`} className="card p-5 flex flex-col gap-4 hover:shadow-card-hover hover:border-border-default transition-all duration-150 group">
      {/* Category + days left */}
      <div className="flex items-center justify-between">
        <span className="badge-neutral">{market.category}</span>
        {daysLeft !== null && (
          <span className={`text-xs tabular-nums ${daysLeft <= 3 ? 'text-warning' : 'text-text-muted'}`}>
            {daysLeft === 0 ? 'Closing today' : `${daysLeft}d left`}
          </span>
        )}
      </div>

      {/* Question */}
      <p className="text-sm font-medium text-text-primary leading-snug line-clamp-3 group-hover:text-white transition-colors">
        {market.question}
      </p>

      {/* Price bar */}
      <div className="space-y-2">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-1.5">
            <span className="badge-yes">YES {yesProb}%</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="badge-no">NO {100 - yesProb}%</span>
          </div>
        </div>
        <div className="h-1.5 rounded-full bg-bg-elevated overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-yes to-yes/70 transition-all"
            style={{ width: `${yesProb}%` }}
          />
        </div>
      </div>

      {/* Stats */}
      <div className="flex gap-4 text-xs text-text-muted tabular-nums">
        <span>Vol ${(market.volume / 1000).toFixed(0)}k</span>
        <span>·</span>
        <span>Liq ${(market.liquidity / 1000).toFixed(0)}k</span>
      </div>
    </Link>
  )
}
