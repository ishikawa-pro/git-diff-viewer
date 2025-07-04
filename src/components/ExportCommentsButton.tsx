import React, { useState } from 'react';
import { Download, Copy, Check } from 'lucide-react';

interface Comment {
  id: string;
  content: string;
  lineIndex: number;
  timestamp: number;
  lineRange: {
    start: number;
    end: number;
  };
  fileName?: string;
}

interface DiffLine {
  type: 'added' | 'removed' | 'context' | 'hunk';
  content: string;
  oldLineNumber?: number;
  newLineNumber?: number;
}

interface ExportCommentsButtonProps {
  comments: Comment[];
  diffData: Record<string, string> | Record<string, { working: string; staged: string }>;
  selectedFile: string | null;
  fromBranch: string;
  toBranch: string;
}

const ExportCommentsButton: React.FC<ExportCommentsButtonProps> = ({
  comments,
  diffData,
  selectedFile,
  fromBranch,
  toBranch
}) => {
  const [copied, setCopied] = useState(false);

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy to clipboard:', err);
    }
  };

  const parseDiff = (diffText: string): DiffLine[] => {
    const lines = diffText.split('\n');
    const parsedLines: DiffLine[] = [];
    let oldLineNumber = 0;
    let newLineNumber = 0;

    for (const line of lines) {
      if (line.startsWith('@@')) {
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
          content: line.substring(1),
          newLineNumber,
        });
      } else if (line.startsWith('-')) {
        oldLineNumber++;
        parsedLines.push({
          type: 'removed',
          content: line.substring(1),
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

  const exportAllCommentsToClipboard = () => {
    if (comments.length === 0) {
      copyToClipboard('No comments to export');
      return;
    }

    const exportData = comments.map((comment, index) => {
      const diffContent = getDiffContentForComment(comment);
      
      return `Comment: ${comment.content}
File: ${comment.fileName || selectedFile || 'Unknown file'}
Line Range: ${comment.lineRange.start + 1}${comment.lineRange.start !== comment.lineRange.end ? `-${comment.lineRange.end + 1}` : ''}
Code:
${diffContent}`;
    });

    const finalContent = exportData.join('\n\n');
    copyToClipboard(finalContent);
  };

  const getDiffContentForComment = (comment: Comment): string => {
    const fileKey = comment.fileName || selectedFile;
    if (!fileKey) return 'No file information available';
    
    const diffText = typeof diffData[fileKey] === 'string' 
      ? diffData[fileKey] as string
      : (diffData[fileKey] as { working: string; staged: string })?.working || 
        (diffData[fileKey] as { working: string; staged: string })?.staged || '';
    
    if (!diffText) {
      // Try to find the file in all available diff data
      const allKeys = Object.keys(diffData);
      for (const key of allKeys) {
        if (key.includes(fileKey) || fileKey.includes(key)) {
          const keyDiffText = typeof diffData[key] === 'string' 
            ? diffData[key] as string
            : (diffData[key] as { working: string; staged: string })?.working || 
              (diffData[key] as { working: string; staged: string })?.staged || '';
          if (keyDiffText) {
            const parsedDiff = parseDiff(keyDiffText);
            const startLine = Math.max(0, comment.lineRange.start);
            const endLine = Math.min(parsedDiff.length - 1, comment.lineRange.end);
            
            const contextLines = parsedDiff.slice(startLine, endLine + 1);
            
            return contextLines.map(line => {
              const prefix = line.type === 'added' ? '+' : 
                            line.type === 'removed' ? '-' : 
                            line.type === 'hunk' ? '' : ' ';
              return `${prefix}${line.content}`;
            }).join('\n');
          }
        }
      }
      return 'No diff content available';
    }
    
    const parsedDiff = parseDiff(diffText);
    const startLine = Math.max(0, comment.lineRange.start);
    const endLine = Math.min(parsedDiff.length - 1, comment.lineRange.end);
    
    const contextLines = parsedDiff.slice(startLine, endLine + 1);
    
    return contextLines.map(line => {
      const prefix = line.type === 'added' ? '+' : 
                    line.type === 'removed' ? '-' : 
                    line.type === 'hunk' ? '' : ' ';
      return `${prefix}${line.content}`;
    }).join('\n');
  };

  // Get total comments count across all files
  const totalComments = comments.length;

  if (totalComments === 0) {
    return null;
  }

  return (
    <button
      onClick={exportAllCommentsToClipboard}
      className="flex items-center gap-1 px-3 py-1 text-sm text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-md transition-colors"
      title="Export all comments to clipboard"
    >
      {copied ? (
        <Check className="h-4 w-4 text-green-500" />
      ) : (
        <Download className="h-4 w-4" />
      )}
      Export Comments ({totalComments})
    </button>
  );
};

export default ExportCommentsButton;