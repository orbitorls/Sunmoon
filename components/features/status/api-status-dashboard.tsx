import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Activity,
  Server,
  Cloud,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
  Waves
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface ApiStatus {
  name: string
  status: 'online' | 'offline' | 'degraded' | 'maintenance'
  lastChecked: Date
  message?: string
}

interface ApiStatusDashboardProps {
  tideApiStatus: string
  weatherApiStatus: string
  lastUpdated: string
  onRefresh?: () => void
}

export default function ApiStatusDashboard({
  tideApiStatus,
  weatherApiStatus,
  lastUpdated,
  onRefresh
}: ApiStatusDashboardProps) {
  const [apiStatuses, setApiStatuses] = useState<ApiStatus[]>([])
  const [isRefreshing, setIsRefreshing] = useState(false)

  useEffect(() => {
    const statuses: ApiStatus[] = [
      {
        name: 'ข้อมูลน้ำขึ้นน้ำลง',
        status: tideApiStatus === 'success' ? 'online' : tideApiStatus === 'loading' ? 'degraded' : 'offline',
        lastChecked: new Date(lastUpdated),
        message: tideApiStatus === 'success' ? 'ข้อมูลน้ำขึ้นลงพร้อมใช้งาน' :
          tideApiStatus === 'loading' ? 'กำลังประมวลผลข้อมูลล่าสุด' : 'กำลังใช้ข้อมูลที่ลดทอนหรือโหลดไม่สำเร็จ'
      },
    ]

    if (weatherApiStatus) {
      statuses.push({
        name: 'ข้อมูลสภาพอากาศ',
        status: weatherApiStatus === 'success' ? 'online' : weatherApiStatus === 'loading' ? 'degraded' : 'offline',
        lastChecked: new Date(lastUpdated),
        message: weatherApiStatus === 'success' ? 'ข้อมูลสภาพอากาศพร้อมใช้งาน' :
          weatherApiStatus === 'loading' ? 'กำลังโหลดข้อมูลสภาพอากาศ' : 'ยังไม่มีข้อมูลสภาพอากาศที่ยืนยันได้'
      })
    }

    setApiStatuses(statuses)
  }, [tideApiStatus, weatherApiStatus, lastUpdated])

  const handleRefresh = async () => {
    setIsRefreshing(true)
    setApiStatuses(prev => prev.map(api => ({
      ...api,
      lastChecked: new Date(),
    })))
    setIsRefreshing(false)
    onRefresh?.()
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'online':
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'offline':
        return <XCircle className="h-4 w-4 text-red-500" />
      case 'degraded':
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />
      case 'maintenance':
        return <Clock className="h-4 w-4 text-blue-500" />
      default:
        return <Activity className="h-4 w-4 text-gray-500" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'online':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
      case 'offline':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
      case 'degraded':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
      case 'maintenance':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
    }
  }

  return (
    <div className="space-y-6" role="region" aria-labelledby="api-status-heading">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-100 dark:bg-blue-900/50 rounded-lg" aria-hidden="true">
            <Server className="h-6 w-6 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h3 id="api-status-heading" className="text-lg font-semibold text-gray-900 dark:text-white">
              สถานะระบบและ API
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              ตรวจสอบการเชื่อมต่อและแหล่งข้อมูลที่ใช้งานจริง
            </p>
          </div>
        </div>
        <Button
          onClick={handleRefresh}
          disabled={isRefreshing}
          variant="outline"
          size="sm"
          className="gap-2"
          aria-label={isRefreshing ? "กำลังรีเฟรชข้อมูลสถานะระบบ" : "รีเฟรชข้อมูลสถานะระบบ"}
        >
          <RefreshCw className={cn("h-4 w-4", isRefreshing && "animate-spin")} aria-hidden="true" />
          รีเฟรช
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4" aria-labelledby="api-list-heading">
        <h4 id="api-list-heading" className="sr-only">รายการสถานะ API</h4>
        {apiStatuses.map((api, index) => (
          <Card key={index} className="shadow-lg hover:shadow-xl transition-all duration-200" role="listitem">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center justify-between">
                <span className="flex items-center gap-2">
                  {api.name.includes('น้ำขึ้นน้ำลง') && <Waves className="h-4 w-4 text-blue-500" aria-hidden="true" />}
                  {api.name.includes('สภาพอากาศ') && <Cloud className="h-4 w-4 text-green-500" aria-hidden="true" />}
                  {api.name}
                </span>
                {getStatusIcon(api.status)}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <Badge className={getStatusColor(api.status)} aria-label={`สถานะ: ${api.status === 'online' ? 'ออนไลน์' : api.status === 'offline' ? 'ออฟไลน์' : api.status === 'degraded' ? 'ลดทอน' : 'ปิดปรับปรุง'}`}>
                  {api.status === 'online' ? 'ออนไลน์' :
                   api.status === 'offline' ? 'ออฟไลน์' :
                   api.status === 'degraded' ? 'ลดทอน' : 'ปิดปรับปรุง'}
                </Badge>
              </div>
              <p className="text-xs text-gray-600 dark:text-gray-400" aria-live="polite">
                {api.message}
              </p>
              <p className="text-xs text-gray-500" aria-label={`อัปเดตล่าสุด ${api.lastChecked.toLocaleTimeString('th-TH')}`}>
                อัปเดตล่าสุด: {api.lastChecked.toLocaleTimeString('th-TH')}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
