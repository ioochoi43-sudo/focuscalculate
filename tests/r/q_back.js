const C = require('./common');
const app = C.mk([C.S.pageTask('P')]);
// day 1-2 follow; skip next chapter; follow until the chapter after it is under way; then 다시 넣기
for (const ds of C.days('2026-11-09', 2)) { app.setDay(ds); app.check('P'); }
app.setDay('2026-11-11');
const L = JSON.parse(app.ev(`JSON.stringify(skippableRels(tasks[0]))`));
console.log('prog', app.task('P').progress, 'skip', L[0], JSON.stringify(C.skipCh(app, 'P', L[0])));
let ds0;
for (const ds of C.days('2026-11-11', 12)) {
  app.setDay(ds);
  const s = C.st(app, 'P');
  if (app.task('P').progress <= L[0] && s.frac > 0) { ds0 = ds; break; }
  app.check('P');
}
const s0 = C.st(app, 'P');
console.log(ds0, 'state before 다시 넣기', JSON.stringify({ prog: s0.prog, reached: s0.reached, frac: s0.frac, status: s0.status }), 'row', JSON.stringify(C.row0(app, 'P')));
app.view('active');
const b = app.doc.querySelector('[data-action="skip-back"][data-id="P"]');
console.log('다시 넣기 button?', !!b);
if (b) b.click();
const s1 = C.st(app, 'P');
console.log('after', JSON.stringify({ prog: s1.prog, reached: s1.reached, frac: s1.frac, status: s1.status, skipped: app.task('P').skipped, extras: app.task('P').extras }));
console.log('rows', C.futRows(app, 'P').split('|').slice(0, 6).join(' | '));
console.log('selfCheck', app.ev(`JSON.stringify(selfCheckTask(tasks[0]))`), 'errors', app.errors);
app.close();
