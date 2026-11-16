// 나눠서 복사: the checkers that run inside the app (used by t/split.js and r/split_sweep.js).
// In the page: every row of every plan, every way of splitting it → a list of problems (empty = fine).
const CHECK = `(() => { const out = []; let rowsSeen = 0, splitSeen = 0;
  tasks.forEach(t => { const sn = t.startNum || 0, pg = hasPages(t), zAll = pg ? skippedSet(t) : null;
    buildSchedule(t).schedule.forEach(row => {
      if (row.isPast || !(row.to >= row.from)) return;
      rowsSeen++;
      const whole = buildCopyText(t, row), tag = t.id + ' ' + fmtDate(row.date) + ' [' + whole + ']', revs = row.revs || [];
      if (/  |\\s$/.test(whole)) out.push(tag + ': ⧉ text has extra spaces');
      const units = []; for (let a = row.from; a <= row.to; a++) if (!(row.skips || []).includes(a) && !(zAll && zAll.has(a - sn - 1))) units.push(a);
      const bare = (pg && row.pFrom == null) || !units.length; // 복습만 하는 날 · only 건너뛴 챕터
      const pagePath = pg && !bare && units.length <= 1;    // one chapter with pages
      const byPage = pagePath || (!pg && t.type === 'book' && !isTimeBasedTask(t));
      const n = bare ? 0 : pagePath ? pagesIn(t, row.pFrom, row.pTo) : units.length;
      const nEach = byPage ? Math.min(1, n) : n, eachOk = nEach + revs.length >= 2 && nEach <= 15;
      const nums = [2, 3, 4].filter(k => k <= n && !(eachOk && !byPage && k === n));
      const labels = ['전체'].concat(nums.map(k => k + '조각'), eachOk ? ['각각'] : []);
      const info = copySplitInfo(t, row);
      if (!!info !== labels.length > 1) { out.push(tag + ': splittable ' + !!info + ', expected ' + (labels.length > 1)); return; }
      if (!info) return;
      splitSeen++;
      if (info.modes.map(m => m.label).join() !== labels.join()) out.push(tag + ': choices ' + info.modes.map(m => m.label) + ', expected ' + labels);
      if (info.lines('all').length !== 1 || info.lines('all')[0] !== whole) out.push(tag + ': 전체 is not the ⧉ text');
      if (!info.modes.some(m => m.k === info.def) || info.def === 'all') out.push(tag + ': bad default ' + info.def);
      const fin = isFinalSession(t, row), lab = ' (' + getCompletionLabel(t.type) + ')';
      info.modes.forEach(m => { if (m.k === 'all') return;
        const R = info.rows(m.k), C = R.filter(r => r.it), X = R.filter(r => r.x), mt = tag + ' {' + m.label + '}';
        const want = m.k === 'each' ? nEach : m.k;
        if (C.length !== want) out.push(mt + ': ' + C.length + ' pieces, expected ' + want);
        if (R.length < 2) out.push(mt + ': only ' + R.length + ' line');
        if (X.length !== revs.length || new Set(X.map(r => r.x.id)).size !== X.length || X.some(r => !revs.includes(r.x))) out.push(mt + ': 따로 할 것 lines ' + X.length + ' of ' + revs.length);
        R.forEach((r, i) => { if (/undefined|NaN|null|  /.test(r.t) || r.t !== r.t.trim() || !r.t.startsWith(copyName(t) + ' ')) out.push(mt + ': bad text "' + r.t + '"');
          if (r.t.endsWith(lab) !== (fin && i === R.length - 1) || r.t.split(lab).length - 1 !== (fin && i === R.length - 1 ? 1 : 0)) out.push(mt + ': 완강 label on line ' + i + ' "' + r.t + '"');
          if (r.x) { // a review sits right before the piece that holds its chapter (after everything: the one at the end)
            const a = extraPos(t, r.x), c = a >= t.total ? Infinity : sn + a + 1;
            const pos = (q) => (pagePath || C.length < 2 ? (c === Infinity ? -1 : 1) : (q.it.to < c ? -1 : 1)); // -1: that piece comes before the review
            if (R.some((q, j) => q.it && (j < i ? pos(q) !== -1 : pos(q) !== 1))) out.push(mt + ': review out of place "' + r.t + '" in ' + R.map(q => q.t).join(' | '));
          }
          if (r.x && / \\+ /.test(r.t)) out.push(mt + ': "+" in a review line'); });
        C.forEach(r => { if (/ \\+ /.test(r.t)) out.push(mt + ': "+" in a piece "' + r.t + '"'); });
        if (C.length < 2) return; // (the row itself, without its 따로 할 것)
        const sizes = [];
        if (pagePath) {
          C.forEach((r, i) => { sizes.push(pagesIn(t, r.it.pFrom, r.it.pTo)); if (i && !(r.it.pFrom > C[i - 1].it.pTo)) out.push(mt + ': pages overlap'); if (r.t.includes('일차') || /\\(\\d+\\/\\d+\\)/.test(r.t)) out.push(mt + ': n/m in a page piece'); });
        } else {
          let seen = 0;
          C.forEach((r, i) => { let k = 0; for (let a = r.it.from; a <= r.it.to; a++) if (units.includes(a)) k++; sizes.push(k); seen += k;
            if (!units.includes(r.it.from) || !units.includes(r.it.to)) out.push(mt + ': piece edge is not a unit');
            if (i && !(r.it.from > C[i - 1].it.to)) out.push(mt + ': numbers overlap');
            if (pg && (r.it.pFrom == null || (i && !(r.it.pFrom > C[i - 1].it.pTo)))) out.push(mt + ': chapter pages missing/overlap'); });
          if (seen !== units.length || C[0].it.from !== units[0] || C[C.length - 1].it.to !== units[units.length - 1]) out.push(mt + ': numbers not covered once (' + seen + ' of ' + units.length + ')');
          // a row that starts with one day of a longer chapter: its "(n/m)" stays on the first piece (not with pages: they say it)
          C.forEach((r, i) => { if (/\\(\\d+\\/\\d+\\)/.test(r.t) !== (!pg && i === 0 && row.partOf > 1)) out.push(mt + ': (n/m) on piece ' + i + ' "' + r.t + '"'); });
          if (row.partOf > 1) window.__splitPartRows = (window.__splitPartRows || 0) + 1;
        }
        if (Math.max(...sizes) - Math.min(...sizes) > 1 || Math.min(...sizes) < 1) out.push(mt + ': uneven ' + sizes.join(','));
        if (pg) {
          const sum = C.reduce((s, r) => s + pagesIn(t, r.it.pFrom, r.it.pTo), 0);
          // from the row's first page to its last (by pages: the first / last one that isn't a 건너뛴 챕터's)
          let p0 = row.pFrom, p1 = row.pTo;
          if (pagePath) { while (p0 < p1 && !pagesIn(t, p0, p0)) p0++; while (p1 > p0 && !pagesIn(t, p1, p1)) p1--; }
          if (C[0].it.pFrom !== p0 || C[C.length - 1].it.pTo !== p1 || sum !== pagesIn(t, row.pFrom, row.pTo)) out.push(mt + ': pages ' + sum + ' of ' + pagesIn(t, row.pFrom, row.pTo) + ' (' + C[0].it.pFrom + '~' + C[C.length - 1].it.pTo + ' of ' + p0 + '~' + p1 + ')');
        }
      });
    }); });
  return JSON.stringify({ out, rowsSeen, splitSeen }); })()`;
// 이번 주 목표 (v4.11.1): this week's and next week's goals, every way of splitting each → problems (empty = fine).
const CHECK_WEEK = `(() => { const out = []; let goalsSeen = 0, splitSeen = 0;
  const ws0 = startOfWeek(today());
  [0, 1].forEach(w => { const ws = fmtDate(addDays(ws0, 7 * w)), we = fmtDate(addDays(ws0, 7 * w + 6));
    weekGoalsFor(ws, we).forEach(goal => {
      const t = goal.task, sn = t.startNum || 0, pg = hasPages(t), z = skippedSet(t);
      goalsSeen++;
      const tx = weekGoalTexts(goal), name = copyName(t), tag = t.id + ' week ' + ws + ' [' + tx.copyText + ']';
      if (/  |\\s$/.test(tx.copyText) || (!tx.allSk && / \\(건너뜀\\)/.test(tx.copyText))) out.push(tag + ': ⧉ 복사 text has extra spaces / a stray 건너뜀');
      // 따로 할 것: by name, a line each (v4.11.2) — or one "복습 n개" line when the goal doesn't know which ones
      const revs = goal.revs || [];
      if (goal.revs && goal.revs.length !== goal.rv) out.push(tag + ': ' + goal.revs.length + ' names for 복습 ' + goal.rv + '개');
      if (goal.rv > 0 && !goal.revs && !tx.copyText.includes(' + 복습 ' + goal.rv + '개')) out.push(tag + ': no "복습 n개" in the ⧉ text');
      revs.forEach(x => { const nm = x.sk != null ? skName(x) : x.t; if (!tx.copyText.includes(nm)) out.push(tag + ': ' + nm + ' is not in the ⧉ text'); });
      const tail = [].concat(goal.part ? [name + ' ' + tx.partText] : [], goal.rv > 0 && !goal.revs ? [name + ' 복습 ' + goal.rv + '개'] : []);
      const range = goal.to >= goal.from, units = []; if (range) for (let a = goal.from; a <= goal.to; a++) if (!(z && z.has(a - sn - 1))) units.push(a);
      const bare = !range || (pg && goal.pFrom == null) || !units.length;
      const pagePath = pg && !bare && units.length <= 1;
      const byPage = pagePath || (!pg && t.type === 'book' && !isTimeBasedTask(t));
      const n = bare ? 0 : pagePath ? pagesIn(t, goal.pFrom, goal.pTo) : Math.max(1, units.length);
      const nEach = byPage ? Math.min(1, n) : n, eachOk = nEach + revs.length + tail.length >= 2 && nEach <= 15;
      const nums = [2, 3, 4, 5, 6, 7].filter(k => k <= n && !(eachOk && !byPage && k === n));
      const labels = ['전체'].concat(nums.map(k => k + '조각'), eachOk ? ['각각'] : []);
      const info = weekGoalSplit(goal);
      if (!!info !== labels.length > 1) { out.push(tag + ': splittable ' + !!info + ', expected ' + (labels.length > 1)); return; }
      if (!info) return;
      splitSeen++;
      if (info.modes.map(m => m.label).join() !== labels.join()) out.push(tag + ': choices ' + info.modes.map(m => m.label) + ', expected ' + labels);
      if (info.lines('all').length !== 1 || info.lines('all')[0] !== tx.copyText) out.push(tag + ': 전체 is not the ⧉ 복사 text');
      if (info.def !== (eachOk ? 'each' : 2)) out.push(tag + ': default ' + info.def);
      const fin = range && isFinalSession(t, { from: goal.from, to: goal.to }), lab = ' (' + getCompletionLabel(t.type) + ')';
      info.modes.forEach(m => { if (m.k === 'all') return;
        const R = info.rows(m.k), C = R.filter(r => r.it), T = R.filter(r => r.tail), mt = tag + ' {' + m.label + '}';
        if (R.length < 2) out.push(mt + ': only ' + R.length + ' line');
        if (C.length !== (m.k === 'each' ? nEach : m.k)) out.push(mt + ': ' + C.length + ' pieces');
        const X = R.filter(r => r.x);
        if (X.length !== revs.length || revs.some(x => X.filter(r => r.x.id === x.id).length !== 1)) out.push(mt + ': 따로 할 것 lines ' + X.map(r => r.t).join(' | '));
        X.forEach(r => { const want = name + (r.x.sk != null ? ' 건너뛴 ' + skName(r.x) : ' 복습(' + r.x.t + ')'); if (r.t !== want && r.t !== want + lab) out.push(mt + ': 따로 할 것 line "' + r.t + '"'); });
        const strip = (x) => (fin && x.endsWith(lab) ? x.slice(0, -lab.length) : x);
        if (T.map(r => strip(r.t)).join('|') !== tail.join('|') || R.slice(R.length - T.length).some(r => !r.tail)) out.push(mt + ': tail lines ' + T.map(r => r.t).join(' | '));
        R.forEach((r, i) => { if (/undefined|NaN|null|  | \\+ /.test(r.t) || r.t !== r.t.trim() || !r.t.startsWith(name + ' ')) out.push(mt + ': bad text "' + r.t + '"');
          if (r.t.split(lab).length - 1 !== (fin && i === R.length - 1 ? 1 : 0)) out.push(mt + ': 완강 label on line ' + i + ' "' + r.t + '"'); });
        if (C.length < 2) return;
        const sizes = [];
        if (pagePath) {
          C.forEach((r, i) => { sizes.push(pagesIn(t, r.it.pFrom, r.it.pTo)); if (i && !(r.it.pFrom > C[i - 1].it.pTo)) out.push(mt + ': pages overlap'); });
        } else {
          let seen = 0;
          C.forEach((r, i) => { let k = 0; for (let a = r.it.from; a <= r.it.to; a++) if (units.includes(a)) k++; sizes.push(k); seen += k;
            if (!units.includes(r.it.from) || !units.includes(r.it.to)) out.push(mt + ': piece edge is not a unit');
            if (i && !(r.it.from > C[i - 1].it.to)) out.push(mt + ': numbers overlap');
            if (pg && (r.it.pFrom == null || (i && !(r.it.pFrom > C[i - 1].it.pTo)))) out.push(mt + ': chapter pages missing/overlap'); });
          if (seen !== units.length || C[0].it.from !== units[0] || C[C.length - 1].it.to !== units[units.length - 1]) out.push(mt + ': numbers not covered once (' + seen + ' of ' + units.length + ')');
        }
        if (Math.max(...sizes) - Math.min(...sizes) > 1 || Math.min(...sizes) < 1) out.push(mt + ': uneven ' + sizes.join(','));
        if (pg) {
          let p0 = goal.pFrom, p1 = goal.pTo;
          if (pagePath) { while (p0 < p1 && !pagesIn(t, p0, p0)) p0++; while (p1 > p0 && !pagesIn(t, p1, p1)) p1--; }
          const sum = C.reduce((a, r) => a + pagesIn(t, r.it.pFrom, r.it.pTo), 0);
          if (C[0].it.pFrom !== p0 || C[C.length - 1].it.pTo !== p1 || sum !== pagesIn(t, goal.pFrom, goal.pTo)) out.push(mt + ': pages ' + sum + ' of ' + pagesIn(t, goal.pFrom, goal.pTo));
        }
      });
    }); });
  return JSON.stringify({ out, goalsSeen, splitSeen }); })()`;
module.exports = { CHECK, CHECK_WEEK };
