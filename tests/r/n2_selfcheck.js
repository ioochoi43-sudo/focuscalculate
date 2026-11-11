const C = require('./common');
const app = C.mk([C.S.weightTask('W'), C.S.pageTask('PC', { timeMode: 'capacity', dailyMinutes: 9 })]);
for (const ds of C.days('2026-11-09', 2)) { app.setDay(ds); app.check('W'); app.check('PC'); }
app.setDay('2026-11-11');
for (const id of ['W', 'PC']) {
  const L = JSON.parse(app.ev(`JSON.stringify(skippableRels(tasks.find(x => x.id === '${id}')))`));
  console.log(id, 'progress', app.task(id).progress, 'skip default next', L[0], JSON.stringify(C.skipCh(app, id, L[0])));
}
for (const ds of C.days('2026-11-11', 6)) {
  app.setDay(ds);
  for (const id of ['W', 'PC']) console.log(ds, id, 'prog', app.task(id).progress, 'status', app.snap(id).status, 'selfCheck', app.ev(`JSON.stringify(selfCheckTask(tasks.find(t => t.id === '${id}')))`));
  app.check('W'); app.check('PC');
}
app.ev(`runSelfCheck()`);
console.log('UI:', app.doc.getElementById('set-selfcheck-result').textContent.replace(/\s+/g, ' ').slice(0, 300));
app.close();
