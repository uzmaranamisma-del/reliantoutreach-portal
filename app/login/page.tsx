import { ArrowRight, CheckCircle2, LockKeyhole } from 'lucide-react';
import {
  chatGPTSignInPath,
  chatGPTSignOutPath,
  getChatGPTUser,
} from '@/app/chatgpt-auth';
export const dynamic = 'force-dynamic';
export default async function LoginPage() {
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
          <p>REVENUE INFRASTRUCTURE</p>
          <h1>
            Predictable pipeline.
            <br />
            Scalable growth.
          </h1>
          <span>
            Manage your complete outbound operation from one secure workspace.
          </span>
          <ul>
            <li>
              <CheckCircle2 />
              Campaign and prospect visibility
            </li>
            <li>
              <CheckCircle2 />
              Replies, meetings and pipeline tracking
            </li>
            <li>
              <CheckCircle2 />
              Secure workspace-level data isolation
            </li>
          </ul>
        </div>
        <footer>© 2026 ReliantOutreach</footer>
      </section>
      <section className="auth-form">
        <div className="auth-card">
          <span className="auth-lock">
            <LockKeyhole />
          </span>
          <h2>Welcome back</h2>
          <p>Sign in securely to access your ReliantOutreach workspace.</p>
          {user ? (
            <>
              <div className="signed-user">
                <span>{user.displayName.slice(0, 2).toUpperCase()}</span>
                <div>
                  <b>{user.displayName}</b>
                  <small>{user.email}</small>
                </div>
              </div>
              <a className="auth-primary" href="/dashboard">
                Continue to workspace <ArrowRight />
              </a>
              <a
                className="auth-secondary"
                href={chatGPTSignOutPath('/login')}
                target="_top"
              >
                Use another account
              </a>
            </>
          ) : (
            <a
              className="auth-primary"
              href={chatGPTSignInPath('/dashboard')}
              target="_top"
            >
              Sign in securely <ArrowRight />
            </a>
          )}
          <div className="auth-divider">
            <i />
            New to ReliantOutreach?
            <i />
          </div>
          <a className="auth-secondary" href="/signup">
            Register new user
          </a>
          <small className="auth-note">
            Access is protected with secure identity verification and encrypted
            sessions.
          </small>
        </div>
      </section>
    </main>
  );
}
