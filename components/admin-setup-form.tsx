'use client';

import { ArrowRight } from 'lucide-react';
import { type SyntheticEvent, useState } from 'react';

export function AdminSetupForm() {
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  async function submit(event: SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError('');
    const form = new FormData(event.currentTarget);
    const passwordValue = form.get('password');
    const confirmationValue = form.get('confirmPassword');
    const password = typeof passwordValue === 'string' ? passwordValue : '';
    const confirmation =
      typeof confirmationValue === 'string' ? confirmationValue : '';
    if (password !== confirmation) {
      setError('Passwords do not match.');
      setLoading(false);
      return;
    }

    try {
      const response = await fetch('/api/auth/bootstrap-admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: form.get('email'),
          name: form.get('name'),
          password,
        }),
      });
      const result = (await response.json().catch(() => ({}))) as {
        error?: string;
      };
      if (!response.ok)
        throw new Error(
          result.error || 'Administrator setup could not be started.',
        );
      setSuccess(true);
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : 'Administrator setup could not be started.',
      );
    } finally {
      setLoading(false);
    }
  }

  if (success)
    return (
      <div className="auth-fields">
        <p className="auth-success" role="status">
          Verification email sent. Open it to activate the ReliantOutreach
          administrator account, then sign in with the password you selected.
        </p>
        <a className="auth-primary" href="/login">
          Return to sign in <ArrowRight />
        </a>
      </div>
    );

  return (
    <form className="auth-fields" onSubmit={submit}>
      <label>
        Full name
        <input name="name" autoComplete="name" required maxLength={120} />
      </label>
      <label>
        Administrator email
        <input name="email" type="email" autoComplete="email" required />
      </label>
      <label>
        Create password
        <input
          name="password"
          type="password"
          minLength={8}
          maxLength={128}
          autoComplete="new-password"
          required
        />
      </label>
      <label>
        Confirm password
        <input
          name="confirmPassword"
          type="password"
          minLength={8}
          maxLength={128}
          autoComplete="new-password"
          required
        />
      </label>
      {error ? (
        <p className="auth-error" role="alert">
          {error}
        </p>
      ) : null}
      <button className="auth-primary" disabled={loading} type="submit">
        {loading ? 'Sending verification…' : 'Create administrator account'}{' '}
        <ArrowRight />
      </button>
    </form>
  );
}
