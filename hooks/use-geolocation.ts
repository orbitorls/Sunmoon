"use client";

import { useState, useCallback } from "react";
import type { LocationData } from "@/lib/tide-service";

const BANGKOK_DEFAULT: LocationData = {
  lat: 13.7563,
  lon: 100.5018,
  name: "กรุงเทพมหานคร (ค่าพื้นฐาน)",
};

export type GeolocationResult = {
  getLocation: () => Promise<void>;
  gettingLocation: boolean;
  geoError: string | null;
};

export function useGeolocation(
  isHydrated: boolean,
  onLocationSet: (location: LocationData) => void,
  onLocationSettled?: () => void,
): GeolocationResult {
  const [gettingLocation, setGettingLocation] = useState(false);
  const [geoError, setGeoError] = useState<string | null>(null);

  const getLocation = useCallback(async () => {
    if (typeof window === "undefined") return;

    setGettingLocation(true);
    setGeoError(null);

    try {
      // Try browser geolocation first with short timeout
      try {
        const position = await new Promise<GeolocationPosition>(
          (resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, {
              enableHighAccuracy: false,
              timeout: 5000,
              maximumAge: 120000,
            });
          },
        );

        const newLocation: LocationData = {
          lat: position.coords.latitude,
          lon: position.coords.longitude,
          name: "ตำแหน่งปัจจุบัน (GPS)",
        };

        onLocationSet(newLocation);
        onLocationSettled?.();
        setGettingLocation(false);
        return;
      } catch {
        console.log("Browser geolocation failed, trying IP geolocation...");
      }

      // Fallback to IP geolocation API
      try {
        const response = await fetch("https://ipapi.co/json/");
        if (!response.ok) throw new Error("IP API failed");

        const data = await response.json();

        if (data.latitude && data.longitude) {
          const newLocation: LocationData = {
            lat: data.latitude,
            lon: data.longitude,
            name: `ตำแหน่งโดยประมาณ (${data.city || data.region || "IP"})`,
          };

          onLocationSet(newLocation);
          onLocationSettled?.();
          setGettingLocation(false);
          return;
        }
      } catch {
        console.log("IP geolocation failed, using Bangkok default...");
      }

      // Final fallback: Bangkok
      onLocationSet(BANGKOK_DEFAULT);
      onLocationSettled?.();
    } catch (error) {
      console.error("All geolocation methods failed:", error);
      setGeoError("ไม่สามารถหาตำแหน่งได้ กรุณาใช้แผนที่หรือใส่พิกัดเอง");
    } finally {
      setGettingLocation(false);
    }
  }, [isHydrated, onLocationSet, onLocationSettled]);

  return { getLocation, gettingLocation, geoError };
}
