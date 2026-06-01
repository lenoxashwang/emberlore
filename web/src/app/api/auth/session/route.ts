import { NextRequest, NextResponse } from 'next/server';
import {
  AUTH_COOKIE_NAMES,
  clearAuthCookies,
  fetchDirectusUser,
  getUserIdFromAccessToken,
  isAccessTokenExpired,
  refreshDirectusSession,
  setAuthCookies,
} from '@/lib/auth';

export async function GET(request: NextRequest) {
  const accessToken = request.cookies.get(AUTH_COOKIE_NAMES.accessToken)?.value;
  const refreshToken = request.cookies.get(AUTH_COOKIE_NAMES.refreshToken)?.value;
  let userId = request.cookies.get(AUTH_COOKIE_NAMES.userId)?.value || null;

  const unauthenticatedResponse = NextResponse.json({
    authenticated: false,
  });

  if (!accessToken && !refreshToken) {
    clearAuthCookies(unauthenticatedResponse);
    return unauthenticatedResponse;
  }

  try {
    let session:
      | {
          accessToken: string;
          refreshToken: string;
          userId: string;
        }
      | null = null;

    if (!accessToken || isAccessTokenExpired(accessToken)) {
      if (!refreshToken) {
        clearAuthCookies(unauthenticatedResponse);
        return unauthenticatedResponse;
      }

      session = await refreshDirectusSession(refreshToken);
      userId = session.userId;
    } else if (!userId) {
      userId = getUserIdFromAccessToken(accessToken);
    }

    if (!userId) {
      clearAuthCookies(unauthenticatedResponse);
      return unauthenticatedResponse;
    }

    const user = await fetchDirectusUser(userId);
    const response = NextResponse.json({
      authenticated: true,
      user,
    });

    if (session) {
      setAuthCookies(response, session);
    }

    return response;
  } catch {
    clearAuthCookies(unauthenticatedResponse);
    return unauthenticatedResponse;
  }
}
