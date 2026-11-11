const L = require('./lib');
const { mk, days, addExtra, pgFill, inv, follow, ok } = L;
const { pageTask, lectureTask, weightTask } = require('./seed');
function skip(app, id, rel) {
  const d = app.doc; app.view('active');
  const b = d.querySelector(`[data-action="skip-chapter"][data-id="${id}"]`); if (!b) return 'nobtn';
  b.click();
  if (!d.getElementById('skipModal').classList.contains('show')) return 'blocked';
  const opts = [...d.getElementById('sk-rel').options].map(o => o.value);
  if (rel != null) d.getElementById('sk-rel').value = String(rel);
  d.getElementById('sk-rel').dispatchEvent(new app.win.Event('change'));
  const prev = d.getElementById('sk-preview').textContent;
  d.getElementById('sk-save').click();
  return { opts, prev };
}
const act = (app, id, action, rel) => { app.view('active'); const b = app.doc.querySelector(`[data-action="${action}"][data-id="${id}"]${rel != null ? `[data-rel="${rel}"]` : ''}`); if (!b) return false; app.win.confirm = () => true; b.click(); return true; };
const fut = (app, id) => app.snap(id).rows.filter(r => r[0] >= app.today()).map(r => r.slice(0, 9).join(' ')).join('|');
const rowsX = (app, id) => JSON.parse(app.ev(`(() => { const t = tasks.find(x => x.id === '${id}'); return JSON.stringify(buildSchedule(t).schedule.filter(s => !s.isPast && !s.isReview).map(s => ({ d: fmtDate(s.date), from: s.from, to: s.to, pt: s.pText || null, pf: s.pFrom, pto: s.pTo, n: s.pFrom != null ? pagesIn(t, s.pFrom, s.pTo) : null, sk: s.skips || null, revs: (s.revs || []).map(x => (x.sk != null ? 'K' : 'R') + x.t) }))); })()`));

// S1 pages deadline: skip 3장 on day 1, follow the plan; twin created with the skip
{
  const app = mk([pageTask('S'), pageTask('S2', { skipped: [2], extras: [{ id: 'k2', t: '3장', w: 5.33, at: 100000, sk: 2 }] }), pageTask('S0')]);
  const r = skip(app, 'S', 2);
  console.log('S1 skip', JSON.stringify(r));
  ok(JSON.stringify(app.task('S').skipped) === '[2]', 'S1: skipped saved');
  ok(fut(app, 'S') === fut(app, 'S2'), 'S1: skipped today == created skipped');
  const R = rowsX(app, 'S');
  const hit = R.filter(x => x.sk && x.sk.includes(3));
  ok(hit.length === 1, 'S1: one row shows 3장 skipped ' + JSON.stringify(hit));
  if (hit[0]) { const h = hit[0], ov = Math.max(0, Math.min(h.pto, 38) - Math.max(h.pf, 31) + 1);
    ok(!/3[1-8]\b/.test(h.pt || '') && h.n === (h.pto - h.pf + 1) - ov, 'S1: skipped pages left out ' + JSON.stringify(h)); }
  ok(R.some(x => x.revs.includes('K3장')), 'S1: 건너뛴 3장 scheduled at the end');
  console.log('S1 rows', R.slice(0, 6).map(x => `${x.d} ${x.from}-${x.to} ${x.pt || (x.pf + '~' + x.pto)} ${x.sk || ''} ${x.revs}`).join(' | '));
  follow(app, ['S', 'S2'], '2026-11-09', 36);
  ok(app.task('S').progress === 10 && app.task('S2').progress === 10, 'S1: finished');
  console.log('S1 errors', app.errors.slice(0, 3));
  app.close();
}
// S2 weight (itemDays 3 on rel 1) skip rel 1 — a chapter set to 3 days doesn't keep empty days
{
  const app = mk([weightTask('W')]);
  skip(app, 'W', 1);
  const R = rowsX(app, 'W');
  ok(!R.some(x => x.from === 2 && x.to === 2), 'W: no row with only the skipped chapter ' + JSON.stringify(R.slice(0, 4)));
  follow(app, ['W'], '2026-11-09', 45);
  ok(app.task('W').progress === 12, 'W finished');
  app.close();
}
// S3 lectures deadline + capacity, skipped mid-way
{
  const app = mk([lectureTask('L1'), lectureTask('L2', { timeMode: 'capacity', dailyMinutes: 80 })]);
  follow(app, ['L1', 'L2'], '2026-11-09', 4);
  app.setDay('2026-11-13');
  const a = skip(app, 'L1'), b = skip(app, 'L2', 12);
  ok(a !== 'blocked' && b !== 'blocked', 'L: skip allowed');
  follow(app, ['L1', 'L2'], '2026-11-13', 30);
  ok(app.task('L1').progress === 20 && app.task('L2').progress === 20, 'L finished');
  app.close();
}
// S4 다시 넣기 same day restores; 안 하기 lightens; 되살리기 restores
{
  const app = mk([pageTask('U'), pageTask('U0'), pageTask('UZ', { skipped: [4] })]);
  const base = fut(app, 'U0');
  skip(app, 'U', 4);
  ok(fut(app, 'U') !== base, 'U: skip changes plan');
  ok(act(app, 'U', 'skip-back', 4), 'U: 다시 넣기 button');
  ok(fut(app, 'U') === base && !app.task('U').skipped, 'U: 다시 넣기 restores');
  skip(app, 'U', 4);
  const x = app.task('U').extras.find(e => e.sk === 4);
  app.view('active'); app.win.confirm = () => true;
  app.doc.querySelector(`[data-action="del-extra"][data-id="U"][data-x="${x.id}"]`).click();
  ok(JSON.stringify(app.task('U').skipped) === '[4]' && !(app.task('U').extras || []).length, 'U: 안 하기 keeps chapter out, no work');
  ok(fut(app, 'U') === fut(app, 'UZ'), 'U: 안 하기 == chapter weight 0');
  ok(act(app, 'U', 'skip-back', 4), 'U: 되살리기 button');
  ok(fut(app, 'U') === base, 'U: 되살리기 (place not passed) → back in place');
  app.close();
}
// S5 entering the page before / inside a skipped chapter: no false 밀림
{
  const app = mk([pageTask('P', { skipped: [3], extras: [{ id: 'k', t: '4장', w: 22, at: 100000, sk: 3 }] })]);
  let hd = null;
  for (const ds of days('2026-11-09', 30)) {
    app.setDay(ds);
    const r = rowsX(app, 'P')[0];
    if (r && r.sk && r.sk.includes(4)) { hd = ds; break; }
    app.check('P');
  }
  ok(!!hd, 'P: found the row with skipped 4장');
  const r = rowsX(app, 'P')[0];
  console.log('P row', hd, JSON.stringify(r));
  // enter the last page of 3장 (38) → should count as past 4장 when the row ends there
  app.check('P', { page: 38 });
  const t = app.task('P');
  const nd = days(hd, 2)[1]; app.setDay(nd);
  const s = app.snap('P');
  ok(s.status !== 'behind', `P: page right before skipped chapter → status ${s.status} prog ${t.progress}`);
  ok(app.task('P').progress >= 4, 'P: progress past the skipped chapter ' + app.task('P').progress);
  app.close();
}
// S6 lecture: number check stopping right before a skipped lecture
{
  const app = mk([lectureTask('N', { skipped: [2], extras: [{ id: 'k', t: '3강', w: 22, at: 100000, sk: 2 }] })]);
  const r0 = rowsX(app, 'N');
  console.log('N rows', r0.slice(0, 3).map(x => `${x.from}-${x.to} ${x.sk || ''}`).join(' | '));
  for (const ds of days('2026-11-09', 6)) {
    app.setDay(ds);
    const r = rowsX(app, 'N')[0];
    const mode = r && r.sk && r.to === 3 ? { delta: -1 } : 'plan';
    app.check('N', mode);
    const s = app.snap('N');
    ok(s.status !== 'behind' && s.status !== 'ahead', `N ${ds}: status ${s.status} after ${JSON.stringify(mode)}`);
  }
  app.close();
}
// S7 skip + review together, skip blocked by yesterday, last chapter not skippable
{
  const app = mk([pageTask('C')]);
  skip(app, 'C', 2);
  addExtra(app, 'C', 'R', pgFill(6), 3);
  ok(app.task('C').extras.length === 2, 'C: review + skip');
  app.view('active'); app.doc.querySelector('[data-action="add-extra"][data-id="C"]').click();
  const opts = [...app.doc.getElementById('xm-at').options].map(o => o.textContent);
  ok(!opts.some(o => o.includes('3장 시작 전')), 'C: no review position before a skipped chapter ' + opts.slice(0, 4));
  app.doc.getElementById('xm-cancel').click();
  follow(app, ['C'], '2026-11-09', 36);
  ok(app.task('C').progress === 10, 'C finished');
  app.close();
}
{
  const app = mk([lectureTask('Y')]);
  app.check('Y'); app.setDay('2026-11-10'); app.setDay('2026-11-11');
  ok(skip(app, 'Y') === 'blocked', 'Y: skip blocked while yesterday open');
  app.close();
}
console.log('passes', L.stats().passes, 'fails', L.stats().fails);
