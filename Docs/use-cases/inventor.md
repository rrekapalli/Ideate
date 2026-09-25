# Inventor / engineer

**Persona:** Inventor  
**Benchmark:** [Prism-Based Projector Feasibility](../design-benchmark-prism-projector.md)  
**Also:** engineers on a hardware or systems project; later wearable display that `reused-in` projector objects

An inventor uses Ideate to **make something work** and keep why the design changed. Targets are not facts. A concept sheet is not a measurement.

## Job

Home asks: *What problem does this concept solve, and what new problems does it create?*

Success: decisions, constraints, calculation chains, versioned BOM, architecture versions that are still explainable months later.

Example workspaces: Prism-based wall projector; wearable information display; any speculative architecture that must meet physics and cost.

## Lifecycle

| Step | Inventor |
| --- | --- |
| Think | What if we built… |
| Explore | Walk constraints |
| Connect | Parts ↔ failure modes |
| Question | What problem does this solve? |
| Test | Prototype, estimate, critique |
| Revise | Change the design |
| Create | A next architecture |

Typical Prism-style turns (fit → brightness → battery → LED → DLP vs LCD → critique → revise BOM) are many `NORMAL` jobs plus occasional `DEEP` architecture review ([java-backend-ai.md](../java-backend-ai.md)).

## Killer features

- **Constraint and Calculation cards** distinct from Evidence.
- **Target ≠ fact** — 90×60 mm and “must be battery powered” stay tagged.
- **Architecture / Component / Design artifact** as versioned nodes.
- **Decision** with provenance: why Pi Zero, then why not.
- **Cross-workspace reuse** — abandoned projector thermal constraints appear on the wearable (`reused-in`). This person’s other workspaces only.
- Engineer / Critique agents: implementation suggestions and assumption breaks.

## Features — one person

One inventor. No design-review board, no shared BOM, no teammate assignments.

| Feature | What it does |
| --- | --- |
| Design home | The binding constraint or the open architecture decision. What problem this concept solves, and which new problem it creates |
| Constraint register | Size, power, cost, scope. Relax or tighten, and show which components and calculations they bind |
| Target vs measurement | A Target stays a target until an explicit act turns it into an Observation. The AI does not promote a wish into a fact |
| Calculation chain | Inputs, method, output, dependents. Recompute when an input version changes. Estimate tagged distinct from measurement |
| Architecture versions | Component set (BOM) as a versioned Architecture. Diff: part added, part dropped, why |
| Design artifact | Sketch or sheet on a card. Extract claims and link them to a region. The image is not the measurement |
| Datasheet evidence | Vendor numbers attach to the Component or Hypothesis they bear on |
| Bench note | Observation from a prototype: date, setup, result, which hypothesis or target it supports or weakens |
| Failure modes | Critique or Hypothesis on what breaks. Kept if the architecture changes |
| Decision log | Choice, alternatives, reason, evidence. “Why Pi Zero, then why not” is a version walk |
| What-if overlay | Alternate architecture in a personal branch (DLP vs LCD). Mainstream updates only on merge |
| Feasibility evaluation | Hypothesis → Evaluation before any “this works” theory |
| Reuse on the next build | `reused-in` from an older workspace of the same account (thermal constraint shows up on the wearable) |
| Design note export | Report from the graph: problem, constraints, current architecture, open targets, decisions, killed options |

Out of this file: CAD, PLM, multi-person design review, purchasing, firmware repos.

## Objects emphasized

Constraint, Calculation, Target, Design Artifact, Architecture, Component, Decision, Hypothesis (feasibility), Evidence (datasheets as attachments), Experiment / Observation (bench tests).

## What this is not

- CAD or PLM
- A BOM spreadsheet as the product
- ChatGPT plus a mood board
