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
        background: '#FFFFFF',
        color: '#000000',
        fontFamily: 'Arial, Helvetica, sans-serif',
        fontSize: 126,
        fontWeight: 900,
        lineHeight: 1,
        letterSpacing: -8,
      }}
    >
      R
    </div>,
    size,
  );
}
