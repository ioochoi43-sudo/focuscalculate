const C = require('./common');
const ex = [{ id: 'a', t: 'A<b>"x"', w: 6, at: 4, u: 'pg' }, { id: 'e', t: 'END', w: 5, at: 10, u: 'pg' }];
const app = C.mk([C.S.pageTask('O', { extras: ex, start: '2026-10-20', end: '2026-11-05', progress: 2 }), C.S.lectureTask('LO', { extras: [{ id: 'q', t: 'Q', w: 40, at: 20, u: 'min' }], start: '2026-10-01', end: '2026-11-01', progress: 15 })], '2026-11-09');
app.setDay('2026-11-09');
console.log('O snap', JSON.stringify(app.snap('O').rows.filter(r => r[0] >= '2026-11-09')));
console.log('O card', app.cardText('O').slice(0, 400));
console.log('LO snap', JSON.stringify(app.snap('LO').rows.filter(r => r[0] >= '2026-11-09')));
const h = app.doc.querySelector('.task-card[data-id="O"]').innerHTML;
console.log('escaped?', h.includes('A&lt;b&gt;'), !h.includes('A<b>'));
// check catch-up by page: enter last page
app.view('active');
app.doc.querySelector('[data-action="toggle-today-complete"][data-id="O"]').click();
console.log('modal', app.modalOpen(), app.doc.getElementById('cm-sub').textContent, app.doc.getElementById('cm-input').value);
const inp = app.doc.getElementById('cm-input'); inp.value = '60'; inp.oninput();
console.log('at p60 box', app.doc.getElementById('cm-rev').style.display, app.doc.getElementById('cm-rev-txt').textContent, app.doc.getElementById('cm-rev-cb').checked, app.doc.getElementById('cm-helper').textContent);
app.doc.getElementById('cm-save').click();
console.log('O after', JSON.stringify(C.st(app, 'O')));
console.log('errors', app.errors.slice(0, 3));
app.close();
