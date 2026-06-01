const directusUrl = process.env.NEXT_PUBLIC_DIRECTUS_URL || 'http://127.0.0.1:8055';
const directusInternalUrl = process.env.DIRECTUS_INTERNAL_URL || directusUrl;
const staticToken = process.env.DIRECTUS_STATIC_TOKEN;
const adminEmail = process.env.DIRECTUS_ADMIN_EMAIL;
const adminPassword = process.env.DIRECTUS_ADMIN_PASSWORD;
const directusAssetProxyPrefix = '/directus-assets';
const directusFileIdPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
let cachedAccessToken: { token: string; expiresAt: number } | null = null;

function buildUrl(pathname: string, query?: Record<string, string>) {
  const url = new URL(pathname, directusInternalUrl);

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

export function getDirectusInternalUrl() {
  return directusInternalUrl;
}

export async function getDirectusAuthHeaders() {
  if (staticToken) {
    return { Authorization: `Bearer ${staticToken}` };
  }

  const adminAccessToken = await getAdminAccessToken();
  return adminAccessToken ? { Authorization: `Bearer ${adminAccessToken}` } : undefined;
}

export async function directusFetch<T>(pathname: string, query?: Record<string, string>) {
  const response = await fetch(buildUrl(pathname, query), {
    headers: await getDirectusAuthHeaders(),
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

  if (
    url.startsWith('/image/') ||
    url.startsWith('/fonts/') ||
    url.startsWith(directusAssetProxyPrefix)
  ) {
    return url;
  }

  if (directusFileIdPattern.test(url)) {
    return `${directusAssetProxyPrefix}/${url}`;
  }

  try {
    const directusOrigin = new URL(directusUrl).origin;
    const resolved = new URL(url, directusUrl);

    if (resolved.pathname.startsWith('/assets/')) {
      return `${directusAssetProxyPrefix}${resolved.pathname.replace(/^\/assets/, '')}${resolved.search}`;
    }

    if (resolved.origin === directusOrigin) {
      return resolved.toString();
    }

    return url;
  } catch {
    return url;
  }
}
