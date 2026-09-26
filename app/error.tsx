"use client";

import { useEffect } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Route error:", error);
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#F8FAFC] p-4">
      <div
        role="alert"
        className="card-l1 w-full max-w-md p-6 text-center"
      >
        <div
          className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-red-100"
          aria-hidden="true"
        >
          <AlertTriangle className="h-7 w-7 text-red-600" />
        </div>
        <h1 className="font-display text-xl font-bold text-slate-900">เกิดข้อผิดพลาด</h1>
        <p className="mt-2 text-sm text-slate-600">
          ไม่สามารถแสดงหน้านี้ได้ กรุณาลองใหม่อีกครั้ง หากยังพบปัญหาโปรดรีเฟรชหน้าเว็บ
        </p>
        <Button onClick={reset} className="mt-5 w-full rounded-[4px]">
          <RefreshCw className="mr-2 h-4 w-4" />
          ลองใหม่
        </Button>
      </div>
    </div>
  );
}
