# Single-person use cases: what is built, what is not, and whether the menu should change

Evaluated against the running app (Angular workspace shell + Spring graph API) on 25 Sep 2026.

Sources: [student.md](./student.md), [researcher.md](./researcher.md), [inventor.md](./inventor.md), [explorer.md](./explorer.md), [product-research.md](./product-research.md). Design rules: [personas.md](../personas.md), [object-model.md](../object-model.md).

Product research is not a sixth persona. It is the Analyst or Inventor lens on one workspace.

## Recommendation on menus

**Keep one shell and one object catalog. Do not ship a Student menu, an Inventor menu, and a Researcher menu as separate layouts.**

Hypothesis, Evidence, Theory, and the rest are the stored types. A student who is ready for a hypothesis, an explorer whose thought hardens, and a founder whose “bet” is a hypothesis all write the same node. Hiding Hypotheses from Students, or renaming the schema per persona, breaks that path. [personas.md](../personas.md) already forbids a forked schema and a second app per lens.

**Do change what the menu leads with.** Today the persona only changes an icon, a color, a home-table filter, and one line in the model prompt (`You are helping a {persona}…`). The left rail (Objects, Docs, Branch, Reports, Settings), the type picker, the chat modes, and the bottom panel (Timeline, Review, Jobs, Problems) are identical for every workspace. Objects are grouped under the canonical names: Hypotheses, Evidence, Theories. That is the mismatch. A student opening the tree is asked to think in research words before they have a concept.

The fix is a **presentation weight** on the existing rooms, not a new information architecture.

| Surface | Same for everyone | Weighted by the workspace persona |
| --- | --- | --- |
| Activity bar and drawers | Objects, Docs, Branches, Reports, Chat, Timeline | Unchanged |
| Stored type and display id | `hypothesis` / `H-017`, `evidence` / `E-043` | Unchanged. Search and jump keep these ids |
| Objects tree and “new node” picker | Full catalog remains one click away | Promoted types first. The rest under All types |
| Card header label | Canonical type still available in the type control | Short alias where the job word differs (below) |
| Workspace opening | Graph is still the page | A thin home strip: the persona’s question, plus two or three lists drawn from the graph |
| Chat | All nine modes stay in the dropdown | Default mode and the empty-composer prompt follow the persona |
| Export | One report engine (Markdown, PDF, DOCX) | Section titles follow the persona (revision sheet, paper draft, design note, snapshot, solo brief) |

Aliases are display strings. They are not new types.

| Stored type | Student | Researcher | Inventor | Explorer | Product research (Analyst or Inventor) |
| --- | --- | --- | --- | --- | --- |
| Thought | Thought | Thought | Thought | Thought | Thought |
| Concept | Concept | Concept | Concept | Concept | — |
| Unknown | I don’t know yet | Unknown | — | I don’t know yet | — |
| Question | Question | Question | Question | Question | Problem |
| Hypothesis | Hypothesis (when they promote) | Hypothesis | Feasibility | Hypothesis (when earned) | Bet |
| Evidence | Example, when tagged `example` | Evidence | Datasheet or bench note, by tag | Evidence, when they look | Research note |
| Assumption | Assumption | Assumption | Assumption | Assumption | Assumption |
| Constraint | — | — | Constraint | — | Constraint |
| Calculation | — | — | Calculation | — | — |
| Target | — | — | Target | — | — |
| Architecture / Component | — | — | Architecture / part | — | — |
| Decision | — | — | Decision | — | Decision |
| Misconception | Misconception | available, not promoted | — | — | — |
| Experiment / Observation | Practice example stays Evidence | Experiment / Observation | Bench test | — | Test / result |
| Evaluation / Theory | available after they accept an evaluation | Evaluation / Theory | “This works” only after Evaluation | not promoted | — |

“—” means the type stays in All types. It is not removed.

Epistemic words that are not types (`example`, `heard`, `concluded`, `estimate`, `speculation`, `do-not-quote`) belong on tags, which the model already allows as free text and does not enforce.

## What the app already is

One workspace shell. Personas are `student | researcher | inventor | analyst | explorer` on the workspace row. Creating a workspace requires one. There is no per-persona route and no per-persona home inside the workspace. Account home is a shared dashboard (“Workspace dashboard”) with persona chips for filter and create.

The catalog in `ObjectCatalog` already includes the objects these use cases emphasize: Thought, Concept, Unknown, Question, Hypothesis, Assumption, Evidence, Experiment, Observation, Claim, Critique, Decision, Evaluation, Theory, Misconception, Constraint, Calculation, Target, Design Artifact, Architecture, Component, Citation. Theory cannot be created except from an Evaluation (or an existing Theory). Categories include `active`, `abandoned`, `misconception`, `supported`, `speculative`, `unknown`. Edges include `contradicts`, `abandoned-because`, `resurrected-as`, `reused-in`, `calculated-from`, `version-of`, `overlay-on`, `promoted-to`.

Also shipped, and shared by every persona: mainstream vs overlay branches, timeline, header search that jumps to a card or document, file attach on a card, documents tree, workspace report export (Markdown, PDF, DOCX), chat modes Explore, Learn, Challenge, Research, Create, Review, Explain, Debate, Practice. Modes change the job class only for Review (treated as a deep job). They do not change the menus.

Card components exist per type. They share one chrome. The type-specific actions in [object-model.md](../object-model.md) (falsify, recompute, convert target to observation, BOM diff, “what breaks if this is false”) are not on the card.

## How to read the tables

| Status | Meaning |
| --- | --- |
| Shipped | The job can be done in the app today |
| Partial | The type, edge, or a generic tool exists. The persona behavior does not |
| Not built | No product path. Chat might improvise prose; the graph does not keep the feature |

Anything listed as Partial or Not built is a candidate to implement on this shell. None of them require a second menu layout.

## Student

Home the docs want: *What am I trying to understand, and what do I still confuse?*

| Feature | Status | What exists | What to add |
| --- | --- | --- | --- |
| Understanding home | Not built | Account dashboard is persona-agnostic | In-workspace strip: current concept, open Unknowns, misconceptions still in play |
| Learn from what I have | Partial | Learn mode is a chat dropdown. It does not start from existing cards | Learn and Explain bound to the selected concept, not a fresh essay |
| Socratic turn | Partial | Challenge and Practice are modes. The prompt is generic | Mode copy that asks what they think and what breaks, before filling the gap |
| Unknown cards | Partial | Type `unknown` and category `unknown` | Promote-to-question / attach-example as the resolve path. Home lists them |
| Misconception history | Partial | Type and category `misconception` | Query “what did I used to think about …?” over those cards. Do not delete by default |
| Examples as evidence | Partial | Evidence type and free tags | Reserved tag `example`. Do not mark fact unless they accept it |
| Practice gaps | Not built | Practice mode only | A list: concepts with no example, hypotheses never challenged, unknowns that block the next concept |
| Explain at another depth | Not built | Explain mode | Shorter or fuller body on the same node. No second curriculum |
| Personal overlay | Shipped | Create overlay branch | Point the student copy at “rival explanation.” Merge stays explicit |
| Resume | Not built | Transcript and timeline exist | Reopen on the last concept and the turn that produced it |
| Revision sheet | Partial | Generic report export | Sections: understand, confuse, misconceptions dropped, questions still open |
| Jump and search | Shipped | Header search on id, title, summary, body | — |

Out of scope here, and correctly absent: class graph, teacher merge, grading.

## Researcher

Home the docs want: *Which hypothesis or theory version is live, and what supports or weakens it?*

| Feature | Status | What exists | What to add |
| --- | --- | --- | --- |
| Live hypothesis home | Not built | Hypothesis and Theory types | Strip: live hypothesis or theory, supporters, weakeners |
| Falsify | Not built | Question and Experiment types | Action on a Hypothesis that stores the killing observation as a Question or Experiment |
| Literature on the node | Partial | Research mode, Citation type, attachments, AI can create citation nodes | Research attaches sources to the focused card. No separate library |
| Source fields | Partial | Evidence has title, summary, body, tags, attachments | Structured type, date, citation text. Retract or supersede without delete (category or version, not a new type) |
| Epistemic tags | Not built | Categories `speculative` and `supported`. Tags are free text | Reserved tags: fact, inference, estimate, speculation. Show them on the footer |
| Evaluation gate | Shipped | Theory create is rejected unless the source is an Evaluation | Surface accept / reject in the UI. Rejection should offer abandon plus a next hypothesis |
| Theory diff | Not built | `version` and `version-of` | Version-to-version: evidence added, assumption removed, claim changed |
| Contradiction inbox | Partial | Edge `contradicts`. Bottom panel Problems is a generic list | A Review list of contradicting pairs. Nothing auto-picks a winner |
| Experiment and observation | Partial | Both types exist | Fields for protocol intent, result, and whether it supported or weakened the hypothesis |
| Assumption break | Not built | Edge `assumes` is in the catalog | “What falls if this is false?” walks dependents |
| Load-bearing list | Not built | Graph can be queried | Assumptions and single sources the live theory depends on |
| Review before writing | Partial | Review mode forces a deep job. No checklist | Missing citation, weak evidence, overclaim vs Evaluation, unknowns the conclusion still uses |
| Abandoned and reused | Partial | Category `abandoned`. Edges `abandoned-because`, `resurrected-as`, `reused-in` | Actions and a cross-workspace “you had this before” hint. No abandon control in the UI today |
| Personal overlay | Shipped | Overlay branches | Label it as a rival theory |
| Paper draft | Partial | Generic report | Sections: question, established points with display ids, reasoning, dropped lines, still open |
| Jump and search | Shipped | Includes title text | Source title works only if it is on the card title or body |

## Inventor

Home the docs want: *What problem does this concept solve, and what new problems does it create?*

| Feature | Status | What exists | What to add |
| --- | --- | --- | --- |
| Design home | Not built | Constraint, Architecture, Decision types | Strip: binding constraint or open architecture decision, plus the new problem it creates |
| Constraint register | Partial | Type `constraint`, edge `constrains` | Relax / tighten, and the list of components and calculations bound |
| Target vs measurement | Partial | Types `target` and `observation`. Default category for a target is `speculative` | Explicit convert-to-observation. The model must not promote a wish |
| Calculation chain | Partial | Type `calculation`, edge `calculated-from` | Inputs, method, output, dependents, recompute when an input version changes. Tag `estimate` vs measurement |
| Architecture versions | Partial | Architecture, Component, `version` | BOM as the component set of an Architecture. Diff: part added, part dropped, why |
| Design artifact | Partial | Type and card shell | Sketch or sheet on the card. Extract claims and link them to a region. The image is not the measurement |
| Datasheet evidence | Partial | Attachments on any card | Attach vendor numbers to the Component or Hypothesis they bear on |
| Bench note | Partial | Observation type | Date, setup, result, and which hypothesis or target it supports or weakens |
| Failure modes | Partial | Critique and Hypothesis types | Keep them when the architecture version changes |
| Decision log | Partial | Decision type. Provenance fields on the card. Timeline | A walk: choice, alternatives, reason, evidence, including a later reversal |
| What-if overlay | Shipped | Overlay branches | Label it as an alternate architecture (DLP vs LCD) |
| Feasibility evaluation | Partial | Same Evaluation gate as Researcher | Inventor copy: no “this works” theory before an accepted Evaluation |
| Reuse on the next build | Partial | Edge `reused-in` | UI to pull a card from another workspace on the same account |
| Design note export | Partial | Generic report | Sections: problem, constraints, current architecture, open targets, decisions, killed options |

Out of scope, and correctly absent: CAD, PLM, purchasing.

## Explorer

Home the docs want: *What thought is growing, and what should we not pretend to know?*

| Feature | Status | What exists | What to add |
| --- | --- | --- | --- |
| Growing-thought home | Not built | Thought type | Strip: the thought that is thickening, and what must stay unknown |
| Stay a thought | Partial | Thought type. Type can be changed from the card | Promotion to Concept or Hypothesis is an explicit act, not the default AI move. Prompt weight, not a new type |
| Unknown inventory | Partial | Unknown type | A queryable list. Not a failure count |
| Epistemic footer | Not built | Category `speculative` | Tags speculation, thought-experiment, and later evidence-backed claim look different on the card |
| Implication walk | Partial | Explore mode | Follow what the idea forces, including new problems, without opening a Theory |
| Analogies | Partial | Edges and `reused-in` | Link to other cards, including abandoned ones |
| Light by default | Partial | Ordinary turns are not deep. Review is deep | Do not run a full critique unless they ask. Explorer default mode is Explore, not Review |
| Dead ends | Partial | Category `abandoned` | Show why it stopped. Abandon action, not delete |
| Personal overlay | Shipped | Overlay branches | A wild branch that does not overwrite the main speculation |
| Handoff | Partial | Persona is editable in settings. Reports can be exported | Changing persona, or cloning to a Researcher or Inventor workspace, is a deliberate step. Evidence does not become a paper by itself |
| Snapshot of the wonder | Partial | Generic report | Sections: thought, concepts, unknowns, assumptions, what was dropped. No governing-thought deck |

## Product research

Same objects as Analyst and Inventor. The missing pieces are labels, tags, and a few actions.

| Feature | Status | What exists | What to add |
| --- | --- | --- | --- |
| Problem pin | Not built | Question type | One pinned Question as the workspace problem |
| Opportunity bets | Partial | Hypothesis type and status via category | Alias “Bet” on this lens. Status visible on the home strip |
| Assumptions | Partial | Assumption type, edge `assumes` | “What breaks if this is false?” lists dependent decisions |
| Research evidence | Partial | Evidence plus attachments | Interviews, usage, competitor pages, pricing as Evidence on the bet |
| Heard vs concluded | Not built | — | Tag `heard` on a quote. `concluded` only on an Evaluation or Decision |
| Do-not-quote | Not built | The model is told not to quote private notes. That is not a card tag | Sensitivity tag that export skips |
| Experiment | Partial | Experiment and Observation types | Test intent (interviews, prototype, landing page) and the observation that came back |
| Critique | Partial | Critique type | Structured doubt on a bet before it becomes a decision |
| Decision | Partial | Decision type and versions | Build, defer, or kill, with alternatives kept |
| Killed bets | Partial | `abandoned`, `reused-in` | Abandon-with-why, and revive into a later workspace |
| Outcome | Not built | No Outcome type. Report prose mentions evaluation outcome | Write what happened back onto the Decision. A field or a linked Observation is enough. A new type can wait |
| Personal overlay | Shipped | Overlay branches | Rival product shape |
| Decision replay | Partial | Timeline, provenance message ids, edges | Months-later walk: why not X, which interview weakened it, which constraint still holds |
| Solo brief | Partial | Generic report | Sections: problem, live bets, evidence, open assumptions, decisions, killed ideas |

## Build order

These are the unimplemented features worth doing, in an order that serves all five files without a new shell.

1. **Persona presentation map.** Promoted types, display aliases, default mode, home question. This is the terminology fix. No schema change.
2. **In-workspace home strip.** Four questions (Student, Researcher, Inventor, Explorer). Product research uses the Analyst or Inventor question plus a pinned Question. Lists are filters on types and categories that already exist.
3. **Reserved tags and footer chips.** `example`, `fact`, `inference`, `estimate`, `speculation`, `heard`, `concluded`, `do-not-quote`. Export honors `do-not-quote`.
4. **Abandon, resurrect, and contradiction list.** Wire the category and the edges that are already legal. Review shows contradicting pairs.
5. **Card actions the object model already names.** Falsify, assumption break, convert target to observation, start evaluation, accept or reject theory. One action set, promoted by persona.
6. **Persona report sections** on the existing exporter. Revision sheet, paper draft, design note, snapshot of the wonder, solo brief.
7. **Version diff and theory diff.** Needs a real version history UI on top of `version` and `version-of`.
8. **Calculation recompute and architecture/BOM diff.** Inventor-only behavior on types that already exist. Heavier than the rest. Do it after the home and the actions.
9. **Resume and cross-workspace `reused-in`.** Last focused card. Search the account’s other workspaces when a new card resembles an abandoned one.
10. **Research-mode attach.** Literature lands on the focused node as Evidence or Citation. Still not a library.

Leave class graphs, co-author review, CAD, and a Product persona out. Those are named as out of scope in the use-case files.

## What not to do

- Do not add a persona switcher in the activity bar that replaces Objects / Chat / Timeline with a different app.
- Do not rename stored types per persona. Aliases are labels. `H-017` stays a hypothesis so jump, edges, and a later persona change still work.
- Do not hide the full catalog. Promote a short list, keep All types.
- Do not add Product as a sixth dropdown value. Pin a Question and alias Hypothesis as Bet on Analyst or Inventor.
- Do not treat chat mode as a substitute for the home. Mode is how the model behaves this turn. The home is what this project is.
