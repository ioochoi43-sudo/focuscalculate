const C = require('./common');
// last chapter read by Sunday, review left for next week
const ex = [{ id: 'e', t: 'END', w: 12, at: 10, u: 'pg' }];
const app = C.mk([C.S.pageTask('W', { extras: ex, end: '2026-12-16' })]);
let ds0 = null;
for (const ds of C.days('2026-11-09', 40)) {
  app.setDay(ds);
  const t = app.task('W');
  const dow = new Date(ds + 'T12:00').getDay();
  if (t.progress === 9 && dow === 0) { app.check('W', { page: 160, rev: false }); ds0 = ds; break; }
  app.check('W', t.progress === 9 ? { rev: false } : 'plan');
}
console.log('sunday', ds0, JSON.stringify(C.st(app, 'W')));
const mon = C.days(ds0, 2)[1];
app.setDay(mon);
console.log('monday rows', JSON.stringify(app.snap('W').rows.filter(r => r[0] >= mon)));
app.view('week');
console.log('week goal', app.doc.getElementById('weekGoals').textContent.replace(/\s+/g, ' ').slice(0, 250));
app.close();
