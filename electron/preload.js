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
  saveRepoHistory: (repoPath) => ipcRenderer.invoke('save-repo-history', repoPath)
}); 