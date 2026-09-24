# Formly — Enterprise Workflow Form Platform

> Visual DAG-driven workflow form platform with server-authoritative graph compilation, immutable versioning, multi-tenancy, real-time telemetry event stream, and accessible respondent runtime.

[![Formly CI](https://github.com/AgentNex/Formly/actions/workflows/ci.yml/badge.svg)](https://github.com/AgentNex/Formly/actions/workflows/ci.yml)
[![Live Production](https://img.shields.io/badge/Production-Live-white?logo=vercel&logoColor=black)](https://formly-roan.vercel.app)
[![License: MIT](https://img.shields.io/badge/License-MIT-zinc.svg)](LICENSE)

---

## 1. Enterprise Architecture Overview

Formly is engineered from the ground up for strict enterprise SaaS scalability, operational safety, and high-performance conversational form execution:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                            TENANT WORKSPACE                                 │
│  Authenticated Identity → Organization → Member RBAC → Project Workspace   │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                            WORKFLOW LIFECYCLE                               │
│  Interactive DAG Canvas (Draft) ──[ Server Compiler Gate ]──► Immutable vN  │
│  • Optimistic Concurrency (Revision)                         • Snapshotted  │
│  • Undo / Redo & Copy/Paste                                  • Rollbackable │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         PUBLIC RESPONDENT RUNTIME                           │
│  Session State Machine ──► Branch Backtracking Cleanup ──► Idempotent Submit│
│  • Active Path Progress                                    • intentId Key   │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                      TELEMETRY & DATA OPERATIONS                            │
│  Event Stream Telemetry ──► Pre-Aggregated Metrics ──► Submissions Inbox    │
│  • Drop-off Funnel Analysis                            • PII Masking        │
│  • Sub-second Aggregation                              • CSV / JSON Export  │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Core Capabilities

### 🎨 Visual DAG Workflow Editor (`@xyflow/react` v12)
- **True DAG Auto-Layout**: Hierarchical topological rank algorithm that calculates longest-path levels and distributes nodes horizontally.
- **Undo / Redo History Stack**: 30-level coalesced undo/redo with keyboard shortcuts (`Ctrl+Z`, `Ctrl+Y` / `Ctrl+Shift+Z`).
- **Copy, Paste & Duplicate**: Safe cloning with automatic unique ID generation and coordinate offsets (`Ctrl+C`, `Ctrl+V`, `Ctrl+D`).
- **Multi-Rule Logic Engine**: Branch gates supporting `AND` / `OR` combinators with 12 condition operators (`equals`, `not_equals`, `contains`, `greater_than`, `less_than`, `is_empty`, `starts_with`, etc.).
- **Live Autosave Status**: Continuous revision tracking (`Saved`, `Unsaved`, `Saving...`, `Conflict`).

### 📦 20+ Enterprise Field Types
1. **Short Text**: Single-line text input
2. **Paragraph**: Multiline expanding textarea
3. **Email Address**: Server-validated RFC email format
4. **Phone Number**: International phone input
5. **Numeric Input**: Number with optional min/max boundaries
6. **Date Picker**: Structured calendar date selector
7. **Time Picker**: 24h / 12h time input
8. **Dropdown Select**: Single-choice dropdown with customizable options
9. **Radio Cards**: High-contrast touch-friendly radio cards
10. **Checkboxes**: Multi-select options
11. **Opinion Scale / Slider**: Customizable range slider
12. **Star Rating**: 1-to-5 star rating
13. **Net Promoter Score (NPS)**: 0-to-10 recommendation score
14. **Physical Address**: Street, city, state, and postal code
15. **Country Selector**: Global country selection
16. **File Upload**: Secure attachment dropzone
17. **Digital Signature**: Cursive legal signature capture
18. **Currency / Price**: Formatted currency with symbol
19. **Legal Consent**: Terms of service & GDPR consent agreement
20. **Hidden Variable**: Internal tracking and query param metadata
21. **Computed Formula**: Derived calculation field
22. **Matrix Grid**: Multi-dimensional evaluation grid

### 🛡️ Server-Authoritative Compiler & Validation Gate
- Every publication attempt runs through `convex/compiler.ts`.
- **Validation Invariants**:
  - Exactly one Start Node (must have no incoming edges).
  - At least one End Node (must have no outgoing edges).
  - Complete reachability: All nodes must be reachable from Start (no orphan nodes).
  - Path termination: Every node must reach an End Node (no dead ends).
  - Cycle detection: DFS cycle analysis halts infinite loops.
  - Unique field IDs: Prevents collisions across different questions.

### ⚡ Resilient Respondent Runtime
- **Reachable Path Progress**: Progress bar calculated along the *active reachable route* rather than naive index division.
- **Stale Answer Cleanup**: Changing branching decisions automatically cleans up answers given on abandoned branches.
- **Idempotent Submission**: Guaranteed single submission via client-generated `intentId` key across network retries.
- **Dual-Mode Simulator**: Preview workflows instantly in Desktop and Mobile device simulators.

### 📊 Real-Time Telemetry & Submissions Inbox
- **Pre-Aggregated Analytics**: Eliminates unbounded database scans by incrementally updating time-bucketed aggregates on every event.
- **Visual Funnel Drop-off**: Step-by-step conversion and drop-off rate tracking for every canvas node.
- **Submissions Inbox**:
  - Search by respondent or answer keyword
  - Status management: `Submitted`, `Verified`, `Flagged`, `Archived`
  - Toggleable PII Masking for privacy compliance
  - Full server-side CSV and JSON export

---

## 3. Technology Stack

- **Framework**: [Next.js 14](https://nextjs.org/) (App Router, React 18, React Server Components)
- **Visual Flow Engine**: [@xyflow/react](https://reactflow.dev/) (v12)
- **Backend / Database**: [Convex](https://www.convex.dev/) (PostgreSQL-backed BaaS with WebSocket reactivity)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/) (v3.4, Strict Monochromatic Design DNA)
- **Icons**: [Lucide React](https://lucide.dev/)
- **QR Engine**: [qrcode](https://www.npmjs.com/package/qrcode)
- **Language**: TypeScript 5 (Strict Mode, Zero Ignored Errors)

---

## 4. Getting Started

### Prerequisites
- Node.js 18.17+ or 20+
- npm, pnpm, or yarn

### Installation

```bash
# Clone the repository
git clone https://github.com/AgentNex/Formly.git
cd Formly

# Install dependencies
npm install

# Run automated tests
npm test

# Run strict TypeScript verification
npx tsc --noEmit

# Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the workspace dashboard.

---

## 5. Security & Production Hardening

- **Hardened Security Headers**:
  - `Content-Security-Policy`
  - `X-Frame-Options: SAMEORIGIN`
  - `X-Content-Type-Options: nosniff`
  - `Referrer-Policy: strict-origin-when-cross-origin`
  - `Permissions-Policy: camera=(), microphone=(), geolocation=()`
  - `Strict-Transport-Security: max-age=63072000; includeSubDomains; preload`
- **Zero Build Bypass**: No `ignoreDuringBuilds` or `ignoreBuildErrors` in `next.config.js`. `reactStrictMode: true` is strictly enforced.
- **Strict Error Boundaries**: Route-level `loading.tsx`, `error.tsx`, and `not-found.tsx` preventing unhandled UI crashes.

---

## 6. Live Deployment

- **Production URL**: [https://formly-roan.vercel.app](https://formly-roan.vercel.app)
- **Demo Survey Endpoint**: [https://formly-roan.vercel.app/f/feedback](https://formly-roan.vercel.app/f/feedback)

---

## 7. License

MIT License. Designed and engineered by [AgentNex](https://github.com/AgentNex).
