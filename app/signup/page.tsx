import { RegistrationForm } from '@/components/registration-form';
import { UserPlus } from 'lucide-react';
export const dynamic = 'force-dynamic';
export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ email?: string; token?: string }>;
}) {
  const values = await searchParams;
  const email = values.email?.trim().toLowerCase() ?? '';
  const token = values.token?.trim() ?? '';
  const validInvitation =
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && /^[a-f0-9]{64}$/i.test(token);
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
          <p>INVITATION-ONLY ACCESS</p>
          <h1>
            Your outbound operation,
            <br />
            all in one place.
          </h1>
          <span>
            Every client workspace is privately prepared before access is
            issued.
          </span>
        </div>
        <footer>Revenue Infrastructure for B2B Companies</footer>
      </section>
      <section className="auth-form">
        <div className="auth-card">
          <span className="auth-lock">
            <UserPlus />
          </span>
          <h2>{validInvitation ? 'Create your password' : 'Private access only'}</h2>
          <p>{validInvitation ? 'Set your password to securely access the workspace prepared for you.' : 'Open the private invitation sent by ReliantOutreach to register your account.'}</p>
          {validInvitation ? <RegistrationForm email={email} token={token} /> : null}
          <div className="auth-divider">
            <i />
            Need access?
            <i />
          </div>
          <a className="auth-secondary" href={validInvitation ? '/login' : 'mailto:info@reliantoutreach.com?subject=Client portal access'}>
            {validInvitation ? 'Already registered? Sign in' : 'Contact your ReliantOutreach account manager'}
          </a>
          <small className="auth-note">
            Use the same email address that received your private invitation.
          </small>
        </div>
      </section>
    </main>
  );
}
