// Review: smaller checks around pins (each prints what it found)
const L = require('./pin_lib');
const S = L.S;
const cnt = (id, x) => Object.assign({ id, title: id, type: 'book', total: 240, startNum: 10, progress: 0, start: '2026-11-09', end: '2026-12-10', pace: 'daily', paceValue: null, reviewDays: [], skipDates: [] }, x || {});
const txt = (el) => (el ? el.textContent.replace(/\s+/g, ' ').trim() : '');

// ---- 1) "하루치 넘게 밀림" (주의가 필요한 목표 / 미루기 창) uses today's load — with a small pinned day it flips ----
{
  const app = L.mk([cnt('N'), cnt('M')]);
  const d = app.doc;
  // three days: only the first is done → behind by a bit less than one normal day?  (two missed days = behind ~2 days; use one)
  app.setDay('2026-11-09'); app.check('N'); app.check('M');
  app.setDay('2026-11-10'); app.check('N', { page: 22 }); app.check('M', { page: 22 }); // half a day
  app.setDay('2026-11-11');
  const s0 = L.st(app, 'N');
  app.view('today');
  const risk0 = txt(d.getElementById('riskBox'));
  const r = L.pinUI(app, 'N', '2026-11-11', (i) => i.min + 1); // today: only 2 pages
  app.view('today');
  const risk1 = txt(d.getElementById('riskBox'));
  const s1 = L.st(app, 'N');
  console.log(`[1] status ${s0.status} (behind ${s0.behind}) → with today pinned to ${r.val}: status ${s1.status} (behind ${s1.behind})`);
  console.log(`    주의 box before: "${risk0}"`);
  console.log(`    주의 box after : "${risk1}"`);
  console.log(/N.*하루치 넘게 밀림/.test(risk1) && !/N.*하루치 넘게 밀림/.test(risk0.replace(/M.*/, '')) ? '    CONFIRMED: setting a small amount for today alone makes "하루치 넘게 밀림" appear (nothing was done or missed)' : '    not reproduced');
  app.close();
}

// ---- 2) a goal that starts tomorrow: tomorrow can be pinned; next morning the same plan ----
{
  const app = L.mk([cnt('N', { start: '2026-11-10' }), S.pageTask('P', { start: '2026-11-10' })], '2026-11-09');
  const out = [];
  for (const id of ['N', 'P']) {
    const r = L.pinUI(app, id, '2026-11-10', (i) => i.def + 5);
    const sP = L.st(app, id);
    out.push(`${id}: window ${r.ok ? 'saved ' + JSON.stringify(r.pin) : r.msg} pinned ${sP.pinned}`);
    if (r.ok) { const shown = L.rowsFrom(sP, '2026-11-10'); app.setDay('2026-11-10'); const sM = L.st(app, id); out.push(`   next morning same plan ${L.rowsFrom(sM, '2026-11-10') === shown} · 계산 점검 ${JSON.stringify(sM.sc)}`); app.setDay('2026-11-09'); }
  }
  console.log('[2] goal starting tomorrow:\n    ' + out.join('\n    '), '| errors', app.errors.length);
  app.close();
}

// ---- 3) check a pinned day, un-check it, check again; and the card's "완료" field on a pinned day ----
{
  const app = L.mk([S.pageTask('P'), S.pageTask('B'), cnt('N'), cnt('M')]);
  const d = app.doc;
  for (const ds of L.days('2026-11-09', 3)) { app.setDay(ds); ['P', 'B', 'N', 'M'].forEach(id => app.check(id)); }
  const d0 = '2026-11-12', d1 = '2026-11-13';
  app.setDay(d0);
  const rp = L.pinUI(app, 'P', d0, (i) => i.def + 9), rn = L.pinUI(app, 'N', d0, (i) => i.def - 4);
  const shownP = L.rowsFrom(L.st(app, 'P'), d0), shownN = L.rowsFrom(L.st(app, 'N'), d0);
  app.check('P'); app.check('N');
  const recP = JSON.stringify(L.st(app, 'P').rec), recN = JSON.stringify(L.st(app, 'N').rec);
  // un-check both (card button again)
  for (const id of ['P', 'N']) { app.view('active'); d.querySelector(`[data-action="toggle-today-complete"][data-id="${id}"]`).click(); }
  const backP = L.st(app, 'P'), backN = L.st(app, 'N');
  console.log(`[3] un-checked a pinned day: record gone ${!backP.rec && !backN.rec} · the pinned plan is back ${L.rowsFrom(backP, d0) === shownP && L.rowsFrom(backN, d0) === shownN} · pins still stored ${!!(backP.pins && backN.pins)}`);
  app.check('P'); app.check('N');
  console.log(`    checked again: same records ${JSON.stringify(L.st(app, 'P').rec) === recP && JSON.stringify(L.st(app, 'N').rec) === recN}`);
  // the "완료" field on a pinned day (count goal): type the pinned number; twin M types the same
  for (const id of ['N']) { app.view('active'); d.querySelector(`[data-action="toggle-today-complete"][data-id="${id}"]`).click(); }
  for (const id of ['N', 'M']) { app.view('active'); const inp = d.querySelector(`[data-action="update-progress"][data-id="${id}"]`); inp.value = String(rn.val); inp.dispatchEvent(new app.win.Event('change', { bubbles: true })); }
  const n = L.st(app, 'N'), m = L.st(app, 'M');
  console.log(`    "완료" field on the pinned day: same as the twin ${JSON.stringify(n.rec) === JSON.stringify(m.rec) && L.rowsFrom(n, d0) === L.rowsFrom(m, d0) && n.status === m.status} · errors ${app.errors.length}`);
  app.close();
}

// ---- 4) reload (pins survive), export/import, old-style data ----
{
  const app = L.mk([S.pageTask('P'), cnt('N')]);
  for (const ds of L.days('2026-11-09', 2)) { app.setDay(ds); app.check('P'); app.check('N'); }
  const d0 = '2026-11-11', d1 = '2026-11-12';
  app.setDay(d0);
  L.pinUI(app, 'P', d0, (i) => i.def + 4); L.pinUI(app, 'N', d1, (i) => i.def + 9);
  const shown = [L.rowsFrom(L.st(app, 'P'), d0), L.rowsFrom(L.st(app, 'N'), d0)];
  const store = {}; ['focus-calculate-tasks-v1', 'focus-calculate-completed-v2', 'focus-calculate-weekgoals-v1', 'focus-calculate-settings-v1'].forEach(k => { store[k] = app.win.localStorage.getItem(k); });
  const app2 = L.makeApp(L.HTML, d0, store);
  const again = [L.rowsFrom(L.st(app2, 'P'), d0), L.rowsFrom(L.st(app2, 'N'), d0)];
  console.log(`[4] reload: same pinned plans ${shown[0] === again[0] && shown[1] === again[1]} · stored records untouched ${app2.win.localStorage.getItem('focus-calculate-completed-v2') === store['focus-calculate-completed-v2']}`);
  // garbage in dayPins must not break loading
  const tk = JSON.parse(store['focus-calculate-tasks-v1']);
  tk[0].dayPins = { [d0]: { pg: 'x' }, [d1]: null, junk: { to: 3 }, '2026-13-45': { to: 2 } }; tk[1].dayPins = [1, 2, 3];
  const app3 = L.makeApp(L.HTML, d0, Object.assign({}, store, { 'focus-calculate-tasks-v1': JSON.stringify(tk) }));
  console.log(`    broken dayPins on load: P ${JSON.stringify(app3.task('P').dayPins || null)} N ${JSON.stringify(app3.task('N').dayPins || null)} · errors ${app3.errors.length} · plans built ${L.st(app3, 'P').rows.length > 0 && L.st(app3, 'N').rows.length > 0}`);
  // huge / fractional / negative values straight in storage
  tk[0].dayPins = { [d0]: { pg: 999999 }, [d1]: { pg: 1 } }; tk[1].dayPins = { [d0]: { to: 1e9 }, [d1]: { to: 2.5 } };
  const app4 = L.makeApp(L.HTML, d0, Object.assign({}, store, { 'focus-calculate-tasks-v1': JSON.stringify(tk) }));
  const p4 = L.st(app4, 'P'), n4 = L.st(app4, 'N');
  console.log(`    extreme values: P pins ${JSON.stringify(p4.pins)} pinned ${p4.pinned} today's row ${JSON.stringify(L.rowOf(p4, d0))} 점검 ${JSON.stringify(p4.sc)} loads ${p4.sum}/${p4.left}`);
  console.log(`                    N pins ${JSON.stringify(n4.pins)} pinned ${n4.pinned} today's row ${JSON.stringify(L.rowOf(n4, d0))} 점검 ${JSON.stringify(n4.sc)} loads ${n4.sum}/${n4.left} · errors ${app4.errors.length}`);
  app.close(); app2.close(); app3.close(); app4.close();
}
