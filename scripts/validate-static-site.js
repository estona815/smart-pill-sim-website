import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const files = ['index.html', 'app.js', 'README.md', 'CODEX_PROMPT.md', 'GPT_PROMPT.md'];
const banned = [
  'NEMA17',
  'TB6600',
  'TMC2209',
  'A3144',
  'homeSensor',
  'stepsPerRev',
  'microstep',
  '스텝모터',
  '마이크로스텝',
  'stepper',
  'Stepper',
  '100% 정확',
  '완벽한 배출 보장',
  '의료기기 수준 검증',
  '실사용 제품 완성',
  '실제 성공률 보장',
  '의료기기',
  '복약 안전 보장',
  '성공률 100%',
  '실제 물리엔진',
  '완성품',
  '상용화 완료',
  'AI가 복약 판단'
];

function read(file) {
  return fs.readFileSync(path.join(root, file), 'utf8');
}

function fail(message) {
  console.error(message);
  process.exitCode = 1;
}

for (const file of files) {
  const text = read(file);
  for (const term of banned) {
    if (text.includes(term)) fail(`${file}: banned term found: ${term}`);
  }
}

const html = read('index.html');
const js = read('app.js');
const ids = new Set([...html.matchAll(/id="([^"]+)"/g)].map(match => match[1]));
const fieldMatch = js.match(/const fieldIds = \[([\s\S]*?)\];/);
if (!fieldMatch) {
  fail('app.js: fieldIds declaration not found');
} else {
  const fields = [...fieldMatch[1].matchAll(/'([^']+)'/g)].map(match => match[1]);
  for (const id of fields) {
    if (!ids.has(id)) fail(`index.html: missing element id used by fieldIds: ${id}`);
  }
  const duplicates = fields.filter((id, index) => fields.indexOf(id) !== index);
  for (const id of new Set(duplicates)) fail(`app.js: duplicate field id: ${id}`);
}

const queriedIds = [...js.matchAll(/getElementById\('([^']+)'\)|querySelector\('#([^']+)'\)/g)]
  .map(match => match[1] || match[2]);
for (const id of new Set(queriedIds)) {
  if (!ids.has(id)) fail(`index.html: missing element id queried by app.js: ${id}`);
}

for (const required of ['MG996R', '5V/5A', '6V', '토출부 포토센서', '공통 GND']) {
  if (!html.includes(required) && !js.includes(required)) fail(`required current design term missing: ${required}`);
}

for (const required of [
  '규칙·확률 기반 사전 검토',
  '발표용 시뮬레이션',
  '실제 물리시험과 구분',
  '의료 판단 아님',
  '반복 검증과 문서화 보조',
  '실측 성공률은 장기 테스트 이후 제시',
  '?mode=presentation',
  'capture-frame'
]) {
  if (!html.includes(required) && !js.includes(required) && !read('README.md').includes(required)) {
    fail(`required presentation safety term missing: ${required}`);
  }
}

const imgTags = [...html.matchAll(/<img\s+[^>]*>/g)].map(match => match[0]);
for (const tag of imgTags) {
  for (const attr of ['src=', 'alt=', 'width=', 'height=', 'loading="lazy"', 'decoding="async"']) {
    if (!tag.includes(attr)) fail(`index.html: image missing ${attr}: ${tag}`);
  }
}

for (const asset of [
  'assets/ai-simulator-dashboard.svg',
  'assets/project-os-mockup.svg',
  'assets/future-concept.svg'
]) {
  if (!fs.existsSync(path.join(root, asset))) fail(`missing asset: ${asset}`);
}

for (const url of [
  'https://github.com/estona815/smart-pill-sim-website',
  'https://estona815.github.io/smart-pill-sim-website/'
]) {
  if (!html.includes(url)) fail(`index.html: missing evidence URL: ${url}`);
}

if (!process.exitCode) console.log('Static site validation passed.');
