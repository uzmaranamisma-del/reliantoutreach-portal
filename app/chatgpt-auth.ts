import { createServerSupabaseClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

export type ChatGPTUser = {
  userId: string;
  displayName: string;
  email: string;
  fullName: string | null;
};

export async function getChatGPTUser(): Promise<ChatGPTUser | null> {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) return null;
  const fullName =
    typeof user.user_metadata?.full_name === 'string'
      ? user.user_metadata.full_name
      : null;
  return {
    userId: user.id,
    displayName: fullName?.trim() || user.email,
    email: user.email,
    fullName,
  };
}

export async function requireChatGPTUser(
  returnTo: string,
): Promise<ChatGPTUser> {
  const user = await getChatGPTUser();
  if (user) return user;

  redirect(chatGPTSignInPath(returnTo));
}

export function chatGPTSignInPath(returnTo: string): string {
  return `/login?returnTo=${encodeURIComponent(safeRelativeReturnPath(returnTo))}`;
}

export function chatGPTSignOutPath(returnTo = '/'): string {
  return `/api/auth/signout?returnTo=${encodeURIComponent(safeRelativeReturnPath(returnTo))}`;
}

export function safeRelativeReturnPath(value: string): string {
  if (!value.startsWith('/') || value.startsWith('//')) return '/dashboard';

  let url: URL;
  try {
    url = new URL(value, 'https://app.reliantoutreach.com');
  } catch {
    return '/dashboard';
  }
  if (url.origin !== 'https://app.reliantoutreach.com') return '/dashboard';
  if (url.pathname.startsWith('/api/auth')) return '/dashboard';

  return `${url.pathname}${url.search}${url.hash}`;
}
