const L = require('./lib');
const { mk, days, inv, follow, ok } = L;
const { pageTask, weightTask } = require('./seed');
const ydayBtn = (app, id) => { app.view('today'); return !!app.doc.querySelector(`[data-action="yday-done"][data-id="${id}"]`); };
for (const mkT of [() => pageTask('Y'), () => weightTask('Y')]) {
  const app = mk([mkT()]);
  app.check('Y'); app.check('Y');
  app.setDay('2026-11-10'); app.check('Y');
  app.setDay('2026-11-11');               // 11/10 checked; 11/11 not checked → tomorrow: yesterday open
  app.setDay('2026-11-12');
  // postpone today
  app.view('active'); app.doc.querySelector('[data-action="postpone-today"][data-id="Y"]').click(); app.doc.getElementById('pp-deadline').click();
  ok((app.task('Y').skipDates || []).includes('2026-11-12'), 'Y: today postponed');
  ok(ydayBtn(app, 'Y'), 'Y: yesterday check open');
  // cancel the confirm → nothing happens
  app.win.confirm = () => false;
  app.view('active'); app.doc.querySelector('[data-action="skip-chapter"][data-id="Y"]').click();
  ok(!app.doc.getElementById('skipModal').classList.contains('show'), 'Y: confirm cancelled → no modal');
  // accept → skip works
  app.win.confirm = () => true;
  app.view('active'); app.doc.querySelector('[data-action="skip-chapter"][data-id="Y"]').click();
  ok(app.doc.getElementById('skipModal').classList.contains('show'), 'Y: confirm ok → skip modal');
  const k = parseInt(app.doc.getElementById('sk-rel').value);
  app.doc.getElementById('sk-save').click();
  ok((app.task('Y').skipped || []).includes(k), 'Y: skipped ' + k);
  ok(!ydayBtn(app, 'Y'), 'Y: yesterday check closed after the change');
  const r = inv(app, 'Y', 'Y after skip');
  console.log('status', r.status, 'rows', r.rows.slice(0, 3).map(x => `${x.d} ${x.from}-${x.to}`).join(' | '));
  // add a review now: no second question
  let asked = 0; app.win.confirm = () => { asked++; return true; };
  app.view('active'); app.doc.querySelector('[data-action="add-extra"][data-id="Y"]').click();
  ok(asked === 0 && app.doc.getElementById('extraModal').classList.contains('show'), 'Y: no repeated question once closed');
  app.doc.getElementById('xm-cancel').click();
  // undo the skip the same day → yesterday check opens again
  app.view('active'); app.doc.querySelector(`[data-action="skip-back"][data-id="Y"][data-rel="${k}"]`).click();
  ok(!app.task('Y').skipped && ydayBtn(app, 'Y'), 'Y: undone today → yesterday check open again');
  // and the yesterday check still works then
  app.view('today'); app.doc.querySelector('[data-action="yday-done"][data-id="Y"]').click();
  if (app.modalOpen()) app.doc.getElementById('cm-save').click();
  ok(!!app.ev(`completedMap.get('Y|2026-11-11')`), 'Y: yesterday recorded after undo');
  // follow to the end
  follow(app, ['Y'], '2026-11-13', 45, { allowBehind: true });
  ok(app.task('Y').progress === app.task('Y').total, 'Y finished');
  console.log('errors', app.errors.slice(0, 2));
  app.close();
}
console.log('passes', L.stats().passes, 'fails', L.stats().fails);
