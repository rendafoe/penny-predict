# Penny Predict — CLAUDE.md

## Project Overview
A free-to-play prediction market platform. Users receive $1.00 in platform credits on signup and trade on real-world prediction markets sourced from Polymarket (read-only). Users who grow their balance to $200.00 are eligible to cash out real money. No real money is ever deposited or wagered.

## Stack
- **Frontend/Backend**: Next.js 14 (App Router), TypeScript, Tailwind CSS
- **Database**: Supabase (PostgreSQL) with Row Level Security
- **Auth**: Supabase Auth (email/password)
- **Hosting**: Vercel (frontend + API routes + Cron Jobs)
- **External Data**: Polymarket REST API (read-only)
- **Ad Monetization**: Rewarded video ad network (TBD — Google AdSense/AdMob)
- **Cashout Payments**: PayPal Payouts API or equivalent, gated behind KYC

## Repository Structure
```
/
├── /app
│   ├── /(auth)                   # Login / signup pages
│   ├── /(platform)               # Protected routes
│   │   ├── /markets              # Market browser
│   │   ├── /markets/[id]         # Individual market page
│   │   ├── /portfolio            # User positions
│   │   ├── /wallet               # Balance, top-up, cashout
│   │   ├── /leaderboard          # Global leaderboard
│   │   └── /rules                # Rules page
│   └── /api                      # API routes
│       ├── /markets
│       ├── /positions
│       ├── /wallet
│       ├── /leaderboard
│       └── /cron
│           ├── /sync-markets
│           └── /reconcile
├── /components                   # Shared UI components
├── /lib
│   ├── /supabase                 # DB client + typed queries
│   ├── /polymarket               # Polymarket API client
│   └── /wallet                   # Wallet calculation helpers
├── /types                        # TypeScript interfaces
└── /supabase                     # DB migrations + seed
    └── /migrations
```

## Key Business Rules
- Starting balance: $1.00 per verified user
- Max single position: 80% of current cash balance
- Minimum market liquidity: $200,000 (sourced from Polymarket)
- Start Fresh trigger: total portfolio value ≤ $0.10
- Start Fresh cooldown: 24 hours after ad watch
- Cashout threshold: $200.00 minimum, account 30+ days old
- All cashout requests are manually reviewed in MVP (no automated payouts)
- Prices mirror Polymarket CLOB pricing exactly

## Polymarket API Endpoints
- Markets list: `GET https://gamma-api.polymarket.com/markets?active=true&closed=false&limit=100`
- Market detail: `GET https://gamma-api.polymarket.com/markets/{conditionId}`
- Prices: `GET https://clob.polymarket.com/prices?token_id={tokenId}`

## Environment Variables
| Variable | Description |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase public anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key (server-only) |
| `CRON_SECRET` | Protects cron endpoints from unauthorized calls |
| `POLYMARKET_API_BASE` | `https://gamma-api.polymarket.com` |
| `POLYMARKET_CLOB_BASE` | `https://clob.polymarket.com` |
| `POLYMARKET_MIN_LIQUIDITY` | `200000` |
| `AD_NETWORK_SECRET` | Rewarded ad network webhook secret |
| `NEXT_PUBLIC_APP_URL` | Production URL for auth redirects |

## Build Order (Phases)
1. **Foundation**: Next.js init, Supabase connection, DB migrations, Auth, wallet seeding
2. **Market Ingestion**: Polymarket client, sync-markets cron, markets API routes, markets UI
3. **Trading Engine**: buy/sell API routes, portfolio page, wallet page
4. **Reconciliation**: reconcile cron, settlement logic
5. **Start Fresh & Leaderboard**: start-fresh flow, leaderboard view + page
6. **Cashout & Anti-Fraud**: cashout request flow, IP logging, rate limiting
7. **Polish**: landing page, rules page, ad integration, responsive design, error states

## Vercel Cron Config (vercel.json)
```json
{
  "crons": [
    { "path": "/api/cron/sync-markets", "schedule": "*/5 * * * *" },
    { "path": "/api/cron/reconcile", "schedule": "*/5 * * * *" }
  ]
}
```

## Cron Auth Pattern
All cron routes validate:
```ts
if (req.headers['x-cron-secret'] !== process.env.CRON_SECRET) {
  return res.status(401).json({ error: 'Unauthorized' });
}
```

## Anti-Fraud Notes
- Rate limit signup: max 5 accounts per IP per hour
- Log IP on signup and cashout request
- Flag for review if 3+ accounts share IP and any submits cashout
- Do NOT block flagged accounts — add to review queue only
- Cashout gates: 30-day account age + $200 balance + PayPal identity verification

## Visual Aesthetic
Inspired by Polymarket and Kalshi — clean, data-dense, dark-mode friendly.

## Cashout / Payments
Stripe planned (not PayPal). Integration deferred — cashout requests are manually reviewed in MVP. Ad network: Google AdSense/AdMob.

## Setup Steps Required Before First Run
1. Run `supabase/migrations/001_initial_schema.sql` in Supabase SQL Editor
2. Add `SUPABASE_SERVICE_ROLE_KEY` to `.env.local` (from Supabase dashboard → Project Settings → API)
3. Generate `CRON_SECRET`: `openssl rand -hex 32`
4. Set `NEXT_PUBLIC_APP_URL` to production URL in Vercel env vars
5. Configure Supabase Auth → Email Templates → set Redirect URL to `https://yourdomain.com/auth/callback`
6. Link Vercel project once repo has commits

## Known Technical Risks
- Polymarket CLOB API has undocumented rate limits — implement exponential backoff, serve stale prices on failure
- Vercel Crons are best-effort — acceptable for MVP
- Supabase connection pooling — use pgBouncer, service role client only in server contexts
- Start Fresh $1.00 credit depends on reconcile cron; tell users "within 10 minutes of cooldown expiry"
