// Review scenarios for 오늘·내일 양 정하기 (each block prints what it found)
const L = require('./pin_lib');
const S = L.S;
const only = process.argv[2] || '';
const cnt = (id, x) => Object.assign({ id, title: id, type: 'book', total: 240, startNum: 10, progress: 0, start: '2026-11-09', end: '2026-12-10', pace: 'daily', paceValue: null, reviewDays: [], skipDates: [] }, x || {});
const txt = (el) => (el ? el.textContent.replace(/\s+/g, ' ').trim() : '(none)');
const want = (n) => !only || only === n;
const rowsOfPlan = (app, expr) => app.ev(`(() => { const p = ${expr}; return JSON.stringify(p.schedule.filter(s => !s.isPast && !s.isReview).map(s => [fmtDate(s.date), s.from, s.to, s.isPart ? 1 : 0, s.partN, s.partOf, s.pFrom, s.pTo, (s.revs || []).map(x => x.t).join('+'), s.pin ? 'PIN' : ''])); })()`);

// ---- A) the "양 정하기" button on a row that can't be set opens the window for the OTHER day ----
if (want('A')) {
  // a big review before chapter 4 → days that are only review (no page to point at)
  const EX = [{ id: 'q', t: 'Q', w: 30, at: 3, u: 'pg', pg: 30, df: 'medium' }];
  const app = L.mk([S.pageTask('P', { extras: EX })]);
  const d = app.doc;
  let ds = '2026-11-09', hit = null;
  for (let i = 0; i < 25; i++) {
    app.setDay(ds);
    const s = L.st(app, 'P'), rT = L.rowOf(s, ds), rM = L.rowOf(s, L.tmr(ds));
    if (rT && rM && rT[7] != null && rM[7] == null) { hit = 'tomorrow'; break; }
    app.check('P'); ds = L.tmr(ds);
  }
  console.log(`\n[A] ${ds}: today's row has pages, tomorrow's row is review only → ${hit ? 'found' : 'not found'}`);
  if (hit) {
    app.view('today');
    const b = d.querySelector(`#tomorrowList [data-action="pin-day"][data-id="P"]`);
    console.log('  내일 row:', txt(d.querySelector(`#tomorrowList .agenda-item[data-id="P"]`)));
    console.log('  "양 정하기" button on the 내일 row:', !!b);
    if (b) { b.click(); console.log('  window title after pressing it:', txt(d.getElementById('pn-title')), '| day buttons:', [...d.querySelectorAll('#pn-days [data-pn-day]')].map(x => x.textContent + (x.disabled ? '(off)' : '') + (x.classList.contains('active') ? '*' : '')).join(' '));
      console.log(/오늘/.test(txt(d.getElementById('pn-title'))) ? '  CONFIRMED: pressed on the 내일 row, the window is for 오늘' : '  ok'); d.getElementById('pn-cancel').click(); }
  }
  app.close();
}

// ---- B) a pin that no longer applies still reads as "직접 정한 양" in the window ----
if (want('B')) {
  const app = L.mk([S.pageTask('P'), cnt('N')]);
  const d = app.doc;
  for (const ds of L.days('2026-11-09', 3)) { app.setDay(ds); app.check('P'); app.check('N'); }
  const d0 = '2026-11-12', d1 = '2026-11-13';
  app.setDay(d0);
  const s0 = L.st(app, 'P'), rM = L.rowOf(s0, d1), n0 = L.st(app, 'N'), nM = L.rowOf(n0, d1);
  const r1 = L.pinUI(app, 'P', d1, rM[8] + 3), r2 = L.pinUI(app, 'N', d1, nM[2] - 3);
  console.log(`\n[B] ${d0}: pinned tomorrow P → p.${r1.val} (plan p.${rM[7]}~${rM[8]}), N → ${r2.val} (plan ${nM[1]}~${nM[2]})`);
  // today the user does much more than planned: past tomorrow's pinned point
  app.check('P', { page: r1.val + 6 }); app.check('N', { page: r2.val + 5 });
  app.setDay(d1);
  for (const id of ['P', 'N']) {
    const s = L.st(app, id), r = L.rowOf(s, d1);
    app.view('today');
    console.log(`  ${id} next morning: row`, JSON.stringify(r.slice(0, 11)), '| pinned plan?', s.pinned, '| stored', JSON.stringify(s.pins));
    app.ev(`openPinModal('${id}', '${d1}')`);
    console.log(`  ${id} window: "${txt(d.getElementById('pn-sub'))}" | input ${d.getElementById('pn-input').value} (min ${d.getElementById('pn-input').min}) | preview: ${txt(d.getElementById('pn-preview'))} | 원래 계획으로 button: ${d.getElementById('pn-clear').style.display !== 'none'}`);
    if (!s.pinned && /직접 정한 양/.test(txt(d.getElementById('pn-sub')))) console.log('  CONFIRMED: the row is not pinned, the window says it is');
    d.getElementById('pn-cancel').click();
  }
  app.close();
}

// ---- C) postpone window with tomorrow pinned: preview == what really happens ----
if (want('C')) {
  for (const [kind, mkT] of [['page', (id) => S.pageTask(id)], ['lecture', (id) => S.lectureTask(id)], ['count', (id) => cnt(id)], ['weight', (id) => S.weightTask(id)]]) {
    for (const mode of ['deadline', 'week']) {
      const app = L.mk([mkT('P')]);
      const d = app.doc;
      for (const ds of L.days('2026-11-09', 2)) { app.setDay(ds); app.check('P'); }
      const d0 = '2026-11-11', d1 = '2026-11-12';
      app.setDay(d0);
      const s0 = L.st(app, 'P');
      const rT = L.pinUI(app, 'P', d0, (i) => (i.def + 2 <= i.max ? i.def + 2 : null)); // today pinned too: must go away
      const rM = L.pinUI(app, 'P', d1, (i) => Math.min(i.max, i.def + (kind === 'page' ? 7 : kind === 'count' ? 6 : 1)));
      const prev = rowsOfPlan(app, `previewPostpone(tasks[0], '${mode}').plan`);
      app.view('active'); d.querySelector(`[data-action="postpone-today"][data-id="P"]`).click();
      const wk = d.getElementById('pp-week'), wkShown = wk.style.display !== 'none';
      const desc = txt(d.getElementById(mode === 'week' ? 'pp-week-desc' : 'pp-deadline-desc')), verdict = txt(d.getElementById('pp-verdict'));
      if (mode === 'week' && !wkShown) { d.getElementById('pp-cancel').click(); console.log(`\n[C] ${kind} ${mode}: "이번 주 안에" not offered — skipped`); app.close(); continue; }
      d.getElementById(mode === 'week' ? 'pp-week' : 'pp-deadline').click();
      const real = rowsOfPlan(app, `buildSchedule(tasks[0])`);
      const t = app.task('P');
      const loadM = app.ev(`(() => { const t = tasks[0]; return fmtLoad(t, dayLoadsOf(t, buildSchedule(t)).get('${d1}') || 0); })()`);
      console.log(`\n[C] ${kind} ${mode}: pins before ${JSON.stringify({ today: rT.pin, tomorrow: rM.pin })} → after ${JSON.stringify(t.dayPins || null)}`);
      console.log(`  window said: ${desc}`);
      console.log(`  real tomorrow load: ${loadM} | tomorrow's row ${JSON.stringify(JSON.parse(real).find(r => r[0] === d1))}`);
      console.log(prev === real ? '  preview plan == real plan' : `  DIFFERENT preview vs real\n   preview ${prev.slice(0, 300)}\n   real    ${real.slice(0, 300)}`);
      if (!desc.includes(loadM)) console.log('  NOTE: the load in the window text is not the real one');
      // 되돌리기: today's pin does not come back
      app.view('active'); const u = d.querySelector(`[data-action="unpostpone-today"][data-id="P"]`); if (u) u.click();
      console.log('  after 되돌리기: pins', JSON.stringify(app.task('P').dayPins || null), '| errors', app.errors.length);
      app.close();
    }
  }
}

// ---- D) edits with pins set ----
if (want('D')) {
  const openSave = (app, id, fn) => { app.view('active'); app.doc.querySelector(`[data-action="edit"][data-id="${id}"]`).click(); if (fn) fn(app.doc); app.doc.getElementById('e-save').click(); return txt(app.doc.getElementById('toast')); };
  const setup = () => {
    const app = L.mk([S.pageTask('P'), S.pageTask('B'), cnt('N'), cnt('M')]);
    for (const ds of L.days('2026-11-09', 3)) { app.setDay(ds); ['P', 'B', 'N', 'M'].forEach(id => app.check(id)); }
    app.setDay('2026-11-12');
    return app;
  };
  const d0 = '2026-11-12', d1 = '2026-11-13';
  { // deadline moved: pins stay; pin+check == twin check
    const app = setup();
    const r = L.pinUI(app, 'P', d0, (i) => i.def + 6), r2 = L.pinUI(app, 'N', d0, (i) => i.def - 4);
    const setEnd = (dd) => { dd.getElementById('e-end').value = '2026-12-20'; dd.getElementById('e-end').dispatchEvent(new app.win.Event('change', { bubbles: true })); };
    ['P', 'B', 'N', 'M'].forEach(id => openSave(app, id, setEnd));
    console.log(`\n[D1] deadline moved with a pin: pins kept ${JSON.stringify(app.task('P').dayPins)} ${JSON.stringify(app.task('N').dayPins)} | pinned ${L.st(app, 'P').pinned} ${L.st(app, 'N').pinned}`);
    const sP = L.st(app, 'P'), sN = L.st(app, 'N');
    app.check('P'); L.checkAt(app, 'B', r.val); app.check('N'); L.checkAt(app, 'M', r2.val);
    for (const [a, b, sp] of [['P', 'B', sP], ['N', 'M', sN]]) {
      const x = L.st(app, a), y = L.st(app, b);
      console.log(`  ${a}/${b}: record ${JSON.stringify(x.rec) === JSON.stringify(y.rec)} status ${x.status}/${y.status} plan ${L.rowsFrom(x, d0) === L.rowsFrom(y, d0)} shown==after ${L.rowsFrom(sp, d1) === L.rowsFrom(x, d1)}`);
    }
    console.log('  errors', app.errors.slice(0, 2)); app.close();
  }
  { // 끝 번호 줄이기 / 시작 번호 바꾸기: pins removed
    const app = setup();
    L.pinUI(app, 'N', d0, (i) => i.def + 30); L.pinUI(app, 'N', d1, (i) => i.def + 30);
    const before = JSON.stringify(app.task('N').dayPins);
    const t1 = openSave(app, 'N', (dd) => { dd.getElementById('e-to').value = '120'; dd.getElementById('e-to').dispatchEvent(new app.win.Event('input', { bubbles: true })); });
    console.log(`\n[D2] 끝 번호 250→120 with pins ${before}: toast "${t1}" | pins now ${JSON.stringify(app.task('N').dayPins || null)} | 계산 점검 ${JSON.stringify(L.st(app, 'N').sc)}`);
    console.log('  errors', app.errors.slice(0, 2)); app.close();
  }
  { // 현재 진행 위치 moved past the pin (no structural change): pin stays stored, must be ignored
    const app = setup();
    const r = L.pinUI(app, 'N', d0, (i) => i.def - 3);
    const t1 = openSave(app, 'N', (dd) => { dd.getElementById('e-currentPos').value = String(r.val + 20); dd.getElementById('e-currentPos').dispatchEvent(new app.win.Event('input', { bubbles: true })); });
    const s = L.st(app, 'N');
    console.log(`\n[D3] 현재 위치 → past the pinned point (${r.val} → ${r.val + 20}): toast "${t1}" | pins ${JSON.stringify(s.pins)} | pinned plan ${s.pinned} | today's row ${JSON.stringify(L.rowOf(s, d0))} | 계산 점검 ${JSON.stringify(s.sc)} | loads ${s.sum}/${s.left}`);
    console.log('  errors', app.errors.slice(0, 2)); app.close();
  }
  { // 하루 가능 시간 기준으로 바꾸기 / 페이지 끄기
    const app = setup();
    const r = L.pinUI(app, 'P', d0, (i) => i.def + 6);
    const base = L.st(app, 'B');
    app.ev(`(() => { const t = tasks.find(x => x.id === 'P'); t.timeMode = 'capacity'; t.dailyMinutes = 9; persistTasks(); const b = tasks.find(x => x.id === 'B'); b.timeMode = 'capacity'; b.dailyMinutes = 9; persistTasks(); rerender(); })()`);
    const p = L.st(app, 'P'), b = L.st(app, 'B');
    app.view('today');
    console.log(`\n[D4] switched to 하루 가능 시간 기준 with a pin stored: pinned plan ${p.pinned} | same plan as the twin ${L.rowsFrom(p, d0) === L.rowsFrom(b, d0)} | buttons ${!!app.doc.querySelector('[data-action="pin-day"][data-id="P"]')}`);
    app.ev(`(() => { for (const id of ['P', 'B']) { const t = tasks.find(x => x.id === id); t.timeMode = 'deadline'; t.itemPagesSaved = t.itemPages; delete t.itemPages; } persistTasks(); rerender(); })()`);
    const p2 = L.st(app, 'P'), b2 = L.st(app, 'B');
    console.log(`  pages off (page pin stored): pinned plan ${p2.pinned} | same plan as the twin ${L.rowsFrom(p2, d0) === L.rowsFrom(b2, d0)} | 계산 점검 ${JSON.stringify(p2.sc)}`);
    app.ev(`openPinModal('P', '${d0}')`);
    console.log(`  window after pages off: "${txt(app.doc.getElementById('pn-sub'))}" input ${app.doc.getElementById('pn-input').value}`);
    app.doc.getElementById('pn-cancel').click();
    console.log('  errors', app.errors.slice(0, 2)); app.close();
  }
}

// ---- E) paused / resumed / archived goals with pins ----
if (want('E')) {
  const app = L.mk([S.pageTask('P'), cnt('N')]);
  const d = app.doc;
  for (const ds of L.days('2026-11-09', 3)) { app.setDay(ds); app.check('P'); app.check('N'); }
  const d0 = '2026-11-12', d1 = '2026-11-13';
  app.setDay(d0);
  L.pinUI(app, 'P', d0, (i) => i.def + 4); L.pinUI(app, 'P', d1, (i) => i.def + 8); L.pinUI(app, 'N', d1, (i) => i.def - 5);
  app.view('active'); d.querySelector(`[data-action="pause"][data-id="P"]`).click();
  const sPa = L.st(app, 'P');
  console.log(`\n[E] paused with pins: pinned plan ${sPa.pinned}, pins kept ${JSON.stringify(sPa.pins)}`);
  app.view('paused'); d.querySelector(`[data-action="resume"][data-id="P"]`).click();
  console.log(`  resumed the same day: pinned plan ${L.st(app, 'P').pinned}`);
  app.view('active'); d.querySelector(`[data-action="pause"][data-id="P"]`).click();
  app.setDay('2026-11-16');
  console.log(`  3 days later (still paused): pins ${JSON.stringify(app.task('P').dayPins || null)} (old ones pruned)`);
  app.ev(`(() => { const t = tasks.find(x => x.id === 'N'); t.archived = true; persistTasks(); rerender(); })()`);
  console.log(`  archived N: pinned plan ${L.st(app, 'N').pinned} | errors ${app.errors.length}`);
  app.close();
}

// ---- F) the day itself made a 쉬는 날 / 복습 요일 after it was pinned ----
if (want('F')) {
  const app = L.mk([S.pageTask('P'), S.pageTask('B'), cnt('N')]);
  for (const ds of L.days('2026-11-09', 3)) { app.setDay(ds); app.check('P'); app.check('B'); app.check('N'); }
  const d0 = '2026-11-12', d1 = '2026-11-13';
  app.setDay(d0);
  L.pinUI(app, 'P', d1, (i) => i.def + 8); L.pinUI(app, 'N', d0, (i) => i.def - 5); L.pinUI(app, 'N', d1, (i) => i.def + 5);
  app.ev(`(() => { settings.offDates = ['${d1}']; normalizeOffLog(); persistSettings(); rerender(); })()`);
  const p = L.st(app, 'P'), b = L.st(app, 'B'), n = L.st(app, 'N');
  console.log(`\n[F] tomorrow made a 쉬는 날 after pinning it: P pinned plan ${p.pinned} | same as the twin ${L.rowsFrom(p, d0) === L.rowsFrom(b, d0)} | 계산 점검 ${JSON.stringify(p.sc)} | N (today pinned too) pinned ${n.pinned} rows ${L.rowsFrom(n, d0).slice(0, 120)} loads ${n.sum}/${n.left} 점검 ${JSON.stringify(n.sc)}`);
  app.setDay(d1);
  const p1 = L.st(app, 'P'), b1 = L.st(app, 'B');
  console.log(`  on that 쉬는 날: P pinned ${p1.pinned} | same as the twin ${L.rowsFrom(p1, d1) === L.rowsFrom(b1, d1)} | errors ${app.errors.length}`);
  app.close();
}
