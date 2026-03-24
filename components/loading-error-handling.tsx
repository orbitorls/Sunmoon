/**
 * Loading States and Error Handling UI Components
 */

'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  Loader2,
  AlertCircle,
  RefreshCw,
  XCircle,
  WifiOff,
  ServerCrash,
  Clock
} from 'lucide-react';

// Loading Context
interface LoadingState {
  isLoading: boolean;
  message?: string;
  progress?: number;
  total?: number;
}

interface ErrorState {
  hasError: boolean;
  error?: Error | string;
  errorType?: 'network' | 'api' | 'timeout' | 'server' | 'offline' | 'unknown';
  retryCount?: number;
}

const LoadingContext = createContext<{
  loading: LoadingState;
  setLoading: (state: LoadingState) => void;
  clearLoading: () => void;
}>({
  loading: { isLoading: false },
  setLoading: () => {},
  clearLoading: () => {}
});

const ErrorContext = createContext<{
  error: ErrorState;
  setError: (state: ErrorState) => void;
  clearError: () => void;
  retryAction?: () => void;
  setRetryAction?: (action: () => void) => void;
}>({
  error: { hasError: false },
  setError: () => {},
  clearError: () => {},
  setRetryAction: () => {}
});

// Loading Spinner Component
interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  message?: string;
  showProgress?: boolean;
  progress?: number;
  total?: number;
}

export function LoadingSpinner({ 
  size = 'md', 
  message, 
  showProgress = false,
  progress = 0,
  total = 100 
}: LoadingSpinnerProps) {
  const sizeClass = {
    sm: 'h-4 w-4',
    md: 'h-8 w-8',
    lg: 'h-12 w-12'
  }[size];

  const percentage = total > 0 ? Math.round((progress / total) * 100) : 0;

  return (
    <div className="flex flex-col items-center justify-center p-6">
      <Loader2 className={`${sizeClass} animate-spin text-blue-500`} />
      
      {message && (
        <p className="mt-3 text-sm text-muted-foreground text-center">
          {message}
        </p>
      )}
      
      {showProgress && total > 0 && (
        <div className="mt-4 w-full max-w-xs">
          <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
            <span>กำลังโหลด...</span>
            <span>{percentage}%</span>
          </div>
          <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
            <div 
              className="h-full bg-blue-500 transition-all duration-300 ease-in-out"
              style={{ width: `${percentage}%` }}
            />
          </div>
          <div className="flex items-center justify-between text-xs mt-1">
            <span>{progress} / {total}</span>
          </div>
        </div>
      )}
    </div>
  );
}

// Full Page Loading Component
interface PageLoadingProps {
  message?: string;
  progress?: number;
  total?: number;
  title?: string;
}

export function PageLoading({ 
  message = 'กำลังโหลดข้อม...', 
  progress,
  total,
  title = 'SEAPALO'
}: PageLoadingProps) {
  const percentage = total && progress ? Math.round((progress / total) * 100) : null;

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-sky-50 dark:from-slate-900 dark:via-blue-950 dark:to-slate-900">
      <div className="text-center">
        <div className="mb-6">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-blue-100 dark:bg-blue-900 rounded-full">
            <Loader2 className="h-10 w-10 text-blue-600 dark:text-blue-400 animate-spin" />
          </div>
        </div>
        
        <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-sky-500 bg-clip-text text-transparent mb-2">
          {title}
        </h1>
        
        <p className="text-lg text-muted-foreground mb-4">
          {message}
        </p>
        
        {percentage !== null && (
          <div className="max-w-md mx-auto">
            <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-blue-500 to-sky-500 transition-all duration-300"
                style={{ width: `${percentage}%` }}
              />
            </div>
            <div className="flex items-center justify-between text-sm text-muted-foreground mt-2">
              <span>กำลังโหลด...</span>
              <span className="font-medium">{percentage}%</span>
            </div>
          </div>
        )}
        
        <div className="mt-8 flex items-center gap-2">
          <Clock className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">
            โปรดรอสักครู่ หรือลองอินเทอร์เน็ต
          </span>
        </div>
      </div>
    </div>
  );
}

// Error Display Component
interface ErrorDisplayProps {
  error: Error | string;
  errorType?: 'network' | 'api' | 'timeout' | 'server' | 'offline' | 'unknown';
  onRetry?: () => void;
  onDismiss?: () => void;
  showDetails?: boolean;
}

export function ErrorDisplay({ 
  error, 
  errorType = 'unknown',
  onRetry,
  onDismiss,
  showDetails = false
}: ErrorDisplayProps) {
  const errorMessage = typeof error === 'string' ? error : error?.message || 'เกิดข้อผิดบางอย่าง';
  
  const getErrorIcon = () => {
    switch (errorType) {
      case 'network':
      case 'offline':
        return <WifiOff className="h-12 w-12 text-orange-500" />;
      case 'api':
        return <ServerCrash className="h-12 w-12 text-red-500" />;
      case 'timeout':
        return <Clock className="h-12 w-12 text-yellow-500" />;
      default:
        return <XCircle className="h-12 w-12 text-gray-500" />;
    }
  };

  const getErrorTitle = () => {
    switch (errorType) {
      case 'network':
        return 'ไม่สามารถเชื่อมต่อเซิร์เวอร์';
      case 'offline':
        return 'ไม่มีการเชื่อมต่ออินเทอร์เน็ต';
      case 'api':
        return 'เซิร์เวอร์มีปัญหา';
      case 'timeout':
        return 'หมดเวลาเชื่อมต่อ';
      case 'server':
        return 'เซิร์เวอร์ขัดข้อผิด';
      default:
        return 'เกิดข้อผิด';
    }
  };

  const getErrorSuggestion = () => {
    switch (errorType) {
      case 'network':
      case 'offline':
        return 'โปรดตรวจสอบการเชื่อมต่ออินเทอร์เน็ตของคุณ';
      case 'api':
        return 'โปรดลองอีกครั้งในภายหลัง นาที';
      case 'timeout':
        return 'การเชื่อมต่อหมดเวลา โปรดลองอีกครั้ง';
      case 'server':
        return 'กำลังแก้ไขปัญหา โปรดลองในภายหลัง';
      default:
        return 'โปรดลองใหม่ถ้าปัญหายังคง';
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardContent className="pt-6">
          <div className="text-center space-y-6">
            {getErrorIcon()}
            
            <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              {getErrorTitle()}
            </h2>
            
            <div className="bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-lg p-4">
              <p className="text-red-700 dark:text-red-300">
                {errorMessage}
              </p>
            </div>
            
            <p className="text-sm text-muted-foreground">
              {getErrorSuggestion()}
            </p>
            
            {showDetails && error instanceof Error && error.stack && (
              <details className="text-left mt-4">
                <summary className="cursor-pointer text-sm text-blue-600 dark:text-blue-400 hover:underline">
                  ดูรายละเอียดข้อผิด
                </summary>
                <pre className="mt-2 p-3 bg-gray-100 dark:bg-gray-800 rounded text-xs overflow-x-auto">
                  <code>{error.stack}</code>
                </pre>
              </details>
            )}
            
            <div className="flex gap-3">
              {onRetry && (
                <Button onClick={onRetry} className="flex-1">
                  <RefreshCw className="h-4 w-4 mr-2" />
                  ลองอีก
                </Button>
              )}
              
              {onDismiss && (
                <Button 
                  variant="outline" 
                  onClick={onDismiss} 
                  className="flex-1"
                >
                  ปิด
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Inline Error Alert Component
interface InlineErrorProps {
  error: Error | string;
  onRetry?: () => void;
  onDismiss?: () => void;
  variant?: 'default' | 'destructive';
}

export function InlineError({ 
  error, 
  onRetry, 
  onDismiss,
  variant = 'default'
}: InlineErrorProps) {
  const errorMessage = typeof error === 'string' ? error : error?.message || '';
  
  if (!errorMessage) return null;

  return (
    <div className={`p-4 rounded-lg border ${
      variant === 'destructive' 
        ? 'bg-red-50 border-red-200 dark:bg-red-950 dark:border-red-800' 
        : 'bg-yellow-50 border-yellow-200 dark:bg-yellow-950 dark:border-yellow-800'
    }`}>
      <div className="flex items-start gap-3">
        <AlertCircle className={`h-5 w-5 mt-0.5 ${
          variant === 'destructive' ? 'text-red-600 dark:text-red-400' : 'text-yellow-600 dark:text-yellow-400'
        }`} />
        
        <div className="flex-1 space-y-1">
          <p className={`text-sm ${
            variant === 'destructive' 
              ? 'text-red-700 dark:text-red-300' 
              : 'text-yellow-700 dark:text-yellow-300'
          }`}>
            {errorMessage}
          </p>
          
          <div className="flex gap-2">
            {onRetry && (
              <Button 
                size="sm" 
                variant="outline"
                onClick={onRetry}
              >
                <RefreshCw className="h-3 w-3 mr-1" />
                ลองอีก
              </Button>
            )}
            
            {onDismiss && (
              <Button 
                size="sm" 
                variant="ghost"
                onClick={onDismiss}
              >
                <XCircle className="h-3 w-3 mr-1" />
                ปิด
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// Loading and Error Providers
export function LoadingProvider({ children }: { children: React.ReactNode }) {
  const [loading, setLoading] = useState<LoadingState>({ isLoading: false });
  const clearLoading = () => setLoading({ isLoading: false });

  return (
    <LoadingContext.Provider value={{ loading, setLoading, clearLoading }}>
      {children}
    </LoadingContext.Provider>
  );
}

export function ErrorProvider({ children }: { children: React.ReactNode }) {
  const [error, setError] = useState<ErrorState>({ hasError: false });
  const [retryAction, setRetryAction] = useState<(() => void) | undefined>();
  const clearError = () => setError({ hasError: false });

  return (
    <ErrorContext.Provider value={{ error, setError, clearError, retryAction, setRetryAction }}>
      {children}
    </ErrorContext.Provider>
  );
}

// Hooks for using contexts
export function useLoading() {
  const context = useContext(LoadingContext);
  if (!context) {
    throw new Error('useLoading must be used within LoadingProvider');
  }
  return context;
}

export function useError() {
  const context = useContext(ErrorContext);
  if (!context) {
    throw new Error('useError must be used within ErrorProvider');
  }
  return context;
}

// Convenience HOC for loading/error handling
export function withLoadingAndError<P extends object>(
  Component: React.ComponentType<P>
) {
  return React.forwardRef<any, P>((props, ref) => {
    const { loading, setLoading } = useLoading();
    const { error, setError, clearError } = useError();

    // Auto-clear errors when loading starts
    useEffect(() => {
      if (loading.isLoading) {
        clearError();
      }
    }, [loading.isLoading]);

    return (
      <Component
        {...(props as P)}
        ref={ref}
        loading={loading}
        error={error}
        setLoading={setLoading}
        setError={setError}
      />
    );
  });
}
