import { ImageResponse } from 'next/og';

export const size = { width: 180, height: 180 };
export const contentType = 'image/png';

export default function AppleIcon() {
  return new ImageResponse(
    <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', overflow: 'hidden', background: 'radial-gradient(circle at 30% 18%, #173247 0%, #07111b 34%, #02060b 74%)', color: '#f8fbfd' }}>
      <div style={{ position: 'absolute', inset: 7, borderRadius: 40, border: '2px solid rgba(191,229,249,.38)' }} />
      <div style={{ position: 'absolute', width: 138, height: 138, borderRadius: 999, border: '6px solid rgba(145,206,242,.12)' }} />
      <div style={{ position: 'absolute', width: 126, height: 2, background: 'rgba(145,206,242,.22)', transform: 'rotate(-18deg)' }} />
      <div style={{ position: 'absolute', width: 126, height: 2, background: 'rgba(145,206,242,.18)', transform: 'rotate(58deg)' }} />
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative', transform: 'translateY(-1px)' }}>
        <div style={{ fontSize: 43, lineHeight: 1, fontWeight: 900, letterSpacing: -3 }}>RCL</div>
        <div style={{ width: 73, height: 2, borderRadius: 99, marginTop: 5, background: 'linear-gradient(90deg, rgba(145,206,242,0), #bfe8ff 32%, #78bfe8 68%, rgba(145,206,242,0))' }} />
        <div style={{ marginTop: 7, fontSize: 7, fontWeight: 800, letterSpacing: 3, color: '#91cef2' }}>RVA</div>
      </div>
    </div>,
    size,
  );
}
