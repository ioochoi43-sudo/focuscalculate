const C = require('./common');
const mk = { W: (id) => C.S.weightTask(id), P: (id) => { const t = C.S.pageTask(id); t.itemDays = [0, 3, 0, 4, 0, 0, 0, 0, 0, 0]; return t; }, L: (id) => C.S.lectureTask(id) };
const T = []; Object.entries(mk).forEach(([k, f]) => [2, 3, 4, 5, 6].forEach(dow => T.push(f(k + dow))));
const app = C.mk(T);
const issues = [], info = [];
const ck = (id, ds) => { const x = JSON.parse(app.ev(`(() => { const t = tasks.find(x => x.id === '${id}'); const p = buildSchedule(t); const sn = t.startNum || 0; const fut = p.schedule.filter(s => !s.isPast && !s.isReview);
  const out = []; const fw = (c) => sn + fwdRel(t, c - sn); let c = sn + getTodayAnchor(t);
  fut.forEach(s => { if (s.isPart) { if (s.from !== fw(c) + 1) out.push('part gap ' + fmtDate(s.date)); } else { if (!(s.from === c + 1 || s.from === fw(c) + 1)) out.push('gap ' + fmtDate(s.date) + ' ' + c + '->' + s.from); c = s.to; } });
  const last = fut[fut.length - 1]; if (last && (last.isPart || last.to !== sn + t.total)) out.push('last row not at end');
  return JSON.stringify({ out, status: p.status, hold: getWeekHold(t, today()) }); })()`)); x.out.forEach(m => issues.push(`${id} ${ds} ${m}`)); return x; };
for (const [i, ds] of C.days('2026-11-09', 14).entries()) {
  app.setDay(ds);
  const dow = new Date(ds + 'T12:00').getDay();
  T.forEach(t => {
    const id = t.id, target = parseInt(id.slice(1));
    if (i === 0) { const L = JSON.parse(app.ev(`JSON.stringify(skippableRels(tasks.find(x => x.id === '${id}')))`)); C.skipCh(app, id, L[1] != null ? L[1] : L[0]); } // skip the chapter after the next one
    if (i < 7 && dow === target) {
      // skip the chapter right after the one under way, then postpone week-mode
      const L = JSON.parse(app.ev(`JSON.stringify(skippableRels(tasks.find(x => x.id === '${id}')))`)); if (L.length) C.skipCh(app, id, L[0]);
      app.view('active'); const b = app.doc.querySelector(`[data-action="postpone-today"][data-id="${id}"]`);
      if (b) { b.click(); const w = app.doc.getElementById('pp-week'); if (w && w.style.display !== 'none' && !w.disabled) { w.click(); info.push(`${id} ${ds} week-hold set ${JSON.stringify(app.task(id).weekHold)}`); } else app.doc.getElementById('pp-cancel').click(); }
      ck(id, ds);
      return;
    }
    const x = ck(id, ds);
    if (x.status === 'behind' && i > 0) issues.push(`${id} ${ds} status behind (hold ${JSON.stringify(x.hold)})`);
    app.check(id);
    if (dow === 0 && i < 7) { const g = JSON.parse(app.ev(`JSON.stringify(weekGoalsMap.get('${id}|2026-11-09') || null)`)); const tk = app.task(id); if (g && (tk.startNum || 0) + tk.progress < g.to) issues.push(`${id} Sunday: week goal ${g.to} not reached (progress ${tk.progress})`); }
  });
}
console.log(info.join('\n'));
const nonStatus = issues.filter(m => !m.includes('status behind')); console.log('structural issues:', nonStatus.length ? nonStatus.slice(0, 20).join('\n') : 'none', '| status-behind lines', issues.length - nonStatus.length, app.errors.slice(0, 2));
app.close();
