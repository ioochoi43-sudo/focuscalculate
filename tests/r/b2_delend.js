const C = require('./common');
const app = C.mk([C.S.pageTask('F', { extras: [{ id: 'fe', t: 'END', w: 8, at: 10, u: 'pg', pg: 8, df: 'medium' }] })]);
let hit = null;
for (const ds of C.days('2026-11-09', 35)) { app.setDay(ds); const r = C.row0(app, 'F'); if (r && r.from === 10) { hit = ds; break; } app.check('F'); }
console.log('hit', hit, JSON.stringify(C.row0(app, 'F')));
app.check('F', { page: 160, rev: false }); // read to the end today, review not done
console.log('after', JSON.stringify(C.st(app, 'F')));
app.setDay(C.days(hit, 2)[1]);
app.view('active');
const del = app.doc.querySelector('[data-action="del-extra"][data-id="F"]');
console.log('delete button?', !!del);
app.win.confirm = () => true;
if (del) del.click();
console.log('after delete', JSON.stringify(C.st(app, 'F')), 'extras', JSON.stringify(app.task('F').extras));
console.log('row', JSON.stringify(C.row0(app, 'F')));
console.log('recs', JSON.stringify(C.recs(app, 'F').slice(-1)));
console.log('card', app.cardText('F').slice(0, 200));
app.close();
