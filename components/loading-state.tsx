"use client"

import React from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Loader2, Waves, Sun, Moon, Wind, Droplets, Compass } from "lucide-react"

interface LoadingStateProps {
  message?: string
  location?: string
  progress?: number
  showProgress?: boolean
}

export const LoadingState: React.FC<LoadingStateProps> = ({ 
  message = "กำลังโหลดข้อมูล...", 
  location,
  progress,
  showProgress = false
}) => {
  const icons = [
    { Icon: Waves, color: "text-blue-500", delay: "delay-0" },
    { Icon: Sun, color: "text-yellow-500", delay: "delay-100" },
    { Icon: Moon, color: "text-gray-500", delay: "delay-200" },
    { Icon: Wind, color: "text-cyan-500", delay: "delay-300" },
    { Icon: Droplets, color: "text-blue-400", delay: "delay-400" },
    { Icon: Compass, color: "text-indigo-500", delay: "delay-500" },
  ]
  
  return (
    <Card 
      className="w-full shadow-lg border-0 bg-white/80 backdrop-blur-sm dark:bg-gray-900/80"
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <CardContent className="flex items-center justify-center py-12 px-4">
        <div className="text-center space-y-6 max-w-md w-full">
          <div className="relative flex items-center justify-center space-x-3">
            {icons.map(({ Icon, color, delay }, index) => (
              <div 
                key={index}
                className={`animate-bounce ${delay}`}
                style={{ animationDuration: '0.8s' }}
              >
                <Icon className={`h-6 w-6 ${color}`} aria-hidden="true" />
              </div>
            ))}
          </div>
          
          <div className="flex items-center justify-center">
            <Loader2 
              className="h-10 w-10 animate-spin text-blue-600" 
              aria-hidden="true"
            />
          </div>
          
          <div className="space-y-3">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              {message}
            </h3>
            {location && (
              <p className="text-base text-blue-600 dark:text-blue-400 font-medium">
                <span className="sr-only">สถานที่: </span>
                📍 {location}
              </p>
            )}
            
            {showProgress && progress !== undefined && (
              <div 
                className="w-full bg-gray-200 rounded-full h-2.5 dark:bg-gray-700 mt-4"
                role="progressbar"
                aria-valuenow={progress}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label="ความคืบหน้า"
              >
                <div 
                  className="bg-blue-600 h-2.5 rounded-full transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
            )}
            
            <div className="space-y-2 pt-2">
              <p className="text-xs text-gray-500 dark:text-gray-400">
                กำลังเตรียมข้อมูลพยากรณ์และตรวจแหล่งข้อมูลที่พร้อมใช้งาน
              </p>
              <div className="flex flex-wrap justify-center gap-2 text-xs">
                <span className="flex items-center space-x-1 bg-blue-50 dark:bg-blue-900/20 px-2 py-1 rounded">
                  <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse" aria-hidden="true" />
                  <span>ข้อมูลระดับน้ำ</span>
                </span>
                <span className="flex items-center space-x-1 bg-green-50 dark:bg-green-900/20 px-2 py-1 rounded">
                  <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" aria-hidden="true" />
                  <span>ข้อมูลสภาพอากาศ</span>
                </span>
                <span className="flex items-center space-x-1 bg-purple-50 dark:bg-purple-900/20 px-2 py-1 rounded">
                  <div className="w-1.5 h-1.5 bg-purple-500 rounded-full animate-pulse" aria-hidden="true" />
                  <span>โมเดลพยากรณ์</span>
                </span>
              </div>
            </div>
          </div>

          <div className="flex justify-center space-x-1.5" aria-hidden="true">
            {[0, 1, 2].map((dot) => (
              <div
                key={dot}
                className={`w-2 h-2 bg-blue-500 rounded-full animate-bounce`}
                style={{ animationDelay: `${dot * 0.15}s`, animationDuration: '0.6s' }}
              />
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

interface SkeletonLoadingProps {
  lines?: number
  height?: number
  className?: string
}

export const SkeletonLoading: React.FC<SkeletonLoadingProps> = ({ 
  lines = 4,
  height = 20,
  className = ""
}) => {
  return (
    <div className={`space-y-3 ${className}`} role="status" aria-label="กำลังโหลด">
      {Array.from({ length: lines }).map((_, index) => (
        <div
          key={index}
          className="animate-pulse bg-gray-200 dark:bg-gray-700 rounded"
          style={{ height: `${height}px` }}
        />
      ))}
    </div>
  )
}

interface PageLoadingProps {
  title?: string
}

export const PageLoading: React.FC<PageLoadingProps> = ({ 
  title = "กำลังโหลดหน้า..." 
}) => {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center space-y-4">
        <LoadingState message={title} showProgress />
      </div>
    </div>
  )
}

export default LoadingState
