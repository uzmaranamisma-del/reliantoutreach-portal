import { safeRelativeReturnPath } from '@/app/chatgpt-auth';
import { sameOrigin } from '@/lib/request-security';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export async function POST(request: Request) {
  if (!sameOrigin(request))
    return Response.json({ error: 'Request could not be verified.' }, { status: 403 });
  let body: { email?: string; password?: string; returnTo?: string };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'Invalid request.' }, { status: 400 });
  }
  const email = body.email?.trim().toLowerCase() ?? '';
  const password = body.password ?? '';
  if (!email || !password)
    return Response.json(
      { error: 'Enter your email address and password.' },
      { status: 400 },
    );
  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error)
    return Response.json(
      { error: 'Email or password is incorrect.' },
      { status: 401 },
    );
  return Response.json({
    authenticated: true,
    returnTo: safeRelativeReturnPath(body.returnTo ?? '/dashboard'),
  });
}
