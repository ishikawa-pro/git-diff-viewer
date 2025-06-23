import React from 'react';
import { FileText, Folder, Plus, Minus, GitBranch } from 'lucide-react';
import { FileChange } from '../types';

interface FileTreeProps {
  files: FileChange[];
  onFileSelect: (file: string) => void;
  selectedFile: string | null;
}

const FileTree: React.FC<FileTreeProps> = ({ files, onFileSelect, selectedFile }) => {
  const getFileIcon = (file: string) => {
    if (file.includes('/')) {
      return <Folder className="h-4 w-4 text-blue-500" />;
    }
    return <FileText className="h-4 w-4 text-gray-500" />;
  };

  const getChangeIcon = (file: FileChange) => {
    if (file.insertions > 0 && file.deletions > 0) {
      return <div className="flex items-center space-x-1">
        <Plus className="h-3 w-3 text-green-500" />
        <Minus className="h-3 w-3 text-red-500" />
      </div>;
    } else if (file.insertions > 0) {
      return <Plus className="h-3 w-3 text-green-500" />;
    } else if (file.deletions > 0) {
      return <Minus className="h-3 w-3 text-red-500" />;
    }
    return null;
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border sticky top-8">
      <div className="px-4 py-3 border-b border-gray-200">
        <div className="flex items-center">
          <GitBranch className="h-4 w-4 text-gray-500 mr-2" />
          <h3 className="text-lg font-medium text-gray-900">Changed Files</h3>
        </div>
        <p className="text-sm text-gray-500 mt-1">{files.length} files changed</p>
      </div>
      <div className="max-h-96 overflow-y-auto">
        {files.map((file) => (
          <div
            key={file.file}
            onClick={() => onFileSelect(file.file)}
            className={`px-4 py-2 cursor-pointer hover:bg-gray-50 border-b border-gray-100 last:border-b-0 ${
              selectedFile === file.file ? 'bg-blue-50 border-l-4 border-l-blue-500' : ''
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2 flex-1 min-w-0">
                {getFileIcon(file.file)}
                <span className="text-sm text-gray-900 truncate">{file.file}</span>
              </div>
              <div className="flex items-center space-x-2">
                {getChangeIcon(file)}
                <span className="text-xs text-gray-500">
                  +{file.insertions} -{file.deletions}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default FileTree; 