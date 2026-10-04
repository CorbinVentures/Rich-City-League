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
        background: '#FFFFFF',
        color: '#000000',
        fontFamily: 'Arial, Helvetica, sans-serif',
        fontSize: 360,
        fontWeight: 900,
        lineHeight: 1,
        letterSpacing: -24,
      }}
    >
      R
    </div>,
    size,
  );
}
