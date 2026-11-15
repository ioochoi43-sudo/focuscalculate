// v4.11: 나눠서 복사 — one day's row as several copy lines (오늘·내일 줄의 "나눠 복사").
// Display only: these tests check the lines' text, that the pieces cover the row exactly once,
// and that nothing saved changes. (The plans themselves are checked by same.sh.)
const { makeApp } = require('./h');
const { tasksAll, weightTask, pageTask, lectureTask } = require('./seed');
const HTML = process.env.FC_HTML || require('path').join(__dirname, '..', '..', 'index.html');
let passes = 0, fails = 0;
const ok = (c, msg) => { if (c) passes++; else { fails++; console.log('FAIL:', msg); } };
const eq = (a, b, msg) => ok(JSON.stringify(a) === JSON.stringify(b), `${msg}\n   got  ${JSON.stringify(a)}\n   want ${JSON.stringify(b)}`);
const SET = { avail: null, weights: [1, 1, 1, 1, 1, 1, 1], offDates: [], wHist: [], offLog: {}, ppRuleFrom: '2026-10-01' };
const mk = (tasks, day = '2026-11-09', more) => makeApp(HTML, day, Object.assign({ 'focus-calculate-tasks-v1': tasks, 'focus-calculate-settings-v1': SET }, more || {}));
const tick = () => new Promise(r => setTimeout(r, 0));
const days = (from, n) => { const out = []; const d = new Date(from + 'T12:00:00'); for (let i = 0; i < n; i++) { out.push(d.toISOString().slice(0, 10)); d.setDate(d.getDate() + 1); } return out; };
const base = (id, x) => Object.assign({ id, title: id, type: 'other', total: 12, startNum: 0, progress: 0, start: '2026-11-09', end: '2026-11-11', pace: 'daily', paceValue: null, reviewDays: [], skipDates: [] }, x);
// the split of one day's row: { whole, modes, def, lines: {mode: [text…]} } or null
const split = (app, id, ds) => JSON.parse(app.ev(`(() => { const t = tasks.find(x => x.id === ${JSON.stringify(id)}), row = buildSchedule(t).schedule.find(s => fmtDate(s.date) === ${JSON.stringify(ds)});
  if (!row) return 'null'; const i = copySplitInfo(t, row); const L = {}; if (i) i.modes.forEach(m => { L[m.k] = i.lines(m.k); });
  return JSON.stringify({ whole: buildCopyText(t, row), split: !!i, modes: i ? i.modes.map(m => m.label) : [], def: i ? i.def : null, lines: L }); })()`));

const { CHECK, CHECK_WEEK } = require('./split_check');

(async () => {
  // --- 1) the texts: named chapters with parts, lectures, pages of a book ---
  {
    const names = ['Ch1', 'Ch2', 'Ch3', 'Ch4', 'Ch5', 'Ch6', 'Ch1', 'Ch2', 'Ch3', 'Ch4', 'Ch5', 'Ch6'], parts = names.map((_, i) => (i < 6 ? 'Part1' : 'Part2'));
    const T = [
      base('nm', { title: '아주 긴 강의 제목', copyTitle: '강의', showNames: true, itemNames: names, itemParts: parts }),
      base('lec', { type: 'lecture', total: 9 }),
      base('bk', { type: 'book', total: 90, startNum: 10 }),
      base('one', { type: 'lecture', total: 3 }),
      base('dayfmt', { total: 6, copyFmt: 'day' }),
    ];
    const app = mk(T);
    let s = split(app, 'nm', '2026-11-09');
    eq(s.whole, '강의 Part1 Ch1~Ch4', 'named: ⧉ text');
    eq(s.modes, ['전체', '2조각', '3조각', '각각'], 'named: choices');
    eq(s.def, 'each', 'named: opens on 각각');
    eq(s.lines.all, ['강의 Part1 Ch1~Ch4'], 'named: 전체');
    eq(s.lines.each, ['강의 Part1 Ch1', '강의 Part1 Ch2', '강의 Part1 Ch3', '강의 Part1 Ch4'], 'named: 각각');
    eq(s.lines[2], ['강의 Part1 Ch1, Ch2', '강의 Part1 Ch3, Ch4'], 'named: 2조각');
    eq(s.lines[3], ['강의 Part1 Ch1, Ch2', '강의 Part1 Ch3', '강의 Part1 Ch4'], 'named: 3조각');
    s = split(app, 'nm', '2026-11-10'); // crosses the parts
    eq(s.whole, '강의 Part1 Ch5 ~ Part2 Ch2', 'named, across parts: ⧉ text');
    eq(s.lines[2], ['강의 Part1 Ch5, Ch6', '강의 Part2 Ch1, Ch2'], 'named, across parts: 2조각');
    eq(s.lines[3], ['강의 Part1 Ch5, Ch6', '강의 Part2 Ch1', '강의 Part2 Ch2'], 'named, across parts: 3조각');
    s = split(app, 'nm', '2026-11-11'); // the last day: the label stays on the last line only
    eq(s.whole, '강의 Part2 Ch3~Ch6 (완료)', 'named, last day: ⧉ text');
    eq(s.lines.each, ['강의 Part2 Ch3', '강의 Part2 Ch4', '강의 Part2 Ch5', '강의 Part2 Ch6 (완료)'], 'named, last day: 각각');
    eq(s.lines[2], ['강의 Part2 Ch3, Ch4', '강의 Part2 Ch5, Ch6 (완료)'], 'named, last day: 2조각');

    s = split(app, 'lec', '2026-11-09');
    eq(s.whole, 'lec 1~3강', 'lectures: ⧉ text');
    eq(s.modes, ['전체', '2조각', '각각'], 'lectures: choices');
    eq(s.lines.each, ['lec 1강', 'lec 2강', 'lec 3강'], 'lectures: 각각');
    eq(s.lines[2], ['lec 1, 2강', 'lec 3강'], 'lectures: 2조각');

    s = split(app, 'bk', '2026-11-09'); // 30 pages a day: pieces only
    eq(s.whole, 'bk p.11~40', 'book: ⧉ text');
    eq(s.modes, ['전체', '2조각', '3조각', '4조각'], 'book: choices (no 각각 for 30 pages)');
    eq(s.def, 2, 'book: opens on 2조각');
    eq(s.lines[2], ['bk p.11~25', 'bk p.26~40'], 'book: 2조각');
    eq(s.lines[3], ['bk p.11~20', 'bk p.21~30', 'bk p.31~40'], 'book: 3조각');
    eq(s.lines[4], ['bk p.11~18', 'bk p.19~26', 'bk p.27~33', 'bk p.34~40'], 'book: 4조각');
    s = split(app, 'bk', '2026-11-11');
    eq(s.lines[2], ['bk p.71~85', 'bk p.86~100 (완독)'], 'book, last day: 2조각');

    s = split(app, 'dayfmt', '2026-11-09');
    eq(s.modes, ['전체', '각각'], 'two a day: 전체 · 각각 only (2조각 would be the same)');
    eq(s.lines.each, ['dayfmt day1', 'dayfmt day2'], 'day format: 각각');
    ok(split(app, 'one', '2026-11-09').split === false, 'one lecture a day: nothing to split');

    // the screen: the button is only on rows that can be split, ⧉ copies the whole row as before
    app.view('today');
    const btn = (id, list) => app.doc.querySelector(`#${list} [data-action="split-copy"][data-id="${id}"]`);
    ['nm', 'lec', 'bk', 'dayfmt'].forEach(id => ok(btn(id, 'todayList') && btn(id, 'tomorrowList'), `${id}: 나눠 복사 on today's and tomorrow's row`));
    ok(!btn('one', 'todayList') && !btn('one', 'tomorrowList'), 'one: no 나눠 복사 button');
    const copied = [];
    app.win.isSecureContext = true; app.win.navigator.clipboard.writeText = async (t) => { copied.push(t); };
    const saved = () => JSON.stringify(['focus-calculate-tasks-v1', 'focus-calculate-completed-v2', 'focus-calculate-weekgoals-v1', 'focus-calculate-settings-v1'].map(k => app.win.localStorage.getItem(k)));
    const before = saved();
    app.doc.querySelector('#todayList .agenda-item[data-id="nm"] [data-action="copy-item"]').click(); await tick();
    eq(copied, ['강의 Part1 Ch1~Ch4'], '⧉ still copies the whole row at once');
    const M = app.doc.getElementById('splitModal'), open = () => M.classList.contains('show');
    const lines = () => [...M.querySelectorAll('.sp-line')].map(b => b.querySelector('.sp-text').textContent);
    const ticked = () => [...M.querySelectorAll('.sp-line')].map(b => (b.classList.contains('copied') ? 1 : 0)).join('');
    const mode = (label) => [...M.querySelectorAll('#sp-modes .chip')].find(b => b.textContent === label).click();
    ok(!open(), 'the window is closed until the button is pressed');
    btn('nm', 'todayList').click();
    ok(open(), 'the window opens');
    ok(/아주 긴 강의 제목/.test(M.querySelector('#sp-sub').textContent) && /오늘/.test(M.querySelector('#sp-sub').textContent), 'title and day: ' + M.querySelector('#sp-sub').textContent);
    eq([...M.querySelectorAll('#sp-modes .chip')].map(b => b.textContent + (b.classList.contains('active') ? '*' : '')), ['전체', '2조각', '3조각', '각각*'], 'chips');
    eq(lines(), ['강의 Part1 Ch1', '강의 Part1 Ch2', '강의 Part1 Ch3', '강의 Part1 Ch4'], 'window: 각각');
    M.querySelectorAll('.sp-line')[1].click(); await tick();
    eq(copied.slice(1), ['강의 Part1 Ch2'], 'a line copies just that line');
    ok(open(), 'the window stays open after copying');
    eq(ticked(), '0100', 'the copied line is ticked');
    M.querySelectorAll('.sp-line')[3].click(); await tick();
    eq(ticked(), '0101', 'two lines ticked');
    mode('2조각');
    eq(lines(), ['강의 Part1 Ch1, Ch2', '강의 Part1 Ch3, Ch4'], 'window: 2조각');
    eq(ticked(), '00', 'other lines: not ticked');
    mode('각각');
    eq(ticked(), '0101', 'back to 각각: still ticked');
    mode('전체');
    eq(lines(), ['강의 Part1 Ch1~Ch4'], 'window: 전체');
    app.doc.getElementById('sp-close').click();
    ok(!open(), 'closes with 닫기');
    btn('nm', 'tomorrowList').click();
    ok(open() && /내일/.test(M.querySelector('#sp-sub').textContent), "tomorrow's row: " + M.querySelector('#sp-sub').textContent);
    eq(lines(), ['강의 Part1 Ch5', '강의 Part1 Ch6', '강의 Part2 Ch1', '강의 Part2 Ch2'], "window: tomorrow's 각각");
    eq(ticked(), '0000', 'a new window starts unticked');
    app.doc.getElementById('sp-close').click();
    btn('bk', 'todayList').click();
    eq(lines(), ['bk p.11~25', 'bk p.26~40'], 'window: a book opens on 2조각');
    // a failed copy doesn't tick
    app.win.navigator.clipboard.writeText = async () => { throw new Error('no'); };
    M.querySelectorAll('.sp-line')[0].click(); await tick();
    eq(ticked(), '00', 'a failed copy is not ticked');
    app.doc.getElementById('sp-close').click();
    ok(saved() === before, 'nothing saved changed');
    ok(app.errors.length === 0, 'no errors (texts) ' + app.errors.slice(0, 2));
    app.close();
  }

  // --- 2) pages (페이지로 양 계산), a chapter over several days, 따로 할 것, 건너뛰기 ---
  {
    const dW = weightTask('x').lectureDurations;
    const T = [
      pageTask('pg', { end: '2026-11-13' }), // 10 chapters in 5 days
      pageTask('pgLong', { total: 2, end: '2026-11-18', itemPages: [[1, 60], [61, 80]], lectureDurations: [60, 20], itemDifficulty: ['medium', 'medium'], itemAmount: ['medium', 'medium'], itemDays: [3, 0] }),
      pageTask('pgRev', { end: '2026-11-13', extras: [{ id: 'r1', t: '단어', w: 5, at: 1, d: '2026-11-09' }, { id: 'r2', t: '총정리', w: 6, at: 100000, d: '2026-11-09' }] }),
      weightTask('wSk', { itemDays: undefined, end: '2026-11-14', skipped: [1], extras: [{ id: 'k1', t: '2', w: dW[1], at: 100000, sk: 1 }] }),
      weightTask('wPart', { end: '2026-12-20' }),
    ];
    const app = mk(T);
    const P = pageTask('x').itemPages;
    const rowOf = (id, ds) => JSON.parse(app.ev(`(() => { const t = tasks.find(x => x.id === '${id}'), r = buildSchedule(t).schedule.find(s => fmtDate(s.date) === '${ds}'); return JSON.stringify(r ? { from: r.from, to: r.to, pFrom: r.pFrom, pTo: r.pTo, part: !!r.isPart, n: r.partN, of: r.partOf, revs: (r.revs || []).map(x => x.t), skips: r.skips || [] } : null); })()`));
    // pages: each chapter with its own pages
    let r = rowOf('pg', '2026-11-09'), s = split(app, 'pg', '2026-11-09');
    ok(r && r.to > r.from && !r.part, 'pg: several chapters today ' + JSON.stringify(r));
    const want = []; for (let a = r.from; a <= r.to; a++) want.push(`pg ${a}장 p.${P[a - 1][0]}~${P[a - 1][1]}`);
    eq(s.lines.each, want, 'pages: 각각 = each chapter with its pages');
    ok(s.whole === `pg ${r.to - r.from === 1 ? r.from + ', ' + r.to : r.from + '~' + r.to}장 p.${r.pFrom}~${r.pTo}`, 'pages: ⧉ text ' + s.whole);
    // one chapter over several days: cut by pages, without the "(1/3)"
    r = rowOf('pgLong', '2026-11-09'); s = split(app, 'pgLong', '2026-11-09');
    ok(r && r.part && r.of >= 2 && r.pFrom === 1, 'pgLong: a part day ' + JSON.stringify(r));
    ok(/\(1\/\d\)$/.test(s.whole), 'pgLong: ⧉ text keeps (1/n): ' + s.whole);
    const half = Math.ceil((r.pTo - r.pFrom + 1) / 2);
    eq(s.lines[2], [`pgLong 1장 p.1~${half}`, `pgLong 1장 p.${half + 1}~${r.pTo}`], 'part day with pages: 2조각 by pages');
    eq(s.modes, ['전체', '2조각', '3조각', '4조각'], 'part day with pages: pieces only (never page by page)');
    eq(s.def, 2, 'part day with pages: opens on 2조각');
    // 따로 할 것: a line of its own, before its chapter / after everything
    const dsRev = days('2026-11-09', 5).find(ds => (rowOf('pgRev', ds) || { revs: [] }).revs.includes('단어'));
    r = rowOf('pgRev', dsRev); s = split(app, 'pgRev', dsRev);
    ok(/\+ 복습\(단어\)/.test(s.whole), 'review: ⧉ text has + 복습(단어): ' + s.whole);
    const iRev = s.lines.each.indexOf('pgRev 복습(단어)'), iCh = s.lines.each.findIndex(x => /^pgRev 2장 /.test(x));
    ok(iRev >= 0 && iCh === iRev + 1, 'review before 2장: its own line right before that chapter ' + JSON.stringify(s.lines.each));
    ok(s.lines.each.every(x => !/\+/.test(x)), 'review: no "+" left in the lines ' + JSON.stringify(s.lines.each));
    eq(s.def, 'each', 'a row with a review opens on 각각');
    const dsEnd = days('2026-11-09', 5).find(ds => (rowOf('pgRev', ds) || { revs: [] }).revs.includes('총정리'));
    s = split(app, 'pgRev', dsEnd);
    ok(s.lines.each[s.lines.each.length - 1] === 'pgRev 복습(총정리) (완독)', 'review at the end: the last line, with the 완독 label ' + JSON.stringify(s.lines.each));
    ok(s.lines.each.filter(x => / \(완독\)$/.test(x)).length === 1, '완독 once ' + JSON.stringify(s.lines.each));
    // 건너뛴 챕터: not a line where it was; its line comes at the end
    const all = days('2026-11-09', 6).map(ds => split(app, 'wSk', ds)).filter(x => x && x.split);
    const flat = all.flatMap(x => x.lines.each);
    ok(!flat.some(x => /^wSk p\.2$/.test(x)), 'skipped chapter 2: no line of its own in place ' + JSON.stringify(flat));
    ok(flat.filter(x => /^wSk 건너뛴 2/.test(x)).length === 1 && flat[flat.length - 1] === 'wSk 건너뛴 2 (완독)', 'skipped chapter 2: one line, the very last ' + JSON.stringify(flat));
    // one chapter with pages + a review: 각각 = the review and the chapter (pages whole), pieces cut the pages
    {
      const app2 = mk([pageTask('p1', { end: '2026-11-18', extras: [{ id: 'q1', t: '단어', w: 5, at: 0, d: '2026-11-09' }] }),
        pageTask('pEnd', { total: 2, end: '2026-11-13', itemPages: [[1, 10], [11, 20]], lectureDurations: [10, 10], itemDifficulty: ['medium', 'medium'], itemAmount: ['medium', 'medium'],
          extras: [{ id: 'e1', t: '오답', w: 15, at: 100000, d: '2026-11-09' }, { id: 'e2', t: '총정리', w: 15, at: 100000, d: '2026-11-09' }] })]);
      const s1 = split(app2, 'p1', '2026-11-09');
      ok(/^p1 1장 p\.1~\d+( \(1\/\d\))? \+ 복습\(단어\)$/.test(s1.whole), 'one chapter + review: ⧉ text ' + s1.whole);
      eq(s1.lines.each, ['p1 복습(단어)', s1.whole.replace(' + 복습(단어)', '')], 'one chapter + review: 각각 = review | the chapter as it is');
      ok(s1.lines[2] && s1.lines[2].length === 3 && s1.lines[2][0] === 'p1 복습(단어)' && s1.lines[2].slice(1).every(x => /^p1 1장 p\.\d+~\d+$/.test(x)), 'one chapter + review: 2조각 = review | two page pieces ' + JSON.stringify(s1.lines[2]));
      // 복습만 하는 날 (no new page) with two 따로 할 것: a line each, nothing else
      const bare = JSON.parse(app2.ev(`JSON.stringify(buildSchedule(tasks.find(x => x.id === 'pEnd')).schedule.filter(r => !r.isPast && r.pFrom == null && (r.revs || []).length === 2).map(r => fmtDate(r.date)))`));
      ok(bare.length > 0, 'pEnd: has a review-only day ' + JSON.stringify(bare));
      const s2 = split(app2, 'pEnd', bare[bare.length - 1]);
      eq(s2.modes, ['전체', '각각'], 'review-only day: 전체 · 각각');
      eq(s2.lines.each, ['pEnd 복습(오답)', 'pEnd 복습(총정리)' + (/ \(완독\)$/.test(s2.whole) ? ' (완독)' : '')], 'review-only day: a line for each review (' + s2.whole + ')');
      ok(app2.errors.length === 0, 'no errors (one chapter + review) ' + app2.errors.slice(0, 2));
      app2.close();
    }
    // stopped in the middle of a chapter (page check): the next row's first piece starts on the next page
    {
      const app3 = mk([pageTask('pm', { end: '2026-11-13' })]);
      const r0 = JSON.parse(app3.ev(`(() => { const r = buildSchedule(tasks[0]).schedule.find(s => s.isToday); return JSON.stringify({ from: r.from, to: r.to, pFrom: r.pFrom, pTo: r.pTo }); })()`));
      const stop = r0.pTo - 4; // four pages short of today's plan
      ok(app3.check('pm', { page: stop }) === 'ok', 'pm: checked by page at ' + stop);
      app3.setDay('2026-11-10');
      const r1 = JSON.parse(app3.ev(`(() => { const r = buildSchedule(tasks[0]).schedule.find(s => s.isToday); return JSON.stringify({ from: r.from, to: r.to, pFrom: r.pFrom, pTo: r.pTo, part: !!r.isPart }); })()`));
      const s3 = split(app3, 'pm', '2026-11-10');
      ok(r1.pFrom === stop + 1 && r1.to > r1.from && !r1.part, 'pm: the next row starts on the next page and holds several chapters ' + JSON.stringify(r1));
      ok(new RegExp(`^pm ${r1.from}장 p\\.${stop + 1}~${P[r1.from - 1][1]}$`).test(s3.lines.each[0]), 'chapter under way: the first line starts on page ' + (stop + 1) + ': ' + JSON.stringify(s3.lines.each));
      ok(s3.lines.each.length === r1.to - r1.from + 1 && s3.lines.each.slice(1).every((x, i) => x === `pm ${r1.from + 1 + i}장 p.${P[r1.from + i][0]}~${P[r1.from + i][1]}`), 'chapter under way: the other lines are whole chapters ' + JSON.stringify(s3.lines.each));
      ok(app3.errors.length === 0, 'no errors (chapter under way) ' + app3.errors.slice(0, 2));
      app3.close();
    }
    // a part day without pages: nothing to cut
    const dsPart = days('2026-11-09', 12).find(ds => (rowOf('wPart', ds) || {}).part);
    ok(dsPart && split(app, 'wPart', dsPart).split === false, 'part day without pages: no split (' + dsPart + ')');
    ok(app.errors.length === 0, 'no errors (pages) ' + app.errors.slice(0, 2));
    app.close();
  }

  // --- 3) every row of every plan, while following the plans for five weeks ---
  {
    const dW = weightTask('x').lectureDurations, dP = pageTask('x').lectureDurations;
    const names = Array.from({ length: 20 }, (_, i) => 'Ch' + (i % 5 + 1)), parts = names.map((_, i) => 'Part' + (Math.floor(i / 5) + 1));
    const T = tasksAll().concat([
      lectureTask('lecN', { showNames: true, itemNames: names, itemParts: parts, copyTitle: '짧은 이름' }),
      lectureTask('lecCnt', { timeBased: false, lectureDurations: undefined, reviewDays: [0], end: '2026-11-22' }),
      pageTask('pX', { end: '2026-11-22', extras: [{ id: 'a1', t: '앞 복습', w: 8, at: 3, d: '2026-11-09' }, { id: 'a2', t: '맨 뒤', w: 10, at: 100000, d: '2026-11-09' }, { id: 'a3', t: '또', w: 4, at: 3, d: '2026-11-09' }] }),
      pageTask('pSk', { end: '2026-11-20', skipped: [2, 5], extras: [{ id: 'k1', t: '3', w: dP[2], at: 100000, sk: 2 }, { id: 'k2', t: '6', w: dP[5], at: 100000, sk: 5 }] }),
      pageTask('pDrop', { end: '2026-11-18', skipped: [1, 9] }),
      weightTask('wX', { end: '2026-11-24', extras: [{ id: 'b1', t: '복습1', w: 3, at: 4, d: '2026-11-09' }, { id: 'b2', t: '끝', w: 2, at: 100000, d: '2026-11-09' }], skipped: [6], }),
      weightTask('wFast', { itemDays: undefined, end: '2026-11-13' }),
      weightTask('wMid', { itemDays: undefined, end: '2026-11-13', extras: [{ id: 'c1', t: '중간 복습', w: 2, at: 1, d: '2026-11-09' }, { id: 'c2', t: '또 복습', w: 2, at: 6, d: '2026-11-09' }, { id: 'c3', t: '끝 복습', w: 2, at: 100000, d: '2026-11-09' }] }),
      pageTask('pMid', { end: '2026-11-20' }),
      { id: 'cntO', title: 'cntO', type: 'other', total: 200, startNum: 0, progress: 0, start: '2026-11-09', end: '2026-12-05', pace: 'daily', paceValue: null, reviewDays: [6], skipDates: [] },
    ]);
    const app = mk(T);
    let rowsSeen = 0, splitSeen = 0, goalsSeen = 0, goalsSplit = 0;
    const check = (tag) => { const r = JSON.parse(app.ev(CHECK)); rowsSeen += r.rowsSeen; splitSeen += r.splitSeen; ok(r.out.length === 0, `${tag}: ${r.out.length} problems — ${r.out.slice(0, 4).join(' || ')}`);
      const w = JSON.parse(app.ev(CHECK_WEEK)); goalsSeen += w.goalsSeen; goalsSplit += w.splitSeen; ok(w.out.length === 0, `${tag} (week goals): ${w.out.length} problems — ${w.out.slice(0, 4).join(' || ')}`); };
    days('2026-11-09', 36).forEach((ds, i) => {
      app.setDay(ds);
      check(ds + ' am');
      T.forEach(t => {
        if (i % 7 === 3 && (t.id === 'pD' || t.id === 'lecD')) return; // (two goals fall behind now and then)
        if (t.id === 'pMid' || (t.id === 'pSk' && i % 2)) { // stops a few pages short: the next row starts in the middle of a chapter
          const r = JSON.parse(app.ev(`(() => { const r = buildSchedule(tasks.find(x => x.id === '${t.id}')).schedule.find(s => s.isToday); return JSON.stringify(r && r.pFrom != null ? { a: r.pFrom, b: r.pTo } : null); })()`));
          if (r && r.b - r.a >= 3) { app.check(t.id, { page: r.b - 2 }); return; }
        }
        app.check(t.id);
      });
      if (i % 4 === 1) check(ds + ' pm'); // (today's row once checked)
    });
    ok(rowsSeen > 3000 && splitSeen > 1000, `rows looked at: ${rowsSeen}, splittable: ${splitSeen}`);
    console.log(`rows looked at: ${rowsSeen}, splittable: ${splitSeen} · week goals looked at: ${goalsSeen}, splittable: ${goalsSplit}`);
    ok(goalsSeen > 500 && goalsSplit > 300, `week goals looked at: ${goalsSeen}, splittable: ${goalsSplit}`);
    // the buttons on the screen match
    app.setDay('2026-11-10'); app.view('today');
    const shown = JSON.parse(app.ev(`JSON.stringify(['todayList', 'tomorrowList'].map((L, i) => { const ds = fmtDate(addDays(today(), i)); return [...document.querySelectorAll('#' + L + ' .agenda-item')].map(el => { const t = tasks.find(x => x.id === el.dataset.id), row = buildSchedule(t).schedule.find(s => fmtDate(s.date) === ds); return [t.id, !!el.querySelector('[data-action="split-copy"]'), !!copySplitInfo(t, row)]; }); }))`));
    ok(shown[0].length + shown[1].length > 0 && shown.flat().every(x => x[1] === x[2]), 'buttons match what can be split ' + JSON.stringify(shown.flat().filter(x => x[1] !== x[2])));
    // …and on the week view: 나눠 복사 where a goal can be split, and ⧉ 복사 = its 전체
    app.view('week');
    const wk = JSON.parse(app.ev(`JSON.stringify([...document.querySelectorAll('#weekGoals .week-goal-item')].map(el => { const id = el.querySelector('[data-action="copy-week-goal"]').dataset.id, ws = fmtDate(startOfWeek(today()));
      const g = weekGoalsFor(ws, fmtDate(addDays(startOfWeek(today()), 6)), id)[0], i = weekGoalSplit(g); return [id, !!el.querySelector('[data-action="split-week-goal"]'), !!i, el.querySelector('[data-action="copy-week-goal"]').dataset.copy === (i ? i.lines('all')[0] : weekGoalTexts(g).copyText)]; }))`));
    ok(wk.length > 5 && wk.every(x => x[1] === x[2] && x[3]), 'week view: buttons match what can be split, ⧉ 복사 = 전체 ' + JSON.stringify(wk.filter(x => x[1] !== x[2] || !x[3])));
    ok(app.errors.length === 0, 'no errors (sweep) ' + app.errors.slice(0, 2));
    app.close();
  }

  // --- 4) 이번 주 목표 (v4.11.1) ---
  {
    const names = ['Ch1', 'Ch2', 'Ch3', 'Ch4', 'Ch5', 'Ch6', 'Ch7', 'Ch1', 'Ch2', 'Ch3', 'Ch4', 'Ch5', 'Ch6', 'Ch7'], parts = names.map((_, i) => (i < 7 ? 'Part1' : 'Part2'));
    const T = [
      base('nmW', { title: '긴 강의 이름', copyTitle: '강의', total: 14, end: '2026-11-15', showNames: true, itemNames: names, itemParts: parts }),
      base('lecW', { type: 'lecture', total: 40, end: '2026-11-22' }),
      base('bkW', { type: 'book', total: 300, startNum: 10, end: '2026-11-29' }),
      pageTask('pgW', { total: 3, end: '2026-11-20', itemPages: [[1, 10], [11, 20], [21, 100]], lectureDurations: [10, 10, 80], itemDifficulty: ['medium', 'medium', 'medium'], itemAmount: ['medium', 'medium', 'medium'], itemDays: [0, 0, 8] }),
      weightTask('wRv', { itemDays: undefined, end: '2026-11-22', extras: [{ id: 'v1', t: '단어', w: 2, at: 2, d: '2026-11-09' }, { id: 'v2', t: '오답', w: 2, at: 4, d: '2026-11-09' }] }),
      base('one', { type: 'lecture', total: 1, end: '2026-11-15' }),
    ];
    const app = mk(T);
    const wsplit = (id, w = 0) => JSON.parse(app.ev(`(() => { const ws = fmtDate(addDays(startOfWeek(today()), ${7 * w})), g = weekGoalsFor(ws, fmtDate(addDays(parseDate(ws), 6)), ${JSON.stringify(id)})[0];
      if (!g) return 'null'; const i = weekGoalSplit(g), L = {}; if (i) i.modes.forEach(m => { L[m.k] = i.lines(m.k); });
      return JSON.stringify({ whole: weekGoalTexts(g).copyText, split: !!i, modes: i ? i.modes.map(m => m.label) : [], def: i ? i.def : null, lines: L, g: { from: g.from, to: g.to, part: g.part || null, rv: g.rv || 0 } }); })()`));
    let s = wsplit('nmW');
    eq(s.whole, '강의 Part1 Ch1 ~ Part2 Ch7 (완료)', 'week, named: ⧉ 복사 text');
    eq(s.modes, ['전체', '2조각', '3조각', '4조각', '5조각', '6조각', '7조각', '각각'], 'week: choices up to 7조각');
    eq(s.def, 'each', 'week: opens on 각각');
    eq(s.lines.each, names.map((c, i) => `강의 ${parts[i]} ${c}` + (i === 13 ? ' (완료)' : '')), 'week, named: 각각');
    eq(s.lines[2], ['강의 Part1 Ch1~Ch7', '강의 Part2 Ch1~Ch7 (완료)'], 'week, named: 2조각 (one per part here)');
    eq(s.lines[7], ['강의 Part1 Ch1, Ch2', '강의 Part1 Ch3, Ch4', '강의 Part1 Ch5, Ch6', '강의 Part1 Ch7 ~ Part2 Ch1', '강의 Part2 Ch2, Ch3', '강의 Part2 Ch4, Ch5', '강의 Part2 Ch6, Ch7 (완료)'], 'week, named: 7조각');
    s = wsplit('lecW');
    ok(s.split && s.g.to - s.g.from + 1 > 15 && !s.modes.includes('각각') && s.def === 2, 'week of more than 15 lectures: pieces only ' + JSON.stringify(s.modes) + ' ' + JSON.stringify(s.g));
    ok(s.lines[2].length === 2 && s.lines[2][0].startsWith(`lecW ${s.g.from}`) && s.lines[2][1].endsWith(`${s.g.to}강`), 'week, lectures: 2조각 ' + JSON.stringify(s.lines[2]));
    s = wsplit('bkW');
    ok(/^bkW p\.11~\d+$/.test(s.whole) && !s.modes.includes('각각') && s.modes.includes('7조각'), 'week, book: pages in pieces ' + s.whole + ' ' + JSON.stringify(s.modes));
    const pp = s.lines[7].map(x => x.match(/p\.(\d+)~(\d+)$/).slice(1).map(Number));
    ok(pp[0][0] === 11 && pp.every((q, i) => !i || q[0] === pp[i - 1][1] + 1) && 'p.' + pp[0][0] + '~' + pp[6][1] === s.whole.split(' ')[1], 'week, book: 7조각 cover the pages once ' + JSON.stringify(s.lines[7]));
    s = wsplit('pgW');
    ok(s.g.part && s.g.to >= s.g.from, 'pgW: chapters this week + one that carries over ' + JSON.stringify(s.g));
    const partLine = s.lines.each[s.lines.each.length - 1];
    ok(/^pgW 3장 1~\d\/\d일차 \(p\.21~\d+\)$/.test(partLine) && s.whole.endsWith(' + ' + partLine.slice(4)), 'carry-over chapter: a line of its own, at the end ' + JSON.stringify(s.lines.each) + ' / ' + s.whole);
    ok(s.lines.each.slice(0, -1).every((x, i) => x === `pgW ${s.g.from + i}장 p.${[[1, 10], [11, 20]][s.g.from + i - 1].join('~')}`), 'chapters with their pages ' + JSON.stringify(s.lines.each));
    s = wsplit('wRv');
    ok(s.g.rv === 2 && s.lines.each[s.lines.each.length - 1] === 'wRv 복습 2개' && s.whole.endsWith(' + 복습 2개'), 'reviews this week: "복습 2개" as the last line ' + JSON.stringify(s.lines.each));
    ok(s.lines[2].length === 2 + (s.g.part ? 1 : 0) + 1 && s.lines[2][s.lines[2].length - 1] === 'wRv 복습 2개' && (!s.g.part || /일차$/.test(s.lines[2][2])), 'reviews: after the pieces (and the carry-over chapter) too ' + JSON.stringify(s.lines[2]));
    ok(wsplit('one').split === false, 'one lecture this week: nothing to split');

    // the week view and the window
    app.view('week');
    const M = app.doc.getElementById('splitModal'), open = () => M.classList.contains('show');
    const lines = () => [...M.querySelectorAll('.sp-line')].map(b => b.querySelector('.sp-text').textContent);
    const wbtn = (id) => app.doc.querySelector(`#weekGoals [data-action="split-week-goal"][data-id="${id}"]`);
    ['nmW', 'lecW', 'bkW', 'pgW', 'wRv'].forEach(id => ok(wbtn(id), `${id}: 나눠 복사 on the week goal`));
    ok(!wbtn('one'), 'one: no 나눠 복사 on the week goal');
    const copied = []; app.win.isSecureContext = true; app.win.navigator.clipboard.writeText = async (t) => { copied.push(t); };
    const saved = () => JSON.stringify(['focus-calculate-tasks-v1', 'focus-calculate-completed-v2', 'focus-calculate-weekgoals-v1', 'focus-calculate-settings-v1'].map(k => app.win.localStorage.getItem(k)));
    const before = saved();
    wbtn('nmW').click();
    ok(open() && /긴 강의 이름/.test(M.querySelector('#sp-sub').textContent) && /이번 주 목표/.test(M.querySelector('#sp-sub').textContent), 'window: ' + M.querySelector('#sp-sub').textContent);
    eq(lines().length, 14, 'window: 14 lines (각각)');
    M.querySelectorAll('.sp-line')[2].click(); await tick();
    eq(copied, ['강의 Part1 Ch3'], 'a line copies just that line');
    ok(open(), 'stays open');
    app.doc.getElementById('sp-close').click();
    ok(saved() === before, 'this week: nothing saved changed');
    // next week, not fixed yet: copying a piece fixes it like ⧉ 복사
    app.doc.getElementById('btn-week-next').click();
    const key = 'lecW|2026-11-16';
    ok(!app.ev(`weekGoalsMap.has('${key}')`), 'next week: not fixed yet');
    ok(wbtn('lecW'), 'next week: 나눠 복사 on the goal');
    wbtn('lecW').click();
    ok(/다음 주 목표/.test(M.querySelector('#sp-sub').textContent), 'window says next week: ' + M.querySelector('#sp-sub').textContent);
    const shown = lines();
    ok(!app.ev(`weekGoalsMap.has('${key}')`), 'opening the window fixes nothing');
    M.querySelectorAll('.sp-line')[0].click(); await tick(); await tick();
    ok(app.ev(`weekGoalsMap.has('${key}') && weekGoalsMap.get('${key}').fixedBy === 'copy'`), 'copying a piece fixed next week\'s goal');
    eq(copied[copied.length - 1], shown[0], 'it copied the line');
    eq(lines(), shown, 'the lines stay the same after fixing');
    app.doc.getElementById('sp-close').click();
    ok(app.errors.length === 0, 'no errors (week goals) ' + app.errors.slice(0, 2));
    app.close();
  }
  console.log(`passes ${passes} fails ${fails}`);
  process.exit(fails ? 1 : 0);
})();
