'use client';

import { ArrowRight } from 'lucide-react';
import { type SyntheticEvent, useState } from 'react';

export function RegistrationForm({ email, token }: { email: string; token: string }) {
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  async function submit(event: SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError('');
    const form = new FormData(event.currentTarget);
    const passwordValue = form.get('password');
    const confirmValue = form.get('confirmPassword');
    const password = typeof passwordValue === 'string' ? passwordValue : '';
    const confirmation = typeof confirmValue === 'string' ? confirmValue : '';
    if (password !== confirmation) {
      setError('Passwords do not match.');
      setLoading(false);
      return;
    }
    try {
      const response = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, token, password, name: form.get('name') }),
      });
      const result = (await response.json()) as { error?: string; returnTo?: string };
      if (!response.ok) throw new Error(result.error || 'Registration failed.');
      window.location.assign(result.returnTo || '/dashboard');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Registration failed.');
      setLoading(false);
    }
  }
  return (
    <form className="auth-fields" onSubmit={submit}>
      <label>
        Full name
        <input name="name" autoComplete="name" required />
      </label>
      <label>
        Invited email
        <input value={email} type="email" readOnly aria-readonly="true" />
      </label>
      <label>
        Create password
        <input name="password" type="password" minLength={8} maxLength={128} autoComplete="new-password" required />
      </label>
      <label>
        Confirm password
        <input name="confirmPassword" type="password" minLength={8} maxLength={128} autoComplete="new-password" required />
      </label>
      {error ? <p className="auth-error" role="alert">{error}</p> : null}
      <button className="auth-primary" disabled={loading} type="submit">
        {loading ? 'Preparing workspace…' : 'Create account'} <ArrowRight />
      </button>
    </form>
  );
}
