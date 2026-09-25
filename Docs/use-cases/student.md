# Student

**Persona:** Student (required dropdown on the workspace)  
**Detail:** [learning-mode.md](../learning-mode.md) · [personas.md](../personas.md)  
**Benchmark:** physics / satellites as a learning project — not a seeded graph

A student uses Ideate to **grow understanding**, not to finish a chapter or collect answers. Scientist-style claim-and-cite is the [Researcher](./researcher.md) lens on a different workspace.

## Job

Home asks: *What am I trying to understand, and what do I still confuse?*

Success: a visible conceptual model. Misconceptions stay as history (`object_category`), not shame and not delete-by-default.

Example workspaces: *How do satellites stay in space?*, *Throw ratio / lumens*, *Purana / ancient knowledge* as a learning project.

## Lifecycle

```text
Question → Exploration → Understanding → Challenge → Discovery
```

Not `Question → Answer`. The AI often asks: what do you think? why? what if that assumption is wrong? let’s test that.

Same OS loop as everyone else:

| Step | Student |
| --- | --- |
| Think | I wonder why… |
| Explore | Learn the concept |
| Connect | Related ideas I now see |
| Question | Why? What if I’m wrong? |
| Test | Practice, examples, thought experiments |
| Revise | Update understanding |
| Create | A better mental model |

## Understanding as a graph

Curriculum is a line of chapters. The student sees a graph: gravity, energy, motion → orbits → geostationary → *their* hypothesis. Same knowledge, different walk for beginner vs undergraduate ([learning-mode.md](../learning-mode.md)).

## Killer features

- **Misconception cards** remain queryable. The system can say you used to believe X.
- **Practice / Challenge / Learn** modes over the *learner’s* graph, not a hidden curriculum dump.
- **Personal overlay:** try “what if I’m wrong?” without rewriting the understanding on Mainstream. A class graph with a teacher merge is a later team feature, not this persona’s single-person scope.
- Jump-to-object: “show me throw ratio” pans the canvas to that id.

## Features — one person

No classmates, no shared workspace, no assignments from a teacher account. The student is the only author. The AI teaches from the graph they already built ([learning-mode.md](../learning-mode.md)).

| Feature | What it does |
| --- | --- |
| Understanding home | Current concept, open Unknowns, and misconceptions still in play. Not a chapter list |
| Learn from what I have | Explain and Learn start at cards that exist. A beginner walk and a later walk are depth on the same nodes, not a second course |
| Socratic turn | Challenge and Practice ask what they think, why, and what breaks if an assumption is wrong, before filling a gap |
| Unknown cards | “I don’t know yet” stays a node on the concept. Resolving it is promote-to-question or attach an example, not delete |
| Misconception history | Prior belief kept with `object_category: misconception` and how it changed. Queryable: “what did I used to think about orbits?” |
| Examples as evidence | A worked example attaches to the concept as Evidence tagged `example`. It is not marked fact unless they accept that |
| Practice gaps | Practice mode lists concepts with no example, hypotheses never challenged, and unknowns that block the next concept |
| Explain at another depth | Same graph, shorter or fuller body. Does not mint a parallel curriculum |
| Personal overlay | A private branch for a rival explanation. Merge back only if they accept it |
| Resume | Reopen to the last concept, the last confusion, and the transcript that produced it |
| Revision sheet | Export from the graph: what I understand, what I confuse, misconceptions I dropped, questions still open. Markdown / PDF / DOCX within credits |
| Jump and search | Display id or phrase pans to the card |

Out of this file: class Mainstream, teacher review, cohort progress, homework submission, grading.

## Objects emphasized

Thought, Concept, Unknown (“I don’t know yet”), Question, Misconception, Hypothesis (when they are ready), Evidence as examples, Evaluation in Review. Full catalog is available; persona only sets the default path.

## What this is not

- An AI tutor that completes homework
- A locked courseware player
- A cheaper ChatGPT for students as the business — weak unit economics vs [consulting](./consulting.md)
