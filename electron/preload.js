const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  selectDirectory: () => ipcRenderer.invoke('select-directory'),
  getBranches: () => ipcRenderer.invoke('get-branches'),
  getDiff: (fromBranch, toBranch) => ipcRenderer.invoke('get-diff', fromBranch, toBranch),
  getFileDiff: (fromBranch, toBranch, filePath) => ipcRenderer.invoke('get-file-diff', fromBranch, toBranch, filePath),
  getRepoInfo: () => ipcRenderer.invoke('get-repo-info')
}); 