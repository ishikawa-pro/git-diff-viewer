import React from 'react';
import { FolderOpen, GitBranch } from 'lucide-react';

interface RepositorySelectorProps {
  onSelect: () => void;
}

const RepositorySelector: React.FC<RepositorySelectorProps> = ({ onSelect }) => {
  return (
    <div className="flex items-center justify-center min-h-96">
      <div className="text-center">
        <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-blue-100 mb-6">
          <GitBranch className="h-8 w-8 text-blue-600" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-4">
          Select a Git Repository
        </h2>
        <p className="text-gray-600 mb-8 max-w-md">
          Choose a local Git repository to view diffs between branches with syntax highlighting.
        </p>
        <button
          onClick={onSelect}
          className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          <FolderOpen className="h-5 w-5 mr-2" />
          Open Repository
        </button>
      </div>
    </div>
  );
};

export default RepositorySelector; 