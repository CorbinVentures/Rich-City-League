import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const alt = 'Rich City League — Richmond basketball, competition and community';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          position: 'relative',
          overflow: 'hidden',
          background: '#070b10',
          color: 'white',
          fontFamily: 'Arial, sans-serif',
        }}
      >
        <div style={{ position: 'absolute', inset: 0, display: 'flex', background: 'radial-gradient(circle at 80% 25%, rgba(255,106,0,.30), transparent 32%), linear-gradient(135deg,#080c12 0%,#101820 58%,#05070a 100%)' }} />
        <div style={{ position: 'absolute', right: -90, top: -120, width: 620, height: 620, border: '22px solid rgba(255,106,0,.14)', borderRadius: 620, display: 'flex' }} />
        <div style={{ position: 'absolute', right: 78, top: 74, width: 320, height: 320, border: '8px solid rgba(255,255,255,.09)', borderRadius: 320, display: 'flex' }} />
        <div style={{ position: 'absolute', right: 212, top: 74, width: 8, height: 325, background: 'rgba(255,255,255,.09)', display: 'flex' }} />
        <div style={{ position: 'absolute', left: 0, top: 0, width: 16, height: '100%', background: '#ff6a00', display: 'flex' }} />

        <div style={{ padding: '66px 72px 58px 82px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', width: '100%', zIndex: 2 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
            <div style={{ width: 70, height: 70, borderRadius: 70, border: '5px solid #ff6a00', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 25, fontWeight: 900 }}>RCL</div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: 5, color: '#ff7a1a' }}>EST. 2011 · RICHMOND, VA</div>
              <div style={{ marginTop: 7, fontSize: 18, color: '#aab4c0', letterSpacing: 2 }}>RICH CITY LEAGUE</div>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', maxWidth: 820 }}>
            <div style={{ fontSize: 76, lineHeight: .96, fontWeight: 900, letterSpacing: -4 }}>RICHMOND<br/>BASKETBALL LIVES HERE.</div>
            <div style={{ marginTop: 26, fontSize: 27, color: '#d3dae2', lineHeight: 1.3 }}>League play · Player profiles · REP · Runs · Stats · Media · Community</div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ fontSize: 23, fontWeight: 800, letterSpacing: 2 }}>RICHCITYHOOPS.COM</div>
            <div style={{ padding: '13px 22px', borderRadius: 999, background: '#ff6a00', color: '#080b0f', fontSize: 19, fontWeight: 900, letterSpacing: 1 }}>BUILD YOUR REP</div>
          </div>
        </div>
      </div>
    ),
    size,
  );
}
