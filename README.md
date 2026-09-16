# Research OS

An AI-native environment where ideas, knowledge, and understanding can be explored, connected, challenged, and continuously evolved.

Research OS is to scientific thinking what Git is to software development. It does not just store knowledge. It stores the **evolution of knowledge**.

This repository is at **inception**. There is no application code yet. The product is being shaped as a web-based Angular SaaS. The working brief, object model, architecture sketch, market notes, and first design benchmark live in [`Docs/`](./Docs/).

## One-sentence product

Don't just give people answers. Give them a place where their understanding can grow.

## What this is

Traditional software stores documents. Research OS stores **thinking**.

Ideas — not documents — are the primary unit of computation. Concepts, hypotheses, evidence, literature, experiments, assumptions, critiques, decisions, misconceptions, and questions are first-class graph objects. AI reasons over that graph, tracks how a theory or a student's understanding evolved, identifies contradictions, compares claims with literature, manages confidence, and versions ideas the way Git versions code.

The public name is **Research OS**. Internally, the deeper category is an **operating system for thinking**: useful to a researcher developing a theory, a student learning physics, an inventor iterating a design, or a professional exploring a decision.

## Intended stack (provisional)

| Layer | Direction |
| --- | --- |
| Client | Angular web SaaS |
| Interaction | Natural language + graph workspace |
| Reasoning | Multi-agent collaborator (literature, critique, statistician, synthesizer, Socratic teacher) |
| Core | Research / idea graph engine |
| Persistence | PostgreSQL + Apache AGE or Neo4j + pgvector |
| Archive | Object store + literature archive |

## Current stage

| Status | Inception |
| --- | --- |
| Code | None by design |
| Next | Refine the object model, epistemic categories, and first workspace UX |
| Design benchmark | [Stationary Satellite Relays](./Docs/design-benchmark.md) |

## Docs

- [Vision](./Docs/vision.md)
- [Product brief](./Docs/product-brief.md)
- [Object model](./Docs/object-model.md)
- [Architecture](./Docs/architecture.md)
- [Learning mode](./Docs/learning-mode.md)
- [Design benchmark](./Docs/design-benchmark.md)
- [Market landscape](./Docs/market-landscape.md)
- [Open questions](./Docs/open-questions.md)

## Source of this brief

These documents distill a ChatGPT exploration that defined Research OS as an evolutionary system for human ideas and understanding, then tested that framing against a speculative engineering thought experiment and a student-learning use case. They are the seed for further exploration here, not a frozen specification.
