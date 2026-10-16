import { ImageResponse } from 'next/og';
import { getNewsBySlug } from '@/lib/public-data';

export const runtime = 'edge';
export const dynamic = 'force-dynamic';

type Design = {
  lines: [string, string, string];
  label: string;
  colors: [string, string, string];
  motif: 'court' | 'basketball' | 'world';
};

const covers: Record<string, Design> = {
  'richmond-inspire-parks-plan-basketball-courts-2026': {
    lines: ['THE FUTURE OF', 'RICHMOND', 'COURTS'],
    label: 'PARKS & COMMUNITY',
    colors: ['#0B2740', '#43C6B7', '#B2F0E4'],
    motif: 'court',
  },
  'richmond-basketball-october-2026-aau-vcu-spiders': {
    lines: ['OCTOBER', 'HOOPS', 'HEATS UP'],
    label: 'COLLEGE & AAU',
    colors: ['#182B49', '#FF9B45', '#FFD3A5'],
    motif: 'basketball',
  },
  'virginia-union-basketball-aj-english-hampton-vsu-2026': {
    lines: ['THE A.J.', 'ENGLISH', 'ERA'],
    label: 'VIRGINIA UNION',
    colors: ['#351B35', '#F0BE63', '#FFDFC0'],
    motif: 'basketball',
  },
  'virginia-high-school-basketball-2026-2027-richmond-state-championships': {
    lines: ['ROAD TO', 'THE STATE', 'FINALS'],
    label: 'HIGH SCHOOL BASKETBALL',
    colors: ['#252650', '#A5ABFF', '#E5E5FF'],
    motif: 'court',
  },
  'richmond-youth-basketball-open-gym-tryouts-october-2026': {
    lines: ['NEXT GEN', 'RICHMOND', 'HOOPS'],
    label: 'YOUTH BASKETBALL',
    colors: ['#0D3341', '#75E0D9', '#BDF9F0'],
    motif: 'basketball',
  },
  'henrico-international-youth-basketball-tournament-october-2026': {
    lines: ['BASKETBALL', 'WITHOUT', 'BORDERS'],
    label: 'HENRICO · INTERNATIONAL',
    colors: ['#1B3154', '#77B9FF', '#D8EEFF'],
    motif: 'world',
  },
  'richmond-womens-basketball-vcu-spiders-a10-2026-2027': {
    lines: ["WOMEN'S", 'HOOPS IN', 'THE SPOTLIGHT'],
    label: "WOMEN'S BASKETBALL",
    colors: ['#3C234A', '#FF9BBB', '#FFDEEA'],
    motif: 'basketball',
  },
  'richmond-basketball-2026-vcu-spiders-season-preview': {
    lines: ['RICHMOND', 'BASKETBALL', 'IS BACK'],
    label: '2026–27 SEASON PREVIEW',
    colors: ['#0E294D', '#86B7FF', '#DCEAFF'],
    motif: 'court',
  },
};

function genericDesign(title: string): Design {
  const words = title.toUpperCase().replace(/[^A-Z0-9\s-]/g, '').split(/\s+/).filter(Boolean);
  const lines = ['', '', ''];
  for (const word of words.slice(0, 9)) {
    const target = lines.findIndex(line => !line || (line + ' ' + word).length <= 16);
    if (target < 0) break;
    lines[target] = [lines[target], word].filter(Boolean).join(' ');
  }
  return {
    lines: [lines[0] || 'RICH CITY', lines[1] || 'BASKETBALL', lines[2] || 'NEWS'],
    label: 'RICH CITY HOOPS NEWSROOM',
    colors: ['#14284C', '#6CBAFF', '#E5F2FF'],
    motif: 'basketball',
  };
}

function Artwork({ motif, accent }: { motif: Design['motif']; accent: string }) {
  if (motif === 'world') {
    return (
      <svg width="510" height="515" viewBox="0 0 510 515" fill="none">
        <circle cx="262" cy="254" r="183" stroke={accent} strokeWidth="9" opacity=".85" />
        <ellipse cx="262" cy="254" rx="82" ry="183" stroke={accent} strokeWidth="6" opacity=".65" />
        <path d="M79 254H445M113 143H408M113 365H408" stroke={accent} strokeWidth="6" opacity=".5" />
        <circle cx="262" cy="254" r="164" stroke="#FFFFFF" strokeWidth="2" opacity=".14" />
        <path d="M121 370L405 145" stroke="#FFFFFF" strokeWidth="14" opacity=".15" strokeLinecap="round"/>
      </svg>
    );
  }
  if (motif === 'court') {
    return (
      <svg width="510" height="515" viewBox="0 0 510 515" fill="none">
        <path d="M87 90H435V458H87Z" stroke={accent} strokeWidth="8" opacity=".6" />
        <path d="M87 270H435M172 90V458M352 90V458" stroke={accent} strokeWidth="6" opacity=".36" />
        <circle cx="259" cy="270" r="79" stroke={accent} strokeWidth="7" opacity=".78" />
        <path d="M180 90V168H338V90M180 458V379H338V458" stroke="#FFFFFF" strokeWidth="7" opacity=".40" />
        <circle cx="259" cy="172" r="17" stroke="#FFFFFF" strokeWidth="6" opacity=".63" />
        <circle cx="259" cy="377" r="17" stroke="#FFFFFF" strokeWidth="6" opacity=".63" />
        <path d="M140 90Q259 245 375 90M140 458Q259 302 375 458" stroke={accent} strokeWidth="5" opacity=".45" />
      </svg>
    );
  }
  return (
    <svg width="510" height="515" viewBox="0 0 510 515" fill="none">
      <circle cx="252" cy="258" r="181" stroke={accent} strokeWidth="12" opacity=".88" />
      <path d="M71 258H433M252 77V439" stroke={accent} strokeWidth="10" opacity=".75" />
      <path d="M140 116C255 195 255 321 140 402M364 116C249 195 249 321 364 402" stroke={accent} strokeWidth="10" opacity=".75" />
      <circle cx="252" cy="258" r="156" stroke="#FFFFFF" strokeWidth="2" opacity=".12" />
    </svg>
  );
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  if (!/^[a-z0-9-]{3,180}$/.test(slug)) {
    return new Response('Not found', { status: 404 });
  }
  const article = await getNewsBySlug(slug);
  if (!article) return new Response('Not found', { status: 404 });

  const design = covers[slug] || genericDesign(article.title);
  const [base, accent, pale] = design.colors;
  const smallestLine = Math.max(...design.lines.map(line => line.length));
  const headlineSize = smallestLine > 16 ? 57 : smallestLine > 13 ? 65 : 76;

  return new ImageResponse(
    <div style={{
      display: 'flex', width: '1200px', height: '630px', position: 'relative',
      overflow: 'hidden', background: 'linear-gradient(115deg, #071425 0%, ' + base + ' 100%)',
      fontFamily: 'Arial, Helvetica, sans-serif', color: '#FFFFFF',
    }}>
      <div style={{
        position: 'absolute', top: -230, right: -135, display: 'flex',
        width: 700, height: 700, borderRadius: 700, background: accent, opacity: .09,
      }}/>
      <div style={{
        position: 'absolute', top: 70, right: 14, display: 'flex', opacity: .88,
        transform: 'rotate(-8deg)',
      }}>
        <Artwork motif={design.motif} accent={accent} />
      </div>
      <div style={{
        position: 'absolute', top: 0, right: 0, display: 'flex', width: 10,
        height: 630, background: accent,
      }}/>
      <div style={{
        display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
        width: 925, height: 630, padding: '46px 62px 42px 64px', position: 'relative',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{
            width: 54, height: 54, borderRadius: 11, display: 'flex', alignItems: 'center',
            justifyContent: 'center', background: '#FFFFFF', color: '#071425',
            fontSize: 41, fontWeight: 900,
          }}>R</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <div style={{ fontSize: 22, fontWeight: 900, letterSpacing: 2 }}>RICH CITY HOOPS</div>
            <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: 3, color: pale }}>THE NEWSROOM</div>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', marginTop: 22 }}>
          <div style={{
            display: 'flex', color: accent, fontSize: 20, fontWeight: 900, letterSpacing: 3,
            marginBottom: 19,
          }}>{design.label}</div>
          {design.lines.map((line, index) => (
            <div key={index} style={{
              display: 'flex', fontSize: headlineSize, fontWeight: 900, lineHeight: 1.01,
              letterSpacing: -2.8, color: index === 2 ? accent : '#FFFFFF',
            }}>{line}</div>
          ))}
          <div style={{
            display: 'flex', width: 685, color: '#DBE6F4', fontSize: 19,
            lineHeight: 1.3, marginTop: 23,
          }}>{article.title.length > 114 ? article.title.slice(0, 111) + '…' : article.title}</div>
        </div>

        <div style={{
          display: 'flex', width: 950, alignItems: 'center', justifyContent: 'space-between',
          borderTop: '1px solid #526A84', paddingTop: 18, marginTop: 25,
        }}>
          <div style={{ display: 'flex', color: '#FFFFFF', fontSize: 16, letterSpacing: 2, fontWeight: 800 }}>
            RICHCITYHOOPS.COM
          </div>
          <div style={{ display: 'flex', color: pale, fontSize: 12, letterSpacing: 1, fontWeight: 700 }}>
            ORIGINAL EDITORIAL GRAPHIC · NOT AN EVENT PHOTO
          </div>
        </div>
      </div>
    </div>,
    {
      width: 1200,
      height: 630,
      headers: {
        'Cache-Control': 'public, max-age=300, s-maxage=3600, stale-while-revalidate=86400',
      },
    },
  );
}
