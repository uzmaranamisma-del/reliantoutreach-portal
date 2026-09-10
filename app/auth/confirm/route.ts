import { createServerSupabaseClient } from '@/lib/supabase/server';
import type { EmailOtpType } from '@supabase/supabase-js';
import { NextResponse, type NextRequest } from 'next/server';

const allowedOtpTypes = new Set<EmailOtpType>([
  'email',
  'invite',
  'magiclink',
  'recovery',
  'email_change',
]);

export async function GET(request: NextRequest) {
  const publicOrigin = process.env.APP_URL ?? request.nextUrl.origin;
  const redirectTo = new URL('/dashboard', publicOrigin);
  const supabase = await createServerSupabaseClient();
  const code = request.nextUrl.searchParams.get('code');
  const tokenHash = request.nextUrl.searchParams.get('token_hash');
  const type = request.nextUrl.searchParams.get('type') as EmailOtpType | null;

  let error: Error | null = null;
  if (code) {
    const result = await supabase.auth.exchangeCodeForSession(code);
    error = result.error;
  } else if (tokenHash && type && allowedOtpTypes.has(type)) {
    const result = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type,
    });
    error = result.error;
  } else {
    error = new Error('Invalid verification link.');
  }

  if (!error) return NextResponse.redirect(redirectTo);
  redirectTo.pathname = '/setup-admin';
  redirectTo.searchParams.set('error', 'verification_failed');
  return NextResponse.redirect(redirectTo);
}
