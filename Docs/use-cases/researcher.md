# Researcher (including scientists)

**Persona:** Researcher  
**Scientist is not a separate persona or a separate product.** Claim → evidence → revision → new theory version is the same lens. Use **Review** or **Challenge** when the work is “revise the theory” more than “find the paper.”  
**Detail:** [personas.md](../personas.md) · [object-model.md](../object-model.md)

A researcher (or scientist) uses Ideate to make a **defensible claim** and keep its history. Literature is attached to nodes, not a Zotero clone.

## Job

Home asks: *Which hypothesis or theory version is live, and what supports or weakens it?*

Success: confidence (later), contradictions, citations, theory diffs, publication-style Review.

Example workspaces: a paper under revision; a theory under pressure; quantitative methods as *research* (trading research can also sit on [Analyst](./analyst.md) if the job is a decision).

## Lifecycle

| Step | Researcher / scientist |
| --- | --- |
| Think | I suspect that… / if this result is true… |
| Explore | Read the field; walk the theory graph |
| Connect | Papers ↔ claims ↔ assumptions |
| Question | What would falsify this? Which assumption is load-bearing? |
| Test | Evidence, experiments, literature, replication |
| Revise | Update hypothesis; version the theory |
| Create | A paper, claim, or theory version |

**Theory rule:** Hypothesis → Evaluation → Theory. No Theory card before Evaluation. AI proposes; the user accepts ([object-model.md](../object-model.md)).

## Killer features

- **Theory diff** — what evidence was added, which assumption died, confidence delta.
- **Contradiction inbox** — two claims cannot both be true; experiment vs last month’s assumption.
- **Abandoned ideas stay data** — “you rediscovered H-004 from an old workspace” (`reused-in`).
- **Literature agent** researches and attaches Evidence to the node being explored.
- **Review mode** as code review for thinking (missing citations, weak evidence, overconfidence).

## Satellite as research

The 1,000-year relay can start as [Explorer](./explorer.md) and *become* Researcher when speculation hardens into a claim that needs literature and evaluation. Same workspace persona can be changed, or a new workspace is created. The design benchmark is [design-benchmark.md](../design-benchmark.md).

## Objects emphasized

Hypothesis, Evidence, Experiment, Observation, Claim, Critique, Evaluation, Theory, Assumption, Relationship edges. Scientist-facing names (replication, significance) are modes and the Statistician agent, not a second dropdown.

## What this is not

- Elicit / ResearchRabbit (literature is not the center)
- A lab ELN (experiments are objects, not a wet-lab LIMS)
- “Ideate for scientists” as a fork of “Ideate for students”
