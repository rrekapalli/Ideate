# Use cases

Same **Idea Evolution** engine. The domain, default objects, and commercial packaging change. Personas stay workspace lenses — we do not ship a Student app and a Consulting app.

```text
                       IDEATE
                          │
          ┌───────────────┼────────────────┐
          │               │                │
       LEARNING        RESEARCH        PROFESSIONAL
          │               │                │
       Student         Researcher      Consultant
          │               │                │
                       Explorer        Inventor
                          │                │
                       Analyst         Product / legal
                                       (later verticals)
```

Persistent state + graph + provenance + temporal evolution + routed AI. Only the ontology weights change.

| File | Who | Persona today |
| --- | --- | --- |
| [Student](./student.md) | Grow understanding; misconceptions as history | Student |
| [Researcher](./researcher.md) | Defensible claims; theory versions (includes scientists) | Researcher |
| [Inventor](./inventor.md) | Make something work; constraints, BOM, decisions | Inventor |
| [Analyst](./analyst.md) | Choose under uncertainty; replay months later | Analyst |
| [Explorer](./explorer.md) | Curiosity and thought experiments | Explorer |
| [Consulting](./consulting.md) | Engagement reasoning memory for professional services | Analyst first; Consultant lens later |
| [Consulting engagement features](./consulting-engagement-features.md) | Research, fieldwork, team collaboration, and report prep for a delivery team | — |
| [Big Four vs Ideate](./big-four-comparison.md) | Public feature comparison (Deloitte, PwC, KPMG, EY) | — |
| [Product research](./product-research.md) | Solo product / market inquiry (e.g. RxFolio-class) | Analyst or Inventor |

Single-person feature lists (no team) live on [Student](./student.md), [Researcher](./researcher.md), [Inventor](./inventor.md), [Explorer](./explorer.md), and [Product research](./product-research.md). Consulting team features stay in [consulting-engagement-features.md](./consulting-engagement-features.md).

Design references (not shipped samples): [design-benchmarks.md](../design-benchmarks.md). Persona rules: [personas.md](../personas.md).

## Offerings

One product, three commercial lines. Personas and the object model do not change between them. What changes is who can share a workspace, how far collaboration and delivery views go, and whether a tenant is a firm.

| | Free | Pro | Enterprise |
| --- | --- | --- | --- |
| Who | A person learning, exploring, or trying a case alone | A small team or boutique on one or a few projects | A firm: practice, member firm, or client-delivery tenant |
| Workspace | Personal. One thinker | Shared team workspace | Shared, with matter boundaries and tenant admin |
| Commercial shape | Self-serve, tight credits | Self-serve or annual, higher credits | Contract. Predictable inference, approved models |
| Consulting fit | Personal prep. Not an engagement team | Delivery team on a case | Big Four / MBB pilot and rollout |

Free is the full thinking OS for one person. Pro is the team that can finish a piece of work together. Enterprise is the firm boundary: isolation, identity, residency, and permissioned memory across engagements. Feature detail for a delivery team is in [consulting-engagement-features.md](./consulting-engagement-features.md). Benefits and tradeoffs for that team are in [consulting.md](./consulting.md).

### Free

Individual workspaces. Enough to learn the product and to run a personal analysis. Not enough to staff an engagement.

| Feature | In Free |
| --- | --- |
| Personas (Student, Researcher, Inventor, Analyst, Explorer) | Yes |
| Typed graph, versions, abandon / resurrect, provenance | Yes |
| Explore, Learn, Challenge, Research, Review, and the other modes | Yes |
| Overlay branches and clone-to-new-workspace | Yes |
| Documents tree (links) and attach-to-card | Yes |
| Timeline, contradictions, review gaps | Yes |
| Report export (Markdown, PDF, DOCX) from the graph | Yes, within credits |
| Engagement profile, workstream owners, shared hypothesis log | No |
| Comments, review queue, roles | No |
| Storyline, ghost deck, steerco snapshot, sign-off | No |
| SSO, customer-managed keys, legal hold, matter isolation | No |

### Pro

The team plan. Several people, one Mainstream graph, overlays for side explorations, and the views a manager uses to run a case. This is the first offering on which consulting collaboration is real.

| Feature | In Pro |
| --- | --- |
| Everything in Free, with a higher credit pool | Yes |
| Shared workspace and card owners | Yes |
| Engagement profile, pinned problem, workstream groups | Yes |
| Hypothesis log, source register, data-request list | Yes |
| Interview and observation capture, heard vs concluded | Yes |
| Contradiction inbox, assumption register, weekly delta | Yes |
| Engagement brief for someone joining mid-project | Yes |
| Comments, @mentions, review queue | Yes |
| Explicit overlay merge | Yes |
| Governing thought, action titles, ghost deck, stale slides | Yes |
| One-page answer and appendix exports | Yes |
| Report snapshots | Yes |
| Firm-wide search across clients | No |
| SSO, CMK, residency, legal hold, client guest view | No |

### Enterprise

Pro, plus the controls a firm will require before client data is in the system, and the memory features that are only safe after those controls exist.

| Feature | In Enterprise |
| --- | --- |
| Everything in Pro | Yes |
| Tenant isolation; client and engagement boundaries | Yes |
| SSO / SAML / OIDC; partner, manager, member, viewer roles | Yes |
| Encryption, customer-managed keys, audit log | Yes |
| Data residency, retention, legal hold, export / delete on offboarding | Yes |
| No training on customer data; approved-model routing | Yes |
| Document-level permissions; PII / secret detection | Yes |
| Manager and partner sign-off on a snapshot | Yes |
| Client published view (read-only pack and questions back) | Yes |
| Methodology skeletons (empty graphs, no prior client evidence) | Yes |
| Outcome written back onto the decision | Yes |
| Permissioned “similar engagement” query | Yes, explicit grant only |
| Inference transparency and cost predictability | Yes |

### Where each use case sits

| Use case | Natural offering | Why |
| --- | --- | --- |
| Student, Explorer | Free | One person, one inquiry |
| Researcher, Inventor, Analyst | Free for one person; Pro when co-authors share the graph | The OS is the same; co-authors are the upgrade |
| Product research | Free for one founder or PM; Pro if a product team shares it | Solo features are in [product-research.md](./product-research.md) |
| Consulting delivery team | Pro for a boutique case; Enterprise for a firm | Team views are Pro. Client data at firm scale is Enterprise |
| Firm knowledge across matters | Enterprise only | Cross-engagement recall without isolation is a leak |
