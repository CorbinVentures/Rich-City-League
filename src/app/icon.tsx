import { ImageResponse } from 'next/og';

export const size = { width: 512, height: 512 };
export const contentType = 'image/png';

export default function Icon() {
  return new ImageResponse(
    <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', overflow: 'hidden', background: 'radial-gradient(circle at 30% 18%, #173247 0%, #07111b 34%, #02060b 74%)', color: '#f8fbfd' }}>
      <div style={{ position: 'absolute', inset: 18, borderRadius: 116, border: '3px solid rgba(191,229,249,.38)', boxShadow: 'inset 0 0 0 2px rgba(255,255,255,.045), 0 34px 90px rgba(0,0,0,.5)' }} />
      <div style={{ position: 'absolute', width: 390, height: 390, borderRadius: 999, border: '3px solid rgba(145,206,242,.16)', boxShadow: '0 0 90px rgba(91,177,226,.14)' }} />
      <div style={{ position: 'absolute', width: 355, height: 355, borderRadius: 999, border: '17px solid rgba(145,206,242,.11)' }} />
      <div style={{ position: 'absolute', width: 348, height: 3, background: 'rgba(145,206,242,.22)', transform: 'rotate(-18deg)' }} />
      <div style={{ position: 'absolute', width: 348, height: 3, background: 'rgba(145,206,242,.18)', transform: 'rotate(58deg)' }} />
      <div style={{ position: 'absolute', width: 205, height: 330, borderRadius: '50%', border: '3px solid rgba(145,206,242,.2)', transform: 'rotate(24deg)' }} />
      <div style={{ position: 'absolute', width: 205, height: 330, borderRadius: '50%', border: '3px solid rgba(145,206,242,.16)', transform: 'rotate(-24deg)' }} />
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative', transform: 'translateY(2px)' }}>
        <div style={{ fontSize: 120, lineHeight: 1, fontWeight: 900, letterSpacing: -9, textShadow: '0 6px 30px rgba(0,0,0,.65)' }}>RCL</div>
        <div style={{ width: 194, height: 5, borderRadius: 99, marginTop: 12, background: 'linear-gradient(90deg, rgba(145,206,242,0), #bfe8ff 32%, #78bfe8 68%, rgba(145,206,242,0))' }} />
        <div style={{ marginTop: 17, fontSize: 19, fontWeight: 800, letterSpacing: 8, color: '#91cef2' }}>RICHMOND</div>
      </div>
      <div style={{ position: 'absolute', bottom: 53, display: 'flex', fontSize: 16, fontWeight: 800, letterSpacing: 7, color: 'rgba(240,248,252,.48)' }}>BASKETBALL · 804</div>
    </div>,
    size,
  );
}
