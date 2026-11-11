const C = require('./common');
const html = process.argv[2] || C.HTML;
const app = C.makeApp(html, '2026-11-09', Object.assign({ 'focus-calculate-tasks-v1': [C.S.pageTask('P')] }, C.SET));
const seen = new Set();
for (const ds of C.days('2026-11-09', 30)) { app.setDay(ds); const sc = app.ev(`JSON.stringify(selfCheckTask(tasks[0]))`); const p = app.task('P').progress; if (sc !== '[]' && !seen.has(p)) { seen.add(p); console.log(ds, 'prog', p, 'pre[prog]', app.ev(`getDurationPrefix(tasks[0])[tasks[0].progress]`), sc); } app.check('P'); }
console.log('done');
app.close();
