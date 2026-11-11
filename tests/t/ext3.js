const { makeApp } = require('./h');
const { pageTask, lectureTask } = require('./seed');
const HTML = process.env.FC_HTML || require('path').join(__dirname, '..', '..', 'index.html');
let fails = 0, passes = 0;
const ok = (c, msg) => { if (c) passes++; else { fails++; console.log('FAIL:', msg); } };
const SET = { 'focus-calculate-settings-v1': { avail: null, weights: [1,1,1,1,1,1,1], offDates: [], wHist: [], offLog: {}, ppRuleFrom: '2026-10-01' } };
const mk = (tasks, day = '2026-11-09') => makeApp(HTML, day, Object.assign({ 'focus-calculate-tasks-v1': tasks }, SET));
function days(from, n) { const out = []; const d = new Date(from + 'T12:00:00'); for (let i = 0; i < n; i++) { out.push(d.toISOString().slice(0, 10)); d.setDate(d.getDate() + 1); } return out; }
const st = (app, id) => JSON.parse(app.ev(`(() => { const t = tasks.find(x => x.id === '${id}'); const p = buildSchedule(t); return JSON.stringify({ prog: t.progress, status: p.status, done: (t.extras || []).map(x => extraDone(t, x)) }); })()`));
// M3: add/delete blocked while yesterday's check is open
{
  const app = mk([lectureTask('L', { extras: [{ id: 'k', t: 'K', w: 30, at: 15 }] })]);
  app.check('L'); app.setDay('2026-11-10'); app.setDay('2026-11-11'); // 11/10 not checked
  app.view('active');
  app.doc.querySelector('[data-action="add-extra"][data-id="L"]').click();
  ok(!app.doc.getElementById('extraModal').classList.contains('show'), 'M3: add blocked while yesterday open');
  app.win.confirm = () => true;
  const del = app.doc.querySelector('[data-action="del-extra"][data-id="L"]');
  if (del) del.click();
  ok((app.task('L').extras || []).length === 0, 'M3: delete goes ahead after the yesterday question (confirmed)');
  app.view('today'); ok(!app.doc.querySelector('[data-action="yday-done"][data-id="L"]'), 'M3: yesterday check closed after the change');
  // check today → allowed
  app.check('L');
  app.view('active');
  app.doc.querySelector('[data-action="add-extra"][data-id="L"]').click();
  ok(app.doc.getElementById('extraModal').classList.contains('show'), 'M3: add allowed after today checked');
  app.close();
}
// H1: following the plan with a big end review never finishes early, plan stable
{
  const app = mk([pageTask('H', { extras: [{ id: 'e', t: 'END', w: 22, at: 100000, u: 'pg', pg: 22, df: 'medium' }] })]);
  let finished = null, prev = null;
  for (const ds of days('2026-11-09', 36)) {
    app.setDay(ds);
    const s0 = st(app, 'H'); if (s0.prog >= 10) { finished = finished || ds; break; }
    const rows = app.snap('H').rows.filter(r => r[0] >= ds).map(r => r.slice(0, 9).join(' ')).join('|');
    if (prev) ok(rows === prev, `H1 ${ds}: plan unchanged overnight`);
    ok(s0.status !== 'behind', `H1 ${ds}: status ${s0.status}`);
    app.check('H');
    const s1 = st(app, 'H');
    ok(s1.status !== 'ahead', `H1 ${ds}: not ahead after check`);
    if (s1.prog >= 10) finished = ds;
    const tm = days(ds, 2)[1];
    prev = app.snap('H').rows.filter(r => r[0] >= tm).map(r => r.slice(0, 9).join(' ')).join('|');
  }
  ok(finished === '2026-12-13', 'H1: finished on the last plan day, got ' + finished);
  app.close();
}
console.log(`passes ${passes} fails ${fails}`);
