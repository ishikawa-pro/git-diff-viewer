import React, { useState } from 'react';
import { FileText, Folder, FolderOpen, Plus, Minus, GitBranch, ChevronRight, ChevronDown } from 'lucide-react';
import { FileChange } from '../types';

interface FileTreeProps {
  files: FileChange[];
  onFileSelect: (file: string) => void;
  selectedFile: string | null;
}

interface TreeNode {
  name: string;
  path: string;
  isDirectory: boolean;
  children: TreeNode[];
  fileChange?: FileChange;
  level: number;
}

const FileTree: React.FC<FileTreeProps> = ({ files, onFileSelect, selectedFile }) => {
  // 全てのディレクトリパスを取得して初期状態で展開
  const getAllDirectoryPaths = (files: FileChange[]): Set<string> => {
    const dirPaths = new Set<string>();
    
    files.forEach(file => {
      const pathParts = file.file.split('/');
      let currentPath = '';
      
      // ディレクトリパスを全て追加
      for (let i = 0; i < pathParts.length - 1; i++) {
        const dirName = pathParts[i];
        currentPath = currentPath ? `${currentPath}/${dirName}` : dirName;
        dirPaths.add(currentPath);
      }
    });
    
    return dirPaths;
  };

  const [expandedDirs, setExpandedDirs] = useState<Set<string>>(() => getAllDirectoryPaths(files));

  // ファイルパスからツリー構造を構築
  const buildTree = (files: FileChange[]): TreeNode[] => {
    const root: TreeNode[] = [];
    const pathMap = new Map<string, TreeNode>();

    files.forEach(file => {
      const pathParts = file.file.split('/');
      let currentPath = '';
      
      // ディレクトリノードを作成
      for (let i = 0; i < pathParts.length - 1; i++) {
        const dirName = pathParts[i];
        const parentPath = currentPath;
        currentPath = currentPath ? `${currentPath}/${dirName}` : dirName;
        
        if (!pathMap.has(currentPath)) {
          const dirNode: TreeNode = {
            name: dirName,
            path: currentPath,
            isDirectory: true,
            children: [],
            level: i
          };
          pathMap.set(currentPath, dirNode);
          
          if (parentPath === '') {
            root.push(dirNode);
          } else {
            const parentNode = pathMap.get(parentPath);
            if (parentNode) {
              parentNode.children.push(dirNode);
            }
          }
        }
      }
      
      // ファイルノードを作成
      const fileName = pathParts[pathParts.length - 1];
      const filePath = file.file;
      const fileNode: TreeNode = {
        name: fileName,
        path: filePath,
        isDirectory: false,
        children: [],
        fileChange: file,
        level: pathParts.length - 1
      };
      
      if (pathParts.length === 1) {
        root.push(fileNode);
      } else {
        const parentPath = pathParts.slice(0, -1).join('/');
        const parentNode = pathMap.get(parentPath);
        if (parentNode) {
          parentNode.children.push(fileNode);
        }
      }
    });

    return root;
  };

  const toggleDirectory = (path: string) => {
    const newExpanded = new Set(expandedDirs);
    if (newExpanded.has(path)) {
      newExpanded.delete(path);
    } else {
      newExpanded.add(path);
    }
    setExpandedDirs(newExpanded);
  };

  const getFileIcon = (node: TreeNode) => {
    if (node.isDirectory) {
      return expandedDirs.has(node.path) 
        ? <FolderOpen className="h-4 w-4 text-blue-500" />
        : <Folder className="h-4 w-4 text-blue-500" />;
    }
    return <FileText className="h-4 w-4 text-gray-500" />;
  };

  const getChangeIcon = (fileChange: FileChange) => {
    if (fileChange.insertions > 0 && fileChange.deletions > 0) {
      return <div className="flex items-center space-x-1">
        <Plus className="h-3 w-3 text-green-500" />
        <Minus className="h-3 w-3 text-red-500" />
      </div>;
    } else if (fileChange.insertions > 0) {
      return <Plus className="h-3 w-3 text-green-500" />;
    } else if (fileChange.deletions > 0) {
      return <Minus className="h-3 w-3 text-red-500" />;
    }
    return null;
  };

  const renderNode = (node: TreeNode): React.ReactNode => {
    const isExpanded = expandedDirs.has(node.path);
    const indent = node.level * 16;

    return (
      <div key={node.path}>
        <div
          onClick={() => {
            if (node.isDirectory) {
              toggleDirectory(node.path);
            } else {
              onFileSelect(node.path);
            }
          }}
          className={`px-4 py-2 cursor-pointer hover:bg-gray-50 border-b border-gray-100 last:border-b-0 ${
            selectedFile === node.path ? 'bg-blue-50 border-l-4 border-l-blue-500' : ''
          }`}
          style={{ paddingLeft: `${indent + 16}px` }}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 flex-1 min-w-0">
              {node.isDirectory && (
                <div className="w-4 h-4 flex items-center justify-center">
                  {isExpanded ? (
                    <ChevronDown className="h-3 w-3 text-gray-400" />
                  ) : (
                    <ChevronRight className="h-3 w-3 text-gray-400" />
                  )}
                </div>
              )}
              {getFileIcon(node)}
              <span className="text-sm text-gray-900 truncate">{node.name}</span>
            </div>
            {!node.isDirectory && node.fileChange && (
              <div className="flex items-center space-x-2">
                {getChangeIcon(node.fileChange)}
                <span className="text-xs text-gray-500">
                  +{node.fileChange.insertions} -{node.fileChange.deletions}
                </span>
              </div>
            )}
          </div>
        </div>
        {node.isDirectory && isExpanded && node.children.map(child => renderNode(child))}
      </div>
    );
  };

  const treeData = buildTree(files);

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
        {treeData.map(node => renderNode(node))}
      </div>
    </div>
  );
};

export default FileTree; 