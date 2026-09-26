"use client"

import { WifiOff, Home, RefreshCw } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export default function OfflinePage() {
  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900">
      <div className="flex items-center justify-center p-4 py-10">
        <Card className="card-l1 w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-amber-100">
              <WifiOff className="h-8 w-8 text-amber-600" />
            </div>
            <CardTitle className="font-display text-2xl font-bold">
              คุณอยู่ในโหมดออฟไลน์
            </CardTitle>
            <CardDescription className="mt-2 text-base">
              ไม่สามารถเชื่อมต่ออินเทอร์เน็ตได้ในขณะนี้
            </CardDescription>
            <p className="mt-3 inline-flex items-center justify-center gap-1.5 text-xs font-semibold text-amber-600">
              <span className="h-2 w-2 rounded-full bg-amber-500 motion-safe:animate-pulse" aria-hidden="true" />
              โหมดออฟไลน์
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-xl border border-[#B9DDFE] bg-[#F0F7FF] p-4">
              <h3 className="mb-2 font-bold text-brand-700">
                ✨ คุณยังสามารถ:
              </h3>
              <ul className="space-y-2 text-sm text-slate-600">
                <li className="flex items-start gap-2">
                  <span className="mt-0.5 text-brand-600">•</span>
                  <span>ดูข้อมูลน้ำขึ้น-น้ำลงที่บันทึกไว้ในเครื่องจากการเข้าชมครั้งก่อน</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-0.5 text-brand-600">•</span>
                  <span>ใช้งานไทล์ที่ดาวน์โหลดไว้แล้ว ไม่ต้องใช้อินเทอร์เน็ต</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-0.5 text-brand-600">•</span>
                  <span>ตรวจสอบการทำนายล่าสุดและความพร้อมออฟไลน์</span>
                </li>
              </ul>
            </div>

            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
              <p className="text-sm text-amber-900">
                <strong>หมายเหตุ:</strong> ข้อมูลใหม่จะอัปเดตเมื่อมีการเชื่อมต่ออินเทอร์เน็ตอีกครั้ง
              </p>
            </div>

            <div className="flex flex-col gap-3 pt-4 sm:flex-row">
              <Link href="/" className="flex-1">
                <Button className="w-full rounded-[4px] bg-brand-600 hover:bg-brand-700" size="lg">
                  <Home className="mr-2 h-4 w-4" />
                  กลับหน้าหลัก
                </Button>
              </Link>
              <Button
                variant="outline"
                className="flex-1 rounded-[4px]"
                size="lg"
                onClick={() => window.location.reload()}
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                ลองอีกครั้ง
              </Button>
            </div>

            <Link
              href="/tiles"
              className="block text-center text-sm font-semibold text-brand-600 hover:text-brand-700"
            >
              จัดการไทล์ออฟไลน์ →
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
