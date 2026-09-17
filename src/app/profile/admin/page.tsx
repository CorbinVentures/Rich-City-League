import { redirect } from 'next/navigation';
import { getServerUser } from '@/lib/server-auth';

export default async function AdminProfileEntry() {
  const { profile } = await getServerUser();
  if (!profile || (profile.role !== 'admin' && profile.role !== 'staff')) redirect('/profile');
  redirect('/admin');
}
