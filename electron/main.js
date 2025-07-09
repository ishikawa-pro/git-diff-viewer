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
  const createRepoHistoryQuery = `
    CREATE TABLE IF NOT EXISTS repo_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      path TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      last_opened DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `;
  
  const createBranchHistoryQuery = `
    CREATE TABLE IF NOT EXISTS branch_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      repo_path TEXT NOT NULL,
      from_branch TEXT NOT NULL,
      to_branch TEXT NOT NULL,
      last_used DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(repo_path)
    )
  `;
  
  db.run(createRepoHistoryQuery, (err) => {
    if (err) {
      console.error('Error creating repo_history table:', err);
    } else {
      console.log('Repo history table ready');
    }
  });
  
  db.run(createBranchHistoryQuery, (err) => {
    if (err) {
      console.error('Error creating branch_history table:', err);
    } else {
      console.log('Branch history table ready');
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

function saveBranchHistory(repoPath, fromBranch, toBranch) {
  return new Promise((resolve, reject) => {
    const query = `
      INSERT OR REPLACE INTO branch_history (repo_path, from_branch, to_branch, last_used)
      VALUES (?, ?, ?, CURRENT_TIMESTAMP)
    `;
    
    db.run(query, [repoPath, fromBranch, toBranch], function(err) {
      if (err) {
        console.error('Error saving branch history:', err);
        reject(err);
      } else {
        console.log('Branch history saved for:', repoPath);
        resolve();
      }
    });
  });
}

function getBranchHistory(repoPath) {
  return new Promise((resolve, reject) => {
    const query = `
      SELECT from_branch, to_branch, last_used
      FROM branch_history
      WHERE repo_path = ?
      ORDER BY last_used DESC
      LIMIT 1
    `;
    
    db.get(query, [repoPath], (err, row) => {
      if (err) {
        console.error('Error getting branch history:', err);
        reject(err);
      } else {
        if (row) {
          resolve({
            fromBranch: row.from_branch,
            toBranch: row.to_branch,
            lastUsed: new Date(row.last_used)
          });
        } else {
          resolve(null);
        }
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
    icon: path.join(__dirname, '../logo.png'),
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
      // Initialize the git instance for this window
      const windowId = window.id;
      const windowData = windows.get(windowId);
      if (windowData) {
        windowData.git = simpleGit(repoPath);
        windowData.repoPath = repoPath;
        git = windowData.git; // Set global git for compatibility
      }
      
      // Send initialization message to frontend
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
  
  // Check if path was provided via CLI
  const cliPath = process.env.CLI_OPEN_PATH || process.argv[2];
  
  // If CLI path is provided, validate it
  if (cliPath) {
    if (fs.existsSync(cliPath) && fs.statSync(cliPath).isDirectory()) {
      // Check if it's a git repository
      if (fs.existsSync(path.join(cliPath, '.git'))) {
        createWindow(cliPath);
      } else {
        console.error('Error: Directory is not a Git repository');
        createWindow();
      }
    } else {
      console.error('Error: Invalid directory path');
      createWindow();
    }
  } else {
    // No CLI path provided, start normally with repository selector
    createWindow();
  }
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

ipcMain.handle('save-branch-history', async (event, repoPath, fromBranch, toBranch) => {
  try {
    await saveBranchHistory(repoPath, fromBranch, toBranch);
  } catch (error) {
    console.error('Failed to save branch history:', error);
    throw error;
  }
});

ipcMain.handle('get-branch-history', async (event, repoPath) => {
  try {
    return await getBranchHistory(repoPath);
  } catch (error) {
    console.error('Failed to get branch history:', error);
    return null;
  }
});

ipcMain.handle('get-local-diff', async (event) => {
  const senderWindow = BrowserWindow.fromWebContents(event.sender);
  const windowId = senderWindow.id;
  const windowData = windows.get(windowId);
  
  if (!windowData || !windowData.git) {
    throw new Error('No repository selected');
  }
  
  try {
    // Get working directory changes (unstaged changes)
    const workingDiff = await windowData.git.diff();
    
    // Get staged changes
    const stagedDiff = await windowData.git.diff(['--cached']);
    
    // Get diff summary for working directory
    const workingDiffSummary = await windowData.git.diffSummary();
    
    // Get diff summary for staged changes
    const stagedDiffSummary = await windowData.git.diffSummary(['--cached']);
    
    // Get git status to detect untracked files
    const status = await windowData.git.status();
    
    // Create file entries for untracked files (new files)
    const untrackedFiles = status.files
      .filter(file => file.working_dir === '?' && file.index === '?')
      .map(file => ({
        file: file.path,
        changes: 0,
        insertions: 0,
        deletions: 0,
        binary: false
      }));
    
    // Combine modified files with untracked files
    const allWorkingFiles = [...workingDiffSummary.files, ...untrackedFiles];
    
    return {
      workingDiff,
      stagedDiff,
      workingFiles: allWorkingFiles,
      stagedFiles: stagedDiffSummary.files,
      workingSummary: {
        insertions: workingDiffSummary.insertions,
        deletions: workingDiffSummary.deletions,
        total: workingDiffSummary.total
      },
      stagedSummary: {
        insertions: stagedDiffSummary.insertions,
        deletions: stagedDiffSummary.deletions,
        total: stagedDiffSummary.total
      }
    };
  } catch (error) {
    throw new Error(`Failed to get local diff: ${error.message}`);
  }
});

ipcMain.handle('get-local-file-diff', async (event, filePath, isStaged = false) => {
  const senderWindow = BrowserWindow.fromWebContents(event.sender);
  const windowId = senderWindow.id;
  const windowData = windows.get(windowId);
  
  if (!windowData || !windowData.git) {
    throw new Error('No repository selected');
  }
  
  try {
    let diff;
    if (isStaged) {
      // Get staged changes for specific file
      diff = await windowData.git.diff(['--cached', '--', filePath]);
    } else {
      // Get working directory changes for specific file
      diff = await windowData.git.diff(['--', filePath]);
      
      // If no diff found, check if it's a new untracked file
      if (!diff) {
        const status = await windowData.git.status();
        const fileStatus = status.files.find(file => file.path === filePath);
        
        if (fileStatus && fileStatus.working_dir === '?' && fileStatus.index === '?') {
          // This is a new untracked file, show it as entirely new content
          diff = await windowData.git.diff(['--no-index', '/dev/null', filePath]);
        }
      }
    }
    
    return { diff };
  } catch (error) {
    throw new Error(`Failed to get local file diff: ${error.message}`);
  }
}); 