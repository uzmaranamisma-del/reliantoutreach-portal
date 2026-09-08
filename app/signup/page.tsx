import { ArrowRight, UserPlus } from 'lucide-react';
export const dynamic = 'force-dynamic';
export default async function SignupPage() {
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
          <h2>Request client access</h2>
          <p>
            ReliantOutreach is invitation-only. Your workspace is prepared and
            synchronized before access is issued.
          </p>
          <a className="auth-primary" href="/login">
            Sign in with an invitation <ArrowRight />
          </a>
          <div className="auth-divider">
            <i />
            Need access?
            <i />
          </div>
          <a
            className="auth-secondary"
            href="mailto:info@reliantoutreach.com?subject=Client portal access"
          >
            Contact your ReliantOutreach account manager
          </a>
          <small className="auth-note">
            Use the same email address that received your private invitation.
          </small>
        </div>
      </section>
    </main>
  );
}
