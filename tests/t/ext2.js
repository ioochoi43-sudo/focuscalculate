const { makeApp } = require('./h');
const { pageTask, lectureTask, weightTask } = require('./seed');
const HTML = process.env.FC_HTML || require('path').join(__dirname, '..', '..', 'index.html');
let fails = 0, passes = 0;
const ok = (c, msg) => { if (c) passes++; else { fails++; console.log('FAIL:', msg); } };
const SET = { 'focus-calculate-settings-v1': { avail: null, weights: [1,1,1,1,1,1,1], offDates: [], wHist: [], offLog: {}, ppRuleFrom: '2026-10-01' } };
function mk(tasks, day = '2026-11-09') { return makeApp(HTML, day, Object.assign({ 'focus-calculate-tasks-v1': tasks }, SET)); }
function days(from, n) { const out = []; const d = new Date(from + 'T12:00:00'); for (let i = 0; i < n; i++) { out.push(d.toISOString().slice(0, 10)); d.setDate(d.getDate() + 1); } return out; }
function addExtra(app, id, name, fill, at) {
  const d = app.doc; app.view('active');
  const b = d.querySelector(`[data-action="add-extra"][data-id="${id}"]`); if (!b) return 'nobtn';
  b.click(); d.getElementById('xm-name').value = name; fill(d);
  if (at != null) d.getElementById('xm-at').value = String(at);
  d.getElementById('xm-save').click();
  return app.task(id).extras;
}
const pgFill = (n, df) => (d) => { d.getElementById('xm-pg').value = String(n); if (df) d.getElementById('xm-df').value = df; };
const row0 = (app, id) => JSON.parse(app.ev(`(() => { const t = tasks.find(x => x.id === '${id}'); const r = todayPlanRow(t, fmtDate(today())); return JSON.stringify(r ? { from: r.from, to: r.to, part: !!r.isPart, pf: r.pFrom, pt: r.pTo, revs: (r.revs || []).map(x => x.id) } : null); })()`));
const st = (app, id) => JSON.parse(app.ev(`(() => { const t = tasks.find(x => x.id === '${id}'); const p = buildSchedule(t); return JSON.stringify({ prog: t.progress, status: p.status, done: (t.extras || []).map(x => extraDone(t, x)), reached: hasPages(t) ? pageReachedNow(t) : null, rec: completedMap.get(t.id + '|' + fmtDate(today())) || null }); })()`));
const futRows = (app, id) => app.snap(id).rows.filter(r => r[0] >= app.today()).map(r => r.slice(0, 11).join(' ')).join('|');

// ---------- E: boundary page check (start review) ----------
{
  const app = mk([pageTask('E', { extras: [{ id: 'r3', t: 'R3', w: 4, at: 3, u: 'pg', pg: 4, df: 'medium' }] })]);
  let dsHit = null;
  for (const ds of days('2026-11-09', 34)) {
    app.setDay(ds);
    const r = row0(app, 'E');
    if (r && r.revs.includes('r3') && r.pf != null) { dsHit = ds; break; }
    app.check('E');
  }
  ok(!!dsHit, 'E: found a day with R3 + pages');
  const r = row0(app, 'E');
  console.log('E row', dsHit, JSON.stringify(r));
  // boundary page = start of chapter 4 pages - 1 = 38 ; checkbox visible & default checked
  app.view('active');
  app.doc.querySelector('[data-action="toggle-today-complete"][data-id="E"]').click();
  const inp = app.doc.getElementById('cm-input'); inp.value = '38'; inp.oninput();
  const box = app.doc.getElementById('cm-rev');
  ok(box.style.display !== 'none', 'E: review box shown at boundary page');
  ok(app.doc.getElementById('cm-rev-cb').checked, 'E: box ticked by default (review planned today)');
  const helperT = app.doc.getElementById('cm-helper').textContent;
  ok(/복습도 했어요/.test(helperT), 'E: helper mentions review: ' + helperT);
  app.doc.getElementById('cm-save').click();
  const s1 = st(app, 'E');
  ok(s1.done[0] === true, 'E: review done after boundary check with box ' + JSON.stringify(s1));
  ok(s1.rec && s1.rec.part && s1.rec.part.u === 1, 'E: recorded as user position');
  ok(s1.reached === 38, 'E: pages reached unchanged 38 → ' + s1.reached);
  // tomorrow: first row starts at p.39
  const nd = days(dsHit, 2)[1]; app.setDay(nd);
  const r2 = row0(app, 'E');
  ok(r2 && r2.pf === 39 && r2.revs.length === 0, 'E: next day starts p.39 without review ' + JSON.stringify(r2));
  // uncheck path: a fresh twin, box unticked → nothing recorded
  app.close();
}
{
  const app = mk([pageTask('E2', { extras: [{ id: 'r3', t: 'R3', w: 4, at: 3, u: 'pg', pg: 4, df: 'medium' }] })]);
  let dsHit = null;
  for (const ds of days('2026-11-09', 34)) { app.setDay(ds); const r = row0(app, 'E2'); if (r && r.revs.includes('r3') && r.pf != null) { dsHit = ds; break; } app.check('E2'); }
  const p0 = st(app, 'E2').prog;
  app.check('E2', { page: 38, rev: false });
  const s1 = st(app, 'E2');
  ok(s1.done[0] === false && s1.prog === p0 && !s1.rec, 'E2: unticked box → no progress, review pending ' + JSON.stringify(s1));
  app.close();
}
// ---------- F: end review left after the last page ----------
{
  const app = mk([pageTask('F', { extras: [{ id: 'fe', t: 'END', w: 8, at: 10, u: 'pg', pg: 8, df: 'medium' }] })]);
  let hit = null;
  for (const ds of days('2026-11-09', 35)) { app.setDay(ds); const r = row0(app, 'F'); if (r && r.revs.includes('fe')) { hit = ds; break; } app.check('F'); }
  ok(!!hit, 'F: found the end-review day');
  const r = row0(app, 'F'); console.log('F row', hit, JSON.stringify(r));
  if (r.pf != null) {
    app.check('F', { page: 160, rev: false });
    let s1 = st(app, 'F');
    ok(s1.prog === 9 && s1.done[0] === false && s1.reached === 160, 'F: last page without review → last chapter not finished ' + JSON.stringify(s1));
    const nd = days(hit, 2)[1]; app.setDay(nd);
    const r2 = row0(app, 'F');
    ok(r2 && r2.pf == null && r2.revs.includes('fe'), 'F: next day = review only, no pages ' + JSON.stringify(r2));
    ok(app.check('F') === 'ok', 'F: review-only day opens the number check');
    s1 = st(app, 'F');
    ok(s1.prog === 10 && s1.done[0] === true, 'F: review checked → goal done ' + JSON.stringify(s1));
  }
  app.close();
}
// ---------- G: delete restores the plan; blocked while chapter under way ----------
{
  const app = mk([pageTask('G'), pageTask('G0')]);
  const before = futRows(app, 'G');
  addExtra(app, 'G', 'x', pgFill(7), 4);
  ok(futRows(app, 'G') !== before, 'G: adding changes plan');
  app.view('active');
  const del = app.doc.querySelector('[data-action="del-extra"][data-id="G"]');
  ok(!!del, 'G: delete button shown');
  app.win.confirm = () => true;
  del.click();
  ok(!app.task('G').extras, 'G: extras removed');
  ok(futRows(app, 'G') === futRows(app, 'G0'), 'G: plan back to the twin without reviews');
  app.close();
}
// ---------- H: end review added while the last chapter is under way ----------
{
  const app = mk([pageTask('H', { end: '2026-12-13' })]);
  let hd = null;
  for (const ds of days('2026-11-09', 34)) { app.setDay(ds); const t = app.task('H'); const s = st(app, 'H'); if (t.progress === 9 && s.reached > 141) { hd = ds; break; } app.check('H'); }
  ok(!!hd, 'H: reached last chapter under way');
  const s0 = st(app, 'H');
  addExtra(app, 'H', 'final', pgFill(10), 100000);
  const s1 = st(app, 'H');
  ok(s1.reached === s0.reached, `H: pages reached unchanged ${s0.reached} → ${s1.reached}`);
  const r = row0(app, 'H') || {};
  console.log('H', hd, JSON.stringify(s0), JSON.stringify(r));
  // follow to finish
  for (const ds of days(hd, 12)) { app.setDay(ds); const s = st(app, 'H'); if (s.prog >= 10) break; ok(s.status !== 'behind', `H ${ds} status ${s.status}`); app.check('H'); }
  ok(st(app, 'H').prog === 10, 'H finished with final review');
  app.close();
}
// ---------- I: postponed day == unchecked day; yesterday check == on time (with reviews) ----------
{
  const ex = [{ id: 'q', t: 'Q', w: 9, at: 2, u: 'pg', pg: 9, df: 'medium' }, { id: 'qe', t: 'QE', w: 5, at: 10, u: 'pg', pg: 5, df: 'medium' }];
  const app = mk([pageTask('P1', { extras: ex }), pageTask('P2', { extras: ex }), pageTask('Y1', { extras: ex }), pageTask('Y2', { extras: ex })]);
  const ds0 = days('2026-11-09', 30);
  ds0.forEach((ds, i) => {
    app.setDay(ds);
    // P1 postpones on day 6 (deadline mode), P2 just skips
    if (i === 6) {
      app.view('active');
      const b = app.doc.querySelector('[data-action="postpone-today"][data-id="P1"]');
      if (b) { b.click(); app.doc.getElementById('pp-deadline').click(); }
    } else { app.check('P1'); app.check('P2'); }
    if (i !== 6) { ok(futRows(app, 'P1') === futRows(app, 'P2'), `I ${ds}: postponed == skipped rows`); ok(app.snap('P1').status === app.snap('P2').status, `I ${ds}: same status`); }
    // Y1 on time; Y2 checks day 9 the next morning via yesterday box
    app.check('Y1');
    if (i === 10) {
      app.view('today');
      const b = app.doc.querySelector('[data-action="yday-done"][data-id="Y2"]');
      ok(!!b, 'I: yesterday button');
      if (b) { b.click(); if (app.modalOpen()) app.doc.getElementById('cm-save').click(); }
      app.check('Y2');
    } else if (i !== 9) app.check('Y2');
    if (i >= 10) ok(futRows(app, 'Y1') === futRows(app, 'Y2') && app.snap('Y1').status === app.snap('Y2').status, `I ${ds}: yesterday check == on time`);
  });
  console.log('I errors', app.errors.slice(0, 3));
  app.close();
}
// ---------- J: export/import roundtrip, edit save no-op, yesterday plan after adding today ----------
{
  const app = mk([pageTask('J'), lectureTask('K')]);
  addExtra(app, 'J', '오답', pgFill(5, 'hard'), 3);
  const t = app.task('J');
  const back = JSON.parse(app.ev(`JSON.stringify(sanitizeTask(JSON.parse(JSON.stringify(tasks.find(x => x.id === 'J')))))`));
  const srt = (L) => JSON.stringify(L.map(o => Object.keys(o).sort().reduce((a, k) => (a[k] = o[k], a), {})));
  ok(srt(back.extras) === srt(t.extras), 'J: sanitize keeps extras ' + srt(back.extras) + ' ' + srt(t.extras));
  const bad = JSON.parse(app.ev(`JSON.stringify(sanitizeTask(Object.assign({}, tasks.find(x => x.id === 'J'), { extras: [{ w: -1, at: 1 }, null, 'x', { w: 3, at: 'a' }] })))`));
  ok(!bad.extras, 'J: bad extras dropped');
  // reload keeps the plan
  const rows1 = futRows(app, 'J');
  const ls = app.ev(`localStorage.getItem('focus-calculate-tasks-v1')`);
  const app2 = makeApp(HTML, app.today(), Object.assign({ 'focus-calculate-tasks-v1': ls, 'focus-calculate-completed-v2': app.ev(`localStorage.getItem('focus-calculate-completed-v2') || '{}'`) }, SET));
  ok(futRows(app2, 'J') === rows1, 'J: reload → same plan');
  app2.close();
  // edit modal: open + save without change → no re-plan
  const rb0 = JSON.stringify(app.task('J').rebase), pe0 = JSON.stringify(app.task('J').preEdit);
  app.view('active'); app.doc.querySelector('[data-action="edit"][data-id="J"]').click();
  app.doc.getElementById('e-save') ? app.doc.getElementById('e-save').click() : null;
  ok(JSON.stringify(app.task('J').rebase) === rb0 && futRows(app, 'J') === rows1, 'J: edit save without changes keeps plan');
  // K: day 1 check, day 2 not checked; day 3 add a review → yesterday box item = day-2 plan
  app.check('K'); app.setDay('2026-11-10');
  const y2 = JSON.stringify(app.snap('K').rows[0]);
  app.setDay('2026-11-11');
  app.view('active'); app.doc.querySelector('[data-action="add-extra"][data-id="K"]').click();
  ok(!app.doc.getElementById('extraModal').classList.contains('show'), 'J: adding blocked while yesterday check is open');
  const yi = JSON.parse(app.ev(`(() => { const r = yesterdayItem(tasks.find(x => x.id === 'K')); return JSON.stringify(r ? [fmtDate(r.date), r.from, r.to] : null); })()`));
  ok(yi && JSON.stringify(yi) === JSON.stringify(JSON.parse(y2).slice(0, 3)), 'J: yesterday item = plan of yesterday ' + JSON.stringify(yi) + ' vs ' + y2);
  console.log('J errors', app.errors.slice(0, 3));
  app.close();
}
console.log(`passes ${passes} fails ${fails}`);
