import React, { useState, useEffect, useRef, useCallback } from 'react';
import RepositorySelector from './components/RepositorySelector';
import BranchCompareView from './components/BranchCompareView';
import LocalChangesView from './components/LocalChangesView';
import GlobalSidebar, { ViewMode } from './components/GlobalSidebar';
import GlobalSearch, { GlobalSearchRef } from './components/GlobalSearch';
import { DiffData, FileChange, RepoInfo, RepoHistoryItem, LocalDiffData } from './types';
import { ArrowLeft } from 'lucide-react';
import { useVimKeyBindings } from './hooks/useVimKeyBindings';

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
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isGlobalRefreshing, setIsGlobalRefreshing] = useState(false);
  const fileRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const [localDiffData, setLocalDiffData] = useState<LocalDiffData | null>(null);
  const [localFileDiffs, setLocalFileDiffs] = useState<Record<string, { working: string; staged: string }>>({});
  const [currentView, setCurrentView] = useState<ViewMode>('repository-select');
  const [showGlobalSearch, setShowGlobalSearch] = useState(false);
  const [globalSearchTerm, setGlobalSearchTerm] = useState('');
  const [currentSearchResult, setCurrentSearchResult] = useState<{ fileIndex: number; lineIndex: number; globalIndex: number } | null>(null);
  const [isSearchScrolling, setIsSearchScrolling] = useState(false);
  const globalSearchRef = useRef<GlobalSearchRef>(null);
  const [sidebarVisible, setSidebarVisible] = useState(true);

  // vim風キーバインドを有効にする
  useVimKeyBindings({
    enabled: true,
    onScrollUp: (amount = 50) => {
      window.scrollBy({ top: -amount, behavior: 'smooth' });
    },
    onScrollDown: (amount = 50) => {
      window.scrollBy({ top: amount, behavior: 'smooth' });
    },
    onPageUp: () => {
      const pageHeight = window.innerHeight * 0.5;
      window.scrollBy({ top: -pageHeight, behavior: 'smooth' });
    },
    onPageDown: () => {
      const pageHeight = window.innerHeight * 0.5;
      window.scrollBy({ top: pageHeight, behavior: 'smooth' });
    }
  });

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
        await loadBranchesForRepo(result.path);
        await loadRepoInfo();
        await window.electronAPI.saveRepoHistory(result.path);
        await loadRepoHistory();
        // リポジトリ選択後、ローカル変更ビューに切り替え
        setCurrentView('local-changes');
        // サイドバーを隠す
        setSidebarVisible(false);
      } else if (result.error) {
        alert(`Repository error: ${result.error}`);
      }
    } catch (error) {
      console.error('Failed to select repository:', error);
      alert(`Failed to select repository: ${error instanceof Error ? error.message : String(error)}`);
    }
  };

  const loadBranchesForRepo = async (repoPath: string) => {
    try {
      const branchList = await window.electronAPI.getBranches();
      setBranches(branchList);

      let restoredFromBranch = '';
      let restoredToBranch = '';

      try {
        const branchHistory = await window.electronAPI.getBranchHistory(repoPath);
        console.log('Branch history for repo:', repoPath, branchHistory);
        if (branchHistory) {
          if (branchList.includes(branchHistory.fromBranch)) {
            restoredFromBranch = branchHistory.fromBranch;
            setFromBranch(branchHistory.fromBranch);
            console.log('Restored fromBranch:', branchHistory.fromBranch);
          }
          if (branchList.includes(branchHistory.toBranch)) {
            restoredToBranch = branchHistory.toBranch;
            setToBranch(branchHistory.toBranch);
            console.log('Restored toBranch:', branchHistory.toBranch);
          }
        } else {
          console.log('No branch history found for repo:', repoPath);
        }
      } catch (branchHistoryError) {
        console.error('Failed to get branch history:', branchHistoryError);
      }

      if (!restoredFromBranch) {
        try {
          const defaultBranch = await window.electronAPI.getDefaultBranch();
          if (defaultBranch && branchList.includes(defaultBranch)) {
            setFromBranch(defaultBranch);
          }
        } catch (defaultBranchError) {
          console.error('Failed to get default branch:', defaultBranchError);
        }
      }
    } catch (error) {
      console.error('Failed to load branches:', error);
    }
  };

  const loadBranches = async () => {
    if (!selectedRepo) return;
    await loadBranchesForRepo(selectedRepo);
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

    // Listen for CLI initialization
    const handleInitializeWithRepo = (_event: any, repoPath: string) => {
      console.log('Received initialize-with-repo event with path:', repoPath);
      selectRepository(repoPath);
    };

    window.electronAPI.onInitializeWithRepo(handleInitializeWithRepo);

    return () => {
      window.electronAPI.removeInitializeWithRepoListener(handleInitializeWithRepo);
    };
  }, []);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.metaKey && event.shiftKey && event.key === 'r') {
        event.preventDefault();
        handleGlobalRefresh();
      }
      if ((event.metaKey || event.ctrlKey) && event.key === 'f') {
        event.preventDefault();
        if (showGlobalSearch) {
          // If search is already visible, focus the input using ref
          globalSearchRef.current?.focusInput();
        } else {
          // If search is not visible, show it
          setShowGlobalSearch(true);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [fromBranch, toBranch, showGlobalSearch]);

  const fetchDiff = async () => {
    if (!fromBranch || !toBranch) return;

    setLoading(true);
    try {
      const data = await window.electronAPI.getDiff(fromBranch, toBranch);
      setDiffData(data);
      setSelectedFile(null);

      if (selectedRepo) {
        try {
          await window.electronAPI.saveBranchHistory(selectedRepo, fromBranch, toBranch);
          console.log('Saved branch history:', selectedRepo, fromBranch, toBranch);
        } catch (error) {
          console.error('Failed to save branch history:', error);
        }
      }

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
  };
  
  const handleFileSelectWithScroll = (file: string) => {
    setSelectedFile(file);
    // スクロール処理（FileTreeからの選択時のみ、検索中でない場合）
    if (!isSearchScrolling) {
      setTimeout(() => {
        const targetDiffViewer = document.querySelector(`[data-diff-viewer="${file}"]`);
        if (targetDiffViewer) {
          targetDiffViewer.scrollIntoView({
            behavior: 'smooth',
            block: 'start',
            inline: 'nearest'
          });
        }
      }, 100);
    }
  };

  const handleRefresh = async () => {
    if (!fromBranch || !toBranch) return;

    setIsRefreshing(true);
    try {
      await fetchDiff();
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleGlobalRefresh = async () => {
    setIsGlobalRefreshing(true);
    try {
      await loadRepoInfo();
      if (currentView === 'local-changes') {
        await fetchLocalDiff();
      } else if (currentView === 'branch-compare' && fromBranch && toBranch) {
        await fetchDiff();
      }
    } finally {
      setIsGlobalRefreshing(false);
    }
  };

  const fetchLocalDiff = async () => {
    setLoading(true);
    try {
      const data = await window.electronAPI.getLocalDiff();
      setLocalDiffData(data);
      setSelectedFile(null);

      // 各ファイルの個別ローカル差分を取得
      const diffs: Record<string, { working: string; staged: string }> = {};
      const allFiles = new Set([...data.workingFiles.map(f => f.file), ...data.stagedFiles.map(f => f.file)]);

      for (const file of allFiles) {
        try {
          const [workingResult, stagedResult] = await Promise.all([
            window.electronAPI.getLocalFileDiff(file, false),
            window.electronAPI.getLocalFileDiff(file, true)
          ]);
          diffs[file] = {
            working: workingResult.diff,
            staged: stagedResult.diff
          };
        } catch (error) {
          console.error(`Failed to fetch local diff for ${file}:`, error);
          diffs[file] = { working: '', staged: '' };
        }
      }
      setLocalFileDiffs(diffs);
    } catch (error) {
      console.error('Failed to fetch local diff:', error);
      alert(`Failed to fetch local diff: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  const handleViewChange = (view: ViewMode) => {
    setCurrentView(view);
    // ビュー切り替え時に選択されたファイルをリセット
    setSelectedFile(null);
    // 必要に応じて他の状態もリセット
    if (view !== 'branch-compare') {
      setDiffData(null);
    }
    if (view !== 'local-changes') {
      setLocalDiffData(null);
    }
    // Local Changes または Branch Compare ビューに切り替える時にサイドバーを隠す
    if (view === 'local-changes' || view === 'branch-compare') {
      setSidebarVisible(false);
    }
    // Repository 選択画面に戻る時はサイドバーを表示
    if (view === 'repository-select') {
      setSidebarVisible(true);
    }
  };

  const backToRepositorySelection = () => {
    setSelectedRepo(null);
    setBranches([]);
    setFromBranch('');
    setToBranch('');
    setDiffData(null);
    setSelectedFile(null);
    setRepoInfo(null);
    setFileDiffs({});
    setLocalDiffData(null);
    setLocalFileDiffs({});
    setCurrentView('repository-select');
    // リポジトリ選択画面に戻る時はサイドバーを表示
    setSidebarVisible(true);
  };

  const getDiffDataForSearch = useCallback(() => {
    const searchData: Array<{ fileName: string; content: string; originalFileName: string }> = [];
    
    if (currentView === 'branch-compare' && diffData) {
      diffData.files.forEach(file => {
        const diff = fileDiffs[file.file];
        if (diff) {
          searchData.push({
            fileName: file.file,
            content: diff,
            originalFileName: file.file
          });
        }
      });
    } else if (currentView === 'local-changes' && localDiffData) {
      const allFiles = new Set([
        ...localDiffData.workingFiles.map(f => f.file),
        ...localDiffData.stagedFiles.map(f => f.file)
      ]);
      
      allFiles.forEach(fileName => {
        const fileDiff = localFileDiffs[fileName];
        if (fileDiff) {
          // Working changes
          if (fileDiff.working) {
            searchData.push({
              fileName: `${fileName} (working)`,
              content: fileDiff.working,
              originalFileName: fileName
            });
          }
          // Staged changes
          if (fileDiff.staged) {
            searchData.push({
              fileName: `${fileName} (staged)`,
              content: fileDiff.staged,
              originalFileName: fileName
            });
          }
        }
      });
    }
    
    return searchData;
  }, [currentView, diffData, fileDiffs, localDiffData, localFileDiffs]);

  const handleSearchNavigate = useCallback((fileIndex: number, lineIndex: number, globalIndex?: number) => {
    const searchData = getDiffDataForSearch();
    if (fileIndex >= 0 && fileIndex < searchData.length) {
      const targetFile = searchData[fileIndex];
      
      setIsSearchScrolling(true);
      setSelectedFile(targetFile.originalFileName);
      setCurrentSearchResult({ fileIndex, lineIndex, globalIndex: globalIndex || 0 });
      
      // Use a single, optimized scroll approach
      setTimeout(() => {
        // Find the specific line element directly
        const lineElement = document.querySelector(`[data-diff-viewer="${targetFile.originalFileName}"] [data-line-index="${lineIndex}"]`);
        
        if (lineElement) {
          console.log('Direct scroll to line:', lineIndex, 'in file:', targetFile.originalFileName);
          // Single scroll directly to the target line
          lineElement.scrollIntoView({ 
            behavior: 'smooth', 
            block: 'center',
            inline: 'nearest'
          });
          
          // Reset scroll flag after scroll completes
          setTimeout(() => setIsSearchScrolling(false), 1000);
        } else {
          // Fallback: scroll to DiffViewer component first, then to line
          const targetDiffViewer = document.querySelector(`[data-diff-viewer="${targetFile.originalFileName}"]`);
          if (targetDiffViewer) {
            console.log('Fallback: scroll to DiffViewer first, then line');
            targetDiffViewer.scrollIntoView({
              behavior: 'smooth',
              block: 'start',
              inline: 'nearest'
            });
            
            // After a longer delay, scroll to the specific line
            setTimeout(() => {
              const lineElement = targetDiffViewer.querySelector(`[data-line-index="${lineIndex}"]`);
              if (lineElement) {
                lineElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
              }
              // Reset scroll flag after both scrolls complete
              setTimeout(() => setIsSearchScrolling(false), 500);
            }, 800);
          } else {
            console.log('No DiffViewer found for:', targetFile.originalFileName);
            setIsSearchScrolling(false);
          }
        }
      }, 400);
    }
  }, [getDiffDataForSearch]);
  
  const handleSearchTermChange = useCallback((term: string) => {
    setGlobalSearchTerm(term);
    if (!term.trim()) {
      setCurrentSearchResult(null);
    }
  }, []);
  
  const getCurrentSearchLineIndex = () => {
    if (!currentSearchResult || !selectedFile) return -1;
    
    const searchData = getDiffDataForSearch();
    const currentFileData = searchData.find(data => data.originalFileName === selectedFile);
    
    if (!currentFileData) return -1;
    
    const currentFileIndex = searchData.findIndex(data => data.originalFileName === selectedFile);
    if (currentFileIndex === currentSearchResult.fileIndex) {
      console.log('getCurrentSearchLineIndex:', {
        selectedFile,
        fileIndex: currentSearchResult.fileIndex,
        lineIndex: currentSearchResult.lineIndex,
        globalIndex: currentSearchResult.globalIndex
      });
      return currentSearchResult.lineIndex;
    }
    
    return -1;
  };
  
  const getCurrentSearchGlobalIndex = () => {
    if (!currentSearchResult) return -1;
    return currentSearchResult.globalIndex;
  };

  const toggleSidebar = () => {
    setSidebarVisible(!sidebarVisible);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Global Sidebar */}
      {sidebarVisible && (
        <GlobalSidebar
          currentView={currentView}
          onViewChange={handleViewChange}
          selectedRepo={selectedRepo}
        />
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col">
        {currentView === 'repository-select' && (
          <div className="flex-1 flex flex-col">
            {/* Header */}
            <div className="bg-white shadow-sm border-b px-6 py-4 sticky top-0 z-10">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <button
                    onClick={toggleSidebar}
                    className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-full transition-colors"
                    title={sidebarVisible ? "Hide sidebar" : "Show sidebar"}
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                    </svg>
                  </button>
                  <h1 className="text-2xl font-bold text-gray-900">Select Repository</h1>
                </div>
                {selectedRepo && (
                  <button
                    onClick={backToRepositorySelection}
                    className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-full transition-colors"
                    title="Reset repository selection"
                  >
                    <ArrowLeft size={20} />
                  </button>
                )}
              </div>
              {selectedRepo && (
                <div className="text-sm text-gray-500 mt-2">
                  Current: {selectedRepo.split('/').pop()}
                  {repoInfo && (
                    <span className="ml-2 px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs">
                      {repoInfo.currentBranch}
                    </span>
                  )}
                </div>
              )}
            </div>
            
            {/* Repository Selector */}
            <div className="flex-1 p-6">
              <RepositorySelector 
                onSelect={() => selectRepository()} 
                repoHistory={repoHistory} 
                onSelectFromHistory={(repoPath: string) => selectRepository(repoPath)} 
              />
            </div>
          </div>
        )}

        {currentView === 'branch-compare' && selectedRepo && (
          <BranchCompareView
            branches={branches}
            fromBranch={fromBranch}
            toBranch={toBranch}
            diffData={diffData}
            fileDiffs={fileDiffs}
            selectedFile={selectedFile}
            loading={loading}
            isRefreshing={isRefreshing}
            isGlobalRefreshing={isGlobalRefreshing}
            onFromBranchChange={setFromBranch}
            onToBranchChange={setToBranch}
            onCompare={fetchDiff}
            onFileSelect={handleFileSelectWithScroll}
            onRefresh={handleRefresh}
            onGlobalRefresh={handleGlobalRefresh}
            searchTerm={globalSearchTerm}
            currentSearchLineIndex={getCurrentSearchLineIndex()}
            currentSearchGlobalIndex={getCurrentSearchGlobalIndex()}
            sidebarVisible={sidebarVisible}
            onToggleSidebar={toggleSidebar}
          />
        )}

        {currentView === 'local-changes' && selectedRepo && (
          <LocalChangesView
            localDiffData={localDiffData}
            localFileDiffs={localFileDiffs}
            selectedFile={selectedFile}
            loading={loading}
            isRefreshing={isRefreshing}
            isGlobalRefreshing={isGlobalRefreshing}
            onFetchLocalDiff={fetchLocalDiff}
            onFileSelect={handleFileSelectWithScroll}
            onRefresh={handleRefresh}
            onGlobalRefresh={handleGlobalRefresh}
            searchTerm={globalSearchTerm}
            currentSearchLineIndex={getCurrentSearchLineIndex()}
            currentSearchGlobalIndex={getCurrentSearchGlobalIndex()}
            sidebarVisible={sidebarVisible}
            onToggleSidebar={toggleSidebar}
          />
        )}

        {/* Fallback: Repository not selected */}
        {(currentView === 'branch-compare' || currentView === 'local-changes') && !selectedRepo && (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <div className="text-gray-400 mb-4">
                <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2V7z" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No repository selected</h3>
              <p className="text-gray-500 mb-4">Please select a repository from the sidebar to continue</p>
              <button
                onClick={() => setCurrentView('repository-select')}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
              >
                Select Repository
              </button>
            </div>
          </div>
        )}
      </div>
      
      {/* Global Search */}
      <GlobalSearch
        ref={globalSearchRef}
        isVisible={showGlobalSearch}
        onClose={() => {
          setShowGlobalSearch(false);
          setGlobalSearchTerm('');
          setCurrentSearchResult(null);
        }}
        diffData={getDiffDataForSearch()}
        onNavigateToResult={handleSearchNavigate}
        onSearchTermChange={handleSearchTermChange}
      />
    </div>
  );
}

export default App;
