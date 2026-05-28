import { mkdirSync } from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.join(__dirname, 'data');

mkdirSync(dataDir, { recursive: true });

export const dbPath = path.join(dataDir, 'undecember.sqlite');

const db = new DatabaseSync(dbPath);

db.exec(`
  PRAGMA journal_mode = WAL;
  PRAGMA foreign_keys = ON;

  CREATE TABLE IF NOT EXISTS section_snapshots (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    section TEXT NOT NULL,
    locale TEXT NOT NULL DEFAULT 'en',
    path TEXT NOT NULL,
    meta_title TEXT NOT NULL DEFAULT '',
    meta_description TEXT NOT NULL DEFAULT '',
    og_image TEXT NOT NULL DEFAULT '',
    navigation_json TEXT NOT NULL DEFAULT '[]',
    items_json TEXT NOT NULL DEFAULT '[]',
    source_type TEXT NOT NULL DEFAULT 'scraped',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    UNIQUE(section, locale)
  );

  CREATE TABLE IF NOT EXISTS content_entries (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    section TEXT NOT NULL,
    slug TEXT NOT NULL,
    locale TEXT NOT NULL DEFAULT 'en',
    path TEXT NOT NULL,
    kind TEXT NOT NULL DEFAULT 'summary',
    title TEXT NOT NULL DEFAULT '',
    description TEXT NOT NULL DEFAULT '',
    image TEXT NOT NULL DEFAULT '',
    meta_title TEXT NOT NULL DEFAULT '',
    meta_description TEXT NOT NULL DEFAULT '',
    og_image TEXT NOT NULL DEFAULT '',
    back_link TEXT NOT NULL DEFAULT '',
    navigation_json TEXT NOT NULL DEFAULT '[]',
    tags_json TEXT NOT NULL DEFAULT '[]',
    properties_json TEXT NOT NULL DEFAULT '[]',
    tiles_json TEXT NOT NULL DEFAULT '[]',
    awakenings_json TEXT NOT NULL DEFAULT '[]',
    summary_json TEXT NOT NULL DEFAULT '{}',
    raw_json TEXT NOT NULL DEFAULT '{}',
    raw_html TEXT NOT NULL DEFAULT '',
    source_type TEXT NOT NULL DEFAULT 'scraped',
    status TEXT NOT NULL DEFAULT 'published',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    UNIQUE(section, slug, locale)
  );

  CREATE INDEX IF NOT EXISTS idx_content_entries_section
  ON content_entries(section, locale, status);
`);

export function getDatabase() {
  return db;
}

