const C = require('./common');
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
(async () => {
  const withSkip = (t, rels) => { t.skipped = rels; t.extras = rels.map(k => ({ id: 'sk' + k, t: (k + 1) + '장', w: t.lectureDurations[k], at: 100000, sk: k })); return t; };
  const app = C.mk([withSkip(C.S.pageTask('A'), [3]), withSkip(C.S.pageTask('B'), [3]), withSkip(C.S.pageTask('Cc'), [3])]);
  app.check('A'); app.check('B'); app.check('Cc'); app.setDay('2026-11-10');
  const edit = async (id, field, val) => {
    app.view('active'); app.doc.querySelector(`[data-action="edit"][data-id="${id}"]`).click();
    const el = app.doc.getElementById(field); el.value = String(val); el.dispatchEvent(new app.win.Event('input', { bubbles: true }));
    await sleep(700);
    app.doc.getElementById('e-save').click();
    return app.doc.getElementById('toast').textContent;
  };
  const info = (id) => app.ev(`(() => { const t = tasks.find(x => x.id === '${id}'); const p = buildSchedule(t); return JSON.stringify({ total: t.total, sn: t.startNum || 0, skipped: t.skipped, skSet: [...(skippedSet(t) || [])], extras: (t.extras || []).map(x => x.t + ':w' + extraW(t, x)), status: p.status, rows: p.schedule.filter(s => !s.isPast && !s.isReview).slice(0, 4).map(s => fmtDate(s.date).slice(5) + ' ' + s.from + '-' + s.to + (s.pText || (s.pFrom != null ? ' p' + s.pFrom + '-' + s.pTo : '')) + (s.skipTxt ? ' ↷' + s.skipTxt : '')), last: (() => { const f = p.schedule.filter(s => !s.isPast && !s.isReview); const l = f[f.length - 1]; return l ? [fmtDate(l.date), l.from, l.to, (l.revs || []).map(x => x.t).join('+')] : null; })() }); })()`);
  console.log('A 끝 10→8:', await edit('A', 'e-to', 8)); console.log('  ', info('A'));
  console.log('  card extras:', (app.cardText('A').match(/따로 할 것.*?(?=📅|$)/) || [''])[0].slice(0, 160));
  console.log('B 끝 10→3:', await edit('B', 'e-to', 3)); console.log('  ', info('B'));
  console.log('  card extras:', (app.cardText('B').match(/따로 할 것.*?(?=📅|$)/) || ['(none)'])[0].slice(0, 160));
  console.log('Cc 시작 1→3:', await edit('Cc', 'e-from', 3)); console.log('  ', info('Cc'));
  console.log('  card extras:', (app.cardText('Cc').match(/따로 할 것.*?(?=📅|$)/) || [''])[0].slice(0, 200));
  console.log('errors', app.errors.slice(0, 3));
  app.close();
})();
