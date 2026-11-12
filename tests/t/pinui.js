// 오늘·내일 양 정하기 — the window and buttons
const L = require('./lib');
const { mk, days, ok } = L;
const { pageTask, lectureTask } = require('./seed');
const cnt = (id) => ({ id, title: id, type: 'book', total: 240, startNum: 10, progress: 0, start: '2026-11-09', end: '2026-12-10', pace: 'daily', paceValue: null, reviewDays: [], skipDates: [] });
const app = mk([pageTask('P'), lectureTask('L'), cnt('N'), pageTask('C', { timeMode: 'capacity', dailyMinutes: 9 })]);
const d = app.doc, $ = (id) => d.getElementById(id);
const modalOpen = () => $('pinModal').classList.contains('show');
const toast = () => $('toast').textContent;
const rowTxt = (listId, id) => { const el = d.querySelector(`#${listId} .agenda-item[data-id="${id}"]`); return el ? el.textContent.replace(/\s+/g, ' ').trim() : ''; };
const pinBtn = (listId, id) => d.querySelector(`#${listId} [data-action="pin-day"][data-id="${id}"]`);
const lists = [...d.querySelectorAll('.agenda-list')].map(x => x.id);
app.view('today');
const TL = lists.find(x => /today/i.test(x)) || lists[0], ML = lists.find(x => /tomorrow|tmr|next/i.test(x)) || lists[1];
console.log('agenda lists', lists.join(','), '→', TL, ML);
const type = (v) => { $('pn-input').value = String(v); $('pn-input').dispatchEvent(new app.win.Event('input', { bubbles: true })); };
const pins = (id) => app.task(id).dayPins || {};
const D0 = '2026-11-09', D1 = '2026-11-10';

// buttons: today + tomorrow rows of deadline goals; none on the capacity goal
ok(!!pinBtn(TL, 'P') && !!pinBtn(ML, 'P') && !!pinBtn(TL, 'L') && !!pinBtn(TL, 'N'), 'buttons on today/tomorrow rows');
ok(!pinBtn(TL, 'C') && !pinBtn(ML, 'C'), 'no button on a 하루 가능 시간 기준 goal');

// today, page goal: plan p.1~6 → set p.9
pinBtn(TL, 'P').click();
ok(modalOpen() && /오늘 양 정하기/.test($('pn-title').textContent), 'modal opens for today: ' + $('pn-title').textContent);
ok($('pn-input').value === '6' && /p\.1~6/.test($('pn-sub').textContent), 'default = the planned page: ' + $('pn-input').value + ' / ' + $('pn-sub').textContent);
ok($('pn-clear').style.display === 'none', 'no "원래 계획으로" before a pin');
type(0); ok(/부터 정할 수 있어요/.test($('pn-preview').textContent), 'below the start → message: ' + $('pn-preview').textContent);
$('pn-save').click(); ok(modalOpen() && !pins('P')[D0], 'invalid value is not saved');
type(6); ok(/원래 계획과 같아요/.test($('pn-preview').textContent), 'same as plan → says so');
type(9);
ok(/오늘/.test($('pn-preview').textContent) && /p\.1~9/.test($('pn-preview').textContent) && /그 뒤 가장 많은 날/.test($('pn-preview').textContent), 'preview: ' + $('pn-preview').textContent);
$('pn-save').click();
ok(!modalOpen() && pins('P')[D0] && pins('P')[D0].pg === 9, 'saved: ' + JSON.stringify(pins('P')) + ' · ' + toast());
app.view('today');
ok(/p\.1~9/.test(rowTxt(TL, 'P')) && /직접 정함/.test(rowTxt(TL, 'P')), 'today row shows the pin: ' + rowTxt(TL, 'P'));
ok(/p\.10~/.test(rowTxt(ML, 'P')), 'tomorrow continues after it: ' + rowTxt(ML, 'P'));
// reopen: shows the pin, 원래 계획으로 clears it
pinBtn(TL, 'P').click();
ok($('pn-input').value === '9' && $('pn-clear').style.display !== 'none' && /직접 정한 양/.test($('pn-sub').textContent), 'reopen shows the pin');
$('pn-clear').click();
ok(!pins('P')[D0] && !/직접 정함/.test((app.view('today'), rowTxt(TL, 'P'))), 'cleared: ' + toast());
// set again and check as shown → record p.9, pin row gone from "to do"
pinBtn(TL, 'P').click(); type(9); $('pn-save').click();
app.view('today'); d.querySelector(`#${TL} [data-action="toggle-complete"][data-id="P"]`).click();
ok(app.modalOpen() && $('cm-input').value === '9', 'check window defaults to the pinned page: ' + $('cm-input').value);
$('cm-save').click();
const recP = JSON.parse(app.ev(`JSON.stringify(completedMap.get('P|${D0}'))`));
ok(recP && recP.pg === 9, 'checked at p.9: ' + JSON.stringify(recP));
app.view('today');
ok(!pinBtn(TL, 'P') && !!pinBtn(ML, 'P'), 'after today is checked: only tomorrow can be set');

// tomorrow via the chips, lecture goal (plan: 2강 → set 4강)
pinBtn(TL, 'L').click();
const chips = [...d.querySelectorAll('#pn-days [data-pn-day]')];
ok(chips.length === 2 && chips[0].classList.contains('active'), 'day chips');
chips[1].click();
ok(/내일 양 정하기/.test($('pn-title').textContent) && $('pn-input').value === '2', 'tomorrow chip: ' + $('pn-title').textContent + ' ' + $('pn-input').value);
type(4);
ok(/내일/.test($('pn-preview').textContent), 'tomorrow preview: ' + $('pn-preview').textContent);
$('pn-input').dispatchEvent(new app.win.KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
ok(!modalOpen() && pins('L')[D1] && pins('L')[D1].to === 4, 'Enter saves: ' + JSON.stringify(pins('L')));
app.view('today');
ok(/2~4강/.test(rowTxt(ML, 'L')) && /직접 정함/.test(rowTxt(ML, 'L')) && /^.*1강/.test(rowTxt(TL, 'L')), 'tomorrow row pinned, today unchanged: ' + rowTxt(ML, 'L') + ' | ' + rowTxt(TL, 'L'));

// card button (진행 중): count goal, today; then the card + schedule show it
app.view('active');
const cb = d.querySelector('#taskGrid [data-action="pin-day"][data-id="N"]');
ok(!!cb, 'card button');
cb.click();
ok(modalOpen() && /오늘/.test($('pn-title').textContent), 'card button opens today');
const planned = parseInt($('pn-input').value);
type(planned + 12); $('pn-save').click();
ok(pins('N')[D0] && pins('N')[D0].to === planned + 12 - 10, 'count goal pin stored relative: ' + JSON.stringify(pins('N')) + ' planned ' + planned);
ok(/직접 정함/.test(app.cardText('N')), 'card shows 직접 정함');
ok(!d.querySelector('#taskGrid [data-action="pin-day"][data-id="C"]'), 'no card button on the capacity goal');

// next day: yesterday's pin (L was pinned for D1) is now today's; P's tomorrow can be set
app.check('L'); app.check('N');
app.setDay(D1); app.view('today');
ok(/2~4강/.test(rowTxt(TL, 'L')) && /직접 정함/.test(rowTxt(TL, 'L')), 'next day: the pin is on today: ' + rowTxt(TL, 'L'));
ok(app.errors.length === 0, 'no errors ' + app.errors.slice(0, 2));
app.close();
console.log('passes', L.stats().passes, 'fails', L.stats().fails);
