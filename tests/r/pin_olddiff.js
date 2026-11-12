// Review: goals WITHOUT pins — the new file must behave exactly like the last released one (40b753b),
// including the refactored page check (commitPageCheck / openPageCheckModal → pageCheckResult / pageRevBox).
// Random goals, random days (check as planned, another page with the 복습 box either way, nothing, postpone,
// 어제 했어요 with a page, uncheck); after every action: records, goals, plans and the check window's texts compared.
// usage: node r/pin_olddiff.js <firstSeed> <count>      (needs tests/out/old_40b753b.html: git show 40b753b:index.html)
const path = require('path'), fs = require('fs'), cp = require('child_process');
const L = require('./pin_lib');
const OLD = path.join(__dirname, '..', 'out', 'old_40b753b.html');
if (!fs.existsSync(OLD)) fs.writeFileSync(OLD, cp.execSync('git show 40b753b:index.html', { cwd: path.join(__dirname, '..', '..'), maxBuffer: 1 << 26 }));
const seed0 = parseInt(process.argv[2] || '1'), N = parseInt(process.argv[3] || '20');
const KINDS = ['page', 'pageX', 'pageX', 'page', 'weight', 'lecture', 'count'];
let issues = 0, checks = 0, pageChecks = 0;
const snapAll = (app) => app.ev(`JSON.stringify({ recs: [...completedMap.entries()].sort(), tasks: tasks.map(t => { const o = Object.assign({}, t); delete o.preEdit; if (o.rebase) o.rebase = Object.assign({}, o.rebase); if (o.ppUndo) o.ppUndo = { date: o.ppUndo.date, hold: o.ppUndo.hold }; if (o.extras) o.extras = o.extras.map(x => Object.assign({}, x, { id: 0 })); return o; }),
  plans: tasks.map(t => { const p = buildSchedule(t); return [p.status, p.expectedProgress, p.behind, p.missingTime, p.dailyNeed, p.capacityFinishDate ? fmtDate(p.capacityFinishDate) : null, p.schedule.map(s => [fmtDate(s.date), s.from, s.to, s.isPart, s.partN, s.partOf, s.partF, s.pFrom, s.pTo, s.pText, s.isPast, s.isToday, s.isReview, s.isCatchUp, (s.revs || []).map(x => x.t)]), [...dayLoadsOf(t, p).entries()]]; }),
  wk: [...weekGoalsMap.entries()].map(([k, v]) => [k, v.from, v.to, v.amount, v.part, v.pFrom, v.pTo]).sort(), sc: tasks.map(t => selfCheckTask(t)) })`);
const txt = (el) => (el ? el.textContent.replace(/\s+/g, ' ').trim() : '');
function drive(app, id, a) { // one action → what the windows showed
  const d = app.doc, out = { act: a.k };
  const modal = () => {
    if (!app.modalOpen()) return false;
    const inp = d.getElementById('cm-input');
    out.dflt = inp.value; out.min = inp.min; out.max = inp.max; out.sub = txt(d.getElementById('cm-sub')); out.chips = txt(d.getElementById('cm-quick')); out.label = txt(d.getElementById('cm-label'));
    if (a.v != null) { inp.value = String(a.v); if (inp.oninput) inp.oninput(); }
    else if (a.dv) { inp.value = String(parseInt(inp.value) + a.dv); if (inp.oninput) inp.oninput(); }
    const box = d.getElementById('cm-rev'), cb = d.getElementById('cm-rev-cb');
    out.helper = txt(d.getElementById('cm-helper')); out.revShown = !!(box && box.style.display !== 'none'); out.revOn = !!(cb && cb.checked); out.revTxt = out.revShown ? txt(d.getElementById('cm-rev-txt')) : '';
    if (a.rev != null && out.revShown) { cb.checked = !!a.rev; if (cb.onchange) cb.onchange(); out.helper2 = txt(d.getElementById('cm-helper')); }
    if (a.time) d.getElementById('cm-time').value = a.time;
    d.getElementById('cm-save').click();
    out.toast = txt(d.getElementById('toast'));
    return true;
  };
  if (a.k === 'check' || a.k === 'dev') {
    app.view(a.agenda ? 'today' : 'active');
    const btn = a.agenda ? d.querySelector(`#todayList [data-action="toggle-complete"][data-id="${id}"][data-review="false"]`) : d.querySelector(`[data-action="toggle-today-complete"][data-id="${id}"]`);
    if (!btn) { out.r = 'nobtn'; return out; }
    out.was = btn.textContent.trim();
    btn.click();
    out.r = modal() ? 'modal' : 'toggle';
  } else if (a.k === 'pp') out.r = L.postpone(app, id, a.mode);
  else if (a.k === 'yday') {
    app.view('today');
    const b = d.querySelector(`[data-action="yday-done"][data-id="${id}"]`);
    if (!b) { out.r = 'nobtn'; return out; }
    b.click(); out.r = modal() ? 'modal' : 'direct';
  } else if (a.k === 'ydayundo') { app.view('today'); const b = d.querySelector(`[data-action="yday-undo"][data-id="${id}"]`); if (b) { b.click(); out.r = 'undo'; } else out.r = 'nobtn'; }
  else if (a.k === 'field') { app.view('active'); const inp = d.querySelector(`[data-action="update-progress"][data-id="${id}"]`); if (inp) { inp.value = String(parseInt(inp.value) + a.dv); inp.dispatchEvent(new app.win.Event('change', { bubbles: true })); out.r = 'field'; } }
  return out;
}
for (let seed = seed0; seed < seed0 + N; seed++) {
  const R = L.rng(seed * 104729 + 7);
  const start = L.pick(R, ['2026-11-02', '2026-11-05', '2026-12-21']);
  const ts = [];
  for (let i = 0; i < 3; i++) {
    const kind = L.pick(R, KINDS), t = L.genTask(R, kind, 'T' + i, start);
    if (t.timeBased && R() < 0.3) { t.timeMode = 'capacity'; const tot = t.lectureDurations.reduce((a, b) => a + b, 0); t.dailyMinutes = Math.max(1, Math.round(tot / L.ri(R, 12, 30))); }
    ts.push(t);
  }
  const settings = L.genSettings(R);
  if (R() < 0.3) settings.ppRuleFrom = L.addD(start, L.ri(R, 2, 8));
  const seedData = () => ({ 'focus-calculate-tasks-v1': JSON.parse(JSON.stringify(ts)), 'focus-calculate-settings-v1': JSON.parse(JSON.stringify(settings)) });
  const A = L.makeApp(OLD, start, seedData()), B = L.makeApp(L.HTML, start, seedData());
  const tag = `seed ${seed} [${ts.map(t => (t.itemPages ? (t.extras || t.skipped ? 'pageX' : 'page') : t.timeBased ? (t.type === 'lecture' ? 'lecture' : 'weight') : 'count') + (t.timeMode === 'capacity' ? '/cap' : '')).join(', ')}]`;
  let stop = false; const hist = [];
  const cmp = (what) => {
    const a = snapAll(A), b = snapAll(B);
    if (a !== b) {
      issues++; stop = true;
      const ja = JSON.parse(a), jb = JSON.parse(b); let where = '';
      for (const k of Object.keys(ja)) if (JSON.stringify(ja[k]) !== JSON.stringify(jb[k])) { const sa = JSON.stringify(ja[k]), sb = JSON.stringify(jb[k]); let i = 0; while (i < sa.length && sa[i] === sb[i]) i++; where = `${k}: …${sa.slice(Math.max(0, i - 120), i + 160)}\n      vs …${sb.slice(Math.max(0, i - 120), i + 160)}`; break; }
      console.log(`ISSUE ${tag} ${what}: old and new differ\n   history ${hist.slice(-8).join(' ')}\n   ${where}`);
    }
  };
  const days = L.days(start, L.ri(R, 6, 16));
  for (const ds of days) {
    if (stop) break;
    A.setDay(ds); B.setDay(ds);
    cmp(`${ds} morning`);
    for (let i = 0; i < ts.length && !stop; i++) {
      const id = 'T' + i, q = R();
      let acts = [];
      if (q < 0.10) acts.push(R() < 0.6 ? { k: 'yday', v: null, dv: R() < 0.4 ? L.ri(R, -5, 8) : 0, rev: R() < 0.3 ? R() < 0.5 : null } : { k: 'ydayundo' });
      const z = R();
      if (z < 0.5) acts.push({ k: 'check', agenda: R() < 0.3, time: R() < 0.2 ? '40분' : null });
      else if (z < 0.78) acts.push({ k: 'dev', dv: L.ri(R, -9, 14) || 2, rev: R() < 0.5 ? R() < 0.5 : null, agenda: R() < 0.3 });
      else if (z < 0.84) acts.push({ k: 'pp', mode: R() < 0.5 ? 'week' : 'deadline' });
      else if (z < 0.88) acts.push({ k: 'field', dv: L.ri(R, -1, 2) || 1 });
      if (R() < 0.12) acts.push({ k: 'check' }); // again: un-check (or re-check)
      for (const a of acts) {
        const ra = drive(A, id, a), rb = drive(B, id, a);
        checks++; if (ra.r === 'modal' && /페이지/.test(ra.label || '')) pageChecks++;
        hist.push(`${ds.slice(5)}:${id}:${a.k}${a.dv ? a.dv : ''}${a.rev != null ? (a.rev ? '+r' : '-r') : ''}`);
        if (JSON.stringify(ra) !== JSON.stringify(rb)) { issues++; stop = true; console.log(`ISSUE ${tag} ${ds} ${id} ${JSON.stringify(a)}: the windows differ\n   old ${JSON.stringify(ra)}\n   new ${JSON.stringify(rb)}`); break; }
        cmp(`${ds} ${id} after ${JSON.stringify(a)}`);
        if (stop) break;
      }
    }
  }
  const ea = A.errors.length, eb = B.errors.length;
  if (ea !== eb) { issues++; console.log(`ISSUE ${tag}: errors old ${ea} new ${eb}: ${B.errors.slice(0, 2).join(' / ')}`); }
  A.close(); B.close();
}
console.log(`actions ${checks} (page checks ${pageChecks}) issues ${issues}`);
