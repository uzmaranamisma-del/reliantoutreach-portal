import { ArrowRight, BadgeCheck, UserPlus } from 'lucide-react';
import { chatGPTSignInPath, getChatGPTUser } from '@/app/chatgpt-auth';
export const dynamic = 'force-dynamic';
export default async function SignupPage() {
  const user = await getChatGPTUser();
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
          <p>CREATE YOUR ACCOUNT</p>
          <h1>
            Your outbound operation,
            <br />
            all in one place.
          </h1>
          <span>
            Register securely and create your isolated ReliantOutreach
            workspace.
          </span>
        </div>
        <footer>Revenue Infrastructure for B2B Companies</footer>
      </section>
      <section className="auth-form">
        <div className="auth-card">
          <span className="auth-lock">
            <UserPlus />
          </span>
          <h2>Register new user</h2>
          <p>
            Your verified identity becomes your secure ReliantOutreach account.
          </p>
          {user ? (
            <>
              <div className="registration-ready">
                <BadgeCheck />
                <div>
                  <b>Identity verified</b>
                  <small>{user.email}</small>
                </div>
              </div>
              <a className="auth-primary" href="/prospects">
                Create my workspace <ArrowRight />
              </a>
            </>
          ) : (
            <a
              className="auth-primary"
              href={chatGPTSignInPath('/prospects')}
              target="_top"
            >
              Verify and register <ArrowRight />
            </a>
          )}
          <div className="auth-divider">
            <i />
            Already registered?
            <i />
          </div>
          <a className="auth-secondary" href="/login">
            Back to sign in
          </a>
          <small className="auth-note">
            By registering, you agree to use the platform responsibly and
            protect your account access.
          </small>
        </div>
      </section>
    </main>
  );
}
