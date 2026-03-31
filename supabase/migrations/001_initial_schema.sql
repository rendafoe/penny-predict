-- ============================================================
-- Penny Predict — Initial Schema
-- Run this in Supabase SQL Editor or via supabase db push
-- ============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ─── users ────────────────────────────────────────────────────────────────
CREATE TABLE public.users (
  id                uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username          text UNIQUE NOT NULL,
  created_at        timestamptz NOT NULL DEFAULT now(),
  cashout_eligible_at timestamptz NOT NULL,
  is_verified       boolean NOT NULL DEFAULT false,
  total_cashed_out  numeric(10,2) NOT NULL DEFAULT 0
);

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own profile"
  ON public.users FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON public.users FOR UPDATE
  USING (auth.uid() = id);

-- ─── wallets ──────────────────────────────────────────────────────────────
CREATE TABLE public.wallets (
  id                    uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id               uuid UNIQUE NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  cash_balance          numeric(10,4) NOT NULL DEFAULT 0 CHECK (cash_balance >= 0),
  start_fresh_eligible  boolean NOT NULL DEFAULT false,
  cooldown_ends_at      timestamptz,
  top_up_count          integer NOT NULL DEFAULT 0,
  updated_at            timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.wallets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own wallet"
  ON public.wallets FOR SELECT
  USING (auth.uid() = user_id);

-- Wallet mutations only via service role (API routes)
-- No direct client-side INSERT/UPDATE/DELETE on wallets

-- ─── markets ──────────────────────────────────────────────────────────────
CREATE TABLE public.markets (
  id                      uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  polymarket_condition_id text UNIQUE NOT NULL,
  polymarket_slug         text NOT NULL,
  question                text NOT NULL,
  category                text NOT NULL DEFAULT 'General',
  yes_price               numeric(5,4) NOT NULL CHECK (yes_price BETWEEN 0.0001 AND 0.9999),
  no_price                numeric(5,4) NOT NULL CHECK (no_price BETWEEN 0.0001 AND 0.9999),
  liquidity               numeric(12,2) NOT NULL DEFAULT 0,
  volume                  numeric(12,2) NOT NULL DEFAULT 0,
  end_date                timestamptz,
  status                  text NOT NULL DEFAULT 'active' CHECK (status IN ('active','resolved','voided')),
  resolution              text CHECK (resolution IN ('yes','no','void')),
  resolved_at             timestamptz,
  last_synced_at          timestamptz NOT NULL DEFAULT now(),
  created_at              timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.markets ENABLE ROW LEVEL SECURITY;

-- Markets are publicly readable to authenticated users
CREATE POLICY "Authenticated users can read markets"
  ON public.markets FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE INDEX idx_markets_status ON public.markets(status);
CREATE INDEX idx_markets_liquidity ON public.markets(liquidity DESC);
CREATE INDEX idx_markets_category ON public.markets(category);

-- ─── positions ────────────────────────────────────────────────────────────
CREATE TABLE public.positions (
  id                  uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id             uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  market_id           uuid NOT NULL REFERENCES public.markets(id) ON DELETE CASCADE,
  side                text NOT NULL CHECK (side IN ('yes','no')),
  shares              numeric(12,6) NOT NULL CHECK (shares > 0),
  avg_cost_per_share  numeric(8,6) NOT NULL,
  total_cost          numeric(10,4) NOT NULL,
  status              text NOT NULL DEFAULT 'open'
                        CHECK (status IN ('open','sold','settled_win','settled_loss','forfeited')),
  opened_at           timestamptz NOT NULL DEFAULT now(),
  closed_at           timestamptz,
  pnl                 numeric(10,4)
);

ALTER TABLE public.positions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own positions"
  ON public.positions FOR SELECT
  USING (auth.uid() = user_id);

CREATE INDEX idx_positions_user_id ON public.positions(user_id);
CREATE INDEX idx_positions_market_id ON public.positions(market_id);
CREATE INDEX idx_positions_status ON public.positions(status);
CREATE INDEX idx_positions_user_open ON public.positions(user_id, status) WHERE status = 'open';

-- ─── transactions ─────────────────────────────────────────────────────────
CREATE TABLE public.transactions (
  id          uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  type        text NOT NULL
                CHECK (type IN ('seed','buy','sell','settle_win','settle_loss','forfeit','top_up','cashout_request')),
  amount      numeric(10,4) NOT NULL,
  position_id uuid REFERENCES public.positions(id),
  market_id   uuid REFERENCES public.markets(id),
  description text NOT NULL DEFAULT '',
  created_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own transactions"
  ON public.transactions FOR SELECT
  USING (auth.uid() = user_id);

CREATE INDEX idx_transactions_user_id ON public.transactions(user_id, created_at DESC);

-- ─── cashout_requests ─────────────────────────────────────────────────────
CREATE TABLE public.cashout_requests (
  id                uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id           uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  amount            numeric(10,2) NOT NULL,
  status            text NOT NULL DEFAULT 'pending'
                      CHECK (status IN ('pending','approved','paid','rejected')),
  paypal_email      text NOT NULL,
  identity_verified boolean NOT NULL DEFAULT false,
  requested_at      timestamptz NOT NULL DEFAULT now(),
  processed_at      timestamptz,
  notes             text
);

ALTER TABLE public.cashout_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own cashout requests"
  ON public.cashout_requests FOR SELECT
  USING (auth.uid() = user_id);

-- ─── signup_rate_limit ─────────────────────────────────────────────────────
-- Simple table to track signups per IP for rate limiting
CREATE TABLE public.signup_rate_limit (
  ip_address  text NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_rate_limit_ip_time ON public.signup_rate_limit(ip_address, created_at);

-- No RLS needed — only accessed via service role

-- ─── ip_logs ──────────────────────────────────────────────────────────────
CREATE TABLE public.ip_logs (
  id          uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  event_type  text NOT NULL CHECK (event_type IN ('signup','cashout_request')),
  ip_address  text NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_ip_logs_ip ON public.ip_logs(ip_address);
CREATE INDEX idx_ip_logs_user ON public.ip_logs(user_id);

-- ─── Leaderboard View ─────────────────────────────────────────────────────
CREATE OR REPLACE VIEW public.leaderboard AS
WITH position_values AS (
  SELECT
    p.user_id,
    SUM(
      CASE
        WHEN p.side = 'yes' THEN p.shares * m.yes_price
        WHEN p.side = 'no'  THEN p.shares * m.no_price
        ELSE 0
      END
    ) AS open_positions_value
  FROM public.positions p
  JOIN public.markets m ON m.id = p.market_id
  WHERE p.status = 'open'
  GROUP BY p.user_id
)
SELECT
  ROW_NUMBER() OVER (ORDER BY (w.cash_balance + COALESCE(pv.open_positions_value, 0)) DESC)::integer AS rank,
  u.id AS user_id,
  u.username,
  w.cash_balance,
  COALESCE(pv.open_positions_value, 0) AS open_positions_value,
  (w.cash_balance + COALESCE(pv.open_positions_value, 0)) AS total_value,
  EXTRACT(DAY FROM (now() - u.created_at))::integer AS account_age_days
FROM public.users u
JOIN public.wallets w ON w.user_id = u.id
LEFT JOIN position_values pv ON pv.user_id = u.id
ORDER BY total_value DESC;

-- Grant read access to authenticated users
CREATE POLICY "Authenticated users can read leaderboard"
  ON public.markets FOR SELECT  -- Note: leaderboard is a view, RLS is on base tables
  USING (auth.uid() IS NOT NULL);

-- ─── Wallet updated_at trigger ─────────────────────────────────────────────
CREATE OR REPLACE FUNCTION update_wallet_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER wallets_updated_at
  BEFORE UPDATE ON public.wallets
  FOR EACH ROW EXECUTE FUNCTION update_wallet_timestamp();
