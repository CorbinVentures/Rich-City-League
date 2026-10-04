import { redirect } from 'next/navigation';

export const metadata = {
  title: 'Rich City Hoops',
  robots: { index: false, follow: false },
};

export default function AccessPage() {
  redirect('/');
}
