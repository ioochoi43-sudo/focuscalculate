const { makeApp } = require('../t/h');
const S = require('../t/seed');
const HTML = process.env.FC_HTML || require('path').join(__dirname, '..', '..', 'index.html');
const SET = { 'focus-calculate-settings-v1': { avail: null, weights: [1,1,1,1,1,1,1], offDates: [], wHist: [], offLog: {}, ppRuleFrom: '2026-10-01' } };
function mk(tasks, day = '2026-11-09', extra) { return makeApp(HTML, day, Object.assign({ 'focus-calculate-tasks-v1': tasks }, SET, extra || {})); }
function days(from, n) { const out = []; const d = new Date(from + 'T12:00:00'); for (let i = 0; i < n; i++) { out.push(d.toISOString().slice(0, 10)); d.setDate(d.getDate() + 1); } return out; }
function addExtra(app, id, name, fill, at) {
  const d = app.doc; app.view('active');
  const b = d.querySelector(`[data-action="add-extra"][data-id="${id}"]`); if (!b) return 'nobtn';
  b.click(); d.getElementById('xm-name').value = name; fill(d);
  if (at != null) { const sel = d.getElementById('xm-at'); sel.value = String(at === 'end' ? 100000 : at); if (sel.value !== String(at === 'end' ? 100000 : at)) return 'noopt:' + [...sel.options].map(o => o.value).join(','); }
  d.getElementById('xm-save').click();
  return app.task(id).extras;
}
const pgFill = (n, df) => (d) => { d.getElementById('xm-pg').value = String(n); if (df) d.getElementById('xm-df').value = df; };
const daFill = (df, am) => (d) => { d.getElementById('xm-df').value = df || 'medium'; d.getElementById('xm-am').value = am || 'medium'; };
const minFill = (s) => (d) => { d.getElementById('xm-min').value = s; };
const row0 = (app, id) => JSON.parse(app.ev(`(() => { const t = tasks.find(x => x.id === '${id}'); const r = todayPlanRow(t, fmtDate(today())); return JSON.stringify(r ? { from: r.from, to: r.to, part: !!r.isPart, n: r.partN, of: r.partOf, pf: r.pFrom, pt: r.pTo, revs: (r.revs || []).map(x => x.id) } : null); })()`));
const st = (app, id) => JSON.parse(app.ev(`(() => { const t = tasks.find(x => x.id === '${id}'); const p = buildSchedule(t); return JSON.stringify({ prog: t.progress, status: p.status, done: (t.extras || []).map(x => extraDone(t, x)), reached: hasPages(t) ? pageReachedNow(t) : null, frac: t.progress < t.total ? getPartState(t, (t.startNum||0) + t.progress + 1, fmtDate(addDays(today(), 1))).frac : null, rec: completedMap.get(t.id + '|' + fmtDate(today())) || null }); })()`));
const futRows = (app, id) => app.snap(id).rows.filter(r => r[0] >= app.today()).map(r => r.slice(0, 11).join(' ')).join('|');
const recs = (app, id) => JSON.parse(app.ev(`JSON.stringify([...completedMap.entries()].filter(([k]) => k.startsWith('${id}|')))`));
module.exports = { makeApp, S, HTML, SET, mk, days, addExtra, pgFill, daFill, minFill, row0, st, futRows, recs };
function skipCh(app, id, rel) {
  const d = app.doc; app.view('active');
  const b = d.querySelector(`[data-action="skip-chapter"][data-id="${id}"]`); if (!b) return 'nobtn';
  b.click();
  if (!d.getElementById('skipModal').classList.contains('show')) return 'noopen:' + d.getElementById('toast').textContent;
  const sel = d.getElementById('sk-rel'); sel.value = String(rel);
  if (sel.value !== String(rel)) { d.getElementById('sk-cancel').click(); return 'noopt:' + [...sel.options].map(o => o.value).join(','); }
  d.getElementById('sk-save').click();
  return app.task(id).skipped;
}
module.exports.skipCh = skipCh;
