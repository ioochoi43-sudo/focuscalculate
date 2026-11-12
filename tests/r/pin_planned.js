// Review: plannedRecord(task, today's row) — "what checking today exactly as planned records" (used for a pinned tomorrow) —
// against what the real buttons write. Random goals over their whole life, different paths (card ✓, 오늘 list ✓),
// with deviations / postpones / reviews / skipped chapters in between to reach unusual states.
// usage: node r/pin_planned.js <firstSeed> <count>
const L = require('./pin_lib');
const seed0 = parseInt(process.argv[2] || '1'), N = parseInt(process.argv[3] || '15');
const KINDS = ['count', 'lecture', 'weight', 'page', 'pageX', 'pageX', 'page', 'weight'];
let issues = 0, compared = 0; const kindsSeen = {};
for (let seed = seed0; seed < seed0 + N; seed++) {
  const R = L.rng(seed * 6700417 + 11);
  const start = L.pick(R, ['2026-11-02', '2026-11-05', '2026-12-14']);
  const ts = [0, 1, 2].map(i => L.genTask(R, L.pick(R, KINDS), 'T' + i, start));
  const settings = L.genSettings(R);
  const app = L.makeApp(L.HTML, start, { 'focus-calculate-tasks-v1': ts, 'focus-calculate-settings-v1': settings });
  app.win.confirm = () => true;
  const d = app.doc;
  for (const ds of L.days(start, 48)) {
    app.setDay(ds);
    for (let i = 0; i < 3; i++) {
      const id = 'T' + i, t = app.task(id);
      if (t.progress >= t.total) continue;
      const page = !!(t.timeBased && t.itemPages);
      const q = R();
      // now and then: something that changes the state
      if (q < 0.05 && t.timeBased) { app.view('active'); const b = d.querySelector(`[data-action="skip-chapter"][data-id="${id}"]`); if (b) { b.click(); if (d.getElementById('skipModal').classList.contains('show')) { const sel = d.getElementById('sk-rel'); sel.selectedIndex = Math.min(sel.options.length - 1, Math.floor(R() * 3)); d.getElementById('sk-save').click(); if (d.getElementById('skipModal').classList.contains('show')) d.getElementById('sk-cancel').click(); } } }
      else if (q < 0.10 && t.timeBased) { app.view('active'); const b = d.querySelector(`[data-action="add-extra"][data-id="${id}"]`); if (b) { b.click(); d.getElementById('xm-name').value = 'R'; if (d.getElementById('xm-pg')) d.getElementById('xm-pg').value = String(L.ri(R, 2, 14)); else if (d.getElementById('xm-min')) d.getElementById('xm-min').value = L.ri(R, 10, 50) + '분'; const sel = d.getElementById('xm-at'); sel.selectedIndex = Math.floor(R() * sel.options.length); d.getElementById('xm-save').click(); if (d.getElementById('extraModal').classList.contains('show')) d.getElementById('xm-cancel').click(); } }
      const z = R();
      if (z < 0.08) { L.postpone(app, id, R() < 0.5 ? 'week' : 'deadline'); continue; }
      if (z < 0.14) continue; // nothing today
      const pre = JSON.parse(app.ev(`(() => { const t = tasks.find(x => x.id === '${id}'); const p = buildSchedule(t), tS = fmtDate(today());
        const row = p.schedule.find(x => !x.isPast && !x.isReview && fmtDate(x.date) === tS);
        if (!row) return JSON.stringify({ none: 1 });
        const done = !!todayWorkRec(t.id), r = row.isCatchUp || done ? null : plannedRecord(t, row, tS);
        const sk = []; for (let a = row.from; a <= row.to; a++) if (isSkippedRel(t, a - (t.startNum || 0) - 1)) sk.push(a);
        return JSON.stringify({ r, done, row: [row.from, row.to, row.isPart ? row.partN + '/' + row.partOf : '', row.pFrom, row.pTo, (row.revs || []).map(x => x.t).join('+'), row.isCatchUp ? 'catchup' : '', sk.length ? 'skips ' + sk.join(',') : '', row.skToday ? 'skToday' : ''], prog: t.progress }); })()`));
      if (pre.none) continue;
      if (z < 0.30 && !pre.done && pre.row[6] !== 'catchup') { // a different amount today
        const v = (page && pre.row[4] != null ? pre.row[4] : pre.row[1]) + (page ? L.ri(R, -6, 12) || 2 : L.ri(R, -1, 2) || 1);
        if (page && pre.row[4] == null) app.check(id); else L.checkAt(app, id, v);
        continue;
      }
      if (pre.done || pre.row[6] === 'catchup') { continue; }
      // exactly as planned, through one of the two ✓ buttons
      const viaAgenda = R() < 0.5;
      let how;
      if (viaAgenda) { app.view('today'); const b = d.querySelector(`#todayList [data-action="toggle-complete"][data-id="${id}"][data-review="false"]`); if (!b) continue; if (b.textContent.trim() === '✓') { b.click(); app.view('today'); const b2 = d.querySelector(`#todayList [data-action="toggle-complete"][data-id="${id}"][data-review="false"]`); if (!b2) continue; b2.click(); } else b.click(); how = app.modalOpen() ? 'list+window' : 'list toggle'; if (app.modalOpen()) d.getElementById('cm-save').click(); }
      else { app.view('active'); const b = d.querySelector(`[data-action="toggle-today-complete"][data-id="${id}"]`); if (!b) continue; if (b.textContent.trim() === '✓') { b.click(); app.view('active'); d.querySelector(`[data-action="toggle-today-complete"][data-id="${id}"]`).click(); } else b.click(); how = app.modalOpen() ? 'card+window' : 'card toggle'; if (app.modalOpen()) d.getElementById('cm-save').click(); }
      const post = JSON.parse(app.ev(`(() => { const t = tasks.find(x => x.id === '${id}'); return JSON.stringify({ rec: completedMap.get(t.id + '|' + fmtDate(today())) || null, prog: t.progress }); })()`));
      compared++;
      const rowKind = (pre.row[2] ? 'part' : 'whole') + (pre.row[3] == null && page ? '/no page' : '') + (pre.row[5] ? '/review' : '') + (pre.row[7] ? '/skips' : '') + ' via ' + how;
      kindsSeen[rowKind] = (kindsSeen[rowKind] || 0) + 1;
      const want = pre.r ? JSON.stringify(pre.r.rec) : 'null', got = JSON.stringify(post.rec);
      const wantProg = pre.r ? pre.r.prog : pre.prog;
      if (want !== got || wantProg !== post.prog) { issues++; console.log(`ISSUE seed ${seed} ${id} ${ds} (${rowKind}) row ${JSON.stringify(pre.row)}\n   plannedRecord: ${want} progress ${wantProg}\n   the button   : ${got} progress ${post.prog}`); }
    }
  }
  if (app.errors.length) { issues++; console.log(`ISSUE seed ${seed}: errors ${app.errors.slice(0, 2).join(' / ')}`); }
  app.close();
}
console.log(`compared ${compared} planned checks, issues ${issues}`);
console.log('row kinds / paths:', JSON.stringify(kindsSeen, null, 0));
