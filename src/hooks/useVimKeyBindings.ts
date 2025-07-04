import { useEffect } from 'react';

interface VimKeyBindingsConfig {
  enabled?: boolean;
  onScrollUp?: (amount?: number) => void;
  onScrollDown?: (amount?: number) => void;
  onPageUp?: () => void;
  onPageDown?: () => void;
}

export const useVimKeyBindings = (config: VimKeyBindingsConfig = {}) => {
  const { enabled = true, onScrollUp, onScrollDown, onPageUp, onPageDown } = config;

  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      // キーボードショートカットが無効になる条件をチェック
      const target = event.target as HTMLElement;
      const isInputElement = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable;
      
      // 入力要素にフォーカスがある場合、またはmetaKey/ctrlKey + fの場合はスキップ
      if (isInputElement || (event.key === 'f' && (event.metaKey || event.ctrlKey))) {
        return;
      }

      // vim風キーバインドの処理
      switch (event.key) {
        case 'j':
          event.preventDefault();
          if (onScrollDown) {
            onScrollDown(50); // 50px scrolling
          } else {
            window.scrollBy({ top: 50, behavior: 'smooth' });
          }
          break;

        case 'k':
          event.preventDefault();
          if (onScrollUp) {
            onScrollUp(50); // 50px scrolling
          } else {
            window.scrollBy({ top: -50, behavior: 'smooth' });
          }
          break;

        case 'd':
          if (event.ctrlKey) {
            event.preventDefault();
            if (onPageDown) {
              onPageDown();
            } else {
              const pageHeight = window.innerHeight * 0.5; // Half page scroll
              window.scrollBy({ top: pageHeight, behavior: 'smooth' });
            }
          }
          break;

        case 'u':
          if (event.ctrlKey) {
            event.preventDefault();
            if (onPageUp) {
              onPageUp();
            } else {
              const pageHeight = window.innerHeight * 0.5; // Half page scroll
              window.scrollBy({ top: -pageHeight, behavior: 'smooth' });
            }
          }
          break;

        default:
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [enabled, onScrollUp, onScrollDown, onPageUp, onPageDown]);
};