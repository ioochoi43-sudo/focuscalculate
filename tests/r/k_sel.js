const C = require('./common');
const app = C.mk([C.S.pageTask('H')]);
for (const ds of C.days('2026-11-09', 34)) { app.setDay(ds); const t = app.task('H'); const s = C.st(app, 'H'); if (t.progress === 9 && s.reached > 141) break; app.check('H'); }
app.view('active');
app.doc.querySelector('[data-action="add-extra"][data-id="H"]').click();
const sel = app.doc.getElementById('xm-at');
console.log('options', [...sel.options].map(o => o.value + '=' + o.textContent).join(' | '), 'selected value:', JSON.stringify(sel.value), 'selectedIndex', sel.selectedIndex);
app.doc.getElementById('xm-pg').value = '10'; app.doc.getElementById('xm-pg').dispatchEvent(new app.win.Event('input', { bubbles: true }));
console.log('preview', app.doc.getElementById('xm-preview').textContent);
app.doc.getElementById('xm-save').click();
console.log('toast', app.doc.getElementById('toast').textContent, 'extras', JSON.stringify(app.task('H').extras));
// normal case: chapter not under way → default = 바로 다음
app.close();
