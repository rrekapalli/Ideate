# Java backend AI runtime

How the **Java 25 API** must spend tokens so Ideate stays solvent. Local **PostgreSQL + Apache AGE + pgvector** is the memory. ChatGPT, Grok, Copilot, and **Ollama** are interchangeable inference. The model is never the store.

No application code yet. This file is the contract the first backend scaffold must follow. Stack: [technology-stack.md](./technology-stack.md). Agents: [architecture.md](./architecture.md). Objects: [object-model.md](./object-model.md).

## Why this exists

A product that dumps the whole project into a frontier model on every turn can cost **₹10–15+ lakh/month** at 1,000 serious users (two projector/satellite-scale workspaces each). The same users, with graph-as-memory, routing, cache, and batch, land nearer **₹3–6 lakh/month all-in**. That gap is an API design problem, not a later ops tweak.

**The LLM is not the memory.** AGE + pgvector + the object model are. The model receives a **current project state** (2–5K tokens), not the entire transcript, graph, papers, and prior answers.

Optimize for **AI cost per unit of intellectual value created** (concepts, hypotheses, evidence links, theory revisions that persist), not cost per chat message.

## 1,000-user planning model

Assumptions (design-benchmark intensity, not casual signups):

| Input | Value |
| --- | --- |
| Users | 1,000 genuinely active |
| Workspaces / user | 2 (Prism-class + satellite-class) |
| Meaningful AI turns / workspace / month | 50 |
| Turns / month | **100,000** |

Figures below are a **planning range**, not a vendor quote. Model names and list prices move; Java must read them from a **price table**, not constants in code.

### Naive (do not build)

Every turn sends the whole conversation + graph + evidence + system prompt.

| | Tokens | At “Sol-class” ~$4 / $20 per M |
| --- | --- | --- |
| Input | 100k × 20K = 2,000M | ~$8,000 |
| Output | 100k × 4K = 400M | ~$8,000 |
| **LLM only** | | **~$16,000 / month (~₹14–15 lakh)** |

Plus search, embeddings, Postgres, app hosts. This architecture is rejected.

### Intended (build this)

Average assembled context **~8K in / 2K out**. Route by job class:

| Share | Class | Planning model | ~Monthly LLM |
| --- | --- | --- | --- |
| 70% (70k) | `SIMPLE` | Luna-class ~$0.20 / $1.20 per M | ~$280 |
| 25% (25k) | `NORMAL` | Terra-class ~$2 / $12 per M | ~$1,000 |
| 5% (5k) | `DEEP` | Sol/Astra-class ~$4–10 / $20–50 per M | ~$360+ |
| | | **LLM core** | **~$1,640 / month (~₹1.4–1.5 lakh)** |

### All-in early production budget (1,000 heavy users)

| Component | Monthly (INR, planning) |
| --- | --- |
| LLM inference | ₹1.5–3 lakh |
| Web / search / research APIs | ₹50k–₹1.5 lakh |
| Embeddings | ₹10k–₹30k |
| PostgreSQL / Redis / object store | ₹30k–₹75k |
| App / API hosts | ₹25k–₹75k |
| Monitoring | ₹10k–₹25k |
| **Total** | **~₹2.75–6.5 lakh** |

Revenue at ₹199/month × 1,000 = ₹1.99 lakh → **underwater**. Do not sell unlimited frontier research at note-app prices. See [Credits and plans](#credits-and-plans).

1,000 × ₹999/month ≈ ₹10 lakh revenue is the first plan that can hold this usage.

## What the Java API must never do

- Send the full transcript, full AGE graph, or full attachment text on a normal turn.
- Call a `DEEP` model to title a card, tag a thought, or embed a paragraph.
- Call providers from Angular. Keys and local base URLs stay on the server.
- Treat “the user has ChatGPT Plus / Copilot / Grok” as a server-side token source. **Consumer subscriptions are not an API.** See [Providers](#providers).
- Hard-code a vendor or a price. Adapters + a versioned `model_price` table.
- Let an expensive model read 50 raw web pages. Cheap extract → rank → then reason.
- Skip the usage row. Every model call writes **tokens, model, cache hits, retrieval, search, estimated cost** against a **workspace**.

## Request path

```text
Angular
  POST /v1/workspaces/{id}/turns
Java API
  1. Auth + credit check
  2. Persist user utterance (full transcript, always)
  3. Classify job → SIMPLE | NORMAL | DEEP | BATCH
  4. Assemble context from AGE + pgvector (not from chat history dump)
  5. Route → provider adapter (cloud API or Ollama)
  6. Persist assistant message; validate tool JSON → graph writes
     (each new/updated card version gets this turn’s user + assistant message ids)
  7. Ledger row + credit debit
  8. Return objects + assistant text
```

Background (no user wait):

```text
User stops working
  → project state already in Postgres
  → enqueue BATCH job
  → cheap/batch/flex rates
  → morning notification (contradictions, missing links, papers)
```

The graph may be edited by the user while a job runs. Jobs apply through the same graph engine (conflict = version, not silent overwrite).

## Suggested Java shape

Package the first service so routing and ledger cannot be bypassed:

| Package | Responsibility |
| --- | --- |
| `api` | REST: turns, jobs, usage, credits, settings |
| `graph` | Object CRUD, AGE Cypher, versions, tools (`create_node`, …). Stamp `source_user_message_id` + `source_assistant_message_id` on every AI write. |
| `context` | Assemble `ProjectState` (graph projection + **current evolving cache** + tail) |
| `retrieval` | pgvector k-NN + AGE neighborhood; never “load workspace” |
| `orchestrator` | Mode + persona → which specialist agents |
| `routing` | `JobClass` → `ModelTier` → concrete model id |
| `providers` | `ChatClient` adapters: OpenAI, xAI, GitHub Models / Azure (Copilot-adjacent), Ollama, generic OpenAI-compatible |
| `jobs` | Sync turn vs queued batch (re-evaluate graph, literature sweep) |
| `usage` | Immutable ledger + workspace rollup |
| `credits` | Plan limits and debit |
| `embed` | **One** configured embedder → `embedding` column |

Do not expose “call GPT with this prompt” to the client. The client posts a **turn** or enqueues a **job**. The server chooses the model.

## Context assembly (graph is memory)

Postgres holds the transcript **and** the objects. The model sees a **projection**.

Target payload for a normal turn (~2–5K tokens, hard cap e.g. 8K before the user question):

```text
CURRENT PROJECT STATE
Objective: …
Active hypothesis: H-017
Relevant constraints: …
Relevant evidence: E-31, E-42, E-57   (ids + one-line claims, not PDFs)
Unresolved questions: Q-18, Q-21
Recent changes: H-017 edited yesterday
User question: Can the optical engine fit within the proposed head?
```

### How Java builds it

1. **AGE** — neighborhood of the active node / last-touched ids: constraints, supports/contradicts, open questions.
2. **pgvector** — embed the user utterance; retrieve top-k chunks and object summaries in the same workspace (and later `reused-in` from abandoned workspaces).
3. **Relational** — workspace objective, persona, mode, last N *object diffs* (not last N chat messages).
4. **Evolving conversation cache** — one current cheap-model summary of talk so far (see [Evolving cache](#evolving-cache)). Not the raw log.
5. **Transcript tail** — last 1–3 turns after the summary’s `covers_through_turn_id`. Older talk is cards + the summary; do not resend it.
6. **Attachments** — never the file. At most a stored extract on the Evidence card.

Prism-style follow-ups (fit → brightness → battery → LED → DLP vs LCD) should hit **stable prefix cache + replaced conversation summary + small tail**, not a growing paste.

Satellite-style “critically evaluate the whole theory” is a **`DEEP` or `BATCH` job** with a larger assembled subgraph, still not raw papers.

### Internal API (not a public dump)

```text
ProjectState assemble(workspaceId, focusObjectIds, utterance, tokenBudget)
```

Used by the orchestrator. A debug `GET` for staff is fine; Angular does not send a home-grown context blob.

## Job classification and routing

Classify **before** the provider call. User mode (Explore, Challenge, Review) biases the class; it does not pick the vendor.

| `JobClass` | Examples | Tier | Typical backend |
| --- | --- | --- | --- |
| `SIMPLE` | Title, tags, extract, obvious edges, **replace evolving cache**, metadata | Cheap / **local** | Ollama (Qwen-class) or Luna-class API |
| `NORMAL` | Research chat, hypothesis, evidence compare, learning, project summary | Mid | Terra-class; Grok; Copilot/GitHub Models mid |
| `DEEP` | Feasibility, contradiction sweep, theory revision, architecture review | Frontier | Sol/Astra-class; Grok heavy |
| `BATCH` | Nightly graph re-eval, literature sweep, “2-hour investigation” | Mid/frontier at **batch/flex ~50%** | Same adapters, async |

Example map (illustrative, not shipped names):

```text
                    USER TURN
                        │
                 AI ORCHESTRATOR
                        │
            ┌───────────┼───────────┐
            │           │           │
         SIMPLE      NORMAL       DEEP
            │           │           │
      Ollama / Luna   Terra      Sol / Astra
            │           │           │
      extract/tag    reason      critique /
      embed/title    synthesize  research
```

Never spend frontier output prices on “give this thought a title.”

Satellite routing example:

| User intent | Class |
| --- | --- |
| Normal question | `NORMAL` |
| Interesting hypothesis + retrieve | `NORMAL` + retrieval |
| Major architecture decision | `DEEP` |
| Critically evaluate entire theory | `DEEP` |
| Conduct a long investigation | `BATCH` multi-agent |

## Providers

One interface. Many adapters. Same tool schema (`create_node`, `create_edge`, `attach_file`, `start_evaluation`, `propose_theory`). Weak tool-callers: JSON schema validate before AGE writes.

```text
YOUR APPLICATION
        │
 MODEL ABSTRACTION  (Java ChatClient)
        │
 ┌──────┼──────────────┬──────────────────┐
 ▼      ▼              ▼                  ▼
OpenAI  xAI/Grok   GitHub Models /     Ollama /
API     API        Azure (Copilot)     LM Studio
```

### What “ChatGPT / Grok / Copilot subscription or Ollama” means

| User says | What the Java service actually calls |
| --- | --- |
| ChatGPT | **OpenAI API** (platform key or BYOK). ChatGPT Plus/Pro in the browser is not callable from this backend. |
| Grok | **xAI API** (same idea). |
| Copilot | **GitHub Models / Azure OpenAI** (or successor) with a **service principal or PAT that the API terms allow**. A Copilot IDE seat is not a multi-tenant inference pool. |
| Ollama / LM Studio | HTTP to a **base URL** the Java process can reach + model name. |

Account default + optional workspace override. Capability matrix in Settings (tools / vision / long context). Record `generated_by: openai:…` / `xai:…` / `github:…` / `ollama:qwen2.5` on the version. Ids do not depend on vendor.

**Ollama is the default `SIMPLE` (and optional embed) path** when a reachable local URL is configured. Frontier stays on a cloud API unless the operator points `DEEP` at a large local model (slow, still valid).

Hosted Ideate cannot see `http://localhost:11434` on the user’s PC. Dev and lab run against **Proxmox Postgres** (`pg18.tailce422e.ts.net`) plus a Java process (workstation or LXC 7201). Ollama is a URL that process can reach. SaaS needs a URL the cluster can route to, or platform keys.

Never bake the product around one model. Tomorrow’s cheaper mid-tier replaces Terra in the **price table + router**, not in the object model.

## Caching

Two layers. Do not collapse them.

| Layer | What | When it changes | Provider prefix cache |
| --- | --- | --- | --- |
| **Stable prefix** | Objective, persona, standing constraints, settled assumptions (graph projection) | Rarely (object edit) | Yes — keep bytes identical |
| **Evolving cache** | One conversation summary | After new talk | No — the text is replaced |
| **Volatile suffix** | Last 1–3 turns + current question + fresh object diffs | Every turn | Never |

Stable prefix still uses vendor cached-input rates (planning example: Luna $0.20/M vs $0.02/M cached). Persist `cache_key` / hit on the usage row.

The evolving cache is **prompt compression**, not a second memory. Full transcript stays in Postgres. AGE remains truth for ideas. If the summary and the graph disagree, **the graph wins**; the next refresh must follow the graph.

## Evolving cache

After a turn (or when the unsummarized tail exceeds a token budget), a **`SIMPLE` job** (Ollama / cheap API) writes a new summary from the **latest conversation + the previous summary**, then **replaces** the current cache. One current row per workspace (per branch). The old summary is not sent again.

```text
previous summary  +  new turns (since covers_through_turn_id)
        │
        ▼
   SIMPLE / Ollama
        │
        ▼
   new summary  →  becomes current
   old summary  →  superseded (kept for audit, not for the next prompt)
```

### Why replace, not append

Appending summaries grows like the naive transcript. Replacement keeps the conversation slice of the prompt roughly constant (target: a few hundred to ~1.5K tokens) while the project lives for months.

### What the summary is allowed to say

- What the user is currently trying to decide
- Which object ids were in play (`H-017`, `E-31`)
- Open threads that are **not** yet cards
- Explicit user preferences from chat (“ignore DLP for now”)

It must **not**:

- Invent hypotheses, evidence, or numbers that are not in the transcript or graph
- Duplicate the stable prefix (objective / constraints already in `ProjectState`)
- Become the write path for objects — extraction still goes through tools onto AGE

### When Java refreshes

| Trigger | Behavior |
| --- | --- |
| End of a `NORMAL` / `DEEP` turn | Enqueue `SIMPLE` refresh; **do not block** the user reply |
| Unsummarized tail > budget (e.g. 2K tokens) | Refresh before the *next* assemble if the last job finished; else send tail as-is |
| Graph write that contradicts the summary | Refresh (or mark stale) so the next turn is not steered by a dead gist |
| New overlay / Mainstream branch | Separate current cache per `branch_id` |
| Periodic rebase (BATCH, e.g. nightly) | Rebuild from **graph + last N turns**, not only from the previous summary (stops telephone-game drift) |

`assemble()` reads only `conversation_cache.current`. Stale-but-present is better than waiting on Ollama mid-turn.

### Fold-in prompt (SIMPLE)

```text
You update a workspace conversation cache.
Previous cache:
{old_summary}

New turns (authoritative):
{turns after covers_through_turn_id}

Graph ids mentioned must be copied verbatim. Do not add objects.
Replace the previous cache. Output the new cache only.
Token budget: {n}
```

### Schema

```text
conversation_cache
  id, workspace_id, branch_id
  summary_text
  covers_through_turn_id
  generated_by          -- ollama:qwen2.5, …
  status                current | superseded
  superseded_by
  created_at
```

One `current` per `(workspace_id, branch_id)`. Replacement is an insert + flip; do not UPDATE in place if you want audit. Ledger the `SIMPLE` tokens on the workspace like any other call.

### Drift

Recursive “summary of a summary” loses detail. Mitigations, day one:

1. Full transcript is never deleted.
2. Graph objects are never sourced from the cache.
3. Nightly (or every K replacements) **rebase**: cheap model summarizes *graph headlines + recent raw turns*, and that output **replaces** current the same way.
4. User can “reset conversation cache” in Settings (next turn uses tail + graph only until a new summary exists).

## Batch and background

Anything that can wait uses `BATCH`:

- Re-evaluate the projector graph tonight
- Find contradictions, missing evidence links, new papers, weak assumptions
- Full workspace review (Review mode, publication / exam / decision)

Queue after the graph is saved. Notify with a **list of object ids**, same rule as live propagation. Use provider batch/flex (~50% where offered).

## Literature / web cost control

Do not let `DEEP` read the retrieval pile.

```text
Web / search API
  → many documents
  → SIMPLE (extract passages)
  → dedupe / rank
  → NORMAL (evidence summaries → attach to cards)
  → DEEP only for final synthesis / theory impact
```

Each search, fetch, and embed is a ledger line (not only chat completions).

## PostgreSQL: ledger, credits, jobs

AGE holds the idea graph. **Relational tables** hold money and queues. Suggested first schema (names indicative):

```text
ai_job
  id, workspace_id, account_id
  class          SIMPLE | NORMAL | DEEP | BATCH
  status         queued | running | applied | failed
  mode, agent
  focus_object_ids[]
  created_at, finished_at

ai_usage_event          -- immutable
  id, workspace_id, account_id, job_id
  provider, model, job_class
  input_tokens, output_tokens, cached_input_tokens
  embedding_tokens
  search_calls, documents_fetched
  estimated_cost_minor   -- smallest currency unit, from model_price
  currency
  created_at

model_price             -- versioned; never hard-code in Java
  provider, model, effective_from
  input_per_m, output_per_m, cached_input_per_m, batch_factor

credit_account
  account_id, plan, balance, period_reset_at

credit_ledger
  account_id, workspace_id, job_id
  credits_delta, reason
  -- e.g. conversation 1, deep 5, literature 10, project review 20, large research 50

workspace_ai_settings
  workspace_id
  provider_override, model_override, ollama_base_url_ref

conversation_cache      -- one current per workspace+branch; see Evolving cache
  id, workspace_id, branch_id
  summary_text, covers_through_turn_id, generated_by
  status, superseded_by, created_at
```

Rollups the product and an acquirer both need:

```text
GET /v1/workspaces/{id}/usage
  Prism Project — ₹37.42 AI
  1000-Year Satellite — ₹214.80 AI
```

Also: cost per new Concept / Hypothesis / Evidence link (value created), not only ₹ per turn.

**Postgres** (Proxmox `pg18`, database `ideate`): same schema. `pgvector` columns on object summaries / chunks. AGE graph in the same database. No extra “AI database.”

## Credits and plans

Users see **credits**, not tokens.

| Plan (planning) | Intent |
| --- | --- |
| Free | Limited exploration |
| ₹499 / month | Normal AI |
| ₹999 / month | Heavy research |
| ₹1,999 / month | Deep / advanced reasoning |
| Packs | Extra credits for `DEEP` / literature / full review |

| Operation | Credits (planning) |
| --- | --- |
| Normal conversation | 1 |
| Deep analysis | 5 |
| Literature investigation | 10 |
| Full project review | 20 |
| Large research task | 50 |

Java: **check balance before** `NORMAL`/`DEEP`/`BATCH`; `SIMPLE` background extract may be included in the plan. Soft-block with a clear job class, not a raw token error.

v1 is single-thinker; team workspaces later as Pro. Credits stay on the **account**, usage still attributed to the **workspace**.

## Embeddings

One configured embedder for the tenant (or a local Ollama embed model if they run fully on-box). Switching chat providers must not invalidate the vector space.

`SIMPLE` jobs may *trigger* embeds; they do not use a frontier chat model to “summarize for the vector index” if a dedicated embed API exists.

## Local development topology

What we will actually run while the API is born:

```text
Angular 22 PWA  →  Java 25 (localhost)
                 ├─ PostgreSQL + AGE + pgvector (local)
                 ├─ Ollama (SIMPLE, optional NORMAL, embeds)
                 └─ optional: OpenAI / xAI / GitHub Models keys for DEEP
```

Production SaaS swaps local URLs for managed Postgres and platform/BYOK cloud keys. The **interfaces do not change**.

## HTTP surface (first cut)

| Method | Path | Notes |
| --- | --- | --- |
| `POST` | `/v1/workspaces/{id}/turns` | Classify, assemble, route, tools, ledger |
| `POST` | `/v1/workspaces/{id}/jobs` | Enqueue `BATCH` / Review / literature |
| `GET` | `/v1/workspaces/{id}/jobs/{jobId}` | Status + resulting object ids |
| `GET` | `/v1/workspaces/{id}/usage` | Rollup + recent events |
| `GET` | `/v1/me/credits` | Balance and plan |
| `GET`/`PUT` | `/v1/me/ai-settings` | Account default provider |
| `GET`/`PUT` | `/v1/workspaces/{id}/ai-settings` | Override + local URL ref |

No `POST /v1/complete` with a free-form model id from the browser.

## Implementation order (when coding starts)

1. Graph + transcript persistence (AGE + Postgres). Empty workspace.
2. `ProjectState` assembler with a hard token budget (stable prefix + **current evolving cache** + tail).
3. `ChatClient` + **Ollama adapter** (dev) + one cloud adapter.
3b. After each turn: `SIMPLE` job replaces `conversation_cache.current`.
4. Router: `SIMPLE` → local/cheap, `NORMAL`/`DEEP` → configured cloud or larger local.
5. `ai_usage_event` on every call; workspace ₹ rollup.
6. Credits + plan limits.
7. Batch queue + provider batch/flex.
8. Literature pipeline with staged models.

If (1)–(5) are missing, do not add more agents. Extra agents without routing and a ledger recreate the ₹15 lakh path.
