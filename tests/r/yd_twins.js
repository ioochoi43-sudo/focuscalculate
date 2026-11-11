const C = require('./common');
const kind = process.argv[2] || 'P';
const mkT = (id) => kind === 'P' ? C.S.pageTask(id) : kind === 'L' ? C.S.lectureTask(id) : C.S.weightTask(id);
const ids = ['T1', 'T2', 'T3', 'T4', 'T5', 'T6'];
const app = C.mk(ids.map(mkT));
app.win.confirm = () => true;
const D = '2026-11-12', D1 = '2026-11-13';
for (const ds of C.days('2026-11-09', 3)) { app.setDay(ds); ids.forEach(id => app.check(id)); }
app.setDay(D); app.check('T1'); // others leave D unchecked
app.setDay(D1);
const yBtn = (id, act) => { app.view('today'); return app.doc.querySelector(`[data-action="${act}"][data-id="${id}"]`); };
const box = () => { app.view('today'); return (app.doc.getElementById('yesterdayBox') || {}).textContent.replace(/\s+/g, ' ').slice(0, 200); };
// T2: skip next chapter (confirm) → locked; 다시 넣기 → unlocked; then late check
const L = JSON.parse(app.ev(`JSON.stringify(skippableRels(tasks.find(x => x.id === 'T2')))`));
const firstNotStarted = L.find(k => +app.ev(`chapterLeftFrac(tasks.find(x => x.id === 'T2'), ${k})`) === 1);
C.skipCh(app, 'T2', firstNotStarted);
console.log('T2 after skip: yday-done button?', !!yBtn('T2', 'yday-done'), '| locked', app.ev(`ydayLocked(tasks.find(x => x.id === 'T2'))`));
app.view('active'); const bb = app.doc.querySelector('[data-action="skip-back"][data-id="T2"]'); if (bb) bb.click();
console.log('T2 after 다시 넣기: locked', app.ev(`ydayLocked(tasks.find(x => x.id === 'T2'))`), 'yday-done button?', !!yBtn('T2', 'yday-done'));
const late = (id) => { const b = yBtn(id, 'yday-done'); if (!b) return 'nobtn'; b.click(); if (app.modalOpen()) app.doc.getElementById('cm-save').click(); return 'ok'; };
console.log('T2 late check:', late('T2'));
// T3: 안 했어요 → 되돌리기 → late check
const nb = yBtn('T3', 'yday-no'); nb.click();
console.log('T3 after 안 했어요: in list?', !!yBtn('T3', 'yday-done'), '| box:', box());
const ub = app.doc.querySelector('[data-action="yday-no-undo"]'); ub.click();
console.log('T3 after 되돌리기: in list?', !!yBtn('T3', 'yday-done'), '→ late check', late('T3'));
// T4: 안 했어요 (stays) vs T5: nothing — must be identical
yBtn('T4', 'yday-no').click();
// T6: 안 했어요, then skip without confirm (ydayPending false) → locked; 되돌리기 must not bring the late check back
yBtn('T6', 'yday-no').click();
let asked = false; app.win.confirm = () => { asked = true; return true; };
C.skipCh(app, 'T6', firstNotStarted);
console.log('T6 skip after 안 했어요: confirm asked?', asked, '| locked', app.ev(`ydayLocked(tasks.find(x => x.id === 'T6'))`));
const ub2 = app.doc.querySelector('[data-action="yday-no-undo"]'); if (ub2) ub2.click();
console.log('T6 after 되돌리기: yday-done button?', !!yBtn('T6', 'yday-done'));
const cmp = (a, b, tag) => { const ra = C.futRows(app, a), rb = C.futRows(app, b), sa = app.snap(a), sb = app.snap(b); const pa = app.task(a).progress, pb = app.task(b).progress;
  return `${tag}: rows ${ra === rb ? 'same' : 'DIFF'} status ${sa.status}/${sb.status} behind ${sa.behind}/${sb.behind} prog ${pa}/${pb}`; };
console.log(cmp('T2', 'T1', 'T2 (skip+undo+late) vs T1 (on time)'));
console.log(cmp('T3', 'T1', 'T3 (안 했어요+되돌리기+late) vs T1'));
console.log(cmp('T4', 'T5', 'T4 (안 했어요) vs T5 (left unchecked)'));
for (const ds of C.days(D1, 4)) { app.setDay(ds); ['T1', 'T2', 'T3', 'T4', 'T5'].forEach(id => app.check(id)); }
app.setDay('2026-11-17');
console.log('4 days later:', cmp('T2', 'T1', 'T2/T1'), '|', cmp('T3', 'T1', 'T3/T1'), '|', cmp('T4', 'T5', 'T4/T5'));
console.log('errors', app.errors.slice(0, 2));
app.close();
