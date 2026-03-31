export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-bg-base flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <a href="/" className="inline-flex items-center gap-2">
            <span className="text-2xl font-bold text-accent tracking-tight">
              Penny<span className="text-text-primary">Predict</span>
            </span>
          </a>
          <p className="mt-2 text-sm text-text-muted">
            Start with $1. Trade real prediction markets.
          </p>
        </div>
        {children}
      </div>
    </div>
  )
}
