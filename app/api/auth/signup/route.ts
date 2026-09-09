import { getDb } from '@/db';
import { workspaceInvitations } from '@/db/schema';
import { hashInvitationToken } from '@/lib/invitation-token';
import { sameOrigin } from '@/lib/request-security';
import {
  createServerSupabaseClient,
  createSupabaseAdminClient,
} from '@/lib/supabase/server';
import { and, eq, gt } from 'drizzle-orm';

export async function POST(request: Request) {
  if (!sameOrigin(request))
    return Response.json({ error: 'Request could not be verified.' }, { status: 403 });
  let body: { email?: string; password?: string; name?: string; token?: string };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'Invalid request.' }, { status: 400 });
  }
  const email = body.email?.trim().toLowerCase() ?? '';
  const password = body.password ?? '';
  const name = body.name?.trim().slice(0, 120) || email.split('@')[0];
  const token = body.token?.trim() ?? '';
  if (!/^[a-f0-9]{64}$/i.test(token))
    return Response.json({ error: 'Invitation link is invalid.' }, { status: 400 });
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    return Response.json({ error: 'Enter a valid email address.' }, { status: 400 });
  if (password.length < 8 || password.length > 128)
    return Response.json(
      { error: 'Use a password with at least 8 characters.' },
      { status: 400 },
    );

  const db = getDb();
  const tokenHash = await hashInvitationToken(token);
  const [invitation] = await db
    .select({ email: workspaceInvitations.email })
    .from(workspaceInvitations)
    .where(
      and(
        eq(workspaceInvitations.tokenHash, tokenHash),
        eq(workspaceInvitations.status, 'pending'),
        gt(workspaceInvitations.expiresAt, new Date()),
      ),
    )
    .limit(1);
  if (!invitation || invitation.email.toLowerCase() !== email)
    return Response.json(
      { error: 'Use the email address that received this invitation.' },
      { status: 403 },
    );

  const admin = createSupabaseAdminClient();
  const { error: createError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: name },
  });
  if (createError && !createError.message.toLowerCase().includes('already'))
    return Response.json(
      { error: 'Your account could not be created. Please try again.' },
      { status: 502 },
    );

  const supabase = await createServerSupabaseClient();
  const { error: signInError } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  if (signInError)
    return Response.json(
      {
        error: createError
          ? 'This account already exists. Sign in with its current password.'
          : 'Account created. Please sign in to continue.',
      },
      { status: 409 },
    );
  return Response.json({
    registered: true,
    returnTo: `/accept-invitation?token=${encodeURIComponent(token)}`,
  });
}
