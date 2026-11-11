const C = require('./common');
const app = C.mk([C.S.pageTask('A'), C.S.lectureTask('L')]);
console.log('skip A ch3:', JSON.stringify(C.skipCh(app, 'A', 2)), 'skip L 1강:', JSON.stringify(C.skipCh(app, 'L', 0)));
console.log('day1 A', app.ev(`JSON.stringify(selfCheckTask(tasks.find(t => t.id === 'A')))`), 'L', app.ev(`JSON.stringify(selfCheckTask(tasks.find(t => t.id === 'L')))`));
for (const ds of C.days('2026-11-09', 9)) { app.setDay(ds); app.check('A'); app.check('L'); }
app.setDay('2026-11-18');
console.log('day10 A', app.ev(`JSON.stringify(selfCheckTask(tasks.find(t => t.id === 'A')))`), 'status', app.snap('A').status, 'prog', app.task('A').progress);
console.log('past rows A', JSON.stringify(JSON.parse(app.ev(`JSON.stringify(buildSchedule(tasks.find(t => t.id === 'A')).schedule.filter(s => s.isPast).map(s => [fmtDate(s.date), s.from, s.to]))`))));
// the settings button
app.ev(`runSelfCheck()`);
console.log('UI:', app.doc.getElementById('set-selfcheck-result').textContent.replace(/\s+/g, ' ').slice(0, 300));
app.close();
