const C = require('./common');
// goals created with chapter(s) already skipped (same as skipping on day 1 — coordinator tested that)
const withSkip = (t, rels) => { t.skipped = rels; t.extras = rels.map(k => ({ id: 'sk' + k, t: (k + 1) + '장', w: t.lectureDurations[k], at: 100000, sk: k })); return t; };
const kinds = {
  P: (id) => withSkip(C.S.pageTask(id), [3]), W: (id) => withSkip(C.S.weightTask(id), [2, 5]), L: (id) => withSkip(C.S.lectureTask(id, { type: 'lecture' }), [4, 9]),
  PC: (id) => withSkip(C.S.pageTask(id, { timeMode: 'capacity', dailyMinutes: 9 }), [3]), LC: (id) => withSkip(C.S.lectureTask(id, { timeMode: 'capacity', dailyMinutes: 90 }), [4, 9]),
};
const sv = process.argv[2] || 'plain';
const setX = sv === 'w' ? { 'focus-calculate-settings-v1': { avail: null, weights: [2,1,1,0.5,1,1.5,1], offDates: ['2026-11-19','2026-12-03'], wHist: [], offLog: {}, ppRuleFrom: '2026-10-01' } } : {};
const T = [];
Object.entries(kinds).forEach(([k, f]) => ['pp', 'un', 'y1', 'y2', 'wk'].forEach(v => T.push(f(k + '_' + v))));
const app = C.mk(T, '2026-11-09', setX);
const fut = (id, from) => app.snap(id).rows.filter(r => r[0] >= from && !r[9]).map(r => r.slice(0, 9).join(' ') + ' ' + (r[11] || '')).join('|');
const issues = [];
const D_PP = 5, D_Y = 7; // day index of the postpone / the unchecked day
const ppDay = C.days('2026-11-09', 20)[D_PP];
for (const [i, ds] of C.days('2026-11-09', 40).entries()) {
  app.setDay(ds);
  Object.keys(kinds).forEach(k => {
    const id = (v) => k + '_' + v;
    // postpone (deadline) vs unchecked
    if (i === D_PP) {
      app.view('active');
      const b = app.doc.querySelector(`[data-action="postpone-today"][data-id="${id('pp')}"]`);
      if (b) { b.click(); app.doc.getElementById('pp-deadline').click(); }
      if (!k.endsWith('C')) { const b2 = app.doc.querySelector(`[data-action="postpone-today"][data-id="${id('wk')}"]`); if (b2) { b2.click(); const w = app.doc.getElementById('pp-week'); if (w && w.style.display !== 'none' && !w.disabled) w.click(); else app.doc.getElementById('pp-cancel').click(); } }
      else app.check(id('wk'));
    } else { app.check(id('pp')); app.check(id('un')); app.check(id('wk')); }
    if (i > D_PP && app.task(id('pp')).progress < app.task(id('pp')).total) {
      if (fut(id('pp'), ds) !== fut(id('un'), ds)) issues.push(`${k} ${ds} postponed != unchecked rows\n   pp ${fut(id('pp'), ds).slice(0, 250)}\n   un ${fut(id('un'), ds).slice(0, 250)}`);
      const a = app.snap(id('pp')), b = app.snap(id('un'));
      if (a.status !== b.status || Math.abs((a.behind || 0) - (b.behind || 0)) > 1e-9) issues.push(`${k} ${ds} status pp ${a.status}/${a.behind} vs un ${b.status}/${b.behind}`);
    }
    // yesterday check vs on time
    app.check(id('y1'));
    if (i === D_Y + 1) {
      app.view('today');
      const b = app.doc.querySelector(`[data-action="yday-done"][data-id="${id('y2')}"]`);
      if (!b) issues.push(`${k} ${ds} no yesterday button`); else { b.click(); if (app.modalOpen()) app.doc.getElementById('cm-save').click(); }
      app.check(id('y2'));
    } else if (i !== D_Y) app.check(id('y2'));
    if (i > D_Y && app.task(id('y1')).progress < app.task(id('y1')).total) {
      if (fut(id('y1'), ds) !== fut(id('y2'), ds)) issues.push(`${k} ${ds} yesterday != on time rows\n   y1 ${fut(id('y1'), ds).slice(0, 250)}\n   y2 ${fut(id('y2'), ds).slice(0, 250)}`);
      const a = app.snap(id('y1')), b = app.snap(id('y2'));
      if (a.status !== b.status) issues.push(`${k} ${ds} status y1 ${a.status} vs y2 ${b.status}`);
      if (app.task(id('y1')).progress !== app.task(id('y2')).progress) issues.push(`${k} ${ds} progress y1 ${app.task(id('y1')).progress} vs y2 ${app.task(id('y2')).progress}`);
    }
    // week hold: status never behind; goal reached by Sunday
    const wsn = app.snap(id('wk'));
    if (wsn.status === 'behind' && i !== D_PP) issues.push(`${k} ${ds} week-hold goal status behind`);
  });
  if (i === D_PP + 1) Object.keys(kinds).forEach(k => { const t = app.task(k + '_wk'); if (t.weekHold) issues.push(`info ${k} weekHold ${JSON.stringify(t.weekHold)}`); });
  const dow = new Date(ds + 'T12:00').getDay();
  if (dow === 0 && i > D_PP && i < D_PP + 8) Object.keys(kinds).forEach(k => {
    const id = k + '_wk', ws = app.ev(`fmtDate(startOfWeek(today()))`);
    const g = JSON.parse(app.ev(`JSON.stringify(weekGoalsMap.get('${id}|${ws}') || null)`));
    const t = app.task(id);
    if (g && (t.startNum || 0) + t.progress < g.to) issues.push(`${k} ${ds} week goal to ${g.to} not reached (progress ${t.progress})`);
  });
}
console.log(sv, issues.length ? issues.slice(0, 16).join('\n') : 'no issues', issues.length > 16 ? `(+${issues.length - 16})` : '');
if (app.errors.length) console.log('errors', app.errors.slice(0, 3));
app.close();
