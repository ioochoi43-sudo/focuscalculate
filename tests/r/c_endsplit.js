const C = require('./common');
const ex = [{ id: 'fe', t: 'END', w: 8, at: 10, u: 'pg', pg: 8, df: 'medium' }];
const app = C.mk([C.S.pageTask('A', { extras: ex }), C.S.pageTask('B', { extras: ex }), C.S.pageTask('N', { extras: ex })]);
let hit = null;
for (const ds of C.days('2026-11-09', 35)) { app.setDay(ds); const r = C.row0(app, 'A'); if (r && r.revs.includes('fe') && r.pf != null) { hit = ds; break; } app.check('A'); app.check('B'); app.check('N'); }
console.log('hit', hit, JSON.stringify(C.row0(app, 'A')), 'next-day planned in rows:', C.futRows(app, 'A'));
const q = JSON.parse(app.ev(`JSON.stringify(glueOf(tasks.find(x => x.id === 'A'), 9))`));
console.log('glue', JSON.stringify(q), 'content end share', (q.s + q.w) / q.W);
// A: default (box ticked since review in plan) at planned page
app.view('active'); app.doc.querySelector('[data-action="toggle-today-complete"][data-id="A"]').click();
console.log('A box shown', app.doc.getElementById('cm-rev').style.display !== 'none', 'ticked', app.doc.getElementById('cm-rev-cb').checked, 'txt', app.doc.getElementById('cm-rev-txt').textContent, 'helper', app.doc.getElementById('cm-helper').textContent);
app.doc.getElementById('cm-save').click();
console.log('A after default check', JSON.stringify(C.st(app, 'A')));
// B: unticked at planned page
app.check('B', { page: 160, rev: false });
console.log('B after unticked', JSON.stringify(C.st(app, 'B')));
// N: plain part toggle equivalent? use the plan share via evaluating what following-plan should record
console.log('plan share of that row', app.ev(`(() => { const t = tasks.find(x => x.id === 'N'); const r = todayPlanRow(t, fmtDate(today())); return JSON.stringify({ partN: r.partN, partOf: r.partOf, partF: r.partF }); })()`));
app.setDay(C.days(hit, 2)[1]);
console.log('next day A', JSON.stringify(C.st(app, 'A')), 'B', JSON.stringify(C.st(app, 'B')), JSON.stringify(C.row0(app, 'B')));
app.close();
