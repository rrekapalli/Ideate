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
- **Cross-workspace reuse** — abandoned projector thermal constraints appear on the wearable (`reused-in`).
- Engineer / Critique agents: implementation suggestions and assumption breaks.

## Objects emphasized

Constraint, Calculation, Target, Design Artifact, Architecture, Component, Decision, Hypothesis (feasibility), Evidence (datasheets as attachments), Experiment / Observation (bench tests).

## What this is not

- CAD or PLM
- A BOM spreadsheet as the product
- ChatGPT plus a mood board
