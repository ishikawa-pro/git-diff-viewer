const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  selectDirectory: () => ipcRenderer.invoke('select-directory'),
  initializeRepository: (repoPath) => ipcRenderer.invoke('initialize-repository', repoPath),
  getBranches: () => ipcRenderer.invoke('get-branches'),
  getDefaultBranch: () => ipcRenderer.invoke('get-default-branch'),
  getDiff: (fromBranch, toBranch) => ipcRenderer.invoke('get-diff', fromBranch, toBranch),
  getFileDiff: (fromBranch, toBranch, filePath) => ipcRenderer.invoke('get-file-diff', fromBranch, toBranch, filePath),
  getRepoInfo: () => ipcRenderer.invoke('get-repo-info'),
  getRepoHistory: () => ipcRenderer.invoke('get-repo-history'),
  saveRepoHistory: (repoPath) => ipcRenderer.invoke('save-repo-history', repoPath),
  saveBranchHistory: (repoPath, fromBranch, toBranch) => ipcRenderer.invoke('save-branch-history', repoPath, fromBranch, toBranch),
  getBranchHistory: (repoPath) => ipcRenderer.invoke('get-branch-history', repoPath),
  
  // Event listener for CLI initialization
  onInitializeWithRepo: (callback) => ipcRenderer.on('initialize-with-repo', callback),
  removeInitializeWithRepoListener: (callback) => ipcRenderer.removeListener('initialize-with-repo', callback)
}); 