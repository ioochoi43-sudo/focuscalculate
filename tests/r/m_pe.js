const C = require('./common');
const app = C.mk([C.S.pageTask('PE', { pace: 'every-other', reviewDays: [0], end: '2027-01-10', extras: [{ id: 'r', t: 'R', w: 6, at: 100000, u: 'pg' }] })]);
const rows = () => app.snap('PE').rows.filter(r => !r[9] && r[1] === 10).map(r => [r[0], r[3] ? 'part ' + r[4] + '/' + r[5] : 'whole ' + (r[4] || '') + '/' + (r[5] || ''), 'p' + r[7] + '-' + r[8], r[11] || ''].join(' '));
console.log(rows().join('\n'));
console.log('glue', app.ev(`JSON.stringify(glueOf(tasks[0], 9))`));
// follow to the day before the last row and check
for (const ds of C.days('2026-11-09', 62)) { app.setDay(ds); const r = C.row0(app, 'PE'); if (r && r.from === 10 && !r.part) { console.log(ds, 'final row', JSON.stringify(r), 'reached', C.st(app, 'PE').reached); break; } app.check('PE'); }
app.close();
