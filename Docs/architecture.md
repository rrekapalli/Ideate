# Architecture

Provisional shape only. No implementation at inception.

The intended first client is an **Angular web SaaS**. Mobile and desktop can wait. The graph engine is the product; the UI is how a human walks it.

## System sketch

```text
                 ┌──────────────────────────┐
                 │        Research UI       │
                 │ Angular web (later       │
                 │ mobile / desktop)        │
                 └─────────────┬────────────┘
                               │
                     Natural Language Layer
                               │
         ┌─────────────────────┼─────────────────────┐
         │                     │                     │
 Literature Agent      Reasoning Agent      Critique Agent
         │                     │                     │
         └─────────────── Agent Orchestrator ───────┘
                               │
                     Research Graph Engine
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
       PostgreSQL + Apache AGE (or Neo4j) + pgvector
                               │
                  Object Store + Literature Archive
```

## UI principles

The workspace is an environment for an idea, not a ticket board.

- Show evolution, not only the latest answer.
- Keep the original thought immutable and visible.
- Count concepts, hypotheses, and open questions as living inventory.
- Let the user stay in Explore Mode without filling forms.
- Promotion (Thought → Concept → Hypothesis) is an explicit human act, with AI suggestions.
- Graph, timeline, and review are first-class views.

Later surfaces:

- Theory diff
- Contradiction inbox
- Review mode (publication / exam / decision review)
- Learner traversal of the same graph at different depths

## Agent set

Different agents specialize. The orchestrator reasons over objects, not chat logs.

| Agent | Job |
| --- | --- |
| Literature | Read papers into claims, methods, datasets, limitations |
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

## Graph engine responsibilities

- CRUD for first-class objects
- Typed relationships
- Confidence propagation
- Contradiction detection
- Versioning and branching
- Provenance walks
- Novelty comparison against literature (later)
- Learner-state overlay on the same graph

## Storage hypothesis

Hybrid store, to be validated:

| Concern | Candidate |
| --- | --- |
| Relational facts, tenants, users | PostgreSQL |
| Graph traversal | Apache AGE or Neo4j |
| Semantic retrieval | pgvector |
| PDFs, figures, raw artifacts | Object store |
| Literature corpus | Tenant-scoped archive |

Do not implement this until the object model is stable enough to persist.

## Confidence propagation (conceptual)

```text
Evidence (0.95) --supports--> Hypothesis
  If that evidence is the only support, hypothesis confidence updates.

Paper retracted
  → affected claims, hypotheses, decisions, and learner understandings update.
```

This is a graph update, not a chat reminder.

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

## Why Angular

This will be a long-lived, graph-heavy SaaS workspace: object inspectors, evolution timelines, relationship views, and mode-switching. Angular is the intended web client so the product can grow as a structured application rather than a chat page with notes beside it.

No app scaffold in this repository yet.
