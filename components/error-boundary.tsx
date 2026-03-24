"use client"

import React, { Component, ErrorInfo, ReactNode } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { AlertTriangle, RefreshCw, Home, Bug, ChevronDown, ChevronUp } from "lucide-react"

interface Props {
  children: ReactNode
  fallback?: ReactNode
  onError?: (error: Error, errorInfo: ErrorInfo) => void
}

interface State {
  hasError: boolean
  error: Error | null
  errorInfo: ErrorInfo | null
  showDetails: boolean
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
    showDetails: false,
  }

  public static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error }
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error("ErrorBoundary caught an error:", error, errorInfo)
    
    this.setState({
      error,
      errorInfo,
    })
    
    if (this.props.onError) {
      this.props.onError(error, errorInfo)
    }
    
    if (typeof window !== "undefined") {
      const errorReport = {
        message: error.message,
        stack: error.stack,
        componentStack: errorInfo.componentStack,
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent,
        url: window.location.href,
      }
      
      console.log("Error report:", JSON.stringify(errorReport, null, 2))
    }
  }

  private handleReload = (): void => {
    if (typeof window !== "undefined") {
      window.location.reload()
    }
  }

  private handleGoHome = (): void => {
    if (typeof window !== "undefined") {
      window.location.href = "/"
    }
  }

  private toggleDetails = (): void => {
    this.setState(prev => ({ showDetails: !prev.showDetails }))
  }

  public render(): ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback
      }

      return (
        <Card className="w-full max-w-lg mx-auto my-8 shadow-lg border-0 bg-white/95 dark:bg-gray-900/95 backdrop-blur">
          <CardContent className="p-6">
            <div className="text-center space-y-4">
              <div className="flex justify-center">
                <div className="p-4 bg-red-100 dark:bg-red-900/30 rounded-full">
                  <AlertTriangle className="h-12 w-12 text-red-600 dark:text-red-400" />
                </div>
              </div>

              <div className="space-y-2">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                  เกิดข้อผิดพลาด
                </h2>
                <p className="text-gray-600 dark:text-gray-300">
                  ขออภัย พบปัญหาที่ไม่คาดคิด กรุณาลองใหม่อีกครั้ง
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 justify-center pt-4">
                <Button onClick={this.handleReload} size="lg">
                  <RefreshCw className="h-4 w-4 mr-2" />
                  โหลดใหม่
                </Button>
                <Button onClick={this.handleGoHome} variant="outline" size="lg">
                  <Home className="h-4 w-4 mr-2" />
                  กลับหน้าหลัก
                </Button>
              </div>

              <button
                onClick={this.toggleDetails}
                className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 flex items-center justify-center gap-1 mt-4"
                aria-expanded={this.state.showDetails}
              >
                <Bug className="h-4 w-4" />
                {this.state.showDetails ? "ซ่อนรายละเอียด" : "แสดงรายละเอียด"}
                {this.state.showDetails ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </button>

              {this.state.showDetails && this.state.error && (
                <div className="text-left bg-gray-100 dark:bg-gray-800 p-4 rounded-lg text-xs font-mono overflow-auto max-h-48">
                  <p className="font-semibold text-red-600 dark:text-red-400 mb-2">
                    Error: {this.state.error.name}
                  </p>
                  <p className="text-gray-700 dark:text-gray-300 mb-2 break-all">
                    {this.state.error.message}
                  </p>
                  {this.state.error.stack && (
                    <pre className="text-gray-600 dark:text-gray-400 whitespace-pre-wrap break-all">
                      {this.state.error.stack}
                    </pre>
                  )}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )
    }

    return this.props.children
  }
}

export default ErrorBoundary
