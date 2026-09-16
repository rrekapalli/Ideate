# Open questions

Refinement list. Do not block inception on answers. Do not write application code to dodge these.

## Product

- Working product name is **Ideate** (Research OS was the inception label). Still open: is Ideate final, or do we keep exploring close variants?
- Persona is a required dropdown on **Create workspace**. No default workspace, no empty template, one workspace per project. Closed.
- Scientist and Researcher **merged** into Researcher: same workflow phases (claim → evidence → revision). Use modes for theory-vs-literature posture. Closed.
- Workspace persona is **shared** on a team project (it describes the project, not the user). Closed. Members may still pick their own **mode**.
- Day one ships **full structure** (objects, cards, graph, personas). Explore Mode is an input posture, not a structure-light v1. Closed.
- Confidence chrome stays **minimal** until we are building; refine then. Closed for now.
- AI refusal / Socratic pushback: follow current reasoning-model practice (e.g. ChatGPT); tune after a working prototype; expose as **configurable application settings**. Closed for inception.
- **v1 is single-thinker.** Team workspaces come later as a **Pro** subscription. Closed. (When Pro exists, workspace persona stays shared.)

## Object model

- Full object catalog is in. Some types may be **associatable tags** (many per object) until we fine-tune. Closed. See [object-model.md](./object-model.md).
- Epistemic (and other) tags show as **chips/badges on the card footer**. Fine-tune after we see the UI. Closed.
- Misconception vs abandoned hypothesis: different `object_category` on every object; UI color/symbol. Closed. See [object-model.md](./object-model.md#object_category).
- Theory only after **Hypothesis → Evaluation → Theory**. AI-driven, dynamic; user accepts the proposal. No Theory before Evaluation. Closed. See [object-model.md](./object-model.md#hypothesis--evaluation--theory).
- "I don't know yet" is an **Unknown** card on Concept evolution (`Thought → Concept → Unknown → Hypothesis`). Queryable; `object_category: unknown`. Closed.
- Identity: rename keeps the same id (aliases + version). Split/merge mint **derived** cards of the same type (`origin: derived` → "Derived hypothesis"). No extra type catalog. Closed.

## Graph and intelligence

- Object generation is **aggressive and automatic**. The user can override (edit type, dismiss, merge, undo). Closed.
- Junk drawer: user can **delete** junk nodes and mis-directed AI generations (batch + undo). Delete ≠ abandon. Closed.
- What is the confidence algebra? Bayesian, heuristic, or human-set with AI deltas?
- Propagation is never silent: **notify** the user and **list every relevant object** being changed. Closed.
- How do we detect "you rediscovered your own abandoned idea" reliably enough to trust? Projector → wearable display is the cross-workspace test.
- Literature is **AI-driven attachment** to nodes (Evidence, etc.), not a library. AI researches and evolves the workspace. No Zotero clone. Closed. The left nav **Documents** tree is an engagement folder of links (SharePoint-class), opened as ACL’d tabs — not a tenant bibliography. Closed for UI. See [workspace-ui.md](./workspace-ui.md#documents-engagement-collection).

## Learning

- How do we adapt traversal without locking students into a hidden curriculum?
- How do we store misconceptions without shaming the learner?
- v1 has **clone and overlay**. A branch is **Mainstream** or **Overlay** via a required create dropdown. Closed. See [learning-mode.md](./learning-mode.md#clone-and-overlay-both-in-v1).
- What does "practice mode" query against — the learner graph, a canonical subject graph, or both?

## Architecture and SaaS

- Graph canvas is [ngDiagram](https://www.ngdiagram.dev/) ([technology-stack.md](./technology-stack.md)). Still open: Angular app shell now, or stay docs-only until the v0 object list is frozen?
- v0: **one custom card component per object type**. Abstract to a shared base later. Closed.
- First graph store: **PostgreSQL + Apache AGE + pgvector**. Closed.
- Tenant isolation for literature archives and idea graphs.
- What is private by default: the thought stream, the graph, or both?
- **Multi-agent orchestration** with specialist agents. Modes stay as user posture; they do not replace agents. Closed.
- LLMs are **swappable provider adapters** (cloud and **local**: Ollama, LM Studio). Graph + tools stay Ideate’s. Closed. See [technology-stack.md](./technology-stack.md#llm-providers-swappable-backends).
- AI economics: **graph as memory**, job-class routing, prompt cache, **evolving conversation cache** (cheap/local summary replaces the previous one), batch, staged literature, **per-workspace usage ledger**, credits. Closed for inception. See [java-backend-ai.md](./java-backend-ai.md). Exact plan prices and credit weights can move.
- **Cloud SaaS + Angular 22 PWA.** Installable web app (desktop/tablet). No offline-first / Flutter workspace. Phone authoring out of v1. Closed. See [technology-stack.md](./technology-stack.md).
- **Consulting / professional services** is a documented B2B vertical (same engine; Analyst first). Stronger enterprise monetization candidate than student ₹199 plans. Closed as a use case. Firm-grade isolation, SSO, and matter boundaries stay open until an enterprise pilot. See [use-cases/consulting.md](./use-cases/consulting.md).

## Design benchmark

- **No seeded projects** in the product. First use is an **empty workspace**. Satellite / projector / Purana stay design-docs only. Closed.
- **Pre-materialize as much as possible** from conversation; persist the **whole transcript**. Graph updates as talk evolves; user can edit the graph at the same time (tag, attach, branch, add nodes). Closed.
- Glow concept sheet: not shipped in-app. Closed with empty-workspace decision.

## Next refinement sessions

Suggested order:

1. Freeze edge types and which catalog names start as cards vs tags.
2. Wire Explore Mode + simultaneous graph edit into the workspace shell sketch.
3. Confirm Ideate as the ship name, or pick a close variant.
4. Scaffold the Angular SaaS (empty workspace; no sample projects).
