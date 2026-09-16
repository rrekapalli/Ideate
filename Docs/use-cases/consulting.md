# Consulting / professional services

**Vertical:** enterprise B2B (Deloitte, PwC, KPMG, EY, BCG, McKinsey, and peers)  
**Lens today:** [Analyst](./analyst.md) on the engagement workspace  
**Later:** optional **Consultant** dropdown value if Client / Engagement objects become first-class — same schema, not a second product  
**Engine:** [object-model.md](../object-model.md) + [java-backend-ai.md](../java-backend-ai.md)  
**vs firm platforms:** [big-four-comparison.md](./big-four-comparison.md)

Business consulting is one of the strongest enterprise uses of Ideate. An engagement is the Idea Evolution loop applied to a client problem.

Firms already describe adjacent problems: Deloitte (knowledge management + GenAI), PwC One (expertise + methodologies + agents), BCG (human–AI workflows and enterprise knowledge), McKinsey (knowledge + learning + coaching as AI changes how expertise develops). Differentiation is **not** “our AI writes better decks.” It is a **persistent reasoning layer** so the firm’s hypotheses, evidence, and recommendations compound instead of resetting when the engagement ends.

## Lifecycle

```text
Question → hypotheses → research → evidence → analysis
  → challenge → recommendation → decision → implementation → learning
```

That is the product loop. Today the firm usually produces a linear pile:

```text
Client data → interviews → research → analysis → hypotheses
  → workstreams → slides → recommendation → final deck
```

Ideate turns the same work into a living engagement graph.

## Engagement graph

Client: *Why has our profitability declined despite revenue growth?*

```text
                    CLIENT PROBLEM
                    Profitability decline
                         │
          ┌──────────────┼──────────────┐
          ▼              ▼              ▼
      Revenue          Costs        Market
       theory          theory       theory
          │              │              │
       H-001           H-002          H-003
          │              │              │
       Evidence        Evidence       Evidence
          │              │              │
       Analysis        Analysis       Analysis
          └──────────────┼──────────────┘
                         ▼
                     Synthesis
                         │
                    Recommendation
                         │
                      Decision
                         │
                   Implementation
                         │
                       Result → new learning
```

That is closer to how a senior consultant thinks than a document repository.

## Killer feature: reasoning behind the recommendation

Six months later the client asks why the firm said *close 12 underperforming stores*. A SharePoint archive has the deck, models, and transcripts. Ideate should answer from objects:

- Recommendation originated from hypothesis **H-17** on 4 March.
- First support: store-level margin, footfall, lease cost, competitor density.
- 11 March: customer interviews **weakened** H-17.
- 16 March: revised analysis — lease economics, not footfall, explained most of the variance.
- H-17 revised to **H-17.2**.
- Final recommendation rests on H-17.2 and evidence **E-43, E-51, E-62**.

That is institutional reasoning memory. Provenance and versions already exist in the object model.

## Firm knowledge graph (Pro / later)

```text
                 CONSULTING FIRM
                       │
        ┌──────────────┼──────────────┐
      Client A       Client B       Client C
        │              │              │
     Strategy       Operations       M&A
        └──────────────┼──────────────┘
                       │
                CONSULTING KNOWLEDGE GRAPH
                       │
        ┌──────────────┼──────────────┐
     Methods        Industry        Patterns
     & frameworks   knowledge       & insights
```

The firm retains **how consultants reasoned**, not only the files they left behind.

**Non-negotiable:** Client A’s knowledge must never leak into Client B’s reasoning. Cross-engagement “have we seen this in European retail?” is an **explicit, permissioned** graph query — never silent RAG across matters.

## Project continuity

Teams change. Partners leave. A new team asks *what do we already know about this client?* The system reconstructs the evolution: historical problems, hypotheses, recommendations, evidence, decisions, outcomes, what worked and failed. Not a keyword search over 147 documents.

This matches the professional-services pain of reconstructing client context at the start of every new engagement.

## Junior-consultant workflow

Instead of “read these 147 documents and this 200-slide deck”:

```text
Client: AutomotiveCo
Current understanding   Revenue ↑  Margin ↓  Share →
Hypotheses              H-17 pricing (med)  H-21 mix (high)  H-24 distribution (low)
Evidence                12 sources
Contradictions          3
Unresolved questions    7
This week               4 hypotheses revised
Next investigation      Distribution-cost variance by region
```

An AI mentor over the engagement graph. Teacher / Explore modes; Analyst (or later Consultant) persona.

## Consulting objects (weights, not a fork)

Same catalog. These names are the ones a partner will look for. Some start as existing types or tags until the model is extended.

| Consulting name | Maps toward |
| --- | --- |
| Client | Workspace metadata / later first-class (tenant-scoped) |
| Engagement | **Workspace** (one project) |
| Problem | Thought / Concept |
| Question, Hypothesis, Assumption, Evidence | Existing |
| Analysis, Insight | Evaluation / Claim / tags |
| Interview, Data source | Evidence + attachments |
| Recommendation | Decision (proposed) |
| Client decision, Action | Decision |
| Risk, Dependency | Constraint / tags |
| Outcome | Observation / Evaluation after implementation |
| Slide / deck | **Downstream artifact** of nodes, not the store |

```text
Problem → Hypothesis → Evidence → Analysis → Insight
  → Recommendation → Client decision → Outcome
```

**PowerPoint is a view.** “Update slide 17 — price elasticity assumption changed” walks the hypothesis, evidence, and analysis that produced that slide. Architecture: graph → analysis → recommendation → deck — not PowerPoint + Excel + SharePoint + ChatGPT as the system of record.

## Enterprise requirements (consulting vs consumer)

Consumer v1 can wait. A Big Four / MBB tenant cannot. Factor these into the Java API and Postgres tenancy before a firm pilot — see also [open-questions.md](../open-questions.md) (tenant isolation).

- Strict tenant isolation; client- and matter/engagement-level boundaries
- SSO / SAML / OIDC; RBAC / ABAC
- Encryption in transit and at rest; customer-managed keys
- Audit logs; immutable provenance
- Data residency; configurable retention; legal hold
- Export / delete (client offboarding)
- No provider training on customer data
- Approved-model policies and routing controls ([java-backend-ai.md](../java-backend-ai.md))
- PII / secret detection; document-level permissions
- Source citations; human approval for canonical (“firm brain”) writes
- Cost predictability and inference transparency

Deloitte-style Open Model Engineering concerns (sovereignty, IP, model behavior) are product requirements here, not marketing.

## Firm brain (later)

After many engagements, ask: *have we seen a similar transformation problem in European retail?* Find prior work where **problem, constraints, hypotheses, and outcomes** resemble this one — graph reasoning, not “documents containing retail transformation.”

Flywheel: each engagement adds problem → hypothesis → evidence → analysis → outcome → firm knowledge. Engagement #10,000 is an asset if isolation and permissions hold.

## How to talk to a firm

Do not lead with “AI research assistant.” They already have GenAI practices.

Lead with: **a persistent reasoning layer for professional services** — how an engagement’s hypotheses, evidence, assumptions, analyses, and recommendations evolve, so knowledge compounds when the team or the project ends.

Demonstrate on **one real case**. Monetization: enterprise contract, not student ₹199–999/month. Consulting may be the stronger first B2B path.

## What this is not

- A better slide generator
- A SharePoint replacement (Documents is a **link tree** for this engagement; SharePoint keeps the files)
- Silent cross-client training data
- A separate Ideate Consulting binary
