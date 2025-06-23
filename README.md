# Git Diff Viewer (Electron)

A rich desktop application for viewing Git diffs between branches with syntax highlighting.

## Features

- 🖥️ **Desktop App**: Native desktop application built with Electron
- 🎨 **Syntax Highlighting**: Code is highlighted based on file type
- 📁 **File Tree**: Navigate through changed files easily
- 🔄 **Branch Comparison**: Compare any two branches
- 📊 **Change Statistics**: View insertions, deletions, and file counts
- 🎯 **Modern UI**: Clean and responsive design with Tailwind CSS
- 🔒 **Local Access**: Direct access to local Git repositories

## Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```

## Development

1. Start the development server:
   ```bash
   npm run electron-dev
   ```

This will start both the React development server and Electron app.

## Building

1. Build the production version:
   ```bash
   npm run dist
   ```

This will create distributable packages for your platform.

## Usage

1. Launch the application
2. Click "Open Repository" to select a local Git repository
3. Select the branches you want to compare
4. Click "Compare" to view the diff

## Project Structure

```
diff-viewer/
├── electron/         # Electron main process and preload
├── public/           # Static assets
├── src/              # React application
│   ├── components/   # React components
│   └── types.ts      # TypeScript type definitions
├── package.json      # Main package.json
└── README.md         # This file
```

## Technologies Used

- **Frontend**: React, TypeScript, Tailwind CSS
- **Desktop**: Electron
- **Git Operations**: simple-git
- **Syntax Highlighting**: Prism.js
- **Icons**: Lucide React
- **Build Tool**: electron-builder

## Available Scripts

- `npm start` - Start React development server
- `npm run electron` - Start Electron app (requires built React app)
- `npm run electron-dev` - Start both React dev server and Electron
- `npm run build` - Build React app for production
- `npm run dist` - Build distributable Electron app

## Requirements

- Node.js 16 or higher
- Git installed on your system
- A local Git repository to analyze

## Troubleshooting

If you encounter issues:

1. Make sure Git is installed and accessible from the command line
2. Ensure the selected directory is a valid Git repository
3. Check that you have the necessary permissions to access the repository
4. Verify that the branches you're comparing exist in the repository 