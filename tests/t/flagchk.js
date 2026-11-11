// For fuzz "same-day change" flags: do the plans differ beyond part-share decimals?
const fs = require('fs');
let real = 0, tot = 0;
process.argv.slice(2).forEach(f => {
  const L = fs.readFileSync(f, 'utf8').split('\n');
  for (let i = 0; i < L.length; i++) {
    if (/same-day change|overnight/.test(L[i]) && /^\s*before /.test(L[i + 1] || '') && /^\s*after /.test(L[i + 2] || '')) {
      tot++;
      const strip = (s) => s.replace(/^\s*(before|after)\s+/, '').split('|').slice(0, -1).map(r => r.trim().split(/\s+/).filter(t => !/^\d\.\d+$/.test(t)).join(' ')).join('|');
      if (strip(L[i + 1]) !== strip(L[i + 2])) { real++; console.log('REAL in', f, L[i]); console.log(L[i + 1].slice(0, 300)); console.log(L[i + 2].slice(0, 300)); }
    }
  }
});
console.log('flags', tot, 'with real row changes (dates/chapters/pages)', real);
