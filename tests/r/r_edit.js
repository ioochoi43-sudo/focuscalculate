const C = require('./common');
const withSkip = (t, rels) => { t.skipped = rels; t.extras = rels.map(k => ({ id: 'sk' + k, t: (k + 1) + '장', w: t.lectureDurations[k], at: 100000, sk: k })); return t; };
const app = C.mk([withSkip(C.S.pageTask('P'), [3]), withSkip(C.S.weightTask('W'), [4])]);
for (const ds of C.days('2026-11-09', 3)) { app.setDay(ds); app.check('P'); app.check('W'); }
const openSave = (id, fn) => { app.view('active'); app.doc.querySelector(`[data-action="edit"][data-id="${id}"]`).click(); if (fn) fn(app.doc); app.doc.getElementById('e-save').click(); return app.doc.getElementById('toast').textContent; };
// 1) no-op save
const r0 = C.futRows(app, 'P'), rb0 = JSON.stringify(app.task('P').rebase);
console.log('no-op toast:', openSave('P'), '| plan same', C.futRows(app, 'P') === r0, '| rebase same', JSON.stringify(app.task('P').rebase) === rb0);
// 2) timeBased off then on
const w0 = C.futRows(app, 'W');
console.log('tb off toast:', openSave('W', d => d.getElementById('e-timeBasedToggle').click()), 'tb now', app.task('W').timeBased, 'skipped kept', JSON.stringify(app.task('W').skipped), 'extras', (app.task('W').extras || []).length);
console.log('  card (off):', app.cardText('W').slice(0, 160));
console.log('tb on toast:', openSave('W', d => d.getElementById('e-timeBasedToggle').click()), 'tb now', app.task('W').timeBased);
console.log('  plan back same as before?', C.futRows(app, 'W') === w0, 'status', app.snap('W').status);
// 3) total cut below skipped chapter: P skipped rel 3 (4장); set 끝 = 3
console.log('total→3 toast:', openSave('P', d => { d.getElementById('e-to').value = '3'; d.getElementById('e-to').dispatchEvent(new app.win.Event('input', { bubbles: true })); }), 'total', app.task('P').total);
console.log('  skippedSet', app.ev(`JSON.stringify([...(skippedSet(tasks[0]) || [])])`), 'extrasW', app.ev(`JSON.stringify((tasks[0].extras||[]).map(x => extraW(tasks[0], x)))`), 'selfCheck', app.ev(`JSON.stringify(selfCheckTask(tasks[0]))`), 'status', app.snap('P').status);
console.log('  card:', app.cardText('P').slice(0, 220));
console.log('errors', app.errors.slice(0, 3));
app.close();
