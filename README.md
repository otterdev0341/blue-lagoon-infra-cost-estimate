# Blue Lagoon — AWS Infrastructure Cost Estimator

A visual, drag-and-drop AWS infrastructure cost estimator with a canvas-based diagram editor. Design cloud architectures, track development costs, manage SaaS subscriptions, and generate client-ready cost breakdowns — all in one tool.

![Tech Stack](https://img.shields.io/badge/Runtime-Bun-black?logo=bun)
![React](https://img.shields.io/badge/Frontend-React%2018-61DAFB?logo=react)
![Hono](https://img.shields.io/badge/Backend-Hono-E36002)
![SQLite](https://img.shields.io/badge/DB%20(local)-SQLite-003B57?logo=sqlite)
![MongoDB](https://img.shields.io/badge/DB%20(prod)-MongoDB-47A248?logo=mongodb)
![Docker](https://img.shields.io/badge/Deploy-Docker-2496ED?logo=docker)

---

## Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Prerequisite Check Scripts](#prerequisite-check-scripts)
- [Local Development (SQLite — zero config)](#local-development-sqlite--zero-config)
- [Production Deployment (MongoDB + Docker)](#production-deployment-mongodb--docker)
- [Environment Variables](#environment-variables)
- [API Reference](#api-reference)
- [Architecture Overview](#architecture-overview)

---

## Features

### Canvas Diagram Editor
- **Drag-and-drop nodes** onto a visual canvas powered by React Flow
- **Group nodes** (VPC/containers) with nested child services
- **Drag services into groups** and auto-reparent on drop
- **Sticky notes** — color-coded, resizable, draggable annotations
- **Requirement notes (ReqNote)** — markdown-powered notes with font-size picker
- **Textbox / Circle / Flowchart** nodes for documentation diagrams
- **Duplicate node** — click the copy button or press `Ctrl/Cmd + D`
- **Node resize** — drag to resize group nodes and ReqNote nodes
- **Import / Export canvas** as JSON file

### AWS Service Nodes
Full configuration panels and real-time cost estimates for:

| Service | Configurable Fields |
|---------|---------------------|
| **EC2** | Instance type, count, OS, utilization hours, EBS volume/type, Auto Scaling |
| **RDS** | Engine (MySQL, PostgreSQL, Aurora, SQL Server), instance class, Multi-AZ, storage, IOPS |
| **S3** | Storage class, size, GET/PUT requests, data transfer |
| **Lambda** | Invocations/month, avg duration, memory size |
| **VPC** | NAT Gateway count, data processed, VPN connections |
| **ALB** | Data processed, connection rates, rule lookups |
| **CloudFront** | Data transfer, HTTP/HTTPS requests |
| **ElastiCache, SQS, API Gateway** | Usage-based config |
| **Bedrock** | Model selection, input/output tokens |
| **DynamoDB** | Provisioned vs On-Demand, RCU/WCU, storage |
| **EBS** | Volume type, size, provisioned IOPS |
| **Redshift** | Node type, node count, utilization |
| **Lightsail, Cognito, Route53** | Plan/tier based config |
| **Custom Service** | Manual cost-per-request or cost-per-hour |

### Billing Models
- On-Demand
- Reserved 1 Year
- Reserved 3 Year
- Spot

### Development Cost Tracking (Manday)

**LINE Bot Nodes** (message type components):
- Image, Button, Carousel, Quick Reply, Flex Message, Rich Menu, Custom Payload
- API Call, AI Agent, Intent, Dialog

**API Nodes** (protocol-based):
- REST, gRPC, MCP, JOLT, Adapter, LLM

Each node tracks:
- **Department / Position** — assigned developer role
- **Manday** — decimal-precision effort estimate (e.g. 0.5, 1.5, 3.0)
- **Description**, **Created By**, **Reviewed By** — collaboration metadata
- Cost auto-calculated: `manday × department rate (THB/day)`

### Cost Summary Panel

**Recurring Costs Section:**
- Infrastructure (AWS services + data transfer)
- External Services (custom APIs)
- Additional Costs (R&D, DevOps, maintenance)
- SaaS Subscriptions

**Development Cost Section:**
- Total manday cost across all API + LINE nodes
- Per-node breakdown

**Subscription Tracking:**
- Separate yearly (upfront) vs monthly (recurring) billing
- Yearly subscriptions shown as upfront payment at project start

**One-Time Setup:**
- Group-level setup costs
- One-time additional costs

**Grand Total (collapsible):**
- Recurring vs upfront payment breakdown
- Expand/collapse for management presentations

**Revenue & Profit Analysis:**
- Set selling price to client
- **Year 1 profit** — includes dev cost + one-time setup + yearly subs upfront
- **Year 2+ profit** — recurring only (dev/setup costs removed)
- Gross margin percentage with visual bar
- THB / USD currency toggle

**Currency Display:**
- Toggle between **฿ Thai Baht (THB)** and **$ US Dollar (USD)** throughout the summary
- Configurable exchange rate (default: 35 THB/USD)

### Additional Costs Tracker
Track non-AWS project costs by category:
- `rd` — Research & Development
- `devops` — DevOps & CI/CD
- `maintain` — Ongoing maintenance
- `other` — Miscellaneous

Each item supports:
- Billing period: monthly / yearly / one-time
- Discount percentage
- Custom label

### SaaS Subscription Tracker
Track third-party SaaS tools:
- Categories: DevTools, Monitoring, Communication, Security, SaaS, Other
- Monthly or yearly billing
- Per-unit pricing (e.g. per user/seat)
- Discount support
- Yearly subs shown as **upfront** at project start in the cost summary

### Auto-Save & Versioning
- **Auto-save** — canvas changes debounced and saved to backend every few seconds
- **Version history** — create named snapshots at any point
- **Restore** — roll back the canvas to any saved snapshot
- Save status indicator in the top bar

### Department Rates
- Define team roles (e.g. Senior Dev, Junior Dev, DevOps, PM) with per-manday rates
- Rates stored globally (apply to all diagrams) with optional per-canvas override
- Color-coded for visual distinction

### Dashboard
- List all saved diagrams with timestamps
- Create, open, duplicate, or delete diagrams
- Star/favorite diagrams
- Template support

---

## Tech Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Runtime** | [Bun](https://bun.sh) 1.1 | Backend execution, fast JS/TS runtime |
| **Backend Framework** | [Hono](https://hono.dev) 4 | Lightweight web framework, zero-dependency router |
| **API Validation** | [Zod](https://zod.dev) | Request body schema validation |
| **DB (Dev)** | SQLite via `bun:sqlite` | Built into Bun — zero extra dependencies, file-based, auto-created |
| **DB (Prod)** | MongoDB + Mongoose | Cloud-hosted document database (Atlas) |
| **Frontend** | [React](https://react.dev) 18 | UI library |
| **Routing** | [React Router](https://reactrouter.com) v7 | Client-side navigation |
| **State** | [Zustand](https://zustand-demo.pmnd.rs) | Lightweight global store for canvas state |
| **Canvas Editor** | [@xyflow/react](https://reactflow.dev) 12 | Interactive node-based diagram editor |
| **Rich Text** | [Tiptap](https://tiptap.dev) | Sticky note editor |
| **Styling** | [Tailwind CSS](https://tailwindcss.com) 3 | Utility-first CSS framework |
| **Icons** | [Lucide React](https://lucide.dev) | SVG icon set |
| **Build Tool** | [Vite](https://vitejs.dev) 5 | Fast frontend bundler + dev server |
| **TypeScript** | TypeScript 5 | Type safety across frontend and backend |
| **Container** | Docker (multi-stage) | Single container: frontend + backend |
| **Hosting** | [Koyeb](https://koyeb.com) | PaaS deployment target |

---

## Project Structure

```
blue-lagoon-infra-cost-estimate/
├── Dockerfile                    # Multi-stage build (Node → Bun)
├── .dockerignore
├── package.json                  # Workspace root
├── start.sh                      # Local dev launcher
├── stop.sh                       # Local dev stopper
│
├── scripts/
│   ├── check-deps.sh             # Prerequisite checker — macOS / Linux
│   ├── check-deps.ps1            # Prerequisite checker — Windows PowerShell
│   └── check-deps.bat            # Prerequisite checker — Windows CMD
│
├── backend/
│   ├── package.json
│   ├── .env.example              # Environment variable template
│   ├── data/
│   │   └── app.db                # SQLite file (auto-created on first run)
│   └── src/
│       ├── index.ts              # Server entry — auto-selects SQLite or MongoDB
│       ├── types.ts              # Shared TypeScript types
│       ├── db/
│       │   ├── index.ts          # DB router — picks SQLite or MongoDB at startup
│       │   ├── client.ts         # MongoDB connection (Mongoose) — skipped if no URI
│       │   ├── schema.ts         # Mongoose models (production)
│       │   ├── queries.ts        # MongoDB query functions
│       │   ├── sqliteClient.ts   # bun:sqlite setup + table creation (local dev)
│       │   ├── sqliteQueries.ts  # SQLite query functions (same interface as queries.ts)
│       │   └── migrate.ts        # MongoDB index runner (production only)
│       ├── cost/
│       │   └── calculator.ts     # AWS cost calculation engine
│       ├── pricing/
│       │   └── staticPrices.ts   # Static AWS pricing tables
│       └── routes/
│           ├── diagrams.ts       # Diagram CRUD + snapshots
│           └── pricing.ts        # Pricing lookups
│
└── frontend/
    ├── package.json
    ├── vite.config.ts            # Dev proxy: /api → :3001
    ├── src/
    │   ├── App.tsx               # Router shell
    │   ├── types.ts              # Frontend types
    │   ├── store/
    │   │   └── canvasStore.ts    # Zustand global state
    │   ├── lib/
    │   │   ├── api.ts            # Fetch wrapper for /api
    │   │   ├── costEngine.ts     # Client-side cost engine
    │   │   ├── defaultConfigs.ts # Default node configs
    │   │   ├── globalSettings.ts # localStorage preferences
    │   │   └── utils.ts          # Helpers (randomId, fmtTHB, etc.)
    │   ├── hooks/
    │   │   └── useAutoSave.ts    # Debounced auto-save hook
    │   ├── pages/
    │   │   ├── DashboardPage.tsx # Diagram list
    │   │   └── SettingsPage.tsx  # Global settings
    │   └── components/
    │       ├── CanvasBoard.tsx   # React Flow canvas
    │       ├── Toolbar.tsx       # Node palette (drag to add)
    │       ├── TopBar.tsx        # Navigation + save status
    │       ├── nodes/            # Node type components
    │       └── panels/           # CostPanel, SummaryTab, etc.
```

---

## Prerequisite Check Scripts

Before you begin, run the check script for your OS to verify all required tools are installed.

### macOS / Linux

```bash
bash scripts/check-deps.sh
```

### Windows (PowerShell — recommended)

```powershell
pwsh -ExecutionPolicy Bypass -File scripts\check-deps.ps1
```

### Windows (Command Prompt)

```bat
scripts\check-deps.bat
```

The scripts check for:
- **Bun** ≥ 1.1
- **Node.js** ≥ 18 + **npm**
- **Git**
- **Docker** (optional — only needed for production builds)
- Ports **3001** and **5173** are free

---

## Local Development (SQLite — zero config)

The backend automatically uses **SQLite** (`bun:sqlite`, built into Bun) when `MONGODB_URI` is **not** set.
No database installation, no configuration file required — just clone and run.

### Prerequisites

| Tool | Min Version | Install |
|------|-------------|---------|
| **Bun** | 1.1 | [bun.sh](https://bun.sh/docs/installation) |
| **Node.js** | 18 | [nodejs.org](https://nodejs.org) or `nvm install 20` |
| **Git** | any | [git-scm.com](https://git-scm.com) |

### Step 1 — Clone

```bash
git clone https://github.com/your-org/blue-lagoon-infra-cost-estimate.git
cd blue-lagoon-infra-cost-estimate
```

### Step 2 — Check prerequisites (optional but recommended)

```bash
bash scripts/check-deps.sh   # macOS / Linux
# OR
scripts\check-deps.bat       # Windows CMD
```

### Step 3 — Start (one command)

```bash
./start.sh
```

`start.sh` automatically:
1. Installs backend deps via `npm install`
2. Installs frontend deps via `npm install`
3. Starts the backend on **http://localhost:3001** (SQLite DB auto-created at `backend/data/app.db`)
4. Starts the frontend Vite dev server on **http://localhost:5173**

Open **http://localhost:5173** in your browser.

To stop all servers:
```bash
./stop.sh
```

### Manual Start (two terminals)

```bash
# Terminal 1 — Backend  (SQLite, no MONGODB_URI → auto-detected)
cd backend
npm install
bun run dev        # Starts with --watch on :3001

# Terminal 2 — Frontend
cd frontend
npm install
npm run dev        # Vite dev server on :5173 (proxies /api → :3001)
```

### SQLite Database

| | |
|---|---|
| **Location** | `backend/data/app.db` |
| **Created** | Automatically on first backend start |
| **No migrations needed** | Tables are created via `CREATE TABLE IF NOT EXISTS` on startup |
| **Reset DB** | `rm backend/data/app.db` then restart backend |
| **Custom path** | Set `SQLITE_PATH=/your/path/app.db` env var |

### Local Environment Variables

No `.env` file is required for local dev. All values have sensible defaults.

If you want to customise, create `backend/.env`:

```env
PORT=3001
NODE_ENV=development

# Optional: change SQLite file location
# SQLITE_PATH=./data/app.db

# Leave MONGODB_URI unset to use SQLite (local mode)
# MONGODB_URI=mongodb+srv://...   ← set this only for MongoDB
```

---

## Production Deployment (MongoDB + Docker)

When `MONGODB_URI` is set, the backend automatically switches to **MongoDB** (no code changes needed).
Production runs as a single Docker container serving both the API and the built frontend.

### 1. Set Up MongoDB Atlas (free tier available)

1. Create a free cluster at [cloud.mongodb.com](https://cloud.mongodb.com)
2. Create a **database user** (username + password)
3. In **Network Access**, add `0.0.0.0/0` to allow your deployment host
4. Copy your **connection string**:
   ```
   mongodb+srv://<username>:<password>@<cluster>.mongodb.net/?retryWrites=true&w=majority
   ```

### 2. Build the Docker Image

```bash
docker build -t blue-lagoon-infra .
```

| Stage | Base Image | Purpose |
|-------|-----------|---------|
| `builder` | `node:20-alpine` | Install frontend deps + `npm run build` |
| `runtime` | `oven/bun:1.1-alpine` | Run backend + serve built frontend |

### 3. Run with Docker

```bash
docker run -d \
  -p 3001:3001 \
  -e MONGODB_URI="mongodb+srv://user:pass@cluster.mongodb.net/?retryWrites=true&w=majority" \
  -e MONGODB_DB="infra_canvas" \
  -e NODE_ENV="production" \
  -e PORT="3001" \
  --name blue-lagoon \
  blue-lagoon-infra
```

Open **http://localhost:3001** — frontend and API served from the same port.

### 4. Deploy to Koyeb

1. Push to Docker Hub / GHCR:
   ```bash
   docker tag blue-lagoon-infra your-dockerhub/blue-lagoon-infra:latest
   docker push your-dockerhub/blue-lagoon-infra:latest
   ```
2. In Koyeb → **Create Service** → **Docker image**
3. Set environment variables:

   | Key | Value |
   |-----|-------|
   | `MONGODB_URI` | Your Atlas connection string |
   | `MONGODB_DB` | `infra_canvas` |
   | `NODE_ENV` | `production` |
   | `PORT` | `3001` |

4. Set **exposed port** to `3001`
5. Health check endpoint: `GET /health`

### 5. Health Check

```
GET /health
→ { "status": "ok", "db": "mongodb", "ts": "..." }   ← production
→ { "status": "ok", "db": "sqlite",  "ts": "..." }   ← local dev
```

---

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `MONGODB_URI` | **Prod only** | *(unset)* | MongoDB Atlas connection string. **If unset, SQLite is used automatically.** |
| `MONGODB_DB` | No | `infra_canvas` | MongoDB database name |
| `SQLITE_PATH` | No | `./data/app.db` | Path to SQLite file (local dev only) |
| `PORT` | No | `3001` | HTTP server port |
| `NODE_ENV` | No | `development` | Set to `production` in Docker |
| `WEB_ORIGIN` | No | `http://localhost:5173` | CORS allowed origin (dev) / `*` (prod) |

Copy the example file:
```bash
cp backend/.env.example backend/.env
```

---

## API Reference

All endpoints are prefixed with `/api`.

### Diagrams

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/diagrams` | List all diagrams |
| `POST` | `/api/diagrams` | Create a new diagram |
| `GET` | `/api/diagrams/:id` | Get a diagram by ID |
| `PUT` | `/api/diagrams/:id` | Update diagram metadata and canvas |
| `PATCH` | `/api/diagrams/:id/canvas` | Auto-save canvas (nodes, edges, sticky notes) |
| `PATCH` | `/api/diagrams/:id/template` | Toggle template flag |
| `DELETE` | `/api/diagrams/:id` | Delete a diagram |

### Snapshots

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/diagrams/:id/snapshots` | List version history |
| `POST` | `/api/diagrams/:id/snapshots` | Create a named snapshot |
| `POST` | `/api/diagrams/:id/snapshots/:snapshotId/restore` | Restore to snapshot |

### Cost Estimation

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/diagrams/:id/cost` | Calculate cost for saved diagram |
| `POST` | `/api/diagrams/cost/estimate` | Quick estimate from raw nodes/edges |

### Pricing Lookup

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/pricing/regions` | List supported AWS regions |
| `GET` | `/api/pricing/ec2/instance-types` | List EC2 instance types |
| `GET` | `/api/pricing/rds/instance-classes` | List RDS instance classes |
| `GET` | `/api/pricing/ec2?instanceType=t3.medium&region=us-east-1` | EC2 pricing lookup |

### System

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/health` | Health check (DB connectivity status) |

---

## Architecture Overview

```
                    ┌─────────────────────────────────┐
                    │         Docker Container         │
                    │                                  │
   Browser ──────►  │  Hono (Bun) on :3001             │
                    │  ├── /api/diagrams  (CRUD)       │
                    │  ├── /api/pricing   (lookup)     │
                    │  ├── /health        (status)     │
                    │  └── /*  ──► frontend/dist/      │
                    │             (React SPA)          │
                    │                                  │
                    │  MongoDB (Atlas) ◄── Mongoose    │
                    └─────────────────────────────────┘
```

**In development**, the frontend Vite dev server (`:5173`) proxies all `/api` requests to the backend (`:3001`), so hot-reload works while the backend serves the API independently.

**In production**, the backend serves the pre-built React app as static files via `serveStatic`, with a SPA catch-all so client-side routing works correctly.

### Data Flow

```
User drags node → CanvasBoard (React Flow)
     └── Zustand store update
          ├── CostPanel recalculates (client-side costEngine.ts)
          └── useAutoSave debounce → PATCH /api/diagrams/:id/canvas
                                          └── SQLite (local) or MongoDB (prod)
```

### Database: Local vs Production

The DB backend is selected **automatically** at startup — no code changes needed.

| | Local Development | Production |
|--|--|--|
| **Trigger** | `MONGODB_URI` **not set** | `MONGODB_URI` **set** |
| **Database** | SQLite (`bun:sqlite`) | MongoDB Atlas |
| **Location** | `backend/data/app.db` | Cloud (Atlas cluster) |
| **Driver** | Built into Bun — zero deps | Mongoose |
| **Setup** | None — tables created on first run | Atlas cluster + env var |
| **Migrations** | `CREATE TABLE IF NOT EXISTS` on startup | Mongoose `createIndexes()` |
| **Reset** | `rm backend/data/app.db` | Drop collections in Atlas UI |
| **Health check `db` field** | `"sqlite"` | `"mongodb"` |

---

## Supported AWS Regions

`us-east-1` · `us-east-2` · `us-west-1` · `us-west-2` · `eu-west-1` · `eu-central-1` · `ap-southeast-1` · `ap-southeast-2` · `ap-northeast-1` · `ap-south-1` · `sa-east-1`

---

## License

MIT
