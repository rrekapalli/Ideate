# Open questions

Refinement list. Do not block inception on answers. Do not write application code to dodge these.

## Product

- Is **Research OS** the public name, given [REM Labs](https://remlabs.ai/research-os)? Alternatives: Idea OS, Knowledge Evolution Platform, "an operating system for thinking."
- Which persona do we design the first paid SaaS loop for: student, independent researcher, or inventor/engineer?
- How much structure is required on day one versus Explore Mode only?
- How visible should confidence numbers be to a beginner versus a researcher?
- When should the AI refuse to answer and force a question back to the user?
- Are team workspaces in v1, or is the first product single-thinker?

## Object model

- What is the smallest set of objects that still feels like Research OS? Thought, Concept, Question, Hypothesis, Assumption, Evidence, Decision, Relationship, Version may be enough.
- How do we keep epistemic tags (fact / inference / hypothesis / speculation / unknown) from becoming UI clutter?
- How are misconceptions different from abandoned hypotheses?
- Can a Theory exist before any formal evidence, or only after evaluation?
- How do we represent "I don't know yet" as a first-class, queryable state?
- What is the identity of an idea across renames, splits, and merges?

## Graph and intelligence

- How aggressive is automatic object extraction versus explicit user promotion?
- How do we prevent the graph from becoming a junk drawer of weak AI suggestions?
- What is the confidence algebra? Bayesian, heuristic, or human-set with AI deltas?
- How do retracted papers, corrected measurements, or changed personal beliefs propagate without surprising the user?
- How do we detect "you rediscovered your own abandoned idea" reliably enough to trust?
- Where does literature ingestion stop being a feature and become a Zotero clone?

## Learning

- How do we adapt traversal without locking students into a hidden curriculum?
- How do we store misconceptions without shaming the learner?
- Can the same workspace serve a class (shared concept graph) and an individual (private understanding overlay)?
- What does "practice mode" query against — the learner graph, a canonical subject graph, or both?

## Architecture and SaaS

- Angular app shell now, or stay docs-only until the first workspace UX is sketched in more detail?
- PostgreSQL + AGE versus Neo4j for the first graph?
- Tenant isolation for literature archives and idea graphs.
- What is private by default: the thought stream, the graph, or both?
- Multi-agent orchestration: real specialist agents, or one model with modes?
- Offline / local-first later, or cloud-only SaaS from the start?

## Design benchmark

- Should Stationary Satellite Relays be seeded as sample data in the first prototype?
- How much of that conversation should be pre-materialized as objects versus demonstrated live in Explore Mode?
- Is there a second benchmark (Purana knowledge, a student physics topic, or a trading hypothesis) that would falsify a design that only works for engineering speculation?

## Next refinement sessions

Suggested order:

1. Freeze a v0 object list and edge list.
2. Sketch the Angular workspace home and Explore Mode promotion flow.
3. Decide naming relative to REM Labs.
4. Pick the first persona and the first seeded workspace.
5. Only then scaffold the Angular SaaS.
