/**
 * Tile Compression Utility
 * Optimizes tile data compression for efficient storage and transfer
 */

import pako from 'pako';

interface TileData {
  tileId: string;
  metadata: TileMetadata;
  constituents: CompressedConstituent[];
  harmonicData: number[];
}

interface TileMetadata {
  bounds: {
    north: number;
    south: number;
    east: number;
    west: number;
  };
  resolution: number;
  timestamp: string;
  accuracy: {
    heightRMSE: number;
    timeRMSE: number;
    confidence: number;
  };
}

interface CompressedConstituent {
  name: string;
  amplitude: number;
  phaseLag: number;
  quality: number;
}

interface CompressionConfig {
  level?: number;
  threshold?: number;
  strategy?: 'speed' | 'size' | 'balanced';
  enableDeltaEncoding?: boolean;
  enableQuantization?: boolean;
  quantizationBits?: number;
}

interface CompressionResult {
  compressed: Uint8Array;
  originalSize: number;
  compressedSize: number;
  ratio: number;
  compressionTime: number;
  algorithm: string;
}

interface DecompressionResult {
  data: any;
  decompressionTime: number;
  originalSize: number;
  decompressedSize: number;
}

const DEFAULT_COMPRESSION_CONFIG: CompressionConfig = {
  level: 6,
  threshold: 1024,
  strategy: 'balanced',
  enableDeltaEncoding: true,
  enableQuantization: true,
  quantizationBits: 12,
};

const COMPRESSION_STRATEGIES = {
  speed: { level: 1, threshold: 2048 },
  balanced: { level: 6, threshold: 1024 },
  size: { level: 9, threshold: 512 },
};

export class TileCompressionService {
  private config: CompressionConfig;
  private compressionStats: Map<string, CompressionResult> = new Map();
  private quantizationMap: Map<string, { min: number; max: number }> = new Map();

  constructor(config?: CompressionConfig) {
    this.config = { ...DEFAULT_COMPRESSION_CONFIG, ...config };
  }

  updateConfig(config: Partial<CompressionConfig>): void {
    this.config = { ...this.config, ...config };
  }

  compress<T>(data: T, tileId?: string): CompressionResult {
    const startTime = performance.now();
    const jsonString = JSON.stringify(data);
    const originalSize = new TextEncoder().encode(jsonString).length;
    
    let compressed: Uint8Array;
    let algorithm = 'gzip';
    const level = this.config.level ?? 6;
    
    if (this.config.enableDeltaEncoding && Array.isArray(data)) {
      const deltaData = this.applyDeltaEncoding(data as number[]);
      const deltaJson = JSON.stringify(deltaData);
      compressed = pako.gzip(deltaJson, { level: level as 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 });
    } else {
      compressed = pako.gzip(jsonString, { level: level as 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 });
    }
    
    if (this.config.enableQuantization && typeof data === 'object') {
      const quantized = this.applyQuantization(data);
      const quantizedJson = JSON.stringify(quantized);
      const level = this.config.level ?? 6;
      const quantizedCompressed = pako.gzip(quantizedJson, { level: level as 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 });
      
      if (quantizedCompressed.length < compressed.length) {
        compressed = quantizedCompressed;
        algorithm = 'gzip+quantized';
      }
    }
    
    const endTime = performance.now();
    const ratio = originalSize > 0 ? (1 - compressed.length / originalSize) * 100 : 0;
    
    const result: CompressionResult = {
      compressed,
      originalSize,
      compressedSize: compressed.length,
      ratio,
      compressionTime: endTime - startTime,
      algorithm,
    };
    
    if (tileId) {
      this.compressionStats.set(tileId, result);
    }
    
    return result;
  }

  private applyDeltaEncoding(data: number[]): number[] {
    if (data.length < 2) return data;
    
    const delta: number[] = [data[0]];
    for (let i = 1; i < data.length; i++) {
      delta.push(data[i] - data[i - 1]);
    }
    
    return delta;
  }

  private applyQuantization(data: any): any {
    if (Array.isArray(data)) {
      const quantizeValue = (value: number): number => {
        if (typeof value !== 'number' || isNaN(value)) return value;
        
        const key = 'default';
        let range = this.quantizationMap.get(key);
        
        if (!range) {
          range = { min: -5, max: 5 };
          this.quantizationMap.set(key, range);
        }
        
        const { min, max } = range;
        const bits = this.config.quantizationBits || 12;
        const steps = Math.pow(2, bits) - 1;
        
        const normalized = Math.max(0, Math.min(1, (value - min) / (max - min)));
        const quantized = Math.round(normalized * steps);
        const dequantized = min + (quantized / steps) * (max - min);
        
        return Math.round(dequantized * 1000) / 1000;
      };
      
      return data.map(item => 
        typeof item === 'number' ? quantizeValue(item) : item
      );
    }
    
    if (typeof data === 'object' && data !== null) {
      const quantized: any = {};
      for (const [key, value] of Object.entries(data)) {
        if (typeof value === 'number') {
          quantized[key] = this.applyQuantization(value);
        } else if (Array.isArray(value)) {
          quantized[key] = this.applyQuantization(value);
        } else {
          quantized[key] = value;
        }
      }
      return quantized;
    }
    
    return data;
  }

  decompress(compressed: Uint8Array, originalType?: any): DecompressionResult {
    const startTime = performance.now();
    const decompressedJson = pako.ungzip(compressed, { to: 'string' });
    const decompressedSize = new TextEncoder().encode(decompressedJson).length;
    const data = JSON.parse(decompressedJson);
    const endTime = performance.now();
    
    return {
      data,
      decompressionTime: endTime - startTime,
      originalSize: compressed.length,
      decompressedSize,
    };
  }

  compressTile(tile: TileData, tileId?: string): CompressionResult {
    const optimizedTile = this.optimizeTileData(tile);
    return this.compress(optimizedTile, tileId);
  }

  private optimizeTileData(tile: TileData): any {
    const { metadata, constituents, harmonicData } = tile;
    
    const optimized = {
      m: metadata,
      c: constituents.map(c => ({
        n: c.name.substring(0, 2),
        a: Math.round(c.amplitude * 1000) / 1000,
        p: Math.round(c.phaseLag * 10) / 10,
        q: Math.round(c.quality * 100) / 100,
      })),
      h: this.encodeHarmonicData(harmonicData),
    };
    
    return optimized;
  }

  private encodeHarmonicData(data: number[]): string {
    if (data.length === 0) return '';
    
    const deltas = this.applyDeltaEncoding(data);
    const encoded = deltas.map((val, idx) => {
      if (idx === 0) return val.toFixed(4);
      const sign = val >= 0 ? '+' : '';
      return sign + val.toFixed(4);
    }).join(',');
    
    return encoded;
  }

  getCompressionRatio(tileId: string): number {
    const stats = this.compressionStats.get(tileId);
    return stats?.ratio || 0;
  }

  getAverageCompressionRatio(): number {
    const ratios = Array.from(this.compressionStats.values()).map(s => s.ratio);
    if (ratios.length === 0) return 0;
    
    return ratios.reduce((sum, r) => sum + r, 0) / ratios.length;
  }

  getTotalSavings(): { original: number; compressed: number; saved: number } {
    let original = 0;
    let compressed = 0;
    
    this.compressionStats.forEach(stats => {
      original += stats.originalSize;
      compressed += stats.compressedSize;
    });
    
    return {
      original,
      compressed,
      saved: original - compressed,
    };
  }

  getOptimalCompressionLevel(dataSize: number): number {
    if (dataSize < 1024) return 1;
    if (dataSize < 10240) return 4;
    if (dataSize < 102400) return 6;
    return 9;
  }

  calculateOptimalStrategy(dataSize: number): 'speed' | 'size' | 'balanced' {
    if (dataSize < 2048) return 'speed';
    if (dataSize > 102400) return 'size';
    return 'balanced';
  }
}

export const tileCompression = new TileCompressionService();

export function createCompressedTile(
  tileId: string,
  metadata: TileMetadata,
  constituents: CompressedConstituent[],
  harmonicData: number[],
  config?: CompressionConfig
): { tile: TileData; compression: CompressionResult } {
  const service = new TileCompressionService(config);
  
  const tile: TileData = {
    tileId,
    metadata,
    constituents,
    harmonicData,
  };
  
  const compression = service.compressTile(tile, tileId);
  
  return { tile, compression };
}

export function decompressTile(
  compressedData: Uint8Array
): DecompressionResult {
  const service = new TileCompressionService();
  return service.decompress(compressedData);
}

export function calculateCompressionEfficiency(
  originalSize: number,
  compressedSize: number
): { ratio: number; percentage: string; efficiency: 'excellent' | 'good' | 'fair' | 'poor' } {
  const ratio = originalSize > 0 ? compressedSize / originalSize : 1;
  const percentage = (1 - ratio) * 100;
  
  let efficiency: 'excellent' | 'good' | 'fair' | 'poor';
  if (percentage > 70) efficiency = 'excellent';
  else if (percentage > 50) efficiency = 'good';
  else if (percentage > 30) efficiency = 'fair';
  else efficiency = 'poor';
  
  return { ratio, percentage: percentage.toFixed(1) + '%', efficiency };
}

export type { TileData, TileMetadata, CompressedConstituent, CompressionConfig, CompressionResult, DecompressionResult };
