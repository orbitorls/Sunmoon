/**
 * Confidence Bands for Tide Predictions
 * 
 * Provides uncertainty quantification and confidence intervals
 * for tide height predictions using statistical methods
 */

import type { LocationData } from './tide-service';
import { predictTideLevel } from './harmonic-engine';

export interface ConfidenceBand {
  timestamp: string;
  height: number; // Most likely height
  upper68: number; // 68% confidence upper bound (1σ)
  lower68: number; // 68% confidence lower bound (1σ)
  upper95: number; // 95% confidence upper bound (2σ)
  lower95: number; // 95% confidence lower bound (2σ)
  confidence: number; // Overall confidence score (0-100)
  uncertainty: number; // Standard deviation
}

export interface PredictionUncertainty {
  timestamp: string;
  height: number;
  uncertainty: number; // Standard deviation
  confidence: number; // 0-100
  factors: {
    modelError: number; // Model prediction error
    dataQuality: number; // Input data quality factor
    distance: number; // Distance from calibration point
    temporal: number; // Time-based uncertainty growth
    weather: number; // Weather impact factor
  };
}

export interface CalibrationStats {
  rmse: number; // Root mean square error
  mae: number; // Mean absolute error
  bias: number; // Systematic bias
  coverage_68: number; // % of actuals within 68% band
  coverage_95: number; // % of actuals within 95% band
  sampleSize: number;
  lastCalibrated: string;
  region: string;
}

// Base uncertainty values for different conditions (meters)
const BASE_UNCERTAINTY = {
  // Model-specific uncertainties
  harmonic: {
    excellent: 0.05,  // Well-calibrated locations
    good: 0.08,       // Average locations
    fair: 0.12,       // Poor data locations
    poor: 0.20         // Very uncertain
  },
  
  // Weather impact factors
  weather: {
    calm: 1.0,         // Clear, calm conditions
    moderate: 1.3,      // Light winds, normal pressure
    rough: 1.8,        // Strong winds, pressure changes
    storm: 2.5          // Storm conditions
  },
  
  // Distance-based uncertainty growth (meters per km)
  distance: {
    nearby: 0.01,       // < 5km from calibration point
    regional: 0.02,      // 5-50km
    distant: 0.05,       // > 50km
    extrapolation: 0.10   // > 100km, outside calibrated area
  },
  
  // Temporal uncertainty growth (meters per day from calibration)
  temporal: {
    current: 0.00,      // Present day
    recent: 0.02,        // 1-7 days
    forecast: 0.05,      // 1-4 weeks
    seasonal: 0.10       // > 1 month
  }
};

export class ConfidenceBandCalculator {
  private calibrationStats: Map<string, CalibrationStats> = new Map();
  private regionalCalibrationPoints: Map<string, { lat: number; lng: number }> = new Map();
  
  constructor() {
    this.initializeCalibrationPoints();
    this.loadCalibrationData();
  }
  
  /**
   * Initialize regional calibration points for Thai waters
   */
  private initializeCalibrationPoints(): void {
    // Gulf of Thailand calibration points
    this.regionalCalibrationPoints.set('bangkok', { lat: 13.7563, lng: 100.5018 });
    this.regionalCalibrationPoints.set('pattaya', { lat: 12.9236, lng: 100.8825 });
    this.regionalCalibrationPoints.set('samui', { lat: 9.5130, lng: 100.0586 });
    this.regionalCalibrationPoints.set('chantaburi', { lat: 12.6095, lng: 102.1046 });
    
    // Andaman Sea calibration points
    this.regionalCalibrationPoints.set('phuket', { lat: 7.8804, lng: 98.3923 });
    this.regionalCalibrationPoints.set('krabi', { lat: 8.0453, lng: 98.8097 });
    this.regionalCalibrationPoints.set('ranong', { lat: 9.9675, lng: 98.6331 });
    this.regionalCalibrationPoints.set('trang', { lat: 7.5571, lng: 99.6114 });
  }
  
  /**
   * Generate confidence bands for a time series of predictions
   */
  async generateConfidenceBands(
    location: LocationData,
    startTime: Date,
    endTime: Date,
    intervalMinutes: number = 15
  ): Promise<ConfidenceBand[]> {
    const bands: ConfidenceBand[] = [];
    const intervalMs = intervalMinutes * 60 * 1000;
    
    // Get calibration data for nearest point
    const calibrationPoint = this.findNearestCalibrationPoint(location);
    const calibration = this.calibrationStats.get(calibrationPoint.region);
    
    let currentTime = new Date(startTime);
    
    while (currentTime <= endTime) {
      const hour = currentTime.getHours() + currentTime.getMinutes() / 60;
      const prediction = predictTideLevel(currentTime, location, { 
        hour: Math.floor(hour), 
        minute: Math.floor((hour % 1) * 60) 
      });
      
      const uncertainty = await this.calculateUncertainty(
        location as any, 
        currentTime, 
        calibration
      );
      
      const band: ConfidenceBand = {
        timestamp: currentTime.toISOString(),
        height: prediction.level,
        upper68: prediction.level + uncertainty.uncertainty,
        lower68: prediction.level - uncertainty.uncertainty,
        upper95: prediction.level + 2 * uncertainty.uncertainty,
        lower95: prediction.level - 2 * uncertainty.uncertainty,
        confidence: uncertainty.confidence,
        uncertainty: uncertainty.uncertainty
      };
      
      bands.push(band);
      currentTime = new Date(currentTime.getTime() + intervalMs);
    }
    
    return bands;
  }
  
  /**
   * Calculate uncertainty components for a specific prediction
   */
  private async calculateUncertainty(
    location: LocationData,
    time: Date,
    calibration: CalibrationStats | undefined
  ): Promise<PredictionUncertainty> {
    const factors = {
      modelError: this.getModelUncertainty(calibration),
      dataQuality: this.getDataQualityFactor(time),
      distance: this.getDistanceUncertainty(location),
      temporal: this.getTemporalUncertainty(time),
      weather: await this.getWeatherImpactFactor(location, time)
    };
    
    // Combine uncertainties using root-sum-square method
    const combinedUncertainty = Math.sqrt(
      factors.modelError ** 2 +
      factors.dataQuality ** 2 +
      factors.distance ** 2 +
      factors.temporal ** 2 +
      factors.weather ** 2
    );
    
    // Calculate overall confidence score (0-100)
    const baseConfidence = calibration ? 
      100 - (calibration.rmse * 100) : 75; // Base confidence
    const confidence = Math.max(50, Math.min(95, baseConfidence));
    
    return {
      timestamp: time.toISOString(),
      height: predictTideLevel(time, location, { 
        hour: time.getHours(), 
        minute: time.getMinutes() 
      }).level,
      uncertainty: combinedUncertainty,
      confidence,
      factors
    };
  }
  
  /**
   * Get model uncertainty based on calibration quality
   */
  private getModelUncertainty(calibration: CalibrationStats | undefined): number {
    if (!calibration) {
      return BASE_UNCERTAINTY.harmonic.fair; // Default to fair quality
    }
    
    // Determine quality based on RMSE
    if (calibration.rmse < 0.05) {
      return BASE_UNCERTAINTY.harmonic.excellent;
    } else if (calibration.rmse < 0.10) {
      return BASE_UNCERTAINTY.harmonic.good;
    } else if (calibration.rmse < 0.15) {
      return BASE_UNCERTAINTY.harmonic.fair;
    } else {
      return BASE_UNCERTAINTY.harmonic.poor;
    }
  }
  
  /**
   * Get data quality factor based on time and conditions
   */
  private getDataQualityFactor(time: Date): number {
    const hoursSinceCalibration = 24; // Assume calibration was 24 hours ago
    
    if (hoursSinceCalibration < 6) {
      return BASE_UNCERTAINTY.temporal.current;
    } else if (hoursSinceCalibration < 168) { // 1 week
      return BASE_UNCERTAINTY.temporal.recent;
    } else if (hoursSinceCalibration < 720) { // 1 month
      return BASE_UNCERTAINTY.temporal.forecast;
    } else {
      return BASE_UNCERTAINTY.temporal.seasonal;
    }
  }
  
  /**
   * Get distance-based uncertainty
   */
  private getDistanceUncertainty(location: LocationData): number {
    const nearestPoint = this.findNearestCalibrationPoint(location);
    const distance = this.calculateDistance(location as any, nearestPoint.point);
    
    if (distance < 5) {
      return BASE_UNCERTAINTY.distance.nearby;
    } else if (distance < 50) {
      return BASE_UNCERTAINTY.distance.regional;
    } else if (distance < 100) {
      return BASE_UNCERTAINTY.distance.distant;
    } else {
      return BASE_UNCERTAINTY.distance.extrapolation;
    }
  }
  
  /**
   * Get temporal uncertainty growth
   */
  private getTemporalUncertainty(time: Date): number {
    const now = new Date();
    const daysFromNow = (time.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
    
    if (daysFromNow <= 0) {
      return BASE_UNCERTAINTY.temporal.current;
    } else if (daysFromNow <= 7) {
      return BASE_UNCERTAINTY.temporal.recent;
    } else if (daysFromNow <= 30) {
      return BASE_UNCERTAINTY.temporal.forecast;
    } else {
      return BASE_UNCERTAINTY.temporal.seasonal;
    }
  }
  
  /**
   * Estimate weather impact on tide prediction
   */
  private async getWeatherImpactFactor(
    location: LocationData, 
    time: Date
  ): Promise<number> {
    try {
      // This would normally call weather API
      // For now, use simplified estimation based on season
      
      const month = time.getMonth();
      const isMonsoonSeason = month >= 5 && month <= 10; // Southwest monsoon
      
      if (isMonsoonSeason) {
        // Higher uncertainty during monsoon season
        return BASE_UNCERTAINTY.weather.moderate * 1.2;
      } else {
        // Lower uncertainty in dry season
        return BASE_UNCERTAINTY.weather.calm;
      }
    } catch (error) {
      console.warn('Failed to get weather impact, using default:', error);
      return BASE_UNCERTAINTY.weather.moderate;
    }
  }
  
  /**
   * Find nearest calibration point to location
   */
  private findNearestCalibrationPoint(location: LocationData): {
    region: string;
    point: { lat: number; lng: number };
  } {
    let nearestRegion = 'bangkok';
    let minDistance = Infinity;
    let nearestPoint = this.regionalCalibrationPoints.get('bangkok')!;
    
    for (const [region, point] of this.regionalCalibrationPoints) {
      const distance = this.calculateDistance(location, point);
      if (distance < minDistance) {
        minDistance = distance;
        nearestRegion = region;
        nearestPoint = point;
      }
    }
    
    return { region: nearestRegion, point: nearestPoint };
  }
  
  /**
   * Calculate distance between two points (km)
   */
  private calculateDistance(
    point1: any, 
    point2: any
  ): number {
    const R = 6371; // Earth's radius in kilometers
    const dLat = this.toRadians(point2.lat - point1.lat);
    const dLng = this.toRadians(point2.lng - point1.lng);
    
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(this.toRadians(point1.lat)) * Math.cos(this.toRadians(point2.lat)) *
              Math.sin(dLng / 2) * Math.sin(dLng / 2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }
  
  private toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }
  
  /**
   * Update calibration data from new observations
   */
  updateCalibration(
    region: string,
    predictions: Array<{ time: Date; height: number }>,
    observations: Array<{ time: Date; height: number }>
  ): CalibrationStats {
    // Calculate prediction errors
    const errors: number[] = [];
    
    for (let i = 0; i < Math.min(predictions.length, observations.length); i++) {
      const error = predictions[i].height - observations[i].height;
      errors.push(error);
    }
    
    // Calculate statistical metrics
    const rmse = Math.sqrt(errors.reduce((sum, e) => sum + e * e, 0) / errors.length);
    const mae = errors.reduce((sum, e) => sum + Math.abs(e), 0) / errors.length;
    const bias = errors.reduce((sum, e) => sum + e, 0) / errors.length;
    
    // Calculate coverage metrics
    let coverage68 = 0;
    let coverage95 = 0;
    
    for (let i = 0; i < predictions.length; i++) {
      const prediction = predictions[i].height;
      const observation = observations[i].height;
      const uncertainty = this.getModelUncertainty(this.calibrationStats.get(region));
      
      if (Math.abs(observation - prediction) <= uncertainty) {
        coverage68++;
      }
      if (Math.abs(observation - prediction) <= 2 * uncertainty) {
        coverage95++;
      }
    }
    
    coverage68 = (coverage68 / predictions.length) * 100;
    coverage95 = (coverage95 / predictions.length) * 100;
    
    const stats: CalibrationStats = {
      rmse,
      mae,
      bias,
      coverage_68: coverage68,
      coverage_95: coverage95,
      sampleSize: predictions.length,
      lastCalibrated: new Date().toISOString(),
      region
    };
    
    // Update calibration data
    this.calibrationStats.set(region, stats);
    this.saveCalibrationData();
    
    return stats;
  }
  
  /**
   * Get current calibration statistics
   */
  getCalibrationStats(region?: string): Map<string, CalibrationStats> | CalibrationStats | null {
    if (region) {
      return this.calibrationStats.get(region) || null;
    }
    return this.calibrationStats;
  }
  
  /**
   * Load calibration data from localStorage
   */
  private loadCalibrationData(): void {
    if (typeof window === 'undefined') return;
    
    try {
      const stored = localStorage.getItem('tide-calibration-data');
      if (stored) {
        const data = JSON.parse(stored);
        Object.entries(data).forEach(([region, stats]) => {
          this.calibrationStats.set(region, stats as CalibrationStats);
        });
      }
    } catch (error) {
      console.error('Failed to load calibration data:', error);
    }
  }
  
  /**
   * Save calibration data to localStorage
   */
  private saveCalibrationData(): void {
    if (typeof window === 'undefined') return;
    
    try {
      const data = Object.fromEntries(this.calibrationStats);
      localStorage.setItem('tide-calibration-data', JSON.stringify(data));
    } catch (error) {
      console.error('Failed to save calibration data:', error);
    }
  }
  
  /**
   * Reset calibration data
   */
  resetCalibration(): void {
    this.calibrationStats.clear();
    if (typeof window !== 'undefined') {
      localStorage.removeItem('tide-calibration-data');
    }
  }
}

// Export singleton instance
export const confidenceBandCalculator = new ConfidenceBandCalculator();