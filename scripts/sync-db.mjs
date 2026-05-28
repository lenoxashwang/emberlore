import {
  getStats,
  importSection,
} from '../backend/content-store.mjs';
import { REMOTE_SECTION_NAMES } from '../backend/sections.mjs';

const requested = process.argv.slice(2);
const targets = requested.length === 0 || requested[0] === 'all'
  ? REMOTE_SECTION_NAMES
  : requested;

for (const section of targets) {
  process.stdout.write(`sync ${section}\n`);

  try {
    await importSection(section);
  } catch (error) {
    process.stdout.write(`skip ${section}: ${error instanceof Error ? error.message : 'Unknown error'}\n`);
  }
}

process.stdout.write(`${JSON.stringify(getStats(), null, 2)}\n`);

