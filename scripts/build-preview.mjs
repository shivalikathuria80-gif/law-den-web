// Builds the static copy used for the private preview host (a claude.ai artifact).
//
// That host serves the page from a path this build cannot know and reserves published paths
// beginning with "_", so the preview is a single document with relative asset URLs:
//
//   NEXT_PUBLIC_PREVIEW=1 ARTIFACT_EXPORT=1 npm run build && node scripts/build-preview.mjs
//
// The preview build uses its own distDir (.next-preview) because NEXT_PUBLIC_* values are
// compiled into the output — sharing a cache with the normal build leaks the preview flag.
//
//   * NEXT_PUBLIC_PREVIEW makes the app navigate by hash inside one document (see AppLink).
//   * `_next/` is renamed to `assets/`, and every reference — including the chunk base baked
//     into the Turbopack runtime — is rewritten relative so it resolves at any mount path.
//   * Next's legacy `noModule` polyfill is dropped: it contains U+FFFD, which the host rejects.
//   * artifact-page.html holds the page's head + body, since the host supplies the document.
import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, renameSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { extname, join } from 'node:path';

// The export lands in the build directory when distDir is customised, and in out/ otherwise.
const SRC = ['out', '.next-preview'].find((dir) => existsSync(join(dir, 'index.html')));
const DEST = 'out-artifact';
const TEXT = new Set(['.html', '.js', '.css', '.txt', '.json']);

if (!SRC) {
  console.error('Run `NEXT_PUBLIC_PREVIEW=1 ARTIFACT_EXPORT=1 npm run build` first — no export found.');
  process.exit(1);
}

// One document: the page, its assets and the icon. Every route is a hash away from the page.
rmSync(DEST, { recursive: true, force: true });
mkdirSync(DEST, { recursive: true });
cpSync(join(SRC, 'index.html'), join(DEST, 'index.html'));
cpSync(join(SRC, 'favicon.svg'), join(DEST, 'favicon.svg'));
cpSync(join(SRC, '_next'), join(DEST, '_next'), { recursive: true });

const walk = (dir) => readdirSync(dir).flatMap((entry) => {
  const full = join(dir, entry);
  return statSync(full).isDirectory() ? walk(full) : [full];
});

renameSync(join(DEST, '_next'), join(DEST, 'assets'));

// Relative URLs, so the page works wherever the host mounts it.
let rewritten = 0;
for (const file of walk(DEST)) {
  if (!TEXT.has(extname(file))) continue;
  const text = readFileSync(file, 'utf8');
  if (!text.includes('/_next/') && !text.includes('"/assets/')) continue;
  writeFileSync(file, text.replaceAll('"/_next/', '"assets/').replaceAll('/_next/', 'assets/').replaceAll('"/assets/', '"assets/'));
  rewritten += 1;
}

// The legacy polyfill chunk carries U+FFFD and only serves browsers without ES modules.
const polyfill = walk(DEST).find((f) => extname(f) === '.js' && readFileSync(f, 'utf8').includes('�'));
if (polyfill) {
  const name = polyfill.replace(`${DEST}/`, '');
  const page = join(DEST, 'index.html');
  writeFileSync(page, readFileSync(page, 'utf8').replace(new RegExp(`<script src="${name}" noModule=""></script>`, 'g'), ''));
  rmSync(polyfill);
}

// next/font declares its variables on a class Next puts on <html>. The host supplies its own
// <html>, so lift the values onto :root or the display face silently falls back to Times.
const cssFile = walk(DEST).find((f) => extname(f) === '.css');
if (cssFile) {
  const css = readFileSync(cssFile, 'utf8');
  const vars = ['--font-sans', '--font-display']
    .map((name) => {
      const found = new RegExp(`${name}:\\s*([^;}]+)`).exec(css);
      return found ? `${name}:${found[1].trim()}` : null;
    })
    .filter(Boolean);
  if (vars.length) writeFileSync(cssFile, `${css}\n:root{${vars.join(';')}}\n`);
  console.log(`font variables lifted to :root — ${vars.length} of 2`);
}

// The document icon is referenced absolutely by Next's metadata.
// The icon appears both as a <link> and inside the hydration payload.
const page = join(DEST, 'index.html');
writeFileSync(page, readFileSync(page, 'utf8').replaceAll('/favicon.svg', 'favicon.svg'));

const index = readFileSync(join(DEST, 'index.html'), 'utf8');
const head = /<head[^>]*>([\s\S]*?)<\/head>/.exec(index)[1]
  .replace(/<meta charSet="[^"]*"\/?>|<meta charset="[^"]*"\/?>/g, '')
  .replace(/<meta name="viewport"[^>]*\/?>/g, '');
const body = /<body[^>]*>([\s\S]*?)<\/body>/.exec(index)[1];
writeFileSync('artifact-page.html', `${head.trim()}\n${body.trim()}\n`);

const files = walk(DEST).filter((f) => f !== join(DEST, 'index.html'));
console.log(`preview build ready — ${files.length} support files, ${rewritten} rewritten`);
console.log(files.map((f) => f.replace(`${DEST}/`, '')).join('\n'));
