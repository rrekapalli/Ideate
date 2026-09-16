# Big Four offerings vs Ideate

Feature comparison from **public literature** (firm sites, press, and published insights), read against Ideate’s inception design. Not a lab bake-off. Internal platforms are thicker than their marketing; this file only scores what those sources actually describe.

**Read with:** [consulting.md](./consulting.md) · [market-landscape.md](../market-landscape.md) · [object-model.md](../object-model.md)

**As of:** September 2026. Offerings move; treat cells as a snapshot.

## How to read this

The Big Four are not “four copies of Ideate.” They sell **delivery platforms, agents, and services** (often to their own clients) and run **secure GenAI** for their people. Ideate is an **engagement reasoning graph**: hypotheses, evidence, versions, and why a recommendation changed.

They can be **customers** (buy a reasoning layer), **partners** (agents write into Ideate), or **adjacent competitors** (if a partner claims the firm already has institutional reasoning memory). They are not, in public materials, a typed idea OS.

| Mark | Meaning |
| --- | --- |
| **Yes** | Publicly described as a product capability |
| **Partial** | Adjacent (docs, chat, methodology, agent logs) — not the Ideate object |
| **No** | Not described in the sources below |
| **Intent** | Ideate design in Docs; **not shipped** |

Independence: Ideate is vendor-neutral. A firm platform is built to extend **that firm’s** methods, IP, and leverage.

## What each name is (public)

| House | Named offerings in literature | Center of gravity |
| --- | --- | --- |
| **Deloitte** | [Zora AI](https://www.deloitte.com/us/en/services/consulting/services/zora-generative-ai-agent.html) (agentic digital workforce, NVIDIA); [Open Model Engineering](https://www.deloitte.com/global/en/about/press-room/deloitte-launches-open-model-engineering-practice.html) (open/sovereign models, cost and inference control); [Knowledge Management / Knowledge Capital](https://www.deloitte.com/us/en/services/consulting/services/knowledge-management-solutions.html); RAG-as-a-service and trusted-information foundations | **Agents that act** on enterprise processes + **KM / RAG** over content |
| **PwC** | [PwC One](https://www.pwc.com/us/en/about-us/newsroom/press-releases/pwc-one.html) (Mar 2026): methodologies + client data + autonomous AI; [later One enhancements](https://www.pwc.com/us/en/tech-effect/ai-analytics/pwc-one-ai-platform-enhancements.html) (interactive thought leadership); [ChatPwC](https://www.pwc.be/en/news-publications/2024/hello-chatpwc.html) (secure staff GPT) | **AI at the center of an engagement** + firm knowledge and compliance |
| **KPMG** | [KPMG Workbench](https://kpmg.com/us/en/media/news/kpmg-launches-kpmg-workbench-a-multi-agent-ai-platform.html) (Jun 2025): multi-agent hub on Azure AI Foundry; [KPMG Clara](https://kpmg.com/us/en/capabilities-services/audit-services/kpmg-clara.html) (smart audit, agent reasoning trail); [KPMG Velocity](https://kpmg.com/xx/en/media/press-releases/2025/02/kpmg-showcases-kpmg-velocity-its-new-ai-enabled-business-transformation-platform.html) (transformation methods + tools); [Digital Gateway](https://kpmg.com/xx/en/our-insights/ai-and-technology/kpmg-digital-gateway.html) (tax/legal); Digital SOP (chat + citations on procedures) | **Audit/tax/transformation delivery** + agent orchestration |
| **EY** | [ey.ai](https://www.ey.com/en_gl/services/ai/platform) + [EY Fabric](https://www.ey.com/en_gl/services/ai/platform/technology); [EYQ](https://www.ey.com/en_gl/insights/ai/how-ey-is-unlocking-the-next-iteration-of-genai-advancement-with-eyq) (private GenAI for EY people); [EY.ai Agentic / enterprise private](https://www.ey.com/en_gl/newsroom/2025/05/ey-announces-ey-dot-ai-enterprise-private-powered-by-dell-technologies-and-nvidia-accelerated-computing-to-deliver-enterprise-agentic-and-physical-ai-at-scale); [knowledge-as-infrastructure](https://www.ey.com/en_us/insights/ai/ai-readiness-from-data-to-knowledge-as-infrastructure) (Jun 2026 insight) | **Platform + private LLM estate** + stated need to engineer *experiential* knowledge |
| **Ideate** | Inception docs only | **Idea / engagement graph as system of record** |

## Feature matrix

Capabilities a partner would ask for on a strategy/ops/M&A **engagement**, plus enterprise hygiene. Firm cells = public description. Ideate = designed intent.

| Feature | Deloitte | PwC | KPMG | EY | Ideate |
| --- | --- | --- | --- | --- | --- |
| Secure staff / client GenAI chat | Partial (Zora + KM assistants) | **Yes** (ChatPwC; One assistants) | **Yes** (Audit Chat → Clara; Digital SOP; Gateway GenAI) | **Yes** (EYQ) | Partial (Explore is a face; not a firm-wide GPT) |
| RAG over documents / SharePoint / methodology | **Yes** (KM, RaaS, trusted unstructured data) | **Yes** (One knowledge bases, thought leadership) | **Yes** (Clara docs; SOP citations; Gateway RAG) | **Yes** (Fabric assets; EYQ domain agents) | Partial (attachments on **cards**, not a tenant library) |
| Multi-agent orchestration | **Yes** (Zora Perform/Advise agents) | Partial (autonomous capabilities in One) | **Yes** (Workbench agents; Clara agents) | **Yes** (Agentic Platform / Framework) | **Intent** (Literature, Critique, … — engagement graph, not AP/AR) |
| Agents that **execute** enterprise workflows (close, expense, tax ops) | **Yes** (Zora digital workforce) | Partial (workflows in One: tax, diligence, …) | **Yes** (Workbench; Clara procedures; Gateway) | **Yes** (tax/risk/finance agentic; HR watsonx) | **No** (out of scope) |
| Firm methodology / compliance baked into the tool | Partial (Trustworthy AI; KM method) | **Yes** (explicit: methods + compliance frameworks) | **Yes** (Clara methodology; Velocity methods) | **Yes** (ey.ai + services + sector) | **No** (neutral OS; a firm can encode methods as objects) |
| Audit-grade workpaper / disclosure engines | No* | Partial (financial reporting, assurance in One) | **Yes** (Clara, FRA, population testing) | Partial (assurance knowledge products) | **No** |
| Transformation method library (templates, TOM, journeys) | Partial (consulting services, not one named OS) | Partial (operating-model transformation in One) | **Yes** (Velocity) | Partial (value blueprints) | **No** (graph can *record* a journey; it is not Powered Enterprise) |
| Interactive thought leadership | Partial | **Yes** (One, 2026) | Partial (insights in Gateway) | Partial | **No** (not a publishing studio) |
| Open / local / sovereign model routing | **Yes** (Open Model Engineering + Zora on Nemotron) | Partial (secure infra; vendor mix not the headline) | Partial (Azure Foundry; “leading models”) | **Yes** (private / Dell+NVIDIA; model catalog) | **Intent** (OpenAI / xAI / Copilot-adjacent / **Ollama**) |
| Cost / inference transparency | **Yes** (OME: predictability, inference transparency) | Partial (governance, auditability claimed) | Partial (trust and control on Workbench) | Partial (governance in Fabric) | **Intent** (per-workspace ledger, credits) |
| Typed objects: Problem, Hypothesis, Evidence, Decision | No | Partial (“test assumptions” — not a public object catalog) | Partial (Clara: agents **document reasoning** — audit trail, not idea Git) | Partial (insight: experiential knowledge has **no owner**) | **Intent** (full catalog) |
| Versioned hypothesis / theory diff | No | No | No | No | **Intent** |
| Provenance: “this rec came from H-17.2 + E-43” | No | No | Partial (Clara glass-box *agent* steps) | No | **Intent** |
| Contradiction / weakened-hypothesis inbox | No | No | No | No | **Intent** |
| Outcome written back onto the decision | No | Partial (continuous insight / learning cycles) | Partial (continuous audit analysis) | Partial (intelligence loops) | **Intent** |
| Reconstruct engagement after the team leaves | Partial (KM / institutional capture **as a client service**) | Partial (One “picks up where last left off” on **platform interactions**) | Partial (Digital SOP: knowledge loss on SOP, not strategy cases) | Partial (explicit gap: judgment layer unmanaged) | **Intent** (graph + transcript) |
| Permissioned “seen this problem in European retail?” | No | No | No | No | **Intent** (later; never silent cross-client RAG) |
| Deck / slide as a **view** of underlying nodes | No | No | No | No | **Intent** |
| Junior onboarding from live graph (not 147 PDFs) | Partial (KM + learning services) | Partial (personalized onboarding of **One**, not the case graph) | Partial (SOP chat) | Partial (EYQ domain agents) | **Intent** |
| Same engine for student / scientist / inventor | No | No | No | No | **Intent** |
| Matter-level isolation, SSO, CMK, legal hold | Implied (enterprise sales) | **Yes** claimed (One privacy/security) | **Yes** claimed (Clara / Workbench / Gateway) | **Yes** claimed (EYQ private; enterprise private) | **Intent** (required before a firm pilot) |
| Independent of one firm’s partnership | N/A (they *are* the firm) | N/A | N/A | N/A | **Yes** (design) |

\*Deloitte has large audit/assurance practices and AI in those businesses; public **Zora / KM / OME** pages are not Clara-equivalents. Do not score “Deloitte cannot audit.”

## What the literature actually says

### Deloitte

Zora is a **digital workforce**: perceive, reason, act; finance-first agents; SaaS or client hyperscaler/on-prem; works with the client’s own agents and LLMs. Open Model Engineering (2026) is explicit about **sovereignty, IP, cost predictability, model behavior, inference transparency** — the same control list [consulting.md](./consulting.md) treats as enterprise requirements.

KM / Knowledge Capital and “trusted information” pieces optimize **authoritative content + RAG**. Deloitte Insights on [capturing institutional knowledge](https://www.deloitte.com/us/en/insights/topics/talent/knowledge-management-plan.html) still frames knowledge as a **managed content program** (strategy, process, content standards, discovery), not Git-for-thinking.

**Gap vs Ideate:** strong at *doing work* and *finding documents*. Not described: a living, versioned engagement hypothesis graph.

### PwC

Closest **wording** to Ideate. PwC One (19 Mar 2026): institutional knowledge + autonomous AI; **beyond episodic projects**; faster learning cycles; AI that can **surface patterns and test assumptions**; “AI is at the center of an engagement.” Later: interactive thought leadership and workflow hooks. ChatPwC is a **secure chat** over firm/client data (Azure OpenAI; client data not reused for training, per member-firm releases).

**Gap vs Ideate:** public pages describe an **environment and workflows**, not first-class Hypothesis/Evidence/Decision objects or “update slide 17 because H-17 changed.” “Test assumptions” is a capability claim, not an object model. One is **PwC’s** delivery system (methods, compliance, US rollout). Ideate is a graph any firm (or boutique) could own.

### KPMG

Clearest **split stack**: Workbench (agents + governance) underpins Clara (audit), Digital Gateway (tax/legal), Velocity (advisory transformation). Clara’s “glass-box” agents **log reasoning for audit quality** — the nearest public analogue to provenance, but for **audit procedures**, not strategy recommendations. Velocity is methods + assets + AI, sometimes described as an **approach** more than a single app. Digital SOP is RAG + citations + version history on **procedures**.

**Gap vs Ideate:** excellent at regulated delivery and transformation kits. No public typed idea graph for “why we recommended closing 12 stores.”

### EY

ey.ai / Fabric = global AI backbone. EYQ = large **private** GenAI estate for EY people (Azure OpenAI), domain agents, later autonomous agents. Enterprise private = on-prem/sovereign agentic deploy.

Dan Diasio’s Jun 2026 [knowledge-as-infrastructure](https://www.ey.com/en_us/insights/ai/ai-readiness-from-data-to-knowledge-as-infrastructure) essay is the most **Ideate-shaped** Big Four text found: explicit vs experiential/judgment knowledge; the latter **has no owner and no budget**; knowledge needs architecture “purpose-built for reasoning”; without that, AI is “the most expensive way to automate misunderstanding.”

**Gap vs Ideate:** EY **names the problem**. Public **products** (EYQ, Fabric, agentic platform) are still platforms, chat, and agents — not a shipped engagement Git.

## Where Ideate is weaker (on purpose)

Do not pitch Ideate as a Zora/Clara/One replacement.

| They have (public) | Ideate does not (v1 / design) |
| --- | --- |
| 90k–95k-user audit platforms, tax gateways | Industry workpapers, disclosure checklists |
| Agents that post transactions and run close | Workflow RPA |
| Proprietary methods, alliance clouds, global delivery | A firm’s IP and leverage model |
| Thought-leadership studios | Content marketing |
| Years of Trustworthy AI / audit regulation | Enterprise SSO/CMK **until built** |

A firm that needs “our people already live in Clara/One” will not rip that out. Ideate sits **beside** it: the reasoning graph those agents and humans write into.

## Where Ideate is stronger (if we build the docs)

| Ideate (design) | Typical public Big Four stack |
| --- | --- |
| Hypothesis → Evaluation → Theory / Decision with **ids and diffs** | Chat + documents + method templates |
| Recommendation provenance months later | Deck + Excel + SharePoint |
| Contradiction and abandoned ideas as data | KM articles and SOP versions |
| Same OS for learning and invention | Professional-services delivery only |
| Model-agnostic; local Ollama for `SIMPLE` | Usually one hyperscaler narrative |
| Deck as a **projection** of nodes | Deck as the system of record |

That is the sentence for a partner: **they industrialize delivery and retrieval; we persist how the engagement’s thinking evolved.**

## Commercial reading

```text
Big Four platform     →  do the work, retrieve the corpus, govern the model
Ideate                →  remember the reasoning, version it, replay it
```

- **Sell to a firm** when Clara/One/EYQ/Zora do not answer “why did we believe H-17.2?”
- **Do not sell** as a cheaper ChatPwC or a better Velocity.
- EY’s 2026 knowledge-infrastructure argument is the best **inbound** quote; PwC One is the best **wording overlap** (and the easiest confusion to clear up).
- Isolation, SSO, CMK, legal hold remain **open** for Ideate until an enterprise pilot ([open-questions.md](../open-questions.md)).

## Sources (public)

- Deloitte Zora AI: [deloitte.com Zora](https://www.deloitte.com/us/en/services/consulting/services/zora-generative-ai-agent.html); [PR Newswire, Mar 2025](https://www.prnewswire.com/news-releases/deloitte-unveils-zora-ai-agentic-ai-for-tomorrows-workforce-302404892.html)
- Deloitte Open Model Engineering: [global press room](https://www.deloitte.com/global/en/about/press-room/deloitte-launches-open-model-engineering-practice.html)
- Deloitte KM: [Knowledge Management Solutions](https://www.deloitte.com/us/en/services/consulting/services/knowledge-management-solutions.html); [Capturing institutional knowledge](https://www.deloitte.com/us/en/insights/topics/talent/knowledge-management-plan.html); [trusted unstructured information](https://www.deloitte.com/ca/en/Industries/financial-services/perspectives/unstructured-data-source-of-truth.html); [CIONET RaaS](https://www.cionet.com/news/rag-as-a-service-raas)
- PwC One: [press release, 19 Mar 2026](https://www.pwc.com/us/en/about-us/newsroom/press-releases/pwc-one.html); [platform](https://www.pwc.com/us/en/services/ai/pwc-one.html); [how it works](https://www.pwc.com/us/en/services/ai/pwc-one/how-it-works.html); [AI enhancements](https://www.pwc.com/us/en/tech-effect/ai-analytics/pwc-one-ai-platform-enhancements.html)
- ChatPwC: [PwC Belgium](https://www.pwc.be/en/news-publications/2024/hello-chatpwc.html); [PwC New Zealand / Azure OpenAI](https://www.pwc.co.nz/news-releases/2024-news-releases/pwc-new-zealand-gives-secure-generative-ai-tool-chatpwc-to-all-staff-nationwide.html)
- KPMG Workbench: [17 Jun 2025](https://kpmg.com/us/en/media/news/kpmg-launches-kpmg-workbench-a-multi-agent-ai-platform.html)
- KPMG Clara: [Clara AI](https://kpmg.com/us/en/capabilities-services/audit-services/kpmg-clara.html); [AI integration, 23 Apr 2025](https://kpmg.com/us/en/media/news/kpmg-clara-smart-audit-platform.html)
- KPMG Velocity: [12 Feb 2025](https://kpmg.com/xx/en/media/press-releases/2025/02/kpmg-showcases-kpmg-velocity-its-new-ai-enabled-business-transformation-platform.html)
- KPMG Digital Gateway: [overview](https://kpmg.com/xx/en/our-insights/ai-and-technology/kpmg-digital-gateway.html)
- EY: [ey.ai](https://www.ey.com/en_gl/services/ai/platform); [Fabric / EYQ](https://www.ey.com/en_gl/services/ai/platform/technology); [EYQ case](https://www.ey.com/en_gl/insights/ai/how-ey-is-unlocking-the-next-iteration-of-genai-advancement-with-eyq); [enterprise private, May 2025](https://www.ey.com/en_gl/newsroom/2025/05/ey-announces-ey-dot-ai-enterprise-private-powered-by-dell-technologies-and-nvidia-accelerated-computing-to-deliver-enterprise-agentic-and-physical-ai-at-scale); [Diasio, 26 Jun 2026](https://www.ey.com/en_us/insights/ai/ai-readiness-from-data-to-knowledge-as-infrastructure)
