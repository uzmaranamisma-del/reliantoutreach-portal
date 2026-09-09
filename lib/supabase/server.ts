import { createServerClient } from '@supabase/ssr';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

function configuration() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey)
    throw new Error('Supabase authentication is not configured.');
  return { url, anonKey };
}

export async function createServerSupabaseClient() {
  const { url, anonKey } = configuration();
  const cookieStore = await cookies();
  return createServerClient(url, anonKey, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: (items) => {
        try {
          for (const { name, value, options } of items)
            cookieStore.set(name, value, options);
        } catch {
          // Middleware refreshes sessions when a Server Component cannot write.
        }
      },
    },
  });
}

export function createSupabaseAdminClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey =
    process.env.SUPABASE_SECRET_KEY ??
    process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey)
    throw new Error('Supabase administration is not configured.');
  return createClient(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
