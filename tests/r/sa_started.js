const C = require('./common');
const kind = process.argv[2] || 'P';
const mkT = (id) => kind === 'P' ? C.S.pageTask(id) : kind === 'PC' ? C.S.pageTask(id, { timeMode: 'capacity', dailyMinutes: 9 }) : kind === 'WC' ? C.S.weightTask(id, { timeMode: 'capacity', dailyMinutes: 6 }) : C.S.weightTask(id);
const app = C.mk([mkT('S1'), mkT('S2'), mkT('S3'), mkT('T')]);
const ids = ['S1', 'S2', 'S3', 'T'];
const curFrac = (id) => +app.ev(`(() => { const t = tasks.find(x => x.id === '${id}'); const r = fwdRel(t, t.progress); return getPartState(t, (t.startNum||0) + r + 1, fmtDate(addDays(today(), 1))).frac; })()`);
let D = null;
for (const ds of C.days('2026-11-09', 30)) {
  app.setDay(ds);
  const r = C.row0(app, 'S1');
  if (r && r.part && r.n >= 2 && curFrac('S1') > 0) { D = ds; break; }  // chapter under way, today is a later part day
  ids.forEach(id => app.check(id));
}
const k = app.task('S1').progress;
console.log(kind, 'day', D, 'chapter under way rel', k, 'frac', curFrac('S1').toFixed(3), 'row', JSON.stringify(C.row0(app, 'S1')));
const snapS = (id) => JSON.parse(app.ev(`(() => { const t = tasks.find(x => x.id === '${id}'); const p = buildSchedule(t); const pre = getDurationPrefix(t); const L = dayLoadsOf(t, p);
  const fut = p.schedule.filter(s => !s.isPast && !s.isReview);
  return JSON.stringify({ prog: t.progress, status: p.status, behind: Math.round(p.behind * 1000) / 1000, reached: hasPages(t) ? pageReachedNow(t) : null, rebase: t.rebase, skipped: t.skipped, sk: (t.extras || []).filter(x => x.sk != null).map(x => ({ t: x.t, rf: x.rf, w: Math.round(extraW(t, x) * 100) / 100 })),
    sumLoads: Math.round([...L.values()].reduce((a, b) => a + b, 0) * 100) / 100, remain: Math.round((pre[t.total] - pre[fwdRel(t, t.progress)]) * 100) / 100,
    first: fut.slice(0, 2).map(s => fmtDate(s.date).slice(5) + ' ' + s.from + '-' + s.to + (s.isPart ? ' ' + s.partN + '/' + s.partOf : '') + (s.pFrom != null ? ' p' + s.pFrom + '-' + s.pTo : '') + (s.isToday ? ' T' : '')), last: fut.slice(-2).map(s => fmtDate(s.date).slice(5) + ' ' + s.from + '-' + s.to + ' ' + (s.revs || []).map(x => x.t + (x.rf ? '*' : '')).join('+')) }); })()`));
// S1: skip the chapter under way (today unchecked)
console.log('S1 skip cur:', JSON.stringify(C.skipCh(app, 'S1', k)));
console.log('  S1', JSON.stringify(snapS('S1')));
// S2: check today's part day first, then skip
app.check('S2');
console.log('S2 after check today:', JSON.stringify(C.st(app, 'S2').rec));
console.log('S2 skip cur:', JSON.stringify(C.skipCh(app, 'S2', k)));
console.log('  S2', JSON.stringify(snapS('S2')));
// S3: skip then 다시 넣기 the same day → should equal twin T (never skipped)
C.skipCh(app, 'S3', k); app.view('active'); const bb = app.doc.querySelector('[data-action="skip-back"][data-id="S3"]'); console.log('S3 다시 넣기 shown', !!bb); if (bb) bb.click();
console.log('  S3 rows == T rows:', C.futRows(app, 'S3') === C.futRows(app, 'T'), 'status', app.snap('S3').status, app.snap('T').status);
// follow all to the end
const prev = {}, issues = [];
for (const ds of C.days(D, 50)) {
  app.setDay(ds);
  ['S1', 'S2', 'S3'].forEach(id => {
    const t = app.task(id); if (t.progress >= t.total) return;
    const sn = app.snap(id);
    if (ds !== D && (sn.status === 'behind' || sn.status === 'ahead')) issues.push(`${id} ${ds} status ${sn.status}`);
    const fr = C.futRows(app, id);
    if (prev[id] != null && prev[id] !== fr && ds !== D) issues.push(`${id} ${ds} overnight change\n  was ${prev[id].slice(0, 260)}\n  now ${fr.slice(0, 260)}`);
    const sc = app.ev(`JSON.stringify(selfCheckTask(tasks.find(x => x.id === '${id}')))`); if (sc !== '[]') issues.push(`${id} ${ds} selfCheck ${sc}`);
    if (!(id === 'S2' && ds === D)) app.check(id);
    const tmr = C.days(ds, 2)[1];
    prev[id] = app.snap(id).rows.filter(r => r[0] >= tmr).map(r => r.slice(0, 11).join(' ')).join('|');
    if (app.task(id).progress >= app.task(id).total) issues.push(`${id} finished ${ds}`);
  });
}
console.log(issues.slice(0, 14).join('\n'), app.errors.slice(0, 2));
app.close();
