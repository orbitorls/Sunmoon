/**
 * Disaster analysis — Thai display formatters.
 *
 * Split out of lib/disaster-analysis.ts (god module). Pure formatting helpers
 * (headline sentence + level labels/colors) with no analysis logic.
 */

import {
  THRESHOLDS,
  type AdvanceWarning,
  type DisasterAnalysis,
  type FloodPrediction,
  type RiskLevel,
} from '../domain/disaster-analysis-types'

/**
 * แปลงองศาลมเป็นทิศภาษาไทย
 */
function windDirectionThai(deg: number): string {
  const dirs = ['เหนือ', 'ตะวันออกเฉียงเหนือ', 'ตะวันออก', 'ตะวันออกเฉียงใต้', 'ใต้', 'ตะวันตกเฉียงใต้', 'ตะวันตก', 'ตะวันตกเฉียงเหนือ'];
  const idx = Math.round(deg / 45) % 8;
  return dirs[idx];
}

/**
 * สร้างประโยคสรุปเฉพาะเจาะจง เช่น
 * "วันนี้ 15:00 น. น้ำหนุนสูง 2.7m + ลมใต้ 12m/s เสี่ยงท่วมริมคลอง"
 * ใช้ข้อมูลที่คำนวณไว้แล้วเท่านั้น (ไม่คิดความเสี่ยงใหม่)
 */
export function formatDisasterHeadline(
  analysis: Pick<DisasterAnalysis, 'riskLevel' | 'floodPrediction' | 'advanceWarnings' | 'riskTimeline' | 'factors'>,
  windDeg: number = 0
): string | null {
  if (analysis.riskLevel === 'low') return null;

  const windFactor = analysis.factors.find(f => f.id === 'wind');
  const windSpeed = typeof windFactor?.value === 'number' ? windFactor.value : 0;

  // เลือกแหล่งเวลา+ระดับน้ำที่เจาะจงที่สุดที่มีอยู่แล้ว: advance warning ก่อน แล้วจึง timeline slot
  const primaryWarning = analysis.advanceWarnings.find(w => w.type === 'high_tide') ?? analysis.advanceWarnings[0] ?? null;
  const primarySlot = analysis.riskTimeline[0] ?? null;

  // floodPrediction.peakTime is the exact predicted peak (derived straight from
  // tideEvents, no wall-clock dependency) -- prefer it over advanceWarnings,
  // whose presence depends on how much real time is left until the event.
  const timeLabel = analysis.floodPrediction?.peakTime ?? primaryWarning?.expectedTime ?? primarySlot?.startTime ?? null;
  const parsedWarningLevel = primaryWarning ? Number.parseFloat(primaryWarning.title.replace(/[^\d.]/g, '')) : NaN;
  const level = primarySlot?.tideLevel ?? (Number.isFinite(parsedWarningLevel) ? parsedWarningLevel : null);

  const parts: string[] = [timeLabel ? `วันนี้ ${timeLabel} น.` : 'วันนี้'];

  if (level !== null) {
    parts.push(`น้ำหนุนสูง ${level.toFixed(1)}m`);
  }
  if (windSpeed >= THRESHOLDS.HIGH_WIND_SPEED) {
    parts.push(`+ ลม${windDirectionThai(windDeg)} ${windSpeed.toFixed(0)}m/s`);
  }

  const area = analysis.floodPrediction?.affectedAreas[0] ?? 'พื้นที่ชายฝั่ง';
  const severityWord = analysis.riskLevel === 'critical' ? 'เสี่ยงท่วมหนัก' : 'เสี่ยงท่วม';
  parts.push(`${severityWord}${area}`);

  return parts.join(' ');
}

/**
 * แปลงระดับความเสี่ยงเป็นภาษาไทย
 */
export function getRiskLevelText(level: RiskLevel): string {
  switch (level) {
    case 'critical': return 'วิกฤต';
    case 'high': return 'สูง';
    case 'medium': return 'ปานกลาง';
    case 'low': return 'ต่ำ';
  }
}

/**
 * ได้สีสำหรับระดับความเสี่ยง
 */
export function getRiskLevelColor(level: RiskLevel): { bg: string; text: string; border: string } {
  switch (level) {
    case 'critical':
      return { bg: 'bg-red-600', text: 'text-red-700', border: 'border-red-500' };
    case 'high':
      return { bg: 'bg-orange-500', text: 'text-orange-700', border: 'border-orange-500' };
    case 'medium':
      return { bg: 'bg-yellow-500', text: 'text-yellow-700', border: 'border-yellow-500' };
    case 'low':
      return { bg: 'bg-green-500', text: 'text-green-700', border: 'border-green-500' };
  }
}

/**
 * แปลงระดับเตือนภัยเป็นภาษาไทย
 */
export function getWarningLevelText(level: AdvanceWarning['warningLevel']): string {
  switch (level) {
    case 'emergency': return 'ฉุกเฉิน';
    case 'warning': return 'เตือนภัย';
    case 'advisory': return 'ระวังภัย';
    case 'watch': return 'เฝ้าระวัง';
  }
}

/**
 * ได้สีสำหรับระดับเตือนภัย
 */
export function getWarningLevelColor(level: AdvanceWarning['warningLevel']): string {
  switch (level) {
    case 'emergency': return 'bg-red-600';
    case 'warning': return 'bg-orange-500';
    case 'advisory': return 'bg-yellow-500';
    case 'watch': return 'bg-blue-500';
  }
}

/**
 * แปลงระดับน้ำท่วมเป็นภาษาไทย
 */
export function getFloodTypeText(type: FloodPrediction['floodType']): string {
  switch (type) {
    case 'severe': return 'รุนแรงมาก';
    case 'major': return 'รุนแรง';
    case 'moderate': return 'ปานกลาง';
    case 'minor': return 'เล็กน้อย';
  }
}