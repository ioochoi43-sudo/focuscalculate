// Review helpers for 오늘·내일 양 정하기 (day pins). Not part of the app.
const C = require('./common');
const { makeApp, HTML } = C;
function rng(seed) { let a = seed >>> 0; return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const days = C.days;
const tmr = (ds) => days(ds, 2)[1];
const DS = { easy: 1, medium: 2, hard: 3 }, AS = { low: 1, medium: 2, high: 3 };
const PW = { easy: 2 / 3, medium: 1, hard: 4 / 3 };
const pw = (a, b, d) => Math.round((b - a + 1) * (PW[d] || 1) * 100) / 100;
const pick = (R, arr) => arr[Math.floor(R() * arr.length)];
const ri = (R, a, b) => a + Math.floor(R() * (b - a + 1));
function addD(ds, n) { const d = new Date(ds + 'T12:00:00'); d.setDate(d.getDate() + n); return d.toISOString().slice(0, 10); }
// random task of a kind (deadline mode)
function genTask(R, kind, id, start) {
  const base = { id, title: id, startNum: 0, progress: 0, start, end: addD(start, ri(R, 24, 45)), pace: 'daily', paceValue: null, reviewDays: [], skipDates: [] };
  const paceR = R();
  if (paceR < 0.15) base.pace = 'every-other';
  else if (paceR < 0.3) { base.pace = 'weekly-n'; base.paceValue = ri(R, 3, 6); }
  else if (paceR < 0.45) { base.pace = 'custom-days'; base.paceValue = [1, 2, 3, 4, 5, 6, 0].filter(() => R() < 0.7); if (base.paceValue.length < 3) base.paceValue = [1, 3, 5]; }
  if (R() < 0.3) { const rd = ri(R, 0, 6); if (!(base.pace === 'custom-days' && base.paceValue.length <= 3)) base.reviewDays = [rd]; }
  if (R() < 0.2) base.bufferDays = ri(R, 1, 3);
  if (kind === 'count') return Object.assign(base, { type: 'book', total: ri(R, 60, 400), startNum: pick(R, [0, 10, 100]) });
  if (kind === 'lecture') { const n = ri(R, 12, 30); return Object.assign(base, { type: 'lecture', total: n, timeBased: true, timeMode: 'deadline', lectureDurations: Array.from({ length: n }, () => ri(R, 12, 85)) }); }
  if (kind === 'weight') {
    const n = ri(R, 8, 16), diffs = Array.from({ length: n }, () => pick(R, ['easy', 'medium', 'hard'])), amts = Array.from({ length: n }, () => pick(R, ['low', 'medium', 'high']));
    const idays = Array.from({ length: n }, () => (R() < 0.2 ? ri(R, 2, 3) : 0));
    return Object.assign(base, { type: 'book', total: n, timeBased: true, timeMode: 'deadline', lectureDurations: diffs.map((d, i) => DS[d] * AS[amts[i]]), itemDifficulty: diffs, itemAmount: amts, itemDays: idays.some(v => v) ? idays : undefined });
  }
  // page kinds
  const n = ri(R, 6, 12), P = []; let p = pick(R, [1, 1, 5, 20]);
  for (let i = 0; i < n; i++) { const len = R() < 0.15 ? ri(R, 1, 3) : ri(R, 4, 38); P.push([p, p + len - 1]); p += len; }
  const diffs = Array.from({ length: n }, () => pick(R, ['easy', 'medium', 'hard']));
  const t = Object.assign(base, { type: 'book', total: n, timeBased: true, timeMode: 'deadline', lectureDurations: P.map((q, i) => pw(q[0], q[1], diffs[i])), itemDifficulty: diffs, itemAmount: diffs.map(() => 'medium'), itemPages: P });
  if (R() < 0.3) { const idays = Array.from({ length: n }, () => (R() < 0.2 ? ri(R, 2, 3) : 0)); if (idays.some(v => v)) t.itemDays = idays; }
  if (kind === 'pageX') {
    const ex = [];
    if (R() < 0.8) { const at = ri(R, 1, n - 1), pg = ri(R, 2, 12); ex.push({ id: 'q' + id, t: 'Q', w: pg, at, u: 'pg', pg, df: 'medium' }); }
    if (R() < 0.5) { const pg = ri(R, 2, 9); ex.push({ id: 'e' + id, t: 'QE', w: pg, at: 100000, u: 'pg', pg, df: 'medium' }); }
    if (R() < 0.5) { const k = ri(R, 1, n - 2); if (!ex.some(x => x.at === k)) { t.skipped = [k]; ex.push({ id: 'k' + id, t: (k + 1) + '장', w: t.lectureDurations[k], at: 100000, sk: k }); } }
    if (ex.length) t.extras = ex;
  }
  return t;
}
function genSettings(R) {
  const s = { avail: null, weights: [1, 1, 1, 1, 1, 1, 1], offDates: [], wHist: [], offLog: {}, ppRuleFrom: '2026-10-01' };
  if (R() < 0.35) s.weights = Array.from({ length: 7 }, () => pick(R, [1, 1, 1, 2, 0.5]));
  return s;
}
const STATE = (id) => `(() => { const t = tasks.find(x => x.id === '${id}'); const p = buildSchedule(t); const tS = fmtDate(today());
  const fut = p.schedule.filter(s => !s.isPast && !s.isReview);
  const ld = dayLoadsOf(t, p); let sum = 0; ld.forEach(v => { sum += v; });
  let left;
  if (isTimeBasedTask(t)) { const pre = getDurationPrefix(t), sn = t.startNum || 0, a = fwdRel(t, Math.min(getTodayAnchor(t), t.progress));
    left = pre[t.total] - pre[a] - (a < t.total ? (pre[a + 1] - pre[a]) * getPartState(t, sn + a + 1, tS).frac : 0); }
  else left = t.total - Math.min(getTodayAnchor(t), t.progress);
  return JSON.stringify({ prog: t.progress, status: p.status, behind: p.behind, exp: p.expectedProgress, rec: completedMap.get(t.id + '|' + tS) || null,
    rows: fut.map(s => [fmtDate(s.date), s.from, s.to, s.isPart ? 1 : 0, s.partN, s.partOf, s.partF !== undefined ? Math.round(s.partF * 1e6) / 1e6 : null, s.pFrom, s.pTo, (s.revs || []).map(x => x.t).join('+'), s.pin ? 'PIN' : '']),
    sum: Math.round(sum * 100) / 100, left: Math.round(left * 100) / 100, pinned: !!p._pinned, sc: selfCheckTask(t), ov: _todayOverride,
    pins: t.dayPins || null }); })()`;
const st = (app, id) => JSON.parse(app.ev(STATE(id)));
const rowsFrom = (s, ds) => JSON.stringify(s.rows.filter(r => r[0] >= ds).map(r => r.slice(0, 10)));
const rowOf = (s, ds) => s.rows.find(r => r[0] === ds) || null;
const recsOf = (app, id) => app.ev(`JSON.stringify([...completedMap.entries()].filter(([k]) => k.startsWith('${id}|')).sort())`);
const allRecs = (app) => app.ev(`JSON.stringify([...completedMap.entries()].sort())`);
const setPin = (app, id, ds, pin) => app.ev(`(() => { const t = tasks.find(x => x.id === '${id}'); t.dayPins = Object.assign({}, t.dayPins || {}); ${pin ? `t.dayPins['${ds}'] = ${JSON.stringify(pin)};` : `delete t.dayPins['${ds}']; if (!Object.keys(t.dayPins).length) delete t.dayPins;`} persistTasks(); rerender(); })()`);
// set a pin through the window (as the user would): returns { ok, v, msg }
function pinUI(app, id, ds, v) {
  const d = app.doc;
  app.ev(`openPinModal('${id}', '${ds}')`);
  const m = d.getElementById('pinModal');
  if (!m.classList.contains('show')) return { ok: false, msg: 'noopen:' + d.getElementById('toast').textContent };
  const title = d.getElementById('pn-title').textContent, isT = ds === app.today();
  if ((isT && !/오늘/.test(title)) || (!isT && !/내일/.test(title))) { d.getElementById('pn-cancel').click(); return { ok: false, msg: 'otherday:' + title }; }
  const inp = d.getElementById('pn-input');
  const info = { def: parseInt(inp.value), min: parseInt(inp.min), max: parseInt(inp.max) };
  const val = typeof v === 'function' ? v(info) : v;
  if (val == null) { d.getElementById('pn-cancel').click(); return { ok: false, msg: 'noval', info }; }
  inp.value = String(val); inp.dispatchEvent(new app.win.Event('input', { bubbles: true }));
  const prev = d.getElementById('pn-preview').textContent;
  d.getElementById('pn-save').click();
  if (m.classList.contains('show')) { d.getElementById('pn-cancel').click(); return { ok: false, msg: 'notsaved:' + prev, info, val }; }
  const pins = app.task(id).dayPins || {};
  return { ok: !!pins[ds], pin: pins[ds], val, info, msg: d.getElementById('toast').textContent, prev };
}
function postpone(app, id, mode) {
  app.view('active');
  const b = app.doc.querySelector(`[data-action="postpone-today"][data-id="${id}"]`);
  if (!b) return 'nobtn';
  b.click();
  const w = app.doc.getElementById('pp-week');
  if (mode === 'week' && w && w.style.display !== 'none') { w.click(); return 'week'; }
  app.doc.getElementById('pp-deadline').click(); return 'deadline';
}
// check B at absolute value v without a pin (page modal / number modal / the card field for a part day)
function checkAt(app, id, v) {
  const t = app.task(id), page = !!(t.timeBased && t.itemPages);
  const r = JSON.parse(app.ev(`(() => { const t = tasks.find(x => x.id === '${id}'); const r = todayPlanRow(t, fmtDate(today())); return JSON.stringify(r ? { part: !!r.isPart, pf: r.pFrom } : null); })()`));
  if (!page && r && r.part) { app.view('active'); const inp = app.doc.querySelector(`[data-action="update-progress"][data-id="${id}"]`); inp.value = String(v); inp.dispatchEvent(new app.win.Event('change', { bubbles: true })); return 'field'; }
  return app.check(id, { page: v });
}
module.exports = Object.assign({}, C, { rng, days, tmr, addD, pick, ri, genTask, genSettings, st, rowsFrom, rowOf, recsOf, allRecs, setPin, pinUI, postpone, checkAt, pw });
