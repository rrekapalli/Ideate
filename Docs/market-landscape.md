# Market landscape

There are many pieces of this idea in the market. There is not a mature mainstream SaaS that puts the entire loop — **evolving human understanding** — at the center.

The missing object is the person's evolving understanding: what they currently believe, why they believe it, what they abandoned, and what should change next.

## Adjacent products

| Product / category | What it does well | What is missing relative to this idea |
| --- | --- | --- |
| [ResearchRabbit](https://www.researchrabbit.ai/) | Maps papers, authors, and exploration | Literature-centric, not a personal idea/reasoning system |
| [Elicit](https://elicit.com/) | Literature search, paper analysis, evidence extraction | User hypotheses/theories are not the persistent center |
| [Litmaps](https://www.litmaps.com/) | Citation and literature maps | Literature graph, not human-understanding graph |
| [NotebookLM](https://notebooklm.google/) | Source-grounded reasoning over a notebook | Document/source-centric |
| [Obsidian](https://obsidian.md/) | Personal linked notes | User must construct structure; AI does not manage evolving hypotheses/evidence |
| [Notion](https://www.notion.so/) | Documents, databases, AI, collaboration | Workspace/document-centric, not epistemic |
| AI tutors / knowledge-tracing systems | Personalized learning along a curriculum | Usually exercise-centric, not open-ended idea evolution |
| [Constructor Hypothesis](https://constructor.tech/products/hypothesis) | Paper/claim/method/contradiction graph; grounded hypotheses and test plans | Strong literature graph; not a long-lived personal understanding OS for students and speculative thought |
| [REM Labs Research OS](https://remlabs.ai/research-os) | Persistent literature memory, contradiction detection, hypothesis evolution across overnight "dream" cycles | Corpus/memory-centric; different product. Our app name is **Ideate**. |
| [EviGraph](https://arxiv.org/html/2608.04738v1) (2026 research) | Typed Problem–Gap–Hypothesis–Experiment–Finding–Claim graph as agent state | Autonomous research-agent framework, not a multi-persona learning/idea SaaS |

Four familiar starting points:

- NotebookLM: here are my documents; help me understand them.
- ResearchRabbit: here is the literature; help me discover connections.
- An AI tutor: teach me this subject.
- Obsidian: here is my knowledge; help me organize it.

This product: **here is what I am trying to understand; help me develop my understanding over time.**

## Three markets converging

```text
             RESEARCH
          Literature / papers
                  │
                  ▼
         ┌─────────────────┐
         │   THIS PRODUCT  │
         │ Idea evolution  │
         └─────────────────┘
            ▲           ▲
            │           │
        LEARNING     KNOWLEDGE
        Student KG   MANAGEMENT / PKM
```

- Research tools have evidence but weakly model the person's evolving thinking.
- Learning platforms have learner models but usually constrain learning to predefined curricula.
- Knowledge-management tools have personal knowledge but usually do not reason deeply about its evolution.

The opportunity is at the intersection.

## Adjacent name: REM Labs Research OS

[REM Labs Research OS](https://remlabs.ai/research-os) is a persistent research brain for papers: synthesis, citation graphs, contradiction flags, and hypothesis evolution across overnight consolidation cycles.

It is closer than NotebookLM or Obsidian on "hypothesis evolution" and "contradiction." It is still a different center of gravity. Our product name is **Ideate**, which also avoids this collision.

| REM Labs Research OS | Ideate |
| --- | --- |
| Starts from a corpus of papers | Starts from a human thought or question |
| Overnight dream-cycle consolidation | Live workspace where a person thinks |
| Memory/API product for knowledge workers | Angular SaaS for evolving understanding, including students |
| Hypothesis evolution as audit of what the agent concluded | Git-like versioning of the user's own ideas, including failures and misconceptions |

## Academic signal (2026)

The research community is moving toward pieces of this architecture:

- LLM + concept graphs that extract concepts from literature and suggest future directions ([Nature Machine Intelligence](https://www.nature.com/), 2026 landscape as discussed in the source conversation).
- Systems such as MAKES-QA that dynamically construct and enrich knowledge graphs from literature, with authors noting that graphs are often treated as static artifacts.
- Reviews of scholarly knowledge graphs still find most work focused on paper-to-paper links rather than rich internal semantics of a paper.
- Education research on dynamic learner knowledge states and individualized paths, plus KG + generative feedback.

Those systems generally start from "how do we optimize learning?" or "how do we optimize literature review?" This concept starts from **how a human's understanding evolves.**

EviGraph (2026) is the closest research prototype on the *agent* side: the evidence graph is operational state, not a post-hoc record, and repairs propagate through a typed claim–evidence structure. That validates the graph-as-state bet. It does not replace a human-centered Idea OS.

## The architectural difference

Most AI products:

```text
Conversation → Answer → Conversation ends
```

This product:

```text
Conversation → New concept → Graph change → New question
  → Evidence → Changed understanding → Version → Future reasoning
```

The conversation is an event. The graph is the system of record.

## Working category description

Not: AI research assistant  
Not: knowledge management system  
Not: AI tutor  
Not: research notebook  

**AI-native system for evolving human understanding.**

The genuinely novel product is not a better place to store research. It is a system that remembers how you came to understand something, knows what you currently believe, knows why you believe it, exposes gaps and contradictions, and helps you evolve that understanding further.
