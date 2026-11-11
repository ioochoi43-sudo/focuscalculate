const C = require('./common');
const kind = process.argv[2] || 'P';
const mkT = (id) => kind === 'P' ? C.S.pageTask(id) : kind === 'W' ? C.S.weightTask(id) : C.S.lectureTask(id);
const app = C.mk([mkT('A'), mkT('B')]);
const fill = kind === 'P' ? C.pgFill(15) : kind === 'W' ? C.daFill('hard', 'high') : C.minFill('60분');
console.log('A add review before ch5:', JSON.stringify(C.addExtra(app, 'A', 'R5', fill, 4)));
console.log('A skip ch5:', JSON.stringify(C.skipCh(app, 'A', 4)));
console.log('B skip ch5 only:', JSON.stringify(C.skipCh(app, 'B', 4)));
const info = (id) => app.ev(`(() => { const t = tasks.find(x => x.id === '${id}'); const p = buildSchedule(t); const pre = getDurationPrefix(t); const fut = p.schedule.filter(s => !s.isPast && !s.isReview);
  const loads = dayLoadsOf(t, p); const sumLoads = [...loads.values()].reduce((a, b) => a + b, 0);
  return JSON.stringify({ remaining: Math.round((pre[t.total] - pre[t.progress]) * 100) / 100, sumLoads: Math.round(sumLoads * 100) / 100, glue4: glueOf(t, 4), rowsWithR5: fut.filter(s => (s.revs || []).some(x => x.id !== undefined && x.sk == null)).map(s => fmtDate(s.date) + ':' + s.from + '-' + s.to), status: p.status }); })()`);
console.log('A', info('A')); console.log('B', info('B'));
const issues = [];
for (const ds of C.days('2026-11-09', 45)) {
  app.setDay(ds);
  for (const id of ['A']) {
    const sn = app.snap(id); if (sn.prog >= 10 && kind !== 'L' || sn.prog >= app.task(id).total) continue;
    if (sn.status === 'behind' || sn.status === 'ahead') issues.push(`${ds} ${id} status ${sn.status} prog ${sn.prog} exp ${sn.exp}`);
    const d = JSON.parse(app.ev(`JSON.stringify((tasks.find(x => x.id === '${id}').extras || []).map(x => [x.t, extraDone(tasks.find(x => x.id === '${id}'), x)]))`));
    const r = C.row0(app, id);
    if (r && r.revs.length) issues.push(`${ds} ${id} row with review/skip extra: ${JSON.stringify(r)} done=${JSON.stringify(d)}`);
    app.check(id);
    const after = app.snap(id); if (after.status === 'ahead') issues.push(`${ds} ${id} ahead right after check prog ${after.prog}`);
  }
}
console.log(issues.slice(0, 12).join('\n'));
app.close();
