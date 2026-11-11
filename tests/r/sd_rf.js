const C = require('./common');
const app = C.mk([C.S.pageTask('X')]);
app.win.confirm = () => true;
for (const ds of C.days('2026-11-09', 3)) { app.setDay(ds); app.check('X'); }   // 11-11: 2장 1/5 done → 11-12 2/5
app.setDay('2026-11-12'); app.check('X');                                      // 2장 2/5 (f .4)
app.setDay('2026-11-13');
C.skipCh(app, 'X', 1);
const sk = () => JSON.stringify((app.task('X').extras || []).map(x => ({ t: x.t, rf: x.rf, w: +app.ev(`extraW(tasks[0], tasks[0].extras.find(e => e.id === '${x.id}'))`).toFixed(2) })));
console.log('skip started 2장 →', sk(), '| status', app.snap('X').status);
app.check('X'); // 3장 today
app.setDay('2026-11-14'); app.check('X'); // 4장 part → next chapter started
app.view('active');
const del = [...app.doc.querySelectorAll('[data-action="del-extra"][data-id="X"]')].find(b => /안 하기/.test(b.textContent)); del.click();
console.log('안 하기 →', sk(), '| skipped', JSON.stringify(app.task('X').skipped));
app.view('active');
const back = app.doc.querySelector('[data-action="skip-back"][data-id="X"]'); console.log('되살리기 button', back && back.textContent); back.click();
console.log('되살리기 →', sk(), '(rf recomputed from 2장 records: chapterLeftFrac =', app.ev('chapterLeftFrac(tasks[0], 1)') + ')', '| status', app.snap('X').status);
// week goal refresh after skipping a started chapter mid-week
app.view('week'); const rb = app.doc.querySelector('[data-action="refresh-week-goal"]'); if (rb) rb.click(); app.view('week');
console.log('week goal after ↻:', app.doc.getElementById('weekGoals').textContent.replace(/\s+/g, ' ').slice(60, 260));
console.log('errors', app.errors.slice(0, 2));
app.close();
