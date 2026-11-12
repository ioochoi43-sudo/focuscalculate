// Review: week goals with pins.
//  1) Sunday pinned + Monday pinned; twin Y1 checks Sunday on time, twin Y2 with "어제 했어요" on Monday:
//     Monday's automatic week goal, plans and status must be the same.
//  2) A week frozen on Monday with Monday pinned: following the shown plan reaches the goal on Sunday.
//  3) ↻ on a pinned day: following the shown plan reaches the re-frozen goal; the "지금 계획대로면" hint is where the plan really lands.
const L = require('./pin_lib');
const S = L.S;
let bad = 0;
const ok = (c, m) => { if (!c) { bad++; console.log('FAIL:', m); } else console.log('ok:', m.split('\n')[0].slice(0, 150)); };
const cnt = (id, x) => Object.assign({ id, title: id, type: 'book', total: 240, startNum: 10, progress: 0, start: '2026-11-09', end: '2026-12-10', pace: 'daily', paceValue: null, reviewDays: [], skipDates: [] }, x || {});
const KINDS = { page: (id) => S.pageTask(id), lecture: (id) => S.lectureTask(id), count: (id) => cnt(id), weight: (id) => S.weightTask(id),
  pageX: (id) => S.pageTask(id, { extras: [{ id: 'q', t: 'Q', w: 9, at: 4, u: 'pg', pg: 9, df: 'medium' }, { id: 'qe', t: 'QE', w: 5, at: 100000, u: 'pg', pg: 5, df: 'medium' }] }) };
const wk = (app, id, ws) => app.ev(`(() => { const g = weekGoalsMap.get('${id}|${ws}'); return JSON.stringify(g ? [g.from, g.to, g.amount, g.part || null, g.pFrom, g.pTo, g.rv || 0, g.fixedBy] : null); })()`);
const delta = { page: 7, pageX: 7, lecture: 1, count: 6, weight: 1 };
for (const kind of Object.keys(KINDS)) {
  for (const sign of [1, -1]) {
    if (sign < 0 && (kind === 'lecture' || kind === 'weight')) continue; // one item a day: can only pin more
    const app = L.mk([KINDS[kind]('Y1'), KINDS[kind]('Y2')]);
    const d = app.doc;
    for (const ds of L.days('2026-11-09', 6)) { app.setDay(ds); app.check('Y1'); app.check('Y2'); }
    const sun = '2026-11-15', mon = '2026-11-16', tue = '2026-11-17', ws2 = mon;
    app.setDay(sun);
    const pT = L.pinUI(app, 'Y1', sun, (i) => { const v = i.def + sign * delta[kind]; return v >= i.min && v <= i.max && v !== i.def ? v : null; });
    const tag = `${kind} ${sign > 0 ? 'more' : 'less'}`;
    if (!pT.ok) { console.log(`skip ${tag}: ${pT.msg}`); app.close(); continue; }
    L.setPin(app, 'Y2', sun, pT.pin);
    const pM = L.pinUI(app, 'Y1', mon, (i) => { const v = i.def + delta[kind]; return v <= i.max ? v : null; });
    if (pM.ok) L.setPin(app, 'Y2', mon, pM.pin);
    const sShown = L.st(app, 'Y1');
    app.check('Y1');                    // on time
    app.setDay(mon);                    // week goals freeze now (Y2: Sunday not recorded yet)
    const g2before = wk(app, 'Y2', ws2);
    app.view('today');
    const b = d.querySelector(`[data-action="yday-done"][data-id="Y2"]`);
    ok(!!b, `${tag}: 어제 box has Y2`);
    if (b) { b.click(); if (app.modalOpen()) d.getElementById('cm-save').click(); }
    const a = L.st(app, 'Y1'), c = L.st(app, 'Y2');
    ok(a.prog === c.prog && a.status === c.status && L.rowsFrom(a, mon) === L.rowsFrom(c, mon), `${tag}: late check == on time (progress ${a.prog}/${c.prog}, status ${a.status}/${c.status})\n   Y1 ${L.rowsFrom(a, mon).slice(0, 300)}\n   Y2 ${L.rowsFrom(c, mon).slice(0, 300)}`);
    ok(wk(app, 'Y1', ws2) === wk(app, 'Y2', ws2), `${tag}: Monday's week goal the same for both  ${wk(app, 'Y1', ws2)}\n   Y1 ${wk(app, 'Y1', ws2)}\n   Y2 ${wk(app, 'Y2', ws2)} (before the late check ${g2before})`);
    ok(L.rowsFrom(a, mon) === L.rowsFrom(sShown, mon), `${tag}: Monday's plan == what Sunday night showed`);
    // 2) follow the shown plan through Sunday: lands on the frozen goal
    const g = JSON.parse(wk(app, 'Y1', ws2));
    const hint0 = (() => { app.view('week'); const el = [...d.querySelectorAll('.week-goal-item')].find(x => /Y1/.test(x.querySelector('.week-goal-title').textContent)); const h = el && el.querySelector('.week-goal-hint'); return h ? h.textContent : ''; })();
    ok(!hint0, `${tag}: no "지금 계획대로면" hint right after the freeze (got "${hint0}")`);
    for (const ds of L.days(mon, 7)) { app.setDay(ds); if (app.task('Y1').progress >= app.task('Y1').total) break; app.check('Y1'); }
    const t = app.task('Y1'), endAbs = (t.startNum || 0) + t.progress;
    ok(endAbs === g[1] || t.progress >= t.total, `${tag}: followed the plan to Sunday → at ${endAbs}, the frozen goal ends at ${g[1]} ${JSON.stringify(g)}`);
    ok(app.errors.length === 0, `${tag}: no errors ${app.errors.slice(0, 2)}`);
    app.close();
  }
}
// 3) ↻ on Wednesday with Wednesday pinned
for (const kind of ['page', 'count', 'lecture']) {
  const app = L.mk([KINDS[kind]('G')]);
  const d = app.doc;
  for (const ds of L.days('2026-11-09', 2)) { app.setDay(ds); app.check('G'); }
  const wed = '2026-11-11', ws = '2026-11-09';
  app.setDay(wed);
  const g0 = wk(app, 'G', ws);
  const r = L.pinUI(app, 'G', wed, (i) => (kind === 'lecture' ? i.def + 2 : i.def - (kind === 'page' ? 3 : 5)));
  if (!r.ok) { console.log('skip', kind, r.msg); app.close(); continue; }
  app.view('week');
  const item = () => [...d.querySelectorAll('.week-goal-item')].find(x => /G/.test(x.querySelector('.week-goal-title').textContent));
  const hint = item().querySelector('.week-goal-hint') ? item().querySelector('.week-goal-hint').textContent : '';
  const live = app.ev(`(() => { const t = tasks[0]; const g = computeWeekGoal(t, '${ws}', '2026-11-15'); return JSON.stringify([g.from, g.to]); })()`);
  console.log(`[↻ ${kind}] frozen ${g0} | pin ${JSON.stringify(r.pin)} | hint: "${hint}" | live ${live}`);
  item().querySelector('[data-action="refresh-week-goal"]').click();
  const g1 = JSON.parse(wk(app, 'G', ws));
  for (const ds of L.days(wed, 5)) { app.setDay(ds); app.check('G'); }
  const t = app.task('G'), endAbs = (t.startNum || 0) + t.progress;
  ok(endAbs === g1[1], `↻ ${kind}: after ↻ with a pin and following the shown plan, Sunday ends at ${endAbs}; the re-frozen goal ends at ${g1[1]}`);
  ok(endAbs === JSON.parse(live)[1], `↻ ${kind}: the "지금 계획대로면" position (${JSON.parse(live)[1]}) is where the week really ended (${endAbs})`);
  ok(app.errors.length === 0, `↻ ${kind}: no errors`);
  app.close();
}
console.log(bad ? `FAILS ${bad}` : 'all fine');
