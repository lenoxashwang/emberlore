import { NextResponse } from 'next/server';
import {
  AuthApiError,
  fetchDirectusUser,
  loginDirectusUser,
  registerDirectusUser,
  setAuthCookies,
} from '@/lib/auth';

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => null)) as
      | {
          displayName?: string;
          email?: string;
          password?: string;
          confirmPassword?: string;
        }
      | null;
    const displayName = body?.displayName?.trim();
    const email = body?.email?.trim();
    const password = body?.password;
    const confirmPassword = body?.confirmPassword;

    if (!displayName) {
      throw new AuthApiError('DISPLAY_NAME_REQUIRED', 'Display name is required.', 400);
    }

    if (!email) {
      throw new AuthApiError('EMAIL_REQUIRED', 'Email is required.', 400);
    }

    if (!password) {
      throw new AuthApiError('PASSWORD_REQUIRED', 'Password is required.', 400);
    }

    if (password.length < 8) {
      throw new AuthApiError('PASSWORD_TOO_SHORT', 'Password must be at least 8 characters.', 400);
    }

    if (password !== confirmPassword) {
      throw new AuthApiError('PASSWORD_MISMATCH', 'Passwords do not match.', 400);
    }

    await registerDirectusUser({
      displayName,
      email,
      password,
    });

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
        : new AuthApiError('AUTH_ERROR', 'Unable to create the account right now.', 500);

    return NextResponse.json(
      {
        authenticated: false,
        code: authError.code,
        error: authError.message,
      },
      { status: authError.status },
    );
  }
}
