// 오늘·내일 양 정하기 — engine checks (pins set directly on the task; the modal is tested in pinui.js)
const L = require('./lib');
const { mk, days, inv, ok } = L;
const { pageTask, lectureTask, weightTask } = require('./seed');
const cnt = (id, x) => Object.assign({ id, title: id, type: 'book', total: 240, startNum: 10, progress: 0, start: '2026-11-09', end: '2026-12-10', pace: 'daily', paceValue: null, reviewDays: [], skipDates: [] }, x || {});
const EX = [{ id: 'q', t: 'Q', w: 9, at: 3, u: 'pg', pg: 9, df: 'medium' }, { id: 'qe', t: 'QE', w: 5, at: 100000, u: 'pg', pg: 5, df: 'medium' }];
const KINDS = {
  count: (id) => cnt(id),
  countW: (id) => cnt(id, { pace: 'weekly-n', paceValue: 5 }),
  lecture: (id) => lectureTask(id),
  weight: (id) => weightTask(id),
  page: (id) => pageTask(id),
  pageX: (id) => pageTask(id, { extras: EX, skipped: [5] , }),
  pageEO: (id) => pageTask(id, { pace: 'every-other', reviewDays: [0], end: '2027-01-10' }),
};
// 건너뛴 챕터가 있는 pageX는 sk 항목도 필요
KINDS.pageX = (id) => pageTask(id, { skipped: [5], extras: EX.concat([{ id: 'k5', t: '6장', w: 25, at: 100000, sk: 5 }]) });
const setPin = (app, id, ds, pin) => app.ev(`(() => { const t = tasks.find(x => x.id === '${id}'); t.dayPins = Object.assign({}, t.dayPins || {}); ${pin ? `t.dayPins['${ds}'] = ${JSON.stringify(pin)};` : `delete t.dayPins['${ds}'];`} persistTasks(); rerender(); })()`);
const st = (app, id) => JSON.parse(app.ev(`(() => { const t = tasks.find(x => x.id === '${id}'); const p = buildSchedule(t); const tS = fmtDate(today());
  const fut = p.schedule.filter(s => !s.isPast && !s.isReview);
  const ld = dayLoadsOf(t, p); let sum = 0; ld.forEach(v => { sum += v; });
  let left = t.total - t.progress;
  if (isTimeBasedTask(t)) { const pre = getDurationPrefix(t), sn = t.startNum || 0, a = fwdRel(t, Math.min(getTodayAnchor(t), t.progress));
    left = pre[t.total] - pre[a] - (a < t.total ? (pre[a + 1] - pre[a]) * getPartState(t, sn + a + 1, tS).frac : 0); }
  else left = t.total - Math.min(getTodayAnchor(t), t.progress);
  return JSON.stringify({ prog: t.progress, status: p.status, behind: p.behind, exp: p.expectedProgress, rec: completedMap.get(t.id + '|' + tS) || null,
    rows: fut.map(s => [fmtDate(s.date), s.from, s.to, s.isPart ? 1 : 0, s.partN, s.partOf, s.partF !== undefined ? Math.round(s.partF * 1e6) / 1e6 : null, s.pFrom, s.pTo, (s.revs || []).map(x => x.t).join('+'), s.pin ? 'PIN' : '']),
    sum: Math.round(sum * 100) / 100, left: Math.round(left * 100) / 100, pinned: !!p._pinned, sc: selfCheckTask(t), reached: hasPages(t) ? pageReachedNow(t) : null }); })()`));
const rowsFrom = (s, ds) => JSON.stringify(s.rows.filter(r => r[0] >= ds).map(r => r.slice(0, 10)));
const tmr = (ds) => days(ds, 2)[1];
// a pin target for today's row: delta in pages (page goals) or items
function target(app, id, s, ds, delta) {
  const r = s.rows.find(x => x[0] === ds); if (!r) return null;
  const t = app.task(id), page = !!(t.timeBased && t.itemPages);
  if (page) { if (r[7] == null) return null; const last = t.itemPages[t.total - 1][1]; let v = Math.max(r[7], Math.min(last, r[8] + delta));
    (t.skipped || []).forEach(k => { const q = t.itemPages[k]; if (v >= q[0] && v <= q[1]) v = Math.min(last, q[1] + 3); }); // not a page inside a skipped chapter
    return v === r[8] ? null : { pin: { pg: v }, val: v, page: true }; }
  const sn = t.startNum || 0, v = Math.max(r[1], Math.min(sn + t.total, r[2] + delta));
  return v === r[2] ? null : { pin: { to: v - sn }, val: v, page: false };
}

// ---------- T1/T2: pin today then check as shown == no pin, check there; and the shown plan holds ----------
for (const kind of Object.keys(KINDS)) {
  for (const [delta, warm] of [[-3, 3], [4, 3], [-1, 9], [9, 6], [-12, 12], [15, 15]]) {
    const app = mk([KINDS[kind]('A'), KINDS[kind]('B')]);
    let dsN = null;
    for (const ds of days('2026-11-09', warm)) { app.setDay(ds); app.check('A'); app.check('B'); dsN = ds; }
    const d0 = tmr(dsN); app.setDay(d0);
    const s0 = st(app, 'A');
    const tg = target(app, 'A', s0, d0, delta);
    if (!tg) { app.close(); continue; }
    setPin(app, 'A', d0, tg.pin);
    const sP = st(app, 'A');
    const tag = `${kind} Δ${delta} @${d0}`;
    if (!sP.pinned) { console.log('note: pin not applied', tag, JSON.stringify(tg), JSON.stringify(s0.rows.slice(0, 2))); app.close(); continue; }
    const rP = sP.rows.find(x => x[0] === d0);
    ok(rP && rP[10] === 'PIN', `${tag}: today's row is pinned ${JSON.stringify(rP)}`);
    ok(Math.abs(sP.sum - sP.left) < 0.02, `${tag}: loads add up to the work left (${sP.sum} vs ${sP.left})`);
    ok(sP.sc.length === 0, `${tag}: 계산 점검 clean with a pin ${JSON.stringify(sP.sc)}`);
    ok(sP.status === s0.status && sP.exp === s0.exp, `${tag}: status untouched by setting a pin`);
    // A: check as shown.  B: no pin, check at the same point
    const cA = app.check('A');
    let cB;
    if (!tg.page && (s0.rows.find(x => x[0] === d0) || [])[3]) { // a part day without pages has no number to type: the card's "완료" field
      app.view('active'); const inp = app.doc.querySelector('[data-action="update-progress"][data-id="B"]'); inp.value = String(tg.val); inp.dispatchEvent(new app.win.Event('change', { bubbles: true })); cB = 'field';
    } else cB = app.check('B', { page: tg.val });
    const a = st(app, 'A'), b = st(app, 'B');
    ok(JSON.stringify(a.rec) === JSON.stringify(b.rec), `${tag}: same record\n   A ${JSON.stringify(a.rec)}\n   B ${JSON.stringify(b.rec)} (${cA}/${cB})`);
    ok(a.prog === b.prog && a.status === b.status && a.behind === b.behind, `${tag}: same progress/status A ${a.prog} ${a.status} B ${b.prog} ${b.status}`);
    ok(rowsFrom(a, d0) === rowsFrom(b, d0), `${tag}: same plan after\n   A ${rowsFrom(a, d0).slice(0, 300)}\n   B ${rowsFrom(b, d0).slice(0, 300)}`);
    ok(rowsFrom(sP, tmr(d0)) === rowsFrom(a, tmr(d0)), `${tag}: the plan shown with the pin == the plan after checking it\n   shown ${rowsFrom(sP, tmr(d0)).slice(0, 300)}\n   after ${rowsFrom(a, tmr(d0)).slice(0, 300)}`);
    // next morning: unchanged
    const d1 = tmr(d0); app.setDay(d1);
    const a1 = st(app, 'A');
    ok(rowsFrom(a1, d1) === rowsFrom(a, d1), `${tag}: unchanged overnight`);
    app.close();
  }
}
console.log('after T1/T2', JSON.stringify(L.stats()));

// ---------- T3: tomorrow pinned: tonight's plan == what really happens ----------
for (const kind of Object.keys(KINDS)) {
  for (const [delta, warm, todayFirst] of [[-4, 4, false], [6, 4, true], [-2, 10, true], [10, 8, false]]) {
    const app = mk([KINDS[kind]('A')]);
    let dsN = null;
    for (const ds of days('2026-11-09', warm)) { app.setDay(ds); app.check('A'); dsN = ds; }
    const d0 = tmr(dsN), d1 = tmr(d0), d2 = tmr(d1); app.setDay(d0);
    if (todayFirst) app.check('A'); // plan tomorrow after finishing today
    const s0 = st(app, 'A');
    const tg = target(app, 'A', s0, d1, delta);
    const tag = `${kind} tomorrow Δ${delta} @${d0}${todayFirst ? ' (today done)' : ''}`;
    if (!tg) { app.close(); continue; }
    setPin(app, 'A', d1, tg.pin);
    const sP = st(app, 'A');
    if (!sP.pinned) { console.log('note: pin not applied', tag); app.close(); continue; }
    const rM = sP.rows.find(x => x[0] === d1);
    ok(rM && rM[10] === 'PIN', `${tag}: tomorrow's row is pinned ${JSON.stringify(rM)}`);
    ok(rowsFrom(sP, d0).split(JSON.stringify(d0)).length <= 2, `${tag}: one row for today`);
    ok(Math.abs(sP.sum - sP.left) < 0.02, `${tag}: loads add up (${sP.sum} vs ${sP.left})`);
    ok(sP.sc.length === 0, `${tag}: 계산 점검 clean ${JSON.stringify(sP.sc)}`);
    const todayRowBefore = JSON.stringify((s0.rows.find(x => x[0] === d0) || []).slice(0, 10)), todayRowNow = JSON.stringify((sP.rows.find(x => x[0] === d0) || []).slice(0, 10));
    ok(todayRowBefore === todayRowNow, `${tag}: today's row not changed by tomorrow's pin`);
    if (!todayFirst) app.check('A');
    const sE = st(app, 'A'); // evening: today done as planned
    ok(rowsFrom(sE, d1) === rowsFrom(sP, d1), `${tag}: after doing today as planned, tomorrow on is as shown\n   shown ${rowsFrom(sP, d1).slice(0, 300)}\n   now   ${rowsFrom(sE, d1).slice(0, 300)}`);
    app.setDay(d1);
    const sM = st(app, 'A'); // next morning: the pin is today's
    ok(rowsFrom(sM, d1) === rowsFrom(sP, d1), `${tag}: next morning the same plan\n   shown ${rowsFrom(sP, d1).slice(0, 300)}\n   now   ${rowsFrom(sM, d1).slice(0, 300)}`);
    app.check('A');
    const sD = st(app, 'A');
    ok(rowsFrom(sD, d2) === rowsFrom(sP, d2), `${tag}: after checking the pinned day, the rest is as shown\n   shown ${rowsFrom(sP, d2).slice(0, 300)}\n   now   ${rowsFrom(sD, d2).slice(0, 300)}`);
    app.close();
  }
}
console.log('after T3', JSON.stringify(L.stats()));

// ---------- T4: follow the plan with a pin now and then → every invariant, done by the deadline ----------
for (const kind of Object.keys(KINDS)) {
  const app = mk([KINDS[kind]('F')]);
  let prev = null, i = 0, doneAt = null;
  const end = app.task('F').end;
  for (const ds of days('2026-11-09', 70)) {
    app.setDay(ds); i++;
    const s = st(app, 'F'); const t = app.task('F');
    if (t.progress >= t.total) { doneAt = doneAt || ds; break; }
    if (prev) ok(rowsFrom(s, ds) === prev, `follow ${kind} ${ds}: plan unchanged overnight\n   was ${prev.slice(0, 260)}\n   now ${rowsFrom(s, ds).slice(0, 260)}`);
    ok(Math.abs(s.sum - s.left) < 0.02, `follow ${kind} ${ds}: loads add up (${s.sum} vs ${s.left})`);
    ok(s.sc.length === 0, `follow ${kind} ${ds}: 계산 점검 ${JSON.stringify(s.sc)}`);
    inv(app, 'F', `follow ${kind} ${ds}`);
    // every 3rd day pin today, every 4th pin tomorrow (alternating less/more)
    if (i % 3 === 0) { const tg = target(app, 'F', s, ds, i % 2 ? -5 : 7); if (tg) setPin(app, 'F', ds, tg.pin); }
    app.check('F');
    const s2 = st(app, 'F');
    if (i % 4 === 0) { const tg = target(app, 'F', s2, tmr(ds), i % 8 ? 6 : -4); if (tg) setPin(app, 'F', tmr(ds), tg.pin); }
    prev = rowsFrom(st(app, 'F'), tmr(ds));
    if (app.task('F').progress >= app.task('F').total) { doneAt = ds; break; }
  }
  ok(!!doneAt && doneAt <= end, `follow ${kind}: finished ${doneAt} by ${end}`);
  if (app.errors.length) console.log('errors', kind, app.errors.slice(0, 2));
  ok(app.errors.length === 0, `follow ${kind}: no errors`);
  app.close();
}
console.log('after T4', JSON.stringify(L.stats()));

// ---------- T5: pins that can't apply are ignored; other rules ----------
{
  const app = mk([pageTask('C', { timeMode: 'capacity', dailyMinutes: 9 }), lectureTask('L'), cnt('N')]);
  const d0 = '2026-11-09';
  const base = { C: st(app, 'C'), L: st(app, 'L'), N: st(app, 'N') };
  setPin(app, 'C', d0, { pg: 20 });
  ok(!st(app, 'C').pinned && rowsFrom(st(app, 'C'), d0) === rowsFrom(base.C, d0), 'T5: 하루 가능 시간 기준 goal ignores pins');
  setPin(app, 'L', d0, { to: 0 }); ok(!st(app, 'L').pinned, 'T5: pin 0 ignored');
  setPin(app, 'L', d0, { pg: 5 }); ok(!st(app, 'L').pinned, 'T5: page pin on a non-page goal ignored');
  setPin(app, 'L', '2026-11-20', { to: 9 }); ok(!st(app, 'L').pinned && rowsFrom(st(app, 'L'), d0) === rowsFrom(base.L, d0), 'T5: a pin for another day does nothing');
  // already checked today → today's pin does nothing
  app.check('N'); const n1 = st(app, 'N'); setPin(app, 'N', d0, { to: 3 });
  ok(!st(app, 'N').pinned && rowsFrom(st(app, 'N'), d0) === rowsFrom(n1, d0), 'T5: today checked → pin for today ignored');
  // postponing clears today's pin
  setPin(app, 'L', d0, { to: 4 }); ok(st(app, 'L').pinned, 'T5: lecture pin applies');
  app.view('active'); app.doc.querySelector('[data-action="postpone-today"][data-id="L"]').click(); app.doc.getElementById('pp-deadline').click();
  ok(!(app.task('L').dayPins || {})[d0], "T5: postponing clears the pin of today");
  // reload keeps pins; old pins are pruned
  setPin(app, 'N', '2026-11-10', { to: 60 });
  setPin(app, 'N', '2026-11-01', { to: 5 });
  app.setDay('2026-11-10');
  ok(!(app.task('N').dayPins || {})['2026-11-01'] && (app.task('N').dayPins || {})['2026-11-10'], 'T5: old pins pruned, current kept ' + JSON.stringify(app.task('N').dayPins));
  ok(JSON.stringify(JSON.parse(app.ev(`JSON.stringify(sanitizeTask(Object.assign({}, tasks.find(x => x.id === 'N'), { dayPins: { '2026-11-10': { to: 60 }, bad: { to: 1 }, '2026-11-11': { pg: -2 }, '2026-11-12': 5 } })).dayPins)`))) === '{"2026-11-10":{"to":60}}', 'T5: sanitize keeps valid pins only');
  ok(app.errors.length === 0, 'T5: no errors ' + app.errors.slice(0, 2));
  app.close();
}
// ---------- T6: yesterday's pinned plan in the 어제 box; late check == on time ----------
for (const kind of ['page', 'lecture', 'count']) {
  const app = mk([KINDS[kind]('Y1'), KINDS[kind]('Y2')]);
  for (const ds of days('2026-11-09', 3)) { app.setDay(ds); app.check('Y1'); app.check('Y2'); }
  const d0 = '2026-11-12', d1 = tmr(d0); app.setDay(d0);
  const tg = target(app, 'Y1', st(app, 'Y1'), d0, kind === 'lecture' ? 2 : -3); // (one lecture a day: can only pin more)
  setPin(app, 'Y1', d0, tg.pin); setPin(app, 'Y2', d0, tg.pin);
  app.check('Y1');                      // on time, as shown
  app.setDay(d1);                       // Y2 forgot
  app.view('today');
  const b = app.doc.querySelector('[data-action="yday-done"][data-id="Y2"]');
  ok(!!b, `T6 ${kind}: yesterday button`);
  const txt = b ? b.closest('.agenda-item').textContent.replace(/\s+/g, ' ') : '';
  ok(/직접 정함/.test(txt), `T6 ${kind}: yesterday box shows the pinned row: ${txt}`);
  if (b) { b.click(); if (app.modalOpen()) app.doc.getElementById('cm-save').click(); }
  const a = st(app, 'Y1'), c = st(app, 'Y2');
  ok(a.prog === c.prog && a.status === c.status && rowsFrom(a, d1) === rowsFrom(c, d1), `T6 ${kind}: late check == on time (${a.prog}/${c.prog} ${a.status}/${c.status})`);
  app.close();
}
console.log('passes', L.stats().passes, 'fails', L.stats().fails);
