import { execFileSync } from 'node:child_process';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..', '..');
const seedPath = process.env.REFERENCE_SEED_PATH || path.join(__dirname, 'generated', 'reference-seed.json');
const outputDir = path.join(__dirname, 'generated');
const outputPath = process.env.RUNE_GIF_MANIFEST_PATH || path.join(outputDir, 'rune-gif-manifest.json');
const locale = process.env.RUNE_GIF_LOCALE || 'en';
const sectionSlug = process.env.RUNE_GIF_SECTION || 'runes';
const origin = process.env.RUNE_GIF_ORIGIN || 'https://undecember.thein.ru';
const sessionName = process.env.RUNE_GIF_PLAYWRIGHT_SESSION || 'rgif';
const batchSize = Number(process.env.RUNE_GIF_BATCH_SIZE || 15);
const waitMs = Number(process.env.RUNE_GIF_WAIT_MS || 1200);
const skipInstall = process.env.SKIP_PLAYWRIGHT_INSTALL === '1';

function getPlaywrightCommand() {
  if (process.env.PWCLI) {
    return {
      command: process.env.PWCLI,
      baseArgs: [],
    };
  }

  return {
    command: 'npx',
    baseArgs: ['--yes', '@playwright/cli'],
  };
}

const playwrightCommand = getPlaywrightCommand();

function runPlaywright(args, { raw = false, useSession = true } = {}) {
  const fullArgs = [...playwrightCommand.baseArgs];
  if (useSession) {
    fullArgs.push('--session', sessionName);
  }
  if (raw) {
    fullArgs.push('--raw');
  }
  fullArgs.push(...args);

  try {
    return execFileSync(playwrightCommand.command, fullArgs, {
      cwd: repoRoot,
      encoding: 'utf8',
      maxBuffer: 32 * 1024 * 1024,
      env: process.env,
    }).trim();
  } catch (error) {
    const details = [error?.message, error?.stdout, error?.stderr].filter(Boolean).join('\n');
    throw new Error(details || `Playwright command failed: ${args.join(' ')}`);
  }
}

function chunk(items, size) {
  const chunks = [];

  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }

  return chunks;
}

function buildEvalCode(slugs) {
  return `(async () => {
    const slugs = ${JSON.stringify(slugs)};
    const basePath = ${JSON.stringify(`/${locale}/${sectionSlug}/`)};
    const waitMs = ${JSON.stringify(waitMs)};
    const results = [];

    for (const slug of slugs) {
      const iframe = document.createElement('iframe');
      iframe.style.display = 'none';
      iframe.src = basePath + slug + '/';
      document.body.appendChild(iframe);

      try {
        await new Promise((resolve, reject) => {
          const timer = setTimeout(() => reject(new Error('load timeout')), 20000);
          iframe.addEventListener('load', () => {
            clearTimeout(timer);
            resolve();
          }, { once: true });
        });

        await new Promise((resolve) => setTimeout(resolve, waitMs));

        const doc = iframe.contentDocument;
        const mediaButton = doc?.querySelector('a[class*=Elem_card_media_open]');

        if (mediaButton) {
          mediaButton.dispatchEvent(
            new MouseEvent('click', {
              bubbles: true,
              cancelable: true,
              view: iframe.contentWindow,
            }),
          );
          await new Promise((resolve) => setTimeout(resolve, 500));
        }

        const publicPath =
          doc?.querySelector('div[class*=Elem_card_media_size] img')?.getAttribute('src') || null;
        results.push({
          slug,
          has_media: !!mediaButton,
          public_path: publicPath,
          error: null,
        });
      } catch (error) {
        results.push({
          slug,
          has_media: false,
          public_path: null,
          error: String(error),
        });
      } finally {
        iframe.remove();
      }
    }

    return results;
  })()`;
}

const seed = JSON.parse(await readFile(seedPath, 'utf8'));
const runeSlugs = [...new Set(
  (seed.content_entries || [])
    .filter((item) => item.locale === locale && item.section_slug === sectionSlug && typeof item.slug === 'string')
    .map((item) => item.slug),
)];

if (runeSlugs.length === 0) {
  throw new Error(`No ${locale}/${sectionSlug} slugs found in ${seedPath}`);
}

if (!skipInstall) {
  process.stdout.write('ensuring playwright chromium is available\n');
  runPlaywright(['install-browser', 'chromium'], { useSession: false });
}

process.stdout.write(`opening source site session ${sessionName}\n`);
runPlaywright(['open', `${origin}/${locale}/`]);

const batches = chunk(runeSlugs, Math.max(1, batchSize));
const collected = [];

for (const [index, batch] of batches.entries()) {
  process.stdout.write(`fetching rune gif metadata batch ${index + 1}/${batches.length}\n`);
  const stdout = runPlaywright(['eval', buildEvalCode(batch)], { raw: true });
  const results = JSON.parse(stdout);
  collected.push(...results);
}

const items = collected
  .filter((item) => typeof item?.slug === 'string')
  .sort((a, b) => a.slug.localeCompare(b.slug))
  .map((item) => ({
    slug: item.slug,
    public_path: typeof item.public_path === 'string' ? item.public_path : '',
    has_media: Boolean(item.has_media && item.public_path),
    source_url: `/${locale}/${sectionSlug}/${item.slug}/`,
    error: item.error || '',
  }));

const manifest = {
  meta: {
    generatedAt: new Date().toISOString(),
    origin,
    locale,
    section: sectionSlug,
    checked: items.length,
    withMedia: items.filter((item) => item.has_media).length,
    withoutMedia: items.filter((item) => !item.has_media).length,
    sessionName,
  },
  items,
};

await mkdir(outputDir, { recursive: true });
await writeFile(outputPath, JSON.stringify(manifest, null, 2) + '\n');

process.stdout.write(
  `wrote ${manifest.meta.withMedia}/${manifest.meta.checked} rune media entries to ${outputPath}\n`,
);
