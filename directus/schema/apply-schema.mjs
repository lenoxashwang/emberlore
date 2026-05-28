import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const schemaPath = path.join(__dirname, 'collections.json');

const directusUrl = process.env.DIRECTUS_URL || 'http://127.0.0.1:8055';
const staticToken = process.env.DIRECTUS_STATIC_TOKEN;

if (!staticToken) {
  throw new Error('DIRECTUS_STATIC_TOKEN is required');
}

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

function fieldMeta(field, sort) {
  const meta = {
    field: field.name,
    hidden: false,
    readonly: false,
    sort,
    width: 'full',
    required: !!field.required,
    note: null,
  };

  if (field.type === 'text') {
    return {
      ...meta,
      interface: 'input-multiline',
    };
  }

  if (field.type === 'boolean') {
    return {
      ...meta,
      interface: 'boolean',
      width: 'half',
    };
  }

  return {
    ...meta,
    interface: 'input',
  };
}

function fieldSchema(field) {
  const schema = {
    is_nullable: !field.required,
  };

  if (field.unique) {
    schema.is_unique = true;
  }

  if (field.default !== undefined) {
    schema.default_value = field.default;
  }

  if (field.type === 'string') {
    schema.max_length = 255;
  }

  return schema;
}

function collectionPayload(collection) {
  return {
    collection: collection.name,
    meta: {
      note: collection.note || null,
      icon: collection.singleton ? 'settings' : 'inventory_2',
      hidden: false,
      singleton: !!collection.singleton,
      accountability: 'all',
      collapse: 'open',
    },
    schema: {
      name: collection.name,
    },
  };
}

const definition = JSON.parse(await readFile(schemaPath, 'utf8'));
const existingCollections = new Set(
  (await request('/collections')).data.map((item) => item.collection),
);

for (const collection of definition.collections) {
  if (!existingCollections.has(collection.name)) {
    process.stdout.write(`create collection ${collection.name}\n`);
    await request('/collections', {
      method: 'POST',
      body: JSON.stringify(collectionPayload(collection)),
    });
  } else {
    process.stdout.write(`skip collection ${collection.name}\n`);
  }

  const existingFields = new Set(
    (await request(`/fields/${collection.name}`)).data.map((field) => field.field),
  );

  for (const [index, field] of collection.fields.entries()) {
    if (existingFields.has(field.name)) {
      process.stdout.write(`  skip field ${collection.name}.${field.name}\n`);
      continue;
    }

    process.stdout.write(`  create field ${collection.name}.${field.name}\n`);
    await request(`/fields/${collection.name}`, {
      method: 'POST',
      body: JSON.stringify({
        field: field.name,
        type: field.type,
        meta: fieldMeta(field, index + 2),
        schema: fieldSchema(field),
      }),
    });
  }
}

process.stdout.write('schema apply completed\n');
