const C = require('./common');
const P = [[1, 12], [13, 30], [31, 32], [33, 60], [61, 70], [71, 95]];
const pw = (q) => Math.round((q[1] - q[0] + 1) * 100) / 100;
const mkT = (id, ex) => ({ id, title: id, type: 'book', total: 6, startNum: 0, progress: 0, start: '2026-11-09', end: '2026-11-30', pace: 'daily', paceValue: null, reviewDays: [], skipDates: [],
  timeBased: true, timeMode: 'deadline', lectureDurations: P.map(pw), itemDifficulty: P.map(() => 'medium'), itemAmount: P.map(() => 'medium'), itemPages: P, extras: ex });
const app = C.mk([mkT('S', [{ id: 'r', t: 'BIG', w: 20, at: 2, u: 'pg' }])]);
const ch = () => app.snap('S').rows.filter(r => r[1] === 3 && !r[9]).map(r => r[0].slice(5) + ':' + (r[3] ? r[4] + '/' + r[5] : 'W' + (r[4] || '') + '/' + (r[5] || '')) + (r[7] != null ? `(p${r[7]}-${r[8]})` : '') + (r[11] ? '+R' : '')).join(' ');
let last = '';
for (const ds of C.days('2026-11-09', 22)) {
  app.setDay(ds);
  const b = ch(), st = app.snap('S').status;
  if (b !== last) console.log(ds, 'before', b, st);
  app.check('S');
  const a = ch();
  if (a !== b) console.log(ds, 'after ', a);
  last = a;
  if (C.st(app, 'S').prog >= 6) { console.log('done', ds); break; }
}
app.close();
