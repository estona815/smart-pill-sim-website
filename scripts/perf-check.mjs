import fs from 'node:fs/promises';
import fsSync from 'node:fs';
import path from 'node:path';

const root = path.resolve(new URL('..', import.meta.url).pathname);
const dist = path.join(root, 'dist');
const reports = path.join(root, 'reports');
await fs.mkdir(reports, { recursive: true });

const appJs = fsSync.existsSync(path.join(dist, 'app.js')) ? fsSync.statSync(path.join(dist, 'app.js')).size : 0;
const css = fsSync.existsSync(path.join(dist, 'styles.css')) ? fsSync.statSync(path.join(dist, 'styles.css')).size : 0;
const html = fsSync.existsSync(path.join(dist, 'index.html')) ? fsSync.statSync(path.join(dist, 'index.html')).size : 0;
const assetsDir = path.join(dist, 'assets');
const images = fsSync.existsSync(assetsDir)
  ? fsSync.readdirSync(assetsDir).filter(f => /\.(svg|webp|avif|png|jpg)$/i.test(f)).map(f => ({ file: `assets/${f}`, bytes: fsSync.statSync(path.join(assetsDir, f)).size }))
  : [];
const oversized = images.filter(i => i.bytes > 500 * 1024);
const result = {
  generatedAt: new Date().toISOString(),
  checks: {
    distExists: fsSync.existsSync(dist),
    appJsUnder100KB: appJs <= 100 * 1024,
    noOversizedImagesOver500KB: oversized.length === 0,
    hasExplicitImageDimensions: /width="\d+" height="\d+"/.test(await fs.readFile(path.join(dist, 'index.html'), 'utf8')),
    hasLazyImages: /loading="lazy"/.test(await fs.readFile(path.join(dist, 'index.html'), 'utf8')),
    compressedAssetsPresent: fsSync.existsSync(path.join(dist, 'app.js.gz')) && fsSync.existsSync(path.join(dist, 'app.js.br'))
  },
  sizes: { html, css, appJs, images },
  lighthouse: {
    status: 'not-run-in-this-environment',
    reason: 'npm/lhci package manager is unavailable in this Codex runtime; lighthouserc.json and lhci script are prepared for the destination machine.'
  }
};
await fs.writeFile(path.join(reports, 'perf-check.json'), JSON.stringify(result, null, 2));
const md = [
  '# Lighthouse / Performance Summary',
  '',
  '- Lighthouse CI config: `lighthouserc.json`',
  `- Local fallback checks passed: ${Object.values(result.checks).every(Boolean)}`,
  `- app.js: ${(appJs / 1024).toFixed(1)} KB`,
  `- CSS: ${(css / 1024).toFixed(1)} KB`,
  `- HTML: ${(html / 1024).toFixed(1)} KB`,
  `- Images over 500 KB: ${oversized.length}`,
  '',
  'Note: run `npm install && npm run lhci` on a machine with npm to produce the full Lighthouse HTML/JSON report.',
  ''
].join('\n');
await fs.writeFile(path.join(reports, 'lighthouse-summary.md'), md);
console.log(JSON.stringify(result, null, 2));
