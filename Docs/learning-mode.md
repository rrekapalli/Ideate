# Learning mode

Research OS is not only for researchers. It should serve as a **learning agent** on any topic: a place for a student to explore and enhance understanding, not consume a chapter.

A 15-year-old learning physics and a scientist developing a theory are doing different things. The underlying process is similar.

## The educational mistake

Today's educational AI mostly behaves like:

```text
Question → Answer
```

Research OS should behave like:

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

Research OS:

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

## Same OS, different modes

| Role | Loop |
| --- | --- |
| Student | Topic → Learn → Question → Explore → Understand |
| Explorer | Thought → Hypothesis → Research → Critique → Theory |
| Scientist | Theory → Evidence → Experiment → Result → Revision |
| Inventor | Idea → Design → Prototype → Failure → Iteration |

Same operating system. Different entry modes.
