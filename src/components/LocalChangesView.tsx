import React, { useState, useRef, useEffect } from 'react';
import DiffViewer, { Comment } from './DiffViewer';
import FileTree from './FileTree';
import GlobalRefreshButton from './GlobalRefreshButton';
import ExportCommentsButton from './ExportCommentsButton';
import { LocalDiffData } from '../types';

interface LocalChangesViewProps {
  localDiffData: LocalDiffData | null;
  localFileDiffs: Record<string, { working: string; staged: string }>;
  selectedFile: string | null;
  loading: boolean;
  isRefreshing: boolean;
  isGlobalRefreshing: boolean;
  onFetchLocalDiff: () => Promise<void>;
  onFileSelect: (file: string) => void;
  onRefresh: () => Promise<void>;
  onGlobalRefresh: () => Promise<void>;
  searchTerm?: string;
  currentSearchLineIndex?: number;
  currentSearchGlobalIndex?: number;
  sidebarVisible: boolean;
  onToggleSidebar: () => void;
}

const LocalChangesView: React.FC<LocalChangesViewProps> = ({
  localDiffData,
  localFileDiffs,
  selectedFile,
  loading,
  isRefreshing,
  isGlobalRefreshing,
  onFetchLocalDiff,
  onFileSelect,
  onRefresh,
  onGlobalRefresh,
  searchTerm = '',
  currentSearchLineIndex = -1,
  currentSearchGlobalIndex = -1,
  sidebarVisible,
  onToggleSidebar
}) => {
  const [showOnlyStaged, setShowOnlyStaged] = useState(false);
  const fileRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const [allComments, setAllComments] = useState<Record<string, Comment[]>>({});

  useEffect(() => {
    if (!localDiffData && !loading) {
      onFetchLocalDiff();
    }
  }, [localDiffData, loading, onFetchLocalDiff]);

  const handleFileSelect = (file: string) => {
    onFileSelect(file);
    // Note: Scrolling is now handled by the parent component when needed
  };

  const handleCommentsChange = (fileKey: string, comments: Comment[]) => {
    setAllComments(prev => ({
      ...prev,
      [fileKey]: comments
    }));
  };

  const getTotalComments = () => {
    return Object.values(allComments).reduce((total, comments) => total + comments.length, 0);
  };

  return (
    <div className="flex-1 flex flex-col">
      {/* Header Controls */}
      <div className="bg-white shadow-sm border-b px-6 py-4 sticky top-0 z-10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={onToggleSidebar}
              className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-full transition-colors"
              title={sidebarVisible ? "Hide sidebar" : "Show sidebar"}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <h1 className="text-2xl font-bold text-gray-900">Local Changes</h1>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={() => setShowOnlyStaged(!showOnlyStaged)}
              className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                showOnlyStaged 
                  ? 'bg-purple-600 text-white hover:bg-purple-700' 
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              {showOnlyStaged ? 'Staged Only' : 'All Changes'}
            </button>

            <ExportCommentsButton
              comments={Object.values(allComments).flat()}
              diffData={localFileDiffs}
              selectedFile={selectedFile}
              fromBranch="HEAD"
              toBranch="Working Directory"
            />

            <GlobalRefreshButton
              onRefresh={onGlobalRefresh}
              isRefreshing={isGlobalRefreshing}
              disabled={false}
            />
          </div>
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="flex justify-center items-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      )}

      {/* Content */}
      {localDiffData && !loading && (
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-5 gap-6 p-6">
          <div className="lg:col-span-1">
            <FileTree
              files={showOnlyStaged ? localDiffData.stagedFiles : [...localDiffData.workingFiles, ...localDiffData.stagedFiles]}
              onFileSelect={handleFileSelect}
              selectedFile={selectedFile}
            />
          </div>
          <div className="lg:col-span-4">
            <div className="space-y-6">
              {(() => {
                const allFiles = showOnlyStaged 
                  ? localDiffData.stagedFiles.map(f => f.file)
                  : Array.from(new Set([...localDiffData.workingFiles.map(f => f.file), ...localDiffData.stagedFiles.map(f => f.file)]));
                
                return allFiles.map((file) => (
                  <div
                    key={file}
                    ref={(el) => {
                      fileRefs.current[file] = el;
                    }}
                    className={`transition-all duration-300 ${
                      selectedFile === file
                        ? 'ring-2 ring-blue-500 ring-opacity-50 shadow-lg'
                        : ''
                    }`}
                  >
                    <div className="space-y-4">
                      {!showOnlyStaged && localFileDiffs[file]?.working && (
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900 mb-2">Working Directory Changes</h3>
                          <DiffViewer
                            diff={localFileDiffs[file].working}
                            selectedFile={file}
                            fromBranch="HEAD"
                            toBranch="Working Directory"
                            isSelected={selectedFile === file}
                            onRefresh={onRefresh}
                            isRefreshing={isRefreshing}
                            searchTerm={selectedFile === file ? searchTerm : ''}
                            currentSearchLineIndex={selectedFile === file ? currentSearchLineIndex : -1}
                            currentSearchGlobalIndex={selectedFile === file ? currentSearchGlobalIndex : -1}
                            onCommentsChange={(comments) => handleCommentsChange(`${file}-working`, comments)}
                          />
                        </div>
                      )}
                      {localFileDiffs[file]?.staged && (
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900 mb-2">Staged Changes</h3>
                          <DiffViewer
                            diff={localFileDiffs[file].staged}
                            selectedFile={file}
                            fromBranch="HEAD"
                            toBranch="Staged"
                            isSelected={selectedFile === file}
                            onRefresh={onRefresh}
                            isRefreshing={isRefreshing}
                            searchTerm={selectedFile === file ? searchTerm : ''}
                            currentSearchLineIndex={selectedFile === file ? currentSearchLineIndex : -1}
                            currentSearchGlobalIndex={selectedFile === file ? currentSearchGlobalIndex : -1}
                            onCommentsChange={(comments) => handleCommentsChange(`${file}-staged`, comments)}
                          />
                        </div>
                      )}
                    </div>
                  </div>
                ));
              })()}
            </div>
          </div>
        </div>
      )}

      {/* Empty State */}
      {!localDiffData && !loading && (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="text-gray-400 mb-4">
              <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No local changes loaded</h3>
            <p className="text-gray-500">Your uncommitted changes will appear here</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default LocalChangesView;