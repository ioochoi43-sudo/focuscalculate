const C = require('./common');
const which = process.argv[2] || 'W3';
const T = which[0] === 'W' ? C.S.weightTask(which) : C.S.lectureTask(which);
const dowT = parseInt(which.slice(1));
const app = C.mk([T]);
const L0 = JSON.parse(app.ev(`JSON.stringify(skippableRels(tasks[0]))`));
console.log('day0 skip', L0[1], JSON.stringify(C.skipCh(app, which, L0[1])));
const rows = (from) => app.snap(which).rows.filter(r => r[0] >= from && r[0] <= '2026-11-15' && !r[9]).map(r => `${r[0].slice(5)} ${r[1]}-${r[2]}${r[3] ? ' p' + r[4] + '/' + r[5] : ''}`).join(' | ');
for (const ds of C.days('2026-11-09', 7)) {
  app.setDay(ds);
  const dow = new Date(ds + 'T12:00').getDay();
  if (dow === dowT) {
    const L = JSON.parse(app.ev(`JSON.stringify(skippableRels(tasks[0]))`));
    console.log(ds, 'prog', app.task(which).progress, 'skip', L[0], JSON.stringify(C.skipCh(app, which, L[0])), 'week goal', app.ev(`JSON.stringify(weekGoalsMap.get('${which}|2026-11-09'))`));
    app.view('active'); app.doc.querySelector(`[data-action="postpone-today"][data-id="${which}"]`).click(); app.doc.getElementById('pp-week').click();
    console.log('   hold', JSON.stringify(app.task(which).weekHold), 'rows', rows(ds));
    continue;
  }
  console.log(ds, 'prog', app.task(which).progress, 'skipped', JSON.stringify(app.task(which).skipped), 'status', app.snap(which).status, 'rows', rows(ds));
  app.check(which);
}
console.log('Sunday end prog', app.task(which).progress, 'goal', app.ev(`JSON.stringify(weekGoalsMap.get('${which}|2026-11-09'))`));
app.close();
