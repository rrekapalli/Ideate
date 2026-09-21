#!/usr/bin/env bash
# Shared Tailscale Admin API helpers (jq preferred; python3 fallback for Proxmox hosts without jq).

ts_has_json_tool() {
  command -v jq >/dev/null 2>&1 || command -v python3 >/dev/null 2>&1
}

# Print device IDs whose short name equals $1 or $1-N (numeric duplicate suffix).
ts_match_device_ids() {
  local hostname="$1"
  local devices_json="$2"
  if command -v jq >/dev/null 2>&1; then
    echo "$devices_json" | jq -r --arg h "$hostname" '
      def short: if type == "string" then (split(".")[0] // "") else "" end;
      def matches($s; $h): ($s == $h) or ($s | type == "string" and test("^" + $h + "-[0-9]+$"));
      .devices[]? | select(
        ((.name | short) as $s | (.hostname | short) as $t | matches($s; $h) or matches($t; $h))
      ) | .id
    ' 2>/dev/null
    return 0
  fi
  python3 - "$hostname" "$devices_json" <<'PY'
import json, re, sys
hostname = sys.argv[1]
data = json.loads(sys.argv[2])

def short(name):
    return (name or "").split(".")[0]

def matches(label, host):
    if not label:
        return False
    if label == host:
        return True
    return bool(re.fullmatch(re.escape(host) + r"-[0-9]+", label))

for dev in data.get("devices") or []:
    labels = {short(dev.get("name")), short(dev.get("hostname"))}
    if any(matches(l, hostname) for l in labels if l):
        dev_id = dev.get("id")
        if dev_id:
            print(dev_id)
PY
}

# Print display name for a device id.
ts_device_display_name() {
  local device_id="$1"
  local devices_json="$2"
  if command -v jq >/dev/null 2>&1; then
    echo "$devices_json" | jq -r --arg id "$device_id" '.devices[]? | select(.id == $id) | .name // .hostname // .id' 2>/dev/null
    return 0
  fi
  python3 - "$device_id" "$devices_json" <<'PY'
import json, sys
device_id = sys.argv[1]
data = json.loads(sys.argv[2])
for dev in data.get("devices") or []:
    if dev.get("id") == device_id:
        print(dev.get("name") or dev.get("hostname") or device_id)
        break
PY
}

ts_fetch_tailnet_devices_json() {
  local api_key="$1"
  local tailnet="$2"
  local tmp http_code=""
  tmp="$(mktemp /tmp/ts-devices.XXXXXX.json)"
  for tailnet_try in "$tailnet" "${tailnet%%.ts.net}"; do
    [[ -z "$tailnet_try" ]] && continue
    http_code="$(curl -s -o "$tmp" -w "%{http_code}" -u "${api_key}:" "https://api.tailscale.com/api/v2/tailnet/${tailnet_try}/devices" 2>/dev/null)" || true
    if [[ "$http_code" == "200" ]] && [[ -s "$tmp" ]]; then
      cat "$tmp"
      rm -f "$tmp"
      return 0
    fi
  done
  rm -f "$tmp"
  return 1
}

ts_delete_device() {
  local api_key="$1"
  local device_id="$2"
  curl -s -o /dev/null -w "%{http_code}" -X DELETE -u "${api_key}:" "https://api.tailscale.com/api/v2/device/${device_id}" 2>/dev/null | grep -qE '^200|^204'
}
