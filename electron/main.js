const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const { simpleGit } = require('simple-git');
const fs = require('fs');

let mainWindow;
let git;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    },
    icon: path.join(__dirname, 'assets/icon.png'),
    titleBarStyle: 'default',
    show: false
  });

  // Load the app
  const isDev = process.env.ELECTRON_IS_DEV === 'true' || process.env.NODE_ENV === 'development' || !app.isPackaged;
  
  if (isDev) {
    mainWindow.loadURL('http://localhost:3000').catch((err) => {
      console.error('Failed to load development server:', err);
      // Retry after a short delay
      setTimeout(() => {
        mainWindow.loadURL('http://localhost:3000');
      }, 1000);
    });
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../index.html'));
  }

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// IPC Handlers
ipcMain.handle('select-directory', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory'],
    title: 'Select Git Repository'
  });
  
  if (!result.canceled && result.filePaths.length > 0) {
    const repoPath = result.filePaths[0];
    
    // Check if it's a git repository
    if (fs.existsSync(path.join(repoPath, '.git'))) {
      git = simpleGit(repoPath);
      return { success: true, path: repoPath };
    } else {
      return { success: false, error: 'Selected directory is not a Git repository' };
    }
  }
  
  return { success: false, error: 'No directory selected' };
});

ipcMain.handle('get-branches', async () => {
  if (!git) {
    throw new Error('No repository selected');
  }
  
  try {
    const branches = await git.branch();
    return branches.all;
  } catch (error) {
    throw new Error(`Failed to get branches: ${error.message}`);
  }
});

ipcMain.handle('get-diff', async (event, fromBranch, toBranch) => {
  if (!git) {
    throw new Error('No repository selected');
  }
  
  try {
    const diff = await git.diff([fromBranch, toBranch]);
    const diffSummary = await git.diffSummary([fromBranch, toBranch]);
    
    return {
      diff,
      files: diffSummary.files,
      summary: {
        insertions: diffSummary.insertions,
        deletions: diffSummary.deletions,
        total: diffSummary.total
      }
    };
  } catch (error) {
    throw new Error(`Failed to get diff: ${error.message}`);
  }
});

ipcMain.handle('get-file-diff', async (event, fromBranch, toBranch, filePath) => {
  if (!git) {
    throw new Error('No repository selected');
  }
  
  try {
    const diff = await git.diff([fromBranch, toBranch, '--', filePath]);
    return { diff };
  } catch (error) {
    throw new Error(`Failed to get file diff: ${error.message}`);
  }
});

ipcMain.handle('get-repo-info', async () => {
  if (!git) {
    return null;
  }
  
  try {
    const remotes = await git.getRemotes();
    const status = await git.status();
    return {
      remotes: remotes.map(remote => remote.name),
      currentBranch: status.current,
      isClean: status.isClean()
    };
  } catch (error) {
    return null;
  }
}); 