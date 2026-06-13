# AI-LiDAR Desktop App — Build Guide

This project is packaged as a full **Electron desktop application** that runs entirely
offline. The Express backend and React frontend are bundled into a single installable
binary for Windows, macOS, and Linux.

---

## Quick Start (run as a desktop window from source)

```bash
# 1. Clone / download the project
git clone <your-replit-url>
cd ai-lidar-disaster-assessment

# 2. Install dependencies (requires Node.js 18+)
npm install

# 3. Launch in desktop window (dev mode)
npm run electron:dev
```

This opens a native desktop window running the full AI-LiDAR platform at
`http://localhost:5000` — no browser needed.

---

## Build Distributable Installers

### Windows (.exe installer + portable)
```bash
npm run electron:build:win
```
Outputs:
- `release/AI-LiDAR Disaster Assessment Setup 1.0.0.exe` — NSIS installer
- `release/AI-LiDAR Disaster Assessment 1.0.0.exe` — Portable (no install needed)

### macOS (.dmg)
```bash
npm run electron:build:mac
```
Outputs:
- `release/AI-LiDAR Disaster Assessment-1.0.0.dmg` — Drag-to-Applications installer
- `release/AI-LiDAR Disaster Assessment-1.0.0-mac.zip` — Zipped app bundle

### Linux (.AppImage + .deb)
```bash
npm run electron:build:linux
```
Outputs:
- `release/AI-LiDAR Disaster Assessment-1.0.0.AppImage` — Universal (no install)
- `release/AI-LiDAR Disaster Assessment_1.0.0_amd64.deb` — Debian/Ubuntu package

### All platforms at once (run on the target OS)
```bash
npm run electron:build
```

---

## Architecture

```
┌─────────────────────────────────────────┐
│         Electron Desktop Window          │
│  (BrowserWindow → http://127.0.0.1:5000) │
└──────────────────┬──────────────────────┘
                   │
┌──────────────────▼──────────────────────┐
│       Express API Server (in-app)        │
│  • REST API  (/api/*)                   │
│  • WebSocket (/ws) — real-time events   │
│  • Serves built React SPA               │
└──────────────────┬──────────────────────┘
                   │
┌──────────────────▼──────────────────────┐
│         React Frontend (SPA)            │
│  9 pages: Dashboard, LiDAR System,      │
│  Real-Time Monitor, CNN Pipeline,       │
│  Decision Support, Alerts, Analytics,   │
│  Damage Assessment, Map View            │
└─────────────────────────────────────────┘
```

## What runs fully offline
- All data is in-memory (no external DB needed)
- WebSocket server runs locally
- LiDAR simulation, CNN processing pipeline, alerts all work without internet
- 3D point cloud viewer uses Canvas 2D (no GPU required)

## System requirements
| Platform | Minimum |
|----------|---------|
| Windows  | Windows 10 x64 |
| macOS    | macOS 10.15 Catalina |
| Linux    | Ubuntu 18.04+ / any modern distro |
| RAM      | 512 MB |
| Disk     | ~250 MB |
| Node.js* | 18+ (only needed to build from source) |

*Not required for the packaged installer — Electron bundles its own Node.js runtime.

---

## Application Menu Shortcuts

| Shortcut | Action |
|----------|--------|
| `Cmd/Ctrl+1` | Dashboard |
| `Cmd/Ctrl+2` | Real-Time Monitor |
| `Cmd/Ctrl+3` | LiDAR System |
| `Cmd/Ctrl+4` | CNN Pipeline |
| `Cmd/Ctrl+5` | Decision Support |
| `F12` | Toggle Developer Tools |
| `F11` | Toggle Fullscreen |

---

## Research Paper Reference

**"AI And LiDAR for Humanitarian Aid and Disaster Relief"**  
Authors: Wagh et al. | Published: JSPM's JSCE Pune

This desktop application implements the complete pipeline from the paper:
- Velodyne VLP-32C LiDAR sensor simulation (600K pts/s, 32 beams, 903nm)
- PointNet++ CNN classifier (89% accuracy, 3 damage classes)
- Real-time WebSocket streaming of scan events
- Decision support with priority zone ranking
- 3D structural damage visualization
