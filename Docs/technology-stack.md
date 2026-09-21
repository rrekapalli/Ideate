# Technology stack

Provisional. No application code yet. Choices here constrain the first Angular scaffold; they do not authorize building it until the v0 object list is frozen.

## Client

**Angular 22 PWA web app.** Desktop/laptop first; tablet as a tighter layout of the same shell. Not Flutter. Not a native phone authoring app.

| Choice | Why |
| --- | --- |
| **Angular 22** | Long-lived SaaS: drawers, editor tabs, typed cards, not a chat page |
| **PWA** | Installable from the browser (desktop/tablet). Same origin as the SaaS. Not an offline-first client. |
| TypeScript | Object model is the product; types should match cards and graph nodes |
| [ngDiagram](https://www.ngdiagram.dev/) (`ng-diagram`) | Native Angular 18+ canvas; compatible with Angular 22 |

**Form factors**

| Surface | Role |
| --- | --- |
| Desktop / laptop browser | **Primary.** Full IDE shell ([workspace-ui.md](./workspace-ui.md)). |
| Tablet (browser or installed PWA) | Same app; collapse a drawer so graph + chat still fit. |
| Phone | **Not v1 authoring.** Density (graph + two drawers + chat) does not belong on ~390px. A later thin reader is optional — not Flutter as the workspace stack. |

PWA means: web app manifest, service worker for **shell** install/update, “Add to dock/Start menu.” It does **not** mean the graph and AI work without the Java API. Cloud (or self-hosted) service stays required. See Hosting below.

**Not Flutter.** One mobile codebase is not the product. Flutter web would fight ngDiagram, SharePoint tabs, and browser-native chrome. A native reader can be a later decision.

## Backend

| Choice | Why |
| --- | --- |
| **Java 25** | Graph engine, orchestrator, provider adapters, APIs. Keys stay on the server. |
| PostgreSQL + Apache AGE + pgvector | Tenants, graph, embeddings |

## Workspace graph canvas: ngDiagram

Every card in [object-model.md](./object-model.md) is a **node**. Typed **relationships** are **edges**. Cards are never edges. Relationships are never cards. Edges can still be uniquely identifiable.

Render that graph with [ngDiagram](https://www.ngdiagram.dev/) (Apache 2.0, Synergy Codes). It is Angular-native: nodes and edges are ordinary components, styled with CSS, with a model-adapter hook so the idea-graph store does not have to live inside the diagram library.

Required canvas behavior:

| Behavior | Note |
| --- | --- |
| **Zoom and pan** | First-class. A workspace graph will outgrow the viewport. Pinch, wheel, and toolbar zoom. |
| Custom node per object type | v0: **one Angular component per type**. Hypothesis card ≠ Constraint card. Abstract a shared base later. |
| Custom edge per relationship type | `supports`, `contradicts`, `constrains`, `reused-in` look and act differently |
| Select a node → open its card | Inspector is that card, not a second representation |
| Select an edge | Highlight the relationship and its two endpoint cards. No relationship card. |
| Jump-to-object | Header Search pans and zooms the camera to that id |
| Nested groups (later) | Theory, Architecture, or a calculation chain as a group |
| Layout | External layout later; do not hand-place a 200-node feasibility graph |

ngDiagram already lists pan & zoom, custom nodes/edges, groups, edge labels, and a model adapter. That matches "cards on a zoomable idea graph" better than a generic flowchart widget or a React-only library wrapped into Angular.

Do not treat the canvas as a drawing toy. Layout is a view over the graph engine. Dragging a card may be allowed for local arrangement; it must not be the source of truth for relationships.

## Other client notes

- App shell and Explore Mode stay Angular PWA components around the canvas, not inside it.
- Cards have a compact graph face (header / few sentences / footer tags) and a **full page** (complete AI body). Same id, same version. Shell is VS Code–like: [workspace-ui.md](./workspace-ui.md).
- Dark theme in the first UI concept should map to CSS variables / ngDiagram themes.

## LLM providers (swappable backends)

ChatGPT, Grok, and others are **inference engines**, not the application. Ideate is a graph writer with a conversational face. The model never owns the workspace.

```text
You talk  →  persisted transcript
          →  Orchestrator (mode + persona + graph context)
          →  Specialist agents
          →  Tool calls (create_card, link, tag, attach, evaluate)
          →  Graph engine  ← user may edit at the same time
```

**One orchestrator. Many adapters.** Do not ship “Ideate for OpenAI” and “Ideate for Grok.”

**Local models are first-class providers too** — [Ollama](https://ollama.com/), [LM Studio](https://lmstudio.ai/), and any OpenAI-compatible HTTP endpoint. Same tool schema. The app stays a **cloud SaaS** (no offline Ideate client); only inference may run on a machine the user controls.

| Layer | Stays the same | Changes with provider |
| --- | --- | --- |
| Angular UI, cards, ngDiagram | Yes | No |
| Object model, AGE graph | Yes | No |
| Agent jobs and tool schema | Yes | Which model runs the job |
| Transcript | Yes | Tokenizer / vision / context window |
| pgvector search | Yes | Keep **one embedding model** so switching chat providers does not break search |

Every adapter must speak **tools**, not essays: `create_node`, `create_edge`, `attach_file`, `start_evaluation`, `propose_theory`. Weak tool-callers go through JSON validation before the graph applies a write.

**Where the user picks a backend**

1. **Account default** — provider + model (OpenAI, xAI, Anthropic, **Ollama**, **LM Studio**, …).
2. **Workspace override** (optional) — this project uses another model or a local endpoint.
3. Later: per-agent routing. Not v1.

Show a capability matrix in Settings (chat / tools / vision / long context). Disable extract-from-sheet if the selected model cannot see images.

**Cloud vs local inference**

| Provider | How Ideate calls it |
| --- | --- |
| OpenAI, xAI, Anthropic | Public API; platform key or BYOK |
| Ollama | User-supplied **base URL** + model name (Ollama HTTP API / OpenAI-compatible) |
| LM Studio | User-supplied **base URL** + model (LM Studio’s local OpenAI-compatible server) |
| Other local | Any OpenAI-compatible `/v1/chat/completions` URL |

The Java 25 service makes the call, never the browser. `localhost` on the user’s laptop is reachable only if that Ideate backend is on the same machine (self-host) or the user exposes Ollama/LM Studio (Tailscale, tunnel, LAN). A hosted Ideate cloud cannot see `http://localhost:11434` on the user’s PC.

Local does **not** mean offline Ideate. No app without the cloud (or self-hosted) service.

**Keys / endpoints:** server-side only. Cloud keys encrypted; local base URL + optional API key stored per tenant. Record `generated_by: ollama:llama3.2` (or `lmstudio:…`) on the version. Switching provider does not change object ids.

Embeddings: prefer one configured embedder for pgvector. If the user runs fully local, they may point embeddings at an Ollama embedding model so search stays on-box.

A ChatGPT **plugin** is a later companion that writes into this API. It is not the product home.

**Cost:** do not dump the workspace into a frontier model. Route `SIMPLE` work to Ollama or a cheap API (including **replacing** the evolving conversation cache); reserve frontier for `DEEP`. Ledger tokens and ₹ per workspace. See [java-backend-ai.md](./java-backend-ai.md).

## Reasoning and API

| Layer | Direction | Status |
| --- | --- | --- |
| Natural language + agents | Multi-agent orchestrator + specialist agents | Chosen |
| LLM backends | Provider adapters: cloud (OpenAI, xAI, …) and **local** (Ollama, LM Studio, OpenAI-compatible URL) | Chosen |
| Embeddings | Single embedder into pgvector | Chosen |
| Backend | **Java 25** service (orchestrator, graph API, provider adapters) | Chosen |
| UI | **Angular 22 PWA** (web; desktop/tablet) | Chosen |
| Research graph engine | Identity, versioning, confidence, provenance | Open |
| Persistence | PostgreSQL 18 on Proxmox (`pg18`) + Apache AGE + pgvector | Chosen |
| Hosting | Cloud SaaS. PWA is installable, **not** offline-first | Chosen |
| Files | Attachments on cards + workspace **Documents** tree (SharePoint-class links, ACL) | Open |

See [architecture.md](./architecture.md).

## What this stack is not

- Not Flutter / a phone-first native app.
- Not a ChatGPT / Grok / Claude chat skin.
- Not React Flow / xyflow with an Angular wrapper.
- Not a notebook (Obsidian-style) with an optional graph plugin.
- Not vis.js or a static SVG export.
- Not an implementation ticket. This file records intent.

## First scaffold (when authorized)

1. Angular 22 **PWA** workspace + Java 25 service shell.
2. Object identity + card model (empty workspace; no sample graph).
3. ngDiagram canvas: zoom/pan, **one card component per type** (header / summary / footer), typed edges; click a card → **full object page**.
4. Jump-to-object focuses the camera.
