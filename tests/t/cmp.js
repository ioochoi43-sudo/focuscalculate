const a = require(require('path').resolve(process.argv[2])), b = require(require('path').resolve(process.argv[3]));
let diff = 0;
Object.keys(a).forEach(k => { const x = JSON.stringify(a[k]), y = JSON.stringify(b[k]); if (x !== y) { diff++; if (diff <= 8) console.log('DIFF', k, '\n  A:', x.slice(0, 700), '\n  B:', (y || '').slice(0, 700)); } });
Object.keys(b).forEach(k => { if (!(k in a)) { diff++; console.log('EXTRA', k, JSON.stringify(b[k]).slice(0, 300)); } });
console.log('total diffs', diff, 'keys', Object.keys(a).length);
