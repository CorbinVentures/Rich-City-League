import { ImageResponse } from 'next/og';

// Served anonymously as a real PNG by Next.js at /opengraph-image.
// Use this route (rather than the legacy broken static PNG) for social cards.
export const runtime = 'edge';
export const alt = 'Rich City Hoops — Virginia basketball connected';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function Image() {
  return new ImageResponse(
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        padding: '54px 68px',
        backgroundColor: '#08162E',
        color: '#FFFFFF',
        fontFamily: 'Arial, sans-serif',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 22 }}>
        <div
          style={{
            width: 78, height: 78, display: 'flex',
            alignItems: 'center', justifyContent: 'center',
            backgroundColor: '#FFFFFF', color: '#08162E',
            fontSize: 57, fontWeight: 900, borderRadius: 15,
          }}
        >
          R
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
          <div style={{ fontSize: 29, fontWeight: 900, letterSpacing: 3 }}>
            RICH CITY HOOPS
          </div>
          <div style={{ color: '#79B8F8', fontSize: 18, letterSpacing: 3 }}>
            VIRGINIA BASKETBALL COMMUNITY
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
        <div style={{ display: 'flex', flexDirection: 'column', fontSize: 76, fontWeight: 900, letterSpacing: -2, lineHeight: 1.05 }}>
          <div style={{ display: 'flex' }}>THE GAME IS</div>
          <div style={{ display: 'flex', color: '#5BBBFF' }}>BIGGER HERE.</div>
        </div>
        <div style={{ display: 'flex', color: '#CFDCEF', fontSize: 25 }}>
          Players · Runs · Highlights · Teams · Rich City League
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '2px solid #24446A', paddingTop: 27 }}>
        <div style={{ fontSize: 23, fontWeight: 900, letterSpacing: 2 }}>
          RICHCITYHOOPS.COM
        </div>
        <div style={{ display: 'flex', color: '#FFCA73', fontSize: 20, fontWeight: 800, letterSpacing: 1 }}>
          JOIN THE COMMUNITY
        </div>
      </div>
    </div>,
    size,
  );
}
