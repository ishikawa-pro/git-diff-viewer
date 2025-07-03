const { app, BrowserWindow, ipcMain, dialog, Menu } = require('electron');
const path = require('path');
const { simpleGit } = require('simple-git');
const fs = require('fs');
const sqlite3 = require('sqlite3').verbose();

let mainWindow;
let git;
let db;
let windows = new Map();

function initDatabase() {
  const userDataPath = app.getPath('userData');
  const dbPath = path.join(userDataPath, 'diff-viewer.db');
  
  db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
      console.error('Error opening database:', err);
    } else {
      console.log('Connected to SQLite database');
      createTables();
    }
  });
}

function createTables() {
  const createTableQuery = `
    CREATE TABLE IF NOT EXISTS repo_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      path TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      last_opened DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `;
  
  db.run(createTableQuery, (err) => {
    if (err) {
      console.error('Error creating table:', err);
    } else {
      console.log('Repo history table ready');
    }
  });
}

function saveRepoHistory(repoPath) {
  return new Promise((resolve, reject) => {
    const repoName = path.basename(repoPath);
    const query = `
      INSERT OR REPLACE INTO repo_history (path, name, last_opened)
      VALUES (?, ?, CURRENT_TIMESTAMP)
    `;
    
    db.run(query, [repoPath, repoName], function(err) {
      if (err) {
        console.error('Error saving repo history:', err);
        reject(err);
      } else {
        console.log('Repo history saved for:', repoPath);
        resolve();
      }
    });
  });
}

function getRepoHistory() {
  return new Promise((resolve, reject) => {
    const query = `
      SELECT path, name, last_opened
      FROM repo_history
      ORDER BY last_opened DESC
      LIMIT 10
    `;
    
    db.all(query, [], (err, rows) => {
      if (err) {
        console.error('Error getting repo history:', err);
        reject(err);
      } else {
        const history = rows.map(row => ({
          path: row.path,
          name: row.name,
          lastOpened: new Date(row.last_opened)
        }));
        resolve(history);
      }
    });
  });
}

function createWindow(repoPath = null) {
  // Calculate position offset for new windows
  const windowCount = windows.size;
  const offset = windowCount * 30; // 30px offset for each new window
  
  const window = new BrowserWindow({
    width: 1400,
    height: 900,
    x: 100 + offset,
    y: 100 + offset,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    },
    icon: path.join(__dirname, 'assets/icon.png'),
    titleBarStyle: 'default',
    show: false
  });

  // Store window reference
  const windowId = window.id;
  windows.set(windowId, { window, repoPath, git: null });

  // Set main window if it's the first one
  if (!mainWindow) {
    mainWindow = window;
  }

  // Load the app
  const isDev = process.env.ELECTRON_IS_DEV === 'true' || process.env.NODE_ENV === 'development' || !app.isPackaged;
  
  if (isDev) {
    window.loadURL('http://localhost:3000').catch((err) => {
      console.error('Failed to load development server:', err);
      // Retry after a short delay
      setTimeout(() => {
        window.loadURL('http://localhost:3000');
      }, 1000);
    });
    window.webContents.openDevTools();
  } else {
    window.loadFile(path.join(__dirname, '../index.html'));
  }

  window.once('ready-to-show', () => {
    window.show();
    
    // If repoPath is provided, initialize the repository for this window
    if (repoPath) {
      window.webContents.send('initialize-with-repo', repoPath);
    }
  });

  window.on('closed', () => {
    windows.delete(windowId);
    if (window === mainWindow) {
      mainWindow = null;
    }
  });

  return window;
}

function createMenu() {
  const template = [
    {
      label: app.getName(),
      submenu: [
        { role: 'about' },
        { type: 'separator' },
        { role: 'services' },
        { type: 'separator' },
        { role: 'hide' },
        { role: 'hideothers' },
        { role: 'unhide' },
        { type: 'separator' },
        { role: 'quit' }
      ]
    },
    {
      label: 'File',
      submenu: [
        {
          label: 'New Window',
          accelerator: 'CmdOrCtrl+Shift+N',
          click: () => {
            createWindow();
          }
        },
        { type: 'separator' },
        { role: 'close' }
      ]
    },
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        { role: 'selectall' }
      ]
    },
    {
      label: 'View',
      submenu: [
        { role: 'reload' },
        { role: 'forceReload' },
        { role: 'toggleDevTools' },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' }
      ]
    },
    {
      label: 'Window',
      submenu: [
        { role: 'minimize' },
        { role: 'zoom' },
        { type: 'separator' },
        { role: 'front' }
      ]
    }
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

app.whenReady().then(() => {
  initDatabase();
  createMenu();
  createWindow();
});

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
ipcMain.handle('select-directory', async (event) => {
  const senderWindow = BrowserWindow.fromWebContents(event.sender);
  
  const result = await dialog.showOpenDialog(senderWindow, {
    properties: ['openDirectory'],
    title: 'Select Git Repository'
  });
  
  if (!result.canceled && result.filePaths.length > 0) {
    const repoPath = result.filePaths[0];
    
    // Check if it's a git repository
    if (fs.existsSync(path.join(repoPath, '.git'))) {
      const windowId = senderWindow.id;
      const windowData = windows.get(windowId);
      
      if (windowData) {
        windowData.git = simpleGit(repoPath);
        windowData.repoPath = repoPath;
        git = windowData.git; // Set global git for compatibility
      }
      
      return { success: true, path: repoPath };
    } else {
      return { success: false, error: 'Selected directory is not a Git repository' };
    }
  }
  
  return { success: false, error: 'No directory selected' };
});

ipcMain.handle('initialize-repository', async (event, repoPath) => {
  if (!repoPath) {
    return { success: false, error: 'No repository path provided' };
  }
  
  // Check if it's a git repository
  if (fs.existsSync(path.join(repoPath, '.git'))) {
    const senderWindow = BrowserWindow.fromWebContents(event.sender);
    const windowId = senderWindow.id;
    const windowData = windows.get(windowId);
    
    if (windowData) {
      windowData.git = simpleGit(repoPath);
      windowData.repoPath = repoPath;
      git = windowData.git; // Set global git for compatibility
    }
    
    return { success: true, path: repoPath };
  } else {
    return { success: false, error: 'Selected directory is not a Git repository' };
  }
});

ipcMain.handle('get-branches', async (event) => {
  const senderWindow = BrowserWindow.fromWebContents(event.sender);
  const windowId = senderWindow.id;
  const windowData = windows.get(windowId);
  
  if (!windowData || !windowData.git) {
    throw new Error('No repository selected');
  }
  
  try {
    const branches = await windowData.git.branch();
    return branches.all;
  } catch (error) {
    throw new Error(`Failed to get branches: ${error.message}`);
  }
});

ipcMain.handle('get-default-branch', async (event) => {
  const senderWindow = BrowserWindow.fromWebContents(event.sender);
  const windowId = senderWindow.id;
  const windowData = windows.get(windowId);
  
  if (!windowData || !windowData.git) {
    throw new Error('No repository selected');
  }
  
  try {
    const { exec } = require('child_process');
    const { promisify } = require('util');
    const execAsync = promisify(exec);
    
    try {
      const { stdout } = await execAsync('gh repo view --json defaultBranchRef --jq .defaultBranchRef.name', {
        cwd: windowData.git._baseDir
      });
      const defaultBranch = stdout.trim();
      if (defaultBranch) {
        return defaultBranch;
      }
    } catch (ghError) {
      console.log('gh command failed, falling back to git methods');
    }
    
    try {
      const remotes = await windowData.git.getRemotes();
      
      if (remotes.length > 0) {
        const remoteName = remotes[0].name;
        const result = await windowData.git.raw(['symbolic-ref', `refs/remotes/${remoteName}/HEAD`]);
        const defaultBranch = result.trim().replace(`refs/remotes/${remoteName}/`, '');
        return defaultBranch;
      }
    } catch (gitError) {
      console.log('git symbolic-ref failed, using branch detection');
    }
    
    const branches = await windowData.git.branch();
    if (branches.all.includes('main')) {
      return 'main';
    } else if (branches.all.includes('master')) {
      return 'master';
    }
    
    return branches.current || branches.all[0];
  } catch (error) {
    console.error('Error getting default branch:', error);
    const branches = await windowData.git.branch();
    return branches.current || branches.all[0] || 'main';
  }
});

ipcMain.handle('get-diff', async (event, fromBranch, toBranch) => {
  const senderWindow = BrowserWindow.fromWebContents(event.sender);
  const windowId = senderWindow.id;
  const windowData = windows.get(windowId);
  
  if (!windowData || !windowData.git) {
    throw new Error('No repository selected');
  }
  
  try {
    const diff = await windowData.git.diff([fromBranch, toBranch]);
    const diffSummary = await windowData.git.diffSummary([fromBranch, toBranch]);
    
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
  const senderWindow = BrowserWindow.fromWebContents(event.sender);
  const windowId = senderWindow.id;
  const windowData = windows.get(windowId);
  
  if (!windowData || !windowData.git) {
    throw new Error('No repository selected');
  }
  
  try {
    const diff = await windowData.git.diff([fromBranch, toBranch, '--', filePath]);
    return { diff };
  } catch (error) {
    throw new Error(`Failed to get file diff: ${error.message}`);
  }
});

ipcMain.handle('get-repo-info', async (event) => {
  const senderWindow = BrowserWindow.fromWebContents(event.sender);
  const windowId = senderWindow.id;
  const windowData = windows.get(windowId);
  
  if (!windowData || !windowData.git) {
    return null;
  }
  
  try {
    const remotes = await windowData.git.getRemotes();
    const status = await windowData.git.status();
    return {
      remotes: remotes.map(remote => remote.name),
      currentBranch: status.current,
      isClean: status.isClean()
    };
  } catch (error) {
    return null;
  }
});

ipcMain.handle('get-repo-history', async () => {
  try {
    return await getRepoHistory();
  } catch (error) {
    console.error('Failed to get repo history:', error);
    return [];
  }
});

ipcMain.handle('save-repo-history', async (event, repoPath) => {
  try {
    await saveRepoHistory(repoPath);
  } catch (error) {
    console.error('Failed to save repo history:', error);
    throw error;
  }
}); 