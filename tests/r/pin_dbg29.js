// Review debug: fuzz2 seed 29 — loads of the pinned plan vs the work left (after 이번 주 안에 미루기 + skipping a chapter)
const L = require('./pin_lib');
const R = L.rng(29 * 15485863 + 5);
const kind = L.pick(R, ['page', 'pageX', 'pageX', 'page', 'lecture', 'weight', 'count']);
const start = L.pick(R, ['2026-11-02', '2026-11-04', '2026-11-07', '2026-12-21']);
const tA = L.genTask(R, kind, 'A', start), tB = Object.assign(JSON.parse(JSON.stringify(tA)), { id: 'B', title: 'B' });
const settings = L.genSettings(R);
const app = L.makeApp(L.HTML, start, { 'focus-calculate-tasks-v1': [tA, tB], 'focus-calculate-settings-v1': settings });
app.win.confirm = () => true;
const d = app.doc;
console.log(kind, start, JSON.stringify(tA.itemPages), 'extras', JSON.stringify(tA.extras), 'skipped', JSON.stringify(tA.skipped), 'itemDays', JSON.stringify(tA.itemDays), 'end', tA.end, tA.pace, JSON.stringify(settings.weights));
let ds = start;
for (const act of ['c', 'c', '-']) { app.setDay(ds); if (act === 'c') { app.check('A'); app.check('B'); } ds = L.tmr(ds); }
const d0 = ds, d1 = L.tmr(d0);
app.setDay(d0);
const show = (tag, id) => { const s = L.st(app, id); console.log(tag, id, 'pinned', s.pinned, 'sum', s.sum, 'left', s.left, 'prog', s.prog, 'status', s.status, '\n   rows', JSON.stringify(s.rows.slice(0, 7)), '\n   loads', app.ev(`JSON.stringify([...dayLoadsOf(tasks.find(x => x.id === '${id}'), buildSchedule(tasks.find(x => x.id === '${id}'))).entries()].slice(0, 8).map(([k, v]) => k.slice(5) + ':' + Math.round(v * 100) / 100))`)); return s; };
show('start', 'A');
const res = L.pinUI(app, 'A', d1, 39);
console.log('pin', JSON.stringify(res.pin), res.msg);
show('pinned', 'A');
for (const id of ['A', 'B']) console.log('postpone', id, L.postpone(app, id, 'week'));
show('after 이번 주 안에 미루기', 'A'); show('after 이번 주 안에 미루기', 'B');
for (const id of ['A', 'B']) { app.view('active'); d.querySelector(`[data-action="skip-chapter"][data-id="${id}"]`).click(); const sel = d.getElementById('sk-rel'); console.log('skip options', [...sel.options].map(o => o.value + ':' + o.textContent).join(' | ').slice(0, 200)); sel.value = '1'; d.getElementById('sk-save').click(); }
const a = show('after skipping', 'A'), b = show('after skipping', 'B');
console.log('task A', JSON.stringify({ skipped: app.task('A').skipped, extras: app.task('A').extras, weekHold: app.task('A').weekHold, skipDates: app.task('A').skipDates, pins: app.task('A').dayPins }));
console.log('records A', L.recsOf(app, 'A'));
// the unpinned twin's own loads against the same formula
console.log(`pinned A: loads ${a.sum} vs left ${a.left}   |   twin without a pin: loads ${b.sum} vs left ${b.left}`);
// what does checking really give? next day: check A as shown, loads again
app.setDay(d1);
const m = show('next morning', 'A');
app.check('A');
show('after checking the pinned day', 'A');
console.log('errors', app.errors.slice(0, 3));
app.close();
