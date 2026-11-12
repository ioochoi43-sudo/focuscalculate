// Review: follow the shown plan from the first day to the end, setting today's and/or tomorrow's amount on random days
// (through the window, then checking as shown). Every morning: the plan is what was shown the night before, 계산 점검 is
// clean, the loads add up to the work left, pages don't overlap, every review not done yet is in some row; finished by the deadline.
// usage: node r/pin_follow.js <firstSeed> <count> [kind]
const L = require('./pin_lib');
const seed0 = parseInt(process.argv[2] || '1'), N = parseInt(process.argv[3] || '20'), onlyKind = process.argv[4] || null;
const KINDS = ['count', 'lecture', 'weight', 'page', 'pageX', 'page', 'pageX'];
let issues = 0, ran = 0, pinsSet = 0, revMissing = 0, loadSkip = 0; const firstRev = [];
for (let seed = seed0; seed < seed0 + N; seed++) {
  const R = L.rng(seed * 2654435761 % 4294967291 + 3);
  const kind = onlyKind || L.pick(R, KINDS);
  const start = L.pick(R, ['2026-11-02', '2026-11-05', '2026-12-14']);
  const t0 = L.genTask(R, kind, 'F', start);
  const settings = L.genSettings(R);
  if (R() < 0.3) settings.offDates = [L.addD(start, L.ri(R, 3, 12)), L.addD(start, L.ri(R, 13, 22))];
  const app = L.makeApp(L.HTML, start, { 'focus-calculate-tasks-v1': [t0], 'focus-calculate-settings-v1': settings });
  const page = !!t0.itemPages;
  const tag = `seed ${seed} ${kind} ${t0.pace}${t0.reviewDays.length ? ' rv' + t0.reviewDays[0] : ''}${settings.weights.some(w => w !== 1) ? ' W' : ''}${settings.offDates.length ? ' off' : ''}${t0.bufferDays ? ' buf' + t0.bufferDays : ''}`;
  const hist = [];
  const issue = (msg) => { issues++; console.log(`ISSUE ${tag} [${hist.slice(-6).join(' ')}]\n   ${msg}`); };
  const planEnd = app.ev(`planEndStr(tasks[0])`);
  const chooser = (info) => { const q = R(); let v = q < 0.75 ? info.def + (page ? L.ri(R, -10, 14) : L.ri(R, -3, 4)) : L.ri(R, info.min, Math.min(info.max, info.def + (page ? 40 : 12))); v = Math.max(info.min, Math.min(info.max, v)); if (v === info.def) v = v < info.max ? v + 1 : v - 1; return v >= info.min && v <= info.max ? v : null; };
  const extra = () => JSON.parse(app.ev(`(() => { const t = tasks[0]; const p = buildSchedule(t); const fut = p.schedule.filter(s => !s.isPast && !s.isReview);
    const pend = (t.extras || []).filter(x => !extraDone(t, x) && extraW(t, x, skippedSet(t)) > 0 && !fut.some(s => (s.revs || []).some(y => y.id === x.id))).map(x => x.t);
    let ov = 0; const P = fut.filter(s => s.pFrom != null); for (let i = 1; i < P.length; i++) if (P[i].pFrom <= P[i - 1].pTo) ov++;
    const lastD = fut.length ? fmtDate(fut[fut.length - 1].date) : null, lastTo = fut.length ? fut[fut.length - 1].to : null;
    return JSON.stringify({ pend, ov, lastD, lastTo, end: (t.startNum || 0) + t.total, sk: (t.skipped || []).length }); })()`));
  let prev = null, doneAt = null, i = 0;
  for (const ds of L.days(start, 70)) {
    app.setDay(ds); i++;
    const t = app.task('F');
    if (t.progress >= t.total) { doneAt = doneAt || L.addD(ds, -1); break; }
    const s = L.st(app, 'F'), x = extra();
    if (prev && L.rowsFrom(s, ds) !== prev) issue(`${ds}: the plan changed overnight\n   was ${prev.slice(0, 330)}\n   now ${L.rowsFrom(s, ds).slice(0, 330)}`);
    if (s.sc.length) issue(`${ds}: 계산 점검 ${JSON.stringify(s.sc)}`);
    if (Math.abs(s.sum - s.left) > 0.02) { if (x.sk) loadSkip++; else issue(`${ds}: loads ${s.sum} != work left ${s.left}`); }
    if (x.ov) issue(`${ds}: page ranges overlap`);
    if (x.lastD && x.lastD > planEnd) issue(`${ds}: last row ${x.lastD} after the plan end ${planEnd}`);
    if (x.lastTo != null && x.lastTo !== x.end && s.rows.length) issue(`${ds}: last row ends at ${x.lastTo}, not ${x.end}`);
    if (x.pend.length) { revMissing++; if (firstRev.length < 3) firstRev.push(`${tag} ${ds}: review ${x.pend.join(',')} in no row · pins ${JSON.stringify(s.pins)} · rows ${JSON.stringify(s.rows.slice(0, 3))}`); }
    if (s.status === 'overdue') issue(`${ds}: overdue`);
    // today: maybe set the amount
    const q = R();
    if (q < 0.3 && !(s.pins && s.pins[ds])) { const r = L.pinUI(app, 'F', ds, chooser); if (r.ok) { pinsSet++; hist.push(`${ds.slice(5)}:T${JSON.stringify(r.pin)}`); const sp = L.st(app, 'F'), xp = extra();
      if (Math.abs(sp.sum - sp.left) > 0.02) { if (xp.sk) loadSkip++; else issue(`${ds}: loads ${sp.sum} != work left ${sp.left} right after pinning today`); }
      if (sp.sc.length) issue(`${ds}: 계산 점검 after pinning today ${JSON.stringify(sp.sc)}`);
      if (xp.pend.length) { revMissing++; if (firstRev.length < 3) firstRev.push(`${tag} ${ds}: after pinning today, review ${xp.pend.join(',')} in no row · rows ${JSON.stringify(sp.rows.slice(0, 3))}`); } } }
    const shown = L.st(app, 'F');
    const c = app.check('F');
    const after = L.st(app, 'F');
    if (shown.pinned && L.rowsFrom(shown, L.tmr(ds)) !== L.rowsFrom(after, L.tmr(ds))) issue(`${ds}: plan shown with the pin != after checking it (${c})\n   shown ${L.rowsFrom(shown, L.tmr(ds)).slice(0, 330)}\n   after ${L.rowsFrom(after, L.tmr(ds)).slice(0, 330)}`);
    if (app.task('F').progress >= app.task('F').total) { doneAt = ds; break; }
    // tomorrow: maybe set the amount
    if (R() < 0.3) { const r = L.pinUI(app, 'F', L.tmr(ds), chooser); if (r.ok) { pinsSet++; hist.push(`${ds.slice(5)}:M${JSON.stringify(r.pin)}`); } }
    prev = L.rowsFrom(L.st(app, 'F'), L.tmr(ds));
  }
  if (!doneAt || doneAt > t0.end) issue(`not finished by the deadline: done ${doneAt}, deadline ${t0.end} (plan end ${planEnd})`);
  if (app.errors.length) issue('errors: ' + app.errors.slice(0, 2).join(' / '));
  ran++;
  app.close();
}
console.log(`ran ${ran} goals to the end, pins set ${pinsSet}, issues ${issues} | mornings with a pending review in no row: ${revMissing} | load mismatches with a skipped chapter: ${loadSkip}`);
firstRev.forEach(x => console.log('  e.g. ' + x.slice(0, 500)));
