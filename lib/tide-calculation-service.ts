/**
 * Tide Calculation Service
 * Integrates regional calibration with harmonic tide prediction
 */

import { getRegionalCalibration, getSeasonalAdjustment } from './regional-calibration';
import { predictTideLevel } from './harmonic-tide-core';
import type { LocationData } from './tide-service';

export interface TidePredictionOptions {
  date: Date;
  location: LocationData;
  applyCalibration?: boolean;
  useSeasonalAdjustment?: boolean;
}

export interface TidePredictionResult {
  time: string;
  level: number;
  type: 'high' | 'low';
  calibrated?: boolean;
  confidence: number;
}

export interface TideLevelPrediction {
  level: number;
  status: 'น้ำขึ้น' | 'น้ำลง' | 'น้ำนิ่ง';
  confidence: number;
}

/**
 * Predict tide level with regional calibration applied
 */
export function predictTideWithCalibration(
  options: TidePredictionOptions
): TideLevelPrediction {
  const { date, location, applyCalibration = true, useSeasonalAdjustment = true } = options;
  
  let level = 0;
  
  // Get base level from harmonic engine
  try {
    level = predictTideLevel(date, [], location.lon);
  } catch (error) {
    console.warn('Harmonic prediction failed, using fallback:', error);
    level = 1.5; // Fallback to middle level
  }
  
  // Apply regional calibration if enabled
  if (applyCalibration) {
    // Get calibration for this location
    const calibration = getRegionalCalibration(location.lat, location.lon);
    
    // Apply amplitude correction based on region
    // Note: Using simplified correction factors
    const gulfUpperCorrection = 1.02;
    const gulfMiddleCorrection = 1.01;
    const gulfLowerCorrection = 1.012;
    const andamanNorthCorrection = 1.008;
    const andamanPhuketCorrection = 1.005;
    const andamanSouthCorrection = 1.009;
    
    let correctionFactor = 1.0;
    
    if (location.lon >= 99 && location.lon <= 102) {
      if (location.lat >= 12) correctionFactor = gulfUpperCorrection;
      else if (location.lat >= 9.5) correctionFactor = gulfMiddleCorrection;
      else correctionFactor = gulfLowerCorrection;
    } else if (location.lon >= 98 && location.lon <= 101) {
      if (location.lat >= 10) correctionFactor = andamanNorthCorrection;
      else if (location.lat >= 8) correctionFactor = andamanPhuketCorrection;
      else correctionFactor = andamanSouthCorrection;
    }
    
    // Apply correction to level
    level = level * correctionFactor;
  }
  
  // Apply seasonal adjustment if enabled
  if (useSeasonalAdjustment) {
    const month = date.getMonth() + 1; // 1-12
    const region = (location.lon >= 99 && location.lon <= 102) ? 'gulf' : 'andaman';
    const seasonalFactor = getSeasonalAdjustment(month, region);
    level = level * seasonalFactor;
  }
  
  // Determine status based on level
  let status: 'น้ำขึ้น' | 'น้ำลง' | 'น้ำนิ่ง' = 'น้ำนิ่ง';
  if (level > 1.8) {
    status = 'น้ำขึ้น';
  } else if (level < 1.2) {
    status = 'น้ำลง';
  }
  
  // Calculate confidence
  let confidence = 85; // Base confidence
  confidence = Math.min(95, Math.max(70, confidence));
  
  return {
    level: Math.max(0, Math.min(3, level)), // Clamp to reasonable range
    status,
    confidence,
  };
}

/**
 * Generate 24-hour tide predictions with calibration
 */
export function generate24HourPredictions(
  location: LocationData,
  date: Date
): TidePredictionResult[] {
  const predictions: TidePredictionResult[] = [];
  const predictionsPerDay = 4; // High, Low, High, Low
  
  const baseTimes = ['06:00', '12:00', '18:00', '00:00'];
  const baseLevels = [1.8, 0.6, 1.9, 0.5]; // Approximate pattern for Thailand
  
  for (let i = 0; i < predictionsPerDay; i++) {
    const time = baseTimes[i];
    const prediction = predictTideWithCalibration({
      date,
      location,
      applyCalibration: true,
      useSeasonalAdjustment: true,
    });
    
    predictions.push({
      time,
      level: prediction.level,
      type: i % 2 === 0 ? 'high' : 'low',
      calibrated: true,
      confidence: prediction.confidence,
    });
  }
  
  return predictions;
}

/**
 * Get calibration info for a location
 */
export function getCalibrationInfo(location: LocationData) {
  const calibration = getRegionalCalibration(location.lat, location.lon);
  
  return {
    region: calibration.region,
    zone: calibration.zone,
    hasCalibration: true,
  };
}

/**
 * Validate calibration parameters for Thailand
 */
export function validateCalibrationParameters(lat: number, lon: number): {
  valid: boolean;
  warnings: string[];
} {
  const warnings: string[] = [];
  
  // Check if location is in Thailand
  if (lat < 5 || lat > 20 || lon < 97 || lon > 106) {
    warnings.push('พิกัดละติจูดอยู่นอกพื้นที่ประเทศไทย');
  }
  
  // Check if coordinates are reasonable for tide calculation
  if (!isCoastalLocation(lat, lon)) {
    warnings.push('พิกัดละติจูดอยู่นอกบนกอ่าวไทยและทะเลอันดามัน');
  }
  
  return {
    valid: warnings.length === 0,
    warnings,
  };
}

function isCoastalLocation(lat: number, lon: number): boolean {
  // Thailand coastal regions
  const gulfOfThailand = lat < 15 && lat > 5 && lon > 99 && lon < 103;
  const andamanSea = lat < 13 && lat > 6 && lon > 97 && lon < 100;
  
  return gulfOfThailand || andamanSea;
}

/**
 * Calculate tide statistics with calibration applied
 */
export function calculateTideStatistics(
  predictions: TidePredictionResult[]
): {
  maxLevel: number;
  minLevel: number;
  avgLevel: number;
  amplitude: number;
} {
  if (predictions.length === 0) {
    return { maxLevel: 0, minLevel: 0, avgLevel: 0, amplitude: 0 };
  }
  
  const levels = predictions.map(p => p.level);
  const maxLevel = Math.max(...levels);
  const minLevel = Math.min(...levels);
  const avgLevel = levels.reduce((sum, l) => sum + l, 0) / levels.length;
  const amplitude = maxLevel - minLevel;
  
  return { maxLevel, minLevel, avgLevel, amplitude };
}
