// WebAssembly Tide Computation Core
// Optimized harmonic synthesis for Thai coastal waters

// TypeScript interface for WASM module
export interface TideWasmModule {
  memory: WebAssembly.Memory;
  // Core computation functions
  predictTideLevel(timestamp: number, lat: number, lng: number): number;
  findExtremes(startTime: number, endTime: number, lat: number, lng: number, maxResults: number): ExtremesResult;
  computeSeries(startTime: number, endTime: number, intervalMinutes: number, lat: number, lng: number): SeriesResult;
  
  // Configuration functions
  setRegion(region: number): void; // 0 = Gulf of Thailand, 1 = Andaman Sea
  setConstituents(count: number, names: string, amplitudes: Float32Array, phases: Float32Array): void;
  setNodalCorrections(year: number, n: number, l: number, lp: number): void;
  
  // Utility functions
  initialize(): number; // Returns 0 on success
  cleanup(): void;
  getVersion(): string;
  
  // Performance monitoring
  getComputationTime(): number;
  resetPerformanceCounters(): void;
}

export interface ExtremesResult {
  count: number;
  times: Float64Array; // Unix timestamps
  heights: Float32Array; // meters
  types: Uint8Array; // 0 = low, 1 = high
}

export interface SeriesResult {
  count: number;
  times: Float64Array;
  heights: Float32Array;
  slopes: Float32Array; // rate of change (m/hour)
}

// WASM loader and manager
export class WasmTideEngine {
  private module: TideWasmModule | null = null;
  private isInitialized = false;
  private initializationPromise: Promise<void> | null = null;
  
  // Region constants
  private readonly REGION_GULF_OF_THAILAND = 0;
  private readonly REGION_ANDAMAN_SEA = 1;
  
  // Default constituents for Thai waters
  private readonly DEFAULT_CONSTITUENTS = [
    { name: 'M2', amplitude: 0.85, phase: 45 },
    { name: 'S2', amplitude: 0.32, phase: 60 },
    { name: 'N2', amplitude: 0.18, phase: 50 },
    { name: 'K2', amplitude: 0.09, phase: 65 },
    { name: 'K1', amplitude: 0.35, phase: 180 },
    { name: 'O1', amplitude: 0.28, phase: 165 },
    { name: 'P1', amplitude: 0.11, phase: 175 },
    { name: 'Q1', amplitude: 0.04, phase: 160 },
    { name: 'M4', amplitude: 0.15, phase: 90 },
    { name: 'M6', amplitude: 0.08, phase: 135 }
  ];
  
  /**
   * Initialize WASM module
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return;
    if (this.initializationPromise) return this.initializationPromise;
    
    this.initializationPromise = this.loadWasmModule();
    await this.initializationPromise;
  }
  
  /**
   * Load WASM module from file or instantiate
   */
  private async loadWasmModule(): Promise<void> {
    try {
      // Try to load existing WASM file
      const wasmUrl = '/tide-computation.wasm';
      const response = await fetch(wasmUrl);
      
      if (response.ok) {
        const wasmBytes = await response.arrayBuffer();
        await this.instantiateWasm(wasmBytes);
      } else {
        // Fallback: create JavaScript implementation
        console.warn('WASM file not found, using JavaScript fallback');
        await this.createJavaScriptFallback();
      }
    } catch (error) {
      console.error('Failed to load WASM module, using JavaScript fallback:', error);
      await this.createJavaScriptFallback();
    }
  }
  
  /**
   * Instantiate WASM module
   */
  private async instantiateWasm(wasmBytes: ArrayBuffer): Promise<void> {
    const importObject = {
      env: {
        memory: new WebAssembly.Memory({ initial: 64, maximum: 512 }),
        abort: () => { throw new Error('WASM aborted'); },
        log: (ptr: number, len: number) => {
          // Simple logging from WASM
          console.log('WASM:', ptr, len);
        }
      }
    };
    
    const result = await WebAssembly.instantiate(wasmBytes, importObject);
    this.module = result.instance.exports as unknown as TideWasmModule;
    
    // Initialize the module
    const initResult = this.module.initialize();
    if (initResult !== 0) {
      throw new Error(`WASM initialization failed with code ${initResult}`);
    }
    
    // Set default constituents
    this.setDefaultConstituents();
    
    this.isInitialized = true;
    console.log('WASM tide engine initialized successfully');
  }
  
  /**
   * Create JavaScript fallback implementation
   */
  private async createJavaScriptFallback(): Promise<void> {
    // Create a mock WASM module using JavaScript
    this.module = new JavaScriptWasmFallback() as unknown as TideWasmModule;
    this.isInitialized = true;
    console.log('JavaScript fallback tide engine initialized');
  }
  
  /**
   * Set default constituents for the module
   */
  private setDefaultConstituents(): void {
    if (!this.module) return;
    
    const names = this.DEFAULT_CONSTITUENTS.map(c => c.name).join(',');
    const amplitudes = new Float32Array(this.DEFAULT_CONSTITUENTS.map(c => c.amplitude));
    const phases = new Float32Array(this.DEFAULT_CONSTITUENTS.map(c => c.phase));
    
    this.module.setConstituents(this.DEFAULT_CONSTITUENTS.length, names, amplitudes, phases);
  }
  
  /**
   * Predict tide level at specific time and location
   */
  predictTideLevel(timestamp: number, lat: number, lng: number): number {
    this.ensureInitialized();
    return this.module!.predictTideLevel(timestamp, lat, lng);
  }
  
  /**
   * Find high and low tide extremes in a time range
   */
  findExtremes(startTime: number, endTime: number, lat: number, lng: number): ExtremesResult {
    this.ensureInitialized();
    return this.module!.findExtremes(startTime, endTime, lat, lng, 20);
  }
  
  /**
   * Compute time series of tide predictions
   */
  computeSeries(
    startTime: number, 
    endTime: number, 
    intervalMinutes: number, 
    lat: number, 
    lng: number
  ): SeriesResult {
    this.ensureInitialized();
    return this.module!.computeSeries(startTime, endTime, intervalMinutes, lat, lng);
  }
  
  /**
   * Set region for location-specific parameters
   */
  setRegion(lat: number, lng: number): void {
    this.ensureInitialized();
    
    // Determine region based on location
    const region = this.determineRegion(lat, lng);
    this.module!.setRegion(region);
  }
  
  /**
   * Get performance metrics
   */
  getPerformanceMetrics(): { computationTime: number; version: string } {
    this.ensureInitialized();
    
    return {
      computationTime: this.module!.getComputationTime(),
      version: this.module!.getVersion()
    };
  }
  
  /**
   * Cleanup resources
   */
  cleanup(): void {
    if (this.module) {
      this.module.cleanup();
      this.module = null;
    }
    this.isInitialized = false;
    this.initializationPromise = null;
  }
  
  private ensureInitialized(): void {
    if (!this.isInitialized || !this.module) {
      throw new Error('WASM tide engine not initialized. Call initialize() first.');
    }
  }
  
  private determineRegion(lat: number, lng: number): number {
    // Andaman Sea: West coast, longitude < 99°E
    if (lng < 99.0 && lat < 12 && lat > 5) {
      return this.REGION_ANDAMAN_SEA;
    }
    
    // Default to Gulf of Thailand
    return this.REGION_GULF_OF_THAILAND;
  }
}

// JavaScript fallback implementation
class JavaScriptWasmFallback {
  public memory = new WebAssembly.Memory({ initial: 64, maximum: 512 });
  private constituents = new Map<string, { amplitude: number; phase: number; frequency: number }>();
  private region = 0;
  private computationTime = 0;
  
  constructor() {
    // Initialize with default constituents
    this.initializeDefaultConstituents();
  }
  
  initialize(): number {
    return 0; // Success
  }
  
  cleanup(): void {
    this.constituents.clear();
  }
  
  getVersion(): string {
    return 'js-fallback-v1.0.0';
  }
  
  getComputationTime(): number {
    return this.computationTime;
  }
  
  resetPerformanceCounters(): void {
    this.computationTime = 0;
  }
  
  setRegion(region: number): void {
    this.region = region;
  }
  
  setConstituents(count: number, names: string, amplitudes: Float32Array, phases: Float32Array): void {
    this.constituents.clear();
    const nameArray = names.split(',');
    
    for (let i = 0; i < count; i++) {
      const name = nameArray[i].trim();
      const frequency = this.getConstituentFrequency(name);
      
      this.constituents.set(name, {
        amplitude: amplitudes[i],
        phase: phases[i],
        frequency
      });
    }
  }
  
  setNodalCorrections(year: number, n: number, l: number, lp: number): void {
    // JavaScript fallback doesn't implement full nodal corrections
    console.log('Nodal corrections not implemented in JS fallback');
  }
  
  predictTideLevel(timestamp: number, lat: number, lng: number): number {
    const startTime = performance.now();
    
    // Simple harmonic synthesis
    let tideLevel = 0.0;
    const hoursSinceEpoch = timestamp / (1000 * 60 * 60);
    
    for (const [name, constituent] of this.constituents) {
      const argument = (constituent.frequency * hoursSinceEpoch + constituent.phase) * Math.PI / 180;
      tideLevel += constituent.amplitude * Math.cos(argument);
    }
    
    this.computationTime += performance.now() - startTime;
    return Number(tideLevel.toFixed(3));
  }
  
  findExtremes(startTime: number, endTime: number, lat: number, lng: number, maxResults: number): ExtremesResult {
    const interval = 15 * 60 * 1000; // 15 minutes
    const times: number[] = [];
    const heights: number[] = [];
    const types: number[] = [];
    
    let prevHeight = this.predictTideLevel(startTime, lat, lng);
    let isRising = true;
    
    for (let time = startTime + interval; time <= endTime; time += interval) {
      const currentHeight = this.predictTideLevel(time, lat, lng);
      const currentlyRising = currentHeight > prevHeight;
      
      // Check for extremum (direction change)
      if (currentlyRising !== isRising) {
        times.push(time - interval); // Approximate extremum time
        heights.push(prevHeight);
        types.push(isRising ? 1 : 0); // 1 = high, 0 = low
        
        if (times.length >= maxResults) break;
      }
      
      prevHeight = currentHeight;
      isRising = currentlyRising;
    }
    
    return {
      count: times.length,
      times: new Float64Array(times),
      heights: new Float32Array(heights),
      types: new Uint8Array(types)
    };
  }
  
  computeSeries(
    startTime: number, 
    endTime: number, 
    intervalMinutes: number, 
    lat: number, 
    lng: number
  ): SeriesResult {
    const interval = intervalMinutes * 60 * 1000;
    const times: number[] = [];
    const heights: number[] = [];
    const slopes: number[] = [];
    
    let prevHeight: number | null = null;
    let prevTime: number | null = null;
    
    for (let time = startTime; time <= endTime; time += interval) {
      const height = this.predictTideLevel(time, lat, lng);
      let slope = 0;
      
      if (prevHeight !== null && prevTime !== null) {
        const timeDiff = (time - prevTime) / (1000 * 60 * 60); // hours
        slope = (height - prevHeight) / timeDiff; // meters per hour
      }
      
      times.push(time);
      heights.push(height);
      slopes.push(slope);
      
      prevHeight = height;
      prevTime = time;
    }
    
    return {
      count: times.length,
      times: new Float64Array(times),
      heights: new Float32Array(heights),
      slopes: new Float32Array(slopes)
    };
  }
  
  private initializeDefaultConstituents(): void {
    // Default Thai waters constituents
    const defaultConstituents = [
      { name: 'M2', amplitude: 0.85, phase: 45, frequency: 28.984104 },
      { name: 'S2', amplitude: 0.32, phase: 60, frequency: 30.0 },
      { name: 'N2', amplitude: 0.18, phase: 50, frequency: 28.43973 },
      { name: 'K2', amplitude: 0.09, phase: 65, frequency: 30.082137 },
      { name: 'K1', amplitude: 0.35, phase: 180, frequency: 15.041069 },
      { name: 'O1', amplitude: 0.28, phase: 165, frequency: 13.943035 },
      { name: 'P1', amplitude: 0.11, phase: 175, frequency: 14.958931 },
      { name: 'Q1', amplitude: 0.04, phase: 160, frequency: 13.398661 },
      { name: 'M4', amplitude: 0.15, phase: 90, frequency: 57.968208 },
      { name: 'M6', amplitude: 0.08, phase: 135, frequency: 86.952312 }
    ];
    
    for (const constituent of defaultConstituents) {
      this.constituents.set(constituent.name, {
        amplitude: constituent.amplitude,
        phase: constituent.phase,
        frequency: constituent.frequency
      });
    }
  }
  
  private getConstituentFrequency(name: string): number {
    const frequencies: Record<string, number> = {
      'M2': 28.984104, 'S2': 30.0, 'N2': 28.43973, 'K2': 30.082137,
      'K1': 15.041069, 'O1': 13.943035, 'P1': 14.958931, 'Q1': 13.398661,
      'M4': 57.968208, 'M6': 86.952312, 'MS4': 58.984104, 'MN4': 57.423834
    };
    return frequencies[name] || 0;
  }
}

// Export singleton instance
export const wasmTideEngine = new WasmTideEngine();