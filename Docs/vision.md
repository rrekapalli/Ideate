# Vision

## The sentence

**An AI-native environment where ideas, knowledge, and understanding can be explored, connected, challenged, and continuously evolved.**

The original intention, once articulated: **an evolutionary system for human ideas.**

Research is one mode of that system. Learning is another. Invention, strategy, and speculative thought experiments are the same loop entered at a different maturity.

## The category error to avoid

The mistake would be to build "software for researchers."

Research tools optimize literature capture. Note tools optimize document capture. Tutors optimize curriculum completion. Chat assistants optimize the next answer.

Ideate optimizes **knowledge evolution**.

| Most tools start from | Ideate starts from |
| --- | --- |
| Here are my documents. Help me understand them. | Here is what I am trying to understand. Help me develop that understanding over time. |
| Here is the literature. Help me discover papers. | Here is a thought. Help it become a concept, a hypothesis, evidence, and maybe a theory. |
| Teach me this subject. | Walk the graph of what I already understand, then grow it. |
| Here is my knowledge. Help me organize it. | Here is how my thinking changed, and why. |

## Git for thinking

Ideate is to thinking what Git is to software development.

Git does not tell programmers what code to write. It provides an environment in which code can evolve: create, branch, experiment, compare, revise, merge, abandon, resurrect, version.

Idea OS should not tell humans what to think. It should provide an environment in which thinking can evolve.

That applies equally to:

- a 15-year-old learning orbital mechanics
- a scientist developing a theory
- an inventor iterating a design
- a professional reconstructing why a decision was rejected
- a consulting team keeping the reasoning behind a recommendation ([use-cases/consulting.md](./use-cases/consulting.md))

## Ideas as the unit of computation

Traditional software stores:

```text
Research Paper
    ↓
Paragraphs
    ↓
Text
```

Ideate stores:

```text
Thought → Concept → Hypothesis → Evidence / Experiment
                → Assumption → Critique → Decision → Theory
                → Question → Misconception → Relationship
```

Every one of these is a first-class object. AI reasons over the graph instead of isolated text.

## What makes it different

Most existing tools optimize knowledge **capture**. Ideate optimizes knowledge **evolution**.

Defining characteristics:

- **Object-centric** rather than document-centric
- **Graph-native** rather than folder-based
- **Version-controlled** rather than snapshot-based
- **AI-collaborative** rather than AI-assisted
- **Evidence-aware** rather than note-aware
- **Provenance-first** — every claim, decision, and conclusion has a traceable origin
- **Continuously self-critiquing** — contradiction detection, confidence propagation, literature comparison
- **Epistemically honest** — facts, inferences, hypotheses, speculation, and unknowns stay distinct
- **Failure-preserving** — abandoned ideas remain research data

## The four layers of the product

```text
HUMAN THINKER
Student / Researcher / Inventor / Professional
        ↓
AI COLLABORATOR
Teach • Question • Critique • Research • Connect • Guide
        ↓
IDEA GRAPH
Concepts • Questions • Evidence • Hypotheses
Experiments • Knowledge • Decisions • Understanding
        ↓
EVOLUTION
Version • History • Growth • Contradictions • Discovery
```

The graph is the data structure. AI is the reasoning layer. Versioning is the historical layer. Evidence is the epistemic layer. The workspace is the environment in which an idea grows.

## Why a thought experiment is first-class

A speculative question such as "Could we build a satellite relay that lasts 1,000 years?" is not a second-class citizen because it lacks published evidence.

It enters as a **Thought**, accumulates concepts and assumptions, branches into hypotheses, encounters evidence, gets criticized, changes versions, and may become a serious research proposition — or a dead end.

The dead end remains valuable because it records how understanding evolved.

A product concept such as "Can a card-sized battery projector throw a useful slide onto a wall?" is the same kind of seed: constraints, calculations, a BOM, and a concept sheet that must not be treated as measured fact.

Those two workspaces are the design pair. See [design-benchmarks.md](./design-benchmarks.md).

## Naming

**Ideate** is the working product name.

Research OS was the inception label. It is too narrow (this is not only for researchers) and collides with [REM Labs' Research OS](https://remlabs.ai/research-os). The GitHub repo may stay `ResearchOS` for now; the app is Ideate.

Other names can still be considered later. For product copy, UI chrome, and docs, use **Ideate**.
