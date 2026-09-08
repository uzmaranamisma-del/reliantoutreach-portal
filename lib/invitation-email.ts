import { decryptSecret } from '@/lib/crypto';

type InvitationRole = 'client_admin' | 'client_viewer';

export class InvitationDeliveryError extends Error {
  constructor(
    public readonly status: number,
    public readonly providerCode?: string,
  ) {
    super('EMAIL_DELIVERY_FAILED');
    this.name = 'InvitationDeliveryError';
  }
}

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

export async function deliverWorkspaceInvitation(input: {
  credentialsCiphertext: string;
  email: string;
  invitationId: string;
  invitationToken: string;
  portalUrl: string;
  role: InvitationRole;
  workspaceName: string;
}) {
  const credentials = JSON.parse(
    await decryptSecret(input.credentialsCiphertext),
  ) as { apiKey?: string; fromEmail?: string };
  if (!credentials.apiKey || !credentials.fromEmail)
    throw new Error('INVITATION_EMAIL_NOT_CONFIGURED');

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${credentials.apiKey}`,
      'Content-Type': 'application/json',
      'Idempotency-Key': `workspace-invite-${input.invitationId}`,
      'User-Agent': 'ReliantOutreach Portal/1.0',
    },
    body: JSON.stringify({
      from: `ReliantOutreach <${credentials.fromEmail}>`,
      to: [input.email],
      subject: `You are invited to ${input.workspaceName}`,
      html: `<div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;padding:32px;color:#0e2317"><div style="display:inline-grid;place-items:center;width:38px;height:38px;border-radius:10px;background:#c8f169;font-weight:800">R</div><h1 style="font-size:24px">You are invited to ReliantOutreach</h1><p>You have been invited to join <strong>${escapeHtml(input.workspaceName)}</strong> as ${input.role === 'client_admin' ? 'Client Admin' : 'Client Viewer'}.</p><a href="${escapeHtml(input.portalUrl)}/accept-invitation?token=${encodeURIComponent(input.invitationToken)}" style="display:inline-block;margin-top:16px;padding:12px 18px;border-radius:10px;background:#0e2317;color:#fff;text-decoration:none;font-weight:700">Accept invitation</a><p style="margin-top:24px;color:#6b7a70;font-size:13px">Use ${escapeHtml(input.email)} when signing in. This private invitation expires in 7 days.</p></div>`,
    }),
    signal: AbortSignal.timeout(15_000),
  });
  if (!response.ok) {
    const errorBody = (await response.json().catch(() => null)) as {
      name?: string;
    } | null;
    throw new InvitationDeliveryError(response.status, errorBody?.name);
  }
}
