const C = require('./common');
const withSkip = (t, rels) => { t.skipped = rels; t.extras = rels.map(k => ({ id: 'sk' + k, t: (k + 1) + '장', w: t.lectureDurations[k], at: 100000, sk: k })); return t; };
// page goal: find a day whose row ends on a skipped chapter
const app = C.mk([withSkip(C.S.pageTask('P'), [2]), withSkip(C.S.lectureTask('L'), [3, 7, 12])]);
for (const ds of C.days('2026-11-09', 20)) {
  app.setDay(ds);
  const r = JSON.parse(app.ev(`(() => { const t = tasks.find(x => x.id === 'P'); const r = todayPlanRow(t, fmtDate(today())); return JSON.stringify(r ? { from: r.from, to: r.to, part: !!r.isPart, pf: r.pFrom, pt: r.pTo, pText: r.pText, skips: r.skips } : null); })()`));
  if (r && r.skips) {
    console.log(ds, 'P row', JSON.stringify(r));
    app.view('active'); app.doc.querySelector('[data-action="toggle-today-complete"][data-id="P"]').click();
    console.log('  modal sub:', app.doc.getElementById('cm-sub').textContent, '| input default:', app.doc.getElementById('cm-input').value, '| chips:', [...app.doc.querySelectorAll('#cm-quick .quick-chip')].map(b => b.textContent).join(' / '), '| helper:', app.doc.getElementById('cm-helper').textContent);
    app.doc.getElementById('cm-cancel') ? app.doc.getElementById('cm-cancel').click() : app.doc.getElementById('completeModal').classList.remove('show');
    break;
  }
  app.check('P');
}
// lecture: a day whose row ends on a skipped lecture → number check chips
const app2 = C.mk([withSkip(C.S.lectureTask('L'), [3, 7, 12])]);
for (const ds of C.days('2026-11-09', 25)) {
  app2.setDay(ds);
  const r = JSON.parse(app2.ev(`(() => { const t = tasks[0]; const r = todayPlanRow(t, fmtDate(today())); return JSON.stringify(r ? { from: r.from, to: r.to, skips: r.skips } : null); })()`));
  if (r && r.skips && r.skips.includes(r.to)) {
    console.log(ds, 'L row ends on skipped', JSON.stringify(r));
    app2.view('active'); app2.doc.querySelector('[data-action="toggle-today-complete"][data-id="L"]').click();
    const inp = app2.doc.getElementById('cm-input');
    console.log('  sub:', app2.doc.getElementById('cm-sub').textContent, '| input', inp.value, '| pick sum:', (app2.doc.getElementById('cm-pick-sum') || {}).textContent);
    inp.value = String(r.to - 1); inp.oninput && inp.oninput();
    console.log('  after -1:', (app2.doc.getElementById('cm-pick-sum') || {}).textContent);
    app2.doc.getElementById('cm-save').click();
    const s = app2.snap('L');
    console.log('  saved to-1 → progress', app2.task('L').progress, 'status', s.status, 'rows tomorrow-on same as plan?');
    break;
  }
  app2.check('L');
}
app.close(); app2.close();
