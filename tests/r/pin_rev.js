// Review: a pinned day whose range passes a 따로 할 것 review (the review sits before a LATER chapter of that day).
// Does the plan still show that review somewhere?
const L = require('./pin_lib');
const S = L.S;
const EX = [{ id: 'q', t: 'Q', w: 9, at: 3, u: 'pg', pg: 9, df: 'medium' }];
// pageTask chapters: 1:[1,12] 2:[13,30] 3:[31,38] 4:[39,60] 5:[61,70] 6:[71,95] …  → review Q sits before chapter 4 (p.39)
const app = L.mk([S.pageTask('P', { extras: EX }), S.pageTask('B', { extras: EX })]);
const d = app.doc;
const info = (id) => JSON.parse(app.ev(`(() => { const t = tasks.find(x => x.id === '${id}'); const p = buildSchedule(t);
  const fut = p.schedule.filter(s => !s.isPast && !s.isReview);
  return JSON.stringify({ rows: fut.slice(0, 5).map(s => fmtDate(s.date).slice(5) + ' ' + formatRangePlain(t, s.from, s.to) + (s.pFrom != null ? ' p.' + s.pFrom + '~' + s.pTo : '') + (s.isPart ? ' (' + s.partN + '/' + s.partOf + ')' : '') + (s.revs ? ' +복습 ' + s.revs.map(x => x.t).join(',') : '') + (s.pin ? ' [직접 정함]' : '')),
    pendingNotInAnyRow: (t.extras || []).filter(x => !extraDone(t, x) && !fut.some(s => (s.revs || []).some(y => y.id === x.id))).map(x => x.t),
    loads: [...dayLoadsOf(t, p).entries()].slice(0, 4).map(([k, v]) => k.slice(5) + ':' + Math.round(v * 10) / 10) }); })()`));
let ds = '2026-11-09';
// follow the plan until today's row ends at chapter 3 or just before chapter 4
for (let i = 0; i < 12; i++) {
  app.setDay(ds);
  const r = L.rowOf(L.st(app, 'P'), ds), r2 = L.rowOf(L.st(app, 'P'), L.tmr(ds));
  if (r && r[8] != null && r[8] <= 38 && r[8] >= 31) break;
  app.check('P'); app.check('B'); ds = L.tmr(ds);
}
console.log('day', ds);
console.log('plan without a pin:', JSON.stringify(info('P'), null, 1));
// pin today to p.45: finishes chapter 3, does review Q, and 7 pages of chapter 4
const res = L.pinUI(app, 'P', ds, 45);
console.log('pin window:', res.ok, res.prev, '|', res.msg);
const pinned = info('P');
console.log('plan with today pinned to p.45:', JSON.stringify(pinned, null, 1));
app.view('today');
const row = d.querySelector(`#todayList .agenda-item[data-id="P"]`);
console.log('오늘 row text:', row ? row.textContent.replace(/\s+/g, ' ').trim() : '(none)');
console.log('따로 할 것 box on the card:', (app.cardText('P').match(/따로 할 것.*?(?=📅|$)/) || [''])[0].slice(0, 160));
// what the check window shows for that pinned day
d.querySelector(`#todayList [data-action="toggle-complete"][data-id="P"]`).click();
console.log('check window:', d.getElementById('cm-sub').textContent.replace(/\s+/g, ' '), '| default', d.getElementById('cm-input').value, '| 복습 box shown', d.getElementById('cm-rev').style.display !== 'none', '| helper:', d.getElementById('cm-helper').textContent);
d.getElementById('cm-save').click();
console.log('after checking as shown: Q done?', app.ev(`extraDone(tasks[0], tasks[0].extras[0])`), 'record', app.ev(`JSON.stringify(completedMap.get('P|${ds}'))`));
const verdict = pinned.pendingNotInAnyRow.length ? 'CONFIRMED: with the pin, review ' + pinned.pendingNotInAnyRow.join(',') + ' is in no row of the plan (it is done silently inside the pinned day)' : 'not reproduced';
console.log(verdict);
console.log('errors', app.errors.slice(0, 2));
app.close();
