import React from 'react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneLight } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { FileText, GitCompare } from 'lucide-react';

interface DiffViewerProps {
  diff: string;
  selectedFile: string | null;
  fromBranch: string;
  toBranch: string;
}

interface DiffLine {
  type: 'added' | 'removed' | 'context' | 'hunk';
  content: string;
  oldLineNumber?: number;
  newLineNumber?: number;
}

const DiffViewer: React.FC<DiffViewerProps> = ({ diff, selectedFile, fromBranch, toBranch }) => {
  
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
      'html': 'html',
      'xml': 'xml',
      'c': 'c',
      'cpp': 'cpp',
      'go': 'go',
      'rs': 'rust',
      'php': 'php',
      'rb': 'ruby',
      'sh': 'bash',
    };
    
    return languageMap[ext || ''] || 'text';
  };

  const parseDiff = (diffText: string): DiffLine[] => {
    const lines = diffText.split('\n');
    const parsedLines: DiffLine[] = [];
    let oldLineNumber = 0;
    let newLineNumber = 0;

    for (const line of lines) {
      if (line.startsWith('@@')) {
        // Parse hunk header: @@ -old_start,old_count +new_start,new_count @@
        const match = line.match(/@@ -(\d+)(?:,\d+)? \+(\d+)(?:,\d+)? @@/);
        if (match) {
          oldLineNumber = parseInt(match[1], 10) - 1;
          newLineNumber = parseInt(match[2], 10) - 1;
        }
        parsedLines.push({
          type: 'hunk',
          content: line,
        });
      } else if (line.startsWith('+')) {
        newLineNumber++;
        parsedLines.push({
          type: 'added',
          content: line.substring(1), // Remove the + prefix
          newLineNumber,
        });
      } else if (line.startsWith('-')) {
        oldLineNumber++;
        parsedLines.push({
          type: 'removed',
          content: line.substring(1), // Remove the - prefix
          oldLineNumber,
        });
      } else if (line.startsWith(' ') || (!line.startsWith('diff') && !line.startsWith('index') && !line.startsWith('+++') && !line.startsWith('---'))) {
        oldLineNumber++;
        newLineNumber++;
        parsedLines.push({
          type: 'context',
          content: line.startsWith(' ') ? line.substring(1) : line,
          oldLineNumber,
          newLineNumber,
        });
      }
    }

    return parsedLines;
  };

  const renderDiffLine = (line: DiffLine, index: number) => {
    const getLineClass = (type: string) => {
      switch (type) {
        case 'added':
          return 'bg-green-50 border-l-4 border-green-400';
        case 'removed':
          return 'bg-red-50 border-l-4 border-red-400';
        case 'hunk':
          return 'bg-blue-50 border-l-4 border-blue-400 font-semibold text-blue-800';
        default:
          return 'bg-white';
      }
    };

    const getLinePrefix = (type: string) => {
      switch (type) {
        case 'added':
          return '+';
        case 'removed':
          return '-';
        case 'hunk':
          return '';
        default:
          return ' ';
      }
    };

    if (line.type === 'hunk') {
      return (
        <div key={index} className={`px-4 py-1 ${getLineClass(line.type)}`}>
          <span className="text-sm font-mono">{line.content}</span>
        </div>
      );
    }

    return (
      <div key={index} className={`flex ${getLineClass(line.type)}`}>
        <div className="flex-shrink-0 w-20 px-2 py-1 text-xs text-gray-500 border-r bg-gray-50 font-mono">
          <span className="block">
            {line.type === 'removed' || line.type === 'context' ? line.oldLineNumber : ''}
          </span>
        </div>
        <div className="flex-shrink-0 w-20 px-2 py-1 text-xs text-gray-500 border-r bg-gray-50 font-mono">
          <span className="block">
            {line.type === 'added' || line.type === 'context' ? line.newLineNumber : ''}
          </span>
        </div>
        <div className="flex-1 px-2 py-1">
          <div className="flex">
            <span className="flex-shrink-0 w-4 text-center font-mono text-sm">
              {getLinePrefix(line.type)}
            </span>
            <SyntaxHighlighter
              language={getLanguage(selectedFile)}
              style={oneLight}
              customStyle={{
                margin: 0,
                padding: 0,
                background: 'transparent',
                fontSize: '13px',
                lineHeight: '1.5',
              }}
              codeTagProps={{
                style: {
                  fontFamily: 'Monaco, Menlo, "Ubuntu Mono", monospace',
                }
              }}
            >
              {line.content}
            </SyntaxHighlighter>
          </div>
        </div>
      </div>
    );
  };

  const parsedDiff = parseDiff(diff);

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
        <div className="font-mono text-sm">
          {parsedDiff.map((line, index) => renderDiffLine(line, index))}
        </div>
      </div>
    </div>
  );
};

export default DiffViewer; 