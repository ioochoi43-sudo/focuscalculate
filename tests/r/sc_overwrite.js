const C = require('./common');
const app = C.mk([C.S.pageTask('X')]);
const curFrac = (rel) => +app.ev(`getPartState(tasks[0], (tasks[0].startNum||0) + ${rel} + 1, fmtDate(addDays(today(), 1))).frac`);
let D;
for (const ds of C.days('2026-11-09', 30)) { app.setDay(ds); const r = C.row0(app, 'X'); if (r && r.part && r.n >= 2 && r.from === 2) { D = ds; break; } app.check('X'); }
app.check('X');
console.log(D, '2장 done share after today\'s check:', curFrac(1), 'record', JSON.stringify(C.st(app, 'X').rec));
C.skipCh(app, 'X', 1);
console.log('skipped 2장: sk extra', JSON.stringify(app.task('X').extras.map(x => ({ t: x.t, rf: x.rf }))), '| today row', JSON.stringify(C.row0(app, 'X')));
console.log('check today\'s new row (3장) as planned:', app.check('X'));
console.log('  today record now', JSON.stringify(C.st(app, 'X').rec), '| 2장 done share now', curFrac(1), '(rf still', app.task('X').extras[0].rf + ')');
app.view('active'); const b = app.doc.querySelector('[data-action="skip-back"][data-id="X"]');
console.log('다시 넣기 shown?', !!b, '| 되살리기/end path: chapterLeftFrac(2장) =', app.ev(`chapterLeftFrac(tasks[0], 1)`));
app.close();
