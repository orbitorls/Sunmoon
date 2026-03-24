"use client"

import React, { useState, useCallback } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { AlertCircle, RefreshCw, MapPin, WifiOff, Server, Database, Globe } from "lucide-react"
import { withRetry, type RetryOptions, type RetryResult } from "@/lib/retry-logic"

interface UseApiOptions<T> {
  onSuccess?: (data: T) => void
  onError?: (error: any) => void
  retryConfig?: RetryOptions
  immediate?: boolean
}

interface UseApiState<T> {
  data: T | null
  error: any | null
  loading: boolean
  attempts: number
}

export function useApi<T>(
  fetchFn: () => Promise<T>,
  options: UseApiOptions<T> = {}
) {
  const [state, setState] = useState<UseApiState<T>>({
    data: null,
    error: null,
    loading: options.immediate !== false,
    attempts: 0,
  })

  const execute = useCallback(async () => {
    setState(prev => ({ ...prev, loading: true, error: null }))

    const result = await withRetry(fetchFn, options.retryConfig)

    setState({
      data: result.data,
      error: result.error,
      loading: false,
      attempts: result.attempts,
    })

    if (result.success && options.onSuccess) {
      options.onSuccess(result.data!)
    } else if (!result.success && options.onError) {
      options.onError(result.error)
    }

    return result
  }, [fetchFn, options])

  return {
    ...state,
    execute,
    retry: execute,
  }
}

interface ErrorStateProps {
  title?: string
  message?: string
  onRetry?: () => void
  location?: string
  errorType?: "network" | "api" | "location" | "server" | "database" | "general"
  attemptCount?: number
  maxAttempts?: number
  suggestion?: string
}

export const EnhancedErrorState: React.FC<ErrorStateProps> = ({ 
  title,
  message,
  onRetry,
  location,
  errorType = "general",
  attemptCount,
  maxAttempts,
  suggestion
}) => {
  const getErrorConfig = (type: string) => {
    switch (type) {
      case "network":
        return {
          icon: <WifiOff className="h-14 w-14 text-red-500" />,
          title: title || "ไม่สามารถเชื่อมต่อได้",
          message: message || "กรุณาตรวจสอบการเชื่อมต่ออินเทอร์เน็ต",
          color: "red",
          tips: [
            "ตรวจสอบการเชื่อมต่อ WiFi หรือ 4G/5G",
            "ลองเปิด/ปิด โหมดเครื่องบิน",
            "รีสตาร์ทแอปหรือเบราว์เซอร์",
          ],
        }
      case "server":
        return {
          icon: <Server className="h-14 w-14 text-orange-500" />,
          title: title || "เซิร์ฟเวอร์ไม่พร้อมใช้งาน",
          message: message || "เซิร์ฟเวอร์กำลังบำรุงรักษา กรุณาลองใหม่ในภายหลัง",
          color: "orange",
          tips: [
            "เซิร์ฟเวอร์อาจกำลังบำรุงรักษา",
            "รอสักครู่แล้วลองใหม่",
            "ตรวจสอบสถานะระบบภายหลัง",
          ],
        }
      case "database":
        return {
          icon: <Database className="h-14 w-14 text-yellow-500" />,
          title: title || "ฐานข้อมูลมีปัญหา",
          message: message || "ไม่สามารถเข้าถึงข้อมูลได้ในขณะนี้",
          color: "yellow",
          tips: [
            "กำลังประมวลผลข้อมูลจำนวนมาก",
            "ลองใหม่ในอีกสักครู่",
            "เลือกช่วงเวลาที่ไม่มีผู้ใช้งานมาก",
          ],
        }
      case "api":
        return {
          icon: <Globe className="h-14 w-14 text-blue-500" />,
          title: title || "API ไม่ตอบสนอง",
          message: message || "ไม่สามารถดึงข้อมูลจากบริการภายนอกได้",
          color: "blue",
          tips: [
            "บริการภายนอกอาจมีปัญหาชั่วคราว",
            "ลองใหม่ในอีกสักครู่",
            "ข้อมูลบางส่วนอาจไม่ครบถ้วน",
          ],
        }
      case "location":
        return {
          icon: <MapPin className="h-14 w-14 text-purple-500" />,
          title: title || "ไม่พบข้อมูลสำหรับพื้นที่นี้",
          message: message || "กรุณาเลือกพื้นที่อื่น หรือลองใหม่อีกครั้ง",
          color: "purple",
          tips: [
            "เลือกจังหวัดชายฝั่งอื่น",
            "ตรวจสอบการสะกดชื่อสถานที่",
            "ลองขยายหรือย่างรัศมีพื้นที่",
          ],
        }
      default:
        return {
          icon: <AlertCircle className="h-14 w-14 text-gray-500" />,
          title: title || "เกิดข้อผิดพลาด",
          message: message || "ไม่สามารถโหลดข้อมูลได้ กรุณาลองใหม่อีกครั้ง",
          color: "gray",
          tips: [
            "รีเฟรชหน้าเพจ",
            "ลองเปิดแอปใหม่",
            "ติดต่อฝ่ายสนับสนุนหากยังมีปัญหา",
          ],
        }
    }
  }

  const config = getErrorConfig(errorType)

  return (
    <Card 
      className="w-full shadow-lg border-0 bg-white/95 backdrop-blur-sm dark:bg-gray-900/95"
      role="alert"
      aria-live="assertive"
    >
      <CardContent className="flex items-center justify-center py-8 px-4">
        <div className="text-center space-y-4 max-w-md w-full">
          <div className="flex justify-center">
            {config.icon}
          </div>
          
          <div className="space-y-2">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              {config.title}
            </h3>
            <p className="text-gray-600 dark:text-gray-300">
              {config.message}
            </p>
            {location && (
              <p className="text-sm text-gray-500 dark:text-gray-400">
                📍 {location}
              </p>
            )}
            {attemptCount !== undefined && maxAttempts !== undefined && (
              <p className="text-xs text-gray-400 dark:text-gray-500">
                พยายาม {attemptCount}/{maxAttempts} ครั้ง
              </p>
            )}
          </div>

          <div className="space-y-3 pt-2">
            {onRetry && (
              <Button 
                onClick={onRetry}
                className="w-full"
                size="lg"
                disabled={attemptCount !== undefined && maxAttempts !== undefined && attemptCount >= maxAttempts}
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                ลองใหม่อีกครั้ง
              </Button>
            )}
            
            <div className="text-left bg-gray-50 dark:bg-gray-800/50 p-3 rounded-lg text-xs space-y-1">
              <p className="font-medium text-gray-700 dark:text-gray-300">
                💡 คำแนะนำ:
              </p>
              <ul className="list-disc list-inside space-y-1 text-gray-600 dark:text-gray-400">
                {config.tips.map((tip, index) => (
                  <li key={index}>{tip}</li>
                ))}
                {suggestion && <li>{suggestion}</li>}
              </ul>
            </div>
          </div>

          <div className="flex items-center justify-center space-x-2 text-xs text-gray-400 dark:text-gray-500">
            <div className={`w-2 h-2 rounded-full ${
              errorType === "network" ? "bg-red-500" :
              errorType === "server" ? "bg-orange-500" :
              errorType === "api" ? "bg-blue-500" :
              "bg-gray-500"
            }`} />
            <span>สถานะ: ไม่พร้อมใช้งานชั่วคราว</span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export default EnhancedErrorState
