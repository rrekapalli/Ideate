#!/usr/bin/env bash
# Re-exec Ideate deploy scripts in WSL when launched from Git Bash on Windows.

_ensure_linux_bash_find_repo_root() {
    local dir script_dir
    script_dir="$(cd "$(dirname "${BASH_SOURCE[1]}")" && pwd)"
    dir="$script_dir"
    while [[ "$dir" != "/" ]]; do
        if [[ -d "$dir/.git" ]]; then
            echo "$dir"
            return 0
        fi
        dir="$(dirname "$dir")"
    done
    echo "$script_dir"
}

ensure_linux_bash() {
    if grep -qi microsoft /proc/version 2>/dev/null; then
        return 0
    fi

    if [[ -z "${MSYSTEM:-}" && "${OSTYPE:-}" != msys* ]]; then
        return 0
    fi

    if ! command -v wsl >/dev/null 2>&1; then
        echo "[ERROR] Run this from WSL Ubuntu bash (Cursor default terminal), not Git Bash." >&2
        echo "  Install WSL: wsl --install -d Ubuntu-24.04" >&2
        exit 127
    fi

    local wsl_distro="${IDEATE_WSL_DISTRO:-${MONEYTREE_WSL_DISTRO:-Ubuntu-24.04}}"
    local caller_script repo_root wsl_repo_root rel_script
    caller_script="$(cd "$(dirname "${BASH_SOURCE[1]}")" && pwd)/$(basename "${BASH_SOURCE[1]}")"
    repo_root="$(_ensure_linux_bash_find_repo_root)"
    rel_script="${caller_script#"$repo_root"/}"

    if [[ "$repo_root" =~ ^/([a-zA-Z])/(.*)$ ]]; then
        wsl_repo_root="/mnt/${BASH_REMATCH[1],,}/${BASH_REMATCH[2]}"
    else
        wsl_repo_root="$repo_root"
    fi

    echo "[INFO] Re-running in WSL ($wsl_distro): $rel_script $*"
    exec wsl -d "$wsl_distro" bash -lc "cd $(printf '%q' "$wsl_repo_root") && bash $(printf '%q' "$rel_script") $(printf '%q ' "$@")"
}
