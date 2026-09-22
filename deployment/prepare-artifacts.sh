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

ideate_to_win_path() {
  wslpath -w "$1"
}

ideate_is_windows_java() {
  local j t
  j="$(command -v java 2>/dev/null || true)"
  [[ -n "$j" ]] || return 1
  [[ "$j" == *.exe ]] && return 0
  if [[ -L "$j" ]]; then
    t="$(readlink -f "$j" 2>/dev/null || readlink "$j" 2>/dev/null || true)"
    [[ "$t" == *.exe ]] && return 0
  fi
  return 1
}

ideate_ensure_windows_maven() {
  local mvn_home="${BACKEND_DIR}/.mvn/apache-maven-3.9.9"
  if [[ -f "${mvn_home}/boot/plexus-classworlds-2.8.0.jar" ]] || compgen -G "${mvn_home}/boot/plexus-classworlds-*.jar" >/dev/null; then
    echo "${mvn_home}/bin/mvn.cmd"
    return 0
  fi
  log_info "Downloading Apache Maven 3.9.9 for Windows..." >&2
  local zip win_zip dest
  zip="/tmp/apache-maven-3.9.9-bin.zip"
  curl -fsSL "https://repo.maven.apache.org/maven2/org/apache/maven/apache-maven/3.9.9/apache-maven-3.9.9-bin.zip" -o "$zip"
  dest="$(ideate_to_win_path "${BACKEND_DIR}/.mvn")"
  win_zip="$(ideate_to_win_path "$zip")"
  powershell.exe -NoProfile -Command "Expand-Archive -LiteralPath '${win_zip}' -DestinationPath '${dest}' -Force"
  echo "${mvn_home}/bin/mvn.cmd"
}

ideate_run_windows_cmd() {
  local script="$1"
  local bat="/mnt/c/Users/rajar/AppData/Local/Temp/ideate-win-$$.cmd"
  printf '@echo off\r\n%s\r\n' "$script" >"$bat"
  local win_bat
  win_bat="$(ideate_to_win_path "$bat")"
  /mnt/c/Windows/System32/cmd.exe /c "$win_bat"
  local rc=$?
  rm -f "$bat"
  return "$rc"
}

ideate_maven_package() {
  unset M2_HOME MAVEN_HOME || true
  if ideate_is_windows_java; then
    local mvn_cmd win_java win_backend win_mvn
    mvn_cmd="$(ideate_ensure_windows_maven)"
    win_java='C:\Program Files\Microsoft\jdk-25.0.3.9-hotspot'
    win_backend="$(ideate_to_win_path "$BACKEND_DIR")"
    win_mvn="$(ideate_to_win_path "$mvn_cmd")"
    log_info "Building backend with Windows Maven (java.exe cannot load /mnt/c Maven classpaths)"
    ideate_run_windows_cmd "set \"JAVA_HOME=${win_java}\" && set \"Path=%JAVA_HOME%\\bin;%Path%\" && \"${win_mvn}\" -f \"${win_backend}\\pom.xml\" -DskipTests clean package"
  else
    (
      cd "$BACKEND_DIR"
      ./mvnw -q -DskipTests package
    )
  fi
}

ideate_ng_build() {
  if [[ -x /mnt/c/nvm4w/nodejs/node.exe ]]; then
    local win_ui win_node bat
    win_ui="$(ideate_to_win_path "$UI_DIR")"
    win_node='C:\nvm4w\nodejs'
    bat="/mnt/c/Users/rajar/AppData/Local/Temp/ideate-ng-build.cmd"
    log_info "Building Angular with Windows Node"
    # One statement per line. Unquoted @angular paths in cmd.exe skip the build.
    cat > "$bat" <<EOF
@echo off
set "Path=${win_node};%Path%"
cd /d "${win_ui}"
if errorlevel 1 exit /b 1
if not exist node_modules\\.bin\\ng.cmd npm.cmd ci
if errorlevel 1 exit /b 1
echo [INFO] Running ng build ideate --configuration production
call npx.cmd ng build ideate --configuration production
exit /b %ERRORLEVEL%
EOF
    unix2dos "$bat" 2>/dev/null || sed -i 's/\r$//;s/$/\r/' "$bat"
    /mnt/c/Windows/System32/cmd.exe /c "$(ideate_to_win_path "$bat")"
    local rc=$?
    rm -f "$bat"
    return "$rc"
  else
    (
      cd "$UI_DIR"
      if [[ ! -x node_modules/.bin/ng ]]; then
        if [[ -f package-lock.json ]]; then
          npm ci
        else
          npm install
        fi
      fi
      rm -rf dist/ideate
      npx ng build ideate --configuration production
    )
  fi
}

mkdir -p "$ARTIFACTS_DIR"
ideate_setup_build_tooling
java -version

log_info "Building backend JAR..."
chmod +x "${BACKEND_DIR}/mvnw" 2>/dev/null || true
ideate_maven_package

JAR_SRC="$(find "${BACKEND_DIR}/target" -maxdepth 1 -type f -name 'ideate-backend-*.jar' ! -name '*-sources.jar' ! -name '*-plain.jar' ! -name '*.original' | head -n1)"
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
NG_BUILD_START="$(date +%s)"
ideate_ng_build

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
DIST_MTIME="$(stat -c%Y "${DIST_DIR}/index.html")"
if (( DIST_MTIME + 2 < NG_BUILD_START )); then
  log_error "Angular dist is stale (index.html older than this build). Windows cmd skipped ng build."
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
# Capture listing first: `unzip | grep -q` under pipefail fails with SIGPIPE
# when grep exits early (the zip is valid; the pipeline is not).
ZIP_LISTING="$(unzip -l "$ZIP_PATH")"
if ! grep -E 'main-[A-Za-z0-9_-]+\.js' <<<"$ZIP_LISTING" >/dev/null; then
  log_error "ideate-app.zip has no hashed main bundle; Angular build did not run"
  log_error "$ZIP_LISTING"
  exit 1
fi
log_success "Wrote ${ZIP_PATH} ($(stat -c%s "$ZIP_PATH") bytes)"

log_info "Artifacts ready in ${ARTIFACTS_DIR}"
ls -lh "${ARTIFACTS_DIR}/ideate-api.jar" "${ARTIFACTS_DIR}/ideate-app.zip"
ls -1 "${ARTIFACTS_DIR}/database-migrations"
