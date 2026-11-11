const C = require('./common');
const ex = [{ id: 'x0', t: 'R0', w: 22, at: 10, u: 'pg' }, { id: 'x1', t: 'R1', w: 8, at: 3, u: 'pg' }];
const app = C.mk([C.S.pageTask('P', { extras: ex })]);
const ch10 = () => app.snap('P').rows.filter(r => r[1] === 10 && !r[9]).map(r => r[0].slice(5) + ':' + (r[3] ? r[4] + '/' + r[5] : 'W' + r[4] + '/' + r[5])).join(' ');
let last = '';
for (const ds of C.days('2026-11-09', 31)) {
  app.setDay(ds);
  const b = ch10();
  app.check('P');
  const a = ch10();
  if (b !== last) console.log(ds, 'before check', b);
  if (a !== b) console.log(ds, 'after  check', a);
  last = a;
  if (C.st(app, 'P').prog >= 10) break;
}
app.close();
