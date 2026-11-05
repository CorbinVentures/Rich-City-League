import { ImageResponse } from 'next/og';

export const size = { width: 180, height: 180 };
export const contentType = 'image/png';

export default function AppleIcon() {
  return new ImageResponse(
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(145deg, #163657 0%, #0b1a2a 52%, #07111f 100%)',
        color: '#e4edf5',
        fontFamily: 'Arial, Helvetica, sans-serif',
        fontSize: 126,
        fontWeight: 900,
        lineHeight: 1,
        letterSpacing: -8,
        borderRadius: 42,
        border: '4px solid #47769e',
        boxShadow: 'inset 0 3px 8px rgba(255,255,255,.2), inset 0 -8px 14px rgba(0,0,0,.28)',
      }}
    >
      R
    </div>,
    size,
  );
}
