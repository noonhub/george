# Q-Learning Grid World Visualizer

Interactive React + TypeScript app that simulates a kid navigating a grid world with Q-learning. Configure rewards, distractions, and constraints, then watch the policy train in real time via a web worker.

## Prerequisites
- Node.js 18+ (install via nvm if needed)
- npm (bundled with Node)

## Setup
1. Install dependencies: `npm install`
2. Copy `.env.local` (already included) and set `GEMINI_API_KEY=<your key>` if you need Gemini access in the client. The app will still run without it, but the key is wired into Vite via `process.env.GEMINI_API_KEY`.

## Run the app
- Standard dev server with hot reload: `npm run dev`
- Dev server that restarts the whole process on file changes (nodemon): `npm run dev:watch`

The dev server listens on port 3000 by default (`vite.config.ts`).

## Tests
- Unit/integration tests with Vitest + Testing Library: `npm test`

## Build
- Production bundle: `npm run build`
- Preview the production build locally: `npm run preview`

## Project layout
- `App.tsx` – top-level layout wiring up controls, stats, and the grid.
- `components/` – UI pieces such as `GridWorld`, `Controls`, `Stats`, and `Header`.
- `hooks/useRLEngine.ts` – orchestrates training, state, and worker communication.
- `constants.ts`, `types.ts` – configuration defaults and shared types.
- `workers/` – training worker logic; keeps heavy computation off the UI thread.
- `tests/` – Vitest suites.

## Notes
- Vite aliases `@` to the repo root; import with `@/path/to/module`.
- If you change env vars, restart the dev server so Vite picks them up.
