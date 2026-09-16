# Personas

Personas are **lenses**, not products. Commercial stories for each lens (and consulting as a B2B vertical) live in [use-cases/](./use-cases/README.md).

The operating system, object model, and lifecycle stay the same. What changes is the **objective** the system optimizes for, the default home, and the AI's posture.

Personas are tied to a **workspace**, not to the account. The same account holder can act as different personas in different workspaces — Student on a physics inquiry, Inventor on the projector, Researcher on a paper.

A persona is **required** when a workspace is created. It is chosen from a dropdown. Nothing is pre-selected. There is **no default workspace** and no empty-workspace template waiting after signup.

**One workspace = one project.** Satellite Relays is a workspace. The prism projector is another. Learning throw ratio is a third if that is its own project.

The persona on a workspace can be changed later. Signup does not ask for a persona.

## Workspace creation

```text
Create account
  → identity only
  → no workspace, no persona

Create workspace   (explicit, per project)
  → Project name / first thought
  → Persona  (required dropdown, no default)
  → Open that workspace
```

The create form cannot be submitted until a persona is chosen. There is no implied Explorer, Student, or "General" lens.

Suggested copy:

> Which lens is this project? You must choose one.

Examples for one account — each row is its own workspace:

| Project (workspace) | Persona |
| --- | --- |
| How do satellites stay in space? | Student |
| Stationary Satellite Relays | Explorer |
| Prism-Based Projector Feasibility | Inventor |
| Throw ratio / lumens | Student |
| Wearable information display | Inventor |

If the same person later wants to treat the projector as a learning project, they create a **new** workspace (or change this one's persona). They do not get a second default home on the same project.

Personas must never fork the schema.

## Catalog

| Persona | Objective | Default question the home asks | Success |
| --- | --- | --- | --- |
| Student | Grow understanding | What am I trying to understand, and what do I still confuse? | A visible conceptual model; misconceptions kept as history |
| Researcher | Make a defensible claim and revise it | Which hypothesis or theory version is live, and what supports or weakens it? | Confidence, contradictions, citations, theory diffs, review |
| Inventor / engineer | Make something work | What problem does this concept solve, and what new problems does it create? | Decisions, constraints, calculation chains, versioned BOM, targets kept distinct from facts |
| Analyst / strategist | Choose under uncertainty | Why this decision, and what would change our mind? | Traceable reasons, replay months later |
| Explorer | Follow curiosity | What thought is growing, and what should we not pretend to know? | Open questions preserved; speculation stays tagged |

**Scientist is not a separate persona.** The workflow phases match Researcher (claim → evidence → revision → new version). Theory diffs and literature-backed claims are one lens. Use **Review** or **Challenge** mode when the work is more "revise the theory" than "find the paper."

## Same workflow, different objectives

The user's intuition is the product rule:

> The workflow could largely be the same but objectives could differ.

```text
THINK → EXPLORE → CONNECT → QUESTION → TEST → REVISE → CREATE
```

That loop does not change.

| Step | Student | Researcher | Inventor |
| --- | --- | --- | --- |
| Think | I wonder why… | I suspect that… / if this result is true… | What if we built… |
| Explore | Learn the concept | Read the field; walk the theory graph | Walk constraints |
| Connect | Related ideas I now see | Papers ↔ claims ↔ assumptions | Parts ↔ failure modes |
| Question | Why? What if I'm wrong? | What would falsify this? Which assumption is load-bearing? | What problem does this solve? |
| Test | Practice, examples, thought experiments | Evidence, experiments, literature, replication | Prototype, estimate, critique |
| Revise | Update understanding | Update hypothesis / version the theory | Change the design |
| Create | A better mental model | A paper, claim, or theory version | A next architecture |

Same objects underneath — the full catalog in [object-model.md](./object-model.md). Some names may appear as tags on a card until we fine-tune. See the [projector benchmark](./design-benchmark-prism-projector.md).

## What a persona actually changes

A persona is a **default configuration**, not a feature flag that hides the OS.

| Surface | How the persona weights it |
| --- | --- |
| Language | Continue understanding / Continue research / Continue the design |
| Home hero | Current concept or misconception vs live hypothesis vs current theory version vs open design decision |
| AI insights | Next question and challenged belief vs contradiction and missing citation vs assumption break vs new constraint |
| Default mode | Learn / Explore vs Research / Review vs Challenge vs Create |
| Review | Gaps in understanding vs publication review vs theory diff vs decision review |
| Confidence chrome | Minimal in v1 for every persona; refine while building |
| Literature rail | Sources **on this idea** (attachments). Documents tree is engagement files, not the home |
| Graph health / node counts | Never the hero. Optional later for power users |

A Student can still open Review, attach a paper, or promote a thought to a hypothesis. A Researcher can still be taught. Persona only chooses the default path through the same rooms.

## Persona versus mode

Keep these separate.

| | Persona | Mode |
| --- | --- | --- |
| Lifetime | Workspace (set at creation, changeable there) | Session or workspace posture |
| Question it answers | Why am I in *this* inquiry? | How should the AI behave right now? |
| Example | This workspace is Inventor | Challenge me for the next hour |

A Student in Challenge mode is still a student. A Researcher in Learn mode is filling a gap, not changing persona.

See [product-brief.md](./product-brief.md) for the mode list.

## Workspace is the only scope

There is no account-level persona and no separate "emphasis" layer. The workspace *is* the association.

```text
Account: you                    ← no default workspace
  ├── Project: Satellite Relays     (Explorer)
  ├── Project: Prism projector      (Inventor)
  └── Project: Geostationary orbit  (Student)
```

A later wearable-display **project** is a new workspace. It can `reused-in` the projector's objects. It chooses its own persona in its own create dropdown.

After signup, the account shows an empty project list and a **Create workspace** action. It never drops the user into a pre-made home.

## Shared team projects (Pro, after v1)

v1 is **single-thinker**. Team workspaces are a later **Pro** subscription. When they exist:

The persona belongs to the **project**, not to the people on it.

If three people join Prism-Based Projector Feasibility, they all see the **Inventor** lens. A new member does not pick their own persona on the way in. Changing the persona (workspace settings) changes it for everyone.

Members can still use different **modes** in a session (Challenge, Learn, Review). Mode is how I work right now. Persona is what this project is.

```text
Workspace: Prism projector
Persona:   Inventor          ← shared, project-level
Members:   you, Alex, Priya
           each may be in Explore / Review / Challenge
```

## What not to do

- Do not create a workspace (or assign a persona) at signup.
- Do not pre-select a persona in the create dropdown.
- Do not attach personas to the account or to a team member.
- Do not let each collaborator pick a private persona on a shared project.
- Do not put multiple projects in one workspace.
- Do not ship a Student app and a Researcher app.
- Do not hide Hypotheses from Students or hide Misconceptions from Researchers.
- Do not split Researcher and Scientist into two dropdown values. Personas are not plan tiers.
