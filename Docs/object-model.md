# Object model

The graph is the underlying data structure. These objects are the product.

Nothing is stored only as a paragraph in a note if it can be a typed node.

**Cards are nodes. Relationships are edges.** Those are not interchangeable.

Every card is a uniquely identifiable, versioned **node**: **compact** on the graph (header / short body / footer), **full page** when opened (complete persisted AI body). A Relationship is a typed **edge** between two cards. It is not a card and does not open a page.

The Angular graph view renders cards as ngDiagram nodes and relationships as ngDiagram edges. The canvas must be **zoomable and pannable**. See [technology-stack.md](./technology-stack.md).

## Identity

Each object has a stable id that never changes when the title, status, or version changes. **Rename does not mint a new node.** Split and merge do — those children are **derived** cards of the same type (derived concept, derived hypothesis, derived postulate via tag, and so on).

| Form | Example | Role |
| --- | --- | --- |
| Opaque id | `ros_hyp_8f3a…` | Persistence, URLs, edges |
| Display id | `H-001`, `C-017`, `K-005`, `DA-001` | Human, jump-to-object |
| Type | `hypothesis` | One per card. Card component, actions. Display may read "Derived hypothesis" |
| origin | `original` \| `derived` | How the node was born. Orthogonal to object_category |
| derived_via | `split` \| `merge` | Set only when origin is `derived` |
| derived_from | `[H-001]` | Parent id(s). Lineage, not a second type catalog |
| object_category | `active`, `abandoned`, `misconception` | One per object. Color, symbol, and meaning |
| Tags | `thermal`, `target`, `estimate`, `postulate` | Many per card. Associatable, queryable |
| Workspace | `ws_prism_projector` | Scope |
| Branch | `br_main` | Cards live on a branch |
| branch_role | `mainstream` \| `overlay` | Required at branch create; dropdown, no default |
| overlay-on | `C-010` | Overlay card pointing at a Mainstream card |
| Version | `v0.2` | Which snapshot the card is showing |
| source_user_message_id | `msg_u_…` | Transcript id of the **user question** that produced this version |
| source_assistant_message_id | `msg_a_…` | Transcript id of the **AI reply** that wrote this version |

Jump-to-object (`H-001`, `why Pi Zero`) resolves display id or text to the opaque id, then pans and zooms the camera to that **card** (a node).

A Relationship has its own id (`R-014`, type `supports`) and may carry edge attributes (why this link exists, who asserted it, confidence). It is still an **edge**, not a card. Selecting it can highlight the edge and its two endpoint cards. It does not become a third card.

## Cards

The card is the UI atom. Same object, three faces. Shell: [workspace-ui.md](./workspace-ui.md) (VS Code–style panes).

| Face | Where | Shows |
| --- | --- | --- |
| Compact | Graph node | **Header** (id, **type control**, title, category, version, **+ / ⋯**). **Body:** a few sentences (`summary`). **Footer:** tags + chat-ref. |
| Full page | Center editor tab | Same **header actions**, elaborate **body**, chat **References**, provenance, version diff. |
| Inspector | Right-rail peek | Fields without leaving the Graph tab. Not a substitute for the full page. |

Rules:

- Every **node** type in the table below is a card. Relationship is the edge type. It is not a card.
- Compact body is **not** the full model essay. Store `summary` (2–4 sentences) and `body` (full text from the generating assistant message, then HEAD if edited). `SIMPLE` may refresh `summary` when `body` changes.
- Every version of a card **references both chat messages**: the user question and the AI reply that produced that version. See [Chat references](#chat-references).
- Click / open on the canvas **opens the full page** (new tab). Select-only highlights the node and may fill Inspector.
- Tags (epistemic and related) render as **chips/badges on the card footer**. Fine-tune density once the UI exists. They do not live in the title or the app chrome.
- `object_category` is shown as a **color and/or symbol** on the card (not another footer chip). Fine-tune the palette when the UI exists.
- Cards are **versioned**. The default face is `HEAD`. The user can pin or diff any prior version without mutating history.
- Creating a new version does not destroy the old card; `version-of` links them.
- A Design Artifact card can preview the sheet; claims extracted from it are other cards, not captions on the image.

## Chat references

A card is not an orphaned essay. Each **version** points at the transcript pair that created or last regenerated it:

| Field | Points at |
| --- | --- |
| `source_user_message_id` | The user’s question (or instruction) for that turn |
| `source_assistant_message_id` | The AI message that generated or updated this card |

Both ids are required when the card (or version) came from Chat. A user-minted card with no talk has both null (`origin` still `original`; no fake messages).

```text
User  14:02   Can the optical engine fit within the proposed head?
Ideate 14:02  …creates H-017, C-041…

H-017 v1
  source_user_message_id      → that 14:02 question
  source_assistant_message_id → that 14:02 reply
```

Rules:

- One turn may mint many cards. Each card stores the **same pair** (that question + that reply).
- A later question that revises the idea writes a **new version** with a **new pair**. The old version keeps the old pair. Diff can show “asked then / asked now.”
- Delete-as-batch of a mis-directed reply uses `source_assistant_message_id` to collect every card and edge from that message.
- UI must be able to jump **card → both messages** (Chat rail scroll + highlight) and **message → cards created**.
- Compact card: a small chat-ref control (timestamp or icon) that opens those two messages. Do not paste the full question on the canvas.
- Full page: a **References** block with both messages (timestamp, role, excerpt, “Open in Chat”). The elaborate `body` is the idea text; it does not replace the stored user question.

The transcript remains the system of record for wording. The card stores **ids**, not a second copy of the whole thread (excerpts in the UI are loaded from the transcript).

## Graph mapping

| Kind | Object types | ngDiagram primitive |
| --- | --- | --- |
| Node | Thought, Concept, Unknown, Question, Hypothesis, Assumption, Evidence, Experiment, Observation, Claim, Critique, Decision, Evaluation, Theory, Misconception, Workspace, Constraint, Calculation, Target, Design Artifact, Architecture, Component | Custom node component per type |
| Edge | Relationship (including `version-of` as a type) | Custom edge with a label; not a card |
| Group (later) | Theory, Architecture, Calculation chain, Workspace cluster | Nested group |

Version is **not** a separate floating node by default. It is a stack on the card plus `version-of` edges the user can reveal.

## Actions and behaviours

Shared by every card. **Type, New node, and New branch live on the [card header](./workspace-ui.md#header-actions)** so the user can do them without Chat.

- Open full page (center tab) — not from the header menus
- Jump here (focus camera)
- Peek inspector (right rail)
- **Change type** (header type ▾) — same node, new type; opaque id unchanged
- **New node from this** (header +) — mint a related card; user picks type
- **New branch from this** (header +) — Mainstream \| Overlay dropdown, required
- Promote / demote along the lifecycle (when legal; also via type ▾)
- Attach evidence or a note-event
- New version
- Diff versions
- Change `object_category`
- Abandon / resurrect
- **Delete** (junk or mis-directed AI output; undoable)
- Copy display id
- Open in Chat (scroll the right rail to the referenced user + assistant messages)

Type-specific (illustrative, not complete):

| Type | Extra actions |
| --- | --- |
| Thought | Keep · Promote to Concept · Promote to Hypothesis · Discard |
| Unknown | Promote to Question · Promote to Hypothesis · Mark resolved |
| Hypothesis | Add prediction · List dependents · Critique · Set confidence · AI: start Evaluation |
| Evaluation | Record outcome · AI: propose Theory or reject / new Hypothesis |
| Assumption | "What breaks if this is false?" |
| Evidence / Paper | Extract claims · Retract / mark superseded |
| Decision | Show alternatives · "Why did we choose this?" |
| Constraint | Relax · Tighten · Show what it binds |
| Calculation | Recompute · Show chain · Mark estimate vs measurement |
| Target | Convert to measured Observation (explicit act) |
| Design Artifact | Extract objects · Link claim to region of the sheet |
| Architecture | Diff BOM · Add component · Fork version |
| Misconception | Explain evolution of understanding |
| Theory | Branch · Merge · Review mode |

Edge actions (not card actions): change type, reverse, detach. They operate on the relationship, not on a card.

Personas do not remove actions. They change which actions are promoted on the compact card.

## Aggressive generation, user override

The AI **generates** cards and edges as soon as it can (conversation, concept sheet, paper). It does not wait for the user to click Promote.

The user always has override (header menus, not only Chat):

- Edit any field
- **Change type** from the card header (Concept ↔ Hypothesis, etc.)
- **New node** / **New branch** from the card header
- Merge into an existing card
- **Delete** junk nodes, bad edges, or a mis-directed AI response (the whole generation from that turn)
- Undo delete

**Delete** is how the graph stays clean. It is not the same as **Abandon**. Abandon keeps a tested-and-dropped idea as history. Delete removes a weak or wrong suggestion from the working graph.

A mis-directed assistant reply can be deleted as a **batch** (every card and edge that reply created), so the user does not hunt nodes one by one.

Deleted items are not the system of record. Undo is enough for mistakes; we do not keep junk as first-class history.

Generation aggressiveness can later be an application setting; the default is aggressive. The junk-drawer control is **delete + override**, not a timid AI.

## Full catalog, tags where needed

v0 includes **all** types in the table below. We will fine-tune later. Some names may be implemented as **associatable tags** on a more generic card rather than a dedicated node type — that is an implementation choice, not a smaller vocabulary.

Rules:

- Each card has **exactly one type** (it is a Thought or a Hypothesis, not both).
- Each card or edge may have **many tags**.
- Tags are first-class associations: searchable, attachable, removable. They do not replace relationships.
- Epistemic labels (Fact, Inference, Speculation, Target, Estimate, …) are one tag family. Topic and role labels (`optics`, `thermal`, `bom`) are another.
- If a catalog name is realized as a tag for a while (e.g. Target on a Claim), it can be promoted to its own type later without renaming the idea.

```text
Card H-004  type: Hypothesis
  object_category: active
  tags: estimate, thermal, brightness
  "3–5 W LED appears sufficient"
```

## object_category

Every object has **one** `object_category`. It is not a tag (tags are many). It drives UI color and a small symbol, and it is how we tell similar types apart without extra copy.

Starter values (fine-tune later):

| object_category | Meaning | Typical types |
| --- | --- | --- |
| `active` | Live, still in play | most cards |
| `abandoned` | Tried and dropped; kept as history | Hypothesis, Theory, Architecture, Decision |
| `misconception` | A prior belief that was challenged | Misconception, sometimes Concept |
| `supported` | Evaluated and held | Hypothesis, Claim, Theory |
| `speculative` | Explicitly unvalidated | Thought, Target, Constraint |
| `unknown` | I don't know yet — intermediate gap on a Concept | Unknown |

**Misconception vs abandoned hypothesis**

They are not the same story, so they do not share a category.

| | Abandoned hypothesis | Misconception |
| --- | --- | --- |
| Type | Hypothesis | Misconception (or Concept) |
| object_category | `abandoned` | `misconception` |
| What failed | A **claim you tested** and dropped | An **understanding you held** and then challenged |
| Example | H-14: passive durability is enough for 1000 years | M-17: heavier objects fall faster |
| Next | May `led-to` a new hypothesis | Explains learning history ("why did I think that?") |
| UI | Abandoned color/symbol | Misconception color/symbol |

An abandoned hypothesis is research data. A misconception is learning history. Both stay on the graph.

## Identity across rename, split, and merge

Do not add `derived_hypothesis` as a separate type in the catalog. Keep `type: hypothesis` (or concept, assumption, …) and set **`origin: derived`**. The UI label is **Derived {type}** — Derived concept, Derived hypothesis, Derived assumption. A "derived postulate" is the same pattern: type stays Assumption or Claim, tag `postulate`, origin `derived`.

| Operation | Identity | What is created |
| --- | --- | --- |
| **Rename** | Same opaque id, same display id | New **version**. Previous titles become aliases. Not a derived node. |
| **Split** | Parents keep their ids | One or more **new** cards, `origin: derived`, `derived_via: split`, `derived_from: [parent]` |
| **Merge** | Sources keep their ids | One **new** card, `origin: derived`, `derived_via: merge`, `derived_from: [sources]` |

```text
H-001  "Long-lived satellite"     origin: original
         │ split
         ├── H-002  Derived hypothesis   "Century-scale relay"     derived_via: split
         └── H-003  Derived hypothesis   "Millennial architecture" derived_via: split

C-010 + C-017  merge
         └── C-022  Derived concept  "Protected spherical long-life node"  derived_via: merge
```

Rules:

- Jump-to-object on an old name still resolves (aliases on the same id after rename).
- Derived cards are first-class nodes: versioned, tagged, categorized, linkable.
- `object_category` is independent (`derived` + `abandoned` is allowed — a split-off hypothesis you later drop).
- Edges: `derived-from`, `split-from`, `merged-from`, `merged-into`.
- The AI may propose split/merge; the user accepts. Same as Evaluation / Theory.

Queryable: "Show every card derived from H-001." "What did C-010 and C-017 merge into?"

## Mainstream vs overlay branches

A workspace is one project. Inside it, **branches** carry the cards.

Specify the kind when the branch is created — required dropdown, nothing pre-selected:

| branch_role | Meaning |
| --- | --- |
| `mainstream` | Canonical graph for this project. Exactly one per workspace. Created with the workspace. |
| `overlay` | Private or experimental layer. Must name the Mainstream as parent. Never writes Mainstream without an explicit merge/promote. |

v1 ships both **clone** (new workspace from Mainstream snapshot) and **overlay** (new branch on this workspace). The card header **New branch** starts that flow from the selected node (branch tip / seed). See [learning-mode.md](./learning-mode.md#clone-and-overlay-both-in-v1) and [workspace-ui.md](./workspace-ui.md#header-actions).

## Concept evolution and "I don't know yet"

"I don't know yet" is an **intermediate state card** on the evolution of a Concept. It is not only an epistemic chip and not a missing field.

```text
Thought → Concept → Unknown → Hypothesis → Evaluation → Theory
                         ↘ Question
```

A Concept can have many Unknown cards at once (throw ratio, thermal load, lifetime). Each is a node: uniquely identifiable, queryable (`object_category: unknown`), color/symbol like other categories.

| | Question | Unknown |
| --- | --- | --- |
| Role | Something we are asking | Something we **cannot** answer yet |
| Example | What throw ratio is required? | I don't know yet whether electronics can last 1000 years |
| Next | May become a Hypothesis | May become a Question, Hypothesis, or stay for years |

The AI creates and updates Unknown cards as it walks the graph (same dynamic style as Evaluation). The user accepts, amends, or dismisses. Resolving an Unknown is an explicit act: promote to Question or Hypothesis, or attach Evidence that closes the gap.

Queryable: "Show every Unknown in this workspace." "Which Unknowns sit on Concept C-010?"

## Hypothesis → Evaluation → Theory

A Theory **does not exist** before Evaluation. There is no "Theory v0.1" that is only a guess. A guess is a Thought or a Hypothesis.

Standard path (AI-driven, dynamic):

```text
Hypothesis  →  Evaluation  →  Theory
     │              │
     │              ├─ supported → AI proposes Theory (user can accept)
     │              └─ rejected  → object_category: abandoned
     │                              → AI may propose a new Hypothesis
     └─ (never skip Evaluation)
```

Rules:

- A human or the AI may create a Hypothesis. Only the **AI system** proposes Evaluation and, after it, Theory. The user accepts, amends, or dismisses the proposal.
- Evaluation is a card. It points at the Hypothesis, the evidence/experiments/calculations used, the outcome, and why.
- The AI starts or updates Evaluation as the graph changes (new evidence, contradiction, failed experiment). It is not a one-shot form.
- Promotion to Theory requires an Evaluation whose outcome is **supported**. Formal papers are not required; a reasoned Evaluation is.
- A Theory can then version, branch, and spawn new Hypotheses. Those new Hypotheses need their own Evaluation before they join or replace the Theory.

```text
H-001  "Compact engine can throw a useful short-throw image"
        │
        ▼
EV-001  Evaluation (AI)
        used: datasheets, throw calculation, thermal estimate
        outcome: supported under reduced image-size assumption
        │
        ▼
TH-001  Theory v1.0
```

Tune how aggressive the AI is (when to open Evaluation, when to propose Theory) as **application settings** after a prototype — same as AI refusal.

## First-class objects

| Object | Graph | Role |
| --- | --- | --- |
| Thought | Node | Seed. May stay unstructured for years. |
| Concept | Node | Named idea with aliases, parents, children, status |
| Unknown | Node | Intermediate "I don't know yet" on a Concept's evolution; queryable |
| Question | Node | Implicit or explicit question extracted from thinking |
| Hypothesis | Node | Testable statement with predictions and status |
| Assumption | Node | Dependency a theory or design rests on |
| Evidence | Node | Paper, experiment, simulation, interview, measurement, dataset, observation |
| Experiment | Node | Linked dataset, parameters, metrics, observations, conclusion |
| Observation | Node | Result that can support or weaken a claim |
| Claim | Node | Asserted statement, preferably grounded |
| Critique | Node | Structured challenge against objects in the graph |
| Decision | Node | Choice with reason, alternatives, owner, evidence |
| Evaluation | Node | AI-driven assessment of a Hypothesis; required before a Theory |
| Theory | Node | Versioned body of connected claims; exists only after Evaluation |
| Misconception | Node | Prior belief that was challenged, kept as learning history |
| Relationship | Edge | Typed, identifiable link between two cards — not itself a card |
| Version | On card | Immutable snapshot of an idea's change with who / why / delta |
| Workspace | Node | One project; required persona at creation; **clonable**; contains one Mainstream branch and any Overlay branches |
| Branch | Container | `branch_role`: **mainstream** \| **overlay** (required dropdown at create). Cards live on a branch |
| Constraint | Node | Size, cost, power, or scope limit that can be challenged or relaxed |
| Calculation | Node | Typed estimate or derivation with inputs, method, output, and dependents |
| Target | Node | Desired performance, cost, or size — never automatically a fact |
| Design Artifact | Node | Concept sheet, sketch, CAD, photo; claims extracted and linked |
| Architecture | Node | Versioned component set (BOM + mechanical/optical/electrical choices) |
| Component | Node | A part or module in an Architecture (Pi Zero, DLP engine, battery) |

## Concept

Example shape:

```text
Quantum Entanglement
Type:        Concept
Confidence:  0.93
Status:      Accepted
Parents:     Quantum Mechanics
Children:    Bell Inequality, Teleportation
Aliases:     EPR Correlation
```

## Hypothesis

```text
H-2187
Statement:   LLMs construct internal world models rather
             than statistical lookup tables.
Status:      Active
Confidence:  0.62
Predictions: 12
Supporting:  48
Contradictions: 9
Experiments: 15
```

Abandoned hypotheses stay in the graph:

```text
H-14
Type:             Hypothesis
object_category:  abandoned
Reason:  Passive durability alone is insufficient
         for millennial operation.
Evidence: E-71, E-88
Led to:   H-27 Autonomous maintenance architecture
```

## Assumption

```text
A-87
Transformer attention is sufficient for reasoning.
Status:     Unverified
Used by:    42 hypotheses
Confidence: 0.54
```

If an assumption is invalidated, the system should be able to ask: which hypotheses become invalid?

## Evidence

Each evidence object is searchable and typed:

- Paper
- Experiment
- Simulation
- Interview
- Measurement
- Dataset
- Observation

A paper is not a PDF blob. It becomes a graph:

```text
Paper → Claims → Methods → Datasets → Experiments
      → Limitations → Future work
```

## Literature is attachment, not a library

Ideate is **not** a Zotero clone. There is no first-class bibliography, folder of PDFs, or citation manager as the product.

Meaning still lives on **attachments on explored nodes** — typically Evidence (or a Design Artifact) linked to the Concept, Hypothesis, Unknown, or Evaluation they bear on.

The workspace also has a **Documents** explorer tree: engagement-scoped folders the user maintains, mostly **links** to SharePoint-class stores. That tree is how the team organizes files for this project. It is not a tenant bibliography. Opening a document is an ACL’d editor tab. **Attach to card** is what puts a file on the graph. See [workspace-ui.md](./workspace-ui.md#documents-engagement-collection).

The **AI does most of the literature work**: find, read, attach, extract claims, open Evaluation, propose new cards, evolve the workspace. The user overrides, deletes junk, and accepts Theory proposals.

Stop adding firm-wide library features when they do not attach to a node or change the graph. A standalone “My papers” product is out of scope.

## Decision

```text
Decision:  Use Bayesian inference instead of frequentist testing.
Reason:    Small sample size.
Evidence:  Paper X
Owner:     Research team
Status:    Accepted
Alternative considered: ...
```

Six months later the AI can answer: "Why didn't we choose GNN?"

## Epistemic tags

Every claim-bearing object should carry an epistemic tag. Theoretical work especially must not flatten these. On the card they appear as footer chips, not as extra headings:

| Tag | Example |
| --- | --- |
| Fact | Geostationary satellites can remain operational for decades. |
| Inference | A substantially longer lifetime may be possible through redundancy and maintenance. |
| Hypothesis | A satellite architecture could potentially operate autonomously for centuries. |
| Speculation | A sufficiently robust architecture might remain functional for ~1000 years. |
| Open question | Can electronic systems realistically survive 1000 years without physical repair? |
| Target | 200 ANSI lumens (concept sheet). Desired, not measured. |
| Estimate | Prototype cost ₹9,000–₹10,000, given supplier assumptions. |

Inventor work dies if Targets and Estimates are stored as Facts. The projector benchmark exists to keep that distinction honest. See [design-benchmark-prism-projector.md](./design-benchmark-prism-projector.md).

The hardware names (Constraint, Calculation, Target, Design Artifact, Architecture, Component) stay in the catalog. A Calculation can still be Evidence-with-a-derivation underneath; a Target can start as a Claim with tag `target`. Fine-tune during the build. Do not drop them from the vocabulary.

## Relationships

Minimum useful edge types:

- mentions
- parent-of / child-of
- supports
- contradicts / challenges
- assumes
- tested-by
- evaluated-by (Hypothesis → Evaluation)
- promoted-to (Evaluation → Theory)
- produces
- affects
- solves / introduces (failure modes, constraints)
- led-to
- version-of
- abandoned-because
- resurrected-as
- constrains
- calculated-from
- represented-by (artifact → objects)
- reused-in (cross-workspace; abandoned projector → wearable display)
- derived-from
- split-from
- merged-from / merged-into
- overlay-on (overlay card → mainstream card)
- branched-from (overlay branch → mainstream branch)

## Confidence and provenance

Confidence is not a decoration. It should propagate.

If evidence with confidence 0.95 is the only support for a hypothesis, the hypothesis confidence should update. If a paper is retracted, a measurement is corrected, or a personal belief changes, the affected subgraph updates — **never silently**.

The user gets a **notification** that lists **every relevant object** being changed (ids and titles). They can open any item from that list. The same batch can be reviewed or undone.

```text
Propagation
Cause:  Paper P431 retracted
Changing:
  H-018  Adaptive latency hypothesis
  A-12   Long-term power assumption
  EV-001 Evaluation of H-001
  TH-001 Theory v1.0
```

Every change records:

- who changed it
- `generated_by` provider/model (provenance only; ids do not depend on vendor)
- `source_user_message_id` and `source_assistant_message_id` (the question and the reply)
- why
- evidence added or removed
- confidence delta
- assumptions changed

You should be able to **diff a theory**.

```text
Theory v5
Added:     Evidence E213, Experiment X18
Removed:   Assumption A14
Confidence: 0.71 → 0.82
```

## Knowledge version control

Competing theories can coexist:

```text
Branch: Alternative Theory
  → Merge
  → Main Theory
```

Version spine example from the satellite benchmark:

| Version | Idea |
| --- | --- |
| v0.1 | Can a satellite remain operational for 1000 years? |
| v0.4 | Long lifetime requires redundancy rather than merely durable components. |
| v0.8 | Long-lived architecture should contain multiple independent functional layers. |
| v1.0 | A century-scale relay is conceptually plausible under specified assumptions. |
| v1.5 | Millennial-scale operation requires architectural self-maintenance rather than passive durability. |

The original thought remains immutable.

Architecture / BOM spine from the projector benchmark:

| Version | Idea |
| --- | --- |
| v0.1 | Can a tiny battery projector be made? |
| v0.8 | Pi Zero 2 W + DLP Pico + 3–5 W LED + 5000 mAh + card-sized base |
| v0.9 | Different compute and optical engine after brightness/thermal evidence |

## Queries the object model must support

These are the product, not extras:

- Show every hypothesis affected by this paper.
- Which assumptions become invalid if this result is true?
- Find contradictory evidence published after 2024.
- Why did we abandon this direction?
- Why did I originally believe heavier objects fall faster?
- What problem is this new concept actually solving?
- Find every paper using contrastive learning with fewer than 500 samples.
- Why did I originally choose the Pi Zero?
- Which constraints break if LED power increases?
- Show the calculation chain from throw distance to battery life.
- Which later project reused the abandoned projector's thermal work?
- Show every Unknown in this workspace.
- Which Unknowns sit on Concept C-010?
- What user question created H-017? What did the AI reply?
- Which cards did assistant message `msg_a_…` create?

## Conversation and graph together

The **whole conversation is persisted** (transcript, turns, attachments). It is not thrown away after extraction.

**As much as possible** is also pre-materialized as objects while the conversation runs — aggressive generation, not a later batch job.

```text
Conversation (persisted in full)
  → cards and edges created as the talk evolves
  → user may edit the graph at the same time
      tag, attach a doc, branch, add a node, delete junk
  → Version / Evaluation / Theory proposals
  → Future AI reasoning uses both transcript and graph
```

The graph is the system of record for *ideas*. The transcript is the system of record for *what was said*. Both are first-class. Every AI-born card version **links both sides of the turn** ([Chat references](#chat-references)).

The user and the AI can update the graph **simultaneously**: tagging, attaching literature, creating an Overlay or Mainstream-related branch from a card, minting another node if the content warrants it. Conflicts: last explicit user override wins; AI generation of the same turn can be undone as a batch.

The shipped product has **no seeded graphs**. The user starts from an empty workspace and builds objects from conversation.
