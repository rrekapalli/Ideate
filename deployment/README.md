# Ideate deployment

Proxmox LXC scripts for the API (VMID 7201), Angular app (VMID 7202), and marketing site (VMID 7203). Full runbook: [Docs/deployment-proxmox.md](../Docs/deployment-proxmox.md).

```
deployment/
├── prepare-artifacts.sh           # JAR + SQL migrations + frontend zip
├── prepare-website-artifact.sh    # Vite MPA → website-dist.tar.gz
├── deploy-all.sh                  # optional --build, then API then app
├── artifacts/                     # gitignored build output
└── proxmox/
    ├── deployment.conf
    ├── deploy-api.sh
    ├── deploy-app.sh
    ├── deploy-website.sh
    └── ...                        # Tailscale / pct helpers (same pattern as MoneyTree)
```

```bash
./deployment/prepare-artifacts.sh
./deployment/proxmox/deploy-api.sh --accept-defaults
./deployment/proxmox/deploy-app.sh --accept-defaults
```

Marketing site (`ideate-website/`, hostname `ideate-web`):

```bash
./deployment/prepare-website-artifact.sh
./deployment/proxmox/deploy-website.sh --accept-defaults --recreate
```

First-time create: add `--recreate`. Run from WSL. Requires `PROXMOX_PASSWORD`, `CONTAINER_PASSWORD`, `TS_AUTHKEY`, and `DB_*` in the repo `.env`.
