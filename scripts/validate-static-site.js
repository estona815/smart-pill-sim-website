const fs = require('fs');
const path = require('path');

const root = process.cwd();
const files = [
  'index.html',
  'admin.html',
  'demo.html',
  'app.js',
  'admin.js',
  'demo.js',
  'hardware-mock.js',
  'README.md',
  'CODEX_PROMPT.md',
  'GPT_PROMPT.md',
  'HANDOFF_PIPELINE.md',
  'WEB_FINAL_QC_REPORT.md',
  'scripts/measurement-error.js'
];
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
  '실제 성공률 보장'
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

function validateHtmlJsPair(htmlFile, jsFile) {
  const pageHtml = read(htmlFile);
  const pageJs = read(jsFile);
  const pageIds = new Set([...pageHtml.matchAll(/id="([^"]+)"/g)].map(match => match[1]));
  const pageQueriedIds = [...pageJs.matchAll(/getElementById\('([^']+)'\)|querySelector\('#([^']+)'\)/g)]
    .map(match => match[1] || match[2]);
  for (const id of new Set(pageQueriedIds)) {
    if (!pageIds.has(id)) fail(`${htmlFile}: missing element id queried by ${jsFile}: ${id}`);
  }
}

validateHtmlJsPair('admin.html', 'admin.js');
validateHtmlJsPair('demo.html', 'demo.js');

const measurement = require('./measurement-error');
const sampleError = measurement.calculateMeasurementError('10.0mm', '10.4mm', 5);
if (!sampleError.ok || sampleError.grade === 'invalid') fail('scripts/measurement-error.js: sample error calculation failed');

for (const requiredFile of [
  'data/actual_performance.json',
  'data/hardware_readiness_gate.json',
  'control_layer/control_config.json',
  'docs/pre_connection_checklist.md',
  'docs/workshop_checklist.md',
  'Makefile'
]) {
  if (!fs.existsSync(path.join(root, requiredFile))) fail(`required handoff file missing: ${requiredFile}`);
}

for (const required of ['MG996R', '5V/5A', '6V', '토출부 포토센서', '공통 GND']) {
  if (!html.includes(required) && !js.includes(required)) fail(`required current design term missing: ${required}`);
}

if (!process.exitCode) console.log('Static site validation passed.');
