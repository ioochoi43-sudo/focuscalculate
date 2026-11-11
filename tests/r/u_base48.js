// v4.8 vs current on goals WITH reviews but WITHOUT skips (mixed actions)
const { makeApp } = require('../t/h');
const S = require('../t/seed');
const html = process.argv[2];
const ex = (u, w1, w2) => [{ id: 'a', t: 'A', w: w1, at: 3, u }, { id: 'e', t: 'E', w: w2, at: 100000, u }];
const T = [S.pageTask('p1', { extras: ex('pg', 8, 12) }), S.pageTask('p2', { extras: ex('pg', 20, 5), timeMode: 'capacity', dailyMinutes: 9 }),
  S.weightTask('w1', { extras: ex('da', 6, 9) }), S.weightTask('w2', { extras: ex('da', 4, 2), timeMode: 'capacity', dailyMinutes: 6 }),
  S.lectureTask('l1', { extras: ex('min', 50, 30) }), S.lectureTask('l2', { extras: ex('min', 25, 60), timeMode: 'capacity', dailyMinutes: 80 }),
  S.pageTask('p3', { extras: ex('pg', 10, 10), pace: 'every-other', reviewDays: [0], end: '2027-01-10' })];
const app = makeApp(html, '2026-11-09', { 'focus-calculate-tasks-v1': T, 'focus-calculate-settings-v1': { avail: null, weights: [1,1,1,1,1.5,1,2], offDates: ['2026-11-20'], wHist: [], offLog: {}, ppRuleFrom: '2026-10-01' } });
const out = {};
const days = []; for (let d = new Date('2026-11-09T12:00:00'); d <= new Date('2027-01-12T12:00:00'); d.setDate(d.getDate() + 1)) days.push(d.toISOString().slice(0, 10));
days.forEach((ds, i) => {
  app.setDay(ds);
  T.forEach((t, k) => {
    const id = t.id;
    let act = 'plan';
    if ((i + k) % 11 === 5) act = 'skip'; else if ((i + k) % 13 === 7) act = { delta: -1 }; else if ((i + k) % 17 === 3) act = { delta: 1 };
    let r = 'skip';
    if (act === 'skip' && (i + k) % 22 === 5) { app.view('active'); const b = app.doc.querySelector(`[data-action="postpone-today"][data-id="${id}"]`); if (b) { b.click(); app.doc.getElementById('pp-deadline').click(); r = 'pp'; } }
    else if (act !== 'skip') r = app.check(id, act);
    out[ds + ' ' + id] = { r, after: app.snap(id), card: app.cardText(id).replace(/↷건너뛰기/g, '').replace(/✓ 끝낸 (복습|것) /g, '✓ 끝낸 ') };
  });
  if (i % 4 === 0) { app.view('week'); out[ds + ' week'] = app.doc.getElementById('weekGoals').textContent.replace(/\s+/g, ' '); }
});
if (app.errors.length) out.errors = app.errors;
console.log(JSON.stringify(out));
app.close();
