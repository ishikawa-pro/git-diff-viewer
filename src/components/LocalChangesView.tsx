import React, { useState, useRef, useEffect } from 'react';
import DiffViewer from './DiffViewer';
import FileTree from './FileTree';
import GlobalRefreshButton from './GlobalRefreshButton';
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
  onGlobalRefresh
}) => {
  const [showOnlyStaged, setShowOnlyStaged] = useState(false);
  const fileRefs = useRef<Record<string, HTMLDivElement | null>>({});

  useEffect(() => {
    if (!localDiffData && !loading) {
      onFetchLocalDiff();
    }
  }, [localDiffData, loading, onFetchLocalDiff]);

  const handleFileSelect = (file: string) => {
    onFileSelect(file);
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
    <div className="flex-1 flex flex-col">
      {/* Header Controls */}
      <div className="bg-white shadow-sm border-b px-6 py-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">Local Changes</h1>
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