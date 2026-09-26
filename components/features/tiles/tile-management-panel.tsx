"use client"

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from '@/components/ui/alert-dialog'
import { toast } from 'sonner'
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
import { tileStorage, TileData } from '@/lib/storage/tile-storage'
import { formatBytes } from '@/lib/storage/core'
import {
  createTilePackage,
  generateSampleTiles,
  getGulfOfThailandConstituents,
  getAndamanSeaConstituents
} from '@/lib/storage/tile-packaging'

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
      toast.error(`เกิดข้อผิดพลาดในการดาวน์โหลด: ${error}`)
    } finally {
      setDownloadingTile(null)
    }
  }

  const deleteTile = async (tileId: string) => {
    try {
      await tileStorage.deleteTile(tileId)
      toast.success('ลบไทล์เรียบร้อยแล้ว')
      await loadTiles()
      await loadStorageInfo()
    } catch (error) {
      console.error('Failed to delete tile:', error)
      toast.error('ไม่สามารถลบไทล์ได้')
    }
  }

  const clearAllTiles = async () => {
    setIsLoading(true)
    try {
      await tileStorage.clearAllTiles()
      toast.success('ลบไทล์ทั้งหมดเรียบร้อยแล้ว')
      await loadTiles()
      await loadStorageInfo()
    } catch (error) {
      console.error('Failed to clear tiles:', error)
      toast.error('ไม่สามารถลบไทล์ทั้งหมดได้')
    } finally {
      setIsLoading(false)
    }
  }

  const availableTiles = generateSampleTiles()
  const downloadedTileIds = new Set(tiles.map(t => t.tileId))
  const usagePercent = storageInfo.quota > 0 ? (storageInfo.usage / storageInfo.quota) * 100 : 0

  return (
    <div className="space-y-4">
      {/* Storage Overview */}
      <Card className="card-l1">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 font-display">
              <HardDrive className="h-5 w-5 text-brand-600" />
              พื้นที่จัดเก็บข้อมูลไหลในเครื่อง
            </CardTitle>
            <span className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[11px] font-semibold text-slate-500">โควตา IndexedDB ปลอดภัย MAX 6.0 GB</span>
          </div>
          <CardDescription>
            สำหรับดาวน์โหลดแผนที่และคลื่นโดยไม่ใช้พลังมอเตอร์เซลล์รายวัน
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-baseline justify-between gap-2">
              <span className="text-sm text-slate-500">
                <span className="telemetry-num text-2xl font-extrabold text-slate-900">{formatBytes(storageInfo.usage)}</span>
                {" "}ใช้ไปในเต้าใช้ {formatBytes(storageInfo.quota || 6 * 1024 ** 3)}
              </span>
              <span className="telemetry-num text-sm font-bold text-brand-600">{usagePercent.toFixed(1)}%</span>
            </div>
            <Progress value={usagePercent} className="h-2 [&>div]:bg-brand-600" />
            <div className="flex justify-between text-[11px] text-slate-500">
              <span>ความถี่ทับซ้อนต่ำ 1 ในตระแกง</span>
              <span className="tabular-nums">พื้นที่คงเหลือ {formatBytes(storageInfo.available)}</span>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-1">
            <div className="rounded-lg border border-slate-200 bg-white p-3">
              <div className="telemetry-num text-2xl font-extrabold text-brand-600">{tiles.length}</div>
              <div className="micro-label mt-1 text-slate-500">ไทล์ที่ดาวน์โหลด</div>
            </div>
            <div className="rounded-lg border border-slate-200 bg-white p-3">
              <div className="telemetry-num text-2xl font-extrabold text-slate-900">
                {formatBytes(tiles.reduce((sum, t) => sum + t.compressedSize, 0))}
              </div>
              <div className="micro-label mt-1 text-slate-500">ขนาดรวม</div>
            </div>
            <div className="rounded-lg border border-slate-200 bg-white p-3">
              <div className="telemetry-num text-2xl font-extrabold text-slate-900">
                {formatBytes(storageInfo.available)}
              </div>
              <div className="micro-label mt-1 text-slate-500">พื้นที่ว่าง</div>
            </div>
            <div className="rounded-lg border border-slate-200 bg-white p-3">
              <div className="telemetry-num text-2xl font-extrabold text-slate-900">
                {availableTiles.length - tiles.length}
              </div>
              <div className="micro-label mt-1 text-slate-500">พร้อมดาวน์โหลด</div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 text-[11px]">
            <div className="rounded-lg bg-slate-50 px-2 py-1.5 text-center text-slate-500">อัลกอริทึมบีบอัด<br /><strong className="text-slate-700">deflate / gzip</strong></div>
            <div className="rounded-lg bg-slate-50 px-2 py-1.5 text-center text-slate-500">อัตราการบีบอัด<br /><strong className="tabular-nums text-slate-700">วัดจริงทุกครั้งที่ดาวน์โหลด</strong></div>
            <div className="rounded-lg bg-slate-50 px-2 py-1.5 text-center text-slate-500">ล้างหมดอายุแคช<br /><strong className="text-slate-700">30 วัน (Auto-EV)</strong></div>
          </div>

          <div className="flex gap-2 pt-1">
            <Button
              variant="outline"
              size="sm"
              onClick={() => { loadTiles(); loadStorageInfo(); }}
              className="flex-1 rounded-[4px]"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              รีเฟรช
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="destructive"
                  size="sm"
                  disabled={tiles.length === 0 || isLoading}
                  className="flex-1 rounded-[4px]"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  ลบทั้งหมด
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>ลบไทล์ทั้งหมด?</AlertDialogTitle>
                  <AlertDialogDescription>
                    ข้อมูลไทล์ทั้งหมด {tiles.length} รายการจะถูกลบออกจากเครื่อง และต้องดาวน์โหลดใหม่เมื่อต้องการใช้งานออฟไลน์
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>ยกเลิก</AlertDialogCancel>
                  <AlertDialogAction onClick={clearAllTiles}>ลบทั้งหมด</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </CardContent>
      </Card>

      {/* Available Tiles */}
      <Card className="card-l1">
        <CardHeader>
          <CardTitle className="flex items-center justify-between font-display">
            <span className="flex items-center gap-2">
              <MapPin className="h-5 w-5 text-brand-600" />
              ไทล์ข้อมูลระดับน้ำชายฝั่ง (Regional Hydro Tiles)
            </span>
            <span className="font-mono text-[11px] font-semibold text-slate-500">{availableTiles.length} ภูมิภาคโทรโมรขน</span>
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
                  className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white p-4"
                >
                  <div className="flex min-w-0 flex-1 items-start gap-3">
                    <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full border ${isDownloaded ? "border-emerald-200 bg-emerald-50 text-emerald-600" : "border-slate-200 bg-slate-50 text-slate-400"}`} aria-hidden="true">
                      {isDownloaded ? <CheckCircle className="h-5 w-5" /> : <Download className="h-5 w-5" />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-bold text-slate-900">{tileInfo.location}</h3>
                        {isDownloaded ? (
                          <Badge className="rounded-md border border-emerald-200 bg-emerald-50 text-xs font-bold text-emerald-700">
                            ดาวน์โหลดแล้ว · {tile ? formatBytes(tile.compressedSize) : ""}
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="rounded-md text-xs text-slate-500">
                            ยังไม่ได้บันทึก · ~180 MB
                          </Badge>
                        )}
                      </div>
                      <p className="mt-0.5 font-mono text-xs tabular-nums text-slate-500">
                        {tileInfo.centroid[1].toFixed(2)}°N, {tileInfo.centroid[0].toFixed(2)}°E · Harmonic 37+ พร้อมใช้ · FES2022
                      </p>
                    {tile && (
                      <div className="flex items-center gap-4 mt-1.5 text-xs text-gray-500">
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
                  </div>

                  <div className="flex shrink-0 gap-2">
                    {isDownloaded ? (
                      <>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => downloadTile(tileInfo)}
                          className="rounded-[4px]"
                        >
                          <RefreshCw className="h-4 w-4 mr-1" />
                          อัปเดต
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="outline"
                              size="sm"
                              className="rounded-[4px] text-red-600 hover:text-red-700"
                              aria-label={`ลบไทล์ ${tileInfo.location}`}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>ลบไทล์ {tileInfo.location}?</AlertDialogTitle>
                              <AlertDialogDescription>
                                ไทล์นี้จะถูกลบออกจากเครื่อง และต้องดาวน์โหลดใหม่เมื่อต้องการใช้งานออฟไลน์
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>ยกเลิก</AlertDialogCancel>
                              <AlertDialogAction onClick={() => deleteTile(tileInfo.tileId)}>
                                ลบไทล์
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </>
                    ) : (
                      <Button
                        size="sm"
                        onClick={() => downloadTile(tileInfo)}
                        disabled={isDownloading}
                        className="rounded-[4px] bg-brand-600 hover:bg-brand-700"
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
      <Alert className="rounded-xl border border-slate-200 bg-white">
        <AlertCircle className="h-4 w-4 text-brand-600" />
        <AlertDescription className="text-sm text-slate-600">
          <strong>หมายเหตุ:</strong> ไทล์ข้อมูลจะถูกเก็บไว้ในเครื่องของคุณเพื่อการใช้งานแบบออฟไลน์
          ข้อมูลจะอัปเดตอัตโนมัติทุก 30 วันหรือเมื่อมีเวอร์ชันใหม่
        </AlertDescription>
      </Alert>
    </div>
  )
}
