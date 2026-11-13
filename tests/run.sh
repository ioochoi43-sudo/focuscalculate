#!/bin/bash
# Runs everything: syntax, "same as v4.7" baselines, scenario suites, fuzz + twin checks.
# Usage: cd tests && npm install && ./run.sh        (about 15 minutes; uses several cores)
cd "$(dirname "$0")" || exit 1
HTML="${FC_HTML:-$(pwd)/../index.html}"
export FC_HTML="$HTML"
mkdir -p out
./syn.sh "$HTML" || exit 1
fail=0

# 1) Goals that use none of the newer features must compute exactly as v4.7 did.
#    (button labels and the version badge are normalised away; the long "today" text is cut off, so it's skipped)
base() { # name script args...
  local name="$1"; shift
  node "$@" > "out/$name.json" 2> "out/$name.err"
  node -e '
    const zlib = require("zlib"), fs = require("fs");
    const a = JSON.parse(zlib.gunzipSync(fs.readFileSync("baseline/" + process.argv[1] + ".json.gz")));
    const b = JSON.parse(fs.readFileSync("out/" + process.argv[1] + ".json"));
    const norm = (v) => JSON.stringify(v).replace(/＋복습\s*/g, "").replace(/↷건너뛰기\s*/g, "").replace(/양 정하기\s*/g, "").replace(/v4\.[\d.]+ · 최근 업데이트 \d{4}-\d\d-\d\d/g, "V");
    const ks = Object.keys(a).filter(k => !k.endsWith(" today") && norm(a[k]) !== norm(b[k]));
    console.log("baseline " + process.argv[1] + ": " + Object.keys(a).length + " keys, " + ks.length + " diffs" + (b.errors ? " ERRORS " + JSON.stringify(b.errors).slice(0, 200) : ""), ks.slice(0, 5).join(", "));
    process.exit(ks.length || b.errors ? 1 : 0);
  ' "$name" || fail=1
}
base v47-mixed t/baseline.js "$HTML" &
base v47-yearend-oldrule t/baseline2.js "$HTML" old &
base v47-yearend-newrule t/baseline2.js "$HTML" new &
wait

# 2) Scenario suites (each prints "passes N fails M")
SUITES="t/ext.js t/ext2.js t/ext3.js t/skip.js t/skip2.js t/skipcur.js t/skipcur2.js t/yday.js t/ydayno.js t/pin.js t/pinui.js"
for f in $SUITES; do
  ( n=$(basename "$f" .js); timeout 1200 node "$f" > "out/suite-$n.out" 2>&1; tail -n1 "out/suite-$n.out" | sed "s/^/$n: /" ) &
done
wait
for f in $SUITES; do
  n=$(basename "$f" .js)
  grep -h "^FAIL" "out/suite-$n.out" | head -5
  grep -q "fails 0" "out/suite-$n.out" || { echo "SUITE FAILED: $n"; fail=1; }
done

# 2b) 양 정하기: the review's random checks (pin + check as shown == no pin checked there; follow to the end)
( timeout 1200 node r/pin_fuzz.js 1 16 > out/fuzz-pins.out 2>&1; echo "fuzz pins: $(tail -n1 out/fuzz-pins.out | cut -c1-40)" ) &
( timeout 1200 node r/pin_fuzz2.js 1 12 > out/fuzz-pins2.out 2>&1; echo "fuzz pins after changes: $(tail -n1 out/fuzz-pins2.out | cut -c1-40)" ) &
( timeout 1200 node r/pin_follow.js 1 6 > out/follow-pins.out 2>&1; echo "follow with pins: $(tail -n1 out/follow-pins.out | cut -c1-60)" ) &
wait

# 3) Fuzz (follow the plan with random reviews / skips) and twin checks
for a in "1 plain" "2 w"; do
  ( timeout 1200 node r/f_fuzz2.js $a > "out/fuzz-reviews-${a// /-}.out" 2>&1; echo "fuzz reviews $a: $(grep -c 'no issues' "out/fuzz-reviews-${a// /-}.out") ok" ) &
  ( timeout 1200 node r/s_fuzz.js $a > "out/fuzz-skips-${a// /-}.out" 2>&1; echo "fuzz skips $a: $(node t/flagchk.js "out/fuzz-skips-${a// /-}.out" | tail -n1)" ) &
done
( timeout 1200 node r/o_twins.js plain > out/twins-plain.out 2>&1; timeout 1200 node r/yd_twins.js > out/twins-yday.out 2>&1; echo "twins done (see out/twins-*.out)" ) &
wait

# 4) 계산 정리: everything the app computes over many random days must equal the record made before the cleanup
#    (half of the scenarios here; ./same.sh alone runs all 80)
./same.sh 40 || fail=1
echo "done — details in tests/out/"
exit $fail
