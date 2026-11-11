const L = require('./lib');
const { mk, days, inv, follow, ok } = L;
const { weightTask, pageTask } = require('./seed');
function skip(app, id, rel) {
  const d = app.doc; app.view('active');
  d.querySelector(`[data-action="skip-chapter"][data-id="${id}"]`).click();
  if (!d.getElementById('skipModal').classList.contains('show')) return 'blocked';
  if (rel != null) d.getElementById('sk-rel').value = String(rel);
  d.getElementById('sk-save').click(); return 'ok';
}
const st = (app, id) => JSON.parse(app.ev(`(() => { const t = tasks.find(x => x.id === '${id}'); return JSON.stringify({ prog: t.progress, open: firstOpenRel(t), canBack: (t.skipped || []).map(k => canRestoreInPlace(t, k)), skipped: t.skipped || [], ex: (t.extras || []).map(x => x.sk) }); })()`));
for (const mkT of [() => weightTask('R'), () => pageTask('R')]) {
  const app = mk([mkT()]);
  ok(skip(app, 'R', 0) === 'ok', 'R: skipped rel 0');
  // follow until the chapter after it is started (part days)
  let started = false;
  for (const ds of days('2026-11-09', 25)) {
    app.setDay(ds);
    app.check('R');
    const s = st(app, 'R');
    if (s.prog <= 0 && s.open > 1) { started = true; break; }
    if (s.prog > 1) break;
  }
  const s = st(app, 'R');
  console.log('R state', JSON.stringify(s));
  if (started) {
    ok(s.canBack[0] === false, 'R: 다시 넣기 not offered once the next chapter is started');
    app.view('active');
    ok(!app.doc.querySelector('[data-action="skip-back"][data-id="R"]'), 'R: no 다시 넣기 button');
    // 안 하기 then 되살리기 → goes to the end, not back in place
    const x = app.task('R').extras.find(e => e.sk === 0);
    app.win.confirm = () => true;
    app.doc.querySelector(`[data-action="del-extra"][data-id="R"][data-x="${x.id}"]`).click();
    app.view('active'); app.doc.querySelector('[data-action="skip-back"][data-id="R"]').click();
    const s2 = st(app, 'R');
    ok(JSON.stringify(s2.skipped) === '[0]' && s2.ex.includes(0), 'R: 되살리기 after the place was passed → to the end ' + JSON.stringify(s2));
    const r = inv(app, 'R', 'R after');
    ok(r.status !== 'behind', 'R: status after 되살리기 ' + r.status);
  } else console.log('R: state not reachable for this goal (pages move past a skipped chapter)');
  follow(app, ['R'], app.today(), 45, { allowAhead: true });
  ok(app.task('R').progress === app.task('R').total, 'R finished');
  app.close();
}
console.log('passes', L.stats().passes, 'fails', L.stats().fails);
