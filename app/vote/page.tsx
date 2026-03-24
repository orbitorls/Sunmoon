'use client';

import { useState } from 'react';
import VoteCard from '@/components/vote-card';
import TurnstileWidget from '@/components/cloudflare-turnstile';
import { CheckCircle2, Vote, Trophy, Sparkles } from 'lucide-react';

// ตัวอย่างข้อมูลผลงาน (สามารถแก้ไขได้)
const projects = [
  {
    id: 'naa-01',
    name: 'โครงการ A - นวัตกรรมพลังงานสะอาด',
    description: 'ระบบผลิตไฟฟ้าจากพลังงานแสงอาทิตย์สำหรับชุมชน',
    image: '/placeholder-project.jpg',
    team: 'ทีม SolarGen',
  },
  {
    id: 'naa-02',
    name: 'โครงการ B - แอพช่วยเหลือผู้สูงอายุ',
    description: 'แอพพลิเคชั่นเตือนการทานยาและนัดหมายแพทย์',
    image: '/placeholder-project.jpg',
    team: 'ทีม CareConnect',
  },
  {
    id: 'naa-03',
    name: 'โครงการ C - ระบบจัดการขยะอัจฉริยะ',
    description: 'AI วิเคราะห์และแยกประเภทขยะอัตโนมัติ',
    image: '/placeholder-project.jpg',
    team: 'ทีม EcoSort',
  },
  {
    id: 'naa-04',
    name: 'โครงการ D - เกมการศึกษาสำหรับเด็ก',
    description: 'เกมส่งเสริมการเรียนรู้คณิตศาสตร์และวิทยาศาสตร์',
    image: '/placeholder-project.jpg',
    team: 'ทีม EduPlay',
  },
];

export default function VotePage() {
  const [selectedProject, setSelectedProject] = useState<string | null>(null);
  const [isHumanVerified, setIsHumanVerified] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!selectedProject) {
      setError('กรุณาเลือกผลงานที่ต้องการโหวต');
      return;
    }
    if (!isHumanVerified) {
      setError('กรุณายืนยันว่าคุณไม่ใช่บอท');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch('/api/vote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: selectedProject,
          verified: isHumanVerified,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setIsSuccess(true);
      } else {
        setError(data.message || 'เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง');
      }
    } catch {
      setError('ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-800 flex items-center justify-center p-4">
        <div className="bg-white/10 backdrop-blur-xl rounded-3xl p-12 text-center max-w-md border border-white/20 shadow-2xl">
          <div className="w-24 h-24 bg-gradient-to-r from-green-400 to-emerald-500 rounded-full flex items-center justify-center mx-auto mb-6 animate-bounce">
            <CheckCircle2 className="w-14 h-14 text-white" />
          </div>
          <h2 className="text-3xl font-bold text-white mb-4">โหวตสำเร็จ!</h2>
          <p className="text-white/80 text-lg">ขอบคุณสำหรับการโหวตของคุณ</p>
          <Sparkles className="w-8 h-8 text-yellow-400 mx-auto mt-6 animate-pulse" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-800">
      {/* Header */}
      <header className="py-8 px-4 text-center relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-yellow-400/20 via-pink-500/20 to-purple-500/20 animate-pulse" />
        <div className="relative z-10">
          <div className="flex items-center justify-center gap-3 mb-2">
            <Trophy className="w-10 h-10 text-yellow-400" />
            <h1 className="text-4xl md:text-5xl font-black bg-gradient-to-r from-yellow-200 via-pink-200 to-purple-200 bg-clip-text text-transparent">
              I-NEW GEN AWARDS 2026
            </h1>
            <Trophy className="w-10 h-10 text-yellow-400" />
          </div>
          <p className="text-white/70 text-lg mt-2">High School Category</p>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-4 pb-12">
        <div className="bg-white/5 backdrop-blur-lg rounded-2xl p-6 md:p-8 border border-white/10">
          <h2 className="text-2xl font-bold text-white mb-2 flex items-center gap-2">
            <Vote className="w-6 h-6 text-pink-400" />
            กรุณาเลือกผลงานที่ท่านชื่นชอบ 1 ผลงาน
          </h2>
          <p className="text-white/60 mb-8">คลิกที่การ์ดเพื่อเลือกผลงาน</p>

          {/* Project Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              {projects.map((project) => (
                <VoteCard
                  key={project.id}
                  id={project.id}
                  name={project.name}
                  description={project.description}
                  team={project.team}
                  selected={selectedProject === project.id}
                  onSelect={setSelectedProject}
                />
              ))}
            </div>

          {/* Human Verification Checkbox */}
            <div className="bg-white/5 rounded-xl p-6 mb-6 border border-white/10">
              <TurnstileWidget onVerify={(token) => setIsHumanVerified(!!token)} />
            </div>

          {/* Error Message */}
          {error && (
            <div className="bg-red-500/20 border border-red-500/50 rounded-xl p-4 mb-6 text-red-200">
              {error}
            </div>
          )}

          {/* Submit Button */}
          <button
            onClick={handleSubmit}
            disabled={isSubmitting || !selectedProject || !isHumanVerified}
            className={`w-full py-4 rounded-xl font-bold text-lg transition-all duration-300 ${
              isSubmitting || !selectedProject || !isHumanVerified
                ? 'bg-white/10 text-white/40 cursor-not-allowed'
                : 'bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-500 text-white hover:shadow-lg hover:shadow-purple-500/30 hover:scale-[1.01] active:scale-[0.99]'
            }`}
          >
            {isSubmitting ? (
              <span className="flex items-center justify-center gap-2">
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                กำลังส่งโหวต...
              </span>
            ) : (
              'ยืนยันการโหวต'
            )}
          </button>
        </div>
      </main>

      {/* Footer */}
      <footer className="text-center py-6 text-white/40 text-sm">
        <p>© 2026 I-NEW GEN AWARDS. All rights reserved.</p>
      </footer>
    </div>
  );
}
