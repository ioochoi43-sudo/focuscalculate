const C = require('./common');
const kind = process.argv[2] || 'P';
const mkT = (id) => kind === 'P' ? C.S.pageTask(id) : kind === 'WC' ? C.S.weightTask(id, { timeMode: 'capacity', dailyMinutes: 6 }) : C.S.weightTask(id);
const app = C.mk([mkT('X')]);
const curFrac = () => +app.ev(`(() => { const t = tasks[0]; const r = fwdRel(t, t.progress); return getPartState(t, (t.startNum||0) + r + 1, fmtDate(addDays(today(), 1))).frac; })()`);
let D;
for (const ds of C.days('2026-11-09', 30)) { app.setDay(ds); const r = C.row0(app, 'X'); if (r && r.part && r.n >= 2 && curFrac() > 0) { D = ds; break; } app.check('X'); }
const k = app.task('X').progress;
app.check('X'); // today's part day of chapter k, checked
const card = () => { const t = app.cardText('X'); return (t.match(/오늘 할 일.*?(?=⧉)/) || [''])[0] + ' || ' + (t.match(/⏱ 남은[^·]*·[^·]*/) || [''])[0]; };
const capEnd = () => app.ev(`(() => { const p = buildSchedule(tasks[0]); const f = p.schedule.filter(s => !s.isPast && !s.isReview); return fmtDate(f[f.length - 1].date); })()`);
console.log(kind, D, 'checked today: card →', card(), '| last plan day', capEnd());
C.skipCh(app, 'X', k);
console.log('after skipping the rest of chapter', k + 1, ': card →', card(), '| last plan day', capEnd());
console.log('  plan from today:', C.futRows(app, 'X').split('|').slice(0, 3).join(' | '));
app.setDay(C.days(D, 2)[1]);
console.log('next morning: card →', card(), '| last plan day', capEnd());
console.log('  plan from today:', C.futRows(app, 'X').split('|').slice(0, 3).join(' | '));
app.close();
