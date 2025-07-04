import React, { useEffect, useRef, useState } from 'react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneLight } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { FileText, GitCompare, RefreshCw, Copy, Check, MessageCircle, X, ChevronUp, ChevronDown } from 'lucide-react';

interface DiffViewerProps {
  diff: string;
  selectedFile: string | null;
  fromBranch: string;
  toBranch: string;
  isSelected?: boolean;
  onRefresh?: () => void;
  isRefreshing?: boolean;
  searchTerm?: string;
  currentSearchLineIndex?: number;
  currentSearchGlobalIndex?: number;
  onCommentsChange?: (comments: Comment[]) => void;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
  isViewed?: boolean;
  onViewedChange?: (viewed: boolean) => void;
}

interface DiffLine {
  type: 'added' | 'removed' | 'context' | 'hunk';
  content: string;
  oldLineNumber?: number;
  newLineNumber?: number;
}

export interface Comment {
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

const DiffViewer: React.FC<DiffViewerProps> = ({ diff, selectedFile, fromBranch, toBranch, isSelected = false, onRefresh, isRefreshing = false, searchTerm = '', currentSearchLineIndex = -1, currentSearchGlobalIndex = -1, onCommentsChange, isCollapsed = false, onToggleCollapse, isViewed = false, onViewedChange }) => {
  const diffContainerRef = useRef<HTMLDivElement>(null);
  const [copied, setCopied] = useState(false);
  const [comments, setComments] = useState<Comment[]>([]);
  const [selectedLineRange, setSelectedLineRange] = useState<{ start: number; end: number } | null>(null);
  const [commentText, setCommentText] = useState('');
  const [showCommentForm, setShowCommentForm] = useState(false);
  const [selectionStart, setSelectionStart] = useState<number | null>(null);
  const [isSelecting, setIsSelecting] = useState(false);
  const [dragStart, setDragStart] = useState<number | null>(null);
  const [dragEnd, setDragEnd] = useState<number | null>(null);

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy to clipboard:', err);
    }
  };

  const handleLineClick = (lineIndex: number) => {
    // 単クリックで1行選択
    setSelectedLineRange({ start: lineIndex, end: lineIndex });
    setShowCommentForm(true);
    setSelectionStart(null);
  };

  const handleMouseDown = (lineIndex: number, event: React.MouseEvent) => {
    event.preventDefault();
    setDragStart(lineIndex);
    setDragEnd(lineIndex);
    setIsSelecting(true);
  };

  const handleMouseEnter = (lineIndex: number) => {
    if (isSelecting && dragStart !== null) {
      setDragEnd(lineIndex);
    }
  };

  const handleMouseUp = () => {
    if (isSelecting && dragStart !== null && dragEnd !== null) {
      const start = Math.min(dragStart, dragEnd);
      const end = Math.max(dragStart, dragEnd);
      
      // ドラッグで複数行選択された場合のみ範囲を設定
      if (start !== end) {
        setSelectedLineRange({ start, end });
        setShowCommentForm(true);
      }
    }
    setIsSelecting(false);
    setDragStart(null);
    setDragEnd(null);
  };

  useEffect(() => {
    const handleGlobalMouseUp = () => {
      setIsSelecting(false);
      setDragStart(null);
      setDragEnd(null);
    };

    document.addEventListener('mouseup', handleGlobalMouseUp);
    return () => {
      document.removeEventListener('mouseup', handleGlobalMouseUp);
    };
  }, []);

  const addComment = () => {
    if (!commentText.trim() || !selectedLineRange) return;
    
    const comment: Comment = {
      id: Date.now().toString(),
      content: commentText,
      lineIndex: selectedLineRange.start,
      timestamp: Date.now(),
      lineRange: selectedLineRange,
      fileName: selectedFile || undefined
    };
    
    const newComments = [...comments, comment];
    setComments(newComments);
    setCommentText('');
    setShowCommentForm(false);
    setSelectedLineRange(null);
    
    // Notify parent component of comments change
    if (onCommentsChange) {
      onCommentsChange(newComments);
    }
  };

  const copyCommentToClipboard = (comment: Comment) => {
    const parsedDiff = parseDiff(diff);
    const startLine = parsedDiff[comment.lineRange.start];
    const endLine = parsedDiff[comment.lineRange.end];
    
    const commentData = {
      comment: comment.content,
      filePath: selectedFile || 'Unknown file',
      lineRange: `${startLine.oldLineNumber || startLine.newLineNumber || 'N/A'}-${endLine.oldLineNumber || endLine.newLineNumber || 'N/A'}`,
      content: parsedDiff.slice(comment.lineRange.start, comment.lineRange.end + 1)
        .map(line => line.content)
        .join('\n')
    };
    
    const clipboardContent = `Comment: ${commentData.comment}\nFile: ${commentData.filePath}\nLine Range: ${commentData.lineRange}\n\nCode:\n${commentData.content}`;
    
    copyToClipboard(clipboardContent);
  };

  const deleteComment = (commentId: string) => {
    const newComments = comments.filter(c => c.id !== commentId);
    setComments(newComments);
    
    // Notify parent component of comments change
    if (onCommentsChange) {
      onCommentsChange(newComments);
    }
  };


  const cancelComment = () => {
    setShowCommentForm(false);
    setSelectedLineRange(null);
    setCommentText('');
    setSelectionStart(null);
  };

  const handleViewedChange = (checked: boolean) => {
    if (onViewedChange) {
      onViewedChange(checked);
    }
    if (onToggleCollapse) {
      onToggleCollapse();
    }
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
    const isSelected = selectedLineRange && index >= selectedLineRange.start && index <= selectedLineRange.end;
    const isDragSelecting = isSelecting && dragStart !== null && dragEnd !== null && 
                           index >= Math.min(dragStart, dragEnd) && index <= Math.max(dragStart, dragEnd);
    const hasComment = comments.some(c => index >= c.lineRange.start && index <= c.lineRange.end);
    const isSearchMatch = searchTerm && line.content.toLowerCase().includes(searchTerm.toLowerCase());
    const isCurrentSearchMatch = currentSearchLineIndex === index;
    
    const highlightSearchTerm = (text: string) => {
      if (!searchTerm.trim() || !isSearchMatch) return text;
      
      const regex = new RegExp(`(${searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
      return text.replace(regex, `<mark class="${isCurrentSearchMatch ? 'bg-orange-300 ring-2 ring-orange-500' : 'bg-yellow-200'} px-1 rounded">$1</mark>`);
    };
    
    const getLineClass = (type: string) => {
      let baseClass = '';
      let backgroundClass = '';
      let borderClass = '';
      
      // Base styling based on line type
      switch (type) {
        case 'added':
          backgroundClass = 'bg-green-50';
          borderClass = 'border-l-4 border-green-400';
          break;
        case 'removed':
          backgroundClass = 'bg-red-50';
          borderClass = 'border-l-4 border-red-400';
          break;
        case 'hunk':
          backgroundClass = 'bg-blue-50';
          borderClass = 'border-l-4 border-blue-400';
          baseClass = 'font-semibold text-blue-800';
          break;
        default:
          backgroundClass = 'bg-white';
      }
      
      // Selection highlighting takes priority
      if (isSelected) {
        backgroundClass = 'bg-yellow-100 !important';
        baseClass += ' ring-2 ring-yellow-400 border-yellow-400';
      } else if (isDragSelecting) {
        backgroundClass = 'bg-yellow-50 !important';
        baseClass += ' ring-1 ring-yellow-300 border-yellow-300';
      }
      
      // Search highlighting
      if (isCurrentSearchMatch) {
        backgroundClass = 'bg-orange-200';
        baseClass += ' ring-2 ring-orange-500';
      } else if (isSearchMatch) {
        backgroundClass = 'bg-yellow-100';
        baseClass += ' ring-1 ring-yellow-400';
      }
      
      if (hasComment) {
        baseClass += ' border-r-4 border-r-blue-400';
      }
      
      return `${backgroundClass} ${borderClass} ${baseClass}`;
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

    const lineComments = comments.filter(c => index === c.lineRange.start);
    
    return (
      <div key={index} data-line-index={index}>
        <div 
          className={`flex ${getLineClass(line.type)} cursor-pointer hover:bg-gray-50 select-none`}
          onClick={() => handleLineClick(index)}
          onMouseDown={(e) => handleMouseDown(index, e)}
          onMouseEnter={() => handleMouseEnter(index)}
          onMouseUp={handleMouseUp}
        >
          <div className={`flex-shrink-0 w-20 px-2 py-1 text-xs text-gray-500 border-r font-mono ${
            isSelected ? 'bg-yellow-100' : isDragSelecting ? 'bg-yellow-50' : 'bg-gray-50'
          }`}>
            <span className="block">
              {line.type === 'removed' || line.type === 'context' ? line.oldLineNumber : ''}
            </span>
          </div>
          <div className={`flex-shrink-0 w-20 px-2 py-1 text-xs text-gray-500 border-r font-mono ${
            isSelected ? 'bg-yellow-100' : isDragSelecting ? 'bg-yellow-50' : 'bg-gray-50'
          }`}>
            <span className="block">
              {line.type === 'added' || line.type === 'context' ? line.newLineNumber : ''}
            </span>
          </div>
          <div className="flex-1 px-2 py-1">
            <div className="flex">
              <span className="flex-shrink-0 w-4 text-center font-mono text-sm">
                {getLinePrefix(line.type)}
              </span>
              <div className="flex-1 relative">
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
                {isSearchMatch && (
                  <div 
                    className="absolute inset-0 pointer-events-none"
                    style={{
                      fontSize: '13px',
                      lineHeight: '1.5',
                      fontFamily: 'Monaco, Menlo, "Ubuntu Mono", monospace',
                      color: 'transparent',
                      whiteSpace: 'pre',
                      overflow: 'hidden',
                      zIndex: 1
                    }}
                    dangerouslySetInnerHTML={{
                      __html: highlightSearchTerm(line.content)
                    }}
                  />
                )}
              </div>
            </div>
          </div>
        </div>
        {lineComments.length > 0 && (
          <div className="ml-20 bg-blue-50 border-l-4 border-blue-400 p-3">
            {lineComments.map((comment) => (
              <div key={comment.id} className="mb-2 last:mb-0">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <p className="text-sm text-gray-700">{comment.content}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      Line {comment.lineRange.start === comment.lineRange.end ? 
                        comment.lineRange.start + 1 : 
                        `${comment.lineRange.start + 1}-${comment.lineRange.end + 1}`
                      } • {new Date(comment.timestamp).toLocaleString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 ml-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        copyCommentToClipboard(comment);
                      }}
                      className="p-1 text-gray-400 hover:text-gray-600 rounded transition-colors"
                      title="Copy comment to clipboard"
                    >
                      <Copy className="h-3 w-3" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteComment(comment.id);
                      }}
                      className="p-1 text-gray-400 hover:text-red-600 rounded transition-colors"
                      title="Delete comment"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  const parsedDiff = parseDiff(diff);

  return (
    <div 
      className={`bg-white rounded-lg shadow-sm border transition-all duration-300 ${
        (searchTerm && (currentSearchLineIndex >= 0 || currentSearchGlobalIndex >= 0)) 
          ? 'ring-2 ring-blue-500 ring-opacity-50 shadow-lg' 
          : ''
      }`}
      data-diff-viewer={selectedFile}
    >
      <div className="px-4 py-3 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            {onToggleCollapse && (
              <button
                onClick={onToggleCollapse}
                className="flex items-center gap-1 px-2 py-1 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-md transition-colors mr-3"
                title={isCollapsed ? 'Expand diff' : 'Collapse diff'}
              >
                {isCollapsed ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronUp className="h-4 w-4" />
                )}
              </button>
            )}
            <FileText className="h-5 w-5 text-gray-500 mr-2" />
            <h3 className="text-lg font-medium text-gray-900">
              {selectedFile ? `${selectedFile}` : 'Diff View'}
            </h3>
            {selectedFile && (
              <button
                onClick={() => copyToClipboard(selectedFile)}
                className="ml-2 p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors"
                title="Copy file path to clipboard"
              >
                {copied ? (
                  <Check className="h-4 w-4 text-green-500" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </button>
            )}
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center text-sm text-gray-500">
              <GitCompare className="h-4 w-4 mr-1" />
              {fromBranch} → {toBranch}
            </div>
            {onViewedChange && (
              <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isViewed}
                  onChange={(e) => handleViewedChange(e.target.checked)}
                  className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
                />
                <span>Viewed</span>
              </label>
            )}
            {onRefresh && (
              <button
                onClick={onRefresh}
                disabled={isRefreshing}
                className="flex items-center gap-1 px-3 py-1 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                title="Refresh diff"
              >
                <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                {isRefreshing ? 'Refreshing...' : 'Refresh'}
              </button>
            )}
          </div>
        </div>
      </div>
      
      {!isCollapsed && (
        <div className="overflow-x-auto overflow-y-auto" ref={diffContainerRef}>
          <div className="font-mono text-sm">
            {parsedDiff.length > 0 ? (
              parsedDiff.map((line, index) => renderDiffLine(line, index))
            ) : (
              <div className="px-4 py-8 text-center text-gray-500">
                No changes found for this file
              </div>
            )}
          </div>
        </div>
      )}
      
      {showCommentForm && selectedLineRange && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg max-w-md w-full mx-4">
            <div className="p-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">Add Comment</h3>
              <p className="text-sm text-gray-500 mt-1">
                Line {selectedLineRange.start === selectedLineRange.end ? 
                  selectedLineRange.start + 1 : 
                  `${selectedLineRange.start + 1}-${selectedLineRange.end + 1}`
                } in {selectedFile}
              </p>
            </div>
            <div className="p-4">
              <textarea
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                placeholder="Enter your comment..."
                className="w-full p-2 border border-gray-300 rounded-md resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={4}
                autoFocus
              />
            </div>
            <div className="p-4 border-t border-gray-200 flex justify-end gap-2">
              <button
                onClick={cancelComment}
                className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-md transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={addComment}
                disabled={!commentText.trim()}
                className="px-4 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Add Comment
              </button>
            </div>
          </div>
        </div>
      )}
      
      
      {isSelecting && dragStart !== null && dragEnd !== null && (
        <div className="fixed bottom-4 right-4 bg-yellow-600 text-white px-4 py-2 rounded-lg shadow-lg">
          <p className="text-sm">
            Selected lines {Math.min(dragStart, dragEnd) + 1} - {Math.max(dragStart, dragEnd) + 1}
          </p>
        </div>
      )}
    </div>
  );
};

export default DiffViewer; 