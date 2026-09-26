import Link from "next/link";
import { TileManagementPanel } from '@/components/features/tiles/tile-management-panel'

export default function TilesPage() {
  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900">
      <div className="space-y-6 px-4 py-6 sm:px-6 lg:px-8">
        <div className="card-l1 flex flex-col justify-between gap-4 p-5 md:flex-row md:items-center">
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-brand-50 text-xl" aria-hidden="true">≋</div>
            <div>
              <h1 className="font-display text-2xl font-bold">
                การจัดการไทล์และสถานะระบบ{" "}
                <span className="ml-1 rounded bg-slate-100 px-1.5 py-0.5 align-middle font-mono text-[11px] font-semibold text-slate-500">
                  TELEMETRY v2.8
                </span>
              </h1>
              <p className="mt-1 text-sm text-slate-500">
                ดาวน์โหลดข้อมูลเพื่อใช้งานแบบออฟไลน์ · จัดข้อมูลโทรมาตรโทรหมด · ตรวจสอบสถานะการเชื่อมต่อออนไลน์
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              href="/"
              className="rounded-[4px] border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              ← กลับพยากรณ์วันนี้
            </Link>
            <Link
              href="/offline"
              className="rounded-[4px] bg-brand-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-brand-700"
            >
              ทดสอบโหมดออฟไลน์
            </Link>
          </div>
        </div>

        {/* Management Panel */}
        <TileManagementPanel />

        {/* Info Section */}
        <div className="rounded-xl border border-[#B9DDFE] bg-[#F0F7FF] p-5">
          <h2 className="font-display text-lg font-bold text-slate-900">
            เกี่ยวกับระบบไทล์
          </h2>
          <div className="mt-3 grid gap-2 text-sm text-slate-600 sm:grid-cols-2">
            <p><strong>ไทล์ข้อมูล</strong> คือชุดข้อมูลคอนสติทิวเอนต์สำหรับการคำนวณน้ำขึ้น-น้ำลงในแต่ละพื้นที่</p>
            <p><strong>37+ คอนสติทิวเอนต์</strong> รวมถึง M2, S2, K1, O1 และคอนสติทิวเอนต์รองอื่นๆ สำหรับความแม่นยำสูง</p>
            <p><strong>ระบบบีบอัดข้อมูล</strong> บีบอัดไทล์ด้วย deflate (zlib) และ gzip ผ่าน CompressionStream ของเบราว์เซอร์</p>
            <p><strong>การทำงานแบบออฟไลน์</strong> คำนวณข้อมูลบนเครื่องโดยไม่ต้องใช้อินเทอร์เน็ต พร้อมใช้งานทันที</p>
            <p><strong>อัปเดตอัตโนมัติ</strong> ตรวจสอบเวอร์ชันใหม่และอัปเดตข้อมูลทุก 30 วัน</p>
            <p><strong>ระบบ LRU Eviction</strong> จัดการพื้นที่จัดเก็บอัตโนมัติเมื่อเต็ม</p>
          </div>
        </div>

        <div className="card-l1 p-5">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-lg font-bold text-slate-900">
              ข้อมูลเชิงเทคนิคโมเดลฮาร์มอนิก (Tidal Harmonic Model Specs){" "}
              <span className="ml-1 rounded bg-slate-100 px-1.5 py-0.5 align-middle font-mono text-[11px] font-semibold text-slate-500">
                Datum: ยังไม่แปลงเป็น ม.รทก.
              </span>
            </h2>
          </div>
          <div className="mt-3 grid gap-4 md:grid-cols-2">
            <div className="rounded-lg border border-slate-200 bg-white p-4">
              <h3 className="font-bold text-slate-900">
                🌊 อ่าวไทย (Gulf of Thailand){" "}
                <span className="ml-1 font-mono text-[11px] font-semibold text-slate-500">FES2022+GOT</span>
              </h3>
              <div className="mt-2 space-y-1.5 text-sm text-slate-600">
                <p>พอลิทารีประจำวัน-น้ำผสมสองรอบ (Mixed Tide - Predominantly Diurnal)</p>
                <p><strong>โมเดล:</strong> FES2022</p>
                <p><strong>Datum ที่ใช้จริง:</strong> ระดับสถานี (LLW / LAT) — ยังไม่ได้แปลงเป็น ม.รทก.</p>
                <p className="font-mono text-xs"><strong>คอนสติทิวเอนต์หลัก:</strong> M2, S2, K1, O1, N2, P1, Q1, K2</p>
                <p className="text-xs text-slate-500">ความแม่นยำเป้าหมายของระบบ: ±15 นาที / ±0.10 เมตร (ใช้ได้เมื่อทุกจุดอยู่บน datum เดียวกัน)</p>
              </div>
            </div>

            <div className="rounded-lg border border-slate-200 bg-white p-4">
              <h3 className="font-bold text-slate-900">
                🏝️ ทะเลอันดามัน (Andaman Sea){" "}
                <span className="ml-1 font-mono text-[11px] font-semibold text-slate-500">FES2022+IND</span>
              </h3>
              <div className="mt-2 space-y-1.5 text-sm text-slate-600">
                <p>พอลิทารีประจำวัน-น้ำผสมสองรอบ (Semidiurnal Tide) วันละ 2 ครั้ง</p>
                <p><strong>โมเดล:</strong> FES2022</p>
                <p><strong>Datum ที่ใช้จริง:</strong> ระดับสถานี (LLW / LAT) — ยังไม่ได้แปลงเป็น ม.รทก.</p>
                <p className="font-mono text-xs"><strong>คอนสติทิวเอนต์หลัก:</strong> M2, S2, N2, K2, K1, O1, 2M2, Nu2</p>
                <p className="text-xs text-slate-500">ความแม่นยำเป้าหมายของระบบ: ±15 นาที / ±0.10 เมตร (ใช้ได้เมื่อทุกจุดอยู่บน datum เดียวกัน)</p>
              </div>
            </div>
          </div>
        </div>

        {/* Warning */}
        <div className="rounded-xl border border-red-200 bg-[#FEF2F2] p-5">
          <h3 className="font-bold text-red-800">
            ⚠️ คำเตือนสำคัญด้านการเดินเรือ (Not for Navigation Reference)
          </h3>
          <p className="mt-1 text-sm text-red-700">
            ข้อมูลการทำนายน้ำขึ้น-น้ำลง <strong>ไม่เหมาะสำหรับการนำร่องทางทะเล</strong>
            (Not for Navigation) ปัจจัยต่างๆ เช่น ลม ความกดอากาศ และกระแสน้ำอาจทำให้ระดับน้ำจริง
            แตกต่างจากการทำนาย กรุณาใช้ข้อมูลอย่างระมัดระวังและอ้างอิงแหล่งข้อมูลทางการเสมอ
          </p>
        </div>
      </div>
    </div>
  )
}
