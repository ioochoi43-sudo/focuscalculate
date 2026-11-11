const C = require('./common');
const app = C.mk([C.S.weightTask('Y1'), C.S.weightTask('Y2')]);
let D = null, rowD = null;
for (const ds of C.days('2026-11-09', 30)) {
  app.setDay(ds);
  const r = C.row0(app, 'Y2');
  if (r && r.part && r.n === 1 && r.from > 1) { D = ds; rowD = r; break; }
  app.check('Y1'); app.check('Y2');
}
console.log('D', D, JSON.stringify(rowD));
app.check('Y1');
app.setDay(C.days(D, 2)[1]);
const res = C.addExtra(app, 'Y2', 'R', C.daFill('hard', 'high'), rowD.from - 1);
console.log('added', JSON.stringify(res));
app.view('today');
const b = app.doc.querySelector('[data-action="yday-done"][data-id="Y2"]');
b.click(); if (app.modalOpen()) app.doc.getElementById('cm-save').click();
const y1 = C.st(app, 'Y1'), y2 = C.st(app, 'Y2');
console.log('Y1', JSON.stringify(y1));
console.log('Y2', JSON.stringify(y2));
console.log('Y2 W of chapter', app.ev(`(() => { const t = tasks.find(x => x.id === 'Y2'); const q = glueOf(t, ${rowD.from - 1}); return JSON.stringify(q); })()`));
console.log('Y2 today row', JSON.stringify(C.row0(app, 'Y2')), 'Y1 today row', JSON.stringify(C.row0(app, 'Y1')));
app.close();
