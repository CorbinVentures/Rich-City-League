import { NextRequest, NextResponse } from 'next/server';

const PREVIEW_COOKIE = 'rcl_preview_access';
const PREVIEW_COOKIE_VALUE = 'rcl-beta-2026';
const WALL_END = Date.UTC(2026, 9, 1);

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const password = String(formData.get('password') ?? '');

  if (password !== 'notasecret') {
    return NextResponse.redirect(new URL('/access?error=1', request.url), 303);
  }

  const response = NextResponse.redirect(new URL('/', request.url), 303);
  response.cookies.set(PREVIEW_COOKIE, PREVIEW_COOKIE_VALUE, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    expires: new Date(WALL_END),
  });
  return response;
}
