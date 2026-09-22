# Formly — Interactive Node-Based Form Builder

> Build, branch, preview, and distribute conversational forms visually using a node-based workflow editor, scannable vector QR codes, hosted endpoints, and real-time telemetry analytics.

---

## Overview

**Formly** is an interactive, visual form builder and respondent runtime application built with **Next.js 14**, **React Flow (`@xyflow/react` v12)**, and **Convex backend**.

Instead of static, rigid forms, Formly lets creators visually map out question pathways, conditional branching gates, and completion cards on an interactive infinite canvas. Forms can be tested instantly in a dual desktop/mobile simulator, distributed via hosted links and high-contrast vector QR codes, and analyzed in real time with telemetry tracking and submission stream inspection.

---

## Key Features

### 1. Visual Node Canvas (`@xyflow/react` v12)
- **Start Node**: Configure intro headers, descriptions, and call-to-action triggers.
- **Field Nodes**: Rich input types including Short Text, Paragraph, Email, Star Rating, Multiple Choice, and Numeric inputs.
- **Logic Gates**: Branching nodes evaluating conditions (`equals`, `contains`, `greater_than`, `less_than`) to route respondents down distinct workflow paths.
- **End Nodes**: Completion cards with custom messages and optional redirects.
- **Component Palette**: Click-to-add toolbar for rapid canvas composition.
- **Properties Inspector**: Real-time parameter tuning with bidirectional synchronization.
- **DAG Auto-Layout**: Hierarchical layout alignment ensuring clean horizontal tree progression.

### 2. Dual-Mode Live Preview Simulator
- Interactive conversational runner with keyboard-first navigation (`Enter` to advance, `Shift+Enter` for multiline).
- Real-time condition evaluation directly inside the simulator.
- Instant viewport toggling between **Desktop View** and **Mobile Device Simulation**.

### 3. Share & Vector QR Distribution Hub
- **Hosted Public Link**: Shareable `/f/[slug]` endpoint for live respondents.
- **High-Contrast Vector QR Codes**: Built with `qrcode` supporting one-click downloads in scalable SVG and high-res PNG formats.
- **Visibility Toggles**: Instant form pausing ("Under Maintenance" screen) and cascade deletion with automatic 404 revocation.

### 4. Real-Time Telemetry & Analytics
- Live visitor view counter and submission tracking.
- Automated conversion rate calculation and average completion time telemetry.
- Per-field response distribution percentage bars.
- Live submission stream with detailed response payload inspector modal.
- One-click CSV and JSON data exports.

### 5. Design DNA & Accessibility
- Strict monochromatic, high-contrast dark aesthetic following Design DNA and Impeccable guidelines.
- Fluid transitions, accessible focus states, and zero-clutter conversational respondent interface.

---

## Tech Stack

- **Framework**: [Next.js 14](https://nextjs.org/) (App Router)
- **Node Workflow Engine**: [@xyflow/react](https://reactflow.dev/) (v12)
- **Backend / Database**: [Convex](https://www.convex.dev/) Schema & Hybrid Reactive Data Store
- **Styling**: [Tailwind CSS](https://tailwindcss.com/)
- **Icons**: [Lucide React](https://lucide.dev/)
- **QR Code Engine**: [qrcode](https://www.npmjs.com/package/qrcode)
- **Language**: TypeScript

---

## Getting Started

### Prerequisites
- Node.js 18.17+ or 20+
- npm, pnpm, or yarn

### Installation

1. Clone the repository:
```bash
git clone https://github.com/AgentNex/Formly.git
cd Formly
```

2. Install dependencies:
```bash
npm install
```

3. Run the development server:
```bash
npm run dev
```

4. Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## Project Structure

```
Formly/
├── app/
│   ├── f/[slug]/           # Public respondent hosted form route
│   ├── project/[projectId]/
│   │   ├── page.tsx        # Visual node-based canvas editor
│   │   ├── preview/        # Live desktop/mobile simulator
│   │   ├── analytics/      # Real-time telemetry dashboard
│   │   └── share/          # Hosted link & vector QR code hub
│   ├── globals.css         # Monochromatic design system tokens
│   ├── layout.tsx          # Root layout with font and metadata
│   └── page.tsx            # Workspace dashboard & project manager
├── components/
│   ├── common/
│   │   └── QRCodeDisplay.tsx   # Vector QR code generator & export
│   ├── flow/
│   │   ├── ComponentPalette.tsx # Drag-and-drop input & logic toolbar
│   │   ├── CustomNodes.tsx      # Custom React Flow nodes
│   │   ├── FlowCanvas.tsx       # Interactive workflow graph canvas
│   │   └── NodeInspector.tsx    # Property configuration sidebar
│   └── form-runtime/
│       └── InteractiveFormRunner.tsx # Conversational form engine
├── convex/
│   ├── analytics.ts        # Telemetry & submissions mutations/queries
│   ├── forms.ts            # Form definitions & schema mutations
│   ├── projects.ts         # Project lifecycle & cascade deletion
│   └── schema.ts           # Convex database schema definition
├── lib/
│   ├── dataStore.ts        # Hybrid reactive data store layer
│   ├── flowCompiler.ts     # Graph compiler, DAG layout & logic evaluator
│   ├── user.ts             # Persistent isolated user identity
│   └── types/
│       └── flow.ts         # Flow & compiled form TypeScript types
└── next.config.js          # Next.js configuration & path aliases
```

---

## License

MIT License. Built with ❤️ by [AgentNex](https://github.com/AgentNex).
