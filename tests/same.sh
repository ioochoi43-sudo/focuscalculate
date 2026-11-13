#!/bin/bash
# "정리 전과 100% 같은가" (계산 정리용 — CLAUDE.md 11장)
# Uses the app at random for many days (t/trace.js) and compares everything it computed — saved data, every plan,
# every screen's text — with the record in baseline/v410-trace.json.gz, made from the version before the cleanup.
#   ./same.sh            compare, seeds 1..80 (about 6 minutes on 4 cores)
#   ./same.sh 16         only the first 16 seeds (a quick check while working)
#   ./same.sh why 7      show what differs for seed 7 (needs the old version in git: see REF below)
#   ./same.sh make       write the record again from the current app — ONLY after a calculation was changed on purpose
cd "$(dirname "$0")" || exit 1
HTML="${FC_HTML:-$(pwd)/../index.html}"
REF="${FC_REF:-0e1cf46}"   # v4.10, the last version before the cleanup
JOBS=4
mkdir -p out
if [ "$1" = "why" ]; then
  seed="${2:-1}"
  git show "$REF:index.html" > out/ref.html 2>/dev/null || { echo "예전 버전($REF)을 git에서 꺼낼 수 없어요 (git fetch origin $REF 후 다시)"; exit 1; }
  node t/trace.js out/ref.html "$seed" 1 full > out/why-old.json
  node t/trace.js "$HTML" "$seed" 1 full > out/why-new.json
  node t/cmp.js out/why-old.json out/why-new.json
  exit 0
fi
N=80; mode=compare
if [ "$1" = "make" ]; then mode=make; elif [ -n "$1" ]; then N="$1"; fi
per=$(( (N + JOBS - 1) / JOBS )); parts=""
for j in $(seq 0 $((JOBS - 1))); do
  first=$(( 1 + j * per )); cnt=$per
  [ $(( first + cnt - 1 )) -gt "$N" ] && cnt=$(( N - first + 1 ))
  [ "$cnt" -le 0 ] && continue
  ( node t/trace.js "$HTML" "$first" "$cnt" > "out/trace-$j.json" 2> "out/trace-$j.err" || echo "trace part $j failed (out/trace-$j.err)" ) &
  parts="$parts out/trace-$j.json"
done
wait
if [ "$mode" = "make" ]; then node t/same.js make "$(grep -o "APP_VERSION = '[^']*'" "$HTML" | cut -d"'" -f2)" $parts
else node t/same.js compare $parts; fi
