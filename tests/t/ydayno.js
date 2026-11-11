const L = require('./lib');
const { mk, ok } = L;
const { pageTask, lectureTask } = require('./seed');
const app = mk([pageTask('A'), lectureTask('B'), pageTask('C')]);
['A', 'B', 'C'].forEach(id => app.check(id));
app.setDay('2026-11-10'); app.setDay('2026-11-11'); // 11/10 unchecked for all
const box = () => { app.view('today'); return app.doc.getElementById('yesterdayBox'); };
const btn = (sel) => box().querySelector(sel);
const snaps = () => JSON.stringify(['A', 'B', 'C'].map(id => app.snap(id)));
const s0 = snaps();
ok(!!btn('[data-action="yday-no"][data-id="A"]'), '안 했어요 button shown');
ok(!!btn('[data-action="yday-no-all"]'), '모두 안 했어요 shown (3 goals)');
btn('[data-action="yday-no"][data-id="A"]').click();
ok(!btn('[data-action="yday-done"][data-id="A"]') && /안 한 걸로 한 목표 1개/.test(box().textContent), 'A off the list, mini line shown');
ok(snaps() === s0, 'plan/status unchanged by 안 했어요');
// skip on A: no question
let asked = 0; app.win.confirm = () => { asked++; return true; };
app.view('active'); app.doc.querySelector('[data-action="skip-chapter"][data-id="A"]').click();
ok(asked === 0 && app.doc.getElementById('skipModal').classList.contains('show'), 'A: skip opens without the yesterday question');
app.doc.getElementById('sk-cancel').click();
// B still asks
app.view('active'); app.doc.querySelector('[data-action="add-extra"][data-id="B"]').click();
ok(asked === 1, 'B: still asks (yesterday open)'); app.doc.getElementById('xm-cancel').click();
// undo
btn('[data-action="yday-no-undo"]').click();
ok(!!btn('[data-action="yday-done"][data-id="A"]'), '되돌리기 → A back');
// all
btn('[data-action="yday-no-all"]').click();
ok(!btn('[data-action="yday-done"]') && /안 한 걸로 한 목표 3개/.test(box().textContent), '모두 안 했어요 → only the small line');
ok(snaps() === s0, 'plan/status still unchanged');
// reload keeps it
const ls = app.ev(`localStorage.getItem('focus-calculate-tasks-v1')`);
ok(JSON.parse(ls).every(t => t.ydayNo === '2026-11-10'), 'saved');
// next day: the flag is for 11/10 only → the 11/11 row shows normally
app.setDay('2026-11-12');
ok(!!btn('[data-action="yday-done"][data-id="A"]'), 'next day: yesterday (11/11) listed again');
// checking today hides the box
app.check('A'); app.check('B'); app.check('C');
ok(!box().textContent.trim(), 'box gone after today checks');
console.log('errors', app.errors.slice(0, 2));
app.close();
console.log('passes', L.stats().passes, 'fails', L.stats().fails);
