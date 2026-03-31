'use client'

import { useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

export default function SignupPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [username, setUsername] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const supabase = createClient()

    const { error: signupError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { username },
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    })

    if (signupError) {
      setError(signupError.message)
      setLoading(false)
      return
    }

    setSuccess(true)
    setLoading(false)
  }

  if (success) {
    return (
      <div className="card p-8 text-center">
        <div className="w-12 h-12 rounded-full bg-yes-muted border border-yes-dim flex items-center justify-center mx-auto mb-4">
          <svg className="w-6 h-6 text-yes" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h2 className="text-lg font-semibold text-text-primary mb-2">Check your email</h2>
        <p className="text-sm text-text-secondary">
          We&apos;ve sent a verification link to <strong className="text-text-primary">{email}</strong>.
          Verify your email to activate your $1.00 starting balance.
        </p>
      </div>
    )
  }

  return (
    <div className="card p-8">
      <h1 className="text-xl font-semibold text-text-primary mb-1">Create your account</h1>
      <p className="text-sm text-text-secondary mb-6">
        You&apos;ll receive $1.00 in credits after email verification.
      </p>

      <form onSubmit={handleSignup} className="space-y-4">
        <div>
          <label htmlFor="username" className="label">Username</label>
          <input
            id="username"
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="satoshi"
            className="input"
            required
            minLength={3}
            maxLength={20}
            pattern="[a-zA-Z0-9_]+"
            title="Letters, numbers, and underscores only"
          />
        </div>

        <div>
          <label htmlFor="email" className="label">Email address</label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            className="input"
            required
          />
        </div>

        <div>
          <label htmlFor="password" className="label">Password</label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Min 8 characters"
            className="input"
            required
            minLength={8}
          />
        </div>

        {error && (
          <div className="p-3 rounded bg-no-muted border border-no-dim text-no text-sm">
            {error}
          </div>
        )}

        <button type="submit" className="btn-primary w-full" disabled={loading}>
          {loading ? 'Creating account…' : 'Create account'}
        </button>
      </form>

      <p className="mt-5 text-center text-sm text-text-muted">
        Already have an account?{' '}
        <Link href="/login" className="text-accent hover:text-accent-dim transition-colors">
          Sign in
        </Link>
      </p>
    </div>
  )
}
