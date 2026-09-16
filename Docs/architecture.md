# Architecture

Provisional shape only. No implementation at inception.

The intended first client is an **Angular 22 PWA** (desktop/laptop and tablet in the browser; installable). The backend is a **Java 25** service. Phone authoring can wait. The graph engine is the product; the UI is how a human walks it. Not Flutter.

## System sketch

```text
                 ┌──────────────────────────┐
                 │        Ideate UI         │
                 │ Angular 22 PWA + ngDiagram│
                 │ Java 25 graph / agents   │
                 │ (zoomable object cards)  │
                 └─────────────┬────────────┘
                               │
                     Natural Language Layer
                               │
                     Agent Orchestrator
                               │
         ┌─────────────────────┼─────────────────────┐
         │                     │                     │
 Literature Agent      Reasoning Agent      Critique Agent
         │                     │                     │
         └───────────────┬─────┴─────────────────────┘
                         │
              Model adapter (OpenAI / xAI / Ollama / LM Studio / …)
                         │
                     Graph Engine
                               │
      ┌───────────────┬───────────────┬───────────────┐
      │               │               │               │
 Concepts      Hypotheses      Evidence      Experiments
      │               │               │               │
      └─────────────── Semantic Relationship Layer ───┘
                               │
              Versioning • Provenance • Confidence
                               │
                  Vector Index + Graph Database
                               │
       PostgreSQL + Apache AGE + pgvector
                               │
                  Object Store + Literature Archive
```

## UI principles

The workspace is an environment for an idea, not a ticket board.

- Show evolution, not only the latest answer.
- Keep the original thought immutable and visible.
- Count concepts, hypotheses, and open questions as living inventory.
- Persist the full conversation. Materialize as many objects as possible as it proceeds. User and AI may edit the graph at the same time.
- The AI **aggressively generates** objects from conversation and artifacts. The user can override: edit, change type, merge, undo, or **delete** junk nodes and mis-directed replies.
- Graph, timeline, and review are first-class views in an **IDE-like shell**: **collapsible drawers** left and right (each with a **fixed header and footer**, scrolling body), center graph + object/document tabs, header **Search** (top right), collapsible bottom tools. See [workspace-ui.md](./workspace-ui.md).
- Global Search (header) finds objects and permitted documents. It is not a left-nav item.
- A graph card shows a **short** summary; click opens a **full page** with the complete persisted AI body.
- Every card is a versioned graph **node**. Relationships are **edges**, not cards. See [object-model.md](./object-model.md).
- The workspace graph is rendered with [ngDiagram](https://www.ngdiagram.dev/) and must be zoomable. See [technology-stack.md](./technology-stack.md).
- AI insight cards are graph events (contradiction, new link, challenged belief).
- Personas weight language and default rails; they do not fork the UI into separate apps.
- Confidence belongs to an object, never to the account or the whole workspace.

Later surfaces:

- Theory diff
- Contradiction inbox
- Review mode (publication / exam / decision review)
- Learner traversal of the same graph at different depths

Shell concept: [workspace-ui.md](./workspace-ui.md). Persona lenses: [personas.md](./personas.md).

## Agent set

**Real specialist agents**, coordinated by an orchestrator. Not one model wearing mode labels.

User **modes** (Explore, Challenge, Review, …) are how the human wants to work right now. They steer which agents the orchestrator calls. They do not collapse the agent set into a single prompt.

The orchestrator reasons over objects, not chat logs.

LLMs are **swappable backends** behind a model adapter. The user selects a provider (account default, optional workspace override): cloud APIs **or local** (Ollama, LM Studio, OpenAI-compatible URL). Agents issue the same tool calls regardless of vendor. The orchestrator **routes by job class** (`SIMPLE` / `NORMAL` / `DEEP` / `BATCH`) and sends a **project-state projection**, not the whole workspace. Every call is ledgered per workspace. See [java-backend-ai.md](./java-backend-ai.md) and [technology-stack.md](./technology-stack.md#llm-providers-swappable-backends).

| Agent | Job |
| --- | --- |
| Literature | Find and attach sources to nodes; extract claims; evolve the graph. Not a citation manager |
| Reasoning | Connect objects, propose relationships, update confidence |
| Critique | Find flaws, unsupported claims, overconfidence |
| Statistician | Check significance and experimental design |
| Philosopher | Challenge assumptions |
| Engineer | Suggest implementations and constraints |
| Historian | Find similar prior work, including the user's own abandoned ideas |
| Synthesizer | Combine ideas |
| Teacher | Socratic questioning; adaptive traversal for learners |

Example collaborator utterances the architecture should make natural:

- I found three papers that weaken your hypothesis.
- Your experiment assumes stationarity, but newer literature contradicts that assumption.
- You independently rediscovered an algorithm published in 2018.
- Your current self-maintaining spacecraft concept is structurally similar to H-004, which you abandoned because you assumed active robotic maintenance was too complex.
- Why did you originally choose the Pi Zero? Architecture v0.8 assumed onboard Wi-Fi and a familiar Linux board; brightness and thermal evidence later forced v0.9.
- Your new wearable display reuses thermal and optical constraints from the abandoned Prism Projector workspace.

## Graph engine responsibilities

- CRUD for first-class objects
- Typed relationships
- Confidence propagation
- Contradiction detection
- Versioning and branching
- Provenance walks
- Novelty comparison against literature (later)
- Learner-state overlay on the same graph
- Cross-workspace reuse of abandoned objects (`reused-in`)

## Storage hypothesis

Hybrid store, to be validated:

| Concern | Candidate |
| --- | --- |
| Relational facts, tenants, users | PostgreSQL |
| Graph traversal | Apache AGE |
| Semantic retrieval | pgvector |
| PDFs, figures, raw artifacts | Object store |
| Literature corpus | Tenant-scoped archive |

Do not implement this until the object model is stable enough to persist.

## Confidence propagation (conceptual)

```text
Evidence (0.95) --supports--> Hypothesis
  If that evidence is the only support, hypothesis confidence updates.

Paper retracted / measurement corrected / belief changed
  → affected subgraph updates
  → notify the user with the full list of objects being changed
```

Do not surprise the user with a silent rewrite. The notification *is* the intimacy: every relevant card listed, jumpable.

## Contradiction engine

Continuously check:

```text
Claim A
  contradicts
Claim B
```

Notify with structure, not an essay:

- These two theories cannot both be true.
- Your experiment contradicts your own assumption from last month.
- Three assumptions have not yet been justified.

## Review mode

Before publication, teaching, or a major decision, the system inspects the graph:

- Missing citations
- Weak evidence
- Contradictions
- Unsupported claims
- Overconfident conclusions
- Missing experiments

This is a code review for thinking.

## Novelty detection (later)

```text
Your idea → compare → literature corpus → novelty score
or
Similar to Paper (2021)
Difference: new optimization layer
```

## Why Angular 22 PWA and Java 25

This will be a long-lived, graph-heavy SaaS workspace: drawers, object tabs, evolution timelines, and mode-switching. **Angular 22 as a PWA** is the web client so the product can grow as a structured, installable application rather than a chat page — and rather than Flutter, which we would only reconsider for a later phone **reader**. **Java 25** is the backend: graph engine, multi-agent orchestrator, and LLM provider adapters (cloud keys and local base URLs stay on the server).

The center editor is an [ngDiagram](https://www.ngdiagram.dev/) canvas: custom Angular components per object type (compact cards), typed edges, pan and zoom. Click opens a full object tab. The idea-graph store stays behind a model adapter; the library is a view.

No app scaffold in this repository yet. Stack detail: [technology-stack.md](./technology-stack.md).
