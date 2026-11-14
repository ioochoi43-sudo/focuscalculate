// 나눠서 복사 under random use: the 기록기 (t/trace.js) drives the app at random — checks, 미루기, 수정, 복습,
// 건너뛰기, 양 정하기, 일시중단 … — on a copy of the app that, after every few redraws, splits every row of
// every plan in every way and reports what isn't right (t/split_check.js). Nothing is compared with a record.
//   node r/split_sweep.js <firstSeed> <count>      → "split sweep: N seeds, M problems"
const fs = require('fs'), path = require('path'), { execFileSync } = require('child_process');
const { CHECK } = require('../t/split_check');
const HTML = process.env.FC_HTML || path.join(__dirname, '..', '..', 'index.html');
const first = parseInt(process.argv[2] || '1'), count = parseInt(process.argv[3] || '4');
const out = path.join(__dirname, '..', 'out'); fs.mkdirSync(out, { recursive: true });
const hook = `
;(() => { const check = () => ${CHECK}; const draw = rerender; let n = 0; window.__split = { rows: 0, split: 0 };
  rerender = function () { const v = draw.apply(this, arguments);
    if (++n % 4 === 0) { try { const r = JSON.parse(check()); window.__split.rows += r.rowsSeen; window.__split.split += r.splitSeen; r.out.slice(0, 3).forEach(x => console.error('SPLIT ' + x)); } catch (e) { console.error('SPLIT THROW ' + (e && e.message)); } }
    return v; }; })();
`;
const src = fs.readFileSync(HTML, 'utf8'), at = src.lastIndexOf('</script>');
const file = path.join(out, `split-checked-${first}.html`);
fs.writeFileSync(file, src.slice(0, at) + hook + src.slice(at));
let problems = 0;
for (let seed = first; seed < first + count; seed++) {
  const res = JSON.parse(execFileSync('node', [path.join(__dirname, '..', 't', 'trace.js'), file, String(seed), '1', 'full'], { maxBuffer: 1 << 30 }).toString());
  const errs = res[`${seed}|errors`] || [];
  if (errs.length) { problems += errs.length; console.log(`seed ${seed}: ${errs.length} problems`); errs.slice(0, 5).forEach(e => console.log('   ' + String(e).slice(0, 400))); }
}
fs.unlinkSync(file);
console.log(`split sweep: ${count} seeds, ${problems} problems`);
process.exit(problems ? 1 : 0);
