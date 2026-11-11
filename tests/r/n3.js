const C = require('./common');
const app = C.mk([C.S.pageTask('PC', { timeMode: 'capacity', dailyMinutes: 9 })]);
for (const ds of C.days('2026-11-09', 2)) { app.setDay(ds); app.check('PC'); }
app.setDay('2026-11-11'); C.skipCh(app, 'PC', 2);
for (const ds of C.days('2026-11-11', 5)) { app.setDay(ds); app.check('PC'); }
app.setDay('2026-11-16');
console.log(app.ev(`(() => { const t = tasks[0]; const p = buildSchedule(t); return JSON.stringify({ anchor: getTodayAnchor(t), prog: t.progress, pre: getDurationPrefix(t).map(v => Math.round(v*10)/10), past: p.schedule.filter(s => s.isPast).map(s => [fmtDate(s.date), s.from, s.to]) }); })()`));
app.close();
