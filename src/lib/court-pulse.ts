/** Presentation helpers only. Court eligibility and post visibility are enforced upstream by Supabase/RLS. */
export function courtPulseImageUrl(media: unknown): string | null {
  if (!Array.isArray(media)) return null;
  for (const source of media) {
    if (typeof source !== 'string') continue;
    try {
      const url = new URL(source);
      if (url.protocol === 'https:' && /\.(png|jpe?g|webp|avif)$/i.test(url.pathname)) {
        return source;
      }
    } catch { /* Invalid or non-URL source. */ }
  }
  return null;
}

export function courtPulseRunIds(rows: unknown): string[] {
  if (!Array.isArray(rows)) return [];
  return Array.from(new Set(rows
    .filter((row): row is { id: string } => Boolean(row && typeof row === 'object' && typeof row.id === 'string'))
    .map((row) => row.id)
    .filter((id) => /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id))));
}
