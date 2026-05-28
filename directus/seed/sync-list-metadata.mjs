const directusUrl = process.env.DIRECTUS_URL || 'http://127.0.0.1:8055';
const staticToken = process.env.DIRECTUS_STATIC_TOKEN;
const locale = process.env.UNDECEMBER_LOCALE || 'en';

if (!staticToken) {
  throw new Error('DIRECTUS_STATIC_TOKEN is required');
}

process.env.UNDECEMBER_SOURCE ||= 'local';

const { fetchSection } = await import('../../backend/scraper.mjs');
const { REMOTE_SECTION_NAMES } = await import('../../backend/sections.mjs');

function headers() {
  return {
    Authorization: `Bearer ${staticToken}`,
    'Content-Type': 'application/json',
  };
}

async function request(pathname, options = {}) {
  const response = await fetch(new URL(pathname, directusUrl), {
    ...options,
    headers: {
      ...headers(),
      ...(options.headers || {}),
    },
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`${options.method || 'GET'} ${pathname} failed: ${response.status} ${text}`);
  }

  if (response.status === 204) {
    return null;
  }

  return response.json();
}

function keyForEntry(section, slug) {
  return `${locale}:${section}:${slug}`;
}

function slugFromItem(item) {
  return item.slug || item.href.split('/').filter(Boolean).pop();
}

async function getEntryIds() {
  const idsBySourceKey = new Map();
  let page = 1;

  while (true) {
    const url = new URL('/items/content_entries', directusUrl);
    url.searchParams.set('filter[locale][_eq]', locale);
    url.searchParams.set('fields', 'id,source_key');
    url.searchParams.set('limit', '500');
    url.searchParams.set('page', String(page));

    const payload = await request(url);
    const items = payload.data || [];

    for (const item of items) {
      idsBySourceKey.set(item.source_key, item.id);
    }

    if (items.length < 500) {
      break;
    }

    page += 1;
  }

  return idsBySourceKey;
}

const idsBySourceKey = await getEntryIds();
let updated = 0;
let skipped = 0;

for (const section of REMOTE_SECTION_NAMES) {
  let listPage;

  try {
    listPage = await fetchSection(section);
  } catch (error) {
    process.stdout.write(`skip ${section}: ${error.message}\n`);
    continue;
  }

  for (const item of listPage.items || []) {
    const slug = slugFromItem(item);

    if (!slug) {
      skipped += 1;
      continue;
    }

    const sourceKey = keyForEntry(section, slug);
    const id = idsBySourceKey.get(sourceKey);

    if (!id) {
      skipped += 1;
      continue;
    }

    await request(`/items/content_entries/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({
        list_stat: item.stat || '',
        list_props: (item.props || []).filter(Boolean).join(' '),
      }),
    });
    updated += 1;
  }
}

process.stdout.write(`synced list metadata: ${updated} updated, ${skipped} skipped\n`);
