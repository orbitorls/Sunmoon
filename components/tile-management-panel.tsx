"use client"

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Download,
  Trash2,
  Database,
  HardDrive,
  MapPin,
  CheckCircle,
  Clock,
  AlertCircle,
  RefreshCw
} from 'lucide-react'
import { tileStorage, TileData } from '@/lib/tile-storage'
import { formatBytes } from '@/lib/storage/core'
import {
  createTilePackage,
  generateSampleTiles,
  getGulfOfThailandConstituents,
  getAndamanSeaConstituents
} from '@/lib/tile-packaging'

export function TileManagementPanel() {
  const [tiles, setTiles] = useState<TileData[]>([])
  const [storageInfo, setStorageInfo] = useState({ quota: 0, usage: 0, available: 0 })
  const [isLoading, setIsLoading] = useState(false)
  const [downloadingTile, setDownloadingTile] = useState<string | null>(null)

  const loadTiles = async () => {
    try {
      const allTiles = await tileStorage.getAllTiles()
      setTiles(allTiles)
    } catch (error) {
      console.error('Failed to load tiles:', error)
    }
  }

  const loadStorageInfo = async () => {
    try {
      const info = await tileStorage.getStorageEstimate()
      setStorageInfo(info)
    } catch (error) {
      console.error('Failed to load storage info:', error)
    }
  }

  useEffect(() => {
    loadTiles()
    loadStorageInfo()
  }, [])

  const downloadTile = async (tileInfo: {
    tileId: string
    bbox: [number, number, number, number]
    centroid: [number, number]
    location: string
  }) => {
    setDownloadingTile(tileInfo.tileId)
    try {
      // Determine which constituents to use based on location
      const constituents = tileInfo.location.includes('อันดามัน')
        ? getAndamanSeaConstituents()
        : getGulfOfThailandConstituents()

      // Create tile package
      const pkg = await createTilePackage(tileInfo.tileId, tileInfo.bbox, tileInfo.centroid, constituents, {
        model: 'FES2022',
        datum: 'MSL',
        version: '1.0.0',
      })

      // Save to IndexedDB
      await tileStorage.savePackage(pkg)

      // Reload
      await loadTiles()
      await loadStorageInfo()

      console.log(`Downloaded tile: ${tileInfo.tileId}`)
    } catch (error) {
      console.error('Failed to download tile:', error)
      alert(`เกิดข้อผิดพลาดในการดาวน์โหลด: ${error}`)
    } finally {
      setDownloadingTile(null)
    }
  }

  const deleteTile = async (tileId: string) => {
    if (!confirm('คุณต้องการลบไทล์นี้หรือไม่?')) return

    try {
      await tileStorage.deleteTile(tileId)
      await loadTiles()
      await loadStorageInfo()
    } catch (error) {
      console.error('Failed to delete tile:', error)
    }
  }

  const clearAllTiles = async () => {
    if (!confirm('คุณต้องการลบไทล์ทั้งหมดหรือไม่?')) return

    setIsLoading(true)
    try {
      await tileStorage.clearAllTiles()
      await loadTiles()
      await loadStorageInfo()
    } catch (error) {
      console.error('Failed to clear tiles:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const availableTiles = generateSampleTiles()
  const downloadedTileIds = new Set(tiles.map(t => t.tileId))
  const usagePercent = storageInfo.quota > 0 ? (storageInfo.usage / storageInfo.quota) * 100 : 0

  return (
    <div className="space-y-6">
      {/* Storage Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <HardDrive className="h-5 w-5" />
            พื้นที่จัดเก็บข้อมูล
          </CardTitle>
          <CardDescription>
            จัดการไทล์ข้อมูลสำหรับการใช้งานแบบออฟไลน์
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">
                ใช้ไป {formatBytes(storageInfo.usage)} จาก {formatBytes(storageInfo.quota)}
              </span>
              <span className="font-medium">{usagePercent.toFixed(1)}%</span>
            </div>
            <Progress value={usagePercent} className="h-2" />
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-2">
            <div className="space-y-1">
              <div className="text-2xl font-bold text-blue-600">{tiles.length}</div>
              <div className="text-xs text-gray-600">ไทล์ที่ดาวน์โหลด</div>
            </div>
            <div className="space-y-1">
              <div className="text-2xl font-bold text-green-600">
                {formatBytes(tiles.reduce((sum, t) => sum + t.compressedSize, 0))}
              </div>
              <div className="text-xs text-gray-600">ขนาดรวม</div>
            </div>
            <div className="space-y-1">
              <div className="text-2xl font-bold text-purple-600">
                {formatBytes(storageInfo.available)}
              </div>
              <div className="text-xs text-gray-600">พื้นที่ว่าง</div>
            </div>
            <div className="space-y-1">
              <div className="text-2xl font-bold text-orange-600">
                {availableTiles.length - tiles.length}
              </div>
              <div className="text-xs text-gray-600">พร้อมดาวน์โหลด</div>
            </div>
          </div>

          <div className="flex gap-2 pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => { loadTiles(); loadStorageInfo(); }}
              className="flex-1"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              รีเฟรช
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={clearAllTiles}
              disabled={tiles.length === 0 || isLoading}
              className="flex-1"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              ลบทั้งหมด
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Available Tiles */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            ไทล์ที่พร้อมใช้งาน
          </CardTitle>
          <CardDescription>
            เลือกพื้นที่เพื่อดาวน์โหลดข้อมูลสำหรับใช้งานออฟไลน์
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3">
            {availableTiles.map((tileInfo) => {
              const isDownloaded = downloadedTileIds.has(tileInfo.tileId)
              const isDownloading = downloadingTile === tileInfo.tileId
              const tile = tiles.find(t => t.tileId === tileInfo.tileId)

              return (
                <div
                  key={tileInfo.tileId}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-medium">{tileInfo.location}</h3>
                      {isDownloaded && (
                        <Badge variant="outline" className="text-green-600 border-green-300">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          ดาวน์โหลดแล้ว
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-gray-600">
                      พิกัด: {tileInfo.centroid[1].toFixed(2)}°N, {tileInfo.centroid[0].toFixed(2)}°E
                    </p>
                    {tile && (
                      <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                        <span className="flex items-center gap-1">
                          <Database className="h-3 w-3" />
                          {formatBytes(tile.compressedSize)}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {new Date(tile.downloadedAt).toLocaleDateString('th-TH')}
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="flex gap-2">
                    {isDownloaded ? (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => deleteTile(tileInfo.tileId)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        onClick={() => downloadTile(tileInfo)}
                        disabled={isDownloading}
                      >
                        {isDownloading ? (
                          <>
                            <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                            กำลังดาวน์โหลด...
                          </>
                        ) : (
                          <>
                            <Download className="h-4 w-4 mr-2" />
                            ดาวน์โหลด
                          </>
                        )}
                      </Button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Info Alert */}
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          <strong>หมายเหตุ:</strong> ไทล์ข้อมูลจะถูกเก็บไว้ในเครื่องของคุณเพื่อการใช้งานแบบออฟไลน์ 
          ข้อมูลจะอัปเดตอัตโนมัติทุก 30 วันหรือเมื่อมีเวอร์ชันใหม่
        </AlertDescription>
      </Alert>
    </div>
  )
}
