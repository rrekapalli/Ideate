# Ideate

An AI-native environment where ideas, knowledge, and understanding can be explored, connected, challenged, and continuously evolved.

Ideate is to thinking what Git is to software development. It does not just store knowledge. It stores the **evolution of knowledge**.

This repository is at **inception**. There is no application code yet. The product is a cloud **Angular 22 PWA** + Java 25 SaaS (desktop/tablet web). The working brief lives in [`Docs/`](./Docs/).

## One-sentence product

Don't just give people answers. Give them a place where their understanding can grow.

## What this is

Traditional software stores documents. Ideate stores **thinking**.

Ideas — not documents — are the primary unit of computation. Concepts, hypotheses, evidence, literature, experiments, assumptions, critiques, decisions, misconceptions, and questions are first-class graph objects. AI reasons over that graph, tracks how a theory or a student's understanding evolved, identifies contradictions, compares claims with literature, manages confidence, and versions ideas the way Git versions code.

The product name is **Ideate**. The deeper category is an **operating system for thinking**: useful to a researcher developing a theory, a student learning physics, an inventor iterating a design, or a professional exploring a decision.

The GitHub repository is [`rrekapalli/Ideate`](https://github.com/rrekapalli/Ideate). Research OS was the working title, not the app name. See [Docs/vision.md](./Docs/vision.md#naming).

## Intended stack (provisional)

| Layer | Direction |
| --- | --- |
| Client | **Angular 22 PWA** (desktop/tablet web; not Flutter; not offline-first) |
| Backend | **Java 25** |
| Graph canvas | [ngDiagram](https://www.ngdiagram.dev/) — zoomable cards and typed edges |
| Interaction | Natural language + graph workspace (not a chat skin) |
| Reasoning | Multi-agent orchestrator; routed LLMs (OpenAI, xAI, Copilot-adjacent, Ollama); usage ledger |
| Core | Research / idea graph engine |
| Persistence | PostgreSQL + Apache AGE + pgvector |
| Archive | Object store + literature archive |

## Current stage

| Status | Inception |
| --- | --- |
| Code | None by design |
| Next | Scaffold from an empty workspace; no sample projects |
| Design benchmarks | [Satellite](./Docs/design-benchmark.md) · [Prism projector](./Docs/design-benchmark-prism-projector.md) |

## Docs

- [Vision](./Docs/vision.md)
- [Product brief](./Docs/product-brief.md)
- [Personas](./Docs/personas.md)
- [Workspace UI](./Docs/workspace-ui.md)
- [Object model](./Docs/object-model.md)
- [Technology stack](./Docs/technology-stack.md)
- [Architecture](./Docs/architecture.md)
- [Java backend AI](./Docs/java-backend-ai.md)
- [Learning mode](./Docs/learning-mode.md)
- [Design benchmarks](./Docs/design-benchmarks.md)
- [Prism projector](./Docs/design-benchmark-prism-projector.md)
- [Market landscape](./Docs/market-landscape.md)
- [Use cases](./Docs/use-cases/README.md)
- [Open questions](./Docs/open-questions.md)

## Source of this brief

These documents distill a ChatGPT exploration that defined this product as an evolutionary system for human ideas and understanding, then tested that framing against a speculative thought experiment (Stationary Satellite Relays), a hardware feasibility study (Prism-Based Projector), and a student-learning use case. They are the seed for further exploration here, not a frozen specification.
