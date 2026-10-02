# ELMO — AI Workforce Operating System

> **ELMO (AI CEO & Autonomous Workforce Coordinator)**  
> Next-generation AI operating system built for autonomous enterprise workflows, real-time multilingual voice command, multi-tenant funnel orchestration, and multi-agent coordination.

[![Vitest Tests](https://img.shields.io/badge/Tests-756%20Passed-00D2FF?style=for-the-badge&logo=vitest&logoColor=white)](file:///tests)
[![Next.js](https://img.shields.io/badge/Next.js-14.2-black?style=for-the-badge&logo=next.js&logoColor=white)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.6-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![TailwindCSS](https://img.shields.io/badge/Tailwind-3.4-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![Supabase](https://img.shields.io/badge/Supabase-Database%20%26%20RLS-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white)](https://supabase.com/)

---

## 🌟 Overview

**ELMO** acts as the central executive brain of an organization. Unlike isolated conversational agents, ELMO connects strategic directives down to operational execution by coordinating specialist sub-agents, managing marketing and sales funnels, preserving institutional memory, and providing real-time voice-driven cockpit controls.

### Key Capabilities

- 🧠 **Central Intelligence & Orchestration**: Powered by Google Gemini with risk tiers, multi-turn context retention, and human-in-the-loop approvals.
- 👥 **Autonomous Specialist Workforce**:
  - **Web / Coding Specialist**: Interactive landing page builder with real-time multi-viewport preview (Desktop, Tablet, Mobile) and self-healing validation.
  - **Conversion Copywriter**: High-impact headlines, value propositions, and sales narratives.
  - **Growth & Marketing Strategist**: Audience targeting, acquisition channels, and campaign blueprints.
  - **Performance & Analytics Analyst**: Conversion rate optimization and funnel leak analysis.
  - **Market Researcher**: Competitive intelligence and pricing benchmarking.
- 🎙️ **Full-Duplex Multilingual Voice Engine**:
  - Hands-free wake word detection (*"Hey Elmo"* / *"Elmo"*).
  - Voice Activity Detection (VAD) with instant barge-in interruption.
  - Dynamic multilingual adaptation across English, Malay, Mandarin, and other regional languages without English bias.
  - FullScreen Speak Cockpit with 3D Holographic audio waveforms and status HUD.
- 🏢 **Multi-Tenant Funnel SaaS Platform**:
  - Strict Row Level Security (RLS) isolation by organization.
  - Funnels, pages, forms, email sequences, contacts, and automated workflows.
  - Episodic, Semantic, and Procedural long-term Company Memory.
- 🛸 **Cyberpunk Holographic Interface**:
  - Audio-reactive orbital rings, robot avatar state indicators, and pixelated progress bars.

---

## 🛠️ Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript 5.6
- **Styling**: Tailwind CSS + Custom Sci-Fi UI tokens
- **Icons**: Lucide React
- **Backend / DB**: Supabase (PostgreSQL with RLS)
- **AI / LLM**: Google Gemini 1.5 Flash & Pro via `GeminiService`
- **Testing**: Vitest 2.1 (73 test suites, 756 passing tests)

---

## 🚀 Quick Start

### 1. Prerequisites
- Node.js (v18 or higher)
- npm or pnpm

### 2. Installation
```bash
# Clone repository
git clone https://github.com/WernGH/ELMO.git
cd ELMO

# Install dependencies
npm install
```

### 3. Environment Setup
Create a `.env.local` file in the root directory:
```env
NEXT_PUBLIC_SUPABASE_URL=https://your-supabase-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
GEMINI_API_KEY=your-gemini-api-key
```
*(Refer to `.env.example` for the complete list of configuration options)*

### 4. Run Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) with your browser.

---

## 🧪 Testing & Validation

The project maintains comprehensive test coverage across unit, integration, and end-to-end acceptance flows:

```bash
# Run all vitest suites
npm run test

# Type checking
npm run typecheck
```

**Test Health:**
- ✅ 73 Test Files Passed
- ✅ 756 Tests Passed
- ✅ 0 Failures

---

## 📁 Repository Structure

```
elmo/
├── src/
│   ├── app/                      # Next.js App Router (Auth & Dashboard routes)
│   ├── components/               # React UI components (Holographic HUD, Voice, Dashboards)
│   ├── config/                   # Centralized typed environment configs
│   ├── hooks/                    # Custom React hooks (useVoice, useAudioVisualizer)
│   ├── lib/                      # Supabase client, MockDataStore, and utilities
│   ├── services/                 # Business logic, AI Orchestrator, Specialists, Voice Engine
│   └── types/                    # TypeScript interfaces & Supabase DB types
├── supabase/
│   └── migrations/               # PostgreSQL schema & RLS policies
└── tests/                        # 73 comprehensive Vitest test suites
```
```

---

## 🛡️ License

Private & Confidential — COAI International.
