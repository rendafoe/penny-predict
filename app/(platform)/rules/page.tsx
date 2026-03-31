export default function RulesPage() {
  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-text-primary">Rules</h1>
        <p className="text-sm text-text-muted mt-0.5">How Penny Predict works</p>
      </div>

      <div className="card p-6 space-y-6 text-sm text-text-secondary leading-relaxed">
        <section className="space-y-2">
          <h2 className="text-base font-semibold text-text-primary">Getting Started</h2>
          <p>
            Every new account receives <span className="text-accent font-semibold">$1.00 in platform credits</span> after
            email verification. Credits are not real money — they are virtual tokens used to trade on our platform.
          </p>
        </section>

        <div className="divider" />

        <section className="space-y-2">
          <h2 className="text-base font-semibold text-text-primary">Trading</h2>
          <ul className="list-disc list-inside space-y-1 text-text-secondary">
            <li>Markets are sourced from Polymarket with $200,000+ liquidity</li>
            <li>Prices mirror Polymarket&apos;s real-time probability</li>
            <li>Buy YES or NO shares at the current probability price</li>
            <li>Partial shares supported — spend any amount you have</li>
            <li>Maximum single position: 80% of your current cash balance</li>
            <li>Sell any open position early at the current market price</li>
          </ul>
        </section>

        <div className="divider" />

        <section className="space-y-2">
          <h2 className="text-base font-semibold text-text-primary">Payouts</h2>
          <p>
            A winning share pays out <span className="text-text-primary font-semibold">$1.00</span>.
            A losing share pays out $0.00. Markets settle automatically when Polymarket resolves them
            (typically within a few hours of the event outcome).
          </p>
        </section>

        <div className="divider" />

        <section className="space-y-2">
          <h2 className="text-base font-semibold text-text-primary">Start Fresh</h2>
          <p>
            When your total portfolio value (cash + open positions) falls to $0.10 or below,
            you can Start Fresh. Watch a short rewarded ad, and after a <span className="text-text-primary font-semibold">24-hour cooldown</span>,
            you&apos;ll receive a new $1.00 credit. There&apos;s no lifetime limit on resets.
          </p>
          <p className="text-text-muted text-xs">
            * Credits are applied within 10 minutes of cooldown expiry.
          </p>
        </section>

        <div className="divider" />

        <section className="space-y-2">
          <h2 className="text-base font-semibold text-text-primary">Cashing Out</h2>
          <p>
            When your total portfolio reaches <span className="text-yes font-semibold">$200.00</span> or more
            and your account is at least 30 days old, you can submit a cashout request.
            All requests are manually reviewed. Identity verification is required before payout.
          </p>
          <p>Penny Predict is a free-to-play sweepstakes platform. No purchase is necessary to play.</p>
        </section>

        <div className="divider" />

        <p className="text-text-muted text-xs italic">
          Content placeholder — final rules to be filled in by Brian.
        </p>
      </div>
    </div>
  )
}
