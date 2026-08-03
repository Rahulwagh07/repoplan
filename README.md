# RepoPlan — AI-Powered GitHub Issue to Implementation Plan

**RepoPlan** is an autonomous AI agent application that transforms GitHub issues and feature requests into detailed, codebase-aware implementation plans. Built with Next.js 16, LangGraph, OpenAI GPT-4o, and the GitHub API, RepoPlan navigates your repository file-by-file, critiques its own work, and delivers structured implementation guides grounded in code it actually read.

---

## Architecture

RepoPlan uses a **LangGraph StateGraph** state machine with a multi-step node workflow and a self-correcting critique loop.

### LangGraph Agent State Flow

```
                      ┌──────────────────────┐
                      │        START         │
                      └──────────┬───────────┘
                                 │
                                 ▼
                      ┌──────────────────────┐
                      │   understand_task    │
                      └──────────┬───────────┘
                                 │
                                 ▼
                      ┌──────────────────────┐ ◄──────┐
                      │  explore_repository  │        │
                      └──────────┬───────────┘        │
                                 │                    │
                                 ▼                    │
                      ┌──────────────────────┐        │
                      │   analyze_context    │        │
                      └──────────┬───────────┘        │
                                 │                    │
                                 ▼                    │
                      ┌──────────────────────┐        │
                      │    generate_plan     │        │
                      └──────────┬───────────┘        │
                                 │                    │
                                 ▼                    │
                      ┌──────────────────────┐        │
                      │    critique_plan     │        │
                      └──────────┬───────────┘        │
                                 │                    │
                   ┌─────────────┴─────────────┐      │
                   │ Conditional Routing Edge  │      │
                   └──────┬─────────────┬──────┘      │
          Approved /      │             │ Not Approved│
    Max Iterations        ▼             └─────────────┘
                      ┌──────────────────────┐
                      │    finalize_plan     │
                      └──────────┬───────────┘
                                 │
                                 ▼
                      ┌──────────────────────┐
                      │         END          │
                      └──────────────────────┘
```

### State Graph Nodes

1. **`understand_task`**: Parses the user prompt or fetches GitHub issue details via API if an issue URL is provided. Extracts task objectives, search keywords, and architectural requirements.
2. **`explore_repository`**: Runs an autonomous tool-calling loop using GitHub API tools (`get_repository_tree`, `search_code`, `read_file`, `get_package_info`). Navigates the repo systematically.
3. **`analyze_context`**: Synthesizes all inspected files and search results into concrete architectural findings grounded in actual code.
4. **`generate_plan`**: Generates a structured implementation plan containing summary, architecture breakdown, affected files, ordered steps, tests, risks, and uncertainties.
5. **`critique_plan`**: Acts as an independent reviewer node evaluating if all proposed file changes are backed by inspected evidence. Requests more context if gaps are found.
6. **`finalize_plan`**: Polishes the draft plan, removes unverified claims, and outputs the final implementation guide.

---

## Key Features

- **GitHub Issue Resolution**: Automatically resolves GitHub issue URLs (`github.com/owner/repo/issues/123`) and extracts issue title and body.
- **Autonomous Exploration**: Systematically explores codebase structure, checks dependency manifests (`package.json`, `Cargo.toml`, etc.), reads code, and searches patterns.
- **Self-Critique Loop**: Evaluates its own draft plans against codebase evidence. If information is missing, it loops back to explore further (up to a configurable maximum of 3 iterations).
- **Real-Time Streaming**: Streams agent progress and log events directly to the UI using Server-Sent Events (SSE).
- **Tailwind CSS v4 Design System**: Minimal, high-contrast, fast user experience using custom Tailwind CSS v4 layers and dynamic typography.

---

## Tech Stack

- **Framework**: Next.js 16 (App Router with Turbopack)
- **Agent Orchestration**: LangGraph (`@langchain/langgraph`)
- **LLM**: OpenAI GPT-4o (`@langchain/openai`)
- **GitHub API**: Octokit (`@octokit/rest`)
- **Styling**: Tailwind CSS v4 & PostCSS
- **Type Safety**: TypeScript & Zod (`zod` schema validation)
- **Package Manager**: Bun

---

## Getting Started

### Prerequisites

Create a `.env.local` file in the root directory:

```env
OPENAI_API_KEY=your_openai_api_key
GITHUB_TOKEN=your_github_personal_access_token
```

### Installation

Install dependencies:

```bash
bun install
```

### Development Server

Start the Next.js development server:

```bash
bun dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Build and Lint

Validate and build the production bundle:

```bash
# Run ESLint validation
bun run lint

# Build production bundle
bun run build
```

---

## Project Structure

```
├── app/
│   ├── api/analyze/route.ts   # SSE Streaming API endpoint running LangGraph
│   ├── globals.css            # Tailwind CSS v4 base & component layers
│   ├── layout.tsx             # Root layout with optimized Google Fonts
│   └── page.tsx               # Main RepoPlan landing page & analysis UI
├── components/
│   ├── AnalysisProgress.tsx   # Real-time agent log progress component
│   ├── ImplementationPlanView.tsx # Rendered implementation plan view
│   └── RepositoryForm.tsx     # Repository URL & task input form
├── lib/
│   ├── agent/                 # LangGraph state machine, nodes, and graph definition
│   │   ├── constants.ts       # Shared agent constants (MAX_ITERATIONS)
│   │   ├── graph.ts           # StateGraph definition and conditional router
│   │   ├── state.ts           # Root state annotation definition
│   │   └── nodes/             # LangGraph nodes (understand, explore, analyze, plan, critique, finalize)
│   ├── github/                # GitHub API Octokit integration & agent tools
│   ├── llm/                   # Structured OpenAI LLM client factory
│   └── utils/                 # Extracted GitHub regular expressions and helpers
└── types/                     # Shared TypeScript interfaces & types
```
