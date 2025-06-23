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

declare global {
  interface Window {
    electronAPI: {
      selectDirectory: () => Promise<{ success: boolean; path?: string; error?: string }>;
      getBranches: () => Promise<string[]>;
      getDiff: (fromBranch: string, toBranch: string) => Promise<DiffData>;
      getFileDiff: (fromBranch: string, toBranch: string, filePath: string) => Promise<{ diff: string }>;
      getRepoInfo: () => Promise<RepoInfo | null>;
    };
  }
} 