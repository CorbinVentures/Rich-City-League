import Link from 'next/link';

export function SectionHeading({
  eyebrow,
  title,
  href,
}: {
  eyebrow?: string;
  title: string;
  href?: string;
}) {
  return (
    <div className="mb-6 flex items-end justify-between gap-4">
      <div>
        {eyebrow && <p className="mb-2 text-xs font-bold uppercase tracking-[0.2em] text-rcl-gold">{eyebrow}</p>}
        <h2 className="font-display text-2xl font-bold text-white sm:text-3xl">{title}</h2>
      </div>
      {href && (
        <Link href={href} className="text-sm font-semibold text-rcl-gold hover:text-white">
          View all →
        </Link>
      )}
    </div>
  );
}
