import type { Metadata } from 'next';
import './lab-training-polish.css';

export const metadata: Metadata = {
  title: 'The Lab | Rich City League',
  description: 'Build focused basketball workouts, study technique, and track your player development with Rich City League.',
};

export default function SectionLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
