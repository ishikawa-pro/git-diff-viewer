#!/usr/bin/env node

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

function openDirectory(targetPath) {
  let resolvedPath = null;
  let env = {
    ...process.env
  };
  
  // If path is provided, validate and resolve it
  if (targetPath) {
    resolvedPath = path.resolve(targetPath);
    
    if (!fs.existsSync(resolvedPath)) {
      console.error(`Error: Directory "${resolvedPath}" does not exist`);
      process.exit(1);
    }
    
    if (!fs.statSync(resolvedPath).isDirectory()) {
      console.error(`Error: "${resolvedPath}" is not a directory`);
      process.exit(1);
    }
    
    // Set environment variable to indicate CLI path
    env.CLI_OPEN_PATH = resolvedPath;
  }
  
  // Determine if we're in development or production
  const isPackaged = !fs.existsSync(path.join(__dirname, 'electron', 'main.js'));
  
  let electronPath, electronArgs;
  
  if (isPackaged) {
    // Production: Use the packaged application
    if (process.platform === 'darwin') {
      electronPath = path.join(__dirname, '..', 'MacOS', 'Git Diff Viewer');
    } else if (process.platform === 'win32') {
      electronPath = path.join(__dirname, '..', 'Git Diff Viewer.exe');
    } else {
      electronPath = path.join(__dirname, '..', 'git-diff-viewer');
    }
    electronArgs = resolvedPath ? [resolvedPath] : [];
  } else {
    // Development: Use electron with main script
    electronPath = path.join(__dirname, 'node_modules', '.bin', 'electron');
    const mainScript = path.join(__dirname, 'electron', 'main.js');
    electronArgs = resolvedPath ? [mainScript, resolvedPath] : [mainScript];
    env.ELECTRON_IS_DEV = 'true';
  }
  
  const electron = spawn(electronPath, electronArgs, {
    stdio: 'inherit',
    env: env
  });
  
  electron.on('error', (error) => {
    console.error('Failed to start application:', error.message);
    process.exit(1);
  });
  
  electron.on('exit', (code) => {
    process.exit(code);
  });
}

const args = process.argv.slice(2);
const targetPath = args[0];

openDirectory(targetPath);