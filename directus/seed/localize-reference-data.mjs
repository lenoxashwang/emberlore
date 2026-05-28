const directusUrl = process.env.DIRECTUS_URL || 'http://127.0.0.1:8055';
const staticToken = process.env.DIRECTUS_STATIC_TOKEN;
const remoteOrigin = 'https://undecember.thein.ru';

if (!staticToken) {
  throw new Error('DIRECTUS_STATIC_TOKEN is required');
}

const collectionConfigs = [
  {
    collection: 'site_settings',
    singleton: true,
    fields: ['reference_url'],
  },
  {
    collection: 'download_links',
    fields: ['icon_url'],
  },
  {
    collection: 'home_slides',
    fields: ['image_url', 'background_css'],
  },
  {
    collection: 'home_featured_cards',
    fields: ['image_url', 'background_css'],
  },
  {
    collection: 'content_sections',
    fields: ['hero_image_url', 'icon_image_url', 'source_url'],
  },
  {
    collection: 'content_entries',
    fields: ['image_url', 'video_url', 'source_url'],
  },
];

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

function localizeValue(value) {
  if (typeof value !== 'string' || !value.includes(remoteOrigin)) {
    return value;
  }

  return value.replaceAll(remoteOrigin, '');
}

function localizeItem(item, fields) {
  const patch = {};

  for (const field of fields) {
    const current = item[field];
    const next = localizeValue(current);

    if (next !== current) {
      patch[field] = next;
    }
  }

  return patch;
}

async function updateSingleton(config) {
  const payload = await request(`/items/${config.collection}`);
  const item = payload.data || {};
  const patch = localizeItem(item, config.fields);

  if (Object.keys(patch).length === 0) {
    return 0;
  }

  await request(`/items/${config.collection}`, {
    method: 'PATCH',
    body: JSON.stringify(patch),
  });

  return 1;
}

async function updateCollection(config) {
  let page = 1;
  let updated = 0;

  while (true) {
    const url = new URL(`/items/${config.collection}`, directusUrl);
    url.searchParams.set('fields', ['id', ...config.fields].join(','));
    url.searchParams.set('limit', '500');
    url.searchParams.set('page', String(page));

    const payload = await request(url);
    const items = payload.data || [];

    for (const item of items) {
      const patch = localizeItem(item, config.fields);

      if (Object.keys(patch).length === 0) {
        continue;
      }

      await request(`/items/${config.collection}/${item.id}`, {
        method: 'PATCH',
        body: JSON.stringify(patch),
      });
      updated += 1;
    }

    if (items.length < 500) {
      break;
    }

    page += 1;
  }

  return updated;
}

for (const config of collectionConfigs) {
  const count = config.singleton
    ? await updateSingleton(config)
    : await updateCollection(config);
  process.stdout.write(`localized ${config.collection}: ${count}\n`);
}

process.stdout.write('reference data localization completed\n');
