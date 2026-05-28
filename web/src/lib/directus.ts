const directusUrl = process.env.NEXT_PUBLIC_DIRECTUS_URL || 'http://127.0.0.1:8055';
const staticToken = process.env.DIRECTUS_STATIC_TOKEN;
const adminEmail = process.env.DIRECTUS_ADMIN_EMAIL;
const adminPassword = process.env.DIRECTUS_ADMIN_PASSWORD;
let cachedAccessToken: { token: string; expiresAt: number } | null = null;

function buildUrl(pathname: string, query?: Record<string, string>) {
  const url = new URL(pathname, directusUrl);

  if (query) {
    for (const [key, value] of Object.entries(query)) {
      url.searchParams.set(key, value);
    }
  }

  return url.toString();
}

async function getAdminAccessToken() {
  if (cachedAccessToken && cachedAccessToken.expiresAt > Date.now() + 60_000) {
    return cachedAccessToken.token;
  }

  if (!adminEmail || !adminPassword) {
    return undefined;
  }

  const response = await fetch(buildUrl('/auth/login'), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      email: adminEmail,
      password: adminPassword,
    }),
    cache: 'no-store',
  });

  if (!response.ok) {
    throw new Error(`Directus login failed: ${response.status}`);
  }

  const payload = await response.json();
  const token = payload?.data?.access_token;

  if (!token) {
    throw new Error('Directus login did not return an access token');
  }

  const expires = Number(payload?.data?.expires || 900_000);
  cachedAccessToken = {
    token,
    expiresAt: Date.now() + (Number.isFinite(expires) && expires > 0 ? expires : 900_000),
  };

  return token;
}

async function getAuthHeaders() {
  if (staticToken) {
    return { Authorization: `Bearer ${staticToken}` };
  }

  const adminAccessToken = await getAdminAccessToken();
  return adminAccessToken ? { Authorization: `Bearer ${adminAccessToken}` } : undefined;
}

export async function directusFetch<T>(pathname: string, query?: Record<string, string>) {
  const response = await fetch(buildUrl(pathname, query), {
    headers: await getAuthHeaders(),
    cache: 'no-store',
  });

  if (!response.ok) {
    throw new Error(`Directus request failed: ${response.status}`);
  }

  return response.json() as Promise<T>;
}

export function directusAsset(url: string) {
  if (!url) {
    return '';
  }

  if (url.startsWith('/image/') || url.startsWith('/fonts/')) {
    return url;
  }

  try {
    return new URL(url, directusUrl).toString();
  } catch {
    return url;
  }
}
