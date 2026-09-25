# Consulting engagement features

**Audience:** product and design, for a Big Four or MBB-style engagement (strategy, operations, commercial diligence, transformation).  
**Read with:** [consulting.md](./consulting.md) · [analyst.md](./analyst.md) · [big-four-comparison.md](./big-four-comparison.md) · [object-model.md](../object-model.md) · [workspace-ui.md](../workspace-ui.md)

This file is the feature catalog for **how a delivery team researches, records what it saw, argues, and writes the client pack**. Security, tenant isolation, SSO, encryption, legal hold, and “no training on client data” are mandatory and already listed in [consulting.md](./consulting.md). They are assumed here and not repeated.

Ideate stays one product. A consulting engagement is a workspace on the Analyst lens (later an optional Consultant label). New names in this file are **views, tags, roles, and workflows** on the existing graph, not a second schema.

## What a firm actually pays for

A partner does not buy another chat window. The engagement already has ChatGPT-class tools, SharePoint, Excel, and a slide factory. The hours that hurt are:

| Pain on a live engagement | What they wish the tool remembered |
| --- | --- |
| Week 1 is “read the data room and last year’s deck” | The live problem, hypotheses, and what is still unknown |
| Interviews disagree and nobody reconciles them | Who said what, against which hypothesis, and where it conflicts |
| The model and the story drift apart | Which number, assumption, and evidence sit under each claim |
| The deck is rewritten the night before steerco | Slide titles are claims; when a hypothesis moves, the claim moves |
| A manager asks “why do we believe this?” | A chain, not a Slack thread |
| Someone rolls off on Friday | The next person inherits the graph, not a folder of drafts |
| Six months later the client asks why | The recommendation still points at the hypotheses and evidence that produced it |

Pitch line, unchanged from [consulting.md](./consulting.md): **persist how the engagement’s thinking evolved.** The features below are how a team does that work day to day.

## Roles this catalog serves

Same workspace. Different jobs. Features should be usable by all of them without a separate app.

| Role | Job on the engagement | Feature they will notice first |
| --- | --- | --- |
| Partner / principal | Challenge the answer; own the client relationship | Provenance, contradiction inbox, steerco snapshot, “what would change our mind” |
| Manager / engagement manager | Run workstreams, review quality, keep the story coherent | Issue tree, owners, review queue, weekly delta, storyline |
| Senior / consultant | Own a workstream; turn research into analysis | Hypothesis log, evidence, calculations, interview synthesis |
| Associate / analyst | Gather, tag, and draft | Request list, observation capture, source register, draft sections |
| New joiner (week 2 of the case) | Get dangerous-fast without reading 147 files | Engagement brief generated from the live graph |
| Client sponsor (optional, late) | Read the answer and the open questions | Curated read-only pack, not the working graph |
| Knowledge / quality reviewer | Check that methods and claims hold | Unsupported-claim review, sign-off, lessons written back |

Client guests see a **published view**. They do not browse Mainstream, overlays, or other matters.

## Baseline already in the product

Use this so the catalog does not re-propose what exists.

| Already designed or coded | Consulting use |
| --- | --- |
| Workspace = one project; Analyst persona | One engagement, one graph |
| Typed cards: Question, Hypothesis, Assumption, Evidence, Observation, Claim, Critique, Evaluation, Decision, Constraint, Calculation, Unknown | Issue tree, fact base, recommendation chain |
| Typed edges: `supports`, `contradicts`, `assumes`, `led-to`, `evaluated-by`, `version-of` | “This rec rests on H-17.2 and E-43” |
| Versions, abandon, resurrect, overlay branches | Parallel workstreams and killed ideas kept as history |
| Documents tree of links (SharePoint-class), attach-to-card | Data room stays in the DMS; meaning lives on Evidence |
| Explore / Research / Challenge / Review modes | Research vs red-team vs pre-steerco |
| Timeline, Problems, Review panels | What changed; contradictions |
| Report draft from the graph only; export **Markdown, PDF, DOCX** | Working paper, not a slide system of record |
| Chat transcript stored per card version | “Which conversation produced this version” |

Report export today is a **research narrative** (question, facts with display ids, reasoning, dropped lines, open items). Consulting still needs storyline, ghost deck, appendices, and review states on top of that export. It does not need a new report engine that ignores the graph.

## Engagement lifecycle and where features sit

```text
Pursue (optional) → Kickoff → Issue tree → Data & research
  → Fieldwork (interviews, site, workshops)
  → Analysis → Challenge → Story & pack
  → Steerco → Decision → Implementation notes → Lessons
```

| Phase | System of record in Ideate | Downstream (not Ideate) |
| --- | --- | --- |
| Scope and hypotheses | Questions, Hypotheses, Constraints, workstream groups | Proposal deck, SOW in the DMS |
| Research | Evidence, citations, request-list status | Data room, market databases |
| Fieldwork | Observation and Interview evidence | Recording consent, calendar |
| Analysis | Evaluation, Calculation, Critique, overlays | Excel / BI models |
| Answer | Decision, alternatives, confidence, open Unknowns | — |
| Client pack | Storyline and slide **views** bound to those nodes | PowerPoint file |
| After the project | Outcome written back; handover brief | PSA, billing, CRM |

---

## 1. Engagement setup

The workspace is the engagement. Add a thin **engagement profile** (metadata on the workspace, not new node types) so the team and a later handover know what this graph is.

| Feature | What it does | Why a firm wants it |
| --- | --- | --- |
| Engagement profile | Client display name, industry, service line, engagement type (strategy, ops, CDD, ODD, transformation), start, confidentiality label | Every view and export can say which matter this is. The label is a reminder; isolation is still the security model |
| Problem statement card | One pinned Question or Thought: the question the client hired the firm to answer | Home and the report title stay anchored. Stops the graph drifting into interesting side research |
| Scope in / scope out | Constraint cards tagged `in-scope` / `out-of-scope` | Stops analysis (and the AI) from answering a different question than the SOW |
| Success criteria and kill criteria | Target cards: what “good” looks like, and what finding would kill a hypothesis | Managers use these in reviews. Challenge mode can test against them |
| Workstream groups | User folders or graph groups over cards: Revenue, Cost, Market, People, Tech | Matches how the team is staffed. Outline and the left tree group by workstream, not only by object type |
| Engagement skeleton | Clone a Mainstream snapshot: blank issue tree for “profitability decline”, “commercial diligence”, “operating model” | Firm methods become **starting graphs**, not a template gallery inside PowerPoint. A skeleton is structure only — no prior client’s evidence |
| Week plan as a view | Open Questions and Hypotheses filtered by “this week” / owner | A light plan. Not a Gantt, not a timesheet |

**Do not build:** CRM, opportunity pipeline, pricing, staffing optimizer, or time entry. Those stay in the firm’s PSA.

## 2. Engagement research

Research is how hypotheses earn or lose support. The AI may search and attach; a human accepts, retitles, or deletes. Nothing becomes a fact because a model said it.

| Feature | What it does | Maps to |
| --- | --- | --- |
| Hypothesis-led research | From a Hypothesis or Unknown, Research mode proposes what to look up and files results as Evidence on **that** node | Evidence + `supports` / `contradicts` |
| Source register | Every Evidence card: source type (filing, interview, dataset, expert, news, internal benchmark), date, author/org, reliability tag (`primary`, `secondary`, `hearsay`, `management-assertion`) | Tags on Evidence, queryable |
| Fact vs inference vs estimate | Epistemic tags already in the object model, surfaced in research views and in any sentence that lands in a report | Fact / Inference / Estimate chips |
| Data-request list (PBC) | Questions or tasks tagged `request`: owner (us or client), status (`needed`, `asked`, `received`, `insufficient`), link in Documents when the file arrives | Question or Evidence + Documents link |
| Request chasing view | One list: what is blocking which hypothesis | Filter, not a new object |
| Claim extraction | From an attached filing, transcript, or spreadsheet extract, mint Claim cards linked to the source Evidence | Existing “extract claims” action |
| Benchmark strip | Evidence tagged `benchmark` compared to the client’s Calculation on the same metric | Edges `supports` / `contradicts`; show the delta in the inspector |
| Competitor / market scan | A workstream group of Concepts + Evidence, kept separate from client-confidential numbers | Same graph, tagged `external` |
| “So what” prompt | On any Evidence or Claim, a required or nudged link: which Hypothesis does this change, or explicitly `does-not-change` | Stops the team collecting facts that never touch the answer |
| Research log | Timeline filtered to Evidence created, retracted, or superseded | Bottom Timeline |
| Source conflict | When two Evidence cards disagree on the same metric, open a Problem and a Critique | `contradicts` + Problems panel |
| Citation on the card | Display id, source name, date, page or tab if known. Report body already cites display ids | Citation card or fields on Evidence |
| Reliability downgrade | Mark Evidence `superseded` or retracted without deleting history | Same as paper retract |
| AI research boundary | The model may propose cards only from attached extracts and allowed tools. It must not invent figures, interviews, or DOIs. The report prompt already says this; research mode must obey the same rule | ReportService rule, applied to Research turns |

**Attractive research workflows**

1. **Day-1 data-room pass.** Associate drops links into Documents. Research mode walks the pinned problem and opens Unknowns (“gross margin bridge not in the files”) instead of a generic summary.
2. **Management assertions.** Tag a deck or interview as `management-assertion`. Challenge mode lists assertions that have no independent Evidence.
3. **What would change the answer.** Rank open Questions by how many live Decisions depend on them. That is the research backlog, not a reading list.

## 3. Observations, interviews, and fieldwork

This is the gap SharePoint and chat handle worst. Notes live in personal docs; synthesis happens once, in a slide, and the raw observation disappears.

Treat fieldwork as **Evidence**, with a small set of consulting tags and fields. Observation already exists as its own node when the result is a measurement or a witnessed fact. An interview is Evidence (type tag `interview`) that may spawn several Observation and Claim cards.

### Capture

| Feature | What it does |
| --- | --- |
| Observation card | Date, place or channel (site, plant, call, workshop), workstream, observer (the user), short summary, full notes, attachments (photo, sketch, audio the firm already allows) |
| Interview card | Evidence tagged `interview`: role of the interviewee (CFO, plant manager, customer — **role first, name optional**), date, guide used, consent/sensitivity tag (`internal`, `client-confidential`, `do-not-quote`) |
| Interview guide | Generated from open Questions and untested Hypotheses in that workstream. A checklist, not a script the AI invents beyond the graph |
| Quote | A Claim or excerpt hung on the Interview, with `do-not-quote` respected by every report and client view |
| Site-visit batch | Many Observations from one visit, grouped, each linked to the hypotheses they bear on |
| Workshop capture | Sticky-level notes become Thoughts; the facilitator promotes the ones that matter. Junk is deleted, not archived as firm knowledge |
| Voice or meeting notes | Paste or upload a transcript the team is allowed to store. The system proposes Observations and Claims; a human confirms. Ideate does not record the meeting itself |
| Field inbox | A queue of unlinked notes. They are not on the answer path until attached to a Hypothesis, Question, or explicitly marked `context-only` |
| Tablet capture | Short observation form (title, workstream, note, photo). Phone authoring of the full IDE stays out of scope; this form is the exception worth making for site work |

### Synthesis

| Feature | What it does |
| --- | --- |
| Theme across interviews | Cluster Claims that repeat (“three plant managers: changeover loss, not labor rate”). The cluster is a Claim or Insight tag with edges back to each interview |
| Contradiction across voices | CFO says price, plant says mix. Problems panel + Critique. Do not auto-pick a winner |
| Heard vs concluded | `heard` on the interview Claim; `concluded` only on an Evaluation or Decision. Reports must not launder a quote into a finding |
| Coverage | Which workstreams or hypotheses have no interview or site Observation yet |
| Anonymized client view | Export can include themes and drop names, quotes marked `do-not-quote`, and raw notes |
| Sensitivity lock | `do-not-quote` and `client-confidential` cannot be copied into a client-ready storyline section without an explicit override by a manager role |

### Why this is attractive

Partners remember engagements that were won or lost in the plant, not in the model. A system that can say “the store-closure hypothesis weakened on 11 March because of customer interviews, and lease economics carried it on 16 March” is the story in [consulting.md](./consulting.md). That story is an Observation and Evidence trail, not a document search.

## 4. Analysis and challenge

| Feature | What it does | Why it matters in review |
| --- | --- | --- |
| Issue tree view | Problem → workstream Questions → Hypotheses → Evidence counts, confidence, status | The Monday meeting agenda |
| Driver tree | Calculation or Concept chain: revenue = price × volume × mix, each node sourced | Stops a slide chart with no owners |
| Assumption break | “What fails if this Assumption is false?” — already an Assumption action. List every Decision that uses it | Partner question, answered from the graph |
| Scenario overlays | Overlay branch per scenario (base, downside, strategic). Mainstream keeps the live recommendation. Merge is explicit | Two seniors can disagree without corrupting the answer |
| Sensitivity | Calculation versions: which input move flips a Decision | Tied to the number, not a footnote |
| Evaluation discipline | No Theory and no “we conclude” until Evaluation outcome is supported. Rejected hypotheses stay `abandoned` with `led-to` | Same rule as the research report |
| Critique cards | Structured challenge: what is weak, what evidence would settle it, who raised it | Manager and partner review, kept |
| Red-team mode | Challenge pass over load-bearing Assumptions and client-ready Claims. Output is Critique cards, not a rewritten deck | Pre-steerco |
| Kill log | Abandoned hypotheses with the reason and the evidence | Shows the team did the work. Protects against “you never considered X” |
| Alternative decisions | Decision action “show alternatives” kept in parallel until one is accepted | Steerco options, not a fake single answer |
| Open Unknowns | Query: everything still tagged unknown that a live Decision depends on | The honest appendix |

## 5. Report and pack preparation

PowerPoint remains the file the client sees. Ideate holds the **claims**. A slide is a view. “Update slide 17 because the price-elasticity assumption changed” walks the nodes, then the author edits the deck.

The current exporter (Markdown, PDF, DOCX) is the working-paper path. Add consulting **projections** of the same graph. Do not add a second writing surface that can state something the graph does not support.

### Storyline

| Feature | What it does |
| --- | --- |
| Governing thought | One Decision or Claim pinned as the answer. The storyline must trace to it |
| Pyramid / SCR outline | Situation, complication, resolution as sections. Each section is an ordered list of Claims. Every Claim links to Evaluation, Evidence, or is tagged `unsupported` |
| Action titles | Slide-title sentences generated from Claims (“Lease cost, not footfall, explains the margin gap”). Author edits; the binding to cards remains |
| Ghost deck | Ordered slides: title, the cards on that slide, speaker note pulled from the card body. Empty of design. This is the manager review artifact |
| Slide binding | A slide references display ids. If H-17 becomes H-17.2, the ghost deck marks the slide **stale** until someone accepts the new title |
| Audience variants | Same nodes, three projections: one-page answer, steerco pack, full report with appendix. Not three copies of the prose |
| Working paper | Today’s report: question, established facts (display ids), reasoning, dropped lines, still open. Export MD / PDF / DOCX |
| Appendix generators | Auto sections from queries: hypothesis log, source register, interview coverage, assumption list, kill log, data requests still open |
| Number lock | A figure in a storyline section must match a Calculation or Evidence field. Mismatch is a Problem, not a silent rewrite |
| Report snapshot | Freeze a storyline version against a graph version (“Steerco 12 March”). Later edits do not rewrite that snapshot |
| Status | `draft` → `manager review` → `partner review` → `client-ready`. Status is on the projection, not a rewrite of history |
| Mermaid / exhibit | One diagram when the argument needs it (already allowed in the report prompt). Exhibits cite the Calculation they draw |
| DOCX / PDF handoff | Working paper and appendix for Word-based firms. The slide file is still produced in PowerPoint from the ghost deck (outline export first; bound PPTX later) |
| Language guard | Client-ready projection refuses to call a Hypothesis conclusive unless Evaluation is supported or a Theory exists. Same rule as `ReportService` |

### What “update the deck” means

```text
Assumption A-14 changes
  → Calculation CALC-3 new version
  → Evaluation EV-9 updates
  → Decision D-2 new version
  → Ghost slides 12 and 17 marked stale
  → Author accepts new action titles
  → Export refresh
```

The deck file in SharePoint can stay the pretty copy. Ideate is why those two slides changed.

### Report features that look small and win pilots

- **One-page answer** for the partner on Sunday night: governing thought, three supports, two risks, what is still unknown.
- **Anticipated questions:** from Critique cards and weak Assumptions, a Q&A page for steerco.
- **Diff since last steerco:** hypotheses revised, evidence added, decisions unchanged. This is the verbal update, written down.

## 6. Collaboration and team

v1 of the product is single-thinker. A consulting pilot is a **team workspace**. These features are the difference between a personal thinking tool and something an engagement manager will run.

Design rule: **Mainstream is the engagement answer. Overlays are how people explore without stepping on each other.** Comments and assignments sit on cards. Chat stays the thinking transcript, not the review channel.

### People on one engagement

| Feature | Behavior |
| --- | --- |
| Shared workspace | Many users, one Mainstream graph, one Documents tree, one problem statement |
| Engagement roles | Partner, Manager, Member, Viewer. Optional Client viewer on **published** projections only. Roles gate review actions and client export, not a second permission bible — matter isolation stays in the security model |
| Card owner | One owner per live Hypothesis, workstream, or report section. Visible on the card and in the issue tree |
| Assignment | “You own the cost workstream” assigns existing cards and new cards minted under that group |
| Presence | Who has the workspace open, and which card they are editing. Avoid lost updates on the same Hypothesis |
| Overlay per person or per scenario | A member’s experimental branch. Nothing hits Mainstream until a manager (or the author, if policy allows) merges |
| Explicit merge | Diff overlay vs Mainstream: cards added, versions, edges. Accept or reject per card. Record who merged |
| Comments on a card | Review thread: question, reply, resolve. Separate from the Explore transcript so a partner comment does not mint a new theory |
| @mention | Notifies the owner. Deep-link opens the card |
| Review request | Author marks a Decision or storyline section “ready for manager”. It appears in that person’s queue |
| Review queue | My cards, cards waiting on me, contradictions, stale slides |
| Edit history | Version already stores who/why. Show the person, not only the model |
| Handover | When a member leaves the workspace: their owned cards, open comments, and overlays listed for reassignment. One generated brief (see below) |
| Weekly delta | Digest: hypotheses revised, evidence added, contradictions opened or closed, decisions unchanged, requests still blocked. Generated from Timeline. This is the internal standup note |
| Decision log | Accepted Decisions with date, owner, alternatives rejected. The EM’s record of “what we agreed in the room” |
| Notification scope | In-app first. Email or Teams only for review requests and @mentions, and only if the firm turns it on |

### How a team should work (recommended default)

```text
Associate captures observations and evidence on Mainstream
  or on an overlay if the finding is not yet checked
Senior links them to hypotheses and runs calculations
Manager reads the issue tree, critique, and stale slides
Partner challenges load-bearing assumptions
Merge and sign-off move the storyline to client-ready
```

Parallel workstreams are groups plus owners, not separate workspaces. Separate workspaces would split the answer.

### Junior onboarding (team feature, not a course)

A generated **engagement brief**, always from the live graph, never from a stale deck:

```text
Client and question
Current understanding (three lines)
Live hypotheses with status
Evidence count and source mix
Open contradictions
Unknowns that block the decision
What changed in the last 7 days
What this person owns
Next investigation
```

That replaces “read the data room and the 200-slide deck” for the person who joined on Thursday. Teacher / Explore can sit on top of this brief; the brief itself is a query.

### Client collaboration (keep it narrow)

| In | Out |
| --- | --- |
| Published one-page answer and steerco projection | Raw overlays, killed-idea debate, other clients |
| A short list of questions the team still needs from the client | Co-editing Mainstream |
| Optional comment on a published claim (“this number is calendar 2024, not FY”) that becomes a Critique for the team | Client access to interviews marked `do-not-quote` |

Comments from a client viewer land in the review queue. They do not rewrite cards.

### Meetings

| Feature | Scope |
| --- | --- |
| Internal review mode | Graph filtered to the storyline and open Critiques. Same IDE, less noise |
| Decision capture in the room | Facilitator mints or accepts a Decision before the meeting ends, with alternatives |
| Readout notes | Observations tagged `steerco` or `working-session`, linked to Decisions they confirmed or sent back |

Ideate does not schedule the meeting or record it.

## 7. Quality, sign-off, and continuity

These are what risk and quality teams ask for once a pilot is real. They are still graph features.

| Feature | What it does |
| --- | --- |
| Unsupported claim list | Claims in a client-ready projection with no Evidence or Evaluation |
| Overclaim check | Wording in the projection stronger than the Evaluation outcome |
| Single-source risk | A Decision whose support is one `management-assertion` |
| MECE nudge | Workstream Questions that overlap or leave a branch of the problem with no hypothesis. A warning, not an automatic rewrite |
| Sign-off | Manager and partner each accept a snapshot. Recorded on the report version. Not a mute button on later edits — later edits start a new version |
| Lessons / outcome | After the client acts: Observation or Evaluation on the Decision (“12 stores closed; savings missed because leases were extended”). Closes the loop in [analyst.md](./analyst.md) |
| Reconstruct the case | Query, not search: problem, hypothesis versions, what was abandoned, final Decision, outcome. The handover and the alumni question |
| Firm pattern query (later) | “Similar problem, constraints, and outcome in European retail” — **explicit, permissioned**, never silent retrieval across matters. See [consulting.md](./consulting.md) |
| Method skeleton feedback | If a cloned issue tree was useless, that is a note on the skeleton, not a copy of the client graph into the template |

## 8. Views the team lives in

The shell stays the IDE in [workspace-ui.md](../workspace-ui.md). Consulting adds **saved views**, not a dashboard home.

| View | Contents |
| --- | --- |
| Issue tree | Problem, workstreams, hypotheses, status |
| Hypothesis log | Id, statement, confidence, supports, contradicts, owner, last change |
| Evidence / source register | Type, reliability, date, linked hypotheses |
| Interview and observation log | Date, role or site, themes, sensitivity |
| Data requests | Status and which hypothesis is blocked |
| Contradiction inbox | Problems + `contradicts` edges |
| Assumption register | What the answer rests on, and what breaks |
| Storyline | Governing thought and ghost deck |
| Review queue | Waiting on me, stale slides, sign-off |
| This week | Owned cards touched or due |

Global search remains objects, documents, and transcript the user may see.

## 9. Suggested build order

Waves are for a single real case, then a team pilot. Security prerequisites in [consulting.md](./consulting.md) gate any firm pilot; they are not a wave in this list.

### Wave A — one case team can finish a steerco

Mostly views and tags on the current model.

1. Engagement profile and pinned problem.
2. Workstream grouping and card owner.
3. Hypothesis log, source register, contradiction inbox.
4. Interview and Observation capture with `heard` / `concluded` and `do-not-quote`.
5. Data-request list.
6. Engagement brief (onboarding query).
7. Storyline: governing thought, action titles, ghost deck bound to display ids, stale flag.
8. Weekly delta from the timeline.
9. One-page answer and working-paper export (existing MD / PDF / DOCX) plus appendix queries.

### Wave B — the manager can run the team

1. Shared workspace, roles, comments, review queue.
2. Overlays and explicit merge.
3. Report snapshots and manager / partner sign-off.
4. Number lock between storyline figures and Calculations.
5. Scenario overlays.
6. Handover reassignment.
7. Anticipated-questions page from Critiques.

### Wave C — the firm keeps the reasoning

1. Outcome written back onto Decisions.
2. Methodology skeletons (empty graphs, no client data).
3. Permissioned similar-engagement query.
4. Ghost-deck outline export that a slide team can drop into PowerPoint.
5. Bound PPTX only if Wave A–B are already how the team works. A slide exporter without bindings recreates the problem.
6. Narrow client published view.
7. Tablet observation form.

## 10. Mapping: consulting language to the graph

| They say | Ideate |
| --- | --- |
| Engagement / matter | Workspace |
| Client problem | Pinned Question or Thought |
| Issue tree | Workstream groups + Questions + Hypotheses |
| Hypothesis | Hypothesis |
| Day-1 answer | Early Decision, tagged speculative until Evaluation |
| Fact base | Evidence and Claims tagged fact |
| Management assertion | Evidence tagged `management-assertion` |
| Interview notes | Evidence `interview` + Observation / Claim children |
| Site visit | Observation batch |
| Analysis | Evaluation, Calculation, Critique |
| Insight | Claim or Evaluation, after it is linked |
| Recommendation | Decision (proposed, then accepted) |
| Option | Alternative on the Decision, or an overlay |
| Risk | Constraint or Critique |
| Workplan | Filtered “this week” view |
| Steerco pack | Storyline snapshot |
| Appendix | Queries over the registers |
| Page turn / story | Ghost deck |
| Knowledge transfer | Engagement brief + reconstruct query |
| Precedent | Later, permissioned pattern query |

## 11. Out of scope for this catalog

- Security control list (mandatory, specified elsewhere).
- Audit workpapers, tax engines, journal-entry agents (Clara / Zora class).
- A firm’s proprietary methodology content. They may encode a method as a skeleton; Ideate does not ship “the” Big Four method.
- SharePoint, Excel, or PowerPoint as the system of record.
- Timesheets, billing, staffing, CRM.
- Silent RAG across clients.
- A consulting-only application or schema fork.
- Automatic client email, interview recording, or legal discovery review.

## 12. Pilot success (so the catalog does not stay a wishlist)

On one engagement, after Wave A, a manager should be able to do all of the following without opening a side document:

1. State the question, the live hypotheses, and the owner of each workstream.
2. Show an interview that weakened a hypothesis, and the evidence that replaced it.
3. List contradictions and data still missing.
4. Export a one-page answer whose claims each cite a display id.
5. Show a new team member the engagement brief and have it match the graph, not last month’s deck.
6. Answer, a week later, why a slide title changed — from the Decision version, not from memory.
