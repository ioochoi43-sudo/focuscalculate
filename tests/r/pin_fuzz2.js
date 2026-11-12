// Review fuzz 2: a pin is set, THEN something else changes (a review is added / removed, a chapter is skipped,
// the deadline moves, a 쉬는 날 is added, weekday ratios change, today is postponed for the week).
// After that the promise must still hold: pin + check as shown == twin without a pin checked at the same point,
// and tonight's plan == tomorrow morning's.
// usage: node r/pin_fuzz2.js <firstSeed> <count> [kind]
const L = require('./pin_lib');
const seed0 = parseInt(process.argv[2] || '1'), N = parseInt(process.argv[3] || '30'), onlyKind = process.argv[4] && process.argv[4] !== '-' ? process.argv[4] : null;
const KINDS = ['page', 'pageX', 'pageX', 'page', 'lecture', 'weight', 'count'];
let issues = 0, ran = 0, notes = 0; const skips = {}, opsDone = {};
const skip = (why) => { skips[why] = (skips[why] || 0) + 1; };
const txt = (el) => (el ? el.textContent.replace(/\s+/g, ' ').trim() : '');
for (let seed = seed0; seed < seed0 + N; seed++) {
  const R = L.rng(seed * 15485863 + 5);
  const kind = onlyKind || L.pick(R, KINDS);
  const start = L.pick(R, ['2026-11-02', '2026-11-04', '2026-11-07', '2026-12-21']);
  const tA = L.genTask(R, kind, 'A', start), tB = Object.assign(JSON.parse(JSON.stringify(tA)), { id: 'B', title: 'B' });
  const settings = L.genSettings(R);
  const app = L.makeApp(L.HTML, start, { 'focus-calculate-tasks-v1': [tA, tB], 'focus-calculate-settings-v1': settings });
  app.win.confirm = () => true;
  const d = app.doc, page = !!tA.itemPages, timed = !!tA.timeBased;
  const log = [];
  const tag = `seed ${seed} ${kind} ${tA.pace}${tA.reviewDays.length ? ' rv' + tA.reviewDays[0] : ''}${settings.weights.some(w => w !== 1) ? ' W' : ''}`;
  const issue = (msg) => { issues++; console.log(`ISSUE ${tag} [${log.join(' ')}]\n   ${msg}`); };
  const warm = L.ri(R, 1, 8);
  let ds = start;
  for (let i = 0; i < warm; i++) {
    app.setDay(ds);
    const a = R(), dl = page ? L.ri(R, -6, 10) || 3 : L.ri(R, -2, 3) || 1;
    const act = a < 0.72 ? 'c' : a < 0.86 ? 'd' + dl : a < 0.93 ? '-' : 'pd';
    for (const id of ['A', 'B']) {
      if (act === 'c') app.check(id);
      else if (act[0] === 'd') { const r = L.rowOf(L.st(app, id), ds); if (r) { if (page && r[8] == null) app.check(id); else L.checkAt(app, id, (page ? r[8] : r[2]) + dl); } }
      else if (act === 'pd') L.postpone(app, id, 'deadline');
    }
    log.push(act); ds = L.tmr(ds);
  }
  const d0 = ds, d1 = L.tmr(d0), d2 = L.tmr(d1);
  app.setDay(d0);
  if (app.task('A').progress >= app.task('A').total) { skip('done'); app.close(); continue; }
  { const a = L.st(app, 'A'), b = L.st(app, 'B'); if (L.rowsFrom(a, d0) !== L.rowsFrom(b, d0)) { skip('twins differ before'); app.close(); continue; } }
  const chooser = (info) => { let v = info.def + (page ? L.ri(R, -10, 14) : L.ri(R, -2, 3)); v = Math.max(info.min, Math.min(info.max, v)); if (v === info.def) v = v < info.max ? v + 1 : v - 1; return v >= info.min && v <= info.max ? v : null; };
  const mode = R() < 0.5 ? 'today' : 'tomorrow';
  const res = L.pinUI(app, 'A', mode === 'today' ? d0 : d1, chooser);
  if (!res.ok) { skip(mode + ': ' + String(res.msg).slice(0, 30)); app.close(); continue; }
  log.push(`| ${mode} @${d0} pin ${JSON.stringify(res.pin)} (plan ${res.info.def})`);
  // ---- the change, on both twins ----
  const openSave = (id, fn) => { app.view('active'); d.querySelector(`[data-action="edit"][data-id="${id}"]`).click(); fn(d); d.getElementById('e-save').click(); };
  const ops = ['end', 'off', 'ratio'];
  if (timed) ops.push('addrev', 'addrev', 'addend', 'skip', 'skip', 'delrev');
  if (mode === 'tomorrow') ops.push('pw', 'pd');
  const nOps = R() < 0.3 ? 2 : 1;
  let ppA = null, ppMismatch = false;
  for (let k = 0; k < nOps; k++) {
    const op = L.pick(R, ops), r1 = R(), r2 = R();
    let done = op;
    for (const id of ['A', 'B']) {
      const t = app.task(id);
      if (op === 'end') { openSave(id, (dd) => { dd.getElementById('e-end').value = L.addD(t.end, r1 < 0.5 ? -3 : 4); dd.getElementById('e-end').dispatchEvent(new app.win.Event('change', { bubbles: true })); }); }
      else if (op === 'off') app.ev(`(() => { if ('${id}' === 'A') { settings.offDates = [...new Set([...settings.offDates, '${L.addD(d0, 2 + Math.floor(r1 * 4))}'])]; normalizeOffLog(); persistSettings(); rerender(); } })()`);
      else if (op === 'ratio') app.ev(`(() => { if ('${id}' === 'A') { const w = settings.weights.slice(); w[${Math.floor(r1 * 7)}] = ${r2 < 0.5 ? 2 : 0.5}; const old = settings.weights; settings.wHist = (settings.wHist && settings.wHist.length ? settings.wHist : [{ from: '', w: old, dn: [] }]).concat([{ from: fmtDate(today()), w, dn: [] }]); settings.weights = w; persistSettings(); _expCache.clear(); _chapterPlanCache.clear(); rerender(); } })()`);
      else if (op === 'addrev' || op === 'addend') {
        app.view('active'); const b = d.querySelector(`[data-action="add-extra"][data-id="${id}"]`); if (!b) { done = op + ':nobtn'; continue; }
        b.click(); d.getElementById('xm-name').value = 'R' + k;
        if (d.getElementById('xm-pg')) d.getElementById('xm-pg').value = String(2 + Math.floor(r1 * 9)); else if (d.getElementById('xm-min')) d.getElementById('xm-min').value = (10 + Math.floor(r1 * 40)) + '분';
        const sel = d.getElementById('xm-at');
        if (op === 'addend') sel.value = '100000'; else sel.selectedIndex = Math.min(sel.options.length - 1, Math.floor(r2 * Math.min(4, sel.options.length)));
        done = op + '@' + sel.value;
        d.getElementById('xm-save').click();
        if (d.getElementById('extraModal').classList.contains('show')) { d.getElementById('xm-cancel').click(); done += ':refused'; }
      } else if (op === 'skip') {
        app.view('active'); const b = d.querySelector(`[data-action="skip-chapter"][data-id="${id}"]`); if (!b) { done = 'skip:nobtn'; continue; }
        b.click();
        if (!d.getElementById('skipModal').classList.contains('show')) { done = 'skip:noopen'; continue; }
        const sel = d.getElementById('sk-rel'); sel.selectedIndex = Math.min(sel.options.length - 1, Math.floor(r1 * Math.min(3, sel.options.length)));
        done = 'skip@' + sel.value; d.getElementById('sk-save').click();
        if (d.getElementById('skipModal').classList.contains('show')) { d.getElementById('sk-cancel').click(); done += ':refused'; }
      } else if (op === 'delrev') {
        app.view('active'); const bs = [...d.querySelectorAll(`[data-action="del-extra"][data-id="${id}"]`)]; if (!bs.length) { done = 'delrev:none'; continue; }
        bs[Math.min(bs.length - 1, Math.floor(r1 * bs.length))].click();
      } else if (op === 'pw' || op === 'pd') {
        // (with a pin the window may offer different choices than for the twin: do the same thing on both)
        const got = L.postpone(app, id, id === 'A' ? (op === 'pw' ? 'week' : 'deadline') : ppA);
        if (id === 'A') ppA = got; else if (got !== ppA) ppMismatch = true;
        done = op + ':' + got;
      }
    }
    log.push(done); opsDone[done.split(/[@:]/)[0]] = (opsDone[done.split(/[@:]/)[0]] || 0) + 1;
  }
  if (ppMismatch) { skip('postpone choice differs for the twin'); app.close(); continue; }
  try {
    // B has no pin: after the same change the unpinned parts must agree
    const sP = L.st(app, 'A'), sB = L.st(app, 'B');
    if (sP.sc.length) issue(`계산 점검 with the pin after the change: ${JSON.stringify(sP.sc)}`);
    if (sP.pinned && Math.abs(sP.sum - sP.left) > 0.02 && (app.task('A').skipped || []).length) { notes++; console.log(`NOTE ${tag} [${log.join(' ')}] loads ${sP.sum} != work left ${sP.left} (a skipped chapter is involved: see pin_loadskip.js)`); }
    else if (sP.pinned && Math.abs(sP.sum - sP.left) > 0.02) issue(`loads ${sP.sum} != work left ${sP.left} (pinned plan after the change)`);
    if (sP.status !== sB.status || sP.exp !== sB.exp) issue(`status differs from the twin before any check: ${sP.status}/${sB.status} ${sP.exp}/${sB.exp}`);
    if (!sP.pinned && L.rowsFrom(sP, d0) !== L.rowsFrom(sB, d0)) issue('pin not applied, yet the plan differs from the twin');
    const checkShown = (id) => { // A: press the check and save what the window shows
      app.view('active'); const btn = d.querySelector(`[data-action="toggle-today-complete"][data-id="${id}"]`);
      if (!btn) return { r: 'nobtn' }; if (btn.textContent.trim() === '✓') return { r: 'already' };
      btn.click(); if (!app.modalOpen()) return { r: 'toggle' };
      const v = parseInt(d.getElementById('cm-input').value), box = d.getElementById('cm-rev');
      const o = { r: 'modal', v, isPage: page, revShown: box.style.display !== 'none', revOn: d.getElementById('cm-rev-cb').checked };
      d.getElementById('cm-save').click(); return o;
    };
    const checkTwin = (id, o, pinVal) => { // B: the same point, typed
      if (o.r === 'nobtn' || o.r === 'already') return o.r;
      if (o.r === 'toggle') return app.check(id);
      if (o.isPage && app.ev(`(() => { const r = todayPlanRow(tasks.find(x => x.id === '${id}'), fmtDate(today())); return !r || r.pFrom == null; })()`)) return 'twin-cannot'; // the twin's day is review only: no page can be typed there
      return L.checkAt(app, id, o.v); // (a part day without pages: the card's "완료" field)
    };
    const cmpTwin = (when, dsFrom) => {
      const a = L.st(app, 'A'), b = L.st(app, 'B');
      const strip = (r) => { if (!r) return r; const o = Object.assign({}, r); delete o.pg; delete o.at; return o; };
      if (JSON.stringify(a.rec) !== JSON.stringify(b.rec)) {
        if (JSON.stringify(strip(a.rec)) === JSON.stringify(strip(b.rec))) notes++;
        else issue(`${when}: record differs from the twin\n   A ${JSON.stringify(a.rec)}\n   B ${JSON.stringify(b.rec)}`);
      }
      if (a.prog !== b.prog || a.status !== b.status || a.behind !== b.behind) issue(`${when}: progress/status differs A ${a.prog} ${a.status} ${a.behind} B ${b.prog} ${b.status} ${b.behind}`);
      else if (L.rowsFrom(a, dsFrom) !== L.rowsFrom(b, dsFrom)) issue(`${when}: plan differs from the twin\n   A ${L.rowsFrom(a, dsFrom).slice(0, 420)}\n   B ${L.rowsFrom(b, dsFrom).slice(0, 420)}`);
      return a;
    };
    if (mode === 'today') {
      const pinnedRow = (L.rowOf(sP, d0) || [])[10] === 'PIN';
      const o = checkShown('A'), cb = checkTwin('B', o);
      log.push(`chk ${JSON.stringify(o)}/${cb}${pinnedRow ? '' : ' (pin not applied)'}`);
      const a = cb === 'twin-cannot' ? L.st(app, 'A') : cmpTwin('today, after the check', d0);
      if (cb === 'twin-cannot') { skip('twin day is review only (compared shown vs after only)'); if (process.env.SHOWTC) console.log(`TC ${tag} [${log.join(' ')}] A row ${JSON.stringify(L.rowOf(sP, mode === 'today' ? d0 : d1))} B row ${JSON.stringify(L.rowOf(L.st(app, 'B'), app.today()))} A rec ${JSON.stringify(a.rec)}`); }
      if (sP.pinned && L.rowsFrom(sP, d1) !== L.rowsFrom(a, d1)) issue(`today: plan shown with the pin != plan after checking it\n   shown ${L.rowsFrom(sP, d1).slice(0, 400)}\n   after ${L.rowsFrom(a, d1).slice(0, 400)}`);
    } else {
      const c1 = app.check('A'), c2 = app.check('B');
      const sE = L.st(app, 'A');
      if (sP.pinned && L.rowsFrom(sE, d1) !== L.rowsFrom(sP, d1)) issue(`tomorrow: after doing today as planned != shown (${c1}/${c2})\n   shown ${L.rowsFrom(sP, d1).slice(0, 400)}\n   now   ${L.rowsFrom(sE, d1).slice(0, 400)}`);
      app.setDay(d1);
      const sM = L.st(app, 'A');
      if (L.rowsFrom(sM, d1) !== L.rowsFrom(sE, d1)) issue(`tomorrow: next morning != last night\n   night ${L.rowsFrom(sE, d1).slice(0, 400)}\n   now   ${L.rowsFrom(sM, d1).slice(0, 400)}`);
      const o = checkShown('A'), cb = checkTwin('B', o);
      log.push(`chk ${JSON.stringify(o)}/${cb}`);
      const a = cb === 'twin-cannot' ? L.st(app, 'A') : cmpTwin('tomorrow, after checking the pinned day', d1);
      if (cb === 'twin-cannot') { skip('twin day is review only (compared shown vs after only)'); if (process.env.SHOWTC) console.log(`TC ${tag} [${log.join(' ')}] A row ${JSON.stringify(L.rowOf(sP, mode === 'today' ? d0 : d1))} B row ${JSON.stringify(L.rowOf(L.st(app, 'B'), app.today()))} A rec ${JSON.stringify(a.rec)}`); }
      if (sM.pinned && L.rowsFrom(sM, d2) !== L.rowsFrom(a, d2)) issue(`tomorrow: plan shown that morning != after checking\n   shown ${L.rowsFrom(sM, d2).slice(0, 400)}\n   after ${L.rowsFrom(a, d2).slice(0, 400)}`);
    }
    if (app.errors.length) issue('errors: ' + app.errors.slice(0, 2).join(' / '));
    ran++;
  } catch (e) { issue('exception in the script: ' + (e && e.stack ? e.stack.split('\n').slice(0, 3).join(' | ') : e)); }
  app.close();
}
console.log(`ran ${ran} issues ${issues} notes ${notes} ops ${JSON.stringify(opsDone)} skips ${JSON.stringify(skips)}`);
