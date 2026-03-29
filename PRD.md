# Product Requirements Document (PRD)
# Blue Lagoon — AWS Infrastructure Cost Estimator

**Version:** 1.0
**Date:** 2026-03-29
**Status:** Active Development

---

## 1. Overview

### 1.1 Product Summary

Blue Lagoon is a web-based visual tool for estimating the full cost of an AWS-hosted software project. Users design cloud architectures on a drag-and-drop canvas, configure each service, track development mandays, manage SaaS subscriptions, and generate a complete cost breakdown — including infrastructure, development, and operational costs — in a single interface.

The primary audience is solution architects, technical project managers, and sales engineers who need to produce credible, detailed cost estimates for client proposals or internal planning.

### 1.2 Problem Statement

Producing cloud cost estimates today requires jumping between multiple tools:
- AWS Pricing Calculator (infrastructure only)
- Spreadsheets (development costs, mandays, subscriptions)
- Presentation software (to communicate results to stakeholders)

This is slow, error-prone, and makes iteration (changing a region, swapping instance types, adjusting mandays) painful. Teams often end up with outdated estimates that don't reflect the actual architecture.

### 1.3 Solution

A unified canvas editor where the diagram **is** the estimate. Each node on the canvas is both a visual architecture element and a cost-bearing item. Changes to the architecture automatically update the cost breakdown in real time.

---

## 2. Goals & Success Metrics

### 2.1 Goals

1. **Reduce estimate creation time** — produce a complete infrastructure + dev cost estimate in under 30 minutes for a typical mid-size project.
2. **Improve estimate accuracy** — eliminate manual spreadsheet errors by automating cost calculations from structured configuration inputs.
3. **Enable fast iteration** — allow architects to explore pricing scenarios (region, billing model, instance type) without re-building the estimate from scratch.
4. **Support client-facing output** — generate a clean, collapsible cost summary suitable for presenting to non-technical stakeholders.

### 2.2 Success Metrics

| Metric | Target |
|--------|--------|
| Time to create a new estimate | < 30 minutes for a 10-service architecture |
| Calculation accuracy vs. AWS console | ± 5% for supported services |
| Auto-save reliability | < 1% data loss rate on browser close |
| Supported AWS services | 15+ common services at launch |

---

## 3. Users & Personas

### Persona 1 — Solution Architect (Primary)
- Designs the AWS architecture and owns the technical accuracy of the estimate
- Needs to configure instance types, storage, data transfer, billing models
- Uses the canvas editor most heavily

### Persona 2 — Technical Project Manager
- Tracks development effort (mandays) per feature or component
- Assigns developer roles and rates
- Generates summary reports for client sign-off

### Persona 3 — Sales Engineer / Pre-sales
- Needs a clean output to share with clients
- Wants to show Year 1 vs. Year 2+ cost and gross margin
- Rarely edits the technical details — mostly reads and presents

### Persona 4 — Finance / Procurement (Secondary)
- Reviews subscription costs and payment schedules (monthly vs. upfront yearly)
- Wants currency flexibility (THB / USD)

---

## 4. Features & Requirements

### 4.1 Canvas Diagram Editor

**Goal:** Provide an intuitive visual design surface that maps 1:1 to a deployable AWS architecture.

#### Functional Requirements

| ID | Requirement | Priority |
|----|-------------|----------|
| F-01 | Users can drag AWS service nodes from a palette onto the canvas | Must Have |
| F-02 | Users can connect nodes with edges to represent data flow or dependencies | Must Have |
| F-03 | Nodes can be grouped inside VPC/container group nodes | Must Have |
| F-04 | Services dropped onto a group node are automatically reparented to that group | Must Have |
| F-05 | Users can duplicate any node via a copy button or `Ctrl/Cmd+D` | Must Have |
| F-06 | Group nodes and ReqNote nodes are resizable via drag handles | Should Have |
| F-07 | Canvas can be exported to and imported from JSON | Must Have |
| F-08 | The canvas auto-saves to the backend with a 2.5s debounce after any change | Must Have |
| F-09 | Save status is visible in the top bar (saved / saving / error) | Must Have |
| F-10 | Users can create named snapshots (version history) and restore to any snapshot | Should Have |

#### Non-Functional Requirements

- Canvas must handle at least 100 nodes without visible lag
- React Flow used as the canvas engine
- Auto-save must not block the UI thread

---

### 4.2 AWS Service Nodes

**Goal:** Cover the most common AWS services with enough configuration options to produce accurate estimates.

#### Supported Services at Launch

| Service | Key Config Fields |
|---------|------------------|
| EC2 | Instance type, count, OS, hours/month, billing model, EBS volume |
| RDS | Engine, instance class, Multi-AZ, storage size, IOPS |
| S3 | Storage class, total storage, request counts, data transfer |
| Lambda | Invocations/month, avg duration, memory |
| VPC | NAT Gateway count, data processed, VPN connections |
| ALB | Data processed, connections/sec |
| CloudFront | Data transfer, HTTP/HTTPS request counts |
| ElastiCache | Node type, count |
| SQS | Request count, payload size |
| API Gateway | API type, request count |
| Bedrock | Model, input/output token counts |
| DynamoDB | Capacity mode, RCU/WCU, storage |
| EBS | Volume type, size, IOPS |
| Redshift | Node type, count, utilization |
| Lightsail | Plan tier |
| Cognito | MAU count |
| Route53 | Hosted zones, queries |
| Custom Service | Manual cost-per-request or cost-per-hour |

#### Billing Models

All applicable services must support: On-Demand, Reserved 1 Year, Reserved 3 Year, Spot (where applicable).

#### Functional Requirements

| ID | Requirement | Priority |
|----|-------------|----------|
| F-11 | Each service node opens a configuration panel on click | Must Have |
| F-12 | Cost is calculated client-side immediately on config change | Must Have |
| F-13 | Node displays its monthly cost as a label on the canvas | Should Have |
| F-14 | Region can be set globally (applies to all nodes) or overridden per node | Must Have |
| F-15 | Pricing data is based on static AWS pricing tables (not live API calls) | Must Have |
| F-16 | Data transfer costs between nodes are calculated at the group/edge level | Should Have |

---

### 4.3 Development Cost Tracking

**Goal:** Track software development effort (mandays) per node so that dev cost is integrated with infrastructure cost.

#### Node Types for Dev Tracking

**LINE Bot Nodes** (message format components):
Image, Button, Carousel, Quick Reply, Flex Message, Rich Menu, Custom Payload, API Call, AI Agent, Intent, Dialog

**API Nodes** (integration type):
REST, gRPC, MCP, JOLT, Adapter, LLM

#### Functional Requirements

| ID | Requirement | Priority |
|----|-------------|----------|
| F-17 | Each dev node has fields: Department, Manday, Description, Created By, Reviewed By | Must Have |
| F-18 | Manday supports decimal precision (0.5, 1.5, etc.) | Must Have |
| F-19 | Development cost auto-calculated: `manday × department rate` | Must Have |
| F-20 | Department rates are defined globally in Settings and apply to all diagrams | Must Have |
| F-21 | Per-canvas override of department rates is supported | Should Have |
| F-22 | Cost breakdown shows total dev cost and per-node dev cost in the summary panel | Must Have |

---

### 4.4 SaaS Subscription Tracker

**Goal:** Track third-party SaaS tool costs as part of the total project cost.

#### Functional Requirements

| ID | Requirement | Priority |
|----|-------------|----------|
| F-23 | Users can add subscription items with: name, category, billing period, unit price, quantity, discount | Must Have |
| F-24 | Supported categories: DevTools, Monitoring, Communication, Security, SaaS, Other | Should Have |
| F-25 | Yearly subscriptions are shown as a one-time upfront cost in Year 1 of the summary | Must Have |
| F-26 | Monthly subscriptions are included in the recurring monthly cost | Must Have |

---

### 4.5 Additional Costs Tracker

**Goal:** Capture non-AWS project costs like DevOps setup, R&D, and maintenance.

#### Functional Requirements

| ID | Requirement | Priority |
|----|-------------|----------|
| F-27 | Users can add cost items with: label, category, amount, billing period (monthly/yearly/one-time), discount | Must Have |
| F-28 | Supported categories: R&D, DevOps, Maintenance, Other | Should Have |

---

### 4.6 Cost Summary Panel

**Goal:** Present the total project cost in a structured, client-ready format.

#### Functional Requirements

| ID | Requirement | Priority |
|----|-------------|----------|
| F-29 | Summary panel shows tabbed breakdown: Infrastructure, External Services, Additional, Subscriptions, Development | Must Have |
| F-30 | Grand total is shown as: recurring monthly cost + one-time / upfront costs | Must Have |
| F-31 | Grand total section is collapsible (for presentation mode) | Should Have |
| F-32 | Users can set a selling price (to client) to see revenue and gross margin | Must Have |
| F-33 | Year 1 profit and Year 2+ profit are calculated and displayed separately | Must Have |
| F-34 | Gross margin is shown as a percentage with a visual bar | Should Have |
| F-35 | Currency can be toggled between THB (฿) and USD ($) throughout the entire summary | Must Have |
| F-36 | Exchange rate is configurable (default: 35 THB/USD) | Must Have |

---

### 4.7 Dashboard

**Goal:** Manage multiple saved diagrams.

#### Functional Requirements

| ID | Requirement | Priority |
|----|-------------|----------|
| F-37 | Dashboard lists all saved diagrams with name, last modified date | Must Have |
| F-38 | Users can create, open, duplicate, and delete diagrams | Must Have |
| F-39 | Users can star/favorite diagrams | Should Have |
| F-40 | Diagrams can be marked as templates and reused as starting points | Could Have |

---

### 4.8 Settings

**Goal:** Configure global preferences that apply across all diagrams.

#### Functional Requirements

| ID | Requirement | Priority |
|----|-------------|----------|
| F-41 | Global department rates: define role names, per-manday rates (THB), and display colors | Must Have |
| F-42 | Global exchange rate: THB to USD conversion rate | Must Have |

---

## 5. Non-Functional Requirements

### 5.1 Performance
- Canvas renders up to 100 nodes at 60 fps
- API responses under 200ms for CRUD operations (local network)
- Auto-save completes in under 1 second from the time the debounce fires

### 5.2 Reliability
- Auto-save failure shows a visible error indicator; data is not silently lost
- Snapshot restore must be atomic — partial restores are not acceptable

### 5.3 Security
- No authentication required for MVP (single-tenant local/private deployment)
- CORS configured to restrict origins in production
- Input validated with Zod on all API endpoints

### 5.4 Portability
- Runs locally with **zero external dependencies** — SQLite is built into Bun; no database server required
- DB backend selected automatically: no `MONGODB_URI` → SQLite; `MONGODB_URI` set → MongoDB
- Single Docker container for production deployment
- No vendor lock-in on the backend framework

### 5.5 Maintainability
- Pricing tables are static and stored in code — must be easy to update when AWS prices change
- Frontend and backend share TypeScript types via a common `types.ts` pattern

---

## 6. Architecture Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Canvas library | React Flow (@xyflow/react) | Best-in-class for node-graph UIs in React; handles drag, resize, edges, grouping |
| State management | Zustand | Lightweight, minimal boilerplate; sufficient for canvas state without Redux complexity |
| Backend framework | Hono on Bun | Sub-millisecond cold start; Bun's native TypeScript support eliminates build step |
| Local DB | SQLite via `bun:sqlite` | Zero-config local dev; built into Bun — no extra package, no migrations CLI, tables created on first start |
| Production DB | MongoDB + Mongoose | Flexible schema for canvas JSON blobs; Atlas managed service reduces ops overhead |
| Deployment | Single container | Simplifies PaaS deployment; no reverse proxy or orchestration needed for early stages |

---

## 7. Out of Scope (v1)

The following are explicitly not in scope for the initial release:

- **Authentication / multi-user** — single-tenant only; no login, no user accounts
- **Live AWS pricing API** — pricing is static; will drift from actual AWS prices over time
- **Cost forecasting / projections** — no time-series graphs or trend analysis
- **Terraform / CDK export** — the diagram is for estimation only, not IaC generation
- **Collaboration / real-time multiplayer** — no concurrent editing
- **Mobile / tablet support** — desktop browser only (canvas interaction requires mouse)
- **Non-AWS clouds** — GCP and Azure are out of scope for v1

---

## 8. Future Considerations

- **Authentication & teams** — workspace-level access control for consulting firms managing multiple clients
- **Live pricing** — polling the AWS Pricing API to keep cost tables current
- **PDF / Excel export** — generate client-ready estimate documents directly from the summary
- **Proposal templates** — pre-built architecture patterns (e.g. "3-tier web app", "data pipeline") as starting points
- **Cost alerts** — flag estimates that exceed a configured budget threshold
- **Azure / GCP node support** — extend to multi-cloud estimates

---

## 9. Open Questions

| # | Question | Owner | Status |
|---|----------|-------|--------|
| 1 | Should pricing tables be versioned so users can pin to a specific pricing date? | Arch | Open |
| 2 | Is there a requirement for PDF export of the cost summary for client proposals? | PM | Open |
| 3 | Should diagram sharing (read-only public link) be a v1 or v2 feature? | PM | Open |
| 4 | What is the target deployment environment — self-hosted or managed SaaS? | Stakeholder | Open |

---

*This PRD was last updated on 2026-03-29.*
