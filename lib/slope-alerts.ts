/**
 * Tide Slope and Flow Alert System
 * 
 * Calculates water level changes and generates alerts for:
 * - Rapid tide changes (steep slopes)
 * - Strong tidal currents (high flow rates)
 * - Dangerous conditions for marine activities
 */

import type { LocationData } from './tide-service';

// Extend LocationData to include lng
interface ExtendedLocationData extends LocationData {
  lng: number;
}
import { predictTideLevel } from './harmonic-engine';

export interface TideAlert {
  id: string;
  type: 'slope' | 'flow' | 'danger' | 'warning';
  severity: 'low' | 'medium' | 'high' | 'critical';
  timestamp: string;
  location: LocationData;
  
  // Alert details
  message: string;
  messageThai: string;
  value: number; // Current slope or flow value
  threshold: number; // Threshold that triggered the alert
  
  // Time window
  startTime: string;
  endTime: string;
  duration: number; // minutes
  
  // Safety information
  recommendations: string[];
  recommendationsThai: string[];
  
  // Technical details
  technical: {
    slope: number; // meters per hour
    flowVelocity: number; // meters per second
    tidalPhase: string;
    moonPhase: string;
  };
}

export interface FlowMetrics {
  timestamp: string;
  height: number;
  slope: number; // meters per hour
  flowVelocity: number; // meters per second
  tidalPhase: 'rising' | 'falling' | 'high' | 'low';
  riskLevel: 'safe' | 'caution' | 'danger' | 'extreme';
}

export interface TideAnalysis {
  location: LocationData;
  startTime: string;
  endTime: string;
  metrics: FlowMetrics[];
  alerts: TideAlert[];
  summary: {
    maxSlope: number;
    maxFlowVelocity: number;
    dangerousPeriods: number;
    safePeriods: number;
    overallRisk: 'safe' | 'caution' | 'danger';
  };
}

// Alert thresholds (configurable)
const ALERT_THRESHOLDS = {
  slope: {
    caution: 0.5,    // 0.5 m/hour - moderate slope
    danger: 1.0,      // 1.0 m/hour - steep slope
    extreme: 1.5      // 1.5 m/hour - very steep slope
  },
  flowVelocity: {
    caution: 0.1,    // 0.1 m/s - light current
    danger: 0.3,      // 0.3 m/s - strong current
    extreme: 0.5      // 0.5 m/s - very strong current
  },
  duration: {
    short: 15,        // minutes
    medium: 30,       // minutes
    long: 60          // minutes
  }
};

// Location-specific multipliers
const LOCATION_MULTIPLIERS: Record<string, { slope: number; flow: number }> = {
  // Narrow channels (higher currents)
  'paknam_pran': { slope: 1.5, flow: 2.0 },
  'samut_prakan': { slope: 1.3, flow: 1.8 },
  'chao_phraya': { slope: 1.4, flow: 1.9 },
  
  // Open bays (moderate currents)
  'bangkok': { slope: 1.0, flow: 1.0 },
  'pattaya': { slope: 0.9, flow: 0.8 },
  'hua_hin': { slope: 0.8, flow: 0.7 },
  
  // Andaman coastal areas
  'phuket': { slope: 1.2, flow: 1.4 },
  'krabi': { slope: 1.1, flow: 1.2 },
  'ranong': { slope: 1.3, flow: 1.5 }
};

export class TideSlopeAnalyzer {
  private getLocationMultiplier(lat: number, lon: number): { slope: number; flow: number } {
    // Simple distance-based location matching
    // In production, this would use proper geospatial queries
    
    for (const [location, multiplier] of Object.entries(LOCATION_MULTIPLIERS)) {
      // This is simplified - would use actual coordinates in real implementation
      if (Math.random() > 0.7) { // Simplified location detection
        return multiplier;
      }
    }
    
    return { slope: 1.0, flow: 1.0 }; // Default multiplier
  }
  
  /**
   * Calculate slope and flow metrics for a time period
   */
  async analyzeTideConditions(
    location: LocationData,
    startTime: Date,
    endTime: Date,
    intervalMinutes: number = 15
  ): Promise<TideAnalysis> {
    const metrics: FlowMetrics[] = [];
    const alerts: TideAlert[] = [];
    const multiplier = this.getLocationMultiplier(location.lat, location.lon);
    
    let maxSlope = 0;
    let maxFlowVelocity = 0;
    let dangerousPeriods = 0;
    let safePeriods = 0;
    
    let previousHeight: number | null = null;
    let previousTime: Date | null = null;
    
    const intervalMs = intervalMinutes * 60 * 1000;
    let currentTime = new Date(startTime);
    
    while (currentTime <= endTime) {
      const currentHour = currentTime.getHours() + currentTime.getMinutes() / 60;
      const height = predictTideLevel(currentTime, location, { 
        hour: Math.floor(currentHour), 
        minute: Math.floor((currentHour % 1) * 60) 
      }).level;
      
      let slope = 0;
      let flowVelocity = 0;
      let tidalPhase: 'rising' | 'falling' | 'high' | 'low' = 'rising';
      
      if (previousHeight !== null && previousTime !== null) {
        const timeDiff = (currentTime.getTime() - previousTime.getTime()) / (1000 * 60 * 60); // hours
        const heightDiff = height - previousHeight;
        
        // Calculate slope (meters per hour)
        slope = Math.abs(heightDiff) / timeDiff;
        
        // Calculate flow velocity using simplified continuity equation
        // v = k * sqrt(2 * g * |dh/dt|) where k is location-dependent
        const k = 0.3; // Empirical coefficient for coastal areas
        flowVelocity = k * Math.sqrt(2 * 9.81 * slope) / 3600; // Convert to m/s
        
        // Apply location multipliers
        slope *= multiplier.slope;
        flowVelocity *= multiplier.flow;
        
        // Determine tidal phase
        if (Math.abs(heightDiff) < 0.01) {
          tidalPhase = height > 1.5 ? 'high' : 'low';
        } else {
          tidalPhase = heightDiff > 0 ? 'rising' : 'falling';
        }
      }
      
      // Determine risk level
      let riskLevel: 'safe' | 'caution' | 'danger' | 'extreme' = 'safe';
      if (slope > ALERT_THRESHOLDS.slope.extreme || flowVelocity > ALERT_THRESHOLDS.flowVelocity.extreme) {
        riskLevel = 'extreme';
      } else if (slope > ALERT_THRESHOLDS.slope.danger || flowVelocity > ALERT_THRESHOLDS.flowVelocity.danger) {
        riskLevel = 'danger';
      } else if (slope > ALERT_THRESHOLDS.slope.caution || flowVelocity > ALERT_THRESHOLDS.flowVelocity.caution) {
        riskLevel = 'caution';
      }
      
      const metric: FlowMetrics = {
        timestamp: currentTime.toISOString(),
        height,
        slope,
        flowVelocity,
        tidalPhase,
        riskLevel
      };
      
      metrics.push(metric);
      
      // Update statistics
      maxSlope = Math.max(maxSlope, slope);
      maxFlowVelocity = Math.max(maxFlowVelocity, flowVelocity);
      if (riskLevel === 'danger' || riskLevel === 'extreme') {
        dangerousPeriods++;
      } else {
        safePeriods++;
      }
      
      // Generate alerts for dangerous conditions
      const alert = this.evaluateAlert(metric, location, currentTime);
      if (alert) {
        alerts.push(alert);
      }
      
      previousHeight = height;
      previousTime = currentTime;
      currentTime = new Date(currentTime.getTime() + intervalMs);
    }
    
    // Determine overall risk
    const dangerRatio = dangerousPeriods / metrics.length;
    let overallRisk: 'safe' | 'caution' | 'danger' = 'safe';
    if (dangerRatio > 0.5) {
      overallRisk = 'danger';
    } else if (dangerRatio > 0.2) {
      overallRisk = 'caution';
    }
    
    return {
      location,
      startTime: startTime.toISOString(),
      endTime: endTime.toISOString(),
      metrics,
      alerts,
      summary: {
        maxSlope,
        maxFlowVelocity,
        dangerousPeriods,
        safePeriods,
        overallRisk
      }
    };
  }
  
  /**
   * Evaluate if current conditions trigger an alert
   */
  private evaluateAlert(
    metric: FlowMetrics,
    location: LocationData,
    timestamp: Date
  ): TideAlert | null {
    const { slope, flowVelocity, tidalPhase } = metric;
    
    // Check slope-based alerts
    if (slope >= ALERT_THRESHOLDS.slope.extreme) {
      return this.createAlert(
        'slope',
        'critical',
        location,
        timestamp,
        `Extremely steep tide change: ${slope.toFixed(2)} m/hour`,
        `การเปลี่ยนแปลงน้ำขึ้นน้ำลงอย่างรุนแรง: ${slope.toFixed(2)} เมตร/ชั่วโมง`,
        slope,
        ALERT_THRESHOLDS.slope.extreme,
        tidalPhase,
        slope,
        flowVelocity
      );
    }
    
    // Check flow velocity alerts
    if (flowVelocity >= ALERT_THRESHOLDS.flowVelocity.extreme) {
      return this.createAlert(
        'flow',
        'critical',
        location,
        timestamp,
        `Dangerous tidal current: ${flowVelocity.toFixed(2)} m/s`,
        `กระแสน้ำวนอันตราย: ${flowVelocity.toFixed(2)} เมตร/วินาที`,
        flowVelocity,
        ALERT_THRESHOLDS.flowVelocity.extreme,
        tidalPhase,
        slope,
        flowVelocity
      );
    }
    
    // Combined danger assessment
    if (slope >= ALERT_THRESHOLDS.slope.danger && flowVelocity >= ALERT_THRESHOLDS.flowVelocity.danger) {
      return this.createAlert(
        'danger',
        'high',
        location,
        timestamp,
        `Dangerous tidal conditions: strong currents and rapid level changes`,
        `สภาพการณ์น้ำขึ้นน้ำลงอันตราย: กระแสน้ำแรงและระดับน้ำเปลี่ยนแปลงเร็ว`,
        (slope + flowVelocity) / 2,
        Math.max(ALERT_THRESHOLDS.slope.danger, ALERT_THRESHOLDS.flowVelocity.danger),
        tidalPhase,
        slope,
        flowVelocity
      );
    }
    
    return null;
  }
  
  /**
   * Create alert object with recommendations
   */
  private createAlert(
    type: 'slope' | 'flow' | 'danger' | 'warning',
    severity: 'low' | 'medium' | 'high' | 'critical',
    location: LocationData,
    timestamp: Date,
    message: string,
    messageThai: string,
    value: number,
    threshold: number,
    tidalPhase: string,
    slope: number,
    flowVelocity: number
  ): TideAlert {
    const endTime = new Date(timestamp.getTime() + ALERT_THRESHOLDS.duration.medium * 60 * 1000);
    const duration = ALERT_THRESHOLDS.duration.medium;
    
    const recommendations = this.getRecommendations(type, severity, tidalPhase);
    const recommendationsThai = this.getRecommendationsThai(type, severity, tidalPhase);
    
    return {
      id: `alert_${timestamp.getTime()}_${Math.random().toString(36).substr(2, 9)}`,
      type,
      severity,
      timestamp: timestamp.toISOString(),
      location,
      message,
      messageThai,
      value,
      threshold,
      startTime: timestamp.toISOString(),
      endTime: endTime.toISOString(),
      duration,
      recommendations,
      recommendationsThai,
      technical: {
        slope,
        flowVelocity,
        tidalPhase: tidalPhase as any,
        moonPhase: this.getMoonPhase(timestamp)
      }
    };
  }
  
  /**
   * Get safety recommendations based on alert type and severity
   */
  private getRecommendations(
    type: string,
    severity: string,
    tidalPhase: string
  ): string[] {
    const recommendations: string[] = [];
    
    if (severity === 'critical') {
      recommendations.push('Avoid all marine activities');
      recommendations.push('Stay away from water\'s edge');
      recommendations.push('Monitor conditions continuously');
    } else if (severity === 'high') {
      recommendations.push('Exercise extreme caution');
      recommendations.push('Avoid small boats and swimming');
      recommendations.push('Check local advisories');
    } else if (severity === 'medium') {
      recommendations.push('Be cautious near water');
      recommendations.push('Avoid inexperienced activities');
    }
    
    if (type === 'flow') {
      recommendations.push('Strong currents may affect navigation');
      recommendations.push('Anchor securely if on water');
    }
    
    if (type === 'slope') {
      recommendations.push('Rapid water level changes expected');
      recommendations.push('Secure loose items near shore');
    }
    
    return recommendations;
  }
  
  /**
   * Get Thai safety recommendations
   */
  private getRecommendationsThai(
    type: string,
    severity: string,
    tidalPhase: string
  ): string[] {
    const recommendations: string[] = [];
    
    if (severity === 'critical') {
      recommendations.push('หลีกเลี่ยงกิจกรรมทางทะเลทั้งหมด');
      recommendations.push('อยู่ห่างจากขอบน้ำ');
      recommendations.push('ติดตามสภาพการณ์อย่างต่อเนื่อง');
    } else if (severity === 'high') {
      recommendations.push('ใช้ความระมัดระวังอย่างยิ่ง');
      recommendations.push('หลีกเลี่ยงเรือเล็กและการว่ายน้ำ');
      recommendations.push('ตรวจสอบคำแนะนำในพื้นที่');
    } else if (severity === 'medium') {
      recommendations.push('ระมัดระวังใกล้น้ำ');
      recommendations.push('หลีกเลี่ยงกิจกรรมที่ต้องการประสบการณ์');
    }
    
    if (type === 'flow') {
      recommendations.push('กระแสน้ำแรงอาจส่งผลต่อการเดินเรือ');
      recommendations.push('จอดเรือให้มั่นคงถ้าอยู่บนน้ำ');
    }
    
    if (type === 'slope') {
      recommendations.push('คาดว่าระดับน้ำจะเปลี่ยนแปลงเร็ว');
      recommendations.push('จัดของที่ไม่มั่นคงใกล้ฝั่ง');
    }
    
    return recommendations;
  }
  
  /**
   * Get moon phase for alert context
   */
  private getMoonPhase(date: Date): string {
    // Simplified moon phase calculation
    const phases = ['New Moon', 'Waxing Crescent', 'First Quarter', 'Waxing Gibbous', 
                   'Full Moon', 'Waning Gibbous', 'Last Quarter', 'Waning Crescent'];
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    const day = date.getDate();
    
    const c = Math.floor(365.25 * year);
    const e = Math.floor(30.6 * month);
    const jd = c + e + day - 694039.09; // Julian date
    const phase = (jd + 0.5) % 29.53; // Lunar cycle
    
    const phaseIndex = Math.floor(phase / 29.53 * 8);
    return phases[Math.min(phaseIndex, phases.length - 1)];
  }
  
  /**
   * Get current alert summary for a location
   */
  async getCurrentAlerts(location: LocationData): Promise<TideAlert[]> {
    const now = new Date();
    const endTime = new Date(now.getTime() + 2 * 60 * 60 * 1000); // Next 2 hours
    const analysis = await this.analyzeTideConditions(location, now, endTime);
    
    // Filter for active alerts (current time within alert period)
    const activeAlerts = analysis.alerts.filter(alert => {
      const alertStart = new Date(alert.startTime);
      const alertEnd = new Date(alert.endTime);
      return now >= alertStart && now <= alertEnd;
    });
    
    return activeAlerts;
  }
  
  /**
   * Generate forecast alerts for the next 24 hours
   */
  async generateForecastAlerts(location: LocationData): Promise<TideAlert[]> {
    const now = new Date();
    const endTime = new Date(now.getTime() + 24 * 60 * 60 * 1000); // Next 24 hours
    const analysis = await this.analyzeTideConditions(location, now, endTime, 30); // 30-minute intervals
    
    return analysis.alerts;
  }
}

// Export singleton instance
export const tideSlopeAnalyzer = new TideSlopeAnalyzer();