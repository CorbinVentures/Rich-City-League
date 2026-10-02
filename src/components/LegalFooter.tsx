import Link from 'next/link';

const links=[
  ['About','/about'],
  ['Membership','/membership'],
  ['Shop','/shop'],
  ['Legal','/legal'],
  ['Privacy','/legal/privacy'],
  ['Safety','/legal/safety'],
];

export function LegalFooter(){
  return <footer className="rcl-legal-footer">
    <div className="rcl-legal-footer-inner">
      <div><b>RCL</b><p>Richmond basketball, connected. · © {new Date().getFullYear()}</p></div>
      <nav aria-label="RCL links">{links.map(([label,href])=><Link key={href} href={href}>{label}</Link>)}</nav>
    </div>
  </footer>;
}
