// Copies the single-threaded ffmpeg.wasm core into public/ffmpeg/ so Vite
// bundles it into dist/. Keeps the ~30 MB out of git (public/ffmpeg is
// gitignored) while guaranteeing it is present in every build.
//
// The ESM build (dist/esm) is required, NOT umd: @ffmpeg/ffmpeg creates its
// worker with { type: "module" }, so importScripts() is unavailable and the
// worker loads the core via `(await import(coreURL)).default`. That path needs
// an ES module with a default export — the umd core has none, and load fails
// with "failed to import ffmpeg-core.js". See scripts guard below.
import { mkdirSync, copyFileSync, existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const srcDir = join(root, 'node_modules', '@ffmpeg', 'core', 'dist', 'esm');
const destDir = join(root, 'public', 'ffmpeg');
const files = ['ffmpeg-core.js', 'ffmpeg-core.wasm'];

mkdirSync(destDir, { recursive: true });
for (const f of files) {
  const src = join(srcDir, f);
  if (!existsSync(src)) {
    console.error(`[copy-ffmpeg-core] Missing ${src}. Run \`npm install\` first.`);
    process.exit(1);
  }
  copyFileSync(src, join(destDir, f));
  console.log(`[copy-ffmpeg-core] Copied ${f}`);
}

// Guard: the module worker can only load an ES module core. If the source ever
// silently becomes a non-ESM build, fail the build here rather than at runtime.
const coreJs = readFileSync(join(destDir, 'ffmpeg-core.js'), 'utf8');
if (!coreJs.includes('export default')) {
  console.error(
    '[copy-ffmpeg-core] ffmpeg-core.js has no `export default` — not an ESM core. ' +
      'The @ffmpeg/ffmpeg module worker requires the ESM build (dist/esm).',
  );
  process.exit(1);
}
