#!/usr/bin/env bash
# Build Ideate API JAR, copy SQL migrations, and zip the Angular production build.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=lib/ensure-linux-bash.sh
source "${SCRIPT_DIR}/lib/ensure-linux-bash.sh"
ensure_linux_bash "$@"

ROOT_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
ARTIFACTS_DIR="${SCRIPT_DIR}/artifacts"
BACKEND_DIR="${ROOT_DIR}/backend"
UI_DIR="${ROOT_DIR}/ui"

log_info() { echo "[INFO] $*"; }
log_error() { echo "[ERROR] $*" >&2; }
log_success() { echo "[OK] $*"; }

ideate_setup_build_tooling() {
  local shim="/tmp/ideate-build-bin"
  mkdir -p "$shim"
  local win_jdk="/mnt/c/Program Files/Microsoft/jdk-25.0.3.9-hotspot"
  if [[ -x "${win_jdk}/bin/java.exe" ]]; then
    local fake_home="/tmp/ideate-jdk25"
    mkdir -p "${fake_home}/bin"
    ln -sfn "${win_jdk}/bin/java.exe" "${fake_home}/bin/java"
    ln -sfn "${win_jdk}/bin/javac.exe" "${fake_home}/bin/javac" 2>/dev/null || true
    export JAVA_HOME="$fake_home"
    log_info "Using Windows JDK 25 via ${JAVA_HOME} -> ${win_jdk}"
  elif [[ -d "/usr/lib/jvm/java-25-openjdk" ]]; then
    export JAVA_HOME="/usr/lib/jvm/java-25-openjdk"
  elif [[ -d "/c/Program Files/Microsoft/jdk-25.0.3.9-hotspot" ]]; then
    export JAVA_HOME="/c/Program Files/Microsoft/jdk-25.0.3.9-hotspot"
  fi
  if [[ -n "${JAVA_HOME:-}" ]]; then
    export PATH="${shim}:${JAVA_HOME}/bin:${PATH}"
  fi
  local win_node="/mnt/c/nvm4w/nodejs"
  if [[ -x "${win_node}/node.exe" ]]; then
    cat > "${shim}/node" <<EOF
#!/bin/bash
exec "${win_node}/node.exe" "\$@"
EOF
    cat > "${shim}/npm" <<EOF
#!/bin/bash
exec "${win_node}/node.exe" "${win_node}/node_modules/npm/bin/npm-cli.js" "\$@"
EOF
    cat > "${shim}/npx" <<EOF
#!/bin/bash
exec "${win_node}/node.exe" "${win_node}/node_modules/npm/bin/npx-cli.js" "\$@"
EOF
    chmod +x "${shim}/node" "${shim}/npm" "${shim}/npx"
    export PATH="${shim}:${PATH}"
    log_info "Using Windows Node at ${win_node}"
  fi
}

mkdir -p "$ARTIFACTS_DIR"
ideate_setup_build_tooling
java -version

log_info "Building backend JAR..."
chmod +x "${BACKEND_DIR}/mvnw" 2>/dev/null || true
(
  cd "$BACKEND_DIR"
  ./mvnw -q -DskipTests package
)

JAR_SRC="$(find "${BACKEND_DIR}/target" -maxdepth 1 -type f -name 'ideate-backend-*.jar' ! -name '*-sources.jar' ! -name '*-plain.jar' | head -n1)"
if [[ -z "$JAR_SRC" ]]; then
  log_error "Backend JAR not found under ${BACKEND_DIR}/target"
  exit 1
fi
cp -f "$JAR_SRC" "${ARTIFACTS_DIR}/ideate-api.jar"
log_success "Wrote ${ARTIFACTS_DIR}/ideate-api.jar ($(stat -c%s "${ARTIFACTS_DIR}/ideate-api.jar") bytes)"

log_info "Copying database-migrations..."
rm -rf "${ARTIFACTS_DIR}/database-migrations"
mkdir -p "${ARTIFACTS_DIR}/database-migrations"
cp -f "${ROOT_DIR}/database-migrations/"*.sql "${ARTIFACTS_DIR}/database-migrations/"
log_success "Copied $(ls -1 "${ARTIFACTS_DIR}/database-migrations" | wc -l) SQL files"

log_info "Building Angular production PWA..."
(
  cd "$UI_DIR"
  if [[ -f package-lock.json ]]; then
    npm ci
  else
    npm install
  fi
  npx ng build ideate --configuration production
)

DIST_DIR=""
for candidate in "${UI_DIR}/dist/ideate/browser" "${UI_DIR}/dist/ideate"; do
  if [[ -f "${candidate}/index.html" ]]; then
    DIST_DIR="$candidate"
    break
  fi
done
if [[ -z "$DIST_DIR" ]]; then
  log_error "Angular dist not found (looked for dist/ideate/browser and dist/ideate)"
  exit 1
fi

ZIP_PATH="${ARTIFACTS_DIR}/ideate-app.zip"
if ! command -v zip >/dev/null 2>&1; then
  log_error "zip is required. Install it in WSL: sudo apt-get install -y zip"
  exit 1
fi
rm -f "$ZIP_PATH"
(
  cd "$DIST_DIR"
  zip -qr "$ZIP_PATH" .
)
log_success "Wrote ${ZIP_PATH} ($(stat -c%s "$ZIP_PATH") bytes)"

log_info "Artifacts ready in ${ARTIFACTS_DIR}"
ls -lh "${ARTIFACTS_DIR}/ideate-api.jar" "${ARTIFACTS_DIR}/ideate-app.zip"
ls -1 "${ARTIFACTS_DIR}/database-migrations"
