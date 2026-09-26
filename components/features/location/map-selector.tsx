"use client"

import { useState, useCallback, useMemo, useEffect } from "react"
import dynamic from "next/dynamic"
import { Loader2, Search, Crosshair } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import type { LocationData } from "@/lib/domain/types"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"

// pigeon-maps is heavy — load the map only when the dialog is opened.
const MapSelectorInner = dynamic(() => import("@/components/features/location/map-selector.client"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center bg-muted text-sm text-muted-foreground">
      กำลังโหลดแผนที่...
    </div>
  ),
})

type MapSelectorProps = {
  isOpen: boolean
  currentLocation: LocationData
  onSelectLocationAction: (location: LocationData) => void
  onCloseAction: () => void
}

export default function MapSelector({ isOpen, currentLocation, onSelectLocationAction, onCloseAction }: MapSelectorProps) {
  const [markerPosition, setMarkerPosition] = useState<LocationData>(currentLocation)
  const [query, setQuery] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setMarkerPosition(currentLocation)
  }, [currentLocation, isOpen])

  const center = useMemo(() => {
    return markerPosition ? [markerPosition.lat, markerPosition.lon] as [number, number] : [13.7563, 100.5018] as [number, number];
  }, [markerPosition])

  const handleMapClick = useCallback((latLng: [number, number]) => {
    const [lat, lon] = latLng
    setMarkerPosition({ lat, lon, name: "ตำแหน่งที่เลือก" })
    setError(null)
  }, [])

  const handleSearch = useCallback(async () => {
    if (!query) return
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1&countrycodes=th`)
      const data = await res.json()
      if (data?.length) {
        const p = data[0]
        setMarkerPosition({ lat: Number(p.lat), lon: Number(p.lon), name: p.display_name })
      } else {
        setError("ไม่พบสถานที่")
      }
    } catch (error) {
      console.error("Map search failed", error)
      setError("เกิดข้อผิดพลาด")
    } finally {
      setLoading(false)
    }
  }, [query])

  const useMyLocation = useCallback(() => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setError("อุปกรณ์ไม่รองรับตำแหน่ง")
      return
    }
    setLoading(true)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const loc = { lat: pos.coords.latitude, lon: pos.coords.longitude, name: "ตำแหน่งปัจจุบัน" }
        setMarkerPosition(loc)
        setLoading(false)
      },
      () => {
        setError("ไม่สามารถเข้าถึงตำแหน่งได้")
        setLoading(false)
      },
      { enableHighAccuracy: true, timeout: 10000 }
    )
  }, [])

  return (
    <Dialog open={isOpen} onOpenChange={onCloseAction}>
      <DialogContent className="max-w-4xl p-0">
        <div className="flex flex-col sm:flex-row">
          <div className="sm:w-2/3 p-3">
            <DialogHeader>
              <DialogTitle>เลือกตำแหน่งจากแผนที่</DialogTitle>
              <DialogDescription className="text-sm text-muted-foreground">คลิกที่แผนที่เพื่อตั้งหมุด หรือค้นหาชื่อสถานที่</DialogDescription>
            </DialogHeader>

            <div className="mt-2 h-72 rounded-md overflow-hidden border">
              <MapSelectorInner center={center} onMapClick={handleMapClick} />
            </div>

            <div className="mt-2 flex items-center justify-between">
              <div className="text-sm">
                <div className="font-medium">{markerPosition?.name || "ไม่ระบุตำแหน่ง"}</div>
                <div className="text-xs text-muted-foreground">
                  {markerPosition?.lat ? markerPosition.lat.toFixed(4) : "0.0000"}, {markerPosition?.lon ? markerPosition.lon.toFixed(4) : "0.0000"}
                </div>
              </div>
              <div className="flex gap-2">
                <Button variant="ghost" onClick={onCloseAction}>ยกเลิก</Button>
                <Button onClick={() => { onSelectLocationAction(markerPosition); onCloseAction() }}>ยืนยันตำแหน่ง</Button>
              </div>
            </div>
          </div>

          <aside className="sm:w-1/3 p-3 bg-gray-50">
            <Input placeholder="ค้นหาสถานที่" aria-label="ค้นหาสถานที่" value={query} onChange={(e) => setQuery(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSearch()} />
            <div className="mt-2 flex gap-2">
              <Button onClick={handleSearch} className="flex-1" aria-label="ค้นหา">{loading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Search className="h-4 w-4" aria-hidden="true" />}</Button>
              <Button variant="outline" onClick={() => { setMarkerPosition(currentLocation); setQuery('') }}>Reset</Button>
            </div>
            <div className="mt-3">
              <Button variant="secondary" className="w-full justify-center" onClick={useMyLocation}>
                <Crosshair className="mr-2 h-4 w-4" aria-hidden="true" /> ใช้ตำแหน่งปัจจุบัน
              </Button>
            </div>
            {error && <div role="alert" className="text-sm text-red-500 mt-2">{error}</div>}
          </aside>
        </div>
      </DialogContent>
    </Dialog>
  )
}

