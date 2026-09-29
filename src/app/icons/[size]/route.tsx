import { ImageResponse } from 'next/og';

const ICONS: Record<string, { size: number; maskable: boolean }> = {
  '180': { size: 180, maskable: false },
  '192': { size: 192, maskable: false },
  '512': { size: 512, maskable: false },
  '512-maskable': { size: 512, maskable: true },
};

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ size: string }> }
) {
  const { size: requestedSize } = await params;
  const config = ICONS[requestedSize];
  if (!config) return new Response('Not found', { status: 404 });

  const { size, maskable } = config;
  const frameInset = maskable ? 74 : 48;
  const ballRadius = maskable ? 132 : 152;
  const center = 256;

  const response = new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
          overflow: 'hidden',
          background: 'radial-gradient(circle at 18% 8%, #0a2840 0%, #071522 34%, #03070d 76%)',
          color: '#f6f8fb',
        }}
      >
        <svg width="100%" height="100%" viewBox="0 0 512 512" aria-hidden="true">
          <rect
            x={frameInset}
            y={frameInset}
            width={512 - frameInset * 2}
            height={512 - frameInset * 2}
            rx="92"
            fill="none"
            stroke="#159FFF"
            strokeWidth="20"
          />
          <rect x="170" y={maskable ? 78 : 61} width="172" height="15" rx="8" fill="#FF4F16" />
          <circle cx={center} cy={center} r={ballRadius} fill="#FF4F16" stroke="white" strokeOpacity=".35" strokeWidth="4" />
          <path d={`M ${center-ballRadius} ${center} H ${center+ballRadius}`} stroke="#03070D" strokeWidth="22" />
          <path d={`M ${center} ${center-ballRadius} V ${center+ballRadius}`} stroke="#03070D" strokeWidth="22" />
          <path d={`M ${center-ballRadius+16} ${center-ballRadius+42} C ${center-26} ${center-66}, ${center-26} ${center+66}, ${center-ballRadius+16} ${center+ballRadius-42}`} fill="none" stroke="#03070D" strokeWidth="18" />
          <path d={`M ${center+ballRadius-16} ${center-ballRadius+42} C ${center+26} ${center-66}, ${center+26} ${center+66}, ${center+ballRadius-16} ${center+ballRadius-42}`} fill="none" stroke="#03070D" strokeWidth="18" />
          <rect x="92" y="208" width="328" height="96" rx="28" fill="#071522" stroke="#159FFF" strokeOpacity=".45" strokeWidth="3" />
          <text x="256" y="282" textAnchor="middle" fill="#F6F8FB" fontFamily="Arial, Helvetica, sans-serif" fontSize="86" fontWeight="900">RCL</text>
          <text x="256" y={maskable ? 391 : 426} textAnchor="middle" fill="#159FFF" fontFamily="Arial, Helvetica, sans-serif" fontSize="25" fontWeight="900" letterSpacing="3">804 · RVA</text>
        </svg>
      </div>
    ),
    { width: size, height: size }
  );

  response.headers.set('Cache-Control', 'public, max-age=31536000, immutable');
  return response;
}
