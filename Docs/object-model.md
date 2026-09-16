# Object model

The graph is the underlying data structure. These objects are the product.

Nothing is stored only as a paragraph in a note if it can be a typed node.

## First-class objects

| Object | Role |
| --- | --- |
| Thought | Seed. May stay unstructured for years. |
| Concept | Named idea with aliases, parents, children, status |
| Question | Implicit or explicit question extracted from thinking |
| Hypothesis | Testable statement with predictions and status |
| Assumption | Dependency a theory or design rests on |
| Evidence | Paper, experiment, simulation, interview, measurement, dataset, observation |
| Experiment | Linked dataset, parameters, metrics, observations, conclusion |
| Observation | Result that can support or weaken a claim |
| Claim | Asserted statement, preferably grounded |
| Critique | Structured challenge against objects in the graph |
| Decision | Choice with reason, alternatives, owner, evidence |
| Theory | Versioned body of connected claims |
| Misconception | Prior belief that was challenged, kept as learning history |
| Relationship | Typed edge: supports, contradicts, assumes, tests, mentions, affects, led-to |
| Version | Immutable snapshot of an idea's change with who / why / delta |
| Workspace | Container for a line of inquiry |

## Concept

Example shape:

```text
Quantum Entanglement
Type:        Concept
Confidence:  0.93
Status:      Accepted
Parents:     Quantum Mechanics
Children:    Bell Inequality, Teleportation
Aliases:     EPR Correlation
```

## Hypothesis

```text
H-2187
Statement:   LLMs construct internal world models rather
             than statistical lookup tables.
Status:      Active
Confidence:  0.62
Predictions: 12
Supporting:  48
Contradictions: 9
Experiments: 15
```

Abandoned hypotheses stay in the graph:

```text
H-14
Status:  Abandoned
Reason:  Passive durability alone is insufficient
         for millennial operation.
Evidence: E-71, E-88
Led to:   H-27 Autonomous maintenance architecture
```

## Assumption

```text
A-87
Transformer attention is sufficient for reasoning.
Status:     Unverified
Used by:    42 hypotheses
Confidence: 0.54
```

If an assumption is invalidated, the system should be able to ask: which hypotheses become invalid?

## Evidence

Each evidence object is searchable and typed:

- Paper
- Experiment
- Simulation
- Interview
- Measurement
- Dataset
- Observation

A paper is not a PDF blob. It becomes a graph:

```text
Paper → Claims → Methods → Datasets → Experiments
      → Limitations → Future work
```

## Decision

```text
Decision:  Use Bayesian inference instead of frequentist testing.
Reason:    Small sample size.
Evidence:  Paper X
Owner:     Research team
Status:    Accepted
Alternative considered: ...
```

Six months later the AI can answer: "Why didn't we choose GNN?"

## Epistemic tags

Every claim-bearing object should carry an epistemic tag. Theoretical work especially must not flatten these:

| Tag | Example |
| --- | --- |
| Fact | Geostationary satellites can remain operational for decades. |
| Inference | A substantially longer lifetime may be possible through redundancy and maintenance. |
| Hypothesis | A satellite architecture could potentially operate autonomously for centuries. |
| Speculation | A sufficiently robust architecture might remain functional for ~1000 years. |
| Open question | Can electronic systems realistically survive 1000 years without physical repair? |

## Relationships

Minimum useful edge types:

- mentions
- parent-of / child-of
- supports
- contradicts / challenges
- assumes
- tested-by
- produces
- affects
- solves / introduces (failure modes, constraints)
- led-to
- version-of
- abandoned-because
- resurrected-as

## Confidence and provenance

Confidence is not a decoration. It should propagate.

If evidence with confidence 0.95 is the only support for a hypothesis, the hypothesis confidence should update. If a paper is retracted, the affected subgraph should update.

Every change records:

- who changed it
- why
- evidence added or removed
- confidence delta
- assumptions changed

You should be able to **diff a theory**.

```text
Theory v5
Added:     Evidence E213, Experiment X18
Removed:   Assumption A14
Confidence: 0.71 → 0.82
```

## Knowledge version control

Competing theories can coexist:

```text
Branch: Alternative Theory
  → Merge
  → Main Theory
```

Version spine example from the satellite benchmark:

| Version | Idea |
| --- | --- |
| v0.1 | Can a satellite remain operational for 1000 years? |
| v0.4 | Long lifetime requires redundancy rather than merely durable components. |
| v0.8 | Long-lived architecture should contain multiple independent functional layers. |
| v1.0 | A century-scale relay is conceptually plausible under specified assumptions. |
| v1.5 | Millennial-scale operation requires architectural self-maintenance rather than passive durability. |

The original thought remains immutable.

## Queries the object model must support

These are the product, not extras:

- Show every hypothesis affected by this paper.
- Which assumptions become invalid if this result is true?
- Find contradictory evidence published after 2024.
- Why did we abandon this direction?
- Why did I originally believe heavier objects fall faster?
- What problem is this new concept actually solving?
- Find every paper using contrastive learning with fewer than 500 samples.

## Conversation as an event

A conversation is not the system of record.

```text
Conversation
  → New concept
  → Graph modification
  → New question
  → Evidence
  → Changed understanding
  → Version
  → Future AI reasoning
```

The conversation becomes an event in the evolution of the user's knowledge.
