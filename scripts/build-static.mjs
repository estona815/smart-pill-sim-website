import fs from 'node:fs/promises';
import fsSync from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dist = path.join(root, 'dist');
const reports = path.join(root, 'reports');
const websiteRoot = path.join(root, 'website');
const analyzeOnly = process.argv.includes('--analyze-only');

function minifyCss(css) {
  return css.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\s+/g, ' ').replace(/\s*([{}:;,>])\s*/g, '$1').trim();
}
function minifyJs(js) {
  return js.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|\n)\s*\/\/.*(?=\n)/g, '').replace(/\n\s+/g, '\n').trim();
}
async function writeCompressed(file) {
  const data = await fs.readFile(file);
  await fs.writeFile(`${file}.gz`, zlib.gzipSync(data, { level: 9 }));
  await fs.writeFile(`${file}.br`, zlib.brotliCompressSync(data, {
    params: { [zlib.constants.BROTLI_PARAM_QUALITY]: 11 }
  }));
}
async function copyDir(src, dest) {
  if (!fsSync.existsSync(src)) return;
  await fs.mkdir(dest, { recursive: true });
  for (const entry of await fs.readdir(src, { withFileTypes: true })) {
    const s = path.join(src, entry.name);
    const d = path.join(dest, entry.name);
    if (entry.isDirectory()) await copyDir(s, d);
    else await fs.copyFile(s, d);
  }
}

async function compressTextAssets(dir) {
  for (const entry of await fs.readdir(dir, { withFileTypes: true })) {
    const target = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      await compressTextAssets(target);
      continue;
    }

    if (/\.(html|css|js)$/i.test(entry.name)) {
      await writeCompressed(target);
    }
  }
}

if (!analyzeOnly) {
  spawnSync('python3', [path.join(root, 'scripts/optimize-images.py')], { stdio: 'inherit' });
  await fs.rm(dist, { recursive: true, force: true });
  await fs.mkdir(dist, { recursive: true });

  const redirectHtml = await fs.readFile(path.join(root, 'index.html'), 'utf8');
  await fs.writeFile(path.join(dist, 'index.html'), redirectHtml);
  if (fsSync.existsSync(path.join(root, 'sw.js'))) {
    await fs.copyFile(path.join(root, 'sw.js'), path.join(dist, 'sw.js'));
  }

  await copyDir(websiteRoot, path.join(dist, 'website'));
  await compressTextAssets(dist);
}

await fs.mkdir(reports, { recursive: true });
const files = [];
async function collect(dir) {
  for (const entry of await fs.readdir(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) await collect(p);
    else files.push(p);
  }
}
await collect(dist);
const rows = files.map(file => ({
  file: path.relative(dist, file),
  bytes: fsSync.statSync(file).size
})).sort((a, b) => b.bytes - a.bytes);
const scriptRows = rows.filter(r => r.file.endsWith('.js'));
const largestJs = scriptRows[0] ?? { file: null, bytes: 0 };
const report = {
  generatedAt: new Date().toISOString(),
  dist,
  totalBytes: rows.reduce((a, r) => a + r.bytes, 0),
  totalJsBytes: scriptRows.reduce((sum, row) => sum + row.bytes, 0),
  largestJsFile: largestJs.file,
  largestJsBytes: largestJs.bytes,
  largestJsUnder100KB: largestJs.bytes <= 100 * 1024,
  files: rows
};
await fs.writeFile(path.join(reports, 'performance-summary.json'), JSON.stringify(report, null, 2));
await fs.writeFile(path.join(dist, 'bundle-report.html'), `<!doctype html><meta charset="utf-8"><title>Bundle report</title><style>body{font-family:system-ui;margin:32px}table{border-collapse:collapse;width:100%}td,th{border-bottom:1px solid #ddd;padding:8px;text-align:left}</style><h1>Nutronics bundle report</h1><p>Total ${(report.totalBytes/1024).toFixed(1)} KB · largest JS ${report.largestJsFile ?? 'n/a'} ${(largestJs.bytes/1024).toFixed(1)} KB</p><table><tr><th>File</th><th>KB</th></tr>${rows.map(r=>`<tr><td>${r.file}</td><td>${(r.bytes/1024).toFixed(1)}</td></tr>`).join('')}</table>`);
console.log(`dist ready: ${dist}`);
console.log(`largest JS ${report.largestJsFile ?? 'n/a'} ${(largestJs.bytes/1024).toFixed(1)} KB`);
