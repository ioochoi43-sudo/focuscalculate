// Test harness: load the app in jsdom with a fake clock.
const fs = require('fs');
const { JSDOM } = require('jsdom');
function makeApp(htmlPath, startDate, seed) {
  let now = new Date(startDate + 'T09:00:00').getTime();
  const html = fs.readFileSync(htmlPath, 'utf8');
  const errors = [];
  const dom = new JSDOM(html, {
    url: 'https://focus.test/', runScripts: 'dangerously', pretendToBeVisual: true,
    beforeParse(win) {
      const RD = win.Date;
      class FD extends RD { constructor(...a) { if (a.length === 0) super(now); else super(...a); } static now() { return now; } }
      win.Date = FD;
      win.scrollTo = () => {};
      win.matchMedia = () => ({ matches: false, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {} });
      Object.defineProperty(win.navigator, 'clipboard', { value: { writeText: async () => {} } });
      win.console.log = () => {};
      win.console.error = (...a) => errors.push(a.map(String).join(' '));
      if (seed) Object.keys(seed).forEach(k => win.localStorage.setItem(k, typeof seed[k] === 'string' ? seed[k] : JSON.stringify(seed[k])));
    },
  });
  const win = dom.window, doc = win.document;
  win.addEventListener('error', e => errors.push(String(e.message)));
  const app = {
    win, doc, errors,
    ev: (code) => win.eval(code),
    setDay(ds) { now = new Date(ds + 'T09:00:00').getTime(); win.eval('checkDayRollover(); rerender();'); },
    today() { return win.eval('fmtDate(today())'); },
    view(v) { doc.querySelector(`.nav-item[data-view="${v}"]`).click(); },
    modalOpen() { return doc.getElementById('completeModal').classList.contains('show'); },
    // click today's check on the card; mode: 'plan' | {delta:n} | {page:n}
    check(id, mode = 'plan') {
      app.view('active');
      const btn = doc.querySelector(`[data-action="toggle-today-complete"][data-id="${id}"]`);
      if (!btn) return 'nobtn';
      if (btn.textContent.trim() === '✓') return 'already';
      btn.click();
      if (!app.modalOpen()) return 'part';
      const inp = doc.getElementById('cm-input');
      if (mode && mode.page != null) inp.value = String(mode.page);
      else if (mode && mode.delta) inp.value = String(parseInt(inp.value) + mode.delta);
      if (inp.oninput) inp.oninput();
      if (mode && mode.rev != null) { const cb = doc.getElementById('cm-rev-cb'); if (cb) cb.checked = !!mode.rev; }
      doc.getElementById('cm-save').click();
      return 'ok';
    },
    task(id) { return win.eval(`JSON.parse(JSON.stringify(tasks.find(t => t.id === ${JSON.stringify(id)})))`); },
    snap(id) {
      return JSON.parse(win.eval(`(() => { const t = tasks.find(x => x.id === ${JSON.stringify(id)}); const p = buildSchedule(t);
        const rows = p.schedule.filter(s => !s.isPast).map(s => [fmtDate(s.date), s.from, s.to, s.isPart ? 1 : 0, s.partN, s.partOf, s.partF, s.pFrom, s.pTo, s.isReview ? 1 : 0, s.isCatchUp ? 1 : 0, (s.revs || []).map(x => x.t).join('+') || undefined]);
        return JSON.stringify({ prog: t.progress, status: p.status, exp: p.expectedProgress, behind: p.behind, rows, need: p.dailyNeed, cap: p.capacityFinishDate ? fmtDate(p.capacityFinishDate) : null }); })()`));
    },
    cardText(id) { app.view('active'); const c = doc.querySelector(`.task-card[data-id="${id}"]`); return c ? c.textContent.replace(/\s+/g, ' ').trim() : ''; },
    close() { win.close(); },
  };
  return app;
}
module.exports = { makeApp };
