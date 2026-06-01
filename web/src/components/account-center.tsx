'use client';

import { useEffect, useState, useTransition } from 'react';
import type { LocaleMessages } from '@/lib/i18n';

type AccountMessages = Pick<
  LocaleMessages,
  | 'accountCenter'
  | 'accountIntro'
  | 'accountStatus'
  | 'accountReady'
  | 'login'
  | 'register'
  | 'logout'
  | 'email'
  | 'password'
  | 'confirmPassword'
  | 'displayName'
  | 'loginAction'
  | 'registerAction'
  | 'loggingIn'
  | 'registering'
  | 'sessionLoading'
  | 'loggedInAs'
  | 'upcomingFeatures'
  | 'featurePreparationNote'
  | 'submitBug'
  | 'leaveFeedback'
  | 'createBuild'
  | 'updateGuide'
  | 'comingSoon'
  | 'authErrorGeneric'
  | 'authErrorInvalidCredentials'
  | 'authErrorEmailInUse'
  | 'authErrorPasswordMismatch'
  | 'authErrorPasswordTooShort'
  | 'authErrorDisplayNameRequired'
  | 'authErrorEmailRequired'
  | 'authErrorPasswordRequired'
>;

type SessionPayload = {
  authenticated: boolean;
  user?: {
    id: string;
    email: string;
    displayName: string;
    status: string | null;
  };
};

const FEATURE_ITEMS = ['submitBug', 'leaveFeedback', 'createBuild', 'updateGuide'] as const;

function getAuthErrorMessage(messages: AccountMessages, code?: string, fallback?: string) {
  switch (code) {
    case 'INVALID_CREDENTIALS':
    case 'INVALID_PAYLOAD':
      return messages.authErrorInvalidCredentials;
    case 'EMAIL_IN_USE':
    case 'RECORD_NOT_UNIQUE':
      return messages.authErrorEmailInUse;
    case 'PASSWORD_MISMATCH':
      return messages.authErrorPasswordMismatch;
    case 'PASSWORD_TOO_SHORT':
      return messages.authErrorPasswordTooShort;
    case 'DISPLAY_NAME_REQUIRED':
      return messages.authErrorDisplayNameRequired;
    case 'EMAIL_REQUIRED':
      return messages.authErrorEmailRequired;
    case 'PASSWORD_REQUIRED':
      return messages.authErrorPasswordRequired;
    default:
      return fallback || messages.authErrorGeneric;
  }
}

export default function AccountCenter({ messages }: { messages: AccountMessages }) {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [session, setSession] = useState<SessionPayload | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'error' | 'success'; message: string } | null>(
    null,
  );
  const [loginForm, setLoginForm] = useState({
    email: '',
    password: '',
  });
  const [registerForm, setRegisterForm] = useState({
    displayName: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [isPending, startTransition] = useTransition();

  async function loadSession() {
    try {
      const response = await fetch('/api/auth/session', {
        method: 'GET',
        cache: 'no-store',
      });
      const payload = (await response.json().catch(() => ({ authenticated: false }))) as SessionPayload;
      setSession(payload);
    } catch {
      setSession({ authenticated: false });
    }
  }

  useEffect(() => {
    void loadSession();
  }, []);

  async function submitAuthRequest(
    url: string,
    body: Record<string, string>,
    successMessage: string,
  ) {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    const payload = (await response.json().catch(() => ({}))) as {
      code?: string;
      error?: string;
    };

    if (!response.ok) {
      setFeedback({
        type: 'error',
        message: getAuthErrorMessage(messages, payload.code, payload.error),
      });
      return;
    }

    await loadSession();
    setFeedback({
      type: 'success',
      message: successMessage,
    });
  }

  function handleLoginSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFeedback(null);

    startTransition(async () => {
      await submitAuthRequest('/api/auth/login', loginForm, messages.accountReady);
    });
  }

  function handleRegisterSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFeedback(null);

    startTransition(async () => {
      await submitAuthRequest('/api/auth/register', registerForm, messages.accountReady);
    });
  }

  function handleLogout() {
    setFeedback(null);

    startTransition(async () => {
      await fetch('/api/auth/logout', {
        method: 'POST',
      });
      setSession({ authenticated: false });
    });
  }

  return (
    <section className="account-page">
      <div className="account-hero detail-panel">
        <h2 className="account-title">{messages.accountCenter}</h2>
        <p className="account-copy">{messages.accountIntro}</p>
      </div>

      <div className="account-grid">
        <div className="account-panel detail-panel">
          <h3 className="account-panel-title">{messages.accountStatus}</h3>
          {!session ? (
            <p className="account-copy">{messages.sessionLoading}</p>
          ) : session.authenticated && session.user ? (
            <div className="account-user-card">
              <div className="account-user-meta">
                <span className="account-user-kicker">{messages.loggedInAs}</span>
                <strong className="account-user-value">{session.user.displayName}</strong>
                <span className="account-copy">{session.user.email}</span>
              </div>
              <p className="account-copy">{messages.accountReady}</p>
              <button className="account-logout" disabled={isPending} onClick={handleLogout} type="button">
                {messages.logout}
              </button>
            </div>
          ) : (
            <>
              <div className="account-mode-tabs">
                <button
                  className={`account-mode-tab ${mode === 'login' ? 'is-active' : ''}`}
                  onClick={() => {
                    setFeedback(null);
                    setMode('login');
                  }}
                  type="button"
                >
                  {messages.login}
                </button>
                <button
                  className={`account-mode-tab ${mode === 'register' ? 'is-active' : ''}`}
                  onClick={() => {
                    setFeedback(null);
                    setMode('register');
                  }}
                  type="button"
                >
                  {messages.register}
                </button>
              </div>

              {mode === 'login' ? (
                <form className="account-form" onSubmit={handleLoginSubmit}>
                  <label className="account-field">
                    <span className="account-label">{messages.email}</span>
                    <input
                      autoComplete="email"
                      className="account-input"
                      onChange={(event) =>
                        setLoginForm((current) => ({ ...current, email: event.target.value }))
                      }
                      type="email"
                      value={loginForm.email}
                    />
                  </label>
                  <label className="account-field">
                    <span className="account-label">{messages.password}</span>
                    <input
                      autoComplete="current-password"
                      className="account-input"
                      onChange={(event) =>
                        setLoginForm((current) => ({ ...current, password: event.target.value }))
                      }
                      type="password"
                      value={loginForm.password}
                    />
                  </label>
                  <button className="account-submit" disabled={isPending} type="submit">
                    {isPending ? messages.loggingIn : messages.loginAction}
                  </button>
                </form>
              ) : (
                <form className="account-form" onSubmit={handleRegisterSubmit}>
                  <label className="account-field">
                    <span className="account-label">{messages.displayName}</span>
                    <input
                      autoComplete="nickname"
                      className="account-input"
                      onChange={(event) =>
                        setRegisterForm((current) => ({
                          ...current,
                          displayName: event.target.value,
                        }))
                      }
                      value={registerForm.displayName}
                    />
                  </label>
                  <label className="account-field">
                    <span className="account-label">{messages.email}</span>
                    <input
                      autoComplete="email"
                      className="account-input"
                      onChange={(event) =>
                        setRegisterForm((current) => ({ ...current, email: event.target.value }))
                      }
                      type="email"
                      value={registerForm.email}
                    />
                  </label>
                  <label className="account-field">
                    <span className="account-label">{messages.password}</span>
                    <input
                      autoComplete="new-password"
                      className="account-input"
                      onChange={(event) =>
                        setRegisterForm((current) => ({ ...current, password: event.target.value }))
                      }
                      type="password"
                      value={registerForm.password}
                    />
                  </label>
                  <label className="account-field">
                    <span className="account-label">{messages.confirmPassword}</span>
                    <input
                      autoComplete="new-password"
                      className="account-input"
                      onChange={(event) =>
                        setRegisterForm((current) => ({
                          ...current,
                          confirmPassword: event.target.value,
                        }))
                      }
                      type="password"
                      value={registerForm.confirmPassword}
                    />
                  </label>
                  <button className="account-submit" disabled={isPending} type="submit">
                    {isPending ? messages.registering : messages.registerAction}
                  </button>
                </form>
              )}
            </>
          )}

          <p className={`account-feedback ${feedback ? `is-${feedback.type}` : ''}`}>
            {feedback?.message || ''}
          </p>
        </div>

        <div className="account-panel detail-panel">
          <h3 className="account-panel-title">{messages.upcomingFeatures}</h3>
          <p className="account-copy">{messages.featurePreparationNote}</p>
          <div className="account-actions">
            {FEATURE_ITEMS.map((item) => (
              <div className="account-action-card" key={item}>
                <span className="account-action-badge">{messages.comingSoon}</span>
                <strong className="account-action-title">{messages[item]}</strong>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
