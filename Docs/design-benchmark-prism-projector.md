# Design benchmark: Prism-Based Projector Feasibility

Second workspace the product must hold. If Stationary Satellite Relays tests **speculative physics → theory**, this tests **product idea → engineering feasibility**.

It is not a note titled "Build a 60 × 90 mm mini projector." It is an evolving hardware investigation: constraints, optical hypotheses, calculations, a concept sheet, a BOM that will change, and feasibility judgments that must not be flattened into "yes, this should work."

Source: prior ChatGPT thread *Prism Based Project Feasibility* in the Hardware Ideas project, plus the uploaded concept sheet (not stored in this repo). This file reconstructs that discussion as an Ideate workspace. Details can be refined when the original sheet is attached as a Design Artifact.

## Workspace

| Field | Value |
| --- | --- |
| Project | Prism-Based Projector Feasibility |
| Domain | Hardware / optics / consumer electronics |
| Type | Engineering feasibility / product concept |
| Status | Evolving |
| Maturity | Concept → feasibility investigation → prototype specification |
| Workspace personas | Inventor (or a separate Student workspace if the holder is only learning throw ratio / lumens) |
| Evidence policy | Targets, estimates, and datasheet claims stay distinct from measured facts |

## Original thought (immutable)

```text
Thought T-001 / Concept C-010
Prism-based / compact projector

Can a very small, inexpensive, battery-powered projector be built
around a compact optical engine and packaged in a ~90 × 60 mm base
with a small rotatable projector head, primarily for projecting
information dashboards and slides onto nearby surfaces?

Origin:          Hardware idea / product concept
Evidence status: Unvalidated
Confidence:      Exploratory
Version:         v0.1
```

The conversation is not summarized. It becomes a research space.

## Constraints that evolved

These are **Constraint** objects, not bullet points in a spec doc. Each can be challenged, relaxed, or versioned.

| ID | Constraint | Notes |
| --- | --- | --- |
| K-001 | ~90 × 60 mm playing-card-sized base | Size |
| K-002 | Small torch-style projector head | Mechanical / optical envelope |
| K-003 | Manual swivel, not motorized | Decision: cost and complexity |
| K-004 | ~180° tilt, 270–360° rotation | Mechanical target |
| K-005 | Battery powered | Power / thermal chain |
| K-006 | App-controlled | Electronics / UX |
| K-007 | Physical buttons kept simple | UX |
| K-008 | No built-in screen | Product scope |
| K-009 | Mini information / slide / wall projector, not a movie projector | Performance target class |
| K-010 | Compactness and relatively low prototype cost | Cost estimate, not a fact |

## Workspace home

```text
Prism-Based Projector Feasibility                 ● Evolving

"Can a card-sized, battery mini projector throw a useful
 dashboard or slide onto a nearby wall?"

 Constraints 10    Hypotheses 8    Open Questions 22    Targets 6

 EVOLUTION OF IDEA
 Tiny projector? → Card-sized base + torch head
   → Manual 180° / 360° motion → Information projector (not cinema)
   → Optical engine vs thermal vs battery
   → [current feasibility]

 Recent reasoning
  • Is a compact DLP/LCD engine actually small enough?
  • Is 3–5 W LED enough, or does brightness force a redesign?
  • Why Pi Zero 2 W rather than another SoC?
  • Is "200 ANSI lumens" a target or a claim?
```

## Approximate graph

```text
                    PRISM PROJECTOR
                           │
          ┌────────────────┼────────────────┐
          │                │                │
       OPTICS          ELECTRONICS      MECHANICAL
          │                │                │
       DLP/LCD            SBC              Head
          │                │                │
        Lens              WiFi           Ball joint
          │                │                │
      Throw ratio        Battery          Tilt
          │                │                │
      Brightness         Runtime         Rotation
          │                │
          └────────┬───────┘
                   │
                 POWER
                   │
              ┌────┴────┐
              │         │
             LED     Thermal
              │         │
              └────┬────┘
                   │
              FEASIBILITY
                   │
          ┌────────┼────────┐
          ▼        ▼        ▼
        Cost      Size    Performance
```

The system should expose **why** an edge exists. Example reasoning chain:

```text
Battery → LED power → brightness → thermal management → enclosure size
```

That chain is part of the product, not a caption.

## Central optical hypothesis

```text
Hypothesis H-001
A sufficiently small projection engine can produce a useful wall
image at short throw distances while fitting within the proposed
projector-head dimensions.

Status:     Active
Confidence: Exploratory
```

### Assumptions (do not collapse into the hypothesis)

- Compact DLP/LCD engine is available
- LED illumination is sufficient
- Lens can achieve the required throw ratio
- Thermal dissipation is manageable
- Image quality is acceptable at the intended projection size

### Questions

- What optical engine is actually small enough?
- What brightness can realistically be achieved?
- What throw ratio is required?
- How does image size change with distance?
- How much heat is generated?
- Does the optical path dominate the head dimensions?

### Evidence types for this workspace

Datasheets, optical-engine specifications, measurements, teardowns, supplier quotations, prototype tests — each a typed Evidence node, not a file sitting next to a note.

## Calculations are first-class

An AI saying "yes, this should be feasible" is a failure. The workspace should hold the **calculation chain**:

```text
Projection distance
        ↓
Throw ratio
        ↓
Image width
        ↓
Required optical aperture
        ↓
Illumination requirement
        ↓
LED power
        ↓
Thermal load
        ↓
Battery life
```

Each step is a Calculation object with inputs, formula or estimate method, output, epistemic tag, and what it affects.

## Idea evolution: the LED assumption

Do not overwrite the original statement.

```text
H-004 v0.1
3–5 W LED appears sufficient
        ↓
New evidence / brightness calculation
        ↓
H-004 v0.2
3–5 W LED insufficient for desired brightness
        ↓
Architecture modified
        ↓
H-004 v0.3
Reduce projection size / increase optical efficiency
```

Same versioning pattern as Theory v5 in the satellite benchmark. The reasoning history is part of the hardware product.

## The concept sheet is a Design Artifact

The uploaded sheet is not "an image in the workspace." It is:

```text
Design Artifact DA-001
"Glow Mini Projector Concept Sheet"
  ├── contains proposed dimensions
  ├── contains BOM
  ├── contains component choices
  ├── contains target specifications
  └── represents architecture v0.8
```

Individual claims link back to the artifact:

```text
"Estimated prototype cost ₹9,000–₹10,000"
  → Cost Estimate C-003
  → BOM B-001
  → Components
  → Supplier assumptions
  → Confidence: provisional
  → Epistemic tag: Estimate  (not Fact)
```

```text
"200 ANSI lumens"
  → Performance Target T-012
  → Epistemic tag: Target  (not Fact)
  → Used by: H-001, H-004
```

A target is a first-class object. Treating a concept-sheet number as a measured fact is how feasibility work goes wrong.

## BOM / architecture versions

```text
Architecture v0.8
  ├── Raspberry Pi Zero 2 W
  ├── DLP Pico module
  ├── LED 3–5 W
  ├── Battery 5000 mAh
  └── custom enclosure

Architecture v0.9
  ├── different compute platform
  ├── different optical engine
  └── revised battery
```

v0.8 remains. Six months later:

> Why did I originally choose the Pi Zero?

The answer comes from Decisions and Assumptions on that version (cost, Wi-Fi, community, size), not from reconstructing a pile of notes.

## Abandoned ideas stay transferable

If the projector is later abandoned, a conventional app leaves `Projector idea.md`.

Ideate retains: what was thought → investigated → discovered → failed → changed → why.

A later workspace **Wearable information display** can attach:

```text
Prism Projector (abandoned)
  ├── low-power display
  ├── compact optical system
  ├── battery constraints
  ├── thermal management
  ├── embedded Linux
  └── miniature mechanical positioning
              │
              ▼ reused-in
       Wearable Display
```

Failure is not dead information. It is accumulated thinking. Cross-workspace `reused-in` / `led-to` edges are required for this.

## What this benchmark proves

Three archetypes, one OS:

| Workspace | Path |
| --- | --- |
| Stationary Satellite Relays | Thought experiment → physics → engineering → feasibility → architecture → research |
| Prism-Based Projector | Product idea → engineering assumptions → calculations → component research → prototype architecture → feasibility |
| Student learning physics | Question → concept → explanation → misconception → experiment → understanding → new question |

Underneath:

```text
HUMAN IDEA → QUESTION → EXPLORATION
     → Knowledge / Evidence / Experiment
     → UNDERSTANDING → CRITIQUE → NEW UNDERSTANDING
     → VERSION → NEW QUESTION
```

The projector is not merely something the app can store. It shows the app can take a messy hardware idea, preserve its origin, structure the exploration, keep estimates distinct from facts, version the BOM, and let an abandoned design feed the next one.

That is the Inventor lens. See [personas.md](./personas.md).
