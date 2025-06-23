import React, { useEffect, useRef } from 'react';
import Prism from 'prismjs';
import 'prismjs/themes/prism.css';
import 'prismjs/components/prism-javascript';
import 'prismjs/components/prism-typescript';
import 'prismjs/components/prism-jsx';
import 'prismjs/components/prism-tsx';
import 'prismjs/components/prism-python';
import 'prismjs/components/prism-java';
import 'prismjs/components/prism-css';
import 'prismjs/components/prism-json';
import 'prismjs/components/prism-yaml';
import 'prismjs/components/prism-markdown';
import { FileText, GitCompare } from 'lucide-react';

interface DiffViewerProps {
  diff: string;
  selectedFile: string | null;
  fromBranch: string;
  toBranch: string;
}

const DiffViewer: React.FC<DiffViewerProps> = ({ diff, selectedFile, fromBranch, toBranch }) => {
  const codeRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (codeRef.current) {
      Prism.highlightElement(codeRef.current);
    }
  }, [diff]);

  const formatDiff = (diffText: string) => {
    return diffText
      .split('\n')
      .map((line, index) => {
        if (line.startsWith('+')) {
          return `<span class="line line-added" data-line="${index + 1}">${line}</span>`;
        } else if (line.startsWith('-')) {
          return `<span class="line line-removed" data-line="${index + 1}">${line}</span>`;
        } else if (line.startsWith('@@')) {
          return `<span class="line line-hunk" data-line="${index + 1}">${line}</span>`;
        } else {
          return `<span class="line" data-line="${index + 1}">${line}</span>`;
        }
      })
      .join('\n');
  };

  const getLanguage = (filename: string | null) => {
    if (!filename) return 'diff';
    
    const ext = filename.split('.').pop()?.toLowerCase();
    const languageMap: { [key: string]: string } = {
      'js': 'javascript',
      'ts': 'typescript',
      'jsx': 'jsx',
      'tsx': 'tsx',
      'py': 'python',
      'java': 'java',
      'css': 'css',
      'json': 'json',
      'yaml': 'yaml',
      'yml': 'yaml',
      'md': 'markdown',
    };
    
    return languageMap[ext || ''] || 'diff';
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border">
      <div className="px-4 py-3 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <FileText className="h-5 w-5 text-gray-500 mr-2" />
            <h3 className="text-lg font-medium text-gray-900">
              {selectedFile ? `Diff: ${selectedFile}` : 'Diff View'}
            </h3>
          </div>
          <div className="flex items-center text-sm text-gray-500">
            <GitCompare className="h-4 w-4 mr-1" />
            {fromBranch} → {toBranch}
          </div>
        </div>
      </div>
      
      <div className="overflow-x-auto">
        <pre className="!m-0 !p-4 bg-gray-50 text-sm">
          <code
            ref={codeRef}
            className={`language-${getLanguage(selectedFile)}`}
            dangerouslySetInnerHTML={{ __html: formatDiff(diff) }}
          />
        </pre>
      </div>
    </div>
  );
};

export default DiffViewer; 