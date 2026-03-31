'use client'

import { useEffect, useState } from 'react'
import type { LeaderboardEntry } from '@/types'

export default function LeaderboardPage() {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([])
  const [userRank, setUserRank] = useState<LeaderboardEntry | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/leaderboard?limit=50')
      .then((r) => r.json())
      .then((data) => {
        setEntries(data.leaderboard ?? [])
        setUserRank(data.user_rank ?? null)
        setLoading(false)
      })
  }, [])

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-text-primary">Leaderboard</h1>
        <p className="text-sm text-text-muted mt-0.5">Top traders by total portfolio value</p>
      </div>

      {/* Cashout callout */}
      <div className="card p-4 flex items-center gap-3 border-accent/20 bg-accent-muted">
        <span className="text-accent text-xl">🏆</span>
        <div>
          <p className="text-sm font-medium text-text-primary">Reach $200.00 to cash out</p>
          <p className="text-xs text-text-muted">Eligible after 30 days. Identity verification required.</p>
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="skeleton h-14 rounded-lg" />
          ))}
        </div>
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border-subtle">
                <th className="px-4 py-3 text-left text-xs font-medium text-text-muted uppercase tracking-wider w-12">Rank</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-text-muted uppercase tracking-wider">Trader</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-text-muted uppercase tracking-wider">Portfolio</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-text-muted uppercase tracking-wider hidden sm:table-cell">Cash</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-subtle">
              {entries.map((entry) => {
                const isCurrentUser = userRank?.user_id === entry.user_id
                const isEligible = entry.total_value >= 200

                return (
                  <tr
                    key={entry.user_id}
                    className={`transition-colors ${
                      isCurrentUser
                        ? 'bg-accent-muted border-l-2 border-accent'
                        : 'hover:bg-bg-elevated'
                    }`}
                  >
                    <td className="px-4 py-3.5 font-mono text-text-muted">
                      {entry.rank <= 3 ? (
                        <span className="text-base">{['🥇', '🥈', '🥉'][entry.rank - 1]}</span>
                      ) : (
                        `#${entry.rank}`
                      )}
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-2">
                        <span className={`font-medium ${isCurrentUser ? 'text-accent' : 'text-text-primary'}`}>
                          {entry.username}
                          {isCurrentUser && <span className="text-xs text-text-muted ml-1">(you)</span>}
                        </span>
                        {isEligible && (
                          <span className="badge-yes text-xs">Cashout eligible</span>
                        )}
                      </div>
                      <div className="text-xs text-text-muted mt-0.5">{entry.account_age_days}d account</div>
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <span className={`font-semibold font-mono tabular-nums ${isEligible ? 'text-yes' : 'text-text-primary'}`}>
                        ${entry.total_value.toFixed(2)}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-right font-mono text-text-muted tabular-nums hidden sm:table-cell">
                      ${entry.cash_balance.toFixed(2)}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* User rank if outside top 50 */}
      {userRank && !entries.find((e) => e.user_id === userRank.user_id) && (
        <div className="card p-4 border border-accent/30 bg-accent-muted">
          <div className="text-xs text-text-muted mb-2">Your ranking</div>
          <div className="flex items-center justify-between">
            <div>
              <span className="font-mono text-text-muted mr-3">#{userRank.rank}</span>
              <span className="font-medium text-accent">{userRank.username}</span>
            </div>
            <span className="font-semibold font-mono text-text-primary">${userRank.total_value.toFixed(2)}</span>
          </div>
        </div>
      )}
    </div>
  )
}
