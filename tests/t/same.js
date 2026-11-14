// Compare (or write) the record made by t/trace.js with the one kept in baseline/. Used by same.sh.
//   node t/same.js compare <parts…>      node t/same.js make <ref> <parts…>
const fs = require('fs'), zlib = require('zlib'), path = require('path'), crypto = require('crypto');
const BASE = path.join(__dirname, '..', 'baseline', 'v410-trace.json.gz');
// the recorder itself: if any of these change, the record is no longer comparable
const fp = crypto.createHash('sha1').update(['t/trace.js', 't/h.js', 'r/pin_lib.js', 'r/common.js', 't/seed.js']
  .map(f => fs.readFileSync(path.join(__dirname, '..', f), 'utf8')).join('\n')).digest('hex').slice(0, 12);
const mode = process.argv[2];
const read = (files) => { const o = {}; files.forEach(f => Object.assign(o, JSON.parse(fs.readFileSync(f, 'utf8')))); return o; };
if (mode === 'make') {
  const rec = read(process.argv.slice(4));
  fs.writeFileSync(BASE, zlib.gzipSync(JSON.stringify({ ref: process.argv[3], fp, rec }), { level: 9 }));
  console.log(`baseline written: ${Object.keys(rec).length} steps (from ${process.argv[3]})`);
  process.exit(0);
}
const base = JSON.parse(zlib.gunzipSync(fs.readFileSync(BASE)));
if (base.fp !== fp) { console.log('same: 기록기(t/trace.js 등)가 기준을 뜬 뒤에 바뀌었어요 — 비교할 수 없어요. 기준 버전의 파일로 기준을 다시 떠야 해요 (README 참고)'); process.exit(2); }
const cur = read(process.argv.slice(3));
const seeds = new Set(Object.keys(cur).map(k => k.split('|')[0]));
const keys = Object.keys(base.rec).filter(k => seeds.has(k.split('|')[0]));
const PART = ['저장된 데이터', '계획·계산', '화면 글자'];
let diffs = 0; const badSeeds = new Set(), lines = [];
keys.forEach(k => {
  if (cur[k] === base.rec[k]) return;
  diffs++; const s = k.split('|')[0];
  if (!badSeeds.has(s)) { // the first step where this seed goes a different way
    const a = String(base.rec[k]).split('.'), b = String(cur[k] || '').split('.');
    lines.push(`  ${k}: ${cur[k] === undefined ? '기록 없음' : PART.filter((_, i) => a[i] !== b[i]).join(', ') + ' 다름'}`);
  }
  badSeeds.add(s);
});
Object.keys(cur).forEach(k => { if (!(k in base.rec)) { diffs++; badSeeds.add(k.split('|')[0]); if (lines.length < 12) lines.push(`  ${k}: 기준에 없는 기록`); } });
console.log(`same (기준 ${base.ref}과 비교): ${seeds.size} seeds, ${keys.length} steps, ${diffs} diffs`);
if (diffs) { console.log(lines.slice(0, 12).join('\n')); console.log(`  → 자세히: ./same.sh why ${[...badSeeds][0]}`); }
process.exit(diffs ? 1 : 0);
