# Project Nexus — Gantt Chart Editor

A text-based Gantt chart editor and visualizer. Write your project plan in a simple text format and see it rendered as a Gantt chart in real time.

---

## Running Locally

### Option 1: Desktop App (Recommended)

Download the installer for your OS from the [Releases](../../releases) page:

- **macOS**: `Project Nexus-x.x.x.dmg` — open and drag to Applications
- **Windows**: `Project Nexus Setup x.x.x.exe` — run the installer
- **Linux**: `Project Nexus-x.x.x.AppImage` — make executable (`chmod +x`) and run

No Node.js or other tools required.

### Option 2: Open in Browser (No Install)

1. Download and unzip the `dist.zip` from the [Releases](../../releases) page
2. Open `dist/index.html` in **Firefox or Safari**
   - Chrome/Edge block local ES module scripts from `file://` — use Firefox or Safari instead
3. The app works fully — note that **"Save"** will download the file to your Downloads folder instead of saving in place (browser security limitation on local files)

If you have Node.js installed, you can also serve it over HTTP (works in all browsers):

```bash
npx serve dist
# then open http://localhost:3000
```

---

## For Developers

**Prerequisites:** Node.js 18+

```bash
npm install

# Web dev server (hot-reload)
npm run dev

# Electron dev window (hot-reload)
npm run electron:dev

# Build web app to dist/
npm run build

# Build Electron installers to release/
npm run electron:build        # current platform
npm run electron:build:mac    # macOS .dmg
npm run electron:build:win    # Windows .exe
npm run electron:build:linux  # Linux .AppImage + .deb
```

> **Note:** Building a macOS `.dmg` requires running on macOS. Building a Windows `.exe` requires Windows (or a CI environment).

---

## Tech Stack

- React 18 + TypeScript
- Vite 5
- Tailwind CSS
- Electron (desktop packaging)
