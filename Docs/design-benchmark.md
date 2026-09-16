# Design benchmark: Stationary Satellite Relays

This thought experiment is a **design reference**, not a shipped sample. The product starts empty. The Inventor / hardware twin is [Prism-Based Projector Feasibility](./design-benchmark-prism-projector.md). Together they are the pair in [design-benchmarks.md](./design-benchmarks.md).

It is not a conventional research project. It starts as speculation and can become a structured theory, an engineering problem, and maybe a research program. If Ideate cannot represent this without flattening it into notes or a chatbot summary, the product is not itself yet.

## Workspace

| Field | Value |
| --- | --- |
| Project | Stationary Satellite Relays |
| Type | Theoretical / exploratory |
| Status | Open-ended exploration |
| Maturity | Thought experiment → evolving engineering hypothesis |
| Mode | Human + AI exploration |
| Evidence policy | Separate established facts from assumptions, estimates, and speculation |

## Workspace home

Not a project-management dashboard. Something closer to:

```text
Stationary Satellite Relays                         ● Exploring

"Can extremely long-lived, stationary relay nodes be designed
 using physically plausible technologies?"

 Core Concept 1    Hypotheses 14    Open Questions 37

 EVOLUTION OF IDEA
 Thought Experiment → Stationary Relay → Multi-decade lifetime
   → 1000-year architecture → Spherical protected node
   → [current exploration]

 Recent reasoning
  • Can current technology support 1000-year operation?
  • What components actually determine lifetime?
  • Can the architecture survive deliberate attack?
  • Could a spherical node protect internal instruments?
```

The workspace remembers the evolution of the idea, not merely the final answer.

## The original thought stays immutable

```text
Concept C-001
Stationary Satellite Relay

Explore whether a satellite-based communications relay could be
engineered to remain operational for extremely long periods,
potentially centuries or even ~1000 years, using currently
conceivable technologies.

Origin:          Thought experiment
Evidence status: Unvalidated
Confidence:      Exploratory
Version:         v0.1
```

The original conversation is not converted into a summary. It is converted into a **research space**.

### Questions the AI should extract

- Q001 What does "stationary" mean physically?
- Q002 What orbital or mechanical configuration is required?
- Q003 What limits satellite lifetime?
- Q004 Can existing materials survive centuries?
- Q005 What happens to power systems?
- Q006 Can electronics survive for centuries?
- Q007 Can radiation damage be mitigated?
- Q008 Can the system repair itself?
- Q009 Can it survive deliberate attack?
- Q010 Could it survive war?
- Q011 Could it survive 1000 years?
- Q012 What physical size would such a node require?
- Q013 Could a spherical pressure-vessel-like architecture protect internal systems?

## Approximate graph

```text
                         STATIONARY RELAY
                                │
                ┌───────────────┼────────────────┐
                │               │                │
             Orbit           Lifetime          Threats
                │               │                │
          Geostationary      30 years         Radiation
          Lagrange?          100 years         Debris
          Other              1000 years        War
                │               │                │
                │          ┌────┴─────┐          │
                │          │          │          │
             Dynamics    Power     Electronics  Armor
                           │          │          │
                         Solar     Radiation   Redundancy
                         Nuclear   Aging       Repair
                           │          │          │
                           └────┬─────┴──────────┘
                                │
                        LONG-LIVED NODE
                                │
                         Spherical Architecture
                                │
                   ┌────────────┼─────────────┐
                   │            │             │
               Outer Shell   Internal       Apertures
                              Systems
```

## Facts must stay separate from speculation

| Tag | Statement |
| --- | --- |
| Fact | Geostationary satellites can remain operational for decades. |
| Inference | A substantially longer lifetime may be possible through redundancy and maintenance. |
| Hypothesis | A satellite architecture could potentially operate autonomously for centuries. |
| Speculation | A sufficiently robust architecture might remain functional for ~1000 years. |
| Open question | Can electronic systems realistically survive 1000 years without physical repair? |

Never collapse those five into one AI answer. This distinction may become one of the product's strongest characteristics.

## The 1000-year question is a branch

```text
Stationary Relay
  ├── Normal satellite
  ├── 30–50 year architecture
  ├── 100+ year architecture
  └── 1000-year architecture
        ├── Passive durability
        ├── Redundancy
        ├── Autonomous repair
        ├── Replaceable modules
        ├── Radiation tolerance
        └── Protected architecture
```

Conventional note-taking tools are bad at this branching.

## Spherical node as a later concept

```text
Concept C-017
Spherical Long-Life Relay Node

Parent:     Long-Lived Satellite
Motivation: Protect internal systems from environmental
            and potentially hostile external conditions.
```

Architecture sketch:

```text
       ┌─────────────────────┐
      /                       \
     /     PROTECTIVE SHELL    \
    |                           |
    |    ┌───────────────┐      |
    |    │ Electronics   │      |
    |    │ Power         │      |
    |    │ Control       │      |
    |    │ Communications│      |
    |    └───────────────┘      |
     \            ○            /
      \_______________________/

              ○ = aperture
```

Ideate should ask: **what problem is this concept actually solving?**

```text
Spherical Node
  ├── reduces exposure to → radiation
  ├── reduces exposure to → debris
  ├── potentially improves → structural redundancy
  ├── constrains → antenna geometry
  ├── introduces → thermal-management problem
  └── introduces → aperture vulnerability
```

That is more useful than storing a sketch.

## Critic inspects the graph

"Critique my 1000-year satellite idea" should not produce a generic essay.

```text
AI RESEARCH REVIEW

Your current architecture depends on:
A-12  Long-term power generation
A-18  Radiation-tolerant electronics
A-23  Autonomous fault recovery
A-31  Structural longevity
A-42  Communication hardware longevity

Potential bottlenecks:
HIGH     Electronic component degradation
HIGH     Thermal-cycle fatigue
MEDIUM   Power-generation degradation
MEDIUM   Radiation environment
UNKNOWN  Autonomous repair over centuries

Three assumptions have not yet been experimentally
or theoretically justified.
```

## Literature attaches to objects

When papers on satellite reliability, radiation-hard electronics, nuclear power, materials, debris, robotics, and fault-tolerant computing are added:

```text
Paper P123 ──supports──→ H18
Paper P431 ──challenges──→ H18
Paper P872 ──introduces──→ Concept C41
Concept C41 ──potentially solves──→ Failure Mode F12
```

The thought experiment becomes a living research program.

## Failed ideas stay valuable

Normal knowledge systems encourage deleting old drafts. Ideate should encourage:

```text
Idea → Hypothesis → Experiment → Failure → Revision → New hypothesis
```

The failure is research data.

## Why this benchmark matters

After applying the product to this workspace, the fundamental abstraction is not "knowledge graph + AI."

It is:

**An evolutionary system for human ideas.**

The graph is the data structure. AI is the reasoning layer. Versioning is the historical layer. Evidence is the epistemic layer. The workspace is the environment in which an idea evolves.

Use this workspace as the design benchmark for Ideate until a better one appears.
