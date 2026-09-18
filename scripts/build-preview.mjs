// Builds the static copy used for the private preview host (claude.ai artifact).
//
// That host has two constraints the default Next export violates:
//   1. published paths may not start with "_", which rules out `_next/` and Next's
//      `__next.*.txt` RSC payloads;
//   2. files may not contain the Unicode replacement character, which Next's legacy
//      `noModule` polyfill chunk does.
//
// So: export, copy to out-artifact/, rename `_next` -> `assets`, rewrite references, drop the
// legacy polyfill, and emit artifact-page.html (the page body, since the host supplies its own
// document skeleton). Usage: `node scripts/build-preview.mjs` after `ARTIFACT_EXPORT=1 npm run build`.
import { cpSync, existsSync, mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { readdirSync, statSync } from 'node:fs';
import { join, extname } from 'node:path';

const SRC = 'out';
const DEST = 'out-artifact';
const TEXT = new Set(['.html', '.js', '.css', '.txt', '.json']);

if (!existsSync(SRC)) {
  console.error('Run `ARTIFACT_EXPORT=1 npm run build` first — no out/ directory.');
  process.exit(1);
}

rmSync(DEST, { recursive: true, force: true });
mkdirSync(DEST, { recursive: true });
cpSync(SRC, DEST, { recursive: true });

const walk = (dir) => readdirSync(dir).flatMap((entry) => {
  const full = join(dir, entry);
  return statSync(full).isDirectory() ? walk(full) : [full];
});

// 1. Paths the host reserves.
for (const file of walk(DEST)) {
  if (file.includes('__next.') && file.endsWith('.txt')) rmSync(file);
}
rmSync(join(DEST, '_not-found'), { recursive: true, force: true });
renameSync(join(DEST, '_next'), join(DEST, 'assets'));

// 2. Point every reference at the renamed directory.
let rewritten = 0;
for (const file of walk(DEST)) {
  if (!TEXT.has(extname(file))) continue;
  const text = readFileSync(file, 'utf8');
  if (!text.includes('_next/')) continue;
  writeFileSync(file, text.replaceAll('/_next/', '/assets/').replaceAll('"_next/', '"assets/'));
  rewritten += 1;
}

// 3. The legacy polyfill chunk carries U+FFFD and only serves browsers without ES modules.
const polyfill = walk(DEST).find((f) => {
  if (extname(f) !== '.js') return false;
  return readFileSync(f, 'utf8').includes('�');
});
if (polyfill) {
  const name = polyfill.replace(`${DEST}/`, '');
  for (const file of walk(DEST)) {
    if (extname(file) !== '.html') continue;
    const text = readFileSync(file, 'utf8');
    const stripped = text.replace(new RegExp(`<script src="/${name}" noModule=""></script>`, 'g'), '');
    if (stripped !== text) writeFileSync(file, stripped);
  }
  rmSync(polyfill);
}

// 4. The host wraps the page in its own <html>/<head>/<body>, so publish the contents only.
const index = readFileSync(join(DEST, 'index.html'), 'utf8');
const head = /<head[^>]*>([\s\S]*?)<\/head>/.exec(index)[1]
  .replace(/<meta charSet="[^"]*"\/?>|<meta charset="[^"]*"\/?>/g, '')
  .replace(/<meta name="viewport"[^>]*\/?>/g, '');
const body = /<body[^>]*>([\s\S]*?)<\/body>/.exec(index)[1];
writeFileSync('artifact-page.html', `${head.trim()}\n${body.trim()}\n`);

console.log(`preview build ready — ${walk(DEST).length} files, ${rewritten} rewritten, page in artifact-page.html`);
