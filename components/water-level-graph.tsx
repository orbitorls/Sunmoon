"use client"

import React from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { TideData, ApiStatus } from "@/lib/tide-service"
import { tideControlManager } from "@/lib/controls"
import { cn } from "@/lib/utils"
import { ArrowUp, ArrowDown } from "lucide-react"

interface WaterLevelGraphProps {
  tideData: TideData
}

const ApiStatusBadge: React.FC<{ status: ApiStatus; message: string }> = ({ status, message }) => {
  const getStatusColor = (status: ApiStatus) => {
    switch (status) {
      case "success": return "bg-green-500 text-white"
      case "loading": return "bg-blue-500 text-white animate-pulse"
      case "error": return "bg-red-500 text-white"
      case "timeout": return "bg-orange-500 text-white"
      case "offline": return "bg-gray-500 text-white"
      default: return "bg-gray-400 text-white"
    }
  }

  const getStatusIcon = (status: ApiStatus) => {
    switch (status) {
      case "success": return "✓"
      case "loading": return "⟳"
      case "error": return "✗"
      case "timeout": return "⏱"
      case "offline": return "⚠"
      default: return "?"
    }
  }

  return (
    <Badge className={`${getStatusColor(status)} mb-2`}>
      <span className="mr-1">{getStatusIcon(status)}</span>
      {message}
    </Badge>
  )
}

export const WaterLevelGraph: React.FC<WaterLevelGraphProps> = ({ tideData }) => {
  const maxLevel = Math.max(...tideData.graphData.map(d => d.level))
  const minLevel = Math.min(...tideData.graphData.map(d => d.level))
  const levelRange = maxLevel - minLevel || 1

  const getBarHeight = (level: number) => {
    return Math.max(5, ((level - minLevel) / levelRange) * 100)
  }

  const getBarColor = (data: TideData['graphData'][number]) => {
    const currentHour = new Date().getHours()
    const dataHour = Number.parseInt(data.time.split(':')[0], 10)
    
    if (dataHour === currentHour) {
      return data.prediction 
        ? 'bg-gradient-to-t from-yellow-400 to-yellow-500 border-2 border-yellow-600 shadow-lg' 
        : 'bg-gradient-to-t from-blue-500 to-blue-600 border-2 border-yellow-400 shadow-lg'
    }
    
    return data.prediction 
      ? 'bg-gradient-to-t from-blue-300/70 to-blue-400/70 border border-blue-500' 
      : 'bg-gradient-to-t from-blue-500 to-blue-700'
  }

  return (
    <div className="space-y-6">
      {/* Main Graph Card */}
      <Card className="w-full shadow-lg border-0 bg-white/80 backdrop-blur-sm dark:bg-gray-900/80">
        <CardHeader className="pb-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-2 sm:space-y-0">
            <div className="flex items-center space-x-3">
              <div className="p-2 rounded-full bg-gradient-to-r from-blue-500 to-indigo-600">
                <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <div>
                <CardTitle className="text-xl">ระดับน้ำทะเล 24 ชั่วโมง</CardTitle>
                <p className="text-sm text-muted-foreground">กราฟแสดงระดับน้ำตลอดทั้งวัน</p>
              </div>
            </div>
            <ApiStatusBadge status={tideData.apiStatus} message={tideData.apiStatusMessage} />
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Current Status */}
          <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950 dark:to-indigo-950 rounded-lg border border-blue-200 dark:border-blue-800">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                  {tideControlManager.adjustHeightForDatum(tideData.currentWaterLevel).toFixed(2)} ม.
                </div>
                <div className="text-sm text-muted-foreground">ระดับน้ำปัจจุบัน</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-semibold text-gray-700 dark:text-gray-300">
                  {tideData.waterLevelStatus}
                </div>
                <div className="text-sm text-muted-foreground">สถานะ</div>
              </div>
              <div className="text-center">
                <div className="text-sm font-medium">
                  อัปเดต: {new Date(tideData.lastUpdated).toLocaleTimeString('th-TH')}
                </div>
                <div className="text-xs text-muted-foreground">เวลาล่าสุด</div>
              </div>
            </div>
          </div>

          {/* Enhanced Water Level Graph */}
          <div className="relative">
            <div className="h-64 bg-gradient-to-b from-sky-100 via-blue-100 to-blue-200 dark:from-blue-950 dark:via-blue-900 dark:to-blue-800 rounded-lg p-4 border border-blue-200 dark:border-blue-700">
              {/* Grid lines */}
              <div className="absolute inset-4 grid grid-rows-4 opacity-30">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="border-t border-blue-300 dark:border-blue-600"></div>
                ))}
              </div>
              
              {/* Water level bars */}
              <div className="relative h-full flex items-end justify-between">
                {tideData.graphData.map((data, index) => {
                  const height = getBarHeight(data.level)
                  // determine hour from the time string (e.g. "14:00")
                  const dataHour = parseInt(data.time.split(':')[0], 10)
                  const currentHour = new Date().getHours()
                  const isCurrentHour = dataHour === currentHour
                  
                  return (
                    <div key={index} className="min-w-[48px] flex flex-col items-center relative group">
                      {/* Tooltip */}
                      <div className="absolute bottom-full mb-2 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                        <div className="bg-gray-900 text-white text-xs rounded py-1 px-2 whitespace-nowrap">
                          {data.time}: {data.level.toFixed(2)}ม.
                          {data.prediction && " (ทำนาย)"}
                          {isCurrentHour && " (ปัจจุบัน)"}
                        </div>
                      </div>
                      
                      {/* Water bar */}
                      <div 
                        className={cn(
                          "w-full mx-0.5 rounded-t-sm transition-all duration-300 hover:scale-110",
                          getBarColor(data)
                        )}
                        style={{ height: `${height}%` }}
                      />
                      
                      {/* Time labels */}
                      {index % 3 === 0 && (
                        <span className="text-xs mt-2 text-gray-600 dark:text-gray-400 font-medium">
                          {data.time}
                        </span>
                      )}
                      
                      {/* Current time marker */}
                      {isCurrentHour && (
                        <div className="absolute -top-2 w-full flex justify-center">
                          <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse"></div>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Y-axis labels */}
            <div className="absolute left-0 top-4 bottom-8 flex flex-col justify-between text-xs text-gray-500 dark:text-gray-400 -ml-8">
              {[maxLevel, (maxLevel + minLevel) / 2, minLevel].map((level, i) => (
                <span key={i} className="text-right">{level.toFixed(1)}ม.</span>
              ))}
            </div>
          </div>

          {/* Enhanced Legend */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 bg-gradient-to-t from-blue-500 to-blue-700 rounded"></div>
              <span>ข้อมูลจริง</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 bg-gradient-to-t from-blue-300/70 to-blue-400/70 border border-blue-500 rounded"></div>
              <span>ข้อมูลทำนาย</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 bg-gradient-to-t from-yellow-400 to-yellow-500 border-2 border-yellow-600 rounded"></div>
              <span>เวลาปัจจุบัน</span>
            </div>
            <div className="flex items-center space-x-2 text-xs text-muted-foreground">
              <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
              <span>สด • อัปเดตแล้ว</span>
            </div>
          </div>

          {/* Tide Times Grid */}
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 bg-gradient-to-br from-red-50 to-pink-50 dark:from-red-950 dark:to-pink-950 rounded-lg border border-red-200 dark:border-red-800">
              <div className="flex items-center space-x-2 mb-2">
                <ArrowUp className="h-4 w-4 text-red-600" />
                <span className="text-sm font-medium text-red-700 dark:text-red-300">น้ำขึ้นสูงสุด</span>
              </div>
              <div className="text-2xl font-bold text-red-600 dark:text-red-400">{tideData.highTideTime}</div>
              <div className="text-xs text-red-600/70 dark:text-red-400/70">High Tide</div>
            </div>
            <div className="p-4 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950 dark:to-emerald-950 rounded-lg border border-green-200 dark:border-green-800">
              <div className="flex items-center space-x-2 mb-2">
                <ArrowDown className="h-4 w-4 text-green-600" />
                <span className="text-sm font-medium text-green-700 dark:text-green-300">น้ำลงต่ำสุด</span>
              </div>
              <div className="text-2xl font-bold text-green-600 dark:text-green-400">{tideData.lowTideTime}</div>
              <div className="text-xs text-green-600/70 dark:text-green-400/70">Low Tide</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default WaterLevelGraph