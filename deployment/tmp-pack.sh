#!/usr/bin/env bash
set -euo pipefail
ROOT="/mnt/c/vislesha/code/personal/Ideate"
ART="${ROOT}/deployment/artifacts"
mkdir -p "${ART}/database-migrations"
cp -f "${ROOT}/backend/target/ideate-backend-"*.jar "${ART}/" 2>/dev/null || true
# Prefer the repackaged fat jar, not .original
rm -f "${ART}/ideate-api.jar"
cp -f "$(ls -1 ${ROOT}/backend/target/ideate-backend-*.jar | grep -v original | grep -v sources | grep -v plain | head -n1)" "${ART}/ideate-api.jar"
cp -f "${ROOT}/database-migrations/"*.sql "${ART}/database-migrations/"
DIST="${ROOT}/ui/dist/ideate/browser"
rm -f "${ART}/ideate-app.zip"
(cd "$DIST" && zip -qr "${ART}/ideate-app.zip" .)
ls -lh "${ART}/ideate-api.jar" "${ART}/ideate-app.zip"
ls -1 "${ART}/database-migrations"
echo PACKED
