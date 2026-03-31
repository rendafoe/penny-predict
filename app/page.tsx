import Link from 'next/link'

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-bg-base flex flex-col">
      {/* Nav */}
      <header className="border-b border-border-subtle px-4 sm:px-6">
        <div className="max-w-6xl mx-auto flex items-center justify-between h-14">
          <span className="text-lg font-bold tracking-tight">
            <span className="text-accent">Penny</span>
            <span className="text-text-primary">Predict</span>
          </span>
          <div className="flex items-center gap-3">
            <Link href="/login" className="btn-ghost text-sm">Sign in</Link>
            <Link href="/signup" className="btn-primary text-sm">Get started free</Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <main className="flex-1 flex flex-col items-center justify-center px-4 text-center py-20">
        <div className="max-w-3xl mx-auto space-y-6 animate-fade-in">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent-muted border border-accent/30 text-xs text-accent font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
            Free to play · No deposit required
          </div>

          {/* Headline */}
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-text-primary leading-tight tracking-tight">
            Start with{' '}
            <span className="text-accent">$1.</span>
            <br />
            Cash out at{' '}
            <span className="text-yes">$200.</span>
          </h1>

          <p className="text-lg sm:text-xl text-text-secondary max-w-2xl mx-auto text-balance">
            Trade real prediction markets powered by Polymarket. No money down.
            Grow your $1 starting balance using real probability data, and cash out when you hit $200.
          </p>

          {/* CTA */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <Link href="/signup" className="btn-primary px-8 py-3 text-base">
              Start for free →
            </Link>
            <Link href="/leaderboard" className="btn-secondary px-8 py-3 text-base">
              View leaderboard
            </Link>
          </div>
        </div>

        {/* How it works */}
        <div className="mt-24 max-w-4xl mx-auto w-full">
          <h2 className="text-sm font-semibold text-text-muted uppercase tracking-widest mb-10">
            How it works
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 text-left">
            {[
              {
                step: '01',
                title: 'Get $1 free',
                body: 'Sign up with your email. Verify it. Get $1.00 in platform credits instantly.',
              },
              {
                step: '02',
                title: 'Trade real markets',
                body: 'Browse 1,000+ live prediction markets. Buy YES or NO shares at real Polymarket prices.',
              },
              {
                step: '03',
                title: 'Cash out at $200',
                body: 'Grow your balance to $200 through smart trading. Submit a cashout request and get paid.',
              },
            ].map(({ step, title, body }) => (
              <div key={step} className="card p-6 space-y-3">
                <div className="text-xs font-mono text-accent font-semibold">{step}</div>
                <h3 className="font-semibold text-text-primary">{title}</h3>
                <p className="text-sm text-text-secondary">{body}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Stats bar */}
        <div className="mt-20 w-full max-w-4xl">
          <div className="card p-6 grid grid-cols-3 divide-x divide-border-subtle">
            {[
              { label: 'Starting balance', value: '$1.00' },
              { label: 'Cashout threshold', value: '$200' },
              { label: 'No deposit required', value: 'Ever' },
            ].map(({ label, value }) => (
              <div key={label} className="text-center px-4">
                <div className="text-2xl font-bold font-mono text-accent">{value}</div>
                <div className="text-xs text-text-muted mt-1">{label}</div>
              </div>
            ))}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border-subtle px-4 py-6 text-center">
        <p className="text-xs text-text-disabled">
          © {new Date().getFullYear()} Penny Predict · Free-to-play prediction market platform ·{' '}
          <Link href="/rules" className="hover:text-text-muted transition-colors">Rules</Link>
        </p>
      </footer>
    </div>
  )
}
