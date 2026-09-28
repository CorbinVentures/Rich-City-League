import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const alt = 'RCL Network — Richmond basketball lives here';
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
          background: '#03070D',
          color: '#F6F8FB',
          fontFamily: 'Arial, sans-serif',
        }}
      >
        <div style={{ position: 'absolute', inset: 0, display: 'flex', background: 'radial-gradient(circle at 82% 20%, rgba(21,159,255,.24), transparent 31%), radial-gradient(circle at 16% 86%, rgba(255,79,22,.18), transparent 34%), linear-gradient(135deg,#03070D 0%,#071522 58%,#03070D 100%)' }} />
        <div style={{ position: 'absolute', right: -90, top: -120, width: 620, height: 620, border: '22px solid rgba(21,159,255,.12)', borderRadius: 620, display: 'flex' }} />
        <div style={{ position: 'absolute', right: 78, top: 74, width: 320, height: 320, border: '8px solid rgba(246,248,251,.08)', borderRadius: 320, display: 'flex' }} />
        <div style={{ position: 'absolute', right: 212, top: 74, width: 8, height: 325, background: 'rgba(246,248,251,.08)', display: 'flex' }} />
        <div style={{ position: 'absolute', left: 0, top: 0, width: 16, height: '100%', background: '#FF4F16', display: 'flex' }} />

        <div style={{ padding: '66px 72px 58px 82px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', width: '100%', zIndex: 2 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
            <div style={{ width: 70, height: 70, borderRadius: 70, border: '5px solid #FF4F16', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 25, fontWeight: 900 }}>RCL</div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: 5, color: '#FF4F16' }}>RCL NETWORK · EST. 2011</div>
              <div style={{ marginTop: 7, fontSize: 18, color: '#7D90A3', letterSpacing: 2 }}>RICHMOND, VIRGINIA · 804</div>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', maxWidth: 850 }}>
            <div style={{ fontSize: 76, lineHeight: .96, fontWeight: 900, letterSpacing: -4, display: 'flex', flexDirection: 'column' }}>
              <span>RICHMOND BASKETBALL.</span>
              <span style={{ color: '#159FFF' }}>ONE NETWORK.</span>
            </div>
            <div style={{ marginTop: 26, fontSize: 27, color: '#D9E0E7', lineHeight: 1.3 }}>Feed · Profiles · REP · Runs · League · Community</div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ fontSize: 23, fontWeight: 800, letterSpacing: 2 }}>RICHCITYHOOPS.COM</div>
            <div style={{ padding: '13px 22px', borderRadius: 999, background: '#FF4F16', color: '#03070D', fontSize: 19, fontWeight: 900, letterSpacing: 1, display: 'flex' }}>BUILD YOUR IDENTITY</div>
          </div>
        </div>
      </div>
    ),
    size,
  );
}
