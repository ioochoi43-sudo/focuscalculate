// Day-by-day scenario; prints JSON of snapshots for every task each day.
const { makeApp } = require('./h');
const { tasksAll } = require('./seed');
const html = process.argv[2];
const out = {};
const app = makeApp(html, '2026-11-09', { 'focus-calculate-tasks-v1': tasksAll(), 'focus-calculate-settings-v1': { avail: null, weights: [1,1,1,1,1,1,1], offDates: [], wHist: [], offLog: {}, ppRuleFrom: '2026-10-01' } });
const ids = tasksAll().map(t => t.id);
const days = [];
for (let d = new Date('2026-11-09T12:00:00'); d <= new Date('2027-01-20T12:00:00'); d.setDate(d.getDate() + 1)) days.push(d.toISOString().slice(0, 10));
days.forEach((ds, i) => {
  app.setDay(ds);
  ids.forEach((id, k) => {
    const s0 = app.snap(id);
    let act = 'plan';
    if ((i + k) % 11 === 5) act = 'skip';
    else if ((i + k) % 13 === 7) act = { delta: -1 };
    else if ((i + k) % 17 === 3) act = { delta: 1 };
    let r = 'skip';
    if (act !== 'skip') r = app.check(id, act);
    out[ds + ' ' + id] = { before: s0, r, after: app.snap(id), card: app.cardText(id) };
  });
  if (i % 3 === 0) { app.view('week'); out[ds + ' week'] = app.doc.getElementById('weekGoals').textContent.replace(/\s+/g, ' '); app.view('today'); out[ds + ' today'] = app.doc.querySelector('main') ? app.doc.querySelector('main').textContent.replace(/\s+/g, ' ').slice(0, 4000) : ''; }
});
if (app.errors.length) out.errors = app.errors;
console.log(JSON.stringify(out));
app.close();
