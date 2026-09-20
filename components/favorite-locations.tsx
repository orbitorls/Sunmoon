"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Star,
    MapPin,
    Trash2,
    Plus,
    Navigation,
    ChevronDown,
    ChevronUp,
    Search,
    Heart,
} from "lucide-react";
import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import type { LocationData } from "@/lib/domain/types";

interface FavoriteLocationsProps {
    currentLocation: LocationData;
    onSelectLocation: (location: LocationData) => void;
    className?: string;
}

// Popular Thai coastal locations
const POPULAR_LOCATIONS: LocationData[] = [
    { name: "กรุงเทพมหานคร", lat: 13.7563, lon: 100.5018 },
    { name: "พัทยา, ชลบุรี", lat: 12.93, lon: 100.88 },
    { name: "หัวหิน, ประจวบฯ", lat: 12.57, lon: 99.96 },
    { name: "ภูเก็ต", lat: 7.89, lon: 98.40 },
    { name: "เกาะสมุย, สุราษฎร์ฯ", lat: 9.51, lon: 100.06 },
    { name: "กระบี่", lat: 8.09, lon: 98.91 },
    { name: "เกาะช้าง, ตราด", lat: 12.05, lon: 102.36 },
    { name: "ระยอง", lat: 12.68, lon: 101.28 },
    { name: "ชะอำ, เพชรบุรี", lat: 12.80, lon: 99.97 },
    { name: "สมุทรปราการ", lat: 13.60, lon: 100.60 },
    { name: "สมุทรสาคร", lat: 13.55, lon: 100.28 },
    { name: "ชุมพร", lat: 10.49, lon: 99.18 },
];

interface SavedLocation extends LocationData {
    id: string;
    savedAt: string;
}

export default function FavoriteLocations({
    currentLocation,
    onSelectLocation,
    className,
}: FavoriteLocationsProps) {
    const [savedLocations, setSavedLocations] = useState<SavedLocation[]>([]);
    const [isOpen, setIsOpen] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [showPopular, setShowPopular] = useState(true);

    // Load saved locations from localStorage
    useEffect(() => {
        if (typeof window !== "undefined") {
            const saved = localStorage.getItem("favoriteLocations");
            if (saved) {
                try {
                    setSavedLocations(JSON.parse(saved));
                } catch {
                    console.error("Failed to parse saved locations");
                }
            }
        }
    }, []);

    // Save current location to favorites
    const saveCurrentLocation = useCallback(() => {
        const newLocation: SavedLocation = {
            ...currentLocation,
            id: `${Date.now()}`,
            savedAt: new Date().toISOString(),
        };

        const updated = [...savedLocations, newLocation];
        setSavedLocations(updated);
        localStorage.setItem("favoriteLocations", JSON.stringify(updated));
    }, [currentLocation, savedLocations]);

    // Remove a saved location
    const removeLocation = useCallback((id: string) => {
        const updated = savedLocations.filter((loc) => loc.id !== id);
        setSavedLocations(updated);
        localStorage.setItem("favoriteLocations", JSON.stringify(updated));
    }, [savedLocations]);

    // Check if current location is already saved
    const isCurrentSaved = savedLocations.some(
        (loc) =>
            Math.abs(loc.lat - currentLocation.lat) < 0.001 &&
            Math.abs(loc.lon - currentLocation.lon) < 0.001
    );

    // Filter popular locations by search
    const filteredPopular = POPULAR_LOCATIONS.filter((loc) =>
        loc.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <Card className={cn("", className)}>
            <Collapsible open={isOpen} onOpenChange={setIsOpen}>
                <CardHeader className="pb-3">
                    <CollapsibleTrigger asChild>
                        <button className="flex items-center justify-between w-full">
                            <CardTitle className="text-lg flex items-center gap-2">
                                <Star className="h-5 w-5 text-yellow-500" />
                                สถานที่บันทึก
                            </CardTitle>
                            <div className="flex items-center gap-2">
                                <Badge variant="secondary">{savedLocations.length} แห่ง</Badge>
                                {isOpen ? (
                                    <ChevronUp className="h-4 w-4" />
                                ) : (
                                    <ChevronDown className="h-4 w-4" />
                                )}
                            </div>
                        </button>
                    </CollapsibleTrigger>
                </CardHeader>

                <CollapsibleContent>
                    <CardContent className="space-y-4">
                        {/* Save current location button */}
                        <Button
                            onClick={saveCurrentLocation}
                            disabled={isCurrentSaved}
                            className="w-full gap-2"
                            variant={isCurrentSaved ? "secondary" : "default"}
                        >
                            {isCurrentSaved ? (
                                <>
                                    <Heart className="h-4 w-4 fill-current" />
                                    บันทึกตำแหน่งนี้แล้ว
                                </>
                            ) : (
                                <>
                                    <Plus className="h-4 w-4" />
                                    บันทึกตำแหน่งปัจจุบัน
                                </>
                            )}
                        </Button>

                        {/* Saved locations list */}
                        {savedLocations.length > 0 && (
                            <div className="space-y-2">
                                <h4 className="text-sm font-medium text-muted-foreground">
                                    ตำแหน่งที่บันทึกไว้
                                </h4>
                                <div className="space-y-2 max-h-[200px] overflow-y-auto">
                                    {savedLocations.map((location) => (
                                        <div
                                            key={location.id}
                                            className="flex items-center justify-between p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800"
                                        >
                                            <button
                                                onClick={() => onSelectLocation(location)}
                                                className="flex items-center gap-2 text-left flex-1"
                                            >
                                                <MapPin className="h-4 w-4 text-yellow-600" />
                                                <div>
                                                    <div className="font-medium text-sm">{location.name}</div>
                                                    <div className="text-xs text-muted-foreground">
                                                        {location.lat.toFixed(4)}, {location.lon.toFixed(4)}
                                                    </div>
                                                </div>
                                            </button>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-100"
                                                onClick={() => removeLocation(location.id)}
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Popular locations */}
                        <div className="space-y-2">
                            <button
                                onClick={() => setShowPopular(!showPopular)}
                                className="flex items-center justify-between w-full text-sm font-medium text-muted-foreground"
                            >
                                <span className="flex items-center gap-2">
                                    <Navigation className="h-4 w-4" />
                                    สถานที่ยอดนิยม
                                </span>
                                {showPopular ? (
                                    <ChevronUp className="h-4 w-4" />
                                ) : (
                                    <ChevronDown className="h-4 w-4" />
                                )}
                            </button>

                            {showPopular && (
                                <>
                                    {/* Search */}
                                    <div className="relative">
                                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                        <Input
                                            placeholder="ค้นหาสถานที่..."
                                            value={searchQuery}
                                            onChange={(e) => setSearchQuery(e.target.value)}
                                            className="pl-9"
                                        />
                                    </div>

                                    {/* Grid of popular locations */}
                                    <div className="grid grid-cols-2 gap-2 max-h-[200px] overflow-y-auto">
                                        {filteredPopular.map((location) => (
                                            <button
                                                key={location.name}
                                                onClick={() => onSelectLocation(location)}
                                                className={cn(
                                                    "p-2 text-left rounded-lg border transition-all text-sm",
                                                    "hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:border-blue-300",
                                                    Math.abs(location.lat - currentLocation.lat) < 0.01 &&
                                                        Math.abs(location.lon - currentLocation.lon) < 0.01
                                                        ? "bg-blue-100 dark:bg-blue-900/40 border-blue-400"
                                                        : "bg-white dark:bg-slate-800 border-gray-200 dark:border-gray-700"
                                                )}
                                            >
                                                <div className="font-medium truncate">{location.name}</div>
                                            </button>
                                        ))}
                                    </div>
                                </>
                            )}
                        </div>
                    </CardContent>
                </CollapsibleContent>
            </Collapsible>
        </Card>
    );
}
