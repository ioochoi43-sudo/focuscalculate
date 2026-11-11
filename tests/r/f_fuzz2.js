const C = require('./common');
const seedArg = parseInt(process.argv[2] || '1');
let s = seedArg; const rnd = () => { s = (s * 1103515245 + 12345) % 2147483648; return s / 2147483648; };
const mkEx = (N, unit, k) => { const out = []; for (let i = 0; i < k; i++) { const at = rnd() < 0.3 ? 100000 : Math.floor(rnd() * N); const w = unit === 'min' ? 10 + Math.floor(rnd() * 60) : unit === 'pg' ? 2 + Math.floor(rnd() * 25) : 1 + Math.floor(rnd() * 9); out.push({ id: 'x' + i, t: 'R' + i, w, at, u: unit }); } return out; };
const T = [];
const variants = [
  ['P', (id, ex) => C.S.pageTask(id, { extras: ex }), 'pg', 10],
  ['PC', (id, ex) => C.S.pageTask(id, { extras: ex, timeMode: 'capacity', dailyMinutes: 9 }), 'pg', 10],
  ['PE', (id, ex) => C.S.pageTask(id, { extras: ex, pace: 'every-other', reviewDays: [0], end: '2027-01-10' }), 'pg', 10],
  ['W', (id, ex) => C.S.weightTask(id, { extras: ex }), 'da', 12],
  ['WC', (id, ex) => C.S.weightTask(id, { extras: ex, timeMode: 'capacity', dailyMinutes: 6 }), 'da', 12],
  ['L', (id, ex) => C.S.lectureTask(id, { extras: ex }), 'min', 20],
  ['LC', (id, ex) => C.S.lectureTask(id, { extras: ex, timeMode: 'capacity', dailyMinutes: 90 }), 'min', 20],
];
variants.forEach(([nm, f, u, N]) => { const id = nm + seedArg; T.push(f(id, mkEx(N, u, 1 + Math.floor(rnd() * 3)))); });
const sv = process.argv[3] || 'plain';
const setX = sv === 'w' ? { 'focus-calculate-settings-v1': { avail: null, weights: [2,1,1,0.5,1,1.5,1], offDates: ['2026-11-19','2026-12-03','2026-12-04'], wHist: [], offLog: {}, ppRuleFrom: '2026-10-01' } } : {};
const app = C.mk(T, '2026-11-09', setX);
const ids = T.map(t => t.id);
const prev = {}, done = {}, issues = [];
const rowsOf = (id) => app.snap(id).rows;
for (const ds of C.days('2026-11-09', 64)) {
  app.setDay(ds);
  ids.forEach(id => {
    if (done[id]) return;
    const sn = app.snap(id);
    if (sn.prog >= app.task(id).total) { done[id] = ds; return; }
    if (sn.status === 'behind' || sn.status === 'ahead') issues.push(`${id} ${ds} status ${sn.status}`);
    const fut = sn.rows.filter(r => r[0] >= ds && !r[9]).map(r => r.slice(0, 9).join(' ') + ' ' + (r[11] || '')).join('|');
    if (prev[id] != null && prev[id] !== fut) issues.push(`${id} ${ds} plan changed overnight\n   was ${prev[id].slice(0, 400)}\n   now ${fut.slice(0, 400)}`);
    // page contiguity of future rows
    const t = app.task(id);
    if (t.itemPages) { let last = null; sn.rows.filter(r => r[0] >= ds && r[7] != null && !r[9]).forEach(r => { if (last != null && r[7] !== last + 1) issues.push(`${id} ${ds} pages gap/overlap ${last} -> ${r[7]}`); last = r[8]; });
      const reached = app.ev(`pageReachedNow(tasks.find(x => x.id === '${id}'))`); const first = sn.rows.find(r => r[0] >= ds && r[7] != null && !r[9]); if (first && first[7] !== reached + 1) issues.push(`${id} ${ds} first page ${first[7]} != reached+1 ${reached + 1}`); }
    const tmr = C.days(ds, 2)[1];
    const fb = sn.rows.filter(x => x[0] > ds && !x[9]).map(x => x.slice(0, 9).join(' ') + ' ' + (x[11] || '')).join('|');
    const r = app.check(id);
    const fa = app.snap(id).rows.filter(x => x[0] > ds && !x[9]).map(x => x.slice(0, 9).join(' ') + ' ' + (x[11] || '')).join('|');
    if (fa !== fb && app.task(id).progress < app.task(id).total) issues.push(`${id} ${ds} same-day change after on-plan check\n   before ${fb.slice(0, 300)}\n   after  ${fa.slice(0, 300)}`);
    const after = app.snap(id);
    if (after.status === 'ahead') issues.push(`${id} ${ds} ahead right after plan check`);
    prev[id] = after.rows.filter(x => x[0] > ds && !x[9]).map(x => x.slice(0, 9).join(' ') + ' ' + (x[11] || '')).join('|');
    if (after.prog >= app.task(id).total) done[id] = ds;
  });
}
ids.forEach(id => { const t = app.task(id); const pe = app.ev(`planEndStr(tasks.find(x => x.id === '${id}'))`); if (!done[id]) issues.push(`${id} not finished`); else if (done[id] > pe) issues.push(`${id} finished ${done[id]} after plan end ${pe}`); });
console.log('seed', seedArg, sv, 'extras', JSON.stringify(T.map(t => [t.id, t.extras.map(x => x.at + ':' + x.w)])));
console.log('done', JSON.stringify(done));
console.log(issues.length ? issues.slice(0, 12).join('\n') : 'no issues', issues.length > 12 ? `(+${issues.length - 12})` : '');
if (app.errors.length) console.log('errors', app.errors.slice(0, 3));
app.close();
