const L = require('./lib');
const { mk, days, follow, ok } = L;
const { weightTask, pageTask } = require('./seed');
const fut = (app, id, from) => app.snap(id).rows.filter(r => r[0] >= from).map(r => r.slice(0, 9).join(' ')).join('|');
const ps = (app, rel) => JSON.parse(app.ev(`JSON.stringify(getPartState(tasks[0], ${rel} + 1, fmtDate(addDays(today(), 1))))`));
for (const [name, mkT] of [['weight', () => weightTask('C')], ['pages', () => pageTask('C')], ['pagesCap', () => pageTask('C', { timeMode: 'capacity', dailyMinutes: 9 })]]) {
  const app = mk([mkT()]);
  let nd = null;
  const isPartToday = () => JSON.parse(app.ev(`(() => { const r = todayPlanRow(tasks[0], fmtDate(today())); return JSON.stringify(!!(r && r.isPart && r.partN > 1)); })()`));
  for (const ds of days('2026-11-09', 25)) { app.setDay(ds); if (isPartToday()) { nd = ds; break; } app.check('C'); }
  ok(!!nd, name + ': found a part day (not the first)');
  // check today's part day, then skip the chapter
  app.check('C');
  const k = app.task('C').progress;
  const frBefore = ps(app, k).frac;
  app.view('active'); app.win.confirm = () => true;
  app.doc.querySelector('[data-action="skip-chapter"][data-id="C"]').click(); app.doc.getElementById('sk-save').click();
  const t = app.task('C');
  ok(t.skipped && t.skipped.includes(k), name + ': skipped after checking today');
  const card = app.cardText('C');
  ok(/오늘 몫 완료/.test(card) && !/진행 예정/.test(card.split('회당')[0]), name + ': today stays checked: ' + card.slice(0, 160));
  const tmr = days(app.today(), 2)[1];
  const planTmr = fut(app, 'C', tmr);
  app.setDay(tmr);
  ok(fut(app, 'C', tmr) === planTmr, name + ': plan unchanged overnight');
  const sc = JSON.parse(app.ev(`JSON.stringify(selfCheckTask(tasks[0]))`));
  ok(sc.length === 0, name + ': 계산 점검 clean ' + JSON.stringify(sc));
  // follow to the end
  follow(app, ['C'], tmr, 45);
  ok(app.task('C').progress === app.task('C').total, name + ': finished');
  app.close();
}
// uncheck after skipping: rf grows back to match the records
{
  const app = mk([weightTask('C')]);
  const isPartToday = () => JSON.parse(app.ev(`(() => { const r = todayPlanRow(tasks[0], fmtDate(today())); return JSON.stringify(!!(r && r.isPart && r.partN > 1)); })()`));
  for (const ds of days('2026-11-09', 25)) { app.setDay(ds); if (isPartToday()) break; app.check('C'); }
  app.check('C');
  const k = app.task('C').progress;
  app.view('active'); app.win.confirm = () => true;
  app.doc.querySelector('[data-action="skip-chapter"][data-id="C"]').click(); app.doc.getElementById('sk-save').click();
  const rf1 = app.task('C').extras.find(x => x.sk === k).rf;
  app.view('active'); app.doc.querySelector('[data-action="toggle-today-complete"][data-id="C"]').click(); // uncheck
  const rf2 = app.task('C').extras.find(x => x.sk === k).rf;
  const left = JSON.parse(app.ev(`chapterLeftFrac(tasks[0], ${k})`));
  ok(rf2 > rf1 && Math.abs(rf2 - left) < 1e-3, `uncheck: rf ${rf1} → ${rf2} (left ${left})`);
  app.close();
}
console.log('passes', L.stats().passes, 'fails', L.stats().fails);
