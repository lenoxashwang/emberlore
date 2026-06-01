const directusUrl = process.env.DIRECTUS_URL || 'http://127.0.0.1:8055';
const staticToken = process.env.DIRECTUS_STATIC_TOKEN;

if (!staticToken) {
  throw new Error('DIRECTUS_STATIC_TOKEN is required');
}

const FILE_FIELDS = [
  {
    collection: 'download_links',
    field: 'icon_url',
    note: 'Choose a file from Directus Files. The stored value is the selected file ID.',
  },
  {
    collection: 'home_slides',
    field: 'image_url',
    note: 'Choose the slide image from Directus Files.',
  },
  {
    collection: 'home_featured_cards',
    field: 'image_url',
    note: 'Choose the card image from Directus Files.',
  },
  {
    collection: 'content_sections',
    field: 'hero_image_url',
    note: 'Choose the section hero image from Directus Files.',
  },
  {
    collection: 'content_sections',
    field: 'icon_image_url',
    note: 'Choose the section icon image from Directus Files.',
  },
  {
    collection: 'content_entries',
    field: 'image_url',
    note: 'Choose the skill/equipment icon from Directus Files.',
  },
  {
    collection: 'content_entries',
    field: 'video_url',
    note: 'Choose the skill media GIF from Directus Files.',
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

async function patchField(collection, field, metaPatch) {
  const current = await request(`/fields/${collection}/${field}`);
  const nextMeta = {
    ...current.data.meta,
    ...metaPatch,
  };

  await request(`/fields/${collection}/${field}`, {
    method: 'PATCH',
    body: JSON.stringify({
      meta: nextMeta,
    }),
  });
}

for (const config of FILE_FIELDS) {
  await patchField(config.collection, config.field, {
    interface: 'file',
    options: null,
    display: 'image',
    display_options: null,
    note: config.note,
    width: 'full',
  });
  process.stdout.write(`configured ${config.collection}.${config.field} as file selector\n`);
}

process.stdout.write('file field configuration completed\n');
