const C = require('./common');
const app = C.mk([C.S.pageTask('H'), C.S.pageTask('T')]);
let hd = null;
for (const ds of C.days('2026-11-09', 34)) { app.setDay(ds); const t = app.task('H'); const s = C.st(app, 'H'); if (t.progress === 9 && s.reached > 141) { hd = ds; break; } app.check('H'); app.check('T'); }
// today hd: last chapter under way. Don't check H today (T checks on time).
const yrowH = C.row0(app, 'H');
console.log('day', hd, 'row', JSON.stringify(yrowH));
app.check('T');
app.setDay(C.days(hd, 2)[1]);
const yiBefore = app.ev(`(() => { const r = yesterdayItem(tasks.find(x => x.id === 'H')); return JSON.stringify(r ? [r.from, r.partN, r.partOf, r.partF, r.pFrom, r.pTo] : null); })()`);
const res = C.addExtra(app, 'H', 'final', C.pgFill(10), 10);
const yiAfter = app.ev(`(() => { const r = yesterdayItem(tasks.find(x => x.id === 'H')); return JSON.stringify(r ? [r.from, r.partN, r.partOf, r.partF, r.pFrom, r.pTo] : null); })()`);
console.log('yesterday item before add', yiBefore, 'after add', yiAfter);
app.view('today');
const b = app.doc.querySelector('[data-action="yday-done"][data-id="H"]');
b.click(); console.log('modal input', app.doc.getElementById('cm-input').value); app.doc.getElementById('cm-save').click();
console.log('H', JSON.stringify(C.st(app, 'H')), 'recs', JSON.stringify(C.recs(app, 'H').slice(-2)));
app.close();
