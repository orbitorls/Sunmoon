"use client";

import { Loader2, MapPin, Navigation, RefreshCw, Map } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { LocationData } from "@/lib/domain/types";

type LocationPanelProps = {
  selectedLocation: LocationData;
  onOpenMap: () => void;
  onLocate: () => void;
  gettingLocation: boolean;
  onRefresh: () => void;
  loading: boolean;
};

/**
 * The "ตำแหน่ง" card: shows the chosen location and the map / GPS / refresh
 * controls that drive it.
 */
export function LocationPanel({
  selectedLocation,
  onOpenMap,
  onLocate,
  gettingLocation,
  onRefresh,
  loading,
}: LocationPanelProps) {
  return (
    <div className="lg:col-span-1">
      <div className="bg-white/85 backdrop-blur-sm dark:bg-slate-800/80 rounded-2xl border border-blue-100 dark:border-slate-700 p-4 sm:p-6 shadow-sm transition-shadow duration-200 hover:shadow-md motion-reduce:transition-none">
        <div className="flex items-center gap-2 mb-4">
          <MapPin className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">ตำแหน่ง</h3>
        </div>
        <div className="mb-4 p-3 bg-blue-50 dark:bg-slate-900/50 rounded-xl border border-blue-100 dark:border-slate-700">
          <p className="text-xs text-slate-600 dark:text-slate-400 font-medium mb-1">ตำแหน่งที่เลือก</p>
          <p className="text-sm font-semibold tabular-nums text-slate-900 dark:text-slate-100 truncate">
            {selectedLocation.name || `${selectedLocation.lat.toFixed(4)}°, ${selectedLocation.lon.toFixed(4)}°`}
          </p>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Button
            variant="outline"
            onClick={onOpenMap}
            className="h-12 cursor-pointer border-blue-200 dark:border-slate-600 hover:bg-blue-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-medium transition-colors duration-200 focus-enhanced"
          >
            <Map className="w-4 h-4 mr-2 text-blue-500" />
            แผนที่
          </Button>
          <Button
            variant="outline"
            onClick={onLocate}
            disabled={gettingLocation}
            className="h-12 cursor-pointer border-blue-200 dark:border-slate-600 hover:bg-blue-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-medium transition-colors duration-200 focus-enhanced"
          >
            {gettingLocation ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin motion-reduce:animate-none" />
            ) : (
              <Navigation className="w-4 h-4 mr-2 text-blue-500" />
            )}
            ปัจจุบัน
          </Button>
        </div>
        <Button
          onClick={onRefresh}
          disabled={loading}
          className="w-full h-12 mt-4 cursor-pointer bg-gradient-to-r from-blue-600 to-sky-500 hover:from-blue-700 hover:to-sky-600 text-white rounded-xl font-semibold shadow-lg shadow-blue-200/50 transition-colors duration-200 focus-enhanced dark:shadow-blue-900/20"
        >
          {loading ? (
            <Loader2 className="h-5 w-5 animate-spin mr-2 motion-reduce:animate-none" />
          ) : (
            <RefreshCw className="h-5 w-5 mr-2" />
          )}
          {loading ? "กำลังโหลด..." : "อัปเดตข้อมูล"}
        </Button>
      </div>
    </div>
  );
}

export default LocationPanel;
