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
- 🖥️ **Command Line Interface**: Launch from terminal like VSCode's `code` command

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

### GUI Mode
1. Launch the application
2. Click "Open Repository" to select a local Git repository
3. Select the branches you want to compare
4. Click "Compare" to view the diff

### Command Line Interface (CLI)

The application also provides a command-line interface similar to VSCode's `code` command:

#### Development Environment
```bash
# Install CLI globally for development
npm link

# Open repository selector
diff-viewer

# Open specific Git repository
diff-viewer /path/to/your/git/repository
diff-viewer .  # Open current directory if it's a Git repo
```

#### Production Environment (After Building)

1. Build the application:
   ```bash
   npm run dist
   ```

2. Install the application on your system

3. Create a symbolic link to use the CLI globally:

   **macOS:**
   ```bash
   sudo ln -s "/Applications/Git Diff Viewer.app/Contents/Resources/cli.js" /usr/local/bin/diff-viewer
   ```

   **Windows:**
   ```batch
   # Create a batch file in a directory that's in your PATH
   # Contents of diff-viewer.bat:
   @echo off
   node "C:\Program Files\Git Diff Viewer\resources\cli.js" %*
   ```

   **Linux:**
   ```bash
   # After extracting the AppImage
   sudo ln -s "/path/to/extracted/git-diff-viewer/resources/cli.js" /usr/local/bin/diff-viewer
   ```

4. Use the CLI from anywhere:
   ```bash
   # Open repository selector
   diff-viewer

   # Open specific Git repository
   diff-viewer /path/to/your/git/repository
   diff-viewer .  # Open current directory
   ```

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