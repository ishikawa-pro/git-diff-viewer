import React, { useRef, useState, useEffect } from 'react';
import BranchSelector from './BranchSelector';
import DiffViewer, { Comment } from './DiffViewer';
import FileTree from './FileTree';
import GlobalRefreshButton from './GlobalRefreshButton';
import ExportCommentsButton from './ExportCommentsButton';
import { DiffData } from '../types';

interface BranchCompareViewProps {
  branches: string[];
  fromBranch: string;
  toBranch: string;
  diffData: DiffData | null;
  fileDiffs: Record<string, string>;
  selectedFile: string | null;
  loading: boolean;
  isRefreshing: boolean;
  isGlobalRefreshing: boolean;
  onFromBranchChange: (branch: string) => void;
  onToBranchChange: (branch: string) => void;
  onCompare: () => Promise<void>;
  onFileSelect: (file: string) => void;
  onRefresh: () => Promise<void>;
  onGlobalRefresh: () => Promise<void>;
  searchTerm?: string;
  currentSearchLineIndex?: number;
  currentSearchGlobalIndex?: number;
  sidebarVisible: boolean;
  onToggleSidebar: () => void;
}

const BranchCompareView: React.FC<BranchCompareViewProps> = ({
  branches,
  fromBranch,
  toBranch,
  diffData,
  fileDiffs,
  selectedFile,
  loading,
  isRefreshing,
  isGlobalRefreshing,
  onFromBranchChange,
  onToBranchChange,
  onCompare,
  onFileSelect,
  onRefresh,
  onGlobalRefresh,
  searchTerm = '',
  currentSearchLineIndex = -1,
  currentSearchGlobalIndex = -1,
  sidebarVisible,
  onToggleSidebar
}) => {
  const fileRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const [allComments, setAllComments] = useState<Record<string, Comment[]>>({});
  const [collapsedFiles, setCollapsedFiles] = useState<Record<string, boolean>>({});
  const [viewedFiles, setViewedFiles] = useState<Record<string, boolean>>({});
  const [previousDiffs, setPreviousDiffs] = useState<Record<string, string>>({});

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

  const handleToggleCollapse = (fileKey: string) => {
    setCollapsedFiles(prev => ({
      ...prev,
      [fileKey]: !prev[fileKey]
    }));
  };

  const handleViewedChange = (fileKey: string, viewed: boolean) => {
    setViewedFiles(prev => ({
      ...prev,
      [fileKey]: viewed
    }));
  };

  // Check for changes in diff content and reset viewed/collapsed state if changed
  useEffect(() => {
    if (fileDiffs && Object.keys(fileDiffs).length > 0) {
      const changedFiles: string[] = [];
      
      Object.entries(fileDiffs).forEach(([file, currentDiff]) => {
        const previousDiff = previousDiffs[file];
        if (previousDiff && previousDiff !== currentDiff) {
          changedFiles.push(file);
        }
      });
      
      if (changedFiles.length > 0) {
        // Reset viewed and collapsed state for changed files
        setViewedFiles(prev => {
          const updated = { ...prev };
          changedFiles.forEach(file => {
            delete updated[file];
          });
          return updated;
        });
        
        setCollapsedFiles(prev => {
          const updated = { ...prev };
          changedFiles.forEach(file => {
            delete updated[file];
          });
          return updated;
        });
      }
      
      // Update previous diffs
      setPreviousDiffs(fileDiffs);
    }
  }, [fileDiffs, previousDiffs]);

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
            <h1 className="text-2xl font-bold text-gray-900">Branch Compare</h1>
          </div>
          <div className="flex items-center gap-4">
            <ExportCommentsButton
              comments={Object.values(allComments).flat()}
              diffData={fileDiffs}
              selectedFile={selectedFile}
              fromBranch={fromBranch}
              toBranch={toBranch}
            />
            <GlobalRefreshButton
              onRefresh={onGlobalRefresh}
              isRefreshing={isGlobalRefreshing}
              disabled={!fromBranch || !toBranch}
            />
          </div>
        </div>
        
        <div className="mt-4">
          <BranchSelector
            branches={branches}
            fromBranch={fromBranch}
            toBranch={toBranch}
            onFromBranchChange={onFromBranchChange}
            onToBranchChange={onToBranchChange}
            onCompare={onCompare}
            onRefresh={onRefresh}
          />
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="flex justify-center items-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      )}

      {/* Content */}
      {diffData && !loading && (
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-5 gap-6 p-6">
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
                    onRefresh={onRefresh}
                    isRefreshing={isRefreshing}
                    searchTerm={selectedFile === file.file ? searchTerm : ''}
                    currentSearchLineIndex={selectedFile === file.file ? currentSearchLineIndex : -1}
                    currentSearchGlobalIndex={selectedFile === file.file ? currentSearchGlobalIndex : -1}
                    onCommentsChange={(comments) => handleCommentsChange(file.file, comments)}
                    isCollapsed={collapsedFiles[file.file] || false}
                    onToggleCollapse={() => handleToggleCollapse(file.file)}
                    isViewed={viewedFiles[file.file] || false}
                    onViewedChange={(viewed) => handleViewedChange(file.file, viewed)}
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Empty State */}
      {!diffData && !loading && (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="text-gray-400 mb-4">
              <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.367 2.684 3 3 0 00-5.367-2.684z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No comparison selected</h3>
            <p className="text-gray-500">Select branches and click "Compare" to view differences</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default BranchCompareView;