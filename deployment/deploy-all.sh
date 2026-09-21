#!/usr/bin/env bash
# Build artifacts (optional) and deploy Ideate API then app to Proxmox.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=lib/ensure-linux-bash.sh
source "${SCRIPT_DIR}/lib/ensure-linux-bash.sh"
ensure_linux_bash "$@"

BUILD=false
EXTRA=()
for arg in "$@"; do
  case "$arg" in
    --build) BUILD=true ;;
    --help|-h)
      cat <<EOF
Usage: $0 [--build] [--recreate] [--accept-defaults]
  --build              Run prepare-artifacts.sh first
  --recreate           Recreate both LXCs from templates
  --accept-defaults    No prompts (required for unattended deploys)
EOF
      exit 0
      ;;
    *) EXTRA+=("$arg") ;;
  esac
done

if [[ ${#EXTRA[@]} -eq 0 ]]; then
  EXTRA=(--accept-defaults)
fi

if [[ "$BUILD" == true ]]; then
  "${SCRIPT_DIR}/prepare-artifacts.sh"
fi

"${SCRIPT_DIR}/proxmox/deploy-api.sh" "${EXTRA[@]}"
"${SCRIPT_DIR}/proxmox/deploy-app.sh" "${EXTRA[@]}"
