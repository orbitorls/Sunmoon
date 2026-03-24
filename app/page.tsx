import EnhancedLocationSelector from "../components/enhanced-location-selector";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default function Home() {
  return (
    <main
      id="main-content"
      className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(125,211,252,0.28),_transparent_32%),radial-gradient(circle_at_bottom_right,_rgba(251,191,36,0.14),_transparent_22%)] bg-[#f5fbff] dark:bg-slate-950"
      aria-label="SunMoon Thai Tide"
    >
      <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
        <div className="absolute left-[-8rem] top-[-5rem] h-72 w-72 rounded-full bg-sky-200/40 blur-3xl" />
        <div className="absolute bottom-[-5rem] right-[-6rem] h-72 w-72 rounded-full bg-amber-100/70 blur-3xl" />
      </div>

      <header className="px-4 pb-3 pt-5 md:pb-4 md:pt-6">
        <div className="mx-auto max-w-6xl">
          <div className="rounded-[1.75rem] border border-white/70 bg-white/80 p-4 shadow-xl shadow-sky-100/60 backdrop-blur md:p-5 dark:border-slate-800 dark:bg-slate-900/80 dark:shadow-none">
            <div className="flex items-center gap-3">
              <div className="rounded-2xl bg-sky-100 p-2.5 dark:bg-sky-900/40">
                <svg className="h-7 w-7 text-blue-600 dark:text-blue-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M2 6c.6.5 1.2 1 2.5 1C7 7 7 5 9.5 5c2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1" />
                  <path d="M2 12c.6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1" />
                  <path d="M2 18c.6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1" />
                </svg>
              </div>
              <div>
                <h1 className="text-2xl font-black tracking-tight text-slate-900 md:text-3xl dark:text-white">
                  SEAPALO
                </h1>
              </div>
            </div>
          </div>
        </div>
      </header>

      <section className="relative px-4 pb-10 md:pb-16">
        <div className="mx-auto max-w-6xl">
          <div className="overflow-hidden rounded-[2rem] border border-white/70 bg-white/85 shadow-xl shadow-sky-100/60 backdrop-blur dark:border-slate-800 dark:bg-slate-900/88 dark:shadow-none">
            <div className="relative">
              <EnhancedLocationSelector />
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
