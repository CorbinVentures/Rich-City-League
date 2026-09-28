import { redirect } from 'next/navigation';

export default async function NetworkPostPermalink({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  redirect(`/social?post=${encodeURIComponent(id)}`);
}
