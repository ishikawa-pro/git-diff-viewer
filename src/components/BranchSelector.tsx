import React from 'react';
import { GitCompare, RefreshCw } from 'lucide-react';

interface BranchSelectorProps {
  branches: string[];
  fromBranch: string;
  toBranch: string;
  onFromBranchChange: (branch: string) => void;
  onToBranchChange: (branch: string) => void;
  onCompare: () => void;
  onRefresh?: () => void;
}

const BranchSelector: React.FC<BranchSelectorProps> = ({
  branches,
  fromBranch,
  toBranch,
  onFromBranchChange,
  onToBranchChange,
  onCompare,
  onRefresh,
}) => {
  return (
    <div className="bg-white rounded-lg shadow-sm border p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-medium text-gray-900">Compare Branches</h3>
        {onRefresh && (
          <button
            onClick={onRefresh}
            className="inline-flex items-center px-3 py-1 text-sm text-gray-600 hover:text-gray-900"
          >
            <RefreshCw className="h-4 w-4 mr-1" />
            Refresh
          </button>
        )}
      </div>
      
      <div className="flex items-center space-x-4">
        <div className="flex-1">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            From Branch
          </label>
          <select
            value={fromBranch}
            onChange={(e) => onFromBranchChange(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Select branch</option>
            {branches.map((branch) => (
              <option key={branch} value={branch}>
                {branch}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center">
          <GitCompare className="h-6 w-6 text-gray-400" />
        </div>

        <div className="flex-1">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            To Branch
          </label>
          <select
            value={toBranch}
            onChange={(e) => onToBranchChange(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Select branch</option>
            {branches.map((branch) => (
              <option key={branch} value={branch}>
                {branch}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-end">
          <button
            onClick={onCompare}
            disabled={!fromBranch || !toBranch}
            className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            Compare
          </button>
        </div>
      </div>
    </div>
  );
};

export default BranchSelector; 