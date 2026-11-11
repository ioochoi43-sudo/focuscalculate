const C = require('./common');
for (const html of [process.argv[2], C.HTML]) {
  const app = C.makeApp(html, '2026-11-09', Object.assign({ 'focus-calculate-tasks-v1': [C.S.pageTask('P', { extras: [{ id: 'a', t: '오답', w: 4, at: 1, u: 'pg' }] }), C.S.lectureTask('L', { extras: [{ id: 'b', t: '요약', w: 30, at: 2, u: 'min' }] })] }, C.SET));
  let outP = '', outL = '';
  for (const ds of C.days('2026-11-09', 12)) {
    app.setDay(ds);
    for (const id of ['P', 'L']) {
      const r = JSON.parse(app.ev(`(() => { const t = tasks.find(x => x.id === '${id}'); const r = todayPlanRow(t, fmtDate(today())); return JSON.stringify(r ? (r.revs || []).length : 0); })()`));
      if (r && !(id === 'P' ? outP : outL)) { app.view('active'); app.doc.querySelector(`[data-action="toggle-today-complete"][data-id="${id}"]`).click(); const t = app.doc.getElementById('cm-sub').textContent; if (id === 'P') outP = t; else outL = t; app.doc.getElementById('completeModal').classList.remove('show'); }
      else app.check(id);
    }
  }
  console.log(html.includes('v48') ? 'v4.8:' : 'now :', '| page modal:', outP, '| number modal:', outL);
  app.close();
}
