// Review: user text (goal title, chapter names, review names) inside the 양 정하기 window and the pinned rows
const L = require('./pin_lib');
const S = L.S;
const evil = '<img src=x onerror="window.__pwn=1"><i>기울임</i> & "따옴표" \'작은\'';
const names = Array.from({ length: 10 }, (_, i) => `${i + 1}단원 ${evil}`);
const lec = S.lectureTask('L', { title: 'L ' + evil, showNames: true, itemNames: Array.from({ length: 20 }, (_, i) => `강의${i + 1} ${evil}`), extras: [{ id: 'm', t: 'M ' + evil, w: 20, at: 0, u: 'min' }] });
const app = L.mk([S.pageTask('P', { title: 'T ' + evil, type: 'other', showNames: true, itemNames: names, extras: [{ id: 'q', t: 'R ' + evil, w: 3, at: 0, u: 'pg', pg: 3, df: 'medium' }] }), lec]);
const d = app.doc;
let bad = 0;
const scan = (where) => { const m = d.getElementById('pinModal'); const n = m.querySelectorAll('img, i, script').length + d.querySelectorAll('#todayList img, #todayList i:not(.x), #tomorrowList img, #toast img').length; if (n || app.win.__pwn) { bad++; console.log('FAIL', where, 'injected elements', n, 'pwn', app.win.__pwn); } else console.log('ok', where); };
for (const id of ['P', 'L']) {
  for (const ds of ['2026-11-09', '2026-11-10']) {
    app.ev(`openPinModal('${id}', '${ds}')`);
    scan(`${id} ${ds} window opened: ` + d.getElementById('pn-sub').textContent.slice(0, 60));
    const inp = d.getElementById('pn-input');
    for (const v of [parseInt(inp.value) + 1, parseInt(inp.min) - 1, '', '1e3', '-5', '3.7', parseInt(inp.max) + 50]) {
      inp.value = String(v); inp.dispatchEvent(new app.win.Event('input', { bubbles: true }));
      scan(`${id} ${ds} typed "${v}": ${d.getElementById('pn-preview').textContent.slice(0, 70)} | helper "${d.getElementById('pn-helper').textContent.slice(0, 40)}"`);
    }
    inp.value = String(parseInt(inp.max) + 50);
    d.getElementById('pn-save').click();
    scan(`${id} ${ds} saved above the maximum → toast "${d.getElementById('toast').textContent.slice(0, 70)}" pins ${JSON.stringify(app.task(id).dayPins)}`);
    L.setPin(app, id, ds, null);
    app.ev(`openPinModal('${id}', '${ds}')`); inp.value = String(parseInt(inp.value) + 1); inp.dispatchEvent(new app.win.Event('input', { bubbles: true })); d.getElementById('pn-save').click();
    app.view('today'); scan(`${id} ${ds} pinned row rendered: ${(d.querySelector(`#${ds === '2026-11-09' ? 'todayList' : 'tomorrowList'} .agenda-item[data-id="${id}"]`) || {}).textContent.replace(/\s+/g, ' ').slice(0, 80)}`);
    app.ev(`openPinModal('${id}', '${ds}')`); scan(`${id} ${ds} reopened with a pin`); d.getElementById('pn-cancel').click();
  }
}
console.log('errors', app.errors.slice(0, 2), bad ? `FAILS ${bad}` : 'all fine');
app.close();
