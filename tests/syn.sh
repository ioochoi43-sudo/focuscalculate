#!/bin/bash
# Syntax check: pull the <script> blocks out of the app and run node --check on them.
HTML="${1:-$(dirname "$0")/../index.html}"
TMP="$(mktemp --suffix=.js)"
python3 - "$HTML" "$TMP" <<'PY'
import sys, re
s = open(sys.argv[1], encoding='utf-8').read()
open(sys.argv[2], 'w', encoding='utf-8').write('\n'.join(re.findall(r'<script>(.*?)</script>', s, re.S)))
PY
node --check "$TMP" && echo SYNTAX_OK
rc=$?
rm -f "$TMP"
exit $rc
