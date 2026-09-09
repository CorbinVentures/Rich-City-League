import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Rich City League',
  description: 'Richmond basketball league platform',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
