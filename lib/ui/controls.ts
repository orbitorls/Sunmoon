/**
 * Datum, Unit, and Timezone Controls
 * 
 * Provides configurable controls for:
 * - Chart datum reference (MSL, LAT, etc.)
 * - Measurement units (meters, feet)
 * - Timezone display (local, UTC, Thai time)
 * - Number formatting and precision
 */

export interface TideControls {
  // Datum controls
  datum: TideDatum;
  datumOffset: number; // Custom offset in meters
  
  // Unit controls
  heightUnit: HeightUnit;
  speedUnit: SpeedUnit;
  distanceUnit: DistanceUnit;
  temperatureUnit: TemperatureUnit;
  
  // Timezone controls
  timezone: TimezoneDisplay;
  use24Hour: boolean;
  dateFormat: DateFormat;
  
  // Display preferences
  precision: number; // Decimal places for heights
  showConfidenceBands: boolean;
  showFlowArrows: boolean;
  language: 'th' | 'en';
}

export type TideDatum = 
  | 'MSL'      // Mean Sea Level
  | 'CD'       // Chart Datum (กรมอุทกศาสตร์)
  | 'LAT'      // Lowest Astronomical Tide
  | 'HAT'      // Highest Astronomical Tide
  | 'MHHW'     // Mean Higher High Water
  | 'MHW'      // Mean High Water
  | 'MTL'      // Mean Tide Level
  | 'MLW'      // Mean Low Water
  | 'MLLW'     // Mean Lower Low Water
  | 'LOCAL';   // Local custom datum

export type HeightUnit = 'meters' | 'feet' | 'fathoms';
export type SpeedUnit = 'm/s' | 'knots' | 'km/h';
export type DistanceUnit = 'km' | 'nm' | 'miles';
export type TemperatureUnit = 'celsius' | 'fahrenheit';
export type TimezoneDisplay = 'local' | 'utc' | 'thai' | 'auto';
export type DateFormat = 'dd/mm/yyyy' | 'mm/dd/yyyy' | 'yyyy-mm-dd';

// Datum reference levels relative to MSL
export const DATUM_OFFSETS: Record<TideDatum, number> = {
  'MSL': 0.0,        // Mean Sea Level (reference)
  'CD': -0.85,       // Chart Datum (กรมอุทกศาสตร์ - typical for Thai waters)
  'LAT': -1.2,       // Lowest Astronomical Tide (approximate for Thai waters)
  'HAT': 1.5,        // Highest Astronomical Tide (approximate for Thai waters)
  'MHHW': 0.8,       // Mean Higher High Water
  'MHW': 0.6,        // Mean High Water
  'MTL': 0.0,        // Mean Tide Level (same as MSL for most purposes)
  'MLW': -0.4,       // Mean Low Water
  'MLLW': -0.6,      // Mean Lower Low Water
  'LOCAL': 0.0        // Custom local datum (offset applied separately)
};

// Thai timezone definitions
export const THAI_TIMEZONES = {
  ICT: {        // Indochina Time
    name: 'Indochina Time',
    abbreviation: 'ICT',
    offset: +7,    // UTC+7
    regions: ['Bangkok', 'Phuket', 'Pattaya', 'Hua Hin', 'Krabi', 'Samui']
  },
  UTC: {
    name: 'Coordinated Universal Time',
    abbreviation: 'UTC',
    offset: 0,
    regions: ['Maritime', 'International']
  }
};

// Unit conversion factors
export const CONVERSION_FACTORS = {
  height: {
    meters: 1.0,
    feet: 3.28084,
    fathoms: 0.546807
  },
  speed: {
    'm/s': 1.0,
    'knots': 1.94384,
    'km/h': 3.6
  },
  distance: {
    'km': 1.0,
    'nm': 0.539957,
    'miles': 0.621371
  },
  temperature: {
    celsius: 1.0,
    fahrenheit: (c: number) => (c * 9/5) + 32
  }
};

export class TideControlManager {
  private controls: TideControls;
  private readonly STORAGE_KEY = 'sunmoon-tide-controls';
  
  constructor() {
    this.controls = this.loadSettings() || this.getDefaultSettings();
  }
  
  /**
   * Get current control settings
   */
  getSettings(): TideControls {
    return { ...this.controls };
  }
  
  /**
   * Update specific control
   */
  updateSetting<K extends keyof TideControls>(key: K, value: TideControls[K]): void {
    this.controls[key] = value;
    this.saveSettings();
  }
  
  /**
   * Update multiple controls at once
   */
  updateSettings(updates: Partial<TideControls>): void {
    this.controls = { ...this.controls, ...updates };
    this.saveSettings();
  }
  
  /**
   * Convert height from meters to selected unit
   */
  convertHeight(heightInMeters: number, toUnit?: HeightUnit): number {
    const unit = toUnit || this.controls.heightUnit;
    const factor = CONVERSION_FACTORS.height[unit];
    
    return Number((heightInMeters * factor).toFixed(this.controls.precision));
  }
  
  /**
   * Convert speed from m/s to selected unit
   */
  convertSpeed(speedInMetersPerSec: number, toUnit?: SpeedUnit): number {
    const unit = toUnit || this.controls.speedUnit;
    const factor = CONVERSION_FACTORS.speed[unit];
    
    return Number((speedInMetersPerSec * factor).toFixed(this.controls.precision));
  }
  
  /**
   * Convert distance from km to selected unit
   */
  convertDistance(distanceInKm: number, toUnit?: DistanceUnit): number {
    const unit = toUnit || this.controls.distanceUnit;
    const factor = CONVERSION_FACTORS.distance[unit];
    
    return Number((distanceInKm * factor).toFixed(this.controls.precision));
  }
  
  /**
   * Convert temperature from Celsius to selected unit
   */
  convertTemperature(tempInCelsius: number, toUnit?: TemperatureUnit): number {
    const unit = toUnit || this.controls.temperatureUnit;
    
    if (unit === 'fahrenheit') {
      const temp = CONVERSION_FACTORS.temperature.fahrenheit(tempInCelsius);
      return Number(temp.toFixed(this.controls.precision));
    }
    
    return Number(tempInCelsius.toFixed(this.controls.precision));
  }
  
  /**
   * Adjust height for selected datum
   */
  adjustHeightForDatum(heightInMSL: number, toDatum?: TideDatum): number {
    const datum = toDatum || this.controls.datum;
    const datumOffset = DATUM_OFFSETS[datum];
    const customOffset = datum === 'LOCAL' ? this.controls.datumOffset : 0;
    
    return heightInMSL + datumOffset + customOffset;
  }
  
  /**
   * Format height with unit and datum
   */
  formatHeight(height: number, options?: {
    unit?: HeightUnit;
    datum?: TideDatum;
    showDatum?: boolean;
  }): string {
    const unit = options?.unit || this.controls.heightUnit;
    const datum = options?.datum || this.controls.datum;
    const showDatum = options?.showDatum ?? false;
    
    // Adjust for datum
    const adjustedHeight = this.adjustHeightForDatum(height, datum);
    
    // Convert to display unit
    const displayHeight = this.convertHeight(adjustedHeight, unit);
    
    // Get unit symbol
    const unitSymbol = this.getUnitSymbol(unit);
    const datumLabel = showDatum ? ` ${datum}` : '';
    
    return `${displayHeight}${unitSymbol}${datumLabel}`;
  }
  
  /**
   * Format time according to timezone and format preferences
   */
  formatTime(date: Date, options?: {
    timezone?: TimezoneDisplay;
    use24Hour?: boolean;
    showTimezone?: boolean;
  }): string {
    const timezone = options?.timezone || this.controls.timezone;
    const use24Hour = options?.use24Hour ?? this.controls.use24Hour;
    const showTimezone = options?.showTimezone ?? false;
    
    // Get time in target timezone via Intl (avoid manual offset — prevents double conversion)
    const timeOptions: Intl.DateTimeFormatOptions = {
      hour: '2-digit',
      minute: '2-digit',
      hour12: !use24Hour,
      timeZone: this.getTimezoneId(timezone)
    };
    
    let timeString = date.toLocaleTimeString('en-US', timeOptions);
    
    // Add timezone abbreviation if requested
    if (showTimezone) {
      const tzAbbrev = this.getTimezoneAbbreviation(timezone);
      timeString += ` ${tzAbbrev}`;
    }
    
    return timeString;
  }
  
  /**
   * Format date according to preferences
   */
  formatDate(date: Date, options?: {
    format?: DateFormat;
    timezone?: TimezoneDisplay;
    showTimezone?: boolean;
  }): string {
    const format = options?.format || this.controls.dateFormat;
    const timezone = options?.timezone || this.controls.timezone;
    const showTimezone = options?.showTimezone ?? false;
    
    // Format date in target timezone via Intl
    const formatOptions: Intl.DateTimeFormatOptions = {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      timeZone: this.getTimezoneId(timezone)
    };
    
    let dateString = date.toLocaleDateString('en-US', formatOptions);
    
    // Reformat based on custom format
    if (format === 'dd/mm/yyyy') {
      const [month, day, year] = dateString.split('/');
      dateString = `${day}/${month}/${year}`;
    }
    
    // Add timezone if requested
    if (showTimezone) {
      const tzAbbrev = this.getTimezoneAbbreviation(timezone);
      dateString += ` ${tzAbbrev}`;
    }
    
    return dateString;
  }
  
  /**
   * Get localized labels for Thai/English
   */
  getLocalizedLabels(): {
    datum: Record<TideDatum, { en: string; th: string }>;
    units: {
      height: Record<HeightUnit, { en: string; th: string }>;
      speed: Record<SpeedUnit, { en: string; th: string }>;
      distance: Record<DistanceUnit, { en: string; th: string }>;
      temperature: Record<TemperatureUnit, { en: string; th: string }>;
    };
    timezone: Record<TimezoneDisplay, { en: string; th: string }>;
  } {
    const language = this.controls.language;
    
    return {
      datum: {
        'MSL': { en: 'Mean Sea Level', th: 'ระดับน้ำทะเลเฉลี่ยว' },
        'CD': { en: 'Chart Datum', th: 'ฐานอ้างอิงแผนที่ (กรมอุทกศาสตร์)' },
        'LAT': { en: 'Lowest Astronomical Tide', th: 'ระดับน้ำลงต่ำสุดทางดาราศาสตร์' },
        'HAT': { en: 'Highest Astronomical Tide', th: 'ระดับน้ำขึ้นสูงสุดทางดาราศาสตร์' },
        'MHHW': { en: 'Mean Higher High Water', th: 'ระดับน้ำขึ้นสูงสุดเฉลี่ยว' },
        'MHW': { en: 'Mean High Water', th: 'ระดับน้ำขึ้นสูงเฉลี่ยว' },
        'MTL': { en: 'Mean Tide Level', th: 'ระดับน้ำเฉลี่ยว' },
        'MLW': { en: 'Mean Low Water', th: 'ระดับน้ำลงต่ำเฉลี่ยว' },
        'MLLW': { en: 'Mean Lower Low Water', th: 'ระดับน้ำลงต่ำสุดเฉลี่ยว' },
        'LOCAL': { en: 'Local Datum', th: 'ฐานอ้างอิงท้องถิ่น' }
      },
      units: {
        height: {
          'meters': { en: 'meters', th: 'เมตร' },
          'feet': { en: 'feet', th: 'ฟุต' },
          'fathoms': { en: 'fathoms', th: 'ฟาธอม' }
        },
        speed: {
          'm/s': { en: 'm/s', th: 'เมตร/วินาที' },
          'knots': { en: 'knots', th: 'นอต' },
          'km/h': { en: 'km/h', th: 'กม./ชม.' }
        },
        distance: {
          'km': { en: 'km', th: 'กม.' },
          'nm': { en: 'nm', th: 'ไมล์ทะเล' },
          'miles': { en: 'miles', th: 'ไมล์' }
        },
        temperature: {
          'celsius': { en: '°C', th: '°C' },
          'fahrenheit': { en: '°F', th: '°F' }
        }
      },
      timezone: {
        'local': { en: 'Local Time', th: 'เวลาท้องถิ่น' },
        'utc': { en: 'UTC', th: 'UTC' },
        'thai': { en: 'Thai Time (ICT)', th: 'เวลาไทย (ICT)' },
        'auto': { en: 'Auto-detect', th: 'ตรวจสอบอัตโนมัติ' }
      }
    };
  }
  
  /**
   * Get default settings
   */
  private getDefaultSettings(): TideControls {
    return {
      datum: 'CD',
      datumOffset: 0.0,
      heightUnit: 'meters',
      speedUnit: 'm/s',
      distanceUnit: 'km',
      temperatureUnit: 'celsius',
      timezone: 'thai',
      use24Hour: true,
      dateFormat: 'dd/mm/yyyy',
      precision: 2,
      showConfidenceBands: true,
      showFlowArrows: true,
      language: 'th'
    };
  }
  
  /**
   * Load settings from localStorage
   */
  private loadSettings(): TideControls | null {
    if (typeof window === 'undefined') return null;
    
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      return stored ? JSON.parse(stored) : null;
    } catch (error) {
      console.error('Failed to load tide control settings:', error);
      return null;
    }
  }
  
  /**
   * Save settings to localStorage
   */
  private saveSettings(): void {
    if (typeof window === 'undefined') return;
    
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.controls));
    } catch (error) {
      console.error('Failed to save tide control settings:', error);
    }
  }
  
  /**
   * Get unit symbol
   */
  private getUnitSymbol(unit: HeightUnit | SpeedUnit | DistanceUnit): string {
    const symbols: Record<string, string> = {
      'meters': 'm',
      'feet': 'ft',
      'fathoms': 'f',
      'm/s': 'm/s',
      'knots': 'kn',
      'km/h': 'km/h',
      'km': 'km',
      'nm': 'nm',
      'miles': 'mi',
      'celsius': '°C',
      'fahrenheit': '°F'
    };
    
    return symbols[unit] || unit;
  }
  
  /**
   * Get timezone ID for Intl formatting
   */
  private getTimezoneId(timezone: TimezoneDisplay): string {
    switch (timezone) {
      case 'utc': return 'UTC';
      case 'thai': return 'Asia/Bangkok';
      case 'local':
      case 'auto': return Intl.DateTimeFormat().resolvedOptions().timeZone;
      default: return 'UTC';
    }
  }
  
  /**
   * Get timezone abbreviation
   */
  private getTimezoneAbbreviation(timezone: TimezoneDisplay): string {
    switch (timezone) {
      case 'utc': return 'UTC';
      case 'thai': return 'ICT';
      case 'auto': return 'Local';
      default: return timezone;
    }
  }
  
  /**
   * Reset to default settings
   */
  resetToDefaults(): void {
    this.controls = this.getDefaultSettings();
    this.saveSettings();
  }
  
  /**
   * Export settings as JSON
   */
  exportSettings(): string {
    return JSON.stringify(this.controls, null, 2);
  }
  
  /**
   * Import settings from JSON
   */
  importSettings(json: string): boolean {
    try {
      const imported = JSON.parse(json);
      this.updateSettings(imported);
      return true;
    } catch (error) {
      console.error('Failed to import tide control settings:', error);
      return false;
    }
  }
}

// Export singleton instance
export const tideControlManager = new TideControlManager();