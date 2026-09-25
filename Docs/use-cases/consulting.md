# Consulting / professional services

**Vertical:** enterprise B2B (Deloitte, PwC, KPMG, EY, BCG, McKinsey, and peers)  
**Lens today:** [Analyst](./analyst.md) on the engagement workspace  
**Later:** optional **Consultant** dropdown value if Client / Engagement objects become first-class — same schema, not a second product  
**Engine:** [object-model.md](../object-model.md) + [java-backend-ai.md](../java-backend-ai.md)  
**vs firm platforms:** [big-four-comparison.md](./big-four-comparison.md)  
**Feature catalog (research, observations, collaboration, reports):** [consulting-engagement-features.md](./consulting-engagement-features.md)

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

## Firm knowledge graph (Enterprise / later)

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

## Benefits for the delivery team

The benefit is not a shorter SOW on day one. It is less wasted senior time, faster ramp for the people who join mid-case, and fewer client conversations that start from a deck nobody can defend. Productivity shows up as hours returned to analysis. Cost shows up as leverage: the same partner and manager cover the case without another week of reconstruction. Quality shows up when a recommendation can still be explained after the team has rolled off.

These are directional, for a case that actually lives in the graph. They are not a promised percent saving.

| Where time goes today | What changes | Productivity | Cost |
| --- | --- | --- | --- |
| New joiner reads the data room and the last deck | Engagement brief is a query over live hypotheses, contradictions, and owners | Days of reading become a guided first day | Less unbillable or low-value ramp on every roll-on |
| Interviews sit in personal notes until someone writes a synthesis slide | Observations and quotes attach to the hypothesis they support or weaken | Synthesis is continuous, not a Friday exercise | Fewer lost interviews when the note-taker leaves |
| Manager hunts Slack, Excel, and slide notes to ask “why this number?” | Claim, calculation, and evidence share ids | Review meetings start from the chain | Partner hours shift from archaeology to challenge |
| Sunday rewrite because the model and the story diverged | Ghost slides go stale when the underlying hypothesis or assumption changes | Rework is a diff, not a new narrative | Less week-before-steerco fire drill |
| Next engagement on the same client starts from files | Prior problems, decisions, and outcomes reconstruct | Week-1 scoping uses what the firm already concluded | Less repeat research the client already paid for |
| “Why did we say close 12 stores?” months later | Provenance from hypothesis versions to the decision | Answer in the room, not a scavenger hunt | Protects the relationship and reduces write-off of partner time |

**Productivity.** Associates file evidence and field notes once. Seniors link them to hypotheses instead of re-explaining them in three artifacts. Managers review an issue tree, a contradiction inbox, and a weekly delta. The deck is updated where the claim changed, not rewritten from memory.

**Cost.** The expensive loop in professional services is senior people re-deriving context. Cutting that loop improves realization and leverage without requiring a smaller team. A second saving is abandoned work that stays visible: the team does not re-open a killed hypothesis because nobody remembers why it died. Inference itself is a new cost; credits and routing have to stay predictable or the productivity gain is spent on model bills. Enterprise packaging is where that predictability is a requirement, not an afterthought.

**Quality and risk.** Unsupported claims, single-source management assertions, and contradictions are lists, not surprises in the steering committee. Sign-off is on a snapshot of the graph. That is attractive to quality reviewers even when it does not remove hours.

What this does **not** automatically do: shrink the engagement, replace the manager, or remove PowerPoint. A firm that adopts the graph and still keeps a parallel story in slides will not see these gains.

### Pros

- One chain from problem to hypothesis to evidence to recommendation, shared by the whole case team.
- Mid-case joiners and replacements inherit the reasoning, not a folder.
- Field notes and interviews become evidence on the hypothesis they affect, so fieldwork survives the person who captured it.
- Partner challenge is concrete: which assumption, which source, what would change the decision.
- Storyline and appendix stay tied to the same objects, so the working paper and the steerco pack do not drift apart.
- Killed ideas and prior client work stay queryable, which is the asset firms already claim in knowledge-management programs and rarely have.
- Same engine as individual Analyst work. A team plan adds people and views; it does not fork the product.

### Cons

- The team has to record thinking as objects. If the real answer still lives only in the deck, Ideate is a second system and productivity falls.
- Upfront cost on week 1: issue tree, owners, and source hygiene before the first steerco feels slower than opening a slide template.
- Managers must review the graph. A partner who only reads PowerPoint will not get the provenance benefit.
- Collaboration, roles, and client views are a team product. A free single-player workspace does not run an engagement.
- Firm-wide “have we seen this before?” is unsafe until matter isolation and explicit permission exist. Until then, cross-engagement search is a liability, not a feature.
- Model cost, residency, and approved-model policy are procurement issues. A practice that cannot explain inference spend will block the rollout.
- It does not replace the firm’s PSA, data room, or slide production. Teams that expect those replacements will call the pilot a failure.
- Quality features (contradictions, unsupported claims, sign-off) add scrutiny. Some teams will experience that as friction before they experience it as fewer client challenges.

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

Demonstrate on **one real case**. A boutique delivery team fits **Pro**. A firm pilot fits **Enterprise** (contract, isolation, approved models) — not a consumer monthly plan. Packaging is in [use-cases/README.md](./README.md). Consulting may be the stronger first B2B path.

## What this is not

- A better slide generator
- A SharePoint replacement (Documents is a **link tree** for this engagement; SharePoint keeps the files)
- Silent cross-client training data
- A separate Ideate Consulting binary
