const C = require('./common');
const withSkip = (t, rels) => { t.skipped = rels; t.extras = rels.map(k => ({ id: 'sk' + k, t: (k + 1) + '장', w: t.lectureDurations[k], at: 100000, sk: k })); return t; };
const T = [];
['2026-12-13', '2026-12-20', '2026-12-27'].forEach((end, e) => [0, 1, 2, 3, 4, 5, 6, 7, 8].forEach(k => {
  T.push(withSkip(C.S.pageTask(`D${e}_${k}`, { end }), [k]));
  T.push(withSkip(C.S.pageTask(`C${e}_${k}`, { end, timeMode: 'capacity', dailyMinutes: 7 + e }), [k]));
}));
const app = C.mk(T);
let hits = 0;
T.forEach(t => {
  const r = JSON.parse(app.ev(`(() => { const t = tasks.find(x => x.id === '${t.id}'); const p = buildSchedule(t); const fut = p.schedule.filter(s => !s.isPast && !s.isReview && s.pFrom != null);
    for (let i = 1; i < fut.length; i++) if (fut[i].pFrom <= fut[i - 1].pTo) return JSON.stringify([fmtDate(fut[i-1].date), fut[i-1].pFrom + '-' + fut[i-1].pTo, fmtDate(fut[i].date), fut[i].pFrom + '-' + fut[i].pTo, (fut[i].revs||[]).map(x => x.t).join('+')]); return 'null'; })()`));
  if (r) { hits++; if (hits <= 6) console.log(t.id, JSON.stringify(r)); }
});
console.log('page overlaps in initial plans:', hits, 'of', T.length);
app.close();
