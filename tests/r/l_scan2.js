const C = require('./common');
const ends = ['2026-12-11','2026-12-13','2026-12-15','2026-12-17','2026-12-19','2026-12-23','2026-12-29'];
const ews = [7, 13, 3.5, 23, 11];
const T = [];
ends.forEach((e, i) => ews.forEach((w, j) => ['hard', 'easy'].forEach((df, k) => {
  const t = C.S.pageTask('S' + i + '_' + j + '_' + k, { end: e, extras: [{ id: 'e', t: 'E', w, at: 100000, u: 'pg' }] });
  t.itemDifficulty[9] = df; t.lectureDurations[9] = Math.round(20 * (df === 'hard' ? 4 / 3 : 2 / 3) * 100) / 100; T.push(t);
})));
const app = C.mk(T);
T.forEach(t => {
  const info = JSON.parse(app.ev(`(() => { const t = tasks.find(x => x.id === '${t.id}'); const p = buildSchedule(t); const q = glueOf(t, 9); const eOf = 1 - q.e / q.W;
    const r = p.schedule.find(s => !s.isPast && s.isPart && s.from === 10 && s.pTo === 160 && !(s.revs && s.revs.length)); if (!r) return 'null';
    return JSON.stringify({ date: fmtDate(r.date), n: r.partN, of: r.partOf, f1: r.partF !== undefined ? r.partF : r.partN / r.partOf, eOf }); })()`));
  if (info && info.f1 < info.eOf - 1e-9) console.log(t.id, t.end, t.itemDifficulty[9], 'w', t.extras[0].w, JSON.stringify(info));
});
app.close();
