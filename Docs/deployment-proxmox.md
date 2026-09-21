# Ideate Proxmox deployment

Two LXC containers on the local Proxmox host, cloned from the existing MoneyTree profile templates. Secrets stay in the repo-root `.env`.

| Role | VMID | Hostname | Clone from | Runtime |
|------|------|----------|------------|---------|
| API | 7201 | `ideate-api.tailce422e.ts.net` | `moneytree-lxc-base` (9001, Java 25) | systemd `ideate-api` on `:8080` |
| App | 7202 | `ideate.tailce422e.ts.net` | `moneytree-lxc-frontend-base` (9002, nginx) | nginx `:80`/`:443`, proxies `/v1` to the API |

Network: unprivileged LXC, `vmbr0` DHCP, Tailscale MagicDNS, HTTPS via `tailscale cert` on the app LXC. Postgres remains `pg18.tailce422e.ts.net:6432` database `ideate`.

## Prerequisites

- WSL Ubuntu (scripts re-exec from Git Bash). Install `sshpass`: `sudo apt-get install -y sshpass`
- Templates **9001** and **9002** already on Proxmox `192.168.29.231` (built by MoneyTree)
- Tailscale HTTPS certificates enabled: https://login.tailscale.com/admin/dns
- Repo `.env` with at least:

```
PROXMOX_PASSWORD=...
CONTAINER_PASSWORD=...
TS_AUTHKEY=tskey-auth-...
DB_PASSWORD=...
```

Optional: `TAILSCALE_API_KEY=tskey-api-...` so `--recreate` can free MagicDNS names. Optional `OLLAMA_BASE_URL` if inference is on another tailnet host (Ollama is not installed in the API LXC).

Do **not** set Spring profile `prod`. Auth stays off (`IDEATE_AUTH_ENABLED=false`).

## Build artifacts

```bash
./deployment/prepare-artifacts.sh
```

Writes `deployment/artifacts/ideate-api.jar`, `database-migrations/`, and `ideate-app.zip`.

## Deploy

First time (create LXCs):

```bash
./deployment/proxmox/deploy-api.sh --accept-defaults --recreate
./deployment/proxmox/deploy-app.sh --accept-defaults --recreate
```

Or:

```bash
./deployment/deploy-all.sh --build --recreate --accept-defaults
```

Later updates (push artifacts, restart, keep the containers):

```bash
./deployment/prepare-artifacts.sh
./deployment/proxmox/deploy-api.sh --accept-defaults
./deployment/proxmox/deploy-app.sh --accept-defaults
```

## URLs

- App: https://ideate.tailce422e.ts.net
- API health (direct): http://ideate-api.tailce422e.ts.net:8080/actuator/health
- API via nginx: https://ideate.tailce422e.ts.net/v1/

## SSH / debug

On the Proxmox host:

```bash
pct enter 7201
journalctl -u ideate-api -n 80 --no-pager
pct enter 7202
journalctl -u nginx -n 40 --no-pager
```

Over Tailscale: `ssh raja@ideate-api` or `ssh raja@ideate`.

Renew HTTPS: `./deployment/proxmox/setup-https-frontend-tailscale.sh 7202`

Inventory lives in [`deployment/proxmox/deployment.conf`](../deployment/proxmox/deployment.conf).
