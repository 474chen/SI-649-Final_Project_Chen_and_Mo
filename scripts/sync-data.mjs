// ============================================================================
// SYNC-DATA.MJS — copy the JSON the page needs into main code/data/
// ============================================================================
// The Python pipeline writes to ../data. The page must only ever fetch what it
// draws, so this script copies the five files it uses and nothing else (no raw
// CSVs, no zip).
//
//   node scripts/sync-data.mjs          # copy
//   node scripts/sync-data.mjs --check  # only report sizes and dates
// ============================================================================

import { copyFile, mkdir, stat } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '..');
const source = resolve(root, '..', 'data');
const target = join(root, 'data');

const FILES = ['curves.json', 'density.json', 'meta.json', 'taxonomy.json',
               'explorer.json', 'games.json'];

const checkOnly = process.argv.includes('--check');

const kb = bytes => `${(bytes / 1024).toFixed(0)} KB`;

let total = 0;

for (const name of FILES) {
    const from = join(source, name);
    const to = join(target, name);

    let info;
    try {
        info = await stat(from);
    } catch {
        console.error(`missing  ${name}  (looked in ${source})`);
        process.exitCode = 1;
        continue;
    }

    total += info.size;

    if (checkOnly) {
        console.log(`ok       ${name.padEnd(14)} ${kb(info.size).padStart(8)}  ${info.mtime.toISOString()}`);
        continue;
    }

    await mkdir(target, { recursive: true });
    await copyFile(from, to);
    console.log(`copied   ${name.padEnd(14)} ${kb(info.size).padStart(8)}`);
}

console.log(`${checkOnly ? 'found' : 'copied'} ${FILES.length} files, ${kb(total)} total`);
