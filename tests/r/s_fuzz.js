const C = require('./common');
const seedArg = parseInt(process.argv[2] || '1'), sv = process.argv[3] || 'plain';
let s = seedArg * 7919 + 13; const rnd = () => { s = (s * 1103515245 + 12345) % 2147483648; return s / 2147483648; };
const variants = [
  ['P', (id) => C.S.pageTask(id), 10], ['PC', (id) => C.S.pageTask(id, { timeMode: 'capacity', dailyMinutes: 9 }), 10],
  ['PE', (id) => C.S.pageTask(id, { pace: 'every-other', reviewDays: [0], end: '2027-01-10' }), 10],
  ['W', (id) => C.S.weightTask(id), 12], ['WC', (id) => C.S.weightTask(id, { timeMode: 'capacity', dailyMinutes: 6 }), 12],
  ['L', (id) => C.S.lectureTask(id), 20], ['LC', (id) => C.S.lectureTask(id, { timeMode: 'capacity', dailyMinutes: 90 }), 20],
];
const T = variants.map(([nm, f]) => { const t = f(nm + seedArg); if (rnd() < 0.4) t.extras = [{ id: 'r', t: 'R', w: t.type === 'lecture' ? 40 : 6, at: rnd() < 0.5 ? 100000 : Math.floor(rnd() * t.total), u: t.type === 'lecture' ? 'min' : 'pg' }]; return t; });
const setX = sv === 'w' ? { 'focus-calculate-settings-v1': { avail: null, weights: [2,1,1,0.5,1,1.5,1], offDates: ['2026-11-19','2026-12-03','2026-12-04'], wHist: [], offLog: {}, ppRuleFrom: '2026-10-01' } } : {};
const app = C.mk(T, '2026-11-09', setX);
const ids = T.map(t => t.id);
// skip plan: per goal, a day index and how many chapters; sometimes the chapter right after the current one
const plan = {}; ids.forEach(id => { plan[id] = { day: Math.floor(rnd() * 12), n: 1 + Math.floor(rnd() * 2), mid: rnd() < 0.5, again: rnd() < 0.4 ? 8 + Math.floor(rnd() * 10) : -1 }; });
const issues = [], done = {}, prev = {}, log = [];
const fmtRows = (id, from) => app.snap(id).rows.filter(r => r[0] >= from && !r[9]).map(r => r.slice(0, 9).join(' ') + ' ' + (r[11] || '')).join('|');
const extra = (id) => JSON.parse(app.ev(`(() => { const t = tasks.find(x => x.id === '${id}'); const p = buildSchedule(t); const z = skippedSet(t) || new Set(); const sn = t.startNum || 0;
  const fut = p.schedule.filter(x => !x.isPast && !x.isReview);
  const onlySk = fut.filter(x => !x.isPart && x.to >= x.from && [...Array(x.to - x.from + 1).keys()].every(i => z.has(x.from + i - sn - 1))).map(x => fmtDate(x.date) + ':' + x.from + '-' + x.to);
  const partSk = fut.filter(x => x.isPart && z.has(x.from - sn - 1)).map(x => fmtDate(x.date));
  let pg = []; if (hasPages(t)) { const P = t.itemPages; const R = fut.filter(x => x.pFrom != null); let last = pageReachedNow(t);
    const okGap = (a, b) => { for (let q = a; q <= b; q++) { const c = P.findIndex(r => r[0] <= q && q <= r[1]); if (c < 0 || !z.has(c)) return false; } return true; };
    R.forEach((x, i) => { if (x.isToday && completedMap.get(t.id + '|' + fmtDate(today()))) { last = x.pTo; return; } if (!(x.pFrom === last + 1 || (x.pFrom > last + 1 && okGap(last + 1, x.pFrom - 1)))) pg.push(fmtDate(x.date) + ' ' + last + '->' + x.pFrom); last = x.pTo; }); }
  const sc = []; { const fw = (c) => sn + fwdRel(t, c - sn); let c = sn + getTodayAnchor(t);
    fut.forEach(x => { const md = fmtDate(x.date); if (x.isPart) { if (x.from !== fw(c) + 1) sc.push(md + ' part gap ' + c + '->' + x.from); } else { if (!(x.from === c + 1 || x.from === fw(c) + 1)) sc.push(md + ' gap ' + c + '->' + x.from); if (x.to < x.from) sc.push(md + ' empty'); c = x.to; } });
    const last = fut[fut.length - 1]; if (last && !p.capacityInsufficient && (last.isPart || last.to !== sn + t.total)) sc.push('last row not at end ' + JSON.stringify([last.from, last.to, !!last.isPart])); }
  return JSON.stringify({ sc, onlySk, partSk, pg, skipped: t.skipped || [], prog: t.progress, total: t.total }); })()`));
for (const [di, ds] of C.days('2026-11-09', 64).entries()) {
  app.setDay(ds);
  ids.forEach(id => {
    if (done[id]) return;
    const P0 = plan[id];
    if (di === P0.day || di === P0.again) {
      for (let k = 0; k < P0.n; k++) {
        const opts = app.ev(`JSON.stringify(skippableRels(tasks.find(x => x.id === '${id}')))`);
        const L = JSON.parse(opts); if (!L.length) break;
        const rel = P0.mid ? L[0] : L[Math.floor(rnd() * L.length)];
        const r = C.skipCh(app, id, rel); log.push(`${id} ${ds} skip ${rel} -> ${JSON.stringify(r)}`);
      }
      prev[id] = null;
    }
    if (di > P0.day && rnd() < 0.12) { // 안 하기 / 다시 넣기 / 되살리기
      app.win.confirm = () => true; app.view('active');
      const card = app.doc.querySelector(`.task-card[data-id="${id}"]`);
      const btns = card ? [...card.querySelectorAll('[data-action="skip-back"], [data-action="del-extra"]')].filter(b => b.dataset.action === 'skip-back' || /안 하기/.test(b.textContent)) : [];
      if (btns.length) { const b = btns[Math.floor(rnd() * btns.length)]; const lbl = b.textContent; b.click(); log.push(`${id} ${ds} ${lbl} -> skipped ${JSON.stringify(app.task(id).skipped || [])} sk ${JSON.stringify((app.task(id).extras || []).filter(x => x.sk != null).map(x => x.sk))}`); prev[id] = null; }
    }
    const sn = app.snap(id);
    if (sn.prog >= app.task(id).total) { done[id] = ds; return; }
    if (sn.status === 'behind' || sn.status === 'ahead') issues.push(`${id} ${ds} status ${sn.status} (am)`);
    const nowRows = fmtRows(id, ds);
    if (prev[id] != null && prev[id] !== nowRows) issues.push(`${id} ${ds} overnight change\n   was ${prev[id].slice(0, 300)}\n   now ${nowRows.slice(0, 300)}`);
    const x = extra(id);
    if (x.sc.length) issues.push(`${id} ${ds} selfCheck ${JSON.stringify(x.sc)}`);
    if (x.onlySk.length) issues.push(`${id} ${ds} row of only skipped chapters ${x.onlySk}`);
    if (x.partSk.length) issues.push(`${id} ${ds} part row of skipped chapter ${x.partSk}`);
    if (x.pg.length) issues.push(`${id} ${ds} page gap/overlap ${x.pg}`);
    const tmr = C.days(ds, 2)[1];
    const fb = fmtRows(id, tmr);
    const r = app.check(id);
    const fa = fmtRows(id, tmr);
    const after = app.snap(id);
    if (after.prog < app.task(id).total) {
      if (fa !== fb) issues.push(`${id} ${ds} same-day change after on-plan check (${r})\n   before ${fb.slice(0, 300)}\n   after  ${fa.slice(0, 300)}`);
      if (after.status === 'ahead' || after.status === 'behind') issues.push(`${id} ${ds} status ${after.status} right after check (${r})`);
    }
    prev[id] = fa;
    if (after.prog >= app.task(id).total) done[id] = ds;
  });
}
ids.forEach(id => { const pe = app.ev(`planEndStr(tasks.find(x => x.id === '${id}'))`); const t = app.task(id); if (!done[id]) issues.push(`${id} not finished`); else if (t.timeMode !== 'capacity' && done[id] > pe) issues.push(`${id} finished ${done[id]} after ${pe}`); });
console.log('cfg', JSON.stringify(T.map(t => [t.id, t.extras]))); console.log('seed', seedArg, sv, 'skips:', log.join('; '));
console.log('done', JSON.stringify(done));
console.log(issues.length ? issues.slice(0, 14).join('\n') : 'no issues', issues.length > 14 ? `(+${issues.length - 14})` : '');
if (app.errors.length) console.log('errors', app.errors.slice(0, 3));
app.close();
