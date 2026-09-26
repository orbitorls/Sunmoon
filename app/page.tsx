import { Suspense } from "react";
import { Loader2 } from "lucide-react";
import EnhancedLocationSelector from "@/components/features/location/enhanced-location-selector";

// Static shell: the screen-reader heading prerenders at build time. The
// interactive selector (client component) streams in via Suspense, and all
// forecast data stays in the `getLocationForecast` Server Action invoked from
// `useForecastData` — no page-level fetch, no force-dynamic.
// The full-bleed main is intentional: no max-width column, so the sticky
// header and its content span the whole viewport on every device.

function SelectorFallback() {
  return (
    <div className="flex items-center justify-center min-h-[400px]">
      <div className="flex items-center space-x-2">
        <Loader2 className="h-6 w-6 animate-spin motion-reduce:animate-none" />
        <span>กำลังโหลด...</span>
      </div>
    </div>
  );
}

export default async function Home() {
  return (
    <main
      id="main-content"
      className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(125,211,252,0.28),_transparent_32%),radial-gradient(circle_at_bottom_right,_rgba(251,191,36,0.14),_transparent_22%)] bg-[#f5fbff]"
      aria-label="SunMoon Thai Tide"
    >
      <header className="sr-only">
        <div className="w-full px-4 sm:px-6 lg:px-8">
          <h1 className="text-2xl font-black tracking-tight text-slate-900 md:text-3xl">
            SEAPALO
          </h1>
        </div>
      </header>

      <Suspense fallback={<SelectorFallback />}>
        <EnhancedLocationSelector />
      </Suspense>
    </main>
  );
}
