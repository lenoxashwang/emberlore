import http from 'node:http';
import {
  fetchRaw,
} from './scraper.mjs';
import {
  archiveEntry,
  createEntry,
  getAdminEntry,
  getDatabaseInfo,
  getEntryFromStore,
  getPageFromStore,
  getSectionFromStore,
  getStats,
  importEntry,
  importSection,
  listEntries,
  listSectionSnapshots,
  updateEntry,
} from './content-store.mjs';

const port = Number(process.env.BACKEND_PORT || 8788);
const host = process.env.HOST || '127.0.0.1';

function sendJson(response, statusCode, payload) {
  response.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
  });
  response.end(JSON.stringify(payload, null, 2));
}

async function readBody(request) {
  const chunks = [];

  for await (const chunk of request) {
    chunks.push(chunk);
  }

  const raw = Buffer.concat(chunks).toString('utf8').trim();
  if (!raw) {
    return {};
  }

  return JSON.parse(raw);
}

function sendError(response, statusCode, error) {
  sendJson(response, statusCode, {
    error: error instanceof Error ? error.message : 'Unknown error',
  });
}

const server = http.createServer(async (request, response) => {
  try {
    const url = new URL(request.url || '/', `http://${host}:${port}`);
    const method = request.method || 'GET';

    if (method === 'OPTIONS') {
      response.writeHead(204, {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET,POST,PATCH,DELETE,OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      });
      response.end();
      return;
    }

    if (url.pathname === '/api/health') {
      sendJson(response, 200, {
        ok: true,
        database: getDatabaseInfo(),
        stats: getStats(),
      });
      return;
    }

    if (url.pathname === '/api/raw' && method === 'GET') {
      const pathname = url.searchParams.get('path') || '/en/';
      sendJson(response, 200, await fetchRaw(pathname));
      return;
    }

    if (url.pathname === '/api/page' && method === 'GET') {
      const pathname = url.searchParams.get('path') || '/en/';
      sendJson(response, 200, await getPageFromStore(pathname));
      return;
    }

    const sectionMatch = url.pathname.match(/^\/api\/section\/([^/]+)\/?$/);
    if (sectionMatch && method === 'GET') {
      sendJson(response, 200, await getSectionFromStore(sectionMatch[1]));
      return;
    }

    const detailMatch = url.pathname.match(/^\/api\/section\/([^/]+)\/([^/]+)\/?$/);
    if (detailMatch && method === 'GET') {
      sendJson(response, 200, await getEntryFromStore(detailMatch[1], detailMatch[2]));
      return;
    }

    if (url.pathname === '/api/admin/sections' && method === 'GET') {
      sendJson(response, 200, {
        items: listSectionSnapshots(url.searchParams.get('locale') || 'en'),
      });
      return;
    }

    const importSectionMatch = url.pathname.match(/^\/api\/admin\/import\/section\/([^/]+)\/?$/);
    if (importSectionMatch && method === 'POST') {
      sendJson(response, 200, await importSection(importSectionMatch[1]));
      return;
    }

    const importEntryMatch = url.pathname.match(/^\/api\/admin\/import\/entry\/([^/]+)\/([^/]+)\/?$/);
    if (importEntryMatch && method === 'POST') {
      sendJson(response, 200, await importEntry(importEntryMatch[1], importEntryMatch[2]));
      return;
    }

    if (url.pathname === '/api/admin/entries' && method === 'GET') {
      sendJson(response, 200, {
        items: listEntries(
          url.searchParams.get('section') || '',
          url.searchParams.get('locale') || 'en',
          url.searchParams.get('includeArchived') !== 'false',
        ),
      });
      return;
    }

    if (url.pathname === '/api/admin/entries' && method === 'POST') {
      const body = await readBody(request);
      if (!body.section || !body.slug || !body.title) {
        sendError(response, 400, new Error('section, slug and title are required'));
        return;
      }

      sendJson(response, 201, createEntry(body.section, body.slug, body));
      return;
    }

    const adminEntryMatch = url.pathname.match(/^\/api\/admin\/entries\/([^/]+)\/([^/]+)\/?$/);
    if (adminEntryMatch && method === 'GET') {
      sendJson(response, 200, getAdminEntry(adminEntryMatch[1], adminEntryMatch[2]));
      return;
    }

    if (adminEntryMatch && method === 'PATCH') {
      const body = await readBody(request);
      sendJson(response, 200, updateEntry(adminEntryMatch[1], adminEntryMatch[2], body));
      return;
    }

    if (adminEntryMatch && method === 'DELETE') {
      sendJson(response, 200, archiveEntry(adminEntryMatch[1], adminEntryMatch[2]));
      return;
    }

    if (url.pathname === '/api/admin/runes' && method === 'GET') {
      sendJson(response, 200, {
        items: listEntries('runes', url.searchParams.get('locale') || 'en', true),
      });
      return;
    }

    if (url.pathname === '/api/admin/runes' && method === 'POST') {
      const body = await readBody(request);
      if (!body.slug || !body.title) {
        sendError(response, 400, new Error('slug and title are required'));
        return;
      }

      sendJson(response, 201, createEntry('runes', body.slug, {
        ...body,
        section: 'runes',
      }));
      return;
    }

    const adminRuneMatch = url.pathname.match(/^\/api\/admin\/runes\/([^/]+)\/?$/);
    if (adminRuneMatch && method === 'GET') {
      sendJson(response, 200, getAdminEntry('runes', adminRuneMatch[1]));
      return;
    }

    if (adminRuneMatch && method === 'PATCH') {
      const body = await readBody(request);
      sendJson(response, 200, updateEntry('runes', adminRuneMatch[1], body));
      return;
    }

    if (adminRuneMatch && method === 'DELETE') {
      sendJson(response, 200, archiveEntry('runes', adminRuneMatch[1]));
      return;
    }

    sendJson(response, 404, { error: 'Not found' });
  } catch (error) {
    sendError(response, 500, error);
  }
});

server.listen(port, host, () => {
  process.stdout.write(`backend http://${host}:${port}\n`);
});
