const C = require('./common');
const app = C.mk([C.S.pageTask('X'), C.S.pageTask('Y')]);
for (const id of ['X', 'Y']) app.check(id); app.setDay('2026-11-10'); for (const id of ['X', 'Y']) app.check(id); app.setDay('2026-11-11');
console.log('skip 2장 in X and Y (progress 1):', JSON.stringify(C.skipCh(app, 'X', 1)), JSON.stringify(C.skipCh(app, 'Y', 1)));
app.setDay('2026-11-12');
const S = (id) => { app.view('active'); return { prog: app.task(id).progress, status: app.snap(id).status, 다시넣기: !!app.doc.querySelector(`[data-action="skip-back"][data-id="${id}"]`), card: app.cardText(id).match(/(계획대로|밀림|앞서가는 중)[^\d]*\d+ \/ \d+p/) + '' }; };
console.log('X before:', JSON.stringify(S('X')), 'row', JSON.stringify(C.row0(app, 'X')));
app.check('X');
console.log('X record', JSON.stringify(C.st(app, 'X').rec), 'prog', app.task('X').progress, 'anchor', app.ev(`getTodayAnchor(tasks[0])`));
app.view('active'); app.doc.querySelector('[data-action="toggle-today-complete"][data-id="X"]').click();
console.log('X after uncheck:', JSON.stringify(S('X')), '| Y never checked:', JSON.stringify(S('Y')), '| rows equal:', C.futRows(app, 'X') === C.futRows(app, 'Y'));
// yesterday-check undo path: Y checks 11/12 tomorrow via the yesterday box, then 취소
app.setDay('2026-11-13');
app.view('today'); const yb = app.doc.querySelector('[data-action="yday-done"][data-id="Y"]'); yb.click(); app.doc.getElementById('cm-save').click();
console.log('Y yesterday record', JSON.stringify(C.recs(app, 'Y').slice(-1)), 'prog', app.task('Y').progress);
app.view('today'); const ub = app.doc.querySelector('[data-action="yday-undo"][data-id="Y"]'); ub.click();
console.log('Y after 취소:', JSON.stringify(S('Y')));
app.close();
