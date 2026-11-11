const C = require('./common');
const ex = [{ id: 'x0', t: 'R0', w: 22, at: 10, u: 'pg' }, { id: 'x1', t: 'R1', w: 8, at: 3, u: 'pg' }];
const app = C.mk([C.S.pageTask('P', { extras: ex })]);
const sn = app.snap('P');
console.log('initial last rows', JSON.stringify(sn.rows.slice(-6).map(r => [r[0], r[1], r[3], r[4], r[5], r[7], r[8], r[11]])));
for (const ds of C.days('2026-11-09', 40)) {
  app.setDay(ds);
  const r = C.row0(app, 'P');
  if (r && r.from === 10) console.log(ds, 'row', JSON.stringify(r));
  app.check('P');
  const s = C.st(app, 'P');
  if (s.prog >= 10) { console.log('finished', ds); break; }
}
app.close();
