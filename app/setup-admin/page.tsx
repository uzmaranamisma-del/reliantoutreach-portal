import { AdminSetupForm } from '@/components/admin-setup-form';
import { createSupabaseAdminClient } from '@/lib/supabase/server';
import { configuredSuperAdminEmails } from '@/lib/super-admin';
import { ShieldCheck } from 'lucide-react';

export const dynamic = 'force-dynamic';

async function setupAvailable() {
  const configured = configuredSuperAdminEmails();
  if (configured.length === 0) return false;
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin.auth.admin.listUsers({
    page: 1,
    perPage: 1000,
  });
  if (error) throw new Error('Administrator setup status is unavailable.');
  return !data.users.some(
    (user) => user.email && configured.includes(user.email.toLowerCase()),
  );
}

export default async function SetupAdminPage() {
  const available = await setupAvailable();
  return (
    <main className="auth-page">
      <section className="auth-brand">
        <a href="/" className="auth-logo">
          <b>R</b>
          <span>
            <strong>Reliant</strong>
            <small>OUTREACH</small>
          </span>
        </a>
        <div>
          <p>SECURE PLATFORM SETUP</p>
          <h1>
            Your private outreach
            <br />
            operating system.
          </h1>
          <span>
            This one-time setup is available only to an authorized
            ReliantOutreach administrator.
          </span>
        </div>
        <footer>© 2026 ReliantOutreach</footer>
      </section>
      <section className="auth-form">
        <div className="auth-card">
          <span className="auth-lock">
            <ShieldCheck />
          </span>
          <h2>
            {available
              ? 'Create administrator account'
              : 'Setup already completed'}
          </h2>
          <p>
            {available
              ? 'Use the authorized administrator email and choose your password. Email verification is required.'
              : 'The platform administrator account already exists. Sign in to continue.'}
          </p>
          {available ? <AdminSetupForm /> : null}
          <a className="auth-secondary" href="/login">
            Return to sign in
          </a>
        </div>
      </section>
    </main>
  );
}
