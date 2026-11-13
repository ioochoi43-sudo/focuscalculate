// "정리 전과 100% 같은가" 기록기 (계산 정리용 — CLAUDE.md 11장)
// Uses the app at random but repeatably (check, less/more, 미루기, 어제 체크, 수정, 복습, 건너뛰기, 양 정하기,
// 쉬는 날, 요일 비율, 일시중단 …). Every morning and evening it records everything the app worked out:
// the saved data, every plan in full, loads, week goals, and the text of every screen.
// Two versions of the app that record the same thing compute the same thing.
//   node t/trace.js <html> <firstSeed> <count>        → {"seed|day|am": "data.plans.screens" (short hashes), …}
//   node t/trace.js <html> <seed> 1 full              → the full values (to look at a difference)
const crypto = require('crypto');
const { makeApp } = require('./h');
const L = require('../r/pin_lib');
const html = process.argv[2], seed0 = parseInt(process.argv[3] || '1'), count = parseInt(process.argv[4] || '1'), FULL = process.argv[5] === 'full';
const sha = (s) => crypto.createHash('sha1').update(String(s)).digest('hex').slice(0, 10);
const norm = (s) => String(s).replace(/v4\.[\d.]+ · 최근 업데이트 \d{4}-\d\d-\d\d/g, 'V');

// everything the app computes for every goal, as one JSON string per goal
const DUMP = `(() => {
  const row = (s) => { if (!s) return null; const o = {}; Object.keys(s).sort().forEach(k => { const v = s[k];
    if (k === 'date') o.date = fmtDate(v); else if (k === 'revs') o.revs = (v || []).map(x => x.id); else if (k === 'pinBase') o.pinBase = row(v); else o[k] = v; }); return o; };
  const planOf = (p) => { const o = {}; Object.keys(p).sort().forEach(k => { const v = p[k];
    if (k === 'schedule') o.schedule = v.map(row);
    else if (k === 'allDates' || k === 'remainingDates') o[k] = v.map(fmtDate).join(',');
    else if (k === '_base') o._base = { status: v.status, rows: v.schedule.map(row) };
    else if (v instanceof Date) o[k] = fmtDate(v); else o[k] = v; }); return o; };
  const tdy = today(), ws = fmtDate(startOfWeek(tdy)), we = fmtDate(addDays(startOfWeek(tdy), 6)), ws2 = fmtDate(addDays(startOfWeek(tdy), 7)), we2 = fmtDate(addDays(startOfWeek(tdy), 13));
  const tS = fmtDate(tdy), mS = fmtDate(addDays(tdy, 1));
  const out = {};
  tasks.forEach(t => {
    const o = {};
    const safe = (k, f) => { try { o[k] = f(); } catch (e) { o[k] = 'ERR ' + (e && e.message); } };
    let p = null;
    safe('plan', () => { p = buildSchedule(t); return planOf(p); });
    if (p) {
      safe('loads', () => [...dayLoadsOf(t, p).entries()]);
      safe('minutes', () => [taskMinutesOn(t, p, tS), taskMinutesOn(t, p, mS), itemTimeText(t, p, tS), itemTimeText(t, p, mS)]);
      safe('pace', () => { const a = actualPace(t, p); return a ? Object.assign({}, a, { finish: a.finish ? fmtDate(a.finish) : a.finish }) : a; });
      safe('risk', () => (t.archived ? null : riskReasons(t, p)));
      safe('need', () => dailyNeedHtml(t, p));
      safe('multi', () => multiDayNoteHtml(t, p));
    }
    safe('core', () => (t.dayPins ? planOf(buildScheduleCore(t)) : null));
    safe('week', () => [computeWeekGoal(t, ws, we), computeWeekGoal(t, ws2, we2), computeWeekGoal(t, ws, we, tS)]);
    safe('yday', () => row(yesterdayItem(t)));
    safe('self', () => selfCheckTask(t));
    safe('anchor', () => [getTodayAnchor(t), todayCountsAsSession(t), pinnable(t), hasPages(t) ? pageReachedNow(t) : null, ydayLocked(t), ydayPending(t)]);
    safe('extras', () => (t.extras || []).map(x => [x.id, extraW(t, x), extraPos(t, x), extraDone(t, x), extraDeletable(t, x)]));
    safe('skippable', () => (isTimeBasedTask(t) ? skippableRels(t) : null));
    safe('pp', () => { if (t.archived || t.paused || t.progress >= t.total) return null;
      return ['deadline', 'week'].map(m => { const q = previewPostpone(t, m); return { goal: q.goal, wl: q.weekDaysLeft, al: q.anyDaysLeft, status: q.plan.status, rows: q.plan.schedule.filter(x => !x.isPast).map(row) }; }); });
    out[t.id] = JSON.stringify(o);
  });
  return JSON.stringify(out);
})()`;
const LS = `JSON.stringify(['focus-calculate-tasks-v1', 'focus-calculate-completed-v2', 'focus-calculate-weekgoals-v1', 'focus-calculate-categories-v1', 'focus-calculate-settings-v1', 'focus-calculate-sort'].map(k => localStorage.getItem(k)))`;

const out = {};
for (let seed = seed0; seed < seed0 + count; seed++) {
  const R = L.rng(seed * 2654435761 + 97), RA = L.rng(seed * 40503 + 11);
  const pick = (a) => L.pick(R, a), ri = (a, b) => L.ri(R, a, b);
  const start = pick(['2026-11-02', '2026-11-05', '2026-11-07', '2026-12-14', '2026-12-21']);
  // ---- goals ----
  const KINDS = ['count', 'lecture', 'weight', 'page', 'pageX', 'pageX', 'lectureC', 'weightC', 'pageC', 'pageXC'];
  const T = [];
  for (let i = 0; i < 4; i++) {
    const k = pick(KINDS), cap = /C$/.test(k), id = 'g' + i;
    const t = L.genTask(R, k.replace(/C$/, ''), id, R() < 0.25 ? L.addD(start, -ri(1, 6)) : start);
    if (R() < 0.35) t.end = L.addD(t.start, ri(9, 20));
    if (t.timeBased && R() < 0.3) t.startNum = pick([2, 10, 40]);
    if (cap) {
      const sum = t.lectureDurations.reduce((a, b) => a + b, 0), nd = Math.max(1, Math.round((new Date(t.end) - new Date(t.start)) / 864e5 * (t.pace === 'daily' ? 1 : 0.6)));
      t.timeMode = 'capacity'; t.dailyMinutes = Math.max(1, Math.round(sum / nd * pick([0.7, 1, 1.3, 2])));
    }
    if (R() < 0.2) t.minPerUnit = t.type === 'lecture' ? undefined : pick([2, 5, 12]);
    if (!cap && R() < 0.12) { // data from before weekSkips existed: a postponed day inside a week hold
      const dow = new Date(start + 'T12:00:00').getDay(), mon = L.addD(start, dow === 0 ? -6 : 1 - dow);
      if (t.start <= start) { t.skipDates = [start]; t.weekHold = { weekStart: mon, endAbs: (t.startNum || 0) + Math.max(1, Math.round(t.total * 0.12)) }; }
    }
    T.push(t);
  }
  const settings = L.genSettings(R);
  if (R() < 0.3) settings.offDates = [L.addD(start, ri(2, 9)), L.addD(start, ri(10, 20))].sort();
  if (R() < 0.25) settings.ppRuleFrom = L.addD(start, ri(5, 12)); // earlier postpones follow the old rule
  if (R() < 0.3) settings.avail = [0, 120, 120, 90, 120, 60, 180];
  const app = makeApp(html, start, { 'focus-calculate-tasks-v1': T, 'focus-calculate-settings-v1': settings }, { random: RA });
  app.win.confirm = () => R() < 0.9;
  app.win.alert = () => {};
  const d = app.doc, ids = T.map(t => t.id);
  const fire = (el, type) => el.dispatchEvent(new app.win.Event(type, { bubbles: true }));
  const setV = (el, v) => { if (!el) return; el.value = String(v); fire(el, 'input'); fire(el, 'change'); };
  const shown = (id) => d.getElementById(id).classList.contains('show');
  const toast = () => (d.getElementById('toast') ? d.getElementById('toast').textContent : '');
  const closeAll = () => { // nothing may stay open into the next step
    [['completeModal', 'cm-cancel'], ['editModal', 'e-cancel'], ['extraModal', 'xm-cancel'], ['skipModal', 'sk-cancel'], ['pinModal', 'pn-cancel'], ['postponeModal', 'pp-cancel'], ['settingsModal', 'set-cancel']]
      .forEach(([m, c]) => { const el = d.getElementById(m); if (el && el.classList.contains('show')) { const b = d.getElementById(c); if (b) b.click(); el.classList.remove('show'); } });
    // (jsdom only: the edit window's long lists stay in the page and make every later screen update slow — the app refills them when it opens)
    ['e-durationsList', 'e-namesList'].forEach(x => { const el = d.getElementById(x); if (el && el.firstChild) el.innerHTML = ''; });
  };
  const card = (id, action) => { app.view('active'); return d.querySelector(`[data-action="${action}"][data-id="${id}"]`); };
  const mt = (id) => { const el = d.getElementById(id); return el ? '#' + sha(norm(el.textContent.replace(/\s+/g, ' '))).slice(0, 6) : '#?'; }; // what a window said (its numbers are worked out by the app)
  // today's check on the card (as h.js check), also noting what the window showed; sometimes with a 걸린 시간
  const check = (id, mode) => {
    const btn = card(id, 'toggle-today-complete');
    if (!btn) return 'nobtn';
    if (btn.textContent.trim() === '✓') return 'already';
    btn.click();
    if (!shown('completeModal')) return 'part';
    const inp = d.getElementById('cm-input');
    if (mode && mode.page != null) inp.value = String(mode.page);
    else if (mode && mode.delta) inp.value = String(parseInt(inp.value) + mode.delta);
    if (inp.oninput) inp.oninput();
    if (mode && mode.rev != null) { const cb = d.getElementById('cm-rev-cb'); if (cb) { cb.checked = !!mode.rev; if (cb.onchange) cb.onchange(); } }
    if (R() < 0.15) d.getElementById('cm-time').value = pick(['20분', '45분', '1시간 10분']);
    const m = mt('completeModal');
    d.getElementById('cm-save').click();
    return 'ok' + m;
  };
  const postpone = (id, mode) => {
    const b = card(id, 'postpone-today'); if (!b) return 'nobtn';
    b.click(); if (!shown('postponeModal')) return 'noopen';
    const m = mt('postponeModal'), w = d.getElementById('pp-week');
    if (mode === 'week' && w && w.style.display !== 'none') { w.click(); return 'week' + m; }
    d.getElementById('pp-deadline').click(); return 'deadline' + m;
  };
  const rowT = (id) => JSON.parse(app.ev(`(() => { const t = tasks.find(x => x.id === '${id}'); const r = todayPlanRow(t, fmtDate(today())); return JSON.stringify(r ? { from: r.from, to: r.to, part: !!r.isPart, pf: r.pFrom, pt: r.pTo } : null); })()`));
  const edit = (id, fn) => {
    const b = card(id, 'edit'); if (!b) return 'nobtn';
    b.click(); if (!shown('editModal')) return 'noopen';
    fn(app.task(id));
    if (R() < 0.3) { const c = d.querySelector(`#e-apply-timing-row .chip[data-apply="${pick(['keep', 'reset'])}"]`); if (c) c.click(); }
    try { app.ev(`updateDailyNeed('e')`); } catch (e) {} // (the app updates this line a moment later; here: now)
    const m0 = '#' + sha(norm(['e-dailyNeed', 'e-durationsPreview', 'e-currentPos-helper'].map(x => (d.getElementById(x) ? d.getElementById(x).textContent : '')).join('|'))).slice(0, 6);
    d.getElementById('e-save').click();
    if (shown('editModal')) { const m = toast(); d.getElementById('e-cancel').click(); return 'refused:' + m.slice(0, 20); }
    return 'ok' + m0;
  };
  const settingsDo = (fn) => { d.getElementById('btn-settings').click(); if (!shown('settingsModal')) return 'noopen'; fn(); d.getElementById('set-save').click(); return shown('settingsModal') ? 'stuck' : 'ok'; };
  const PRE = {
    addrev(id, t) { if (!t.timeBased) return '-';
      const b = card(id, 'add-extra'); if (!b) return 'nobtn'; b.click(); if (!shown('extraModal')) return 'noopen';
      d.getElementById('xm-name').value = 'R' + ri(1, 99);
      if (d.getElementById('xm-pg') && d.getElementById('xm-pg').offsetParent !== undefined) setV(d.getElementById('xm-pg'), ri(2, 11));
      if (d.getElementById('xm-min')) setV(d.getElementById('xm-min'), ri(10, 50) + '분');
      if (d.getElementById('xm-df')) d.getElementById('xm-df').value = pick(['easy', 'medium', 'hard']);
      if (d.getElementById('xm-am')) d.getElementById('xm-am').value = pick(['low', 'medium', 'high']);
      const sel = d.getElementById('xm-at'); sel.selectedIndex = R() < 0.35 ? sel.options.length - 1 : Math.min(sel.options.length - 1, ri(0, 4));
      const at = sel.value + mt('extraModal'); fire(sel, 'change'); d.getElementById('xm-save').click();
      if (shown('extraModal')) { d.getElementById('xm-cancel').click(); return 'refused@' + at; } return '@' + at; },
    delrev(id) { app.view('active'); const bs = [...d.querySelectorAll(`[data-action="del-extra"][data-id="${id}"]`)]; if (!bs.length) return 'none'; const b = pick(bs); const x = b.dataset.x; b.click(); return x; },
    skip(id, t) { if (!t.timeBased) return '-';
      const b = card(id, 'skip-chapter'); if (!b) return 'nobtn'; b.click(); if (!shown('skipModal')) return 'noopen';
      const sel = d.getElementById('sk-rel'); sel.selectedIndex = Math.min(sel.options.length - 1, R() < 0.5 ? 0 : ri(0, 3)); const v = sel.value; fire(sel, 'change');
      const m = mt('skipModal'); d.getElementById('sk-save').click(); if (shown('skipModal')) { d.getElementById('sk-cancel').click(); return 'refused@' + v + m; } return '@' + v + m; },
    skipback(id) { app.view('active'); const bs = [...d.querySelectorAll(`[data-action="skip-back"][data-id="${id}"]`)]; if (!bs.length) return 'none'; const b = pick(bs); const v = b.dataset.rel; b.click(); return v; },
    pin(id, t, ds) { const tm = R() < 0.5 ? ds : L.tmr(ds), pg = !!(t.timeBased && t.itemPages);
      const r = L.pinUI(app, id, tm, (info) => { if (isNaN(info.def)) return null; let v = info.def + (pg ? ri(-12, 14) : ri(-2, 3)); v = Math.max(info.min, Math.min(info.max, v)); return isNaN(v) ? null : v; });
      return (tm === ds ? 'T' : 'M') + (r.ok ? JSON.stringify(r.pin) : ':' + String(r.msg).slice(0, 16)) + '#' + sha(String(r.prev || '')).slice(0, 6); },
    unpin(id, t) { if (!t.dayPins) return 'none'; app.ev(`openPinModal('${id}')`); if (!shown('pinModal')) return 'noopen'; const b = d.getElementById('pn-clear'); if (b && b.style.display !== 'none') { b.click(); return 'cleared'; } d.getElementById('pn-cancel').click(); return 'nobtn'; },
    editEnd(id) { return edit(id, (t) => setV(d.getElementById('e-end'), L.addD(t.end, pick([-5, -2, 3, 8])))); },
    editStart(id) { return edit(id, (t) => setV(d.getElementById('e-start'), L.addD(t.start, pick([-3, 2])))); },
    editDaily(id, t) { if (t.timeMode !== 'capacity') return '-'; return edit(id, (t2) => setV(d.getElementById('e-dailyMinutes'), Math.max(1, Math.round(t2.dailyMinutes * pick([0.6, 0.8, 1.3, 1.8]))))); },
    editPace(id) { return edit(id, () => { const p = pick(['daily', 'every-other', 'weekly-n', 'custom-days']); d.querySelector(`#e-pace-row .chip[data-pace="${p}"]`).click();
      if (p === 'weekly-n') setV(d.getElementById('e-weekly-n-val'), ri(3, 6));
      if (p === 'custom-days') [...d.querySelectorAll('#e-day-toggles .day-toggle')].forEach(b => { if (R() < 0.45) b.click(); }); }); },
    editBuffer(id) { return edit(id, () => setV(d.getElementById('e-buffer'), ri(0, 3))); },
    editReview(id) { return edit(id, () => { const bs = [...d.querySelectorAll('#e-review-toggles .review-toggle')]; pick(bs).click(); }); },
    editTo(id, t) { if (t.timeBased) return '-'; return edit(id, (t2) => setV(d.getElementById('e-to'), (t2.startNum || 0) + t2.total + pick([-20, -5, 10, 30]))); },
    editPos(id) { return edit(id, (t2) => setV(d.getElementById('e-currentPos'), (t2.startNum || 0) + Math.max(0, Math.min(t2.total, t2.progress + (t2.timeBased ? pick([-1, 1, 2]) : pick([-9, -3, 4, 15])))))); },
    editMode(id, t) { if (!t.timeBased) return '-'; return edit(id, (t2) => { const to = t2.timeMode === 'capacity' ? 'deadline' : 'capacity'; const c = d.querySelector(`#e-timemode-row .chip[data-timemode="${to}"]`); if (c) c.click();
      if (to === 'capacity') { const sum = t2.lectureDurations.reduce((a, b) => a + b, 0); setV(d.getElementById('e-dailyMinutes'), Math.max(1, Math.round(sum / 20))); } }); },
    editDays(id, t) { if (!(t.timeBased && t.type !== 'lecture')) return '-'; return edit(id, () => { const sels = [...d.querySelectorAll('#e-durationsList select')].filter(s => /days/i.test(s.className + ' ' + (s.dataset.role || '') + ' ' + [...s.options].map(o => o.textContent).join(' ')) && [...s.options].some(o => /일/.test(o.textContent)));
      if (sels.length) { const s = pick(sels); s.selectedIndex = ri(0, Math.min(3, s.options.length - 1)); fire(s, 'change'); } }); },
    pause(id) { const b = card(id, 'pause'); if (!b) return 'nobtn'; b.click(); return 'ok'; },
    refreshWeek(id) { app.view('week'); const b = d.querySelector(`[data-action="refresh-week-goal"][data-id="${id}"]`); if (!b) return 'nobtn'; b.click(); return 'ok'; },
    lockNext() { app.view('week'); const b = d.querySelector('[data-action="lock-week-goals"]'); if (!b) return 'nobtn'; b.click(); return 'ok'; },
    off(id, t, ds) { return settingsDo(() => { setV(d.getElementById('set-off-date'), L.addD(ds, ri(0, 6))); d.getElementById('set-off-add').click(); }); },
    offDel() { return settingsDo(() => { const bs = [...d.querySelectorAll('[data-off-del]')]; if (bs.length) pick(bs).click(); }); },
    ratio() { return settingsDo(() => { const sels = [...d.querySelectorAll('[data-weight]')]; const s = pick(sels); s.value = pick(['0.5', '1', '1.5', '2', '3']); fire(s, 'change'); }); },
  };
  const PRE_KEYS = ['addrev', 'addrev', 'addrev', 'delrev', 'skip', 'skip', 'skipback', 'pin', 'pin', 'pin', 'pin', 'unpin', 'editEnd', 'editEnd', 'editStart', 'editDaily', 'editPace', 'editBuffer',
    'editReview', 'editTo', 'editPos', 'editMode', 'editDays', 'pause', 'refreshWeek', 'lockNext', 'off', 'offDel', 'ratio'];
  const uncheck = (id) => { const b = card(id, 'toggle-today-complete'); if (b && b.textContent.trim() === '✓') { b.click(); return 'unchecked'; } return 'nocheck'; };
  const checkLess = (id, t) => {
    const r = rowT(id); if (!r) return 'norow';
    if (t.timeBased && t.itemPages) return r.pf == null ? check(id) : check(id, { page: r.pt + (ri(-9, 9) || 4), rev: R() < 0.5 });
    if (r.part) return L.checkAt(app, id, r.to + pick([0, 1]));
    return check(id, { delta: t.timeBased ? pick([-1, 1, 2]) : pick([-7, -2, 3, 11]) });
  };
  const yday = (id, how) => {
    app.view('today'); const b = d.querySelector(`[data-action="${how}"][data-id="${id}"]`); if (!b) return 'nobtn';
    b.click();
    let m = '';
    if (shown('completeModal')) { const inp = d.getElementById('cm-input'); if (R() < 0.3) { inp.value = String(parseInt(inp.value) + ri(-3, 3)); if (inp.oninput) inp.oninput(); } m = mt('completeModal'); d.getElementById('cm-save').click(); if (shown('completeModal')) d.getElementById('cm-cancel').click(); }
    return 'ok' + m;
  };
  const MAIN = (id, t, ds) => {
    const r = R();
    if (r < 0.50) return 'c:' + check(id);
    if (r < 0.62) return 'd:' + checkLess(id, t);
    if (r < 0.70) return '-';
    if (r < 0.76) return 'pd:' + postpone(id, 'deadline');
    if (r < 0.81) return 'pw:' + postpone(id, 'week');
    if (r < 0.87) return 'y:' + yday(id, 'yday-done') + '+' + (R() < 0.8 ? check(id) : '-');
    if (r < 0.89) return 'yn:' + yday(id, 'yday-no');
    if (r < 0.92) return 'cu:' + check(id) + '/' + uncheck(id);
    if (r < 0.95) { const a = postpone(id, 'deadline'); const b = card(id, 'unpostpone-today'); if (b) b.click(); return 'pu:' + a + (b ? '/undo' : ''); }
    if (r < 0.97) { const a = yday(id, 'yday-done'); app.view('today'); const b = d.querySelector(`[data-action="yday-undo"][data-id="${id}"]`); if (b) b.click(); return 'yu:' + a + (b ? '/undo' : ''); }
    const inp = card(id, 'update-progress'); if (!inp) return 'f:nofield';
    const v = (t.startNum || 0) + Math.max(0, Math.min(t.total, t.progress + (t.timeBased ? ri(-1, 2) : ri(-10, 25)))); inp.value = String(v); fire(inp, 'change'); return 'f:' + v;
  };
  const VIEWS = ['today', 'week', 'active', 'paused', 'archive'];
  const record = (ds, phase, acts) => {
    closeAll();
    const ls = norm(app.ev(LS)) + '\n' + (acts || '');
    let plans; try { plans = JSON.parse(app.ev(DUMP)); } catch (e) { plans = { ERR: String(e && e.message) }; }
    // screens: 오늘 every time; the others in the evening (drawing them is the slow part); every 6th day with the full timetables open
    const views = {}, VV = phase === 'am' ? ['today'] : VIEWS, open = phase === 'pm' && dayNo % 6 === 2;
    if (open) app.ev(`tasks.forEach(t => expandedSchedules.add(t.id));`);
    VV.forEach(v => { app.view(v); const m = d.querySelector('main') || d.body; views[v] = norm(m.textContent.replace(/\s+/g, ' ').trim()); });
    if (open) app.ev(`expandedSchedules.clear();`);
    app.view('today');
    const key = `${seed}|${ds}|${phase}`;
    if (FULL) {
      out[key + '|acts'] = acts || ''; out[key + '|data'] = ls;
      Object.keys(plans).forEach(id => { out[key + '|plan|' + id] = plans[id]; });
      VV.forEach(v => { out[key + '|screen|' + v] = views[v]; });
    } else out[key] = [sha(ls), sha(JSON.stringify(plans)), sha(JSON.stringify(views))].join('.');
  };
  // ---- the days ----
  const DAYS = L.days(start, 26).concat([L.addD(start, 30), L.addD(start, 31), L.addD(start, 38), L.addD(start, 52)]);
  let dayNo = -1;
  for (const ds of DAYS) {
    dayNo++;
    app.setDay(ds);
    record(ds, 'am');
    const acts = [];
    ids.forEach(id => {
      const t = app.task(id); if (!t || t.archived) return;
      let a = '';
      try {
        if (t.paused) { if (R() < 0.35) { app.view('paused'); const b = d.querySelector(`[data-action="resume"][data-id="${id}"]`); if (b) { b.click(); a = 'resume'; } } }
        else {
          if (R() < 0.24) { const k = pick(PRE_KEYS); a += k + '=' + PRE[k](id, t, ds) + ' '; closeAll(); app.tick(1500); }
          const t2 = app.task(id);
          if (t2 && !t2.paused) a += MAIN(id, t2, ds);
          if (R() < 0.06) { const k = pick(PRE_KEYS); a += ' ' + k + '=' + PRE[k](id, app.task(id), ds); } // …and sometimes a change after today's check
        }
      } catch (e) { a += ' THROW ' + String(e && e.message).slice(0, 80); }
      closeAll(); app.tick(2000);
      acts.push(id + ' ' + a);
    });
    record(ds, 'pm', acts.join(' ; '));
  }
  if (app.errors.length) out[`${seed}|errors`] = FULL ? app.errors.slice(0, 20) : sha(JSON.stringify(app.errors));
  app.close();
}
console.log(JSON.stringify(out));
