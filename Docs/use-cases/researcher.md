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

## Features — one person

One researcher, one workspace. Co-authors, lab notebooks shared with a group, and advisor sign-off are team features and stay out.

| Feature | What it does |
| --- | --- |
| Live hypothesis home | Which hypothesis or theory version is current, what supports it, what weakens it |
| Falsify | From a Hypothesis: what observation would kill it, stored as a Question or Experiment intent |
| Literature on the node | Research mode finds and attaches sources to the card being explored. Claims extract onto that node. No separate library |
| Source fields | Evidence keeps type (paper, dataset, experiment, note), date, and citation text. Retract or supersede without deleting history |
| Epistemic tags | Fact, inference, estimate, speculation stay on the footer so a draft cannot flatten them |
| Evaluation gate | Theory appears only after an Evaluation the researcher accepts. Rejection abandons the hypothesis and may propose the next one |
| Theory diff | Version-to-version: evidence added, assumption removed, claim changed |
| Contradiction inbox | `contradicts` edges and Problems. The researcher resolves them; nothing auto-picks a winner |
| Experiment and observation | Protocol intent, result, and whether it supported or weakened the hypothesis. Not a wet-lab LIMS |
| Assumption break | Which claims fall if this assumption is false |
| Load-bearing list | Assumptions and single sources that the live theory depends on |
| Review before writing | Missing citation, weak evidence, overclaim versus Evaluation outcome, unknowns the conclusion still uses |
| Abandoned and reused | Killed hypotheses stay. A later workspace can `reused-in` a card from this person’s other project |
| Personal overlay | A rival theory in a branch. Mainstream changes only on explicit merge |
| Paper draft | Report export from the graph only: question, established points with display ids, reasoning, dropped lines, still open. MD / PDF / DOCX |
| Jump and search | Id, claim text, or source title |

Out of this file: shared lab, co-author comments, advisor queue, journal submission systems, reference-manager sync as the product.

## Satellite as research

The 1,000-year relay can start as [Explorer](./explorer.md) and *become* Researcher when speculation hardens into a claim that needs literature and evaluation. Same workspace persona can be changed, or a new workspace is created. The design benchmark is [design-benchmark.md](../design-benchmark.md).

## Objects emphasized

Hypothesis, Evidence, Experiment, Observation, Claim, Critique, Evaluation, Theory, Assumption, Relationship edges. Scientist-facing names (replication, significance) are modes and the Statistician agent, not a second dropdown.

## What this is not

- Elicit / ResearchRabbit (literature is not the center)
- A lab ELN (experiments are objects, not a wet-lab LIMS)
- “Ideate for scientists” as a fork of “Ideate for students”
