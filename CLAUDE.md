# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Common Development Commands

### Development Server
```bash
npm run electron-dev
```
Starts both React development server (localhost:3000) and Electron app with hot reload.

### Production Build
```bash
npm run dist
```
Builds React app and creates distributable Electron packages.

### Testing
```bash
npm test
```
Runs React test suite with Jest.

### Alternative Commands
- `npm start` - React dev server only
- `npm run build` - Build React app for production
- `npm run electron` - Start Electron with pre-built React app

## Architecture Overview

This is an Electron-based desktop application for viewing Git diffs with a React frontend and Node.js backend.

### Key Components

**Electron Main Process (`electron/main.js`)**
- Manages SQLite database for repository history
- Handles Git operations via simple-git library
- Provides IPC APIs for frontend communication
- Database location: `app.getPath('userData')/diff-viewer.db`

**React Frontend (`src/`)**
- `App.tsx` - Main application state and repository selection logic
- `RepositorySelector` - Repository selection with history display
- `BranchSelector` - Branch comparison interface
- `DiffViewer` - Syntax-highlighted diff display
- `FileTree` - Hierarchical file navigation

**Data Flow**
1. User selects repository via `RepositorySelector`
2. Main process validates Git repository and saves to SQLite history
3. Frontend loads branches via `simple-git`
4. User selects branches for comparison
5. Main process generates diff data per file
6. Frontend displays diffs with syntax highlighting

### IPC Communication

Frontend communicates with Electron main process through these APIs:
- `selectDirectory()` - File dialog for repository selection
- `getBranches()` - Get all Git branches
- `getDiff(from, to)` - Get diff summary between branches
- `getFileDiff(from, to, file)` - Get individual file diff
- `getRepoInfo()` - Get current branch and remote info
- `getRepoHistory()` - Get SQLite repository history
- `saveRepoHistory(path)` - Save repository to history

### Database Schema

SQLite table `repo_history`:
- `id` (PRIMARY KEY)
- `path` (TEXT UNIQUE) - Repository path
- `name` (TEXT) - Repository name
- `last_opened` (DATETIME) - Last access timestamp

### Technology Stack

- **Frontend**: React 18, TypeScript, Tailwind CSS
- **Desktop**: Electron 27
- **Git**: simple-git library
- **Database**: SQLite3
- **Syntax Highlighting**: react-syntax-highlighter
- **Icons**: Lucide React
- **Build**: electron-builder