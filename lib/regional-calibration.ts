/**
 * Regional Calibration Configuration
 * Optimized calibration values for Gulf of Thailand and Andaman Sea
 */

export interface RegionalCalibration {
  region: 'gulf' | 'andaman';
  zone: string;
  
  constituentCorrections: {
    M2: { amplitudeCorrection: number; phaseCorrection: number; confidence: number };
    S2: { amplitudeCorrection: number; phaseCorrection: number; confidence: number };
    N2: { amplitudeCorrection: number; phaseCorrection: number; confidence: number };
    K1: { amplitudeCorrection: number; phaseCorrection: number; confidence: number };
    O1: { amplitudeCorrection: number; phaseCorrection: number; confidence: number };
    P1: { amplitudeCorrection: number; phaseCorrection: number; confidence: number };
    K2: { amplitudeCorrection: number; phaseCorrection: number; confidence: number };
    M4: { amplitudeCorrection: number; phaseCorrection: number; confidence: number };
  };
  
  regionalBias: {
    datumOffset: number;
    timeLag: number;
    amplitudeScale: number;
  };
  
  qualityThresholds: {
    targetRMSE: number;
    targetMAE: number;
    targetCoverage95: number;
    targetCoverage68: number;
  };
  
  environmentalFactors: {
    seasonalVariation: boolean;
    monsoonAdjustment: boolean;
    resonanceCorrection: boolean;
  };
}

export const REGIONAL_CALIBRATIONS: Record<string, RegionalCalibration> = {
  'gulf-upper': {
    region: 'gulf',
    zone: 'Upper Gulf (Bangkok - Samut Prakan)',
    constituentCorrections: {
      M2: { amplitudeCorrection: 0.02, phaseCorrection: 3.5, confidence: 0.92 },
      S2: { amplitudeCorrection: 0.015, phaseCorrection: 2.0, confidence: 0.88 },
      N2: { amplitudeCorrection: 0.01, phaseCorrection: 2.5, confidence: 0.85 },
      K1: { amplitudeCorrection: 0.018, phaseCorrection: 4.0, confidence: 0.90 },
      O1: { amplitudeCorrection: 0.012, phaseCorrection: 3.0, confidence: 0.87 },
      P1: { amplitudeCorrection: 0.008, phaseCorrection: 2.0, confidence: 0.82 },
      K2: { amplitudeCorrection: 0.005, phaseCorrection: 1.5, confidence: 0.78 },
      M4: { amplitudeCorrection: 0.03, phaseCorrection: 5.0, confidence: 0.75 },
    },
    regionalBias: {
      datumOffset: 0.035,
      timeLag: 2.5,
      amplitudeScale: 1.015,
    },
    qualityThresholds: {
      targetRMSE: 0.08,
      targetMAE: 0.06,
      targetCoverage95: 90,
      targetCoverage68: 75,
    },
    environmentalFactors: {
      seasonalVariation: true,
      monsoonAdjustment: true,
      resonanceCorrection: true,
    },
  },
  'gulf-middle': {
    region: 'gulf',
    zone: 'Middle Gulf (Rayong - Chumphon)',
    constituentCorrections: {
      M2: { amplitudeCorrection: 0.015, phaseCorrection: 2.8, confidence: 0.94 },
      S2: { amplitudeCorrection: 0.012, phaseCorrection: 1.8, confidence: 0.90 },
      N2: { amplitudeCorrection: 0.008, phaseCorrection: 2.0, confidence: 0.87 },
      K1: { amplitudeCorrection: 0.014, phaseCorrection: 3.2, confidence: 0.92 },
      O1: { amplitudeCorrection: 0.010, phaseCorrection: 2.5, confidence: 0.89 },
      P1: { amplitudeCorrection: 0.006, phaseCorrection: 1.8, confidence: 0.84 },
      K2: { amplitudeCorrection: 0.004, phaseCorrection: 1.2, confidence: 0.80 },
      M4: { amplitudeCorrection: 0.025, phaseCorrection: 4.0, confidence: 0.78 },
    },
    regionalBias: {
      datumOffset: 0.025,
      timeLag: 2.0,
      amplitudeScale: 1.010,
    },
    qualityThresholds: {
      targetRMSE: 0.07,
      targetMAE: 0.05,
      targetCoverage95: 92,
      targetCoverage68: 78,
    },
    environmentalFactors: {
      seasonalVariation: true,
      monsoonAdjustment: true,
      resonanceCorrection: true,
    },
  },
  'gulf-lower': {
    region: 'gulf',
    zone: 'Lower Gulf (Nakhon Si Thammarat - Pattani)',
    constituentCorrections: {
      M2: { amplitudeCorrection: 0.018, phaseCorrection: 3.0, confidence: 0.91 },
      S2: { amplitudeCorrection: 0.014, phaseCorrection: 2.2, confidence: 0.87 },
      N2: { amplitudeCorrection: 0.009, phaseCorrection: 2.3, confidence: 0.84 },
      K1: { amplitudeCorrection: 0.016, phaseCorrection: 3.5, confidence: 0.88 },
      O1: { amplitudeCorrection: 0.011, phaseCorrection: 2.8, confidence: 0.85 },
      P1: { amplitudeCorrection: 0.007, phaseCorrection: 1.9, confidence: 0.81 },
      K2: { amplitudeCorrection: 0.004, phaseCorrection: 1.4, confidence: 0.77 },
      M4: { amplitudeCorrection: 0.028, phaseCorrection: 4.5, confidence: 0.74 },
    },
    regionalBias: {
      datumOffset: 0.030,
      timeLag: 2.3,
      amplitudeScale: 1.012,
    },
    qualityThresholds: {
      targetRMSE: 0.075,
      targetMAE: 0.055,
      targetCoverage95: 88,
      targetCoverage68: 72,
    },
    environmentalFactors: {
      seasonalVariation: true,
      monsoonAdjustment: true,
      resonanceCorrection: true,
    },
  },
  'andaman-north': {
    region: 'andaman',
    zone: 'Northern Andaman (Ranong - Phang Nga)',
    constituentCorrections: {
      M2: { amplitudeCorrection: 0.012, phaseCorrection: 2.5, confidence: 0.95 },
      S2: { amplitudeCorrection: 0.010, phaseCorrection: 1.5, confidence: 0.92 },
      N2: { amplitudeCorrection: 0.006, phaseCorrection: 1.8, confidence: 0.89 },
      K1: { amplitudeCorrection: 0.012, phaseCorrection: 2.8, confidence: 0.93 },
      O1: { amplitudeCorrection: 0.008, phaseCorrection: 2.2, confidence: 0.90 },
      P1: { amplitudeCorrection: 0.005, phaseCorrection: 1.5, confidence: 0.86 },
      K2: { amplitudeCorrection: 0.003, phaseCorrection: 1.0, confidence: 0.82 },
      M4: { amplitudeCorrection: 0.020, phaseCorrection: 3.5, confidence: 0.80 },
    },
    regionalBias: {
      datumOffset: 0.020,
      timeLag: 1.8,
      amplitudeScale: 1.008,
    },
    qualityThresholds: {
      targetRMSE: 0.065,
      targetMAE: 0.048,
      targetCoverage95: 94,
      targetCoverage68: 80,
    },
    environmentalFactors: {
      seasonalVariation: false,
      monsoonAdjustment: true,
      resonanceCorrection: false,
    },
  },
  'andaman-phuket': {
    region: 'andaman',
    zone: 'Phuket Andaman (Phuket - Krabi)',
    constituentCorrections: {
      M2: { amplitudeCorrection: 0.010, phaseCorrection: 2.2, confidence: 0.96 },
      S2: { amplitudeCorrection: 0.008, phaseCorrection: 1.3, confidence: 0.93 },
      N2: { amplitudeCorrection: 0.005, phaseCorrection: 1.5, confidence: 0.90 },
      K1: { amplitudeCorrection: 0.010, phaseCorrection: 2.5, confidence: 0.94 },
      O1: { amplitudeCorrection: 0.007, phaseCorrection: 2.0, confidence: 0.91 },
      P1: { amplitudeCorrection: 0.004, phaseCorrection: 1.3, confidence: 0.87 },
      K2: { amplitudeCorrection: 0.002, phaseCorrection: 0.8, confidence: 0.83 },
      M4: { amplitudeCorrection: 0.018, phaseCorrection: 3.0, confidence: 0.81 },
    },
    regionalBias: {
      datumOffset: 0.015,
      timeLag: 1.5,
      amplitudeScale: 1.005,
    },
    qualityThresholds: {
      targetRMSE: 0.060,
      targetMAE: 0.045,
      targetCoverage95: 95,
      targetCoverage68: 82,
    },
    environmentalFactors: {
      seasonalVariation: false,
      monsoonAdjustment: false,
      resonanceCorrection: false,
    },
  },
  'andaman-south': {
    region: 'andaman',
    zone: 'Southern Andaman (Trang - Satun)',
    constituentCorrections: {
      M2: { amplitudeCorrection: 0.014, phaseCorrection: 2.8, confidence: 0.93 },
      S2: { amplitudeCorrection: 0.011, phaseCorrection: 1.8, confidence: 0.90 },
      N2: { amplitudeCorrection: 0.007, phaseCorrection: 2.0, confidence: 0.87 },
      K1: { amplitudeCorrection: 0.013, phaseCorrection: 3.0, confidence: 0.91 },
      O1: { amplitudeCorrection: 0.009, phaseCorrection: 2.4, confidence: 0.88 },
      P1: { amplitudeCorrection: 0.006, phaseCorrection: 1.6, confidence: 0.84 },
      K2: { amplitudeCorrection: 0.003, phaseCorrection: 1.1, confidence: 0.80 },
      M4: { amplitudeCorrection: 0.022, phaseCorrection: 4.0, confidence: 0.77 },
    },
    regionalBias: {
      datumOffset: 0.022,
      timeLag: 2.0,
      amplitudeScale: 1.009,
    },
    qualityThresholds: {
      targetRMSE: 0.070,
      targetMAE: 0.052,
      targetCoverage95: 91,
      targetCoverage68: 76,
    },
    environmentalFactors: {
      seasonalVariation: true,
      monsoonAdjustment: true,
      resonanceCorrection: true,
    },
  },
};

export function getRegionalCalibration(lat: number, lon: number): RegionalCalibration {
  if (lon >= 99 && lon <= 102 && lat >= 5 && lat <= 15) {
    if (lat >= 12) return REGIONAL_CALIBRATIONS['gulf-upper'];
    if (lat >= 9.5) return REGIONAL_CALIBRATIONS['gulf-middle'];
    return REGIONAL_CALIBRATIONS['gulf-lower'];
  }
  
  if (lon >= 98 && lon <= 101 && lat >= 6 && lat <= 12) {
    if (lat >= 10) return REGIONAL_CALIBRATIONS['andaman-north'];
    if (lat >= 8) return REGIONAL_CALIBRATIONS['andaman-phuket'];
    return REGIONAL_CALIBRATIONS['andaman-south'];
  }
  
  return REGIONAL_CALIBRATIONS['gulf-middle'];
}

export function applyRegionalCorrection(
  constituent: string,
  amplitude: number,
  phaseLag: number,
  lat: number,
  lon: number
): { correctedAmplitude: number; correctedPhaseLag: number } {
  const calibration = getRegionalCalibration(lat, lon);
  const correction = calibration.constituentCorrections[constituent as keyof typeof calibration.constituentCorrections];
  
  if (!correction) {
    return { correctedAmplitude: amplitude, correctedPhaseLag: phaseLag };
  }
  
  return {
    correctedAmplitude: amplitude * (1 + correction.amplitudeCorrection) * calibration.regionalBias.amplitudeScale,
    correctedPhaseLag: phaseLag + correction.phaseCorrection + calibration.regionalBias.timeLag,
  };
}

export function getCalibrationQuality(rmse: number, mae: number, region: string): 'excellent' | 'good' | 'fair' | 'poor' {
  const calibration = Object.values(REGIONAL_CALIBRATIONS).find(c => c.zone.includes(region));
  const thresholds = calibration?.qualityThresholds || { targetRMSE: 0.08, targetMAE: 0.06 };
  
  if (rmse <= thresholds.targetRMSE * 0.8 && mae <= thresholds.targetMAE * 0.8) return 'excellent';
  if (rmse <= thresholds.targetRMSE && mae <= thresholds.targetMAE) return 'good';
  if (rmse <= thresholds.targetRMSE * 1.3 && mae <= thresholds.targetMAE * 1.3) return 'fair';
  return 'poor';
}

export function getSeasonalAdjustment(month: number, region: string): number {
  const calibration = Object.values(REGIONAL_CALIBRATIONS).find(c => c.zone.includes(region));
  
  if (!calibration?.environmentalFactors.seasonalVariation) return 1.0;
  
  const monsoonMonths = [5, 6, 7, 8, 9, 10];
  if (monsoonMonths.includes(month)) {
    return 1.02;
  }
  
  const dryMonths = [11, 12, 1, 2, 3, 4];
  if (dryMonths.includes(month)) {
    return 0.98;
  }
  
  return 1.0;
}

