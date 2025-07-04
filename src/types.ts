export interface FileChange {
  file: string;
  changes: number;
  insertions: number;
  deletions: number;
}

export interface DiffData {
  diff: string;
  files: FileChange[];
  summary: {
    insertions: number;
    deletions: number;
    total: number;
  };
}

export interface RepoInfo {
  remotes: string[];
  currentBranch: string;
  isClean: boolean;
}

export interface RepoHistoryItem {
  path: string;
  name: string;
  lastOpened: Date;
}

export interface BranchHistory {
  fromBranch: string;
  toBranch: string;
  lastUsed: Date;
}

declare global {
  interface Window {
    electronAPI: {
      selectDirectory: () => Promise<{ success: boolean; path?: string; error?: string }>;
      initializeRepository: (repoPath: string) => Promise<{ success: boolean; path?: string; error?: string }>;
      getBranches: () => Promise<string[]>;
      getDefaultBranch: () => Promise<string>;
      getDiff: (fromBranch: string, toBranch: string) => Promise<DiffData>;
      getFileDiff: (fromBranch: string, toBranch: string, filePath: string) => Promise<{ diff: string }>;
      getRepoInfo: () => Promise<RepoInfo | null>;
      getRepoHistory: () => Promise<RepoHistoryItem[]>;
      saveRepoHistory: (repoPath: string) => Promise<void>;
      saveBranchHistory: (repoPath: string, fromBranch: string, toBranch: string) => Promise<void>;
      getBranchHistory: (repoPath: string) => Promise<BranchHistory | null>;
      onInitializeWithRepo: (callback: (event: any, repoPath: string) => void) => void;
      removeInitializeWithRepoListener: (callback: (event: any, repoPath: string) => void) => void;
    };
  }
} 