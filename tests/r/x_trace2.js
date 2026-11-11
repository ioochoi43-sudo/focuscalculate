const C = require('./common');
const mode = process.argv[2] || 'skip';
const app = C.mk([C.S.lectureTask('L'), C.S.lectureTask('M')]);
C.skipCh(app, 'L', 1); C.skipCh(app, 'M', 1);
for (const ds of C.days('2026-11-09', 5)) { app.setDay(ds); app.check('L'); app.check('M'); }
app.setDay('2026-11-14');
C.skipCh(app, 'L', 6); C.skipCh(app, 'M', 6);
// L: postpone week ; M: just don't check Saturday (twin)
app.view('active'); app.doc.querySelector('[data-action="postpone-today"][data-id="L"]').click(); app.doc.getElementById('pp-week').click();
const dbg = (id) => app.ev(`(() => { const t = tasks.find(x => x.id === '${id}'); const p = buildSchedule(t); return JSON.stringify({ prog: t.progress, fwd: fwdRel(t, t.progress), exp: p.expectedProgress, behind: p.behind, status: p.status, hold: t.weekHold, rows: p.schedule.filter(s => !s.isPast && !s.isReview).slice(0, 3).map(s => fmtDate(s.date).slice(5) + ' ' + s.from + '-' + s.to) }); })()`);
console.log('Sat L', dbg('L')); console.log('Sat M', dbg('M'));
app.setDay('2026-11-15');
console.log('Sun L', dbg('L')); console.log('Sun M', dbg('M'));
app.check('L'); app.check('M');
app.setDay('2026-11-16');
console.log('Mon L', dbg('L')); console.log('Mon M', dbg('M'));
app.close();
