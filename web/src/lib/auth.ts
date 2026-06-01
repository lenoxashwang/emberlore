import type { NextResponse } from 'next/server';
import { getDirectusAuthHeaders, getDirectusInternalUrl } from '@/lib/directus';

type DirectusErrorPayload = {
  errors?: Array<{
    message?: string;
    extensions?: {
      code?: string;
      reason?: string;
    };
  }>;
};

type DirectusAuthPayload = {
  data?: {
    access_token?: string;
    refresh_token?: string;
  };
};

type DirectusUserPayload = {
  data?: {
    id: string;
    email: string;
    first_name?: string | null;
    last_name?: string | null;
    status?: string | null;
  };
};

type AccessTokenPayload = {
  id?: string;
  exp?: number;
};

export type AuthenticatedUser = {
  id: string;
  email: string;
  displayName: string;
  status: string | null;
};

export type DirectusSessionTokens = {
  accessToken: string;
  refreshToken: string;
  userId: string;
};

export const AUTH_COOKIE_NAMES = {
  accessToken: 'emberlore_access_token',
  refreshToken: 'emberlore_refresh_token',
  userId: 'emberlore_user_id',
} as const;

const PUBLIC_MEMBER_ROLE_ID = process.env.DIRECTUS_PUBLIC_MEMBER_ROLE_ID;
const SESSION_MAX_AGE = 60 * 60 * 24 * 30;

export class AuthApiError extends Error {
  code: string;
  status: number;

  constructor(code: string, message: string, status = 400) {
    super(message);
    this.name = 'AuthApiError';
    this.code = code;
    this.status = status;
  }
}

function buildDirectusUrl(pathname: string) {
  return new URL(pathname, getDirectusInternalUrl()).toString();
}

async function parseDirectusError(response: Response) {
  const fallback = new AuthApiError('AUTH_ERROR', 'Request failed.', response.status);

  try {
    const payload = (await response.json()) as DirectusErrorPayload;
    const firstError = payload.errors?.[0];
    const code = firstError?.extensions?.code || 'AUTH_ERROR';
    const message = firstError?.message || firstError?.extensions?.reason || 'Request failed.';
    return new AuthApiError(code, message, response.status);
  } catch {
    return fallback;
  }
}

async function directusRequest(pathname: string, init: RequestInit = {}, useAdminAuth = false) {
  const headers = new Headers(init.headers);

  if (init.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  if (useAdminAuth) {
    const authHeaders = await getDirectusAuthHeaders();

    if (authHeaders?.Authorization) {
      headers.set('Authorization', authHeaders.Authorization);
    }
  }

  return fetch(buildDirectusUrl(pathname), {
    ...init,
    headers,
    cache: 'no-store',
  });
}

function decodeAccessToken(token: string): AccessTokenPayload | null {
  try {
    const [, payload] = token.split('.');

    if (!payload) {
      return null;
    }

    const normalized = payload.replace(/-/g, '+').replace(/_/g, '/');
    const padded = normalized.padEnd(normalized.length + ((4 - (normalized.length % 4)) % 4), '=');
    return JSON.parse(Buffer.from(padded, 'base64').toString('utf8')) as AccessTokenPayload;
  } catch {
    return null;
  }
}

function normalizeUser(payload: DirectusUserPayload['data']): AuthenticatedUser {
  if (!payload) {
    throw new AuthApiError('USER_NOT_FOUND', 'User record not found.', 404);
  }

  const displayName = [payload.first_name, payload.last_name]
    .map((item) => item?.trim())
    .filter(Boolean)
    .join(' ')
    .trim();

  return {
    id: payload.id,
    email: payload.email,
    displayName: displayName || payload.email,
    status: payload.status || null,
  };
}

function getCookieOptions(maxAge = SESSION_MAX_AGE) {
  return {
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge,
  };
}

export function getUserIdFromAccessToken(token: string) {
  return decodeAccessToken(token)?.id || null;
}

export function isAccessTokenExpired(token: string) {
  const exp = decodeAccessToken(token)?.exp;

  if (!exp) {
    return true;
  }

  return Date.now() >= exp * 1000 - 5_000;
}

export async function loginDirectusUser(email: string, password: string) {
  const response = await directusRequest('/auth/login', {
    method: 'POST',
    body: JSON.stringify({
      email,
      password,
      mode: 'json',
    }),
  });

  if (!response.ok) {
    throw await parseDirectusError(response);
  }

  const payload = (await response.json()) as DirectusAuthPayload;
  const accessToken = payload.data?.access_token;
  const refreshToken = payload.data?.refresh_token;

  if (!accessToken || !refreshToken) {
    throw new AuthApiError('INVALID_AUTH_RESPONSE', 'Directus did not return valid auth tokens.', 502);
  }

  const userId = getUserIdFromAccessToken(accessToken);

  if (!userId) {
    throw new AuthApiError('INVALID_AUTH_RESPONSE', 'Unable to identify the authenticated user.', 502);
  }

  return {
    accessToken,
    refreshToken,
    userId,
  } satisfies DirectusSessionTokens;
}

export async function refreshDirectusSession(refreshToken: string) {
  const response = await directusRequest('/auth/refresh', {
    method: 'POST',
    body: JSON.stringify({
      refresh_token: refreshToken,
      mode: 'json',
    }),
  });

  if (!response.ok) {
    throw await parseDirectusError(response);
  }

  const payload = (await response.json()) as DirectusAuthPayload;
  const accessToken = payload.data?.access_token;
  const nextRefreshToken = payload.data?.refresh_token;

  if (!accessToken || !nextRefreshToken) {
    throw new AuthApiError('INVALID_AUTH_RESPONSE', 'Directus did not return refresh tokens.', 502);
  }

  const userId = getUserIdFromAccessToken(accessToken);

  if (!userId) {
    throw new AuthApiError('INVALID_AUTH_RESPONSE', 'Unable to identify the refreshed user.', 502);
  }

  return {
    accessToken,
    refreshToken: nextRefreshToken,
    userId,
  } satisfies DirectusSessionTokens;
}

export async function logoutDirectusSession(refreshToken: string) {
  const response = await directusRequest('/auth/logout', {
    method: 'POST',
    body: JSON.stringify({
      refresh_token: refreshToken,
    }),
  });

  if (!response.ok) {
    throw await parseDirectusError(response);
  }
}

export async function fetchDirectusUser(userId: string) {
  const response = await directusRequest(
    `/users/${userId}?fields=id,email,first_name,last_name,status`,
    {
      method: 'GET',
    },
    true,
  );

  if (!response.ok) {
    throw await parseDirectusError(response);
  }

  const payload = (await response.json()) as DirectusUserPayload;
  return normalizeUser(payload.data);
}

export async function registerDirectusUser({
  displayName,
  email,
  password,
}: {
  displayName: string;
  email: string;
  password: string;
}) {
  const response = await directusRequest(
    '/users',
    {
      method: 'POST',
      body: JSON.stringify({
        first_name: displayName.trim(),
        email: email.trim().toLowerCase(),
        password,
        status: 'active',
        role: PUBLIC_MEMBER_ROLE_ID || null,
      }),
    },
    true,
  );

  if (!response.ok) {
    const error = await parseDirectusError(response);

    if (error.code === 'RECORD_NOT_UNIQUE') {
      throw new AuthApiError('EMAIL_IN_USE', error.message, 409);
    }

    throw error;
  }

  const payload = (await response.json()) as DirectusUserPayload;
  return normalizeUser(payload.data);
}

export function setAuthCookies(response: NextResponse, session: DirectusSessionTokens) {
  response.cookies.set(AUTH_COOKIE_NAMES.accessToken, session.accessToken, getCookieOptions());
  response.cookies.set(AUTH_COOKIE_NAMES.refreshToken, session.refreshToken, getCookieOptions());
  response.cookies.set(AUTH_COOKIE_NAMES.userId, session.userId, getCookieOptions());
}

export function clearAuthCookies(response: NextResponse) {
  response.cookies.set(AUTH_COOKIE_NAMES.accessToken, '', getCookieOptions(0));
  response.cookies.set(AUTH_COOKIE_NAMES.refreshToken, '', getCookieOptions(0));
  response.cookies.set(AUTH_COOKIE_NAMES.userId, '', getCookieOptions(0));
}
