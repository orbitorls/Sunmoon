"use client"

import { Map as PigeonMap, Marker } from "pigeon-maps"

interface MapSelectorInnerProps {
  center: [number, number]
  onMapClick: (latLng: [number, number]) => void
}

/**
 * Pigeon-maps is heavy, so it lives in its own module and is loaded with
 * next/dynamic (ssr: false) from map-selector.tsx. This keeps pigeon-maps out
 * of the main bundle until the location dialog actually needs a map.
 */
export default function MapSelectorInner({ center, onMapClick }: MapSelectorInnerProps) {
  return (
    <PigeonMap
      center={center}
      zoom={9}
      onClick={({ latLng }) => onMapClick(latLng)}
      attributionPrefix={false}
      dprs={[1, 2] as [number, number]}
      boxClassname="w-full h-full"
    >
      <Marker anchor={center} />
    </PigeonMap>
  )
}