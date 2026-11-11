const C = require('./common');
const app = C.mk([C.S.lectureTask('K')]);
app.check('K'); app.setDay('2026-11-10'); app.setDay('2026-11-11');
console.log('progress', app.task('K').progress);
console.log('addExtra result', JSON.stringify(C.addExtra(app, 'K', 'r', C.minFill('50분'), 1)));
console.log('extras now', JSON.stringify(app.task('K').extras));
app.close();
