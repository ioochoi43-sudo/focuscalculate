// Review: the day's load (양/시간) when a page check passes a skipped chapter and stops inside the next one.
// Not caused by pins (the last released file does the same after a real check) — but a pin shows that load
// BEFORE the day is checked (today's/tomorrow's "총 공부량", the pin window's preview).
// usage: node r/pin_loadskip.js          (new file)      FC_HTML=out/old_40b753b.html node r/pin_loadskip.js   (last release)
const L = require('./pin_lib');
const S = L.S;
// pageTask chapters: 1:[1,12] 2:[13,30] 3:[31,38] 4:[39,60] …   → skip chapter 2 before starting it, then stop at p.34 (inside chapter 3)
const app = L.mk([S.pageTask('P'), S.pageTask('Q')]);
const d = app.doc; app.win.confirm = () => true;
const hasPins = app.ev(`typeof withDayPins === 'function'`);
const loads = (id) => JSON.parse(app.ev(`(() => { const t = tasks.find(x => x.id === '${id}'); const p = buildSchedule(t); const tS = fmtDate(today());
  const ld = dayLoadsOf(t, p); let sum = 0; ld.forEach(v => { sum += v; });
  const pre = getDurationPrefix(t), a = fwdRel(t, Math.min(getTodayAnchor(t), t.progress));
  const left = pre[t.total] - pre[a] - (a < t.total ? (pre[a + 1] - pre[a]) * getPartState(t, a + 1, tS).frac : 0);
  const r = p.schedule.find(x => !x.isPast && !x.isReview && fmtDate(x.date) === tS);
  return JSON.stringify({ sum: Math.round(sum * 100) / 100, left: Math.round(left * 100) / 100, today: Math.round((ld.get(tS) || 0) * 100) / 100, row: r ? [r.from, r.to, r.isPart ? r.partN + '/' + r.partOf : '', r.pFrom, r.pTo, r.pin ? 'PIN' : ''] : null, prog: t.progress, rec: completedMap.get(t.id + '|' + tS) || null }); })()`));
app.setDay('2026-11-09'); app.check('P', { page: 12 }); app.check('Q', { page: 12 }); // chapter 1 done
app.setDay('2026-11-10');
for (const id of ['P', 'Q']) { app.view('active'); d.querySelector(`[data-action="skip-chapter"][data-id="${id}"]`).click(); const sel = d.getElementById('sk-rel'); sel.value = '1'; d.getElementById('sk-save').click(); }
console.log(hasPins ? 'NEW file' : 'LAST RELEASE', '— chapter 2 skipped before starting it; today starts at chapter 3 (p.31~38, 8 pages, 쉬움 → 양 5.33)');
console.log(' before anything  :', JSON.stringify(loads('P')));
if (hasPins) { const r = L.pinUI(app, 'P', '2026-11-10', 34); console.log(' pin today to p.34:', r.ok, '| window preview:', r.prev); console.log(' with the pin     :', JSON.stringify(loads('P'))); app.view('today'); console.log(' 오늘 총 공부량 line:', d.getElementById('todayTotal').textContent.replace(/\s+/g, ' ').trim().slice(0, 80)); }
app.check('Q', { page: 34 });
const q = loads('Q');
console.log(' twin, really checked at p.34:', JSON.stringify(q));
console.log(Math.abs(q.sum - q.left) > 0.02 ? ` → loads add up to ${q.sum}, the work left is ${q.left}: today's row is counted ${Math.round((q.sum - q.left) * 100) / 100} too high (4 pages of an 8-page 쉬움 chapter = 양 2.67)` : ' → loads add up');
app.close();
