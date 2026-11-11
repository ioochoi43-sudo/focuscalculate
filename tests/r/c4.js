const C = require('./common');
const ex = [{ id: 'x0', t: 'R0', w: 22, at: 10, u: 'pg' }, { id: 'x1', t: 'R1', w: 8, at: 3, u: 'pg' }];
const app = C.mk([C.S.pageTask('P', { extras: ex }), C.S.pageTask('Q', { extras: [ex[0]] }), C.S.pageTask('Z')]);
const fmt = (rows, from) => rows.filter(r => r[0] >= from && !r[9]).map(r => [r[0].slice(5), r[1], r[3] ? r[4] + '/' + r[5] : '', r[7], r[8], r[11] || ''].join(' ')).join(' | ');
for (const id of ['P', 'Q', 'Z']) {
  for (const ds of C.days('2026-11-09', 3)) {
    app.setDay(ds);
    const b = fmt(app.snap(id).rows, C.days(ds, 2)[1]);
    app.check(id);
    const a = fmt(app.snap(id).rows, C.days(ds, 2)[1]);
    if (a !== b) console.log(id, ds, 'future changed by on-plan check\n before', b.slice(-260), '\n after ', a.slice(-260));
  }
}
app.close();
