import React from 'react';
import { GitBranch, FileText, Folder } from 'lucide-react';

export type ViewMode = 'repository-select' | 'local-changes' | 'branch-compare';

interface GlobalSidebarProps {
  currentView: ViewMode;
  onViewChange: (view: ViewMode) => void;
  selectedRepo: string | null;
}

const GlobalSidebar: React.FC<GlobalSidebarProps> = ({
  currentView,
  onViewChange,
  selectedRepo
}) => {
  const isRepoSelected = !!selectedRepo;

  const menuItems = [
    {
      id: 'repository-select' as ViewMode,
      label: 'Repository',
      icon: Folder,
      description: 'Select repository',
      enabled: true
    },
    {
      id: 'local-changes' as ViewMode,
      label: 'Local Changes',
      icon: FileText,
      description: 'View uncommitted changes',
      enabled: isRepoSelected
    },
    {
      id: 'branch-compare' as ViewMode,
      label: 'Branch Compare',
      icon: GitBranch,
      description: 'Compare branches',
      enabled: isRepoSelected
    }
  ];

  return (
    <div className="w-64 bg-gray-100 border-r border-gray-200 flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <h2 className="text-lg font-semibold text-gray-900">Git Diff Viewer</h2>
        {selectedRepo && (
          <p className="text-sm text-gray-600 truncate" title={selectedRepo}>
            {selectedRepo.split('/').pop()}
          </p>
        )}
      </div>

      {/* Navigation Menu */}
      <nav className="flex-1 p-4">
        <div className="space-y-2">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentView === item.id;
            const isDisabled = !item.enabled;

            return (
              <button
                key={item.id}
                onClick={() => item.enabled && onViewChange(item.id)}
                disabled={isDisabled}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-md text-left transition-colors ${
                  isActive
                    ? 'bg-blue-100 text-blue-900 border border-blue-200'
                    : isDisabled
                    ? 'text-gray-400 cursor-not-allowed'
                    : 'text-gray-700 hover:bg-gray-200 hover:text-gray-900'
                }`}
                title={isDisabled ? 'Select a repository first' : item.description}
              >
                <Icon size={18} className={isActive ? 'text-blue-600' : ''} />
                <div className="flex-1">
                  <div className="font-medium">{item.label}</div>
                  <div className="text-xs text-gray-500">{item.description}</div>
                </div>
              </button>
            );
          })}
        </div>
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-gray-200">
        <div className="text-xs text-gray-500 text-center">
          Select a view to get started
        </div>
      </div>
    </div>
  );
};

export default GlobalSidebar;
