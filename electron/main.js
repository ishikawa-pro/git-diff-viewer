const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const { simpleGit } = require('simple-git');
const fs = require('fs');
const sqlite3 = require('sqlite3').verbose();

let mainWindow;
let git;
let db;

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

app.whenReady().then(() => {
  initDatabase();
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

ipcMain.handle('initialize-repository', async (event, repoPath) => {
  if (!repoPath) {
    return { success: false, error: 'No repository path provided' };
  }
  
  // Check if it's a git repository
  if (fs.existsSync(path.join(repoPath, '.git'))) {
    git = simpleGit(repoPath);
    return { success: true, path: repoPath };
  } else {
    return { success: false, error: 'Selected directory is not a Git repository' };
  }
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

ipcMain.handle('get-default-branch', async () => {
  if (!git) {
    throw new Error('No repository selected');
  }
  
  try {
    const { exec } = require('child_process');
    const { promisify } = require('util');
    const execAsync = promisify(exec);
    
    try {
      const { stdout } = await execAsync('gh repo view --json defaultBranchRef --jq .defaultBranchRef.name', {
        cwd: git._baseDir
      });
      const defaultBranch = stdout.trim();
      if (defaultBranch) {
        return defaultBranch;
      }
    } catch (ghError) {
      console.log('gh command failed, falling back to git methods');
    }
    
    try {
      const remotes = await git.getRemotes();
      
      if (remotes.length > 0) {
        const remoteName = remotes[0].name;
        const result = await git.raw(['symbolic-ref', `refs/remotes/${remoteName}/HEAD`]);
        const defaultBranch = result.trim().replace(`refs/remotes/${remoteName}/`, '');
        return defaultBranch;
      }
    } catch (gitError) {
      console.log('git symbolic-ref failed, using branch detection');
    }
    
    const branches = await git.branch();
    if (branches.all.includes('main')) {
      return 'main';
    } else if (branches.all.includes('master')) {
      return 'master';
    }
    
    return branches.current || branches.all[0];
  } catch (error) {
    console.error('Error getting default branch:', error);
    const branches = await git.branch();
    return branches.current || branches.all[0] || 'main';
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