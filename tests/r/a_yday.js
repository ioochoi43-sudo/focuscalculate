const C = require('./common');
// Page goal; day D = first part day of a multi-day chapter. Twin Y1 checks on time; Y2 skips D,
// next morning adds a review before that chapter, then checks yesterday at the planned page.
const app = C.mk([C.S.pageTask('Y1'), C.S.pageTask('Y2')]);
let D = null, rowD = null;
for (const ds of C.days('2026-11-09', 30)) {
  app.setDay(ds);
  const r = C.row0(app, 'Y2');
  if (r && r.part && r.n === 1 && r.from > 1) { D = ds; rowD = r; break; }
  app.check('Y1'); app.check('Y2');
}
console.log('D', D, JSON.stringify(rowD));
app.check('Y1');
const nd = C.days(D, 2)[1];
app.setDay(nd);
const rel = rowD.from - 1;
const res = C.addExtra(app, 'Y2', 'R', C.pgFill(15), rel);
console.log('added', JSON.stringify(res));
app.view('today');
const b = app.doc.querySelector('[data-action="yday-done"][data-id="Y2"]');
console.log('yday btn', !!b, b && b.closest('.agenda-item').textContent.replace(/\s+/g, ' '));
b.click();
console.log('modal', app.modalOpen(), app.doc.getElementById('cm-sub').textContent, 'input', app.doc.getElementById('cm-input').value, 'helper', app.doc.getElementById('cm-helper').textContent);
app.doc.getElementById('cm-save').click();
console.log('Y1', JSON.stringify(C.st(app, 'Y1')));
console.log('Y2', JSON.stringify(C.st(app, 'Y2')));
console.log('Y2 recs', JSON.stringify(C.recs(app, 'Y2').slice(-2)));
console.log('Y2 today row', JSON.stringify(C.row0(app, 'Y2')));
console.log('errors', app.errors);
