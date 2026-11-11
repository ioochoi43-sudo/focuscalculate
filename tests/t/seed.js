const DS = { easy: 1, medium: 2, hard: 3 }, AS = { low: 1, medium: 2, high: 3 };
const PW = { easy: 2 / 3, medium: 1, hard: 4 / 3 };
const pw = (a, b, d) => Math.round((b - a + 1) * (PW[d] || 1) * 100) / 100;
function weightTask(id, extra) {
  const diffs = ['easy', 'hard', 'medium', 'medium', 'hard', 'easy', 'medium', 'hard', 'medium', 'easy', 'hard', 'medium'];
  const amts = ['medium', 'high', 'low', 'medium', 'high', 'medium', 'low', 'medium', 'high', 'medium', 'medium', 'low'];
  return Object.assign({ id, title: id, type: 'book', total: 12, startNum: 0, progress: 0, start: '2026-11-09', end: '2026-12-20',
    pace: 'daily', paceValue: null, reviewDays: [], skipDates: [], timeBased: true, timeMode: 'deadline',
    lectureDurations: diffs.map((d, i) => DS[d] * AS[amts[i]]), itemDifficulty: diffs, itemAmount: amts,
    itemDays: [0, 3, 0, 0, 0, 0, 0, 2, 0, 0, 0, 0] }, extra || {});
}
function pageTask(id, extra) {
  const P = [[1, 12], [13, 30], [31, 38], [39, 60], [61, 70], [71, 95], [96, 104], [105, 130], [131, 140], [141, 160]];
  const diffs = ['medium', 'hard', 'easy', 'medium', 'hard', 'medium', 'easy', 'hard', 'medium', 'medium'];
  return Object.assign({ id, title: id, type: 'book', total: 10, startNum: 0, progress: 0, start: '2026-11-09', end: '2026-12-13',
    pace: 'daily', paceValue: null, reviewDays: [], skipDates: [], timeBased: true, timeMode: 'deadline',
    lectureDurations: P.map((q, i) => pw(q[0], q[1], diffs[i])), itemDifficulty: diffs, itemAmount: diffs.map(() => 'medium'),
    itemPages: P }, extra || {});
}
function lectureTask(id, extra) {
  const durs = [35, 48, 22, 61, 30, 44, 52, 18, 40, 75, 33, 27, 50, 41, 36, 29, 58, 24, 46, 39];
  return Object.assign({ id, title: id, type: 'lecture', total: durs.length, startNum: 0, progress: 0, start: '2026-11-09', end: '2026-12-06',
    pace: 'daily', paceValue: null, reviewDays: [], skipDates: [], timeBased: true, timeMode: 'deadline', lectureDurations: durs }, extra || {});
}
function tasksAll() {
  return [
    lectureTask('lecD'),
    lectureTask('lecC', { timeMode: 'capacity', dailyMinutes: 80 }),
    weightTask('wD'),
    weightTask('wC', { timeMode: 'capacity', dailyMinutes: 6 }),
    pageTask('pD'),
    pageTask('pC', { timeMode: 'capacity', dailyMinutes: 9 }),
    pageTask('pR', { pace: 'every-other', reviewDays: [0], end: '2027-01-10' }),
    weightTask('wW', { start: '2026-12-20', end: '2027-01-17' }),
    { id: 'cnt', title: 'cnt', type: 'book', total: 240, startNum: 10, progress: 0, start: '2026-11-09', end: '2026-12-10', pace: 'weekly-n', paceValue: 5, reviewDays: [], skipDates: [] },
  ];
}
module.exports = { tasksAll, weightTask, pageTask, lectureTask, pw };
