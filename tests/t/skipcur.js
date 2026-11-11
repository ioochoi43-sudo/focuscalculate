const L = require('./lib');
const { mk, days, inv, follow, ok } = L;
const { weightTask, pageTask } = require('./seed');
const st = (app, id) => JSON.parse(app.ev(`(() => { const t = tasks.find(x => x.id === '${id}'); const p = buildSchedule(t); return JSON.stringify({ prog: t.progress, status: p.status, reached: hasPages(t) ? pageReachedNow(t) : null, skipped: t.skipped || [], ex: (t.extras || []).map(x => [x.sk, x.rf]), left: extraGlue(t) ? extraGlue(t).e : 0, rows: p.schedule.filter(s => !s.isPast && !s.isReview).slice(0, 3).map(s => [fmtDate(s.date), s.from, s.to, s.partN, s.partOf, s.pFrom, s.pTo]) }); })()`));
const fut = (app, id) => app.snap(id).rows.filter(r => r[0] >= app.today()).map(r => r.slice(0, 9).join(' ')).join('|');
for (const [name, mkT] of [['weight', () => weightTask('C')], ['pages', () => pageTask('C')]]) {
  const app = mk([mkT(), mkT()].map((t, i) => Object.assign(t, { id: i ? 'C0' : 'C' })));
  // get into a multi-day chapter (part day 1 done)
  let hd = null;
  for (const ds of days('2026-11-09', 20)) {
    app.setDay(ds);
    const s = st(app, 'C');
    const r = s.rows[0];
    app.check('C'); app.check('C0');
    const s2 = st(app, 'C');
    const ps = JSON.parse(app.ev(`JSON.stringify(getPartState(tasks[0], tasks[0].progress + 1, fmtDate(addDays(today(), 1))))`));
    if (ps.done > 0 && s2.prog > 0) { hd = ds; break; }
  }
  ok(!!hd, name + ': reached a chapter under way');
  const nd = days(hd, 2)[1]; app.setDay(nd);
  const before = st(app, 'C'), base = fut(app, 'C');
  app.view('active'); app.win.confirm = () => true;
  app.doc.querySelector('[data-action="skip-chapter"][data-id="C"]').click();
  const opt0 = app.doc.getElementById('sk-rel').options[0].textContent;
  ok(/지금 하는 챕터/.test(opt0) && /남은 부분/.test(opt0), name + ': current chapter offered first: ' + opt0);
  const prev = app.doc.getElementById('sk-preview').textContent;
  ok(/남은/.test(prev), name + ': preview mentions the rest: ' + prev);
  app.doc.getElementById('sk-save').click();
  const after = st(app, 'C');
  console.log(name, 'before', JSON.stringify(before), '\n after', JSON.stringify(after));
  ok(after.skipped.includes(before.prog) && after.ex[0][1] > 0 && after.ex[0][1] < 1, name + ': skipped with remaining share ' + JSON.stringify(after.ex));
  ok(after.status !== 'behind' && after.status !== 'ahead', name + ': status ' + after.status);
  ok(after.rows[0][1] === before.prog + 2, name + ': next row is the next chapter ' + JSON.stringify(after.rows[0]));
  // 다시 넣기 same day → identical plan
  app.view('active'); app.doc.querySelector(`[data-action="skip-back"][data-id="C"]`).click();
  ok(fut(app, 'C') === base, name + ': 다시 넣기 → continues where it was');
  // skip again and follow to the end
  app.view('active'); app.doc.querySelector('[data-action="skip-chapter"][data-id="C"]').click(); app.doc.getElementById('sk-save').click();
  follow(app, ['C'], nd, 45);
  ok(app.task('C').progress === app.task('C').total, name + ': finished');
  console.log(name, 'errors', app.errors.slice(0, 2));
  app.close();
}
console.log('passes', L.stats().passes, 'fails', L.stats().fails);
