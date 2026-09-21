# Ideate

An AI-native environment where ideas, knowledge, and understanding can be explored, connected, challenged, and continuously evolved.

Ideate is to thinking what Git is to software development. The working brief lives in [`Docs/`](./Docs/).

## Stack

| Layer | Direction |
| --- | --- |
| Client | Angular 22 PWA (`ui/apps/ideate`) |
| Design system | `@ideate/ui` copied from MoneyTree UI primitives |
| Backend | Java 25 / Spring Boot 4 (`backend/`) |
| Persistence | PostgreSQL 18 on Proxmox (`pg18.tailce422e.ts.net:6432`) + Apache AGE + pgvector |
| Inference | Ollama (optional, reachable URL) |

## Workstation run

Postgres is **not** on the laptop. Use the same Proxmox host as MoneyTree: **`pg18.tailce422e.ts.net:6432`** (PgBouncer), database **`ideate`**. AGE 1.8 and pgvector are enabled there.

1. Copy `.env.example` to `.env` and set `DB_PASSWORD` (same Postgres password as MoneyTree).
2. Start the API (Java 25):

```bash
# Git Bash / WSL
./scripts/start-backend.sh

# Windows PowerShell
./scripts/start-backend.ps1
```

3. Start the PWA:

```bash
cd ui
npm install
npm start
```

Open http://localhost:4200. Auth is bypassed in development (`IDEATE_AUTH_ENABLED=false`). The seeded local account starts with **zero workspaces**. Create one with a required persona.

Optional: run `ollama serve` and pull `llama3.2` so Explore turns can materialize cards. If Ollama is down, the transcript still persists.

## Proxmox

API LXC **7201** (`ideate-api`) and app LXC **7202** (`ideate`) clone MoneyTree templates 9001/9002. See [`Docs/deployment-proxmox.md`](./Docs/deployment-proxmox.md) and [`deployment/README.md`](./deployment/README.md).

## Docs

See [`Docs/README.md`](./Docs/README.md) for vision, object model, workspace UI, and the Java AI contract.
