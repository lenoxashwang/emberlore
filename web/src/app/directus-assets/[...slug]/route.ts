import type { NextRequest } from 'next/server';
import { getDirectusAuthHeaders, getDirectusInternalUrl } from '@/lib/directus';

const FORWARDED_HEADERS = [
  'content-type',
  'content-length',
  'cache-control',
  'etag',
  'last-modified',
  'content-disposition',
];

function buildAssetUrl(slug: string[], request: NextRequest) {
  const target = new URL(`/assets/${slug.join('/')}`, getDirectusInternalUrl());

  request.nextUrl.searchParams.forEach((value, key) => {
    target.searchParams.append(key, value);
  });

  return target;
}

function copyResponseHeaders(source: Headers) {
  const headers = new Headers();

  for (const headerName of FORWARDED_HEADERS) {
    const value = source.get(headerName);
    if (value) {
      headers.set(headerName, value);
    }
  }

  return headers;
}

async function proxyAsset(request: NextRequest, slug: string[], method: 'GET' | 'HEAD') {
  const upstream = await fetch(buildAssetUrl(slug, request), {
    method,
    headers: await getDirectusAuthHeaders(),
    cache: 'no-store',
  });

  if (!upstream.ok) {
    return new Response(await upstream.text(), {
      status: upstream.status,
      headers: {
        'Content-Type': upstream.headers.get('content-type') || 'text/plain; charset=utf-8',
      },
    });
  }

  return new Response(method === 'HEAD' ? null : upstream.body, {
    status: upstream.status,
    headers: copyResponseHeaders(upstream.headers),
  });
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ slug: string[] }> },
) {
  const { slug } = await context.params;
  return proxyAsset(request, slug, 'GET');
}

export async function HEAD(
  request: NextRequest,
  context: { params: Promise<{ slug: string[] }> },
) {
  const { slug } = await context.params;
  return proxyAsset(request, slug, 'HEAD');
}
