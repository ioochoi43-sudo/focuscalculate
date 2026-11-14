// v4.10.2: three small fixes — week-goal hint says why, 건너뛴 챕터 aren't counted as done in the progress bar,
// a backup with a fractional amount loads cleanly.
const { makeApp } = require('./h');
const { weightTask, pageTask, lectureTask } = require('./seed');
const HTML = process.env.FC_HTML || require('path').join(__dirname, '..', '..', 'index.html');
let passes = 0, fails = 0;
const ok = (c, msg) => { if (c) passes++; else { fails++; console.log('FAIL:', msg); } };
const SET = { avail: null, weights: [1, 1, 1, 1, 1, 1, 1], offDates: [], wHist: [], offLog: {}, ppRuleFrom: '2026-10-01' };
const cnt = (id) => ({ id, title: id, type: 'book', total: 240, startNum: 10, progress: 0, start: '2026-11-09', end: '2026-12-10', pace: 'daily', paceValue: null, reviewDays: [], skipDates: [] });
const hintOf = (app, id) => { app.view('week'); const it = [...app.doc.querySelectorAll('.week-goal-item')].find(x => x.textContent.includes(id)); const h = it && it.querySelector('.week-goal-hint'); return h ? h.textContent.replace(/\s+/g, ' ').trim() : ''; };

// --- 1) week-goal hint ---
{
  const app = makeApp(HTML, '2026-11-09', { 'focus-calculate-tasks-v1': [cnt('ppGoal'), cnt('editGoal'), cnt('lessGoal'), cnt('sameGoal')], 'focus-calculate-settings-v1': SET });
  app.view('week'); // Monday: goals are fixed automatically
  ['ppGoal', 'editGoal', 'lessGoal', 'sameGoal'].forEach(id => ok(hintOf(app, id) === '', `${id}: no hint on the day the goal is fixed (${hintOf(app, id)})`));
  app.check('lessGoal', { delta: -20 }); app.check('sameGoal'); app.check('ppGoal'); app.check('editGoal');
  app.setDay('2026-11-10');
  // postpone to the deadline
  app.view('active'); app.doc.querySelector('[data-action="postpone-today"][data-id="ppGoal"]').click(); app.doc.getElementById('pp-deadline').click();
  // move the deadline
  app.view('active'); app.doc.querySelector('[data-action="edit"][data-id="editGoal"]').click();
  const e = app.doc.getElementById('e-end'); e.value = '2026-11-25'; e.dispatchEvent(new app.win.Event('change', { bubbles: true })); app.doc.getElementById('e-save').click();
  const hp = hintOf(app, 'ppGoal'), he = hintOf(app, 'editGoal'), hl = hintOf(app, 'lessGoal'), hs = hintOf(app, 'sameGoal');
  ok(/지금 계획대로면 .*까지 \(미루기 반영\)$/.test(hp), `postponed: "${hp}"`);
  ok(/지금 계획대로면 .*까지 \(계획 변경 반영\)$/.test(he), `edited: "${he}"`);
  ok(/지금 계획대로면 .*까지 \(실제 진도 반영\)$/.test(hl), `did less: "${hl}"`);
  ok(hs === '', `as planned: no hint ("${hs}")`);
  // both: postpone the edited goal too
  app.check('editGoal'); app.setDay('2026-11-11');
  app.view('active'); app.doc.querySelector('[data-action="postpone-today"][data-id="editGoal"]').click(); app.doc.getElementById('pp-deadline').click();
  const hb = hintOf(app, 'editGoal');
  ok(/\(미루기·계획 변경 반영\)$/.test(hb), `postponed + edited: "${hb}"`);
  // ↻ makes the goal follow the plan again: no hint
  app.view('week'); app.doc.querySelector('[data-action="refresh-week-goal"][data-id="ppGoal"]').click();
  ok(hintOf(app, 'ppGoal') === '', `after ↻: no hint ("${hintOf(app, 'ppGoal')}")`);
  ok(app.errors.length === 0, 'no errors (hint) ' + app.errors.slice(0, 2));
  app.close();
}

// --- 2) 건너뛴 챕터 and the progress bar ---
{
  const W = (id, x) => weightTask(id, Object.assign({ itemDays: undefined }, x));
  const d1 = weightTask('x').lectureDurations[1];
  const T = [
    W('plain', { progress: 3 }),
    W('waiting', { progress: 3, skipped: [1], extras: [{ id: 'k1', t: '2', w: d1, at: 100000, sk: 1 }] }),
    W('dropped', { progress: 3, skipped: [1] }),
    W('ahead', { progress: 1, skipped: [1], extras: [{ id: 'k2', t: '2', w: d1, at: 100000, sk: 1 }] }),
    W('done', { progress: 12, skipped: [1], extras: [{ id: 'k3', t: '2', w: d1, at: 100000, sk: 1 }] }),
    Object.assign(cnt('count'), { progress: 60 }),
  ];
  const app = makeApp(HTML, '2026-11-12', { 'focus-calculate-tasks-v1': T, 'focus-calculate-settings-v1': SET });
  const sp = (id) => JSON.parse(app.ev(`(() => { const t = tasks.find(x => x.id === '${id}'), p = buildSchedule(t); return JSON.stringify(Object.assign({ planPct: p.pct, planExp: p.expectedPct }, skipProgress(t, p))); })()`));
  let r = sp('plain'); ok(r.pct === r.planPct && r.expectedPct === r.planExp && r.waiting === 0, 'no 건너뛰기: the plan\'s own numbers ' + JSON.stringify(r));
  r = sp('count'); ok(r.pct === 25 && r.pct === r.planPct && r.waiting === 0, 'count goal unchanged ' + JSON.stringify(r));
  r = sp('waiting'); ok(r.planPct === 25 && r.pct === 17 && r.waiting === 1, 'passed, still waiting: 2 of 12 ' + JSON.stringify(r));
  r = sp('dropped'); ok(r.pct === 18 && r.waiting === 0, '안 하기: 2 of 11 ' + JSON.stringify(r));
  r = sp('ahead'); ok(r.pct === 8 && r.waiting === 0, 'not passed yet: 1 of 12 ' + JSON.stringify(r));
  r = sp('done'); ok(r.pct === 100 && r.waiting === 0, 'all done: 100% ' + JSON.stringify(r));
  const card = app.cardText('waiting');
  ok(/건너뛴 1개는 아직 남아 있어요/.test(card) && /17%/.test(card), 'card shows the note and 17%: ' + card.slice(0, 160));
  ok(!/아직 남아 있어요/.test(app.cardText('plain')) && !/아직 남아 있어요/.test(app.cardText('dropped')), 'no note without waiting chapters');
  ok(app.errors.length === 0, 'no errors (progress) ' + app.errors.slice(0, 2));
  app.close();
}

// --- 3) a backup with a fractional amount ---
{
  const T = [pageTask('pg', { progress: 3 }), lectureTask('lec', { progress: 4 })];
  const C = [['pg|2026-11-12', { amount: 2.5 }], ['lec|2026-11-12', { amount: 1.2 }], ['lec|2026-11-11', { amount: 3 }], ['pg|2026-11-11', { amount: 0.3 }]];
  const app = makeApp(HTML, '2026-11-12', { 'focus-calculate-tasks-v1': T, 'focus-calculate-completed-v2': Object.fromEntries(C), 'focus-calculate-settings-v1': SET });
  const recs = JSON.parse(app.ev(`JSON.stringify([...completedMap.entries()])`));
  const amt = (k) => (recs.find(x => x[0] === k) || [0, {}])[1].amount;
  ok(amt('pg|2026-11-12') === 3 && amt('lec|2026-11-12') === 1 && amt('lec|2026-11-11') === 3 && amt('pg|2026-11-11') === 0, 'amounts are whole numbers ' + JSON.stringify(recs));
  const plans = app.ev(`(() => { try { return tasks.map(t => buildSchedule(t).schedule.length).join(','); } catch (e) { return 'THROW ' + e.message; } })()`);
  ok(!/THROW/.test(plans), 'plans build: ' + plans);
  app.view('active'); app.view('week'); app.view('today');
  ok(app.errors.length === 0, 'no errors (fractional amount) ' + app.errors.slice(0, 2));
  app.close();
}
console.log(`passes ${passes} fails ${fails}`);
