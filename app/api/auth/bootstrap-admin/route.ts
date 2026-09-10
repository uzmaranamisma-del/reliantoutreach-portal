import { sameOrigin } from '@/lib/request-security';
import {
  createServerSupabaseClient,
  createSupabaseAdminClient,
} from '@/lib/supabase/server';
import {
  configuredSuperAdminEmails,
  isConfiguredSuperAdmin,
} from '@/lib/super-admin';

export async function POST(request: Request) {
  if (!sameOrigin(request))
    return Response.json(
      { error: 'Request could not be verified.' },
      { status: 403 },
    );

  let body: { email?: string; password?: string; name?: string };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'Invalid request.' }, { status: 400 });
  }

  const email = body.email?.trim().toLowerCase() ?? '';
  const password = body.password ?? '';
  const name = body.name?.trim().slice(0, 120) ?? '';
  if (
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
    !isConfiguredSuperAdmin(email)
  )
    return Response.json(
      { error: 'Use the authorized ReliantOutreach administrator email.' },
      { status: 403 },
    );
  if (password.length < 8 || password.length > 128)
    return Response.json(
      { error: 'Use a password with at least 8 characters.' },
      { status: 400 },
    );
  if (!name)
    return Response.json(
      { error: 'Enter the administrator name.' },
      { status: 400 },
    );

  const admin = createSupabaseAdminClient();
  const configured = configuredSuperAdminEmails();
  const { data: existing, error: listError } = await admin.auth.admin.listUsers(
    {
      page: 1,
      perPage: 1000,
    },
  );
  if (listError)
    return Response.json(
      { error: 'Administrator setup status could not be checked.' },
      { status: 502 },
    );
  const existingAdministrator = existing.users.find(
    (user) => user.email && configured.includes(user.email.toLowerCase()),
  );
  if (existingAdministrator?.email_confirmed_at)
    return Response.json(
      { error: 'Administrator setup is already complete. Sign in instead.' },
      { status: 409 },
    );

  const appUrl = (
    process.env.APP_URL ?? 'https://app.reliantoutreach.com'
  ).replace(/\/$/, '');
  const supabase = await createServerSupabaseClient();
  if (existingAdministrator) {
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email,
      options: {
        emailRedirectTo: `${appUrl}/auth/confirm?next=/dashboard`,
      },
    });
    if (error)
      return Response.json(
        {
          error:
            'A fresh verification email could not be sent yet. Please wait briefly and try again.',
        },
        { status: 429 },
      );
    return Response.json({ verificationRequired: true, resent: true });
  }

  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { full_name: name },
      emailRedirectTo: `${appUrl}/auth/confirm?next=/dashboard`,
    },
  });
  if (error)
    return Response.json(
      { error: 'Verification email could not be sent. Please try again.' },
      { status: 502 },
    );

  return Response.json({ verificationRequired: true });
}
