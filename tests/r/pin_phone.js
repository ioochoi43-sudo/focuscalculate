// Review: 오늘/내일 rows and the 양 정하기 window in a real browser at phone / iPad widths.
// usage: node r/pin_phone.js      (screenshots go to tests/out/pin_phone_*.png)
const path = require('path'), fs = require('fs');
let pw; try { pw = require('playwright'); } catch (e) { pw = require('/opt/node22/lib/node_modules/playwright'); }
const S = require('../t/seed');
const HTML = path.join(__dirname, '..', '..', 'index.html');
const OUT = path.join(__dirname, '..', 'out');
const cnt = (id, x) => Object.assign({ id, title: id, type: 'book', total: 240, startNum: 10, progress: 0, start: '2026-11-09', end: '2026-12-10', pace: 'daily', paceValue: null, reviewDays: [], skipDates: [] }, x || {});
(async () => {
  const browser = await pw.chromium.launch({ executablePath: fs.existsSync('/opt/pw-browsers/chromium') && fs.statSync('/opt/pw-browsers/chromium').isFile() ? '/opt/pw-browsers/chromium' : undefined });
  const longName = '아주 긴 이름의 목표 — 재무회계 원리 12판 (2026 개정) 기본서 회독';
  const names = ['수익 인식', '금융자산 <b>굵게</b> & "따옴표"', '재고자산', '유형자산', '무형자산', '충당부채', '자본', '리스', '법인세', '현금흐름표'];
  const tasks = [
    S.pageTask('P', { title: longName, showNames: true, itemNames: names, type: 'other', dayPins: { '2026-11-09': { pg: 9 }, '2026-11-10': { pg: 25 } }, extras: [{ id: 'q', t: '오답 <i>복습</i>', w: 9, at: 1, u: 'pg', pg: 9, df: 'medium' }] }),
    S.lectureTask('L', { title: '강의 <script>alert(1)</script>', dayPins: { '2026-11-10': { to: 5 } } }),
    cnt('N', { title: '문제집', dayPins: { '2026-11-09': { to: 4 } } }),
    S.pageTask('C', { title: '하루 가능 시간 기준', timeMode: 'capacity', dailyMinutes: 9 }),
    cnt('R', { title: '복습 요일 있는 목표', reviewDays: [1], categoryId: null }),
  ];
  const settings = { avail: null, weights: [1, 1, 1, 1, 1, 1, 1], offDates: [], wHist: [], offLog: {}, ppRuleFrom: '2026-10-01' };
  let bad = 0;
  for (const [w, h, label] of [[320, 640, 'phone320'], [360, 760, 'phone360'], [375, 812, 'phone375'], [390, 844, 'phone390'], [520, 900, 'w520'], [521, 900, 'w521'], [594, 900, 'split594'], [768, 1024, 'ipadP'], [1024, 768, 'ipadL']]) {
    const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 2 });
    const page = await ctx.newPage();
    const alerts = []; page.on('dialog', async (dlg) => { alerts.push(dlg.message()); await dlg.dismiss(); });
    const errs = []; page.on('pageerror', (e) => errs.push(String(e)));
    await page.addInitScript(({ tasks, settings }) => {
      const now = new Date('2026-11-09T09:00:00').getTime(), RD = Date;
      class FD extends RD { constructor(...a) { if (a.length === 0) super(now); else super(...a); } static now() { return now; } }
      window.Date = FD;
      localStorage.setItem('focus-calculate-tasks-v1', JSON.stringify(tasks));
      localStorage.setItem('focus-calculate-settings-v1', JSON.stringify(settings));
    }, { tasks, settings });
    await page.route('**/*', (route) => (route.request().url().startsWith('file:') ? route.continue() : route.abort()));
    await page.goto('file://' + HTML);
    await page.waitForSelector('#todayList .agenda-item');
    const m = await page.evaluate(() => {
      const out = { docW: document.documentElement.scrollWidth, winW: window.innerWidth, rows: [] };
      for (const listId of ['todayList', 'tomorrowList']) document.querySelectorAll(`#${listId} .agenda-item`).forEach(it => {
        const r = it.getBoundingClientRect(), info = it.querySelector('.agenda-info').getBoundingClientRect();
        const kids = [...it.children].map(k => { const b = k.getBoundingClientRect(); return { cls: k.className.split(' ')[0] + (k.classList.contains('agenda-pin') ? '.pin' : ''), l: Math.round(b.left), r: Math.round(b.right), t: Math.round(b.top), b: Math.round(b.bottom), w: Math.round(b.width) }; });
        const over = kids.filter(k => k.r > r.right + 0.5 || k.l < r.left - 0.5 || k.b > r.bottom + 0.5);
        // overlapping children?
        let overlap = 0; for (let i = 0; i < kids.length; i++) for (let j = i + 1; j < kids.length; j++) { const a = kids[i], b = kids[j]; if (a.l < b.r - 1 && b.l < a.r - 1 && a.t < b.b - 1 && b.t < a.b - 1) overlap++; }
        const btns = kids.filter(k => /agenda-copy|agenda-postpone/.test(k.cls));
        out.rows.push({ list: listId, name: it.querySelector('.agenda-name').textContent.slice(0, 14), h: Math.round(r.height), infoW: Math.round(info.width), over: over.length, overlap, btnTops: [...new Set(btns.map(k => k.t))].length, btnBelowText: btns.length ? btns[0].t >= Math.round(info.bottom) - 1 : null, nBtn: btns.length,
          nameLines: Math.round(it.querySelector('.agenda-name').getBoundingClientRect().height / parseFloat(getComputedStyle(it.querySelector('.agenda-name')).lineHeight || 20)) });
      });
      return out;
    });
    const probs = m.rows.filter(r => r.over || r.overlap || r.infoW < 120);
    if (m.docW > m.winW + 1) { bad++; console.log(`${label}: PAGE SCROLLS SIDEWAYS (${m.docW} > ${m.winW})`); }
    if (probs.length) { bad++; console.log(`${label}: row problems`, JSON.stringify(probs)); }
    console.log(`${label} (${w}px): ${m.rows.length} rows, sideways scroll ${m.docW > m.winW + 1}, narrowest text block ${Math.min(...m.rows.map(r => r.infoW))}px, buttons under the text on ${m.rows.filter(r => r.btnBelowText).length} rows, tallest row ${Math.max(...m.rows.map(r => r.h))}px`);
    await page.screenshot({ path: path.join(OUT, `pin_phone_${label}_today.png`), fullPage: true });
    // the window
    await page.click('#todayList [data-action="pin-day"]');
    await page.waitForSelector('#pinModal.show');
    await page.fill('#pn-input', '14');
    const mm = await page.evaluate(() => { const b = document.querySelector('#pinModal .modal').getBoundingClientRect(); const acts = [...document.querySelectorAll('#pinModal .modal-actions .btn')].filter(x => x.style.display !== 'none').map(x => { const r = x.getBoundingClientRect(); return { t: x.textContent, l: Math.round(r.left), r: Math.round(r.right), top: Math.round(r.top), h: Math.round(r.height) }; });
      return { l: Math.round(b.left), r: Math.round(b.right), top: Math.round(b.top), bottom: Math.round(b.bottom), winW: innerWidth, winH: innerHeight, acts, sub: document.getElementById('pn-sub').innerHTML, prev: document.getElementById('pn-preview').innerHTML, injected: !!document.querySelector('#pinModal b:not(#pn-preview > b), #pinModal i, #pinModal script') }; });
    if (mm.l < 0 || mm.r > mm.winW || mm.acts.some(a => a.r > mm.r || a.l < mm.l)) { bad++; console.log(`${label}: the window or its buttons stick out`, JSON.stringify(mm)); }
    if (mm.acts.some(a => a.h > 46)) { bad++; console.log(`${label}: the window's buttons wrap their text (height ${mm.acts.map(a => a.h).join('/')}px, one line is 40px)`); }
    console.log(`  window: ${mm.l}~${mm.r} of ${mm.winW}px, buttons ${mm.acts.map(a => a.t + '@' + a.top + '(' + a.h + ')').join(' ')}`);
    if (label === 'phone360') { console.log('  sub html:', mm.sub.slice(0, 300)); console.log('  preview html:', mm.prev.slice(0, 300)); }
    await page.screenshot({ path: path.join(OUT, `pin_phone_${label}_modal.png`) });
    await page.click('#pn-save');
    if (alerts.length || errs.length) { bad++; console.log(`${label}: alerts ${JSON.stringify(alerts)} errors ${JSON.stringify(errs)}`); }
    await ctx.close();
  }
  await browser.close();
  console.log(bad ? `PROBLEMS ${bad}` : 'layout fine at every width');
})().catch(e => { console.error('script error', e); process.exit(1); });
