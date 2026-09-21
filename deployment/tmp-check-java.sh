#!/usr/bin/env bash
set -euo pipefail
ls -la "/mnt/c/Program Files/Microsoft/" | head -20
echo "-----"
JAVA="/mnt/c/Program Files/Microsoft/jdk-25.0.3.9-hotspot/bin/java.exe"
if [[ -x "$JAVA" || -f "$JAVA" ]]; then
  echo "found $JAVA"
  "$JAVA" -version
else
  echo "missing $JAVA"
  ls /mnt/c/Program\ Files/Microsoft/jdk-25.0.3.9-hotspot/bin/ 2>/dev/null | head || true
fi
echo "node=$(command -v node) $(node -v)"
echo "npm=$(command -v npm)"
