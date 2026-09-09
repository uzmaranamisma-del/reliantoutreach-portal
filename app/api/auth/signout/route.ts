import { safeRelativeReturnPath } from '@/app/chatgpt-auth';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const supabase = await createServerSupabaseClient();
  await supabase.auth.signOut();
  const returnTo = safeRelativeReturnPath(
    new URL(request.url).searchParams.get('returnTo') ?? '/login',
  );
  return NextResponse.redirect(new URL(returnTo, request.url));
}
