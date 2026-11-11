const C = require('./common');
const kinds = { P: () => C.S.pageTask('X'), W: () => C.S.weightTask('X'), L: () => C.S.lectureTask('X'), PC: () => C.S.pageTask('X', { timeMode: 'capacity', dailyMinutes: 9 }) };
for (const [k, f] of Object.entries(kinds)) {
  const app = C.mk([f()]);
  app.check('X'); app.setDay('2026-11-10'); app.check('X'); app.setDay('2026-11-11');
  const L = JSON.parse(app.ev(`JSON.stringify(skippableRels(tasks[0]))`));
  C.skipCh(app, 'X', L[0]);
  const st0 = () => JSON.stringify({ rows: C.futRows(app, 'X'), status: app.snap('X').status, prog: app.task('X').progress, behind: app.snap('X').behind });
  const out = [];
  for (const ds of C.days('2026-11-12', 4)) {
    app.setDay(ds);
    const before = st0();
    const r1 = app.check('X');
    const mid = app.snap('X').status;
    // uncheck: click the check button again
    app.view('active'); const b = app.doc.querySelector('[data-action="toggle-today-complete"][data-id="X"]'); if (b) b.click();
    if (app.modalOpen()) app.doc.getElementById('cm-cancel') && app.doc.getElementById('cm-cancel').click();
    const after = st0();
    out.push(`${ds} prog-on-skipped=${app.ev('(() => { const t = tasks[0]; return isSkippedRel(t, t.progress); })()')} check=${r1} status-after-check=${mid} uncheck-restores=${before === after}`);
    app.check('X');
  }
  // ↻ week goal while progress sits right before a skipped chapter
  app.view('week');
  const wb = app.doc.getElementById('weekGoals').textContent.replace(/\s+/g, ' ');
  const rb = app.doc.querySelector('[data-action="refresh-week-goal"]'); if (rb) rb.click();
  app.view('week');
  const wa = app.doc.getElementById('weekGoals').textContent.replace(/\s+/g, ' ');
  console.log(k, 'skip', L[0], '\n ' + out.join('\n ') + '\n  week before ↻:', wb.slice(60, 230), '\n  week after  ↻:', wa.slice(60, 230), '\n  errors', app.errors.slice(0, 2));
  app.close();
}
