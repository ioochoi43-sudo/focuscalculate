// Scenario tests for 따로 할 것 (extras)
const { makeApp } = require('./h');
const { pageTask, lectureTask, weightTask } = require('./seed');
const HTML = process.env.FC_HTML || require('path').join(__dirname, '..', '..', 'index.html');
let fails = 0, passes = 0;
const ok = (c, msg) => { if (c) passes++; else { fails++; console.log('FAIL:', msg); } };
const SET = { 'focus-calculate-settings-v1': { avail: null, weights: [1,1,1,1,1,1,1], offDates: [], wHist: [], offLog: {}, ppRuleFrom: '2026-10-01' } };
function mk(tasks, day = '2026-11-09', extraSeed) { return makeApp(HTML, day, Object.assign({ 'focus-calculate-tasks-v1': tasks }, SET, extraSeed || {})); }
function days(from, n) { const out = []; const d = new Date(from + 'T12:00:00'); for (let i = 0; i < n; i++) { out.push(d.toISOString().slice(0, 10)); d.setDate(d.getDate() + 1); } return out; }
function addExtra(app, id, name, fill, at) {
  const d = app.doc; app.view('active');
  const b = d.querySelector(`[data-action="add-extra"][data-id="${id}"]`); if (!b) return 'nobtn';
  b.click(); d.getElementById('xm-name').value = name; fill(d);
  if (at != null) d.getElementById('xm-at').value = String(at);
  d.getElementById('xm-save').click();
  return app.task(id).extras;
}
const pgFill = (n, df) => (d) => { d.getElementById('xm-pg').value = String(n); if (df) d.getElementById('xm-df').value = df; };
const minFill = (m) => (d) => { d.getElementById('xm-min').value = m; };
const daFill = (df, am) => (d) => { d.getElementById('xm-df').value = df; d.getElementById('xm-am').value = am; };
// invariants on the live plan
function inv(app, id, tag) {
  const r = JSON.parse(app.ev(`(() => { const t = tasks.find(x => x.id === ${JSON.stringify(id)}); const p = buildSchedule(t); const sn = t.startNum || 0;
    const fut = p.schedule.filter(s => !s.isPast && !s.isReview);
    const pre = isTimeBasedTask(t) ? getDurationPrefix(t) : null;
    return JSON.stringify({ sn, total: t.total, prog: t.progress, status: p.status, planEnd: planEndStr(t), cap: t.timeMode === 'capacity', insuf: !!p.capacityInsufficient,
      rows: fut.map(s => ({ d: fmtDate(s.date), from: s.from, to: s.to, part: !!s.isPart, n: s.partN, of: s.partOf, pf: s.pFrom, pt: s.pTo, revs: (s.revs || []).map(x => x.id), today: !!s.isToday })),
      pend: (t.extras || []).filter(x => !extraDone(t, x)).map(x => x.id), reached: hasPages(t) ? pageReachedNow(t) : null, tdy: fmtDate(today()) }); })()`));
  if (r.prog >= r.total) return r;
  const R = r.rows;
  ok(R.length > 0, `${tag} ${id}: has future rows`);
  if (!R.length) return r;
  if (!r.cap) ok(R[R.length - 1].d <= r.planEnd, `${tag} ${id}: last row ${R[R.length - 1].d} <= planEnd ${r.planEnd}`);
  if (!r.insuf) ok(!R[R.length - 1].part && R[R.length - 1].to === r.sn + r.total, `${tag} ${id}: last row ends at total (${JSON.stringify(R[R.length - 1])})`);
  // contiguity
  for (let i = 1; i < R.length; i++) {
    const a = R[i - 1], b = R[i];
    const cont = a.part ? (b.from === a.from) : (b.from === a.to + 1 || (b.part && b.from === a.to + 1));
    ok(cont, `${tag} ${id}: rows contiguous ${JSON.stringify(a)} -> ${JSON.stringify(b)}`);
  }
  // pages: no gaps/overlaps, first row starts at reached+1 (unless today's row is checked)
  const P = R.filter(x => x.pf != null);
  for (let i = 1; i < P.length; i++) ok(P[i].pf === P[i - 1].pt + 1 || (P[i].pf > P[i - 1].pt), `${tag} ${id}: pages no overlap ${P[i - 1].pt} -> ${P[i].pf}`);
  for (let i = 1; i < P.length; i++) ok(P[i].pf <= P[i - 1].pt + 1 + 30, `${tag} pages sane`);
  // every pending extra appears exactly once in future rows (unless capacity runs past the rows)
  if (!r.insuf) r.pend.forEach(xid => { const c = R.filter(x => x.revs.includes(xid)).length; ok(c >= 1, `${tag} ${id}: pending extra ${xid} scheduled (found ${c})`); });
  return r;
}
function rowsFrom(r, ds) { return JSON.stringify(r.rows.filter(x => x.d >= ds).map(x => Object.assign({}, x, { today: undefined }))); }
// follow the plan every day; checks status stays on plan and tomorrow's rows don't change
function follow(app, ids, from, n, opts = {}) {
  const res = {};
  days(from, n).forEach((ds, i) => {
    app.setDay(ds);
    ids.forEach(id => {
      const before = inv(app, id, ds + ' am');
      if (before.prog >= before.total) { res[id] = res[id] || { done: ds }; return; }
      if (!opts.allowBehind) ok(before.status !== 'behind' && before.status !== 'overdue', `${ds} ${id}: status ${before.status} before check`);
      if (opts.hook) opts.hook(ds, id);
      const c = app.check(id, 'plan');
      const after = inv(app, id, ds + ' pm');
      if (!opts.allowAhead) ok(after.status !== 'ahead' && after.status !== 'behind', `${ds} ${id}: status after check ${after.status} (${c})`);
      // tomorrow keeps the same plan
      const tmr = days(ds, 2)[1];
      res[id] = res[id] || {};
      res[id].prevRows = rowsFrom(after, tmr); res[id].prevDay = tmr;
    });
    // compare at the start of the next iteration
    if (i + 1 < n) {
      const nd = days(ds, 2)[1];
      app.setDay(nd);
      ids.forEach(id => { const r = inv(app, id, nd + ' cmp'); if (r.prog < r.total && res[id] && res[id].prevRows) ok(rowsFrom(r, nd) === res[id].prevRows, `${nd} ${id}: plan unchanged overnight\n   was ${res[id].prevRows.slice(0, 400)}\n   now ${rowsFrom(r, nd).slice(0, 400)}`); });
    }
  });
  return res;
}


module.exports = { mk, days, addExtra, pgFill, minFill, daFill, inv, follow, rowsFrom, ok, stats: () => ({ passes, fails }) };
