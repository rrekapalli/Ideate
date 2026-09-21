# Ideate deployment

Proxmox LXC scripts for the API (VMID 7201) and Angular app (VMID 7202). Full runbook: [Docs/deployment-proxmox.md](../Docs/deployment-proxmox.md).

```
deployment/
├── prepare-artifacts.sh   # JAR + SQL migrations + frontend zip
├── deploy-all.sh          # optional --build, then API then app
├── artifacts/             # gitignored build output
└── proxmox/
    ├── deployment.conf
    ├── deploy-api.sh
    ├── deploy-app.sh
    └── ...                # Tailscale / pct helpers (same pattern as MoneyTree)
```

```bash
./deployment/prepare-artifacts.sh
./deployment/proxmox/deploy-api.sh --accept-defaults
./deployment/proxmox/deploy-app.sh --accept-defaults
```

First-time create: add `--recreate`. Run from WSL. Requires `PROXMOX_PASSWORD`, `CONTAINER_PASSWORD`, `TS_AUTHKEY`, and `DB_*` in the repo `.env`.
