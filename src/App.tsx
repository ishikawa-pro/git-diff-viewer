import React, { useState, useEffect, useRef } from 'react';
import RepositorySelector from './components/RepositorySelector';
import BranchSelector from './components/BranchSelector';
import DiffViewer from './components/DiffViewer';
import FileTree from './components/FileTree';
import { DiffData, FileChange, RepoInfo, RepoHistoryItem } from './types';

function App() {
  const [selectedRepo, setSelectedRepo] = useState<string | null>(null);
  const [branches, setBranches] = useState<string[]>([]);
  const [fromBranch, setFromBranch] = useState<string>('');
  const [toBranch, setToBranch] = useState<string>('');
  const [diffData, setDiffData] = useState<DiffData | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [repoInfo, setRepoInfo] = useState<RepoInfo | null>(null);
  const [fileDiffs, setFileDiffs] = useState<Record<string, string>>({});
  const [repoHistory, setRepoHistory] = useState<RepoHistoryItem[]>([]);
  const fileRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const selectRepository = async (repoPath?: string) => {
    try {
      let result;
      if (repoPath) {
        console.log('Initializing repository with path:', repoPath);
        result = await window.electronAPI.initializeRepository(repoPath);
      } else {
        result = await window.electronAPI.selectDirectory();
      }
      
      console.log('Repository selection result:', result);
      
      if (result.success && result.path) {
        setSelectedRepo(result.path);
        await loadBranches();
        await loadRepoInfo();
        await window.electronAPI.saveRepoHistory(result.path);
        await loadRepoHistory();
      } else if (result.error) {
        alert(`Repository error: ${result.error}`);
      }
    } catch (error) {
      console.error('Failed to select repository:', error);
      alert(`Failed to select repository: ${error instanceof Error ? error.message : String(error)}`);
    }
  };

  const loadBranches = async () => {
    try {
      const branchList = await window.electronAPI.getBranches();
      setBranches(branchList);
      
      try {
        const defaultBranch = await window.electronAPI.getDefaultBranch();
        if (defaultBranch && branchList.includes(defaultBranch)) {
          setFromBranch(defaultBranch);
        }
      } catch (defaultBranchError) {
        console.error('Failed to get default branch:', defaultBranchError);
      }
    } catch (error) {
      console.error('Failed to load branches:', error);
    }
  };

  const loadRepoInfo = async () => {
    try {
      const info = await window.electronAPI.getRepoInfo();
      setRepoInfo(info);
    } catch (error) {
      console.error('Failed to load repo info:', error);
    }
  };

  const loadRepoHistory = async () => {
    try {
      const history = await window.electronAPI.getRepoHistory();
      setRepoHistory(history);
    } catch (error) {
      console.error('Failed to load repo history:', error);
    }
  };

  useEffect(() => {
    loadRepoHistory();
  }, []);

  const fetchDiff = async () => {
    if (!fromBranch || !toBranch) return;

    setLoading(true);
    try {
      const data = await window.electronAPI.getDiff(fromBranch, toBranch);
      setDiffData(data);
      setSelectedFile(null);
      
      // 各ファイルの個別diffを取得
      const diffs: Record<string, string> = {};
      for (const file of data.files) {
        try {
          const result = await window.electronAPI.getFileDiff(fromBranch, toBranch, file.file);
          diffs[file.file] = result.diff;
        } catch (error) {
          console.error(`Failed to fetch diff for ${file.file}:`, error);
          diffs[file.file] = '';
        }
      }
      setFileDiffs(diffs);
    } catch (error) {
      console.error('Failed to fetch diff:', error);
      alert(`Failed to fetch diff: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = (file: string) => {
    setSelectedFile(file);
    // 選択されたファイルのコンポーネントまでスクロール
    const fileRef = fileRefs.current[file];
    if (fileRef) {
      fileRef.scrollIntoView({ 
        behavior: 'smooth', 
        block: 'start',
        inline: 'nearest'
      });
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <h1 className="text-3xl font-bold text-gray-900">Git Diff Viewer</h1>
            {selectedRepo && (
              <div className="text-sm text-gray-500">
                Repository: {selectedRepo.split('/').pop()}
                {repoInfo && (
                  <span className="ml-2 px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs">
                    {repoInfo.currentBranch}
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-8xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {!selectedRepo ? (
          <RepositorySelector onSelect={() => selectRepository()} repoHistory={repoHistory} onSelectFromHistory={(repoPath: string) => selectRepository(repoPath)} />
        ) : (
          <>
            <BranchSelector
              branches={branches}
              fromBranch={fromBranch}
              toBranch={toBranch}
              onFromBranchChange={setFromBranch}
              onToBranchChange={setToBranch}
              onCompare={fetchDiff}
            />

            {loading && (
              <div className="flex justify-center items-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            )}

            {diffData && (
              <div className="mt-8 grid grid-cols-1 lg:grid-cols-5 gap-6">
                <div className="lg:col-span-1">
                  <FileTree
                    files={diffData.files}
                    onFileSelect={handleFileSelect}
                    selectedFile={selectedFile}
                  />
                </div>
                <div className="lg:col-span-4">
                  <div className="space-y-6">
                    {diffData.files.map((file) => (
                      <div
                        key={file.file}
                        ref={(el) => {
                          fileRefs.current[file.file] = el;
                        }}
                        className={`transition-all duration-300 ${
                          selectedFile === file.file 
                            ? 'ring-2 ring-blue-500 ring-opacity-50 shadow-lg' 
                            : ''
                        }`}
                      >
                        <DiffViewer
                          diff={fileDiffs[file.file] || ''}
                          selectedFile={file.file}
                          fromBranch={fromBranch}
                          toBranch={toBranch}
                          isSelected={selectedFile === file.file}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default App; 