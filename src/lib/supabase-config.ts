export type SupabaseConfigStatus = 'configured' | 'missing-url' | 'missing-anon-key' | 'invalid-url';

export type SupabaseConfig = {
  status: SupabaseConfigStatus;
  url: string | null;
  anonKey: string | null;
};

export function getSupabaseConfig(): SupabaseConfig {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() || null;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() || null;

  if (!url) return { status: 'missing-url', url, anonKey };
  if (!anonKey) return { status: 'missing-anon-key', url, anonKey };

  try {
    const parsedUrl = new URL(url);
    if (!['http:', 'https:'].includes(parsedUrl.protocol) || !parsedUrl.hostname) {
      return { status: 'invalid-url', url, anonKey };
    }
  } catch {
    return { status: 'invalid-url', url, anonKey };
  }

  return { status: 'configured', url, anonKey };
}

export function getSupabaseConfigMessage(status: SupabaseConfigStatus): string {
  switch (status) {
    case 'missing-url':
      return 'Supabase URL is missing. Add NEXT_PUBLIC_SUPABASE_URL to the deployment environment.';
    case 'missing-anon-key':
      return 'Supabase public key is missing. Add NEXT_PUBLIC_SUPABASE_ANON_KEY to the deployment environment.';
    case 'invalid-url':
      return 'Supabase URL is invalid. Check NEXT_PUBLIC_SUPABASE_URL in the deployment environment.';
    default:
      return 'Supabase is configured.';
  }
}
