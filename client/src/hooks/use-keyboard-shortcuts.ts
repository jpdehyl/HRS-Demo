import { useEffect, useCallback } from 'react';

export interface KeyboardShortcut {
  key: string;
  ctrl?: boolean;
  alt?: boolean;
  shift?: boolean;
  action: () => void;
  description: string;
  enabled?: boolean;
}

/**
 * Hook for registering keyboard shortcuts
 * Automatically prevents shortcuts when typing in inputs/textareas
 */
export function useKeyboardShortcuts(shortcuts: KeyboardShortcut[]) {
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      // Don't trigger shortcuts when typing in inputs
      const target = event.target as HTMLElement;
      const isTyping =
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable;

      if (isTyping) return;

      const matchingShortcut = shortcuts.find((shortcut) => {
        if (shortcut.enabled === false) return false;

        const keyMatch = event.key.toLowerCase() === shortcut.key.toLowerCase();
        const ctrlMatch = shortcut.ctrl ? (event.ctrlKey || event.metaKey) : !event.ctrlKey && !event.metaKey;
        const altMatch = shortcut.alt ? event.altKey : !event.altKey;
        const shiftMatch = shortcut.shift ? event.shiftKey : !event.shiftKey;

        return keyMatch && ctrlMatch && altMatch && shiftMatch;
      });

      if (matchingShortcut) {
        event.preventDefault();
        matchingShortcut.action();
      }
    },
    [shortcuts]
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);
}

/**
 * Hook for showing keyboard shortcut hints
 */
export function useShortcutHelp() {
  const isShortcutHelpVisible = false; // Could be toggled with '?'

  return {
    isShortcutHelpVisible,
  };
}

/**
 * Common keyboard shortcuts for the app
 */
export const COMMON_SHORTCUTS = {
  SEARCH: { key: '/', description: 'Focus search' },
  HELP: { key: '?', shift: true, description: 'Show keyboard shortcuts' },
  ESCAPE: { key: 'Escape', description: 'Close dialog/Clear selection' },
  NEXT: { key: 'j', description: 'Next item' },
  PREV: { key: 'k', description: 'Previous item' },
  CALL: { key: 'c', description: 'Call selected lead' },
  PREP: { key: 'p', description: 'Open call prep' },
  QUALIFY: { key: 'q', description: 'Qualify selected lead' },
  REFRESH: { key: 'r', description: 'Refresh intel' },
  NEW: { key: 'n', description: 'Create new' },
} as const;
