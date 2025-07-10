import React from 'react';
import { FolderOpen, GitBranch, Clock, Folder } from 'lucide-react';
import { RepoHistoryItem } from '../types';

interface RepositorySelectorProps {
  onSelect: () => void;
  repoHistory?: RepoHistoryItem[];
  onSelectFromHistory?: (repoPath: string) => void;
}

const RepositorySelector: React.FC<RepositorySelectorProps> = ({
  onSelect,
  repoHistory = [],
  onSelectFromHistory
}) => {
  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="min-h-96">
      <div className="text-center mb-8">
        <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-blue-100 mb-6">
          <GitBranch className="h-8 w-8 text-blue-600" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-4">
          Select a Git Repository
        </h2>
        <button
          onClick={onSelect}
          className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          <FolderOpen className="h-5 w-5 mr-2" />
          Open Repository
        </button>
      </div>

      {repoHistory.length > 0 && (
        <div className="max-w-2xl mx-auto">
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex items-center">
                <Clock className="h-5 w-5 text-gray-400 mr-2" />
                <h3 className="text-lg font-medium text-gray-900">Recent Repositories</h3>
              </div>
            </div>
            <div className="divide-y divide-gray-200">
              {repoHistory.map((repo) => (
                <div
                  key={repo.path}
                  className="px-6 py-4 hover:bg-gray-50 cursor-pointer transition-colors duration-150"
                  onClick={() => onSelectFromHistory?.(repo.path)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <Folder className="h-5 w-5 text-gray-400 mr-3" />
                      <div>
                        <p className="text-sm font-medium text-gray-900">{repo.name}</p>
                        <p className="text-sm text-gray-500 truncate max-w-md">{repo.path}</p>
                      </div>
                    </div>
                    <div className="text-sm text-gray-400">
                      {formatDate(repo.lastOpened)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RepositorySelector;
