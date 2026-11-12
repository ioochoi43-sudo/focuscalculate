// Review: how much slower is drawing the screens when goals have pins? (each plan is then calculated 2–3 times)
// jsdom timings on this machine — only the ratio matters.
const L = require('./pin_lib');
const R = L.rng(4242);
const start = '2026-11-02';
const mkPage = (id, n) => { const P = []; let p = 1; for (let i = 0; i < n; i++) { const len = L.ri(R, 6, 40); P.push([p, p + len - 1]); p += len; } const diffs = P.map(() => L.pick(R, ['easy', 'medium', 'hard']));
  return { id, title: id, type: 'book', total: n, startNum: 0, progress: 0, start, end: '2027-01-31', pace: 'daily', paceValue: null, reviewDays: [0], skipDates: [], timeBased: true, timeMode: 'deadline', lectureDurations: P.map((q, i) => L.pw(q[0], q[1], diffs[i])), itemDifficulty: diffs, itemAmount: diffs.map(() => 'medium'), itemPages: P, itemDays: P.map((q, i) => (i % 5 === 2 ? 3 : 0)),
    extras: [{ id: 'q' + id, t: 'Q', w: 8, at: 6, u: 'pg', pg: 8, df: 'medium' }, { id: 'e' + id, t: 'E', w: 6, at: 100000, u: 'pg', pg: 6, df: 'medium' }] }; };
const mkLec = (id, n) => ({ id, title: id, type: 'lecture', total: n, startNum: 0, progress: 0, start, end: '2027-01-15', pace: 'weekly-n', paceValue: 5, reviewDays: [], skipDates: [], timeBased: true, timeMode: 'deadline', lectureDurations: Array.from({ length: n }, () => L.ri(R, 15, 80)) });
const mkCnt = (id) => ({ id, title: id, type: 'book', total: 600, startNum: 0, progress: 0, start, end: '2027-01-31', pace: 'daily', paceValue: null, reviewDays: [], skipDates: [] });
const tasks = [mkPage('P1', 24), mkPage('P2', 30), mkPage('P3', 18), mkLec('L1', 60), mkLec('L2', 45), mkCnt('N1'), mkCnt('N2'), mkCnt('N3')];
const app = L.makeApp(L.HTML, start, { 'focus-calculate-tasks-v1': tasks, 'focus-calculate-settings-v1': { avail: null, weights: [1, 1, 2, 1, 1, 2, 1], offDates: [], wHist: [], offLog: {}, ppRuleFrom: '2026-10-01' } });
for (const ds of L.days(start, 9)) { app.setDay(ds); tasks.forEach(t => app.check(t.id)); }
const d0 = L.addD(start, 9), d1 = L.addD(start, 10);
app.setDay(d0);
const time = (view, n = 9) => { app.view(view); const xs = []; for (let i = 0; i < n; i++) { const t0 = process.hrtime.bigint(); app.ev('rerender()'); xs.push(Number(process.hrtime.bigint() - t0) / 1e6); } xs.sort((a, b) => a - b); return xs[Math.floor(n / 2)]; };
const calls = (view) => { app.view(view); return app.ev(`(() => { const o = window.buildScheduleCore; let n = 0; window.buildScheduleCore = function () { n++; return o.apply(this, arguments); }; try { rerender(); } finally { window.buildScheduleCore = o; } return n; })()`); };
const base = {}, baseCalls = {};
for (const v of ['today', 'week', 'active']) { base[v] = time(v); baseCalls[v] = calls(v); }
let n = 0;
for (const t of tasks) { const s = L.st(app, t.id); for (const ds of [d0, d1]) { const r = L.rowOf(s, ds); if (!r) continue; const page = !!t.itemPages; L.setPin(app, t.id, ds, page ? (r[8] != null ? { pg: r[8] + 5 } : null) : { to: r[2] - (t.startNum || 0) + 1 }); n++; } }
const pinnedN = tasks.filter(t => L.st(app, t.id).pinned).length;
console.log(`8 goals, ${pinnedN} with pinned plans (${n} pins)`);
for (const v of ['today', 'week', 'active']) { const t = time(v), c = calls(v); console.log(`  ${v.padEnd(7)} screen: ${base[v].toFixed(0)} ms → ${t.toFixed(0)} ms with pins (×${(t / base[v]).toFixed(1)}) · plan calculations per draw ${baseCalls[v]} → ${c}`); }
// the window: typing one digit
app.ev(`openPinModal('P1', '${d0}')`);
const inp = app.doc.getElementById('pn-input'); const xs = [];
for (let i = 0; i < 7; i++) { inp.value = String(parseInt(inp.value) + 1); const t0 = process.hrtime.bigint(); inp.dispatchEvent(new app.win.Event('input', { bubbles: true })); xs.push(Number(process.hrtime.bigint() - t0) / 1e6); }
xs.sort((a, b) => a - b);
console.log(`  typing in the 양 정하기 window (preview refresh): ${xs[3].toFixed(0)} ms per keystroke`);
console.log('errors', app.errors.length);
app.close();
