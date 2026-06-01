import { NextResponse } from 'next/server';
import {
  AuthApiError,
  fetchDirectusUser,
  loginDirectusUser,
  setAuthCookies,
} from '@/lib/auth';

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => null)) as
      | { email?: string; password?: string }
      | null;
    const email = body?.email?.trim();
    const password = body?.password;

    if (!email) {
      throw new AuthApiError('EMAIL_REQUIRED', 'Email is required.', 400);
    }

    if (!password) {
      throw new AuthApiError('PASSWORD_REQUIRED', 'Password is required.', 400);
    }

    const session = await loginDirectusUser(email, password);
    const user = await fetchDirectusUser(session.userId);
    const response = NextResponse.json({
      authenticated: true,
      user,
    });

    setAuthCookies(response, session);
    return response;
  } catch (error) {
    const authError =
      error instanceof AuthApiError
        ? error
        : new AuthApiError('AUTH_ERROR', 'Unable to sign in right now.', 500);

    return NextResponse.json(
      {
        authenticated: false,
        code: authError.code === 'INVALID_PAYLOAD' ? 'INVALID_CREDENTIALS' : authError.code,
        error: authError.message,
      },
      { status: authError.status },
    );
  }
}
