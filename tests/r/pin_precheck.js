// Review: tomorrow's row ticked in advance (the ✓ on the 내일 list) + tomorrow's amount pinned.
// Tonight's plan must be what the app shows tomorrow morning.
const L = require('./pin_lib');
const S = L.S;
function run(kind, mkTask) {
  const app = L.mk([mkTask('P')]);
  const d = app.doc;
  let ds = '2026-11-09', found = null;
  for (let i = 0; i < 20 && !found; i++) {
    app.setDay(ds);
    const s = L.st(app, 'P'), rM = L.rowOf(s, L.tmr(ds));
    if (rM && (kind === 'part' ? rM[3] === 1 : rM[3] === 0) && i >= 2) { found = ds; break; }
    app.check('P'); ds = L.tmr(ds);
  }
  if (!found) { console.log(kind, 'no such day found'); app.close(); return; }
  const d0 = found, d1 = L.tmr(d0), d2 = L.tmr(d1);
  app.check('P'); // today done as planned
  const s0 = L.st(app, 'P'), rM = L.rowOf(s0, d1);
  console.log(`\n[${kind}] ${d0}: tomorrow's row`, JSON.stringify(rM));
  // tick tomorrow's row in advance
  app.view('today');
  d.querySelector(`#tomorrowList [data-action="toggle-complete"][data-id="P"]`).click();
  console.log('  record stored for tomorrow by the advance tick:', app.ev(`JSON.stringify(completedMap.get('P|${d1}'))`));
  // pin tomorrow to more than planned
  const res = L.pinUI(app, 'P', d1, (info) => Math.min(info.max, info.def + 12));
  console.log('  pin window:', res.ok, JSON.stringify(res.pin), res.msg);
  const sP = L.st(app, 'P');
  console.log('  tonight, tomorrow on:', L.rowsFrom(sP, d1).slice(0, 260));
  app.setDay(d1);
  const sM = L.st(app, 'P');
  console.log('  next morning       :', L.rowsFrom(sM, d1).slice(0, 260));
  console.log('  next morning: pinned?', sM.pinned, '| record of the day', JSON.stringify(sM.rec));
  const same = L.rowsFrom(sP, d1) === L.rowsFrom(sM, d1);
  console.log(same ? '  same plan' : '  DIFFERENT: the plan shown last night is not the plan of this morning');
  app.view('today');
  const row = d.querySelector(`#todayList .agenda-item[data-id="P"]`);
  console.log('  오늘 row:', row ? row.textContent.replace(/\s+/g, ' ').trim() : '(none)');
  console.log('  errors', app.errors.slice(0, 2));
  app.close();
}
run('part', (id) => S.pageTask(id));   // tomorrow is one day of a chapter split over several days
run('whole', (id) => S.pageTask(id));  // tomorrow is a whole-chapter day
run('part', (id) => S.weightTask(id)); // 양·난이도 without pages
