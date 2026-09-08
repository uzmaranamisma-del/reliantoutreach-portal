import { chatGPTSignOutPath } from '@/app/chatgpt-auth';
import { ArrowRight, ShieldX } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default function UnauthorizedPage() {
  return (
    <main className="auth-page">
      <section className="auth-brand">
        <a href="/login" className="auth-logo">
          <b>R</b>
          <span>
            <strong>Reliant</strong>
            <small>OUTREACH</small>
          </span>
        </a>
        <div>
          <p>PRIVATE CLIENT PORTAL</p>
          <h1>Secure access for invited clients.</h1>
        </div>
      </section>
      <section className="auth-form">
        <div className="auth-card">
          <span className="auth-lock">
            <ShieldX />
          </span>
          <h2>Invitation required</h2>
          <p>
            This account has not been assigned to a ReliantOutreach client
            workspace. Open your invitation email or contact support.
          </p>
          <a
            className="auth-primary"
            href={chatGPTSignOutPath('/login')}
            target="_top"
          >
            Use another account <ArrowRight />
          </a>
        </div>
      </section>
    </main>
  );
}
