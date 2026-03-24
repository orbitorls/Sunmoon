/**
 * Responsive Design Utilities
 * Provides mobile-first responsive design utilities
 */

import { useEffect, useState } from 'react';

export interface Breakpoint {
  name: string;
  min: number;
  max: number;
}

export const BREAKPOINTS: Breakpoint[] = [
  { name: 'xs', min: 0, max: 319 },
  { name: 'sm', min: 320, max: 639 },
  { name: 'md', min: 640, max: 767 },
  { name: 'lg', min: 768, max: 1023 },
  { name: 'xl', min: 1024, max: 1279 },
  { name: '2xl', min: 1280, max: 1535 },
  { name: '3xl', min: 1536, max: Infinity },
];

export function useBreakpoint(): string {
  const [breakpoint, setBreakpoint] = useState('lg');

  useEffect(() => {
    const checkBreakpoint = () => {
      const width = window.innerWidth;
      const currentBreakpoint = BREAKPOINTS.find(
        bp => width >= bp.min && width <= bp.max
      );
      setBreakpoint(currentBreakpoint?.name || 'lg');
    };

    checkBreakpoint();
    window.addEventListener('resize', checkBreakpoint);
    return () => window.removeEventListener('resize', checkBreakpoint);
  }, []);

  return breakpoint;
}

export function useIsMobile(): boolean {
  const breakpoint = useBreakpoint();
  return ['xs', 'sm', 'md'].includes(breakpoint);
}

export function useIsTablet(): boolean {
  const breakpoint = useBreakpoint();
  return breakpoint === 'lg';
}

export function useIsDesktop(): boolean {
  const breakpoint = useBreakpoint();
  return ['xl', '2xl', '3xl'].includes(breakpoint);
}

export function useOrientation(): 'portrait' | 'landscape' {
  const [orientation, setOrientation] = useState<'portrait' | 'landscape'>('portrait');

  useEffect(() => {
    const checkOrientation = () => {
      setOrientation(window.innerHeight > window.innerWidth ? 'portrait' : 'landscape');
    };

    checkOrientation();
    window.addEventListener('resize', checkOrientation);
    return () => window.removeEventListener('resize', checkOrientation);
  }, []);

  return orientation;
}

export function useWindowSize(): { width: number; height: number } {
  const [size, setSize] = useState({ width: 1024, height: 768 });

  useEffect(() => {
    const handleResize = () => {
      setSize({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return size;
}

export function useViewportHeight(): number {
  const [height, setHeight] = useState(window.innerHeight);

  useEffect(() => {
    const handleResize = () => {
      setHeight(window.innerHeight);
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return height;
}

export function getResponsiveValue<T>(
  values: Partial<Record<string, T>>,
  breakpoint: string = 'lg'
): T | undefined {
  const orderedBreakpoints = ['xs', 'sm', 'md', 'lg', 'xl', '2xl', '3xl'];
  const index = orderedBreakpoints.indexOf(breakpoint);

  for (let i = index; i >= 0; i--) {
    const bp = orderedBreakpoints[i];
    if (values[bp] !== undefined) {
      return values[bp];
    }
  }

  return undefined;
}

export function responsive<T>(values: Partial<Record<string, T>>): T | undefined {
  const breakpoint = useBreakpoint();
  return getResponsiveValue(values, breakpoint);
}

export interface ResponsiveProps {
  xs?: string;
  sm?: string;
  md?: string;
  lg?: string;
  xl?: string;
  '2xl'?: string;
  '3xl'?: string;
}

export function getResponsiveClassName(props: Record<string, string | undefined>): string {
  const breakpoint = useBreakpoint();
  const propsAsRecord = props as Record<string, string | undefined>;
  return getResponsiveValue(propsAsRecord, breakpoint) || '';
}

export function useSafeAreaInsets(): {
  top: number;
  right: number;
  bottom: number;
  left: number;
} {
  const [insets, setInsets] = useState({ top: 0, right: 0, bottom: 0, left: 0 });

  useEffect(() => {
    const getInsets = () => {
      const style = getComputedStyle(document.documentElement);
      return {
        top: parseInt(style.getPropertyValue('--safe-area-inset-top') || '0', 10),
        right: parseInt(style.getPropertyValue('--safe-area-inset-right') || '0', 10),
        bottom: parseInt(style.getPropertyValue('--safe-area-inset-bottom') || '0', 10),
        left: parseInt(style.getPropertyValue('--safe-area-inset-left') || '0', 10),
      };
    };

    const updateInsets = () => {
      setInsets(getInsets());
    };

    updateInsets();
    window.addEventListener('resize', updateInsets);
    return () => window.removeEventListener('resize', updateInsets);
  }, []);

  return insets;
}

export function withSafeArea(style: React.CSSProperties): React.CSSProperties {
  const insets = useSafeAreaInsets();
  const paddingTop = typeof style.paddingTop === 'number' ? style.paddingTop : 0;
  const paddingRight = typeof style.paddingRight === 'number' ? style.paddingRight : 0;
  const paddingBottom = typeof style.paddingBottom === 'number' ? style.paddingBottom : 0;
  const paddingLeft = typeof style.paddingLeft === 'number' ? style.paddingLeft : 0;
  
  return {
    ...style,
    paddingTop: Math.max(paddingTop, insets.top),
    paddingRight: Math.max(paddingRight, insets.right),
    paddingBottom: Math.max(paddingBottom, insets.bottom),
    paddingLeft: Math.max(paddingLeft, insets.left),
  };
}

export function useDeviceType(): 'mobile' | 'tablet' | 'desktop' {
  const { width } = useWindowSize();
  
  if (width < 768) return 'mobile';
  if (width < 1024) return 'tablet';
  return 'desktop';
}

export function isTouchDevice(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    'ontouchstart' in window ||
    navigator.maxTouchPoints > 0 ||
    (navigator as any).msMaxTouchPoints > 0
  );
}

export function useTouchEnabled(): boolean {
  const [touchEnabled, setTouchEnabled] = useState(false);

  useEffect(() => {
    setTouchEnabled(isTouchDevice());
  }, []);

  return touchEnabled;
}

export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    const media = window.matchMedia(query);
    const updateMatches = () => setMatches(media.matches);

    updateMatches();
    media.addEventListener('change', updateMatches);
    return () => media.removeEventListener('change', updateMatches);
  }, [query]);

  return matches;
}

export function usePrefersReducedMotion(): boolean {
  return useMediaQuery('(prefers-reduced-motion: reduce)');
}

export function usePrefersColorScheme(): 'light' | 'dark' | 'no-preference' {
  const [scheme, setScheme] = useState<'light' | 'dark' | 'no-preference'>('no-preference');

  useEffect(() => {
    const updateScheme = () => {
      if (window.matchMedia('(prefers-color-scheme: light)').matches) {
        setScheme('light');
      } else if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
        setScheme('dark');
      } else {
        setScheme('no-preference');
      }
    };

    updateScheme();
    
    const lightMedia = window.matchMedia('(prefers-color-scheme: light)');
    const darkMedia = window.matchMedia('(prefers-color-scheme: dark)');
    
    lightMedia.addEventListener('change', updateScheme);
    darkMedia.addEventListener('change', updateScheme);
    
    return () => {
      lightMedia.removeEventListener('change', updateScheme);
      darkMedia.removeEventListener('change', updateScheme);
    };
  }, []);

  return scheme;
}

export const responsiveClasses = {
  container: 'w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8',
  card: 'w-full bg-white dark:bg-gray-900 rounded-lg shadow-lg',
  button: 'w-full sm:w-auto',
  grid: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4',
  flex: 'flex-col sm:flex-row',
  spacing: 'space-y-4 sm:space-y-0 sm:space-x-4',
  text: 'text-sm sm:text-base lg:text-lg',
};

export function getResponsiveClasses(
  baseClass: string,
  modifiers?: Partial<Record<string, string>>
): string {
  const classes = [baseClass];
  
  if (modifiers?.mobile) classes.push(modifiers.mobile);
  if (modifiers?.tablet) classes.push(`sm:${modifiers.tablet}`);
  if (modifiers?.desktop) classes.push(`lg:${modifiers.desktop}`);
  
  return classes.join(' ');
}

