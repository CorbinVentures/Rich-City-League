import { ImageResponse } from 'next/og';
import { createElement } from 'react';

// Android installability requires an actual 192px icon as well as the 512px icon.
export function GET() {
  return new ImageResponse(
    createElement('div', {
      style: {
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#FFFFFF',
        color: '#000000',
        fontFamily: 'Arial, Helvetica, sans-serif',
        fontWeight: 900,
        fontSize: 135,
        lineHeight: 1,
        letterSpacing: -9,
      },
    }, 'R'),
    { width: 192, height: 192 },
  );
}
