/**
 * Retry Logic for API Calls
 * Provides robust error handling with exponential backoff
 */

interface RetryOptions {
  maxRetries?: number
  initialDelay?: number
  maxDelay?: number
  backoffMultiplier?: number
  retryCondition?: (error: any, attempt: number) => boolean
  onRetry?: (error: any, attempt: number, delay: number) => void
  jitter?: boolean
}

interface RetryResult<T> {
  data: T | null
  error: any | null
  attempts: number
  totalTime: number
  success: boolean
}

const DEFAULT_OPTIONS: Required<RetryOptions> = {
  maxRetries: 3,
  initialDelay: 1000,
  maxDelay: 10000,
  backoffMultiplier: 2,
  retryCondition: (error: any) => {
    if (!error) return false
    
    if (error.status === 429) return true
    if (error.status === 503) return true
    if (error.status === 504) return true
    if (error.status >= 500) return true
    
    if (error.name === 'NetworkError') return true
    if (error.name === 'TypeError' && error.message.includes('fetch')) return true
    
    if (error.code === 'ECONNREFUSED') return true
    if (error.code === 'ETIMEDOUT') return true
    if (error.code === 'ENOTFOUND') return true
    
    return false
  },
  onRetry: (error, attempt, delay) => {
    console.log(`Retry attempt ${attempt + 1} after ${delay}ms`, error)
  },
  jitter: true,
}

export async function withRetry<T>(
  fn: () => Promise<T>,
  options?: RetryOptions
): Promise<RetryResult<T>> {
  const opts = { ...DEFAULT_OPTIONS, ...options }
  const startTime = Date.now()
  let lastError: any = null
  
  for (let attempt = 0; attempt <= opts.maxRetries; attempt++) {
    try {
      const data = await fn()
      const totalTime = Date.now() - startTime
      
      return {
        data,
        error: null,
        attempts: attempt + 1,
        totalTime,
        success: true,
      }
    } catch (error: any) {
      lastError = error
      
      if (attempt < opts.maxRetries && opts.retryCondition(error, attempt)) {
        let delay = Math.min(
          opts.initialDelay * Math.pow(opts.backoffMultiplier, attempt),
          opts.maxDelay
        )
        
        if (opts.jitter) {
          delay = delay * (0.5 + Math.random() * 0.5)
        }
        
        delay = Math.floor(delay)
        
        opts.onRetry(error, attempt, delay)
        
        await sleep(delay)
      } else {
        break
      }
    }
  }
  
  const totalTime = Date.now() - startTime
  
  return {
    data: null,
    error: lastError,
    attempts: opts.maxRetries + 1,
    totalTime,
    success: false,
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

interface FetchOptions extends RequestInit {
  timeout?: number
  retry?: RetryOptions
}

async function fetchWithRetry(url: string, options?: FetchOptions): Promise<RetryResult<Response>> {
  const timeout = options?.timeout || 30000
  const retryOptions = options?.retry
  
  return withRetry(async () => {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), timeout)
    
    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
      })
      clearTimeout(timeoutId)
      
      if (!response.ok) {
        const error = new Error(`HTTP error! status: ${response.status}`)
        ;(error as any).status = response.status
        ;(error as any).statusText = response.statusText
        throw error
      }
      
      return response
    } finally {
      clearTimeout(timeoutId)
    }
  }, retryOptions)
}

interface ApiError extends Error {
  status?: number
  statusText?: string
  code?: string
  details?: any
}

function createApiError(message: string, status?: number, details?: any): ApiError {
  const error = new Error(message) as ApiError
  error.status = status
  error.details = details
  return error
}

export async function safeFetch<T>(
  url: string,
  options?: FetchOptions
): Promise<{ data: T | null; error: ApiError | null }> {
  const result = await fetchWithRetry(url, options)
  
  if (result.success && result.data) {
    try {
      const json = await result.data.json()
      return { data: json, error: null }
    } catch {
      return {
        data: null,
        error: createApiError('Failed to parse response', 0),
      }
    }
  }
  
  return {
    data: null,
    error: createApiError(
      result.error?.message || 'Request failed',
      result.error?.status,
      result.error
    ),
  }
}

interface RetryConfig {
  maxRetries: number
  delays: number[]
}

const RETRY_CONFIGS: Record<string, RetryConfig> = {
  critical: {
    maxRetries: 5,
    delays: [1000, 2000, 4000, 8000, 16000],
  },
  standard: {
    maxRetries: 3,
    delays: [1000, 2000, 4000],
  },
  relaxed: {
    maxRetries: 2,
    delays: [2000, 5000],
  },
  aggressive: {
    maxRetries: 1,
    delays: [500],
  },
}

export function getRetryConfig(type: keyof typeof RETRY_CONFIGS): RetryConfig {
  return RETRY_CONFIGS[type] || RETRY_CONFIGS.standard
}

export function createRetryOptions(type: keyof typeof RETRY_CONFIGS = 'standard'): RetryOptions {
  const config = getRetryConfig(type)
  return {
    maxRetries: config.maxRetries,
    initialDelay: config.delays[0],
    maxDelay: config.delays[config.delays.length - 1] * 2,
    backoffMultiplier: 2,
  }
}

export function isRetryableError(error: any): boolean {
  if (!error) return false
  
  if (error.status === 429) return true
  if (error.status === 503) return true
  if (error.status === 504) return true
  if (error.status >= 500) return true
  
  if (error.name === 'NetworkError') return true
  if (error.name === 'AbortError') return false
  
  if (error.code === 'ECONNREFUSED') return true
  if (error.code === 'ETIMEDOUT') return true
  if (error.code === 'ENOTFOUND') return true
  
  return false
}

export async function retryWithCircuitBreaker<T>(
  fn: () => Promise<T>,
  circuitState: { failures: number; lastFailure: number },
  options?: RetryOptions
): Promise<RetryResult<T>> {
  const now = Date.now()
  const circuitTimeout = 30000
  
  if (circuitState.failures >= 5 && now - circuitState.lastFailure < circuitTimeout) {
    return {
      data: null,
      error: new Error('Circuit breaker open'),
      attempts: 0,
      totalTime: 0,
      success: false,
    }
  }
  
  const result = await withRetry(fn, options)
  
  if (!result.success) {
    circuitState.failures++
    circuitState.lastFailure = now
  } else {
    circuitState.failures = 0
  }
  
  return result
}

export type { RetryOptions, RetryResult, FetchOptions, ApiError };
