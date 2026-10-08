export const dynamic = 'force-dynamic';

export async function GET() {
  const version =
    process.env.VERCEL_GIT_COMMIT_SHA
    || process.env.VERCEL_URL
    || process.env.NEXT_PUBLIC_APP_VERSION
    || 'development';

  return Response.json(
    { version },
    {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
        Pragma: 'no-cache',
        Expires: '0',
      },
    },
  );
}
