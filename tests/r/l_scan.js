const C = require('./common');
// find configs where a last-chapter part row ends at p.160 but holds no end review
const ends = ['2026-12-10','2026-12-12','2026-12-14','2026-12-16','2026-12-18','2026-12-20','2026-12-22','2026-12-24','2026-12-27','2026-12-31'];
const ews = [20, 10, 30, 40, 5];
const T = [];
ends.forEach((e, i) => ews.forEach((w, j) => T.push(C.S.pageTask('S' + i + '_' + j, { end: e, extras: [{ id: 'e', t: 'E', w, at: 100000, u: 'pg' }] }))));
const app = C.mk(T);
T.forEach(t => {
  const rows = app.snap(t.id).rows.filter(r => r[1] === 10 && !r[9]);
  const hit = rows.find(r => r[3] === 1 && r[8] === 160 && !r[11]);
  if (hit) console.log(t.id, t.end, 'w', t.extras[0].w, 'hit', JSON.stringify(hit));
});
app.close();
