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
        background: 'linear-gradient(145deg, #163657 0%, #0b1a2a 52%, #07111f 100%)',
        color: '#e4edf5',
        fontFamily: 'Arial, Helvetica, sans-serif',
        fontWeight: 900,
        fontSize: 135,
        lineHeight: 1,
        letterSpacing: -9,
        borderRadius: 42,
        border: '4px solid #47769e',
        boxShadow: 'inset 0 3px 8px rgba(255,255,255,.2), inset 0 -8px 14px rgba(0,0,0,.28)',
      },
    }, 'R'),
    { width: 192, height: 192 },
  );
}
