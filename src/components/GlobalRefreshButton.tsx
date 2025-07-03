import React from 'react';
import { RefreshCw } from 'lucide-react';

interface GlobalRefreshButtonProps {
  onRefresh: () => void;
  isRefreshing?: boolean;
  disabled?: boolean;
}

const GlobalRefreshButton: React.FC<GlobalRefreshButtonProps> = ({ 
  onRefresh, 
  isRefreshing = false, 
  disabled = false 
}) => {
  return (
    <button
      onClick={onRefresh}
      disabled={disabled || isRefreshing}
      className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
      title="Refresh all diffs"
    >
      <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
      {isRefreshing ? 'Refreshing...' : 'Refresh All'}
    </button>
  );
};

export default GlobalRefreshButton;