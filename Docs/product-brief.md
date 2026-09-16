# Product brief

**Product:** Ideate  
**Status:** inception  
**Client:** Angular 22 PWA (web; desktop/tablet)  
**Backend:** Java 25  
**Code:** none yet

## Problem

Researchers, students, and builders currently split thinking across PDFs, Notion, Obsidian, Zotero, ChatGPT, Git, Excel, Jupyter, and Mendeley.

Every tool stores information differently. Nothing understands how ideas connect. Nothing remembers why an idea was abandoned. Conversations end; understanding is not persisted as a living object.

## Product

**Ideate** is a multi-tenant Angular SaaS workspace where a person (or team) grows an **idea graph**.

The user can think in natural language. The system extracts and maintains first-class objects, relationships, confidence, provenance, and versions. AI collaborates over that graph instead of answering in a disposable chat.

## Users and personas

The domain changes. The operating system does not.

Personas (Student, Researcher, Inventor, Analyst, Explorer) are chosen from a **required dropdown** when a **workspace is created**. Nothing is pre-selected. There is no default workspace after signup. **One workspace = one project.** Same account, many projects, many roles. Details are in [personas.md](./personas.md). Narrative use cases (including [consulting firms](./use-cases/consulting.md)) are in [use-cases/](./use-cases/README.md).

| Persona | Entry point | Success looks like |
| --- | --- | --- |
| Student | "How do satellites stay in space?" | A visible conceptual model, with misconceptions preserved as history |
| Researcher | A hypothesis plus literature, or a theory under pressure | Confidence, contradictions, citations, and theory versions that can be reviewed like code |
| Inventor / engineer | A speculative architecture | Branches, failure modes, and decisions that remain explainable months later |
| Analyst / strategist | A decision under uncertainty | Traceable reasons, alternatives, and later replay |
| Explorer | A curiosity with no deadline | Open questions preserved; speculation stays tagged |

Example workspaces that should all fit the same engine:

- Stationary Satellite Relays
- Prism-Based Projector Feasibility
- Purana / ancient knowledge
- Quantitative trading research
- Product research (for example RxFolio)
- Completely speculative ideas

The first two are a **design pair** for us ([design-benchmarks.md](./design-benchmarks.md)). None of these are shipped as sample data. The product starts from an empty workspace.

## Modes

The AI should not always give the answer. Modes change the posture of the collaborator.

| Mode | User intent | AI posture |
| --- | --- | --- |
| Learn | Teach me | Scaffold from what I already understand |
| Explore | Let's investigate | Conversational; **aggressively generate** objects; user can override |
| Challenge | Question my assumptions | Socratic, find weak nodes |
| Practice | Test my understanding | Probe the graph for gaps |
| Research | Investigate the literature | AI finds and attaches papers as Evidence on the nodes being explored |
| Create | Help me develop an idea | Promote thoughts toward hypotheses |
| Debate | Give opposing perspectives | Hold competing theories in parallel |
| Explain | Explain at the right level | Traverse the same graph at a different depth |
| Review | Find gaps before publishing | Code-review analogue for claims |

## Explore Mode

Day one ships **full structure**: typed cards, graph, versions, personas. Explore Mode is how you *talk* into that structure. The **entire conversation is persisted**. Objects are materialized **as the conversation happens**. The user can tag, attach docs, branch, or add nodes on the graph at the same time.

The user writes:

The user writes:

> What if we didn't try to make every component last 1000 years? What if the satellite contained hundreds of dormant replacement modules?

AI responds conversationally and **generates objects immediately** (aggressive, not wait-for-promote):

```text
CREATED  Concept C-041  Modular Dormant Replacement Architecture
CREATED  Relationship   Long-Life Architecture → reduces dependence on → component longevity
```

The user can **override** any of it:

- Edit title, type, or tags
- Demote / change type
- Delete junk nodes or a mis-directed AI reply (whole generation batch)
- Merge into an existing card
- Undo

A thought can still remain a thought for years if the user overrides a too-eager promotion.

## Fundamental lifecycle

Users do not have to follow this rigidly. It is the gravitational shape of the system.

```text
THINK ("I wonder...")
  → EXPLORE (learn / ask)
  → CONNECT (ideas / facts)
  → QUESTION (why? what if?)
  → TEST (evidence / reasoning)
  → REVISE (understanding)
  → CREATE (new ideas)
  → THINK
```

Object promotion:

```text
Thought → Concept → Unknown → Hypothesis
                 ↘ Question        ↘ Evidence
                                   ↘ Experiment
                                        → Evaluation          ← AI-driven; required
                                             ↘ Supported → Theory → Version → New research
                                             ↘ Rejected  → New hypothesis
```

**Unknown** ("I don't know yet") is an intermediate **card** on a Concept's evolution, not a tag. Queryable. The AI may create it; the user accepts or resolves it.

**Hypothesis → Evaluation → Theory** is the standard. A Theory is not created before Evaluation. The AI opens and updates Evaluation as the graph changes and proposes Theory when the outcome is supported. The user accepts, amends, or dismisses. Formal published evidence is not required; a reasoned Evaluation is.

A rejected hypothesis can later be resurrected. A concept can spawn ten hypotheses. Failure is research data.

## Epistemic honesty

The system must never collapse these into one "AI answer":

| Category | Meaning |
| --- | --- |
| Established knowledge / fact | Settled, sourced |
| Supported inference | Reasoned from evidence, still provisional |
| Hypothesis | Testable claim owned by the workspace |
| Speculation / thought experiment | Explicitly unvalidated |
| Open question / unknown | Not yet answered |
| Misconception | Prior belief that was challenged |

A student should not leave thinking "the AI said it, therefore it is true." They should leave knowing what is established, what is inferred, what is theirs, and what is still unknown.

That is epistemic literacy.

## Workspace home

The opening screen should not look like a project-management dashboard. It should look like a **VS Code–style thinking IDE**: graph in the center, Chat on the right, tools below. See [workspace-ui.md](./workspace-ui.md).

A workspace remembers:

- the original immutable thought
- current concepts, hypotheses, and open questions
- the evolution spine of the idea
- recent reasoning
- research maturity (thought experiment → engineering hypothesis → research program)

The first Angular shell concept keeps jump-to-object search, resume, contradiction cards, and an object-event timeline — then persona-weights the side rails so a Student is not dropped into peer review. See [workspace-ui.md](./workspace-ui.md) and [design-benchmarks.md](./design-benchmarks.md).

An abandoned workspace must remain queryable from a later one (`reused-in`). The projector feeding a wearable display is the test.

## SaaS notes (provisional)

To refine later, not to implement now:

- **Angular 22 PWA.** Desktop/laptop first; tablet supported. Phone authoring is not v1. Installable; **not** offline-first. Not Flutter.
- **v1: single-thinker.** One account, many personal projects. Team workspaces are a later **Pro** plan.
- Workspaces are **clonable** (new project from a Mainstream snapshot).
- v1 also has **overlay branches**. Create branch: name + required **Mainstream | Overlay** dropdown. One Mainstream per workspace; overlays stay private until explicitly merged.
- No default workspace; user creates one workspace per project
- Persona required from a dropdown at workspace creation (no pre-selected value); changeable on that workspace later. On Pro teams the persona is **shared** (it describes the project).
- Full object/card/graph structure from day one
- Confidence UI: **minimal** until we learn from a build
- AI refusal / Socratic pushback: configurable application settings after a prototype; start from current reasoning-model practice
- Object-level provenance and ownership
- **Meaning** of a file is an **attachment on a card**. The workspace **Documents** tree is an engagement folder of links (SharePoint, etc.), ACL’d, opened as editor tabs — not a firm KM or Zotero. See [workspace-ui.md](./workspace-ui.md#documents-engagement-collection).
- **Multi-agent orchestration** (Literature, Critique, Teacher, …). Modes steer which agents run; they are not a substitute for agents.
- LLMs are **selectable backends**: cloud APIs (ChatGPT / Grok / Copilot-adjacent) and **local** (Ollama, LM Studio). Same tool schema. Graph is memory; models are routed (`SIMPLE`/`NORMAL`/`DEEP`/`BATCH`) and costed per workspace. Not unlimited frontier at note-app prices — credits. See [java-backend-ai.md](./java-backend-ai.md). A ChatGPT plugin may come later as a companion.
- Long-term memory that outlives any single conversation
- Export / review artifacts for publication or teaching

## Non-goals for inception

- Scaffolding Angular application code
- Choosing a final backend vendor
- Building a PDF reader
- Competing with Zotero or Notion on document storage
- Being a ChatGPT / Grok / Claude chat skin (those are backends)
- Overnight corpus "dream cycles" as the primary metaphor (that is closer to [REM Labs](https://remlabs.ai/research-os); our center is the human's evolving understanding)
