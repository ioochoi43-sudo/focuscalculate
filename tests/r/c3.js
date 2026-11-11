const C = require('./common');
const ex = [{ id: 'x0', t: 'R0', w: 22, at: 10, u: 'pg' }, { id: 'x1', t: 'R1', w: 8, at: 3, u: 'pg' }];
const app = C.mk([C.S.pageTask('P', { extras: ex })]);
let prev = null;
const fmt = (rows, from) => rows.filter(r => r[0] >= from && !r[9]).map(r => [r[0], r[1], r[2], r[3] ? 'p' + r[4] + '/' + r[5] : '', r[7], r[8], r[11] || ''].join(' ')).join(' | ');
for (const ds of C.days('2026-11-09', 31)) {
  app.setDay(ds);
  const now = fmt(app.snap('P').rows, ds);
  if (prev != null && prev !== now) console.log('CHANGED on', ds, '\n was', prev, '\n now', now, '\n status', app.snap('P').status);
  const rr = C.row0(app, 'P');
  if (rr && rr.revs.includes('x0')) { console.log('stop at first review day', ds); break; }
  app.check('P');
  prev = fmt(app.snap('P').rows, C.days(ds, 2)[1]);
}
app.close();
