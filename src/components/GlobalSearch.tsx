import React, { useEffect, useRef, useState, useImperativeHandle, forwardRef } from 'react';
import { Search, ChevronUp, ChevronDown, X } from 'lucide-react';

interface SearchResult {
  fileIndex: number;
  lineIndex: number;
  content: string;
  fileName: string;
  matchIndex: number; // Index within the specific line
  globalIndex: number; // Global index across all results
}

interface GlobalSearchProps {
  isVisible: boolean;
  onClose: () => void;
  diffData: Array<{
    fileName: string;
    content: string;
    originalFileName?: string;
  }>;
  onNavigateToResult: (fileIndex: number, lineIndex: number, globalIndex?: number) => void;
  onSearchTermChange?: (term: string) => void;
}

export interface GlobalSearchRef {
  focusInput: () => void;
}

const GlobalSearch = forwardRef<GlobalSearchRef, GlobalSearchProps>((
  {
    isVisible,
    onClose,
    diffData,
    onNavigateToResult,
    onSearchTermChange,
  },
  ref
) => {
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [currentResultIndex, setCurrentResultIndex] = useState(-1);

  const parseDiff = (diffText: string) => {
    const lines = diffText.split('\n');
    const parsedLines: any[] = [];
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

  const performSearch = (term: string, preserveCurrentIndex = false) => {
    if (!term.trim()) {
      setSearchResults([]);
      setCurrentResultIndex(-1);
      return;
    }

    const results: SearchResult[] = [];
    const lowerTerm = term.toLowerCase();
    let globalIndex = 0;

    diffData.forEach((file, fileIndex) => {
      // Parse the diff content to get the correct line structure
      const parsedLines = parseDiff(file.content);
      
      parsedLines.forEach((line, parsedLineIndex) => {
        const lowerLine = line.content.toLowerCase();
        let searchIndex = 0;
        let matchIndex = 0;
        
        while ((searchIndex = lowerLine.indexOf(lowerTerm, searchIndex)) !== -1) {
          results.push({
            fileIndex,
            lineIndex: parsedLineIndex, // Use parsed line index
            content: line.content,
            fileName: file.fileName,
            matchIndex,
            globalIndex: globalIndex++
          });
          searchIndex += lowerTerm.length;
          matchIndex++;
        }
      });
    });

    setSearchResults(results);
    
    if (!preserveCurrentIndex) {
      setCurrentResultIndex(results.length > 0 ? 0 : -1);
      if (results.length > 0) {
        onNavigateToResult(results[0].fileIndex, results[0].lineIndex, results[0].globalIndex);
      }
    } else {
      // Preserve current index if it's still valid
      if (currentResultIndex >= results.length) {
        setCurrentResultIndex(results.length > 0 ? 0 : -1);
      }
    }
  };

  const goToNextResult = () => {
    if (searchResults.length === 0) return;
    const nextIndex = (currentResultIndex + 1) % searchResults.length;
    setCurrentResultIndex(nextIndex);
    const result = searchResults[nextIndex];
    onNavigateToResult(result.fileIndex, result.lineIndex, result.globalIndex);
  };

  const goToPreviousResult = () => {
    if (searchResults.length === 0) return;
    const prevIndex = currentResultIndex <= 0 ? searchResults.length - 1 : currentResultIndex - 1;
    setCurrentResultIndex(prevIndex);
    const result = searchResults[prevIndex];
    onNavigateToResult(result.fileIndex, result.lineIndex, result.globalIndex);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (e.shiftKey) {
        goToPreviousResult();
      } else {
        goToNextResult();
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    }
  };
  
  // Handle global cmd+f when component is visible
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if (isVisible && (e.metaKey || e.ctrlKey) && e.key === 'f') {
        e.preventDefault();
        searchInputRef.current?.focus();
        searchInputRef.current?.select();
      }
    };
    
    if (isVisible) {
      document.addEventListener('keydown', handleGlobalKeyDown);
    }
    
    return () => {
      document.removeEventListener('keydown', handleGlobalKeyDown);
    };
  }, [isVisible]);

  useImperativeHandle(ref, () => ({
    focusInput: () => {
      if (searchInputRef.current) {
        searchInputRef.current.focus();
        searchInputRef.current.select();
      }
    }
  }), []);

  useEffect(() => {
    if (isVisible) {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 100);
    } else {
      setSearchTerm('');
      setSearchResults([]);
      setCurrentResultIndex(-1);
    }
  }, [isVisible]);

  useEffect(() => {
    performSearch(searchTerm, false);
    onSearchTermChange?.(searchTerm);
  }, [searchTerm, onSearchTermChange]);
  
  useEffect(() => {
    // Only re-run search when diffData changes, preserve current index
    if (searchTerm.trim()) {
      performSearch(searchTerm, true);
    }
  }, [diffData, searchTerm]);

  if (!isVisible) return null;

  return (
    <div className="fixed top-4 right-4 z-50 bg-white border border-gray-300 rounded-lg shadow-lg w-80">
      <div className="p-3 border-b border-gray-200">
        <div className="flex items-center gap-2">
          <Search className="h-4 w-4 text-gray-500" />
          <input
            ref={searchInputRef}
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search across all diffs (Enter: next, Shift+Enter: previous)..."
            className="flex-1 px-3 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded transition-colors"
            title="Close (Esc)"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
      
      {searchResults.length > 0 && (
        <div className="p-3">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm text-gray-600">
              {currentResultIndex + 1} of {searchResults.length} results
            </span>
            <div className="flex items-center gap-1">
              <button
                onClick={goToPreviousResult}
                className="p-1 hover:bg-gray-100 rounded transition-colors"
                title="Previous (Shift+Enter)"
              >
                <ChevronUp className="h-4 w-4" />
              </button>
              <button
                onClick={goToNextResult}
                className="p-1 hover:bg-gray-100 rounded transition-colors"
                title="Next (Enter)"
              >
                <ChevronDown className="h-4 w-4" />
              </button>
            </div>
          </div>
          
          <div className="max-h-40 overflow-y-auto">
            {searchResults.slice(0, 10).map((result, index) => (
              <div
                key={index}
                className={`p-2 cursor-pointer rounded text-sm hover:bg-gray-50 ${
                  index === currentResultIndex ? 'bg-blue-50 border-l-4 border-blue-400' : ''
                }`}
                onClick={() => {
                  setCurrentResultIndex(index);
                  onNavigateToResult(result.fileIndex, result.lineIndex, result.globalIndex);
                }}
              >
                <div className="font-medium text-gray-900 truncate">
                  {result.fileName}
                </div>
                <div className="text-gray-600 truncate font-mono text-xs">
                  {result.content.trim()}
                </div>
              </div>
            ))}
            {searchResults.length > 10 && (
              <div className="p-2 text-xs text-gray-500 text-center">
                ... and {searchResults.length - 10} more results
              </div>
            )}
          </div>
        </div>
      )}
      
      {searchTerm && searchResults.length === 0 && (
        <div className="p-3 text-sm text-gray-500 text-center">
          No results found for "{searchTerm}"
        </div>
      )}
    </div>
  );
});

export default GlobalSearch;