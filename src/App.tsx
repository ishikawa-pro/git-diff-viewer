import React, { useState, useEffect } from 'react';
import RepositorySelector from './components/RepositorySelector';
import BranchSelector from './components/BranchSelector';
import DiffViewer from './components/DiffViewer';
import FileTree from './components/FileTree';
import { DiffData, FileChange, RepoInfo } from './types';

function App() {
  const [selectedRepo, setSelectedRepo] = useState<string | null>(null);
  const [branches, setBranches] = useState<string[]>([]);
  const [fromBranch, setFromBranch] = useState<string>('');
  const [toBranch, setToBranch] = useState<string>('');
  const [diffData, setDiffData] = useState<DiffData | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [repoInfo, setRepoInfo] = useState<RepoInfo | null>(null);

  const selectRepository = async () => {
    try {
      const result = await window.electronAPI.selectDirectory();
      if (result.success && result.path) {
        setSelectedRepo(result.path);
        await loadBranches();
        await loadRepoInfo();
      } else if (result.error) {
        alert(result.error);
      }
    } catch (error) {
      console.error('Failed to select repository:', error);
      alert('Failed to select repository');
    }
  };

  const loadBranches = async () => {
    try {
      const branchList = await window.electronAPI.getBranches();
      setBranches(branchList);
    } catch (error) {
      console.error('Failed to load branches:', error);
    }
  };

  const loadRepoInfo = async () => {
    try {
      const info = await window.electronAPI.getRepoInfo();
      setRepoInfo(info);
    } catch (error) {
      console.error('Failed to load repo info:', error);
    }
  };

  const fetchDiff = async () => {
    if (!fromBranch || !toBranch) return;

    setLoading(true);
    try {
      const data = await window.electronAPI.getDiff(fromBranch, toBranch);
      setDiffData(data);
    } catch (error) {
      console.error('Failed to fetch diff:', error);
      alert(`Failed to fetch diff: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <h1 className="text-3xl font-bold text-gray-900">Git Diff Viewer</h1>
            {selectedRepo && (
              <div className="text-sm text-gray-500">
                Repository: {selectedRepo.split('/').pop()}
                {repoInfo && (
                  <span className="ml-2 px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs">
                    {repoInfo.currentBranch}
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {!selectedRepo ? (
          <RepositorySelector onSelect={selectRepository} />
        ) : (
          <>
            <BranchSelector
              branches={branches}
              fromBranch={fromBranch}
              toBranch={toBranch}
              onFromBranchChange={setFromBranch}
              onToBranchChange={setToBranch}
              onCompare={fetchDiff}
            />

            {loading && (
              <div className="flex justify-center items-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            )}

            {diffData && (
              <div className="mt-8 grid grid-cols-1 lg:grid-cols-4 gap-6">
                <div className="lg:col-span-1">
                  <FileTree
                    files={diffData.files}
                    onFileSelect={setSelectedFile}
                    selectedFile={selectedFile}
                  />
                </div>
                <div className="lg:col-span-3">
                  <DiffViewer
                    diff={diffData.diff}
                    selectedFile={selectedFile}
                    fromBranch={fromBranch}
                    toBranch={toBranch}
                  />
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default App; 