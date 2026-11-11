const C = require('./common');
// big review before chapter 4 (p.39~60): review-only part days mid-week, then ↻ refresh
const ex = [{ id: 'r4', t: 'BIG', w: 40, at: 3, u: 'pg', pg: 40, df: 'medium' }];
const app = C.mk([C.S.pageTask('A', { extras: ex, end: '2026-12-31' })]);
let lastRow = null;
for (const ds of C.days('2026-11-09', 40)) {
  app.setDay(ds);
  const r = C.row0(app, 'A');
  const t = app.task('A');
  if (r && r.part && r.from === 4 && r.pf == null && r.n >= 2) { console.log('today', ds, new Date(ds+'T12:00').getDay(), JSON.stringify(r)); lastRow = r; break; }
  app.check('A');
}
const s = C.st(app, 'A');
console.log('state', JSON.stringify(s));
app.view('week');
const before = app.doc.getElementById('weekGoals').textContent.replace(/\s+/g, ' ');
console.log('week before', before.slice(0, 300));
const btn = app.doc.querySelector('[data-action="refresh-week-goal"][data-id="A"]');
if (btn) btn.click();
app.view('week');
console.log('week after ↻', app.doc.getElementById('weekGoals').textContent.replace(/\s+/g, ' ').slice(0, 300));
console.log('stored', app.ev(`JSON.stringify([...weekGoalsMap.entries()].filter(([k]) => k.startsWith('A|')).slice(-1))`));
app.close();
