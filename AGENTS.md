# AGENTS.md

## Cursor Cloud specific instructions

**Project Nexus** is a client-side-only Gantt chart editor (React 18 + TypeScript + Vite 5 + Tailwind CSS). No backend, database, or external services are required.

### Services

| Service | Command | URL | Notes |
|---------|---------|-----|-------|
| Vite dev server | `npm run dev` | http://127.0.0.1:5173 | Only service needed for development |

### Key commands

See `package.json` scripts and `README.md` "For Developers" section. Key ones:

- **Dev server**: `npm run dev`
- **Build**: `npm run build` (runs `tsc && vite build`)
- **Electron dev**: `npm run electron:dev` (starts Vite + Electron concurrently)

### Notes

- There is no linter or test runner configured in `package.json`. TypeScript compilation (`tsc`) serves as the primary static check.
- The app uses the browser File System Access API for file I/O; "Save" in Chrome works natively, while other browsers fall back to download.
- The text editor is on the left pane; the Gantt chart SVG renders in real-time on the right pane.
