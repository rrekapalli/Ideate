#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
if [[ -d "/c/Program Files/Microsoft/jdk-25.0.3.9-hotspot" ]]; then
  export JAVA_HOME="/c/Program Files/Microsoft/jdk-25.0.3.9-hotspot"
elif [[ -d "/usr/lib/jvm/java-25-openjdk" ]]; then
  export JAVA_HOME="/usr/lib/jvm/java-25-openjdk"
fi
if [[ -n "${JAVA_HOME:-}" ]]; then
  export PATH="$JAVA_HOME/bin:$PATH"
fi
if [[ -f .env ]]; then
  set -a
  # shellcheck disable=SC1091
  source .env
  set +a
fi
cd "$ROOT/backend"
chmod +x mvnw 2>/dev/null || true
./mvnw spring-boot:run
