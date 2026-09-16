# Product brief

**Status:** inception  
**Client:** Angular web SaaS  
**Code:** none yet

## Problem

Researchers, students, and builders currently split thinking across PDFs, Notion, Obsidian, Zotero, ChatGPT, Git, Excel, Jupyter, and Mendeley.

Every tool stores information differently. Nothing understands how ideas connect. Nothing remembers why an idea was abandoned. Conversations end; understanding is not persisted as a living object.

## Product

A multi-tenant Angular SaaS workspace where a person (or team) grows an **idea graph**.

The user can think in natural language. The system extracts and maintains first-class objects, relationships, confidence, provenance, and versions. AI collaborates over that graph instead of answering in a disposable chat.

## Users

The domain changes. The operating system does not.

| Persona | Entry point | Success looks like |
| --- | --- | --- |
| Curious learner / student | "How do satellites stay in space?" | A visible conceptual model, with misconceptions preserved as history |
| Researcher | A hypothesis plus literature | Confidence, contradictions, and theory versions that can be reviewed like code |
| Inventor / engineer | A speculative architecture | Branches, failure modes, and decisions that remain explainable months later |
| Analyst / strategist | A decision under uncertainty | Traceable reasons, alternatives, and later replay |
| Knowledge explorer | Ancient texts, markets, product R&D | Same primitives, different corpus |

Example workspaces that should all fit the same engine:

- Stationary Satellite Relays
- Purana / ancient knowledge
- Quantitative trading research
- Product research (for example RxFolio)
- Completely speculative ideas

## Modes

The AI should not always give the answer. Modes change the posture of the collaborator.

| Mode | User intent | AI posture |
| --- | --- | --- |
| Learn | Teach me | Scaffold from what I already understand |
| Explore | Let's investigate | Conversational, extract objects in the background |
| Challenge | Question my assumptions | Socratic, find weak nodes |
| Practice | Test my understanding | Probe the graph for gaps |
| Research | Investigate the literature | Attach papers as graph objects |
| Create | Help me develop an idea | Promote thoughts toward hypotheses |
| Debate | Give opposing perspectives | Hold competing theories in parallel |
| Explain | Explain at the right level | Traverse the same graph at a different depth |
| Review | Find gaps before publishing | Code-review analogue for claims |

## Explore Mode

Most knowledge products force structure too early. Explore Mode is the opposite.

The user writes:

> What if we didn't try to make every component last 1000 years? What if the satellite contained hundreds of dormant replacement modules?

AI responds conversationally and simultaneously proposes:

```text
NEW CONCEPT DETECTED
Modular Dormant Replacement Architecture

Potential relationships:
Long-Life Architecture → Modular Replacement
                       → reduces dependence on component longevity
```

The user can:

- Keep as Thought
- Promote to Concept
- Promote to Hypothesis
- Discard

A thought can remain a thought for years.

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
Thought → Concept → Hypothesis
                 ↘ Evidence
                 ↘ Experiment
                      → Evaluation
                           ↘ Supported → Theory → Version → New research
                           ↘ Rejected  → New hypothesis
```

A rejected hypothesis can later be resurrected. A concept can spawn ten theories. Failure is research data.

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

The opening screen should not look like a project-management dashboard. It should look like the evolution of an idea.

A workspace remembers:

- the original immutable thought
- current concepts, hypotheses, and open questions
- the evolution spine of the idea
- recent reasoning
- research maturity (thought experiment → engineering hypothesis → research program)

See [design-benchmark.md](./design-benchmark.md) for the Stationary Satellite Relays home.

## SaaS notes (provisional)

To refine later, not to implement now:

- Personal and team workspaces
- Object-level provenance and ownership
- Literature archive that can stay private to a tenant
- Modes as first-class workspace settings, not just chat prompts
- Long-term memory that outlives any single conversation
- Export / review artifacts for publication or teaching

## Non-goals for inception

- Scaffolding Angular application code
- Choosing a final backend vendor
- Building a PDF reader
- Competing with Zotero or Notion on document storage
- Overnight corpus "dream cycles" as the primary metaphor (that is closer to [REM Labs](https://remlabs.ai/research-os); our center is the human's evolving understanding)
