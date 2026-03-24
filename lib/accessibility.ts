/**
 * Accessibility Utilities
 * Provides ARIA labels, keyboard navigation, and screen reader support
 */

import { useEffect, useState, useCallback } from 'react';

export const ARIA_ROLES = {
  alert: 'alert',
  alertdialog: 'alertdialog',
  button: 'button',
  checkbox: 'checkbox',
  combobox: 'combobox',
  dialog: 'dialog',
  grid: 'grid',
  gridcell: 'gridcell',
  link: 'link',
  listbox: 'listbox',
  menu: 'menu',
  menubar: 'menubar',
  menuitem: 'menuitem',
  navigation: 'navigation',
  none: 'none',
  option: 'option',
  presentation: 'presentation',
  progressbar: 'progressbar',
  radio: 'radio',
  region: 'region',
  row: 'row',
  rowgroup: 'rowgroup',
  scrollbar: 'scrollbar',
  search: 'search',
  slider: 'slider',
  spinbutton: 'spinbutton',
  status: 'status',
  tab: 'tab',
  tablist: 'tablist',
  tabpanel: 'tabpanel',
  textbox: 'textbox',
  tooltip: 'tooltip',
  tree: 'tree',
  treegrid: 'treegrid',
  treeitem: 'treeitem',
} as const;

export const ARIA_PROPERTIES = {
  'aria-activedescendant': 'aria-activedescendant',
  'aria-atomic': 'aria-atomic',
  'aria-autocomplete': 'aria-autocomplete',
  'aria-busy': 'aria-busy',
  'aria-checked': 'aria-checked',
  'aria-colcount': 'aria-colcount',
  'aria-colindex': 'aria-colindex',
  'aria-colspan': 'aria-colspan',
  'aria-controls': 'aria-controls',
  'aria-current': 'aria-current',
  'aria-describedby': 'aria-describedby',
  'aria-description': 'aria-description',
  'aria-details': 'aria-details',
  'aria-disabled': 'aria-disabled',
  'aria-dropeffect': 'aria-dropeffect',
  'aria-errormessage': 'aria-errormessage',
  'aria-expanded': 'aria-expanded',
  'aria-flowto': 'aria-flowto',
  'aria-grabbed': 'aria-grabbed',
  'aria-haspopup': 'aria-haspopup',
  'aria-hidden': 'aria-hidden',
  'aria-invalid': 'aria-invalid',
  'aria-keyshortcuts': 'aria-keyshortcuts',
  'aria-label': 'aria-label',
  'aria-labelledby': 'aria-labelledby',
  'aria-level': 'aria-level',
  'aria-live': 'aria-live',
  'aria-modal': 'aria-modal',
  'aria-multiline': 'aria-multiline',
  'aria-multiselectable': 'aria-multiselectable',
  'aria-orientation': 'aria-orientation',
  'aria-owns': 'aria-owns',
  'aria-placeholder': 'aria-placeholder',
  'aria-posinset': 'aria-posinset',
  'aria-pressed': 'aria-pressed',
  'aria-readonly': 'aria-readonly',
  'aria-relevant': 'aria-relevant',
  'aria-required': 'aria-required',
  'aria-roledescription': 'aria-roledescription',
  'aria-rowcount': 'aria-rowcount',
  'aria-rowindex': 'aria-rowindex',
  'aria-rowspan': 'aria-rowspan',
  'aria-selected': 'aria-selected',
  'aria-setsize': 'aria-setsize',
  'aria-sort': 'aria-sort',
  'aria-valuemax': 'aria-valuemax',
  'aria-valuemin': 'aria-valuemin',
  'aria-valuenow': 'aria-valuenow',
  'aria-valuetext': 'aria-valuetext',
} as const;

export interface AriaProps {
  role?: string;
  'aria-label'?: string;
  'aria-labelledby'?: string;
  'aria-describedby'?: string;
  'aria-live'?: 'polite' | 'assertive' | 'off';
  'aria-atomic'?: boolean;
  'aria-busy'?: boolean;
  'aria-expanded'?: boolean;
  'aria-controls'?: string;
  'aria-haspopup'?: boolean | 'menu' | 'listbox' | 'tree' | 'grid' | 'dialog';
  'aria-pressed'?: boolean;
  'aria-selected'?: boolean;
  'aria-checked'?: boolean;
  'aria-disabled'?: boolean;
  'aria-hidden'?: boolean;
  'aria-modal'?: boolean;
  'aria-required'?: boolean;
  'aria-invalid'?: boolean;
  'aria-readonly'?: boolean;
  'aria-orientation'?: 'horizontal' | 'vertical';
  'aria-valuenow'?: number;
  'aria-valuemin'?: number;
  'aria-valuemax'?: number;
  'aria-valuetext'?: string;
}

export function useAria(props: AriaProps): AriaProps {
  return props;
}

export function createAriaProps(label?: string, describedBy?: string): AriaProps {
  const ariaProps: AriaProps = {};
  
  if (label) {
    ariaProps['aria-label'] = label;
  }
  
  if (describedBy) {
    ariaProps['aria-describedby'] = describedBy;
  }
  
  return ariaProps;
}

export function useAnnounce(): (message: string, politeness?: 'polite' | 'assertive') => void {
  const [announcer, setAnnouncer] = useState<HTMLDivElement | null>(null);

  useEffect(() => {
    const div = document.createElement('div');
    div.setAttribute('role', 'status');
    div.setAttribute('aria-live', 'polite');
    div.setAttribute('aria-atomic', 'true');
    div.style.position = 'absolute';
    div.style.left = '-10000px';
    div.style.width = '1px';
    div.style.height = '1px';
    div.style.overflow = 'hidden';
    document.body.appendChild(div);
    setAnnouncer(div);

    return () => {
      document.body.removeChild(div);
    };
  }, []);

  const announce = useCallback((message: string, politeness: 'polite' | 'assertive' = 'polite') => {
    if (announcer) {
      announcer.setAttribute('aria-live', politeness);
      announcer.textContent = '';
      setTimeout(() => {
        announcer.textContent = message;
      }, 100);
    }
  }, [announcer]);

  return announce;
}

export function useKeyboardNavigation(
  items: { id: string; element?: HTMLElement | null }[],
  options?: {
    orientation?: 'horizontal' | 'vertical' | 'both';
    loop?: boolean;
    wrap?: boolean;
  }
): {
  focusedIndex: number;
  setFocusedIndex: (index: number) => void;
  focusNext: () => void;
  focusPrevious: () => void;
  focusFirst: () => void;
  focusLast: () => void;
  handleKeyDown: (event: KeyboardEvent) => void;
} {
  const [focusedIndex, setFocusedIndex] = useState(0);
  const { orientation = 'vertical', loop = false, wrap = false } = options || {};

  const focusItem = useCallback((index: number) => {
    const normalizedIndex = Math.max(0, Math.min(items.length - 1, index));
    setFocusedIndex(normalizedIndex);
    
    const item = items[normalizedIndex];
    if (item.element) {
      item.element.focus();
    }
  }, [items]);

  const focusNext = useCallback(() => {
    if (focusedIndex < items.length - 1) {
      focusItem(focusedIndex + 1);
    } else if (loop) {
      focusItem(0);
    }
  }, [focusedIndex, items.length, loop, focusItem]);

  const focusPrevious = useCallback(() => {
    if (focusedIndex > 0) {
      focusItem(focusedIndex - 1);
    } else if (loop) {
      focusItem(items.length - 1);
    }
  }, [focusedIndex, items.length, loop, focusItem]);

  const focusFirst = useCallback(() => {
    focusItem(0);
  }, [focusItem]);

  const focusLast = useCallback(() => {
    focusItem(items.length - 1);
  }, [items.length, focusItem]);

  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    switch (event.key) {
      case 'ArrowDown':
        if (orientation === 'vertical' || orientation === 'both') {
          event.preventDefault();
          focusNext();
        }
        break;
      case 'ArrowUp':
        if (orientation === 'vertical' || orientation === 'both') {
          event.preventDefault();
          focusPrevious();
        }
        break;
      case 'ArrowRight':
        if (orientation === 'horizontal' || orientation === 'both') {
          event.preventDefault();
          focusNext();
        }
        break;
      case 'ArrowLeft':
        if (orientation === 'horizontal' || orientation === 'both') {
          event.preventDefault();
          focusPrevious();
        }
        break;
      case 'Home':
        event.preventDefault();
        focusFirst();
        break;
      case 'End':
        event.preventDefault();
        focusLast();
        break;
      case 'PageDown':
        event.preventDefault();
        focusItem(focusedIndex + 10);
        break;
      case 'PageUp':
        event.preventDefault();
        focusItem(focusedIndex - 10);
        break;
    }
  }, [focusedIndex, orientation, focusNext, focusPrevious, focusFirst, focusLast, focusItem]);

  return {
    focusedIndex,
    setFocusedIndex,
    focusNext,
    focusPrevious,
    focusFirst,
    focusLast,
    handleKeyDown,
  };
}

export function useFocusVisible(): boolean {
  const [focusVisible, setFocusVisible] = useState(false);

  useEffect(() => {
    let hadKeyboardEvent = false;
    let hadFocusVisibleRecently = false;
    let hadFocusVisibleRecentlyTimeout: NodeJS.Timeout;

    const onKeyDown = () => {
      hadKeyboardEvent = true;
    };

    const onMouseDown = () => {
      hadKeyboardEvent = false;
    };

    const onFocus = () => {
      if (hadKeyboardEvent) {
        setFocusVisible(true);
        hadFocusVisibleRecently = true;
        clearTimeout(hadFocusVisibleRecentlyTimeout);
        hadFocusVisibleRecentlyTimeout = setTimeout(() => {
          hadFocusVisibleRecently = false;
        }, 100);
      } else if (hadFocusVisibleRecently) {
        setFocusVisible(true);
      } else {
        setFocusVisible(false);
      }
    };

    const onBlur = () => {
      setFocusVisible(false);
    };

    document.addEventListener('keydown', onKeyDown, true);
    document.addEventListener('mousedown', onMouseDown, true);
    document.addEventListener('focus', onFocus, true);
    document.addEventListener('blur', onBlur, true);

    return () => {
      document.removeEventListener('keydown', onKeyDown, true);
      document.removeEventListener('mousedown', onMouseDown, true);
      document.removeEventListener('focus', onFocus, true);
      document.removeEventListener('blur', onBlur, true);
      clearTimeout(hadFocusVisibleRecentlyTimeout);
    };
  }, []);

  return focusVisible;
}

export function useFocusTrap(isActive: boolean): void {
  useEffect(() => {
    if (!isActive) return;

    const handleTab = (event: KeyboardEvent) => {
      if (event.key !== 'Tab') return;

      const focusableElements = document.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      
      const firstElement = focusableElements[0] as HTMLElement;
      const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;

      if (event.shiftKey) {
        if (document.activeElement === firstElement) {
          lastElement?.focus();
          event.preventDefault();
        }
      } else {
        if (document.activeElement === lastElement) {
          firstElement?.focus();
          event.preventDefault();
        }
      }
    };

    document.addEventListener('keydown', handleTab);
    return () => document.removeEventListener('keydown', handleTab);
  }, [isActive]);
}

export function useScreenReader(): boolean {
  const [isScreenReaderActive, setIsScreenReaderActive] = useState(false);

  useEffect(() => {
    const testElement = document.createElement('div');
    testElement.setAttribute('aria-hidden', 'true');
    testElement.innerHTML = 'test';
    document.body.appendChild(testElement);
    
    const isHidden = getComputedStyle(testElement).display === 'none';
    setIsScreenReaderActive(isHidden);
    
    document.body.removeChild(testElement);
  }, []);

  return isScreenReaderActive;
}

export function useReducedMotion(): boolean {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mediaQuery.matches);

    const handleChange = (event: MediaQueryListEvent) => {
      setPrefersReducedMotion(event.matches);
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  return prefersReducedMotion;
}

export function getFocusableElements(container: HTMLElement): HTMLElement[] {
  const focusableSelectors = [
    'button:not([disabled])',
    'a[href]',
    'input:not([disabled])',
    'select:not([disabled])',
    'textarea:not([disabled])',
    '[tabindex]:not([tabindex="-1"])',
    '[contenteditable="true"]',
  ];

  return Array.from(
    container.querySelectorAll(focusableSelectors.join(', '))
  ) as HTMLElement[];
}

export function trapFocus(element: HTMLElement): () => void {
  const focusableElements = getFocusableElements(element);
  const firstFocusable = focusableElements[0];
  const lastFocusable = focusableElements[focusableElements.length - 1];

  const handleTab = (event: KeyboardEvent) => {
    if (event.key !== 'Tab') return;

    if (event.shiftKey) {
      if (document.activeElement === firstFocusable) {
        lastFocusable?.focus();
        event.preventDefault();
      }
    } else {
      if (document.activeElement === lastFocusable) {
        firstFocusable?.focus();
        event.preventDefault();
      }
    }
  };

  element.addEventListener('keydown', handleTab);
  firstFocusable?.focus();

  return () => {
    element.removeEventListener('keydown', handleTab);
  };
}

export function createSkipLink(href: string, label: string): HTMLAnchorElement {
  const link = document.createElement('a');
  link.href = href;
  link.textContent = label;
  link.className = 'sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:bg-blue-600 focus:text-white focus:px-4 focus:py-2 focus:rounded';
  return link;
}

export const ACCESSIBLE_KEYBOARD_SHORTCUTS = {
  escape: 'Escape',
  enter: 'Enter',
  space: ' ',
  arrowUp: 'ArrowUp',
  arrowDown: 'ArrowDown',
  arrowLeft: 'ArrowLeft',
  arrowRight: 'ArrowRight',
  home: 'Home',
  end: 'End',
  pageUp: 'PageUp',
  pageDown: 'PageDown',
  tab: 'Tab',
  shiftTab: 'Shift+Tab',
} as const;

export interface KeyboardShortcut {
  key: string;
  ctrlKey?: boolean;
  shiftKey?: boolean;
  altKey?: boolean;
  metaKey?: boolean;
  description: string;
  action: () => void;
}

export function useKeyboardShortcut(shortcuts: KeyboardShortcut[]): void {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      for (const shortcut of shortcuts) {
        if (
          event.key === shortcut.key &&
          event.ctrlKey === !!shortcut.ctrlKey &&
          event.shiftKey === !!shortcut.shiftKey &&
          event.altKey === !!shortcut.altKey &&
          event.metaKey === !!shortcut.metaKey
        ) {
          event.preventDefault();
          shortcut.action();
          break;
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [shortcuts]);
}

