'use client'

import { WalletState } from '@/types'
import Link from 'next/link'

export default function StartFreshBanner({ wallet }: { wallet: WalletState | null }) {
  if (!wallet?.start_fresh_eligible) return null

  return (
    <div className="bg-warning/10 border-b border-warning/30 px-4 py-2.5">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
        <div className="flex items-center gap-2 text-sm">
          <span className="w-2 h-2 rounded-full bg-warning animate-pulse shrink-0" />
          <span className="text-warning font-medium">Your portfolio is nearly empty.</span>
          <span className="text-text-secondary hidden sm:inline">
            Watch a short ad to reset your $1.00 balance.
          </span>
        </div>
        <Link
          href="/wallet#start-fresh"
          className="btn text-xs py-1 px-3 bg-warning text-bg-base hover:bg-accent-dim shrink-0"
        >
          Start Fresh
        </Link>
      </div>
    </div>
  )
}
