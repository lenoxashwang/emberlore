import { NextRequest, NextResponse } from 'next/server';
import { AUTH_COOKIE_NAMES, clearAuthCookies, logoutDirectusSession } from '@/lib/auth';

export async function POST(request: NextRequest) {
  const refreshToken = request.cookies.get(AUTH_COOKIE_NAMES.refreshToken)?.value;

  if (refreshToken) {
    try {
      await logoutDirectusSession(refreshToken);
    } catch {
      // Ignore Directus logout failures and still clear the local session.
    }
  }

  const response = NextResponse.json({
    authenticated: false,
  });

  clearAuthCookies(response);
  return response;
}
