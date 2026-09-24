# Product Requirement Document (PRD): Formly Enterprise

## 1. Product Overview
Formly is a high-performance, enterprise-grade interactive node-based form and workflow builder platform built with Next.js 14 App Router, React Flow (@xyflow/react v12), and Convex BaaS. It enables organization teams to design sophisticated, branched conversational forms visually on an infinite canvas, validate DAG topology server-side, deploy instant public links with vector QR codes, and analyze submissions through real-time telemetry and a SOC2/GDPR-compliant submissions inbox.

## 2. Target Users & Use Cases
- **Enterprise Product Teams**: Build customer feedback loops, feature request workflows, and onboarding surveys with multi-condition branching.
- **Operations & HR**: Scaffold intake questionnaires, compliance agreements, and employee feedback forms.
- **Public Respondents**: Complete frictionless, mobile-first conversational forms with active-path progress indicators and zero state loss.

## 3. Core Functional Requirements

### 3.1 Multi-Tenant Organization & Workspace Management
- **FR-1.1**: Multi-tenant database architecture supporting organizations, projects, forms, and memberships.
- **FR-1.2**: 4-tier Role-Based Access Control (RBAC): `owner`, `admin`, `member`, `viewer`.
- **FR-1.3**: Automatic project and starter template scaffolding.

### 3.2 Visual DAG Workflow Canvas Editor
- **FR-2.1**: Interactive node-based canvas powered by React Flow with custom nodes, zoom/pan controls, and mini-map.
- **FR-2.2**: 22 comprehensive field and logic types (text, numbers, ratings, NPS, file uploads, digital signatures, branch gates, completion screens).
- **FR-2.3**: Breadth-First Search (BFS) topological DAG auto-layout algorithm for clean horizontal hierarchy.
- **FR-2.4**: Multi-condition logic branch combinators (`AND` / `OR`) supporting 7 operators (`equals`, `not_equals`, `contains`, `greater_than`, `less_than`, `is_empty`, `is_not_empty`).
- **FR-2.5**: 30-step undo/redo history stack (`Ctrl+Z`, `Ctrl+Y`) and clipboard copy/paste/duplicate (`Ctrl+C`, `Ctrl+V`, `Ctrl+D`) with unique ID regeneration.

### 3.3 Server-Authoritative DAG Compiler & Immutable Versioning
- **FR-3.1**: Strict compilation gating form publication (rejects cycles, missing start/end nodes, unreachable steps, and unassigned branch handles).
- **FR-3.2**: Zero-downtime versioned workflow model with optimistic revision locking (`expectedRevision`) and frozen snapshot storage in `form_versions`.
- **FR-3.3**: Constant-time version rollback restoring historical snapshots without mutating existing submission records.

### 3.4 Conversational Respondent Runtime
- **FR-4.1**: Mobile-first, touch-friendly respondent runner at `/f/[slug]` with keyboard navigation (`Enter` advances).
- **FR-4.2**: Active-path progress tracking calculating completion percentage strictly along the evaluated path.
- **FR-4.3**: Branch state rollback answer pruning preventing orphaned data when back-tracking.
- **FR-4.4**: Idempotent submission processing with unique client-side `intentId` tokens.

### 3.5 Telemetry Analytics & Submissions Inbox
- **FR-5.1**: Scalable hourly aggregate counters for visits, completions, and drop-offs.
- **FR-5.2**: Submissions inbox with free-text search across respondent IDs and field values, and status filtering (`Submitted`, `Verified`, `Flagged`, `Archived`).
- **FR-5.3**: Toggleable PII redaction masking emails and respondent identifiers.
- **FR-5.4**: Visual step drop-off funnels and answer distribution graphs.
- **FR-5.5**: One-click browser CSV and JSON data export.

### 3.6 Distribution & Vector QR Code Hub
- **FR-6.1**: Hosted public link generation with instant clipboard copy.
- **FR-6.2**: Crisp vector QR code generation with download options in PNG and SVG formats.
- **FR-6.3**: Form pause/resume visibility controls.

## 4. Non-Functional & Security Requirements
- **Monochromatic Visual Identity**: Dark canvas (#000000 / #09090b), zinc borders (#27272a), high-contrast white text.
- **Security Hardening**: Strict Content-Security-Policy (CSP), HTTP Strict Transport Security (HSTS), X-Frame-Options: SAMEORIGIN, X-Content-Type-Options: nosniff.
- **Quality Gates**: Zero bypassed TypeScript or ESLint errors, 100% automated test coverage for compilation and layout invariants.
