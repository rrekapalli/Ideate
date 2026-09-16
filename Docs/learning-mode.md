# Learning mode

Ideate is not only for researchers. It should serve as a **learning agent** on any topic: a place for a student to explore and enhance understanding, not consume a chapter.

Student is a **persona** on a workspace, chosen from the required dropdown when that **project** is created. The account has no persona and no default workspace. A learning project and an invention project are two workspaces. See [personas.md](./personas.md).

A 15-year-old learning physics and a scientist developing a theory are doing different things. The underlying process is similar.

## The educational mistake

Today's educational AI mostly behaves like:

```text
Question → Answer
```

Ideate should behave like:

```text
Question → Exploration → Understanding → Challenge → Discovery
```

The AI should not always give the answer. Sometimes it should ask:

- What do you think?
- Why?
- What would happen if your assumption were wrong?
- Let's test that.

That is active learning.

## Learning as a graph

A traditional educational system:

```text
Chapter 1 → Chapter 2 → Chapter 3 → Exam
```

Ideate:

```text
                         PHYSICS
                            │
             ┌──────────────┼──────────────┐
             │              │              │
          Gravity         Energy         Motion
             │              │              │
          Orbits         Radiation      Velocity
             │              │              │
             └───────┬──────┴──────┬───────┘
                     │             │
                 Satellites      Rockets
                     │
                Geostationary
                     │
                Relay systems
                     │
              YOUR HYPOTHESIS
```

The learner can see their understanding forming.

## Same graph, different traversal

Two people ask: "Explain general relativity."

| Beginner | Undergraduate | Researcher |
| --- | --- | --- |
| Mass | Manifold | GR |
| Gravity | Metric tensor | Quantum gravity problem |
| Space | Geodesics | Candidate approaches |
| Time | Einstein field equations | Literature |
| Spacetime | Stress-energy tensor | Open problems |
| Curvature | | |

Same knowledge graph. Different walk. The AI starts from what the person already understands.

## Conversations are one investigation

Monday: What is momentum?  
Wednesday: Why is momentum conserved?  
Thursday: What happens if an object explodes?  
Friday: Does this apply to rockets?

These are not four independent chats. They are one evolving investigation.

Months later: "Teach me rocket propulsion." The AI starts from the student's actual graph, not from zero.

## Misconceptions are first-class

If a student believes heavier objects fall faster, the system does not only correct them. It stores:

```text
MISCONCEPTION M-17
"Heavier objects fall faster."
Status:  Challenged
Evidence: Galileo experiments, Newtonian mechanics
Related:  Gravitational acceleration
```

Months later the student can ask: "Why did I originally think heavy objects fall faster?" The system can explain the evolution of their understanding.

That is **learning history**, not chat history.

## Student path on the satellite example

A student starts with: "How do satellites stay in space?"

The system should not dump a 2,000-word answer.

```text
Question
  → What do you already know?
  → Orbital motion
  → Gravity
  → Velocity
  → Geostationary orbit
  → Why does it appear stationary?
  → What limits satellite lifetime?
  → Could a satellite last 100 years?
  → What would have to change?
  → Could it last 1,000 years?
```

Then the student asks: "What if we put all the electronics inside a giant sphere?"

Instead of "That's not how satellites work," the system treats it as a hypothesis and investigates what the sphere solves and what it creates.

The student is doing research without being told they are doing research.

## Learner epistemic states

```text
                    USER UNDERSTANDING
                           │
           ┌───────────────┼───────────────┐
           │               │               │
       Established      Supported        Uncertain
         Knowledge       Inference       Hypothesis
           │               │               │
         Source          Reasoning       Exploration
```

This is the same epistemic honesty as research mode. Students need it more, not less.

## Clone and overlay (both in v1)

v1 includes **both**. They are different operations.

| | Clone | Overlay |
| --- | --- | --- |
| What it is | New workspace from a snapshot | A **branch** on a living workspace |
| Stays attached? | No. Later template edits do not flow in | Yes. Mainstream changes notify (listed objects) |
| Privacy | Whole copy is a private project | Overlay branch is private; mainstream is the shared/canonical graph |
| When | I want my own project that can diverge | I want my layer on the same living graph |

**How to specify mainstream vs overlay:** a branch has a required **`branch_role`**, chosen from a dropdown at branch creation. Nothing is pre-selected (same rule as persona).

```text
Create branch
  → Name
  → Role  [ Mainstream | Overlay ]   ← required, no default
  → If Overlay: parent = this workspace's Mainstream
```

Rules:

- A workspace has **exactly one Mainstream** branch. Created with the workspace (the project’s canonical graph).
- Any number of **Overlay** branches. Each must point at that Mainstream.
- Cards live on a branch. Overlay cards may `overlay-on` a Mainstream card id (my misconception on Concept C-010).
- Overlay never writes Mainstream unless the user **explicitly promotes / merges**.
- Clone copies the Mainstream (and optionally the cloner’s own overlays) into a new workspace, which gets its own new Mainstream.

```text
Workspace: Orbits
  Branch main          branch_role: mainstream
  Branch you           branch_role: overlay   (private)
  Branch priya         branch_role: overlay   (private)
```

Single-thinker (v1) still uses overlay: your official projector architecture is Mainstream; a wild thermal idea is an Overlay branch you can delete or later merge.

| Persona | Overlay on Mainstream |
| --- | --- |
| Student | Misconceptions and unknowns on the class/template graph |
| Researcher | Personal hypotheses on a shared or personal theory graph |
| Inventor | Design variants on the architecture you treat as official |
| Analyst | Private framing on the evidence you treat as official |
| Explorer | Speculation beside the published thought experiment |

Use **clone** when the copy should become its own project. Use **overlay** when you stay on one project and need a private or experimental layer.

## Same OS, different modes

| Role | Loop | Design example (not shipped) |
| --- | --- | --- |
| Student | Topic → Learn → Question → Explore → Understand | How do satellites stay in space? / What is throw ratio? |
| Explorer | Thought → Hypothesis → Research → Critique → Theory | Stationary Satellite Relays |
| Researcher | Hypothesis / theory → Evidence → Experiment → Result → Revision | Satellite lifetime under assumptions |
| Inventor | Idea → Design → Prototype → Failure → Iteration | [Prism-Based Projector](./design-benchmark-prism-projector.md) |

Same operating system. Different entry modes.
