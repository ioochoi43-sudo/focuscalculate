// Review fuzz for 오늘·내일 양 정하기: random goals/settings/warm-up, then
//  today:    pin (through the window) + check as shown  ==  no pin, check at that point   (twin B)
//  tomorrow: tonight's plan == after doing today as planned == next morning == after checking the pinned day (and == twin B)
// usage: node r/pin_fuzz.js <firstSeed> <count> [kind] [mode]
const L = require('./pin_lib');
const seed0 = parseInt(process.argv[2] || '1'), N = parseInt(process.argv[3] || '30'), onlyKind = process.argv[4] && process.argv[4] !== '-' ? process.argv[4] : null, onlyMode = process.argv[5] || null;
const KINDS = ['count', 'lecture', 'weight', 'page', 'pageX', 'page', 'pageX'];
let issues = 0, ran = 0, notes = 0; const skips = {};
const skip = (why) => { skips[why] = (skips[why] || 0) + 1; };
for (let seed = seed0; seed < seed0 + N; seed++) {
  const R = L.rng(seed * 7919 + 13);
  const kind = onlyKind || L.pick(R, KINDS);
  const start = L.pick(R, ['2026-11-02', '2026-11-04', '2026-11-07', '2026-12-21']);
  const tA = L.genTask(R, kind, 'A', start), tB = Object.assign(JSON.parse(JSON.stringify(tA)), { id: 'B', title: 'B' });
  const settings = L.genSettings(R);
  const app = L.makeApp(L.HTML, start, { 'focus-calculate-tasks-v1': [tA, tB], 'focus-calculate-settings-v1': settings });
  const tag = `seed ${seed} ${kind} ${tA.pace}${tA.reviewDays.length ? ' rv' + tA.reviewDays[0] : ''}${settings.weights.some(w => w !== 1) ? ' W' : ''}${tA.bufferDays ? ' buf' : ''}`;
  const log = [];
  const issue = (msg) => { issues++; console.log(`ISSUE ${tag} [${log.join(' ')}]\n   ${msg}`); };
  const page = !!tA.itemPages;
  const warm = L.ri(R, 0, 10);
  let ds = start;
  for (let i = 0; i < warm; i++) {
    app.setDay(ds);
    const a = R(), dl = page ? L.ri(R, -6, 10) || 3 : L.ri(R, -2, 3) || 1;
    let act = a < 0.66 ? 'c' : a < 0.80 ? 'd' + dl : a < 0.88 ? '-' : a < 0.94 ? 'pd' : 'pw';
    if (process.env.PW && i >= warm - 2 && R() < 0.6) act = 'pw'; // (review: 이번 주 안에 채우기 set just before the pinned days)
    for (const id of ['A', 'B']) {
      if (act === 'c') app.check(id);
      else if (act[0] === 'd') { const r = L.rowOf(L.st(app, id), ds); if (r) { const v = (page && r[8] != null ? r[8] : r[2]) + dl; if (page && r[8] == null) app.check(id); else L.checkAt(app, id, v); } }
      else if (act === 'pd') L.postpone(app, id, 'deadline');
      else if (act === 'pw') L.postpone(app, id, 'week');
    }
    log.push(act);
    ds = L.tmr(ds);
  }
  const d0 = ds, d1 = L.tmr(d0), d2 = L.tmr(d1);
  app.setDay(d0);
  if (app.task('A').progress >= app.task('A').total) { skip('done'); app.close(); continue; }
  { const a = L.st(app, 'A'), b = L.st(app, 'B'); if (L.rowsFrom(a, d0) !== L.rowsFrom(b, d0) || a.status !== b.status) { skip('twins differ before the test'); app.close(); continue; } }
  const chooser = (info) => {
    const q = R(); let v;
    if (q < 0.5) v = info.def + (page ? L.ri(R, -12, 16) : L.ri(R, -3, 4));
    else if (q < 0.7 && page) { const P = tA.itemPages; v = L.pick(R, P)[1]; }
    else if (q < 0.9) v = L.ri(R, info.min, info.max);
    else v = info.max;
    v = Math.max(info.min, Math.min(info.max, v));
    if (v === info.def) v = v < info.max ? v + 1 : v - 1;
    return v >= info.min && v <= info.max ? v : null;
  };
  const leak = (what) => {
    const b0 = L.allRecs(app); app.ev('rerender()'); const s = L.st(app, 'A'); const b1 = L.allRecs(app);
    if (b0 !== b1) issue(`${what}: completedMap changed by rendering`);
    if (s.ov) issue(`${what}: _todayOverride left set (${s.ov})`);
    if (JSON.parse(app.ev(`JSON.stringify(localStorage.getItem('focus-calculate-completed-v2'))`)) !== app.ev(`JSON.stringify([...completedMap.entries()])`)) { /* storage format may differ; checked separately */ }
    return s;
  };
  const m = R();
  const mode = onlyMode || (m < 0.4 ? 'today' : m < 0.85 ? 'tomorrow' : 'both');
  log.push('| ' + mode + ' @' + d0);
  const cmpTwin = (when, dsFrom, noPlan) => {
    const a = L.st(app, 'A'), b = L.st(app, 'B');
    const strip = (r) => { if (!r) return r; const o = Object.assign({}, r); delete o.pg; delete o.at; return o; };
    if (JSON.stringify(a.rec) !== JSON.stringify(b.rec)) {
      if (JSON.stringify(strip(a.rec)) === JSON.stringify(strip(b.rec))) { console.log(`NOTE ${tag} [${log.join(' ')}]\n   ${when}: only the page / "at" note of the record differs  A ${JSON.stringify(a.rec)}  B ${JSON.stringify(b.rec)}`); notes++; }
      else issue(`${when}: record differs from the twin\n   A ${JSON.stringify(a.rec)}\n   B ${JSON.stringify(b.rec)}`);
    }
    if (a.prog !== b.prog || a.status !== b.status || a.behind !== b.behind) issue(`${when}: progress/status differs from the twin A ${a.prog} ${a.status} ${a.behind} B ${b.prog} ${b.status} ${b.behind}`);
    else if (!noPlan && L.rowsFrom(a, dsFrom) !== L.rowsFrom(b, dsFrom)) issue(`${when}: plan differs from the twin\n   A ${L.rowsFrom(a, dsFrom).slice(0, 400)}\n   B ${L.rowsFrom(b, dsFrom).slice(0, 400)}`);
    return [a, b];
  };
  const shownVs = (what, shown, now, dsFrom, twinDrift) => {
    if (L.rowsFrom(shown, dsFrom) !== L.rowsFrom(now, dsFrom)) issue(`${what}${twinDrift ? ' (the twin without a pin also changed overnight)' : ''}\n   shown ${L.rowsFrom(shown, dsFrom).slice(0, 420)}\n   now   ${L.rowsFrom(now, dsFrom).slice(0, 420)}`);
  };
  try {
    if (mode === 'today' || mode === 'both') {
      const s0 = L.st(app, 'A');
      const res = L.pinUI(app, 'A', d0, chooser);
      if (!res.ok) { skip('today: ' + String(res.msg).slice(0, 40)); app.close(); continue; }
      log.push(`pinT ${JSON.stringify(res.pin)} (plan ${res.info.def}, ${res.info.min}~${res.info.max})`);
      const sP = leak('today pin');
      if (!sP.pinned || (L.rowOf(sP, d0) || [])[10] !== 'PIN') issue(`today: pin saved by the window but not applied ${JSON.stringify(L.rowOf(sP, d0))}`);
      if (Math.abs(sP.sum - sP.left) > 0.02) issue(`today: loads ${sP.sum} != work left ${sP.left}`);
      if (sP.sc.length) issue(`today: 계산 점검 ${JSON.stringify(sP.sc)}`);
      if (sP.status !== s0.status || sP.exp !== s0.exp) issue(`today: status changed by the pin ${s0.status}→${sP.status}`);
      let res2 = null, sP2 = sP;
      if (mode === 'both') {
        res2 = L.pinUI(app, 'A', d1, chooser);
        if (res2.ok) { log.push(`pinM ${JSON.stringify(res2.pin)} (plan ${res2.info.def})`); sP2 = leak('both pins');
          if ((L.rowOf(sP2, d1) || [])[10] !== 'PIN') issue(`both: tomorrow's pin not applied ${JSON.stringify(L.rowOf(sP2, d1))}`);
          if (Math.abs(sP2.sum - sP2.left) > 0.02) issue(`both: loads ${sP2.sum} != work left ${sP2.left}`);
          if (JSON.stringify((L.rowOf(sP2, d0) || []).slice(0, 10)) !== JSON.stringify((L.rowOf(sP, d0) || []).slice(0, 10))) issue('both: today row changed by tomorrow pin'); }
        else res2 = null;
      }
      const cA = app.check('A'), cB = L.checkAt(app, 'B', res.val);
      log.push(`chk ${cA}/${cB}`);
      const [a] = cmpTwin('today, after the check', d0, !!res2);
      shownVs('today: the plan shown with the pin != the plan after checking it', sP2, a, d1);
      app.setDay(d1);
      const a1 = L.st(app, 'A'), b1 = L.st(app, 'B');
      if (!res2) { if (L.rowsFrom(a1, d1) !== L.rowsFrom(a, d1)) issue(`today: plan changed overnight${L.rowsFrom(b1, d1) !== L.rowsFrom(L.st(app, 'B'), d1) ? '' : ''}\n   was ${L.rowsFrom(a, d1).slice(0, 300)}\n   now ${L.rowsFrom(a1, d1).slice(0, 300)}`); }
      else {
        shownVs('both: next morning != shown', sP2, a1, d1);
        const cA2 = app.check('A'), cB2 = L.checkAt(app, 'B', res2.val);
        log.push(`chk2 ${cA2}/${cB2}`);
        const [a2] = cmpTwin('both, after the 2nd check', d1);
        shownVs('both: after checking the 2nd pinned day != shown', sP2, a2, d2);
      }
    } else {
      const todayFirst = R() < 0.4;
      if (todayFirst) { app.check('A'); app.check('B'); log.push('today done first'); }
      const s0 = L.st(app, 'A');
      const res = L.pinUI(app, 'A', d1, chooser);
      if (!res.ok) { skip('tomorrow: ' + String(res.msg).slice(0, 40)); app.close(); continue; }
      log.push(`pinM ${JSON.stringify(res.pin)} (plan ${res.info.def}, ${res.info.min}~${res.info.max})`);
      const sP = leak('tomorrow pin');
      if (!sP.pinned || (L.rowOf(sP, d1) || [])[10] !== 'PIN') issue(`tomorrow: pin saved by the window but not applied ${JSON.stringify(L.rowOf(sP, d1))}`);
      if (Math.abs(sP.sum - sP.left) > 0.02) issue(`tomorrow: loads ${sP.sum} != work left ${sP.left}`);
      if (sP.sc.length) issue(`tomorrow: 계산 점검 ${JSON.stringify(sP.sc)}`);
      if (sP.status !== s0.status || sP.exp !== s0.exp) issue(`tomorrow: status changed by the pin`);
      if (JSON.stringify((L.rowOf(sP, d0) || []).slice(0, 10)) !== JSON.stringify((L.rowOf(s0, d0) || []).slice(0, 10))) issue('tomorrow: today row changed by the pin');
      if (!todayFirst) { const c1 = app.check('A'), c2 = app.check('B'); log.push(`chkT ${c1}/${c2}`); }
      const sE = L.st(app, 'A'), bE = L.st(app, 'B');
      shownVs('tomorrow: after doing today as planned != shown', sP, sE, d1);
      app.setDay(d1);
      const sM = L.st(app, 'A'), bM = L.st(app, 'B');
      shownVs('tomorrow: next morning != shown', sP, sM, d1, L.rowsFrom(bM, d1) !== L.rowsFrom(bE, d1));
      const cA = app.check('A'), cB = L.checkAt(app, 'B', res.val);
      log.push(`chk ${cA}/${cB}`);
      const [a] = cmpTwin('tomorrow, after checking the pinned day', d1);
      shownVs('tomorrow: after checking the pinned day != shown', sP, a, d2);
      app.setDay(d2);
      const a2 = L.st(app, 'A');
      if (L.rowsFrom(a2, d2) !== L.rowsFrom(a, d2)) issue(`tomorrow: plan changed the night after\n   was ${L.rowsFrom(a, d2).slice(0, 300)}\n   now ${L.rowsFrom(a2, d2).slice(0, 300)}`);
    }
    if (app.errors.length) issue('errors: ' + app.errors.slice(0, 2).join(' / '));
    ran++;
  } catch (e) { issue('exception in the script: ' + (e && e.stack ? e.stack.split('\n').slice(0, 3).join(' | ') : e)); }
  app.close();
}
console.log(`ran ${ran} issues ${issues} notes ${notes} skips ${JSON.stringify(skips)}`);
