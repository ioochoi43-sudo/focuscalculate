// Review: does a plan with pins leave the app's state exactly as it was? (records, the "today" override, caches)
const L = require('./pin_lib');
const S = L.S;
let bad = 0;
const ok = (c, m) => { if (!c) { bad++; console.log('FAIL:', m); } else console.log('ok:', m.split('\n')[0].slice(0, 110)); };
const cnt = (id, x) => Object.assign({ id, title: id, type: 'book', total: 240, startNum: 10, progress: 0, start: '2026-11-09', end: '2026-12-10', pace: 'daily', paceValue: null, reviewDays: [], skipDates: [] }, x || {});
const EX = [{ id: 'q', t: 'Q', w: 9, at: 3, u: 'pg', pg: 9, df: 'medium' }, { id: 'qe', t: 'QE', w: 5, at: 100000, u: 'pg', pg: 5, df: 'medium' }];
const mkTasks = () => [S.pageTask('P', { extras: EX }), S.lectureTask('Lc'), cnt('N'), S.weightTask('W')];
const core = (app, id) => app.ev(`(() => { const t = tasks.find(x => x.id === '${id}'); const p = buildScheduleCore(t); return JSON.stringify([p.status, p.expectedProgress, p.behind, p.dailyNeed, p.schedule.map(s => [fmtDate(s.date), s.from, s.to, s.isPart, s.partN, s.partOf, s.partF, s.pFrom, s.pTo, s.isPast, s.isToday, s.isReview, (s.revs || []).map(x => x.id)])]); })()`);
const glob = (app) => app.ev(`JSON.stringify([_todayOverride, [...completedMap.entries()].sort(), [..._offSet].sort(), settings.weights])`);

// ---- 1) pins on, lots of rendering: state untouched; the unpinned calculation is the same as in an app that never had pins ----
{
  const A = L.mk(mkTasks()), Z = L.mk(mkTasks());
  for (const ds of L.days('2026-11-09', 4)) { for (const app of [A, Z]) { app.setDay(ds); ['P', 'Lc', 'N', 'W'].forEach(id => app.check(id)); } }
  const d0 = '2026-11-13', d1 = '2026-11-14';
  A.setDay(d0); Z.setDay(d0);
  const g0 = glob(A);
  const sP = L.st(A, 'P'), sL = L.st(A, 'Lc'), sN = L.st(A, 'N'), sW = L.st(A, 'W');
  const rT = L.rowOf(sP, d0), rM = L.rowOf(sP, d1);
  L.setPin(A, 'P', d0, { pg: rT[8] + 5 }); L.setPin(A, 'P', d1, { pg: rM[8] + 9 });
  L.setPin(A, 'Lc', d0, { to: L.rowOf(sL, d0)[2] + 1 }); L.setPin(A, 'Lc', d1, { to: L.rowOf(sL, d1)[2] + 3 });
  L.setPin(A, 'N', d0, { to: L.rowOf(sN, d0)[2] - 10 - 4 }); L.setPin(A, 'N', d1, { to: L.rowOf(sN, d1)[2] - 10 + 6 });
  L.setPin(A, 'W', d1, { to: L.rowOf(sW, d1)[2] + 1 });
  ['today', 'week', 'active'].forEach(v => A.view(v));
  ok(L.st(A, 'P').pinned && L.st(A, 'Lc').pinned && L.st(A, 'N').pinned && L.st(A, 'W').pinned, '1: pins applied on four goals');
  ok(glob(A) === g0, '1: records / today override / off days / ratios untouched after rendering every view with pins');
  ['P', 'Lc', 'N', 'W'].forEach(id => ok(core(A, id) === core(Z, id), `1: ${id}: the calculation without pins is the same as in an app that never had pins (no cache carry-over)`));
  // the windows: postpone preview, pin window, review window, skip window
  A.view('active'); A.doc.querySelector('[data-action="postpone-today"][data-id="P"]').click(); A.doc.getElementById('pp-cancel').click();
  A.ev(`openPinModal('P', '${d1}')`); A.doc.getElementById('pn-input').value = String(rM[8] + 3); A.doc.getElementById('pn-input').dispatchEvent(new A.win.Event('input', { bubbles: true })); A.doc.getElementById('pn-cancel').click();
  A.doc.querySelector('[data-action="add-extra"][data-id="P"]').click(); A.doc.getElementById('xm-pg').value = '4'; A.doc.getElementById('xm-pg').dispatchEvent(new A.win.Event('input', { bubbles: true })); A.doc.getElementById('xm-cancel').click();
  A.doc.querySelector('[data-action="skip-chapter"][data-id="P"]').click(); A.doc.getElementById('sk-cancel').click();
  A.ev('runSelfCheck && 0');
  ok(glob(A) === g0, '1: untouched after opening the postpone / pin / review / skip windows');
  ['P', 'Lc', 'N', 'W'].forEach(id => ok(core(A, id) === core(Z, id), `1: ${id}: still the same unpinned calculation after the windows`));
  // two builds don't share rows
  ok(A.ev(`(() => { const t = tasks.find(x => x.id === 'P'); const a = buildSchedule(t), b = buildSchedule(t); return a.schedule.some(x => b.schedule.includes(x)) || a.schedule.some(x => x.pinBase && b.schedule.includes(x.pinBase)); })()`) === false, '1: two builds share no row objects');
  ok(A.errors.length === 0, '1: no errors ' + A.errors.slice(0, 2));

  // ---- 2) an exception at every step of the virtual runs: state restored ----
  for (const fn of ['buildScheduleCore', 'pageCheckResult', 'pageRevBox', 'rowLoadsOf', 'getPartState', 'annotatePages', 'planChapterDays']) {
    const total = A.ev(`(() => { const o = window.${fn}; let n = 0; window.${fn} = function () { n++; return o.apply(this, arguments); }; try { buildSchedule(tasks.find(x => x.id === 'P')); } finally { window.${fn} = o; } return n; })()`);
    let leaks = 0, unpinned = 0, pinnedBack = 0;
    for (let k = 1; k <= total; k++) {
      const r = JSON.parse(A.ev(`(() => { const o = window.${fn}; let n = 0; window.${fn} = function () { n++; if (n === ${k}) throw new Error('boom'); return o.apply(this, arguments); };
        let p = null, threw = false; try { p = buildSchedule(tasks.find(x => x.id === 'P')); } catch (e) { threw = true; } finally { window.${fn} = o; }
        return JSON.stringify({ threw, pinned: !!(p && p._pinned), todayPin: !!(p && p.schedule.some(x => x.pin && x.isToday)), ov: _todayOverride }); })()`));
      if (glob(A) !== g0) { leaks++; console.log(`   leak: ${fn} call #${k}`, r); A.ev(`_todayOverride = null`); }
      if (!r.threw && !r.pinned) unpinned++; else if (!r.threw && r.pinned) pinnedBack++;
    }
    ok(leaks === 0, `2: an exception in ${fn} (each of its ${total} calls in turn): records and "today" restored  [fell back to the plan without pins ${unpinned}×, still pinned ${pinnedBack}×]`);
  }
  A.errors.length = 0;

  // ---- 3) next day: yesterday's pinned plan (어제 box) while today and tomorrow are pinned too ----
  A.setDay(d1); // nobody checked d0: P / Lc / N have yesterday's pin, today's pin (was "tomorrow"), and we add tomorrow's
  const d2 = '2026-11-15';
  const s1 = L.st(A, 'P');
  L.setPin(A, 'P', d2, { pg: L.rowOf(s1, d2)[8] + 4 });
  const g1 = glob(A);
  const y = JSON.parse(A.ev(`(() => { const t = tasks.find(x => x.id === 'P'); const r = yesterdayItem(t); return JSON.stringify(r ? { d: fmtDate(r.date), pin: r.pin || null, pTo: r.pTo, base: r.pinBase ? r.pinBase.pTo : null } : null); })()`));
  ok(y && y.d === d0 && y.pin && y.pin.pg === rT[8] + 5 && y.pTo === rT[8] + 5, '3: 어제 box row = yesterday\'s pinned row ' + JSON.stringify(y));
  ok(glob(A) === g1, '3: state untouched after yesterdayItem with three pins');
  A.view('today');
  ok(glob(A) === g1 && /직접 정함/.test(A.doc.getElementById('yesterdayBox').textContent), '3: 어제 box rendered with the pin, state untouched');
  const sT = L.st(A, 'P');
  ok(sT.pinned && L.rowOf(sT, d1)[10] === 'PIN' && L.rowOf(sT, d2)[10] === 'PIN', '3: today and tomorrow both pinned in the live plan');
  ok(A.errors.length === 0, '3: no errors ' + A.errors.slice(0, 2));
  A.close(); Z.close();
}
console.log(bad ? `FAILS ${bad}` : 'all fine');
