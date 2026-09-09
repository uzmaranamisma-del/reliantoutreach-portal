'use client';

import { ArrowRight } from 'lucide-react';
import { type SyntheticEvent, useState } from 'react';

export function LoginForm({ returnTo }: { returnTo: string }) {
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  async function submit(event: SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError('');
    const form = new FormData(event.currentTarget);
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: form.get('email'),
          password: form.get('password'),
          returnTo,
        }),
      });
      const result = (await response.json()) as { error?: string; returnTo?: string };
      if (!response.ok) throw new Error(result.error || 'Sign in failed.');
      window.location.assign(result.returnTo || '/dashboard');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Sign in failed.');
      setLoading(false);
    }
  }
  return (
    <form className="auth-fields" onSubmit={submit}>
      <label>
        Email address
        <input name="email" type="email" autoComplete="email" required />
      </label>
      <label>
        Password
        <input name="password" type="password" autoComplete="current-password" required />
      </label>
      {error ? <p className="auth-error" role="alert">{error}</p> : null}
      <button className="auth-primary" disabled={loading} type="submit">
        {loading ? 'Signing in…' : 'Sign in to workspace'} <ArrowRight />
      </button>
    </form>
  );
}
