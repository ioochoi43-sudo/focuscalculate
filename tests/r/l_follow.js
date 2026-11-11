const C = require('./common');
const cfg = [['A', '2026-12-16', 20], ['B', '2026-12-10', 5], ['Cc', '2026-12-31', 40], ['D', '2026-12-18', 30]];
const app = C.mk(cfg.map(([id, end, w]) => C.S.pageTask(id, { end, extras: [{ id: 'e', t: 'E', w, at: 100000, u: 'pg' }] })));
const fut = (id, from) => app.snap(id).rows.filter(r => r[0] >= from && !r[9]).map(r => [r[0].slice(5), r[3] ? r[4] + '/' + r[5] : 'W' + (r[4] || ''), r[7], r[8], r[11] ? 'R' : ''].join(' ')).join(' | ');
const done = {}, prev = {};
for (const ds of C.days('2026-11-09', 55)) {
  app.setDay(ds);
  const tmr = C.days(ds, 2)[1];
  cfg.forEach(([id]) => {
    if (done[id]) return;
    const sn = app.snap(id);
    if (prev[id] && prev[id] !== fut(id, ds)) console.log(id, ds, 'OVERNIGHT change\n was', prev[id], '\n now', fut(id, ds));
    if (sn.status === 'behind' || sn.status === 'ahead') console.log(id, ds, 'status', sn.status);
    const r = C.row0(app, id);
    const before = fut(id, tmr);
    let box = null;
    if (r && r.from === 10 && r.part && r.pt === 160) {
      app.view('active'); app.doc.querySelector(`[data-action="toggle-today-complete"][data-id="${id}"]`).click();
      box = { shown: app.doc.getElementById('cm-rev').style.display !== 'none', ticked: app.doc.getElementById('cm-rev-cb').checked, txt: app.doc.getElementById('cm-rev-txt').textContent, helper: app.doc.getElementById('cm-helper').textContent };
      app.doc.getElementById('cm-save').click();
      const plan = app.ev(`(() => { return JSON.stringify(${JSON.stringify(r)}); })()`);
      console.log(id, ds, 'last-page part day', JSON.stringify(r), 'box', JSON.stringify(box), 'rec', JSON.stringify(C.st(app, id).rec.part));
    } else app.check(id);
    const after = fut(id, tmr);
    if (before !== after) console.log(id, ds, 'SAME-DAY change after on-plan check\n before', before, '\n after ', after);
    const s2 = app.snap(id);
    if (s2.status === 'ahead') console.log(id, ds, 'ahead right after check');
    prev[id] = after;
    if (s2.prog >= 10) done[id] = ds;
  });
}
console.log('done', JSON.stringify(done));
app.close();
