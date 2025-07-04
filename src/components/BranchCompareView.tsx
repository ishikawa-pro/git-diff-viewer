import React, { useRef } from 'react';
import BranchSelector from './BranchSelector';
import DiffViewer from './DiffViewer';
import FileTree from './FileTree';
import GlobalRefreshButton from './GlobalRefreshButton';
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
  onGlobalRefresh
}) => {
  const fileRefs = useRef<Record<string, HTMLDivElement | null>>({});

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
          <h1 className="text-2xl font-bold text-gray-900">Branch Compare</h1>
          <GlobalRefreshButton
            onRefresh={onGlobalRefresh}
            isRefreshing={isGlobalRefreshing}
            disabled={!fromBranch || !toBranch}
          />
        </div>
        
        <div className="mt-4">
          <BranchSelector
            branches={branches}
            fromBranch={fromBranch}
            toBranch={toBranch}
            onFromBranchChange={onFromBranchChange}
            onToBranchChange={onToBranchChange}
            onCompare={onCompare}
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