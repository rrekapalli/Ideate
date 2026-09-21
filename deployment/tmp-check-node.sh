#!/usr/bin/env bash
set -euo pipefail
ls -la /mnt/c/nvm4w/nodejs/ | head -30
echo "-----"
/mnt/c/nvm4w/nodejs/node.exe -v
/mnt/c/nvm4w/nodejs/npm.cmd -v || /mnt/c/nvm4w/nodejs/npm -v || true
