# Feature Plan — Additional Costs Table, Subscribe Tab, Canvas File I/O

**Date:** 2026-03-28
**Scope:** Cost panel overhaul + infrastructure template file format

---

## 1. Additional Costs Tab — CRUD Table

### Current State
Collapsible accordion rows with a single "+ Add" button. Works but is not table-like and doesn't support one-time costs.

### New Design

**Billing Periods (extended):**
| Period | Behaviour |
|--------|-----------|
| Monthly | Recurring every month |
| Yearly ÷12 | Paid annually, amortised to monthly |
| **One-time** | Not in monthly total; shown in a separate "Setup" bucket |

**Table Layout (within 288 px sidebar):**

```
┌─────────────────────────────────────────┐
│ Category filter pills  [⚙ Settings]     │
├────────────────────────────────────────-┤
│ Icon  Label           Period   Monthly  │ ← header
├─────────────────────────────────────────┤
│  🔬  Dev salaries     Monthly  ฿52,500  │ [✏] [🗑]
│  ⚙️  CI/CD pipeline  Yearly   ฿7,350   │ [✏] [🗑]
│  📦  Server setup    One-time ฿105,000 │ [✏] [🗑]
│ ─ ─ ─ ─ ─ expand row (inline edit) ─  │
├─────────────────────────────────────────┤
│ [+ Add cost item]                       │
├─────────────────────────────────────────┤
│ Total recurring  ฿59,850/mo             │
│ Total one-time   ฿105,000               │
└─────────────────────────────────────────┘
```

**Inline edit row fields:**
- Label (text)
- Category (select: R&D / DevOps / Maintenance / Other)
- Amount USD (number)
- Period (select: Monthly / Yearly ÷12 / One-time)
- Discount % (range slider)

**Settings popover (gear icon):**
- Toggle: show USD amounts alongside THB
- Default period for new items

### Type change
```ts
// types.ts
AdditionalCostItem.billingPeriod: "monthly" | "yearly" | "one-time"  // add "one-time"
```

---

## 2. Subscribe Tab (new)

### Purpose
Track recurring SaaS / tool subscriptions separately from infrastructure and ad-hoc costs.
Examples: GitHub Team, Datadog, Sentry, Linear, Slack, security scanners.

### Design
Same compact table as Additional Costs but purpose-built for subscriptions.

```
┌─────────────────────────────────────────┐
│ Category filter            Total: ฿X    │
├─────────────────────────────────────────┤
│ Service     Plan    /unit ×n  Monthly   │
├─────────────────────────────────────────┤
│ GitHub      Team    $4×10     ฿1,400    │ [✏] [🗑]
│ Datadog     Pro     $23×5     ฿4,025    │ [✏] [🗑]
│ Sentry      Business—         ฿875      │ [✏] [🗑]
├─────────────────────────────────────────┤
│ [+ Add subscription]                    │
├─────────────────────────────────────────┤
│ Monthly  ฿6,300  │  Yearly ÷12  ฿525   │
└─────────────────────────────────────────┘
```

**Fields per item:**
- Service name (text, e.g. "GitHub")
- Plan (text, e.g. "Team")
- Category (DevTools / Monitoring / Communication / Security / AI-SaaS / Other)
- Amount USD (base per item or total)
- Unit label (optional, e.g. "per user")
- Unit count (optional, number)
- Billing period: Monthly / Yearly ÷12
- Discount %

**Monthly cost formula:**
```
effectiveMonthly = amountUSD
                   × (unitCount ?? 1)
                   × (billingPeriod === "yearly" ? 1/12 : 1)
                   × (1 - discount/100)
```

### New Type
```ts
// types.ts
export type SubscriptionCategory = "devtools" | "monitoring" | "communication" | "security" | "saas" | "other";

export interface SubscriptionItem {
  id: string;
  service: string;
  plan: string;
  category: SubscriptionCategory;
  amountUSD: number;
  unitLabel?: string;
  unitCount?: number;
  billingPeriod: "monthly" | "yearly";
  discount?: number;
}
```

---

## 3. Updated Cost Panel Tabs

**4 tabs total:**

| Tab | Content |
|-----|---------|
| **Breakdown** | Per-service infra bars + data transfer + one-time setup (group nodes) |
| **Additional** | CRUD table of ad-hoc costs (R&D, DevOps, Maintenance, Other) |
| **Subscribe** | CRUD table of recurring SaaS subscriptions |
| **Summary** | Aggregated view: Infra / External / Additional / Subscribe / Selling price & Profit |

**Badge counts:**
- Additional: count of items
- Subscribe: count of items

---

## 4. Summary Tab — Updated Sections

Add a 4th section **Subscriptions** below Additional Costs:

```
[Infrastructure]    ฿X /period
[External Services] ฿X /period
[Additional Costs]  ฿X /period  (recurring only; one-time shown separately)
[Subscriptions]     ฿X /period
────────────────────────────────
Total Cost          ฿X /period
One-time Setup      ฿X  (group setup + one-time additionals)
[Selling price input]
[Profit & margin]
```

---

## 5. Canvas File I/O — `.awscanvas` Format

### Rationale
Teams often compose infrastructure from multiple reusable components:
- A TTS service module (Bedrock + S3 + Lambda + API Gateway)
- A Web frontend module (CloudFront + ALB + EC2 + Cognito + Route53)

These modules can be saved as separate files and merged onto a single canvas when needed.

### File Format: JSON `.awscanvas`

**Why JSON over YAML/TOML:**
- Native browser support (no parser deps)
- Human-readable and diff-friendly
- Directly matches the in-memory store shape

```json
{
  "version": "1.0",
  "meta": {
    "name": "TTS Service",
    "description": "Cloud text-to-speech pipeline on Bedrock + Lambda",
    "tags": ["tts", "ml", "audio", "api"],
    "exportedAt": "2026-03-28T10:00:00Z"
  },
  "canvas": {
    "region": "ap-southeast-1",
    "billingModel": "ondemand",
    "nodes": [ ...CanvasNode[] ],
    "edges": [ ...CanvasEdge[] ],
    "stickyNotes": [ ...StickyNote[] ]
  }
}
```

### Operations

#### Export (Save as Template)
- Button in TopBar: **Export .awscanvas**
- Downloads current canvas as `<DiagramName>.awscanvas`
- Includes all nodes, edges, groups, sticky notes
- Does NOT include additionalCosts / subscriptions (those are project-level, not template-level)

#### Import — two modes

**Replace:** Clears the current canvas and loads the file. Equivalent to opening a template fresh.

**Merge:** Adds the imported canvas alongside the existing one.
- All imported node/edge IDs are remapped to new random IDs (prevents collisions)
- `parentId` references within the import are updated to the new IDs
- Nodes are offset to the right of the current canvas bounding box + 80 px gap
- Groups are preserved with their children

```
Before merge:                 After merge:
┌──────────────┐              ┌──────────────┐  ┌──────────────┐
│  TTS Service │     +file    │  TTS Service │  │  Web Module  │
│  [Bedrock]   │  ─────────► │  [Bedrock]   │  │  [CF][ALB]   │
│  [Lambda]    │              │  [Lambda]    │  │  [EC2][Cog.] │
└──────────────┘              └──────────────┘  └──────────────┘
                                      ↑ existing         ↑ imported (offset)
```

### Implementation

**`frontend/src/lib/canvasFile.ts`** — utility module

```ts
export function exportCanvasFile(state: ExportState): void
  // builds CanvasFile JSON, downloads as .awscanvas

export function parseCanvasFile(text: string): CanvasFile
  // parses and validates the JSON; throws on bad format

export function mergeCanvasFile(file: CanvasFile, store: CanvasStore): void
  // remaps IDs, offsets positions, calls store.mergeNodes()
```

**`canvasStore.ts`** additions:
```ts
mergeNodes(nodes: CanvasNode[], edges: CanvasEdge[], stickyNotes: StickyNote[]): void
```

**`TopBar.tsx`** additions:
- **Export** button (already exists, will improve format)
- **Import** button → opens `<input type="file" accept=".awscanvas,.json">` → shows modal with Replace / Merge choice

### Typical Workflow: Composing TTS + Web Canvas

```
1. Open TTS canvas → Export → tts_service.awscanvas
2. Create new canvas "Client ABC Full Stack"
3. Import → tts_service.awscanvas → Merge
4. Add Web services (CloudFront, ALB, EC2, Cognito, Route53) manually
   OR import a pre-saved web_module.awscanvas
5. Connect services with edges (data flow / cross-service)
6. Review combined cost in Summary tab
7. Set selling price, check margin
8. Save to DB
```

---

## 6. Files Modified

| File | Change |
|------|--------|
| `frontend/src/types.ts` | Add `SubscriptionItem`, `SubscriptionCategory`; update `AdditionalCostItem.billingPeriod` |
| `frontend/src/store/canvasStore.ts` | Add subscriptions CRUD; add `mergeNodes()` |
| `frontend/src/lib/canvasFile.ts` | **New** — export/parse/merge utilities |
| `frontend/src/components/panels/AdditionalCostsTab.tsx` | Rewrite as CRUD table |
| `frontend/src/components/panels/SubscribeTab.tsx` | **New** — subscription table |
| `frontend/src/components/panels/CostPanel.tsx` | 4 tabs, updated totals |
| `frontend/src/components/panels/SummaryTab.tsx` | Add Subscriptions section; handle one-time additionals |
| `frontend/src/components/TopBar.tsx` | Improve export; add Import button + merge/replace modal |

---

## 7. Cost Aggregation Summary

| Bucket | Frequency | Included in Monthly Total? |
|--------|-----------|---------------------------|
| Infra (AWS nodes) | Monthly | ✅ |
| Data Transfer | Monthly | ✅ |
| Additional — Monthly | Monthly | ✅ |
| Additional — Yearly ÷12 | Monthly | ✅ |
| **Additional — One-time** | One-time | ❌ (shown separately) |
| Subscriptions | Monthly equiv | ✅ |
| Group Setup Cost | One-time | ❌ (shown separately) |

**Total Monthly = Infra + Additional(recurring) + Subscriptions**
**Total One-time = Group setups + Additional(one-time)**
