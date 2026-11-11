// Year-end + old postpone rule + weekday ratios + off days, with postpones and yesterday checks. No extras/skips.
const { makeApp } = require('./h');
const { tasksAll } = require('./seed');
const html = process.argv[2], rule = process.argv[3] || 'old';
const shift = (t) => Object.assign({}, t, { start: '2026-12-01', end: t.end < '2026-12-15' ? '2027-01-10' : '2027-01-31' });
const T = tasksAll().map(shift);
const settings = { avail: null, weights: [2, 1, 1, 0.5, 1, 1.5, 1], offDates: ['2026-12-25', '2027-01-01'], wHist: [], offLog: {} };
// 'new': every postpone counts as 밀림. 'old': postponed days up to 2027-01-05 follow the old rule (not 밀림), later ones the new rule.
// (ppRuleFrom must be set explicitly: when it's missing the app sets it to the first day it is opened.)
settings.ppRuleFrom = rule === 'new' ? '2026-11-01' : '2027-01-05';
const app = makeApp(html, '2026-12-01', { 'focus-calculate-tasks-v1': T, 'focus-calculate-settings-v1': settings });
const ids = T.map(t => t.id), out = {};
const days = []; for (let d = new Date('2026-12-01T12:00:00'); d <= new Date('2027-02-05T12:00:00'); d.setDate(d.getDate() + 1)) days.push(d.toISOString().slice(0, 10));
days.forEach((ds, i) => {
  app.setDay(ds);
  ids.forEach((id, k) => {
    let r = 'skip';
    const m = (i + 2 * k) % 9;
    if (m === 4) { // postpone (deadline)
      app.view('active'); const b = app.doc.querySelector(`[data-action="postpone-today"][data-id="${id}"]`);
      if (b) { b.click(); const dl = app.doc.getElementById('pp-deadline'); if (dl) dl.click(); r = 'pp'; }
    } else if (m === 6) { // leave unchecked, then check it late tomorrow (handled below)
      r = 'late-pending';
    } else if (m === 7 && i > 0) { // yesterday box first, then today
      app.view('today'); const b = app.doc.querySelector(`[data-action="yday-done"][data-id="${id}"]`);
      if (b) { b.click(); if (app.modalOpen()) app.doc.getElementById('cm-save').click(); r = 'late'; }
      app.check(id); r += '+ok';
    } else if (m === 2) r = app.check(id, { delta: -1 });
    else r = app.check(id);
    out[ds + ' ' + id] = { r, s: app.snap(id) };
  });
  if (i % 4 === 0) { app.view('week'); out[ds + ' week'] = app.doc.getElementById('weekGoals').textContent.replace(/\s+/g, ' '); }
});
if (app.errors.length) out.errors = app.errors;
console.log(JSON.stringify(out));
app.close();
