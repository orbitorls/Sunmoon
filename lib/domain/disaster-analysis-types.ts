/**
 * Disaster analysis — shared types and thresholds.
 *
 * Split out of lib/disaster-analysis.ts (god module). Contains only the
 * public type surface plus the internal threshold table, so the classify and
 * format sub-modules can share it without importing each other.
 */

// ประเภทภัยพิบัติที่อาจเกิดขึ้น
export type DisasterType =
  | 'flood'           // น้ำท่วมชายฝั่ง
  | 'storm_surge'     // คลื่นพายุซัดฝั่ง
  | 'high_tide'       // น้ำหนุนสูงผิดปกติ
  | 'erosion'         // การกัดเซาะชายฝั่ง
  | 'rip_current'     // กระแสน้ำดูด
  | 'none';           // ไม่มีภัยพิบัติ

export type RiskLevel = 'low' | 'medium' | 'high' | 'critical';

export type DisasterInfo = {
  type: DisasterType;
  title: string;              // ชื่อภัยพิบัติ
  description: string;        // คำอธิบายสั้น
  detailedExplanation: string; // คำอธิบายละเอียด
  probability: number;        // ความน่าจะเป็น 0-100%
  causes: string[];           // สาเหตุการเกิด
  impactAreas: string[];      // พื้นที่ได้รับผลกระทบ
  preventionTips: string[];   // วิธีป้องกัน
};

export type RiskFactor = {
  id: string;
  name: string;
  value: number | string;
  unit?: string;
  description: string;
  contributeToRisk: boolean;
  riskContribution: number;   // 0-100 contribution to overall risk
  icon: string;               // Lucide icon name
};

export type DisasterAnalysis = {
  riskLevel: RiskLevel;
  overallRating: number;      // 0-100
  disasters: DisasterInfo[];
  factors: RiskFactor[];
  recommendations: string[];
  timestamp: string;
  location: string;
  // NEW: Additional prediction features
  riskTimeline: RiskTimeSlot[];           // ช่วงเวลาที่เสี่ยงภัย
  floodPrediction: FloodPrediction | null; // การพยากรณ์น้ำท่วม
  advanceWarnings: AdvanceWarning[];       // การเตือนล่วงหน้า
  historicalContext: HistoricalContext | null; // ข้อมูลประวัติศาสตร์
  headline: string | null;                // ประโยคสรุปเฉพาะเจาะจง (เวลา+ระดับน้ำ+ลม)
};

// NEW: ช่วงเวลาที่มีความเสี่ยง
export type RiskTimeSlot = {
  startTime: string;          // เวลาเริ่มต้น HH:MM
  endTime: string;            // เวลาสิ้นสุด HH:MM
  riskLevel: RiskLevel;       // ระดับความเสี่ยงในช่วงนั้น
  mainRisk: string;           // ความเสี่ยงหลัก
  description: string;        // คำอธิบาย
  tideLevel: number;          // ระดับน้ำโดยประมาณ
};

// NEW: การพยากรณ์น้ำท่วม
export type FloodPrediction = {
  expectedLevel: number;      // ระดับน้ำท่วมที่คาดการณ์ (ซม.)
  peakTime: string;           // เวลาที่น้ำสูงสุด
  duration: number;           // ระยะเวลาที่น้ำท่วม (นาที)
  affectedAreas: string[];    // พื้นที่ที่อาจได้รับผลกระทบ
  floodType: 'minor' | 'moderate' | 'major' | 'severe'; // ระดับความรุนแรง
  causedBy: string[];         // สาเหตุหลัก
  confidence: number;         // ความมั่นใจในการพยากรณ์ 0-100%
};

// NEW: การเตือนภัยล่วงหน้า
export type AdvanceWarning = {
  type: DisasterType;
  warningLevel: 'watch' | 'advisory' | 'warning' | 'emergency';
  title: string;
  message: string;
  timeUntil: string;          // เวลาที่เหลือก่อนเกิด e.g., "2 ชั่วโมง"
  expectedTime: string;       // เวลาที่คาดว่าจะเกิด
  actionRequired: string[];   // สิ่งที่ต้องทำ
};

// NEW: ข้อมูลประวัติศาสตร์
export type HistoricalContext = {
  similarEvents: HistoricalEvent[];
  lastMajorEvent: HistoricalEvent | null;
  averageOccurrence: string;  // ความถี่โดยเฉลี่ย
  seasonalPattern: string;    // รูปแบบตามฤดูกาล
};

export type HistoricalEvent = {
  date: string;
  eventType: DisasterType;
  severity: string;
  maxWaterLevel: number;
  description: string;
};

// Constants for thresholds (internal — shared by classify/format sub-modules)
export const THRESHOLDS = {
  HIGH_TIDE_LEVEL: 2.5,       // เมตร - ระดับน้ำสูงที่เริ่มเสี่ยง
  CRITICAL_TIDE_LEVEL: 3.0,   // เมตร - ระดับน้ำสูงวิกฤต
  HIGH_WIND_SPEED: 8,         // m/s - ลมแรง
  STORM_WIND_SPEED: 15,       // m/s - พายุ
  LOW_PRESSURE: 1005,         // hPa - ความกดอากาศต่ำ
  CRITICAL_PRESSURE: 995,     // hPa - ความกดอากาศต่ำมาก
  HIGH_TIDE_RANGE: 2.0,       // เมตร - ช่วงขึ้นลงสูง
};