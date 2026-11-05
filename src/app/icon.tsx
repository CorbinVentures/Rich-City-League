import { ImageResponse } from 'next/og';

export const size = { width: 512, height: 512 };
export const contentType = 'image/png';

export default function Icon() {
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
        fontSize: 360,
        fontWeight: 900,
        lineHeight: 1,
        letterSpacing: -24,
        borderRadius: 112,
        border: '8px solid #47769e',
        boxShadow: 'inset 0 5px 18px rgba(255,255,255,.2), inset 0 -18px 30px rgba(0,0,0,.28)',
      }}
    >
      R
    </div>,
    size,
  );
}
