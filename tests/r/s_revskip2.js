const C = require('./common');
const app = C.mk([C.S.pageTask('A'), C.S.pageTask('B')]);
C.addExtra(app, 'A', 'R5', C.pgFill(15), 4); C.skipCh(app, 'A', 4);   // review before 5장, then 5장 skipped
C.addExtra(app, 'B', 'R6', C.pgFill(15), 5); C.skipCh(app, 'B', 4);   // same review, before 6장 (not skipped) — reference
const loads = (id) => JSON.parse(app.ev(`(() => { const t = tasks.find(x => x.id === '${id}'); const p = buildSchedule(t); const L = dayLoadsOf(t, p);
  const v = [...L.entries()].map(([d, x]) => [d, Math.round(x * 10) / 10]); const avg = v.reduce((a, b) => a + b[1], 0) / v.length;
  const rv = p.schedule.filter(s => !s.isPast && (s.revs || []).some(x => x.sk == null)).map(s => fmtDate(s.date) + ' ' + s.from + '-' + s.to + (s.isPart ? ' part ' + s.partN + '/' + s.partOf : ''));
  return JSON.stringify({ avg: Math.round(avg * 10) / 10, max: v.reduce((a, b) => b[1] > a[1] ? b : a), reviewRows: rv }); })()`));
console.log('A (review before skipped 5장):', JSON.stringify(loads('A')));
console.log('B (review before 6장):        ', JSON.stringify(loads('B')));
app.close();
