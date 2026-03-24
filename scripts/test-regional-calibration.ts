/**
 * Regional calibration validation for Thai coastal waters
 * Tests against known tidal patterns and regional characteristics
 */

import { predictTideLevel, findTideExtremes } from '../lib/harmonic-engine';

interface TestLocation {
  name: string;
  lat: number;
  lon: number;
  expectedPattern: 'diurnal' | 'semidiurnal' | 'mixed';
  expectedRange: { min: number; max: number };
  expectedMeanLevel: { min: number; max: number };
}

const testLocations: TestLocation[] = [
  {
    name: 'Bangkok (Upper Gulf)',
    lat: 13.7563,
    lon: 100.5018,
    expectedPattern: 'diurnal',
    expectedRange: { min: 1.5, max: 2.5 },
    expectedMeanLevel: { min: 1.0, max: 1.8 }
  },
  {
    name: 'Samut Prakan (Gulf)',
    lat: 13.5994,
    lon: 100.5989,
    expectedPattern: 'diurnal',
    expectedRange: { min: 1.5, max: 2.5 },
    expectedMeanLevel: { min: 1.0, max: 1.8 }
  },
  {
    name: 'Phuket (Andaman Sea)',
    lat: 7.8804,
    lon: 98.3923,
    expectedPattern: 'semidiurnal',
    expectedRange: { min: 2.0, max: 3.5 },
    expectedMeanLevel: { min: 1.5, max: 2.5 }
  },
  {
    name: 'Krabi (Andaman Sea)',
    lat: 8.0863,
    lon: 98.9063,
    expectedPattern: 'semidiurnal',
    expectedRange: { min: 2.0, max: 3.5 },
    expectedMeanLevel: { min: 1.5, max: 2.5 }
  },
  {
    name: 'Songkhla (Lower Gulf)',
    lat: 7.1688,
    lon: 100.6004,
    expectedPattern: 'mixed',
    expectedRange: { min: 1.0, max: 2.0 },
    expectedMeanLevel: { min: 0.8, max: 1.5 }
  }
];

function analyzeTidalPattern(extremes: any[]): 'diurnal' | 'semidiurnal' | 'mixed' {
  const highTides = extremes.filter(e => e.type === 'high').length;
  const lowTides = extremes.filter(e => e.type === 'low').length;
  
  if (highTides === 1 && lowTides === 1) {
    return 'diurnal';
  } else if (highTides === 2 && lowTides === 2) {
    return 'semidiurnal';
  } else {
    return 'mixed';
  }
}

function calculateDailyStats(location: TestLocation, date: Date): {
  range: number;
  meanLevel: number;
  pattern: string;
} {
  const extremes = findTideExtremes(date, { lat: location.lat, lon: location.lon, name: location.name });
  
  if (extremes.length === 0) {
    return { range: 0, meanLevel: 0, pattern: 'none' };
  }
  
  const highTides = extremes.filter(e => e.type === 'high');
  const lowTides = extremes.filter(e => e.type === 'low');
  
  const avgHigh = highTides.length > 0 ? highTides.reduce((sum, e) => sum + e.level, 0) / highTides.length : 0;
  const avgLow = lowTides.length > 0 ? lowTides.reduce((sum, e) => sum + e.level, 0) / lowTides.length : 0;
  
  const range = avgHigh - avgLow;
  const meanLevel = (avgHigh + avgLow) / 2;
  const pattern = analyzeTidalPattern(extremes);
  
  return { range, meanLevel, pattern };
}

function runRegionalValidation() {
  console.group('🌏 Regional Validation - Thai Coastal Waters');
  
  const testDate = new Date('2025-01-09');
  let passedTests = 0;
  let totalTests = 0;
  
  for (const location of testLocations) {
    console.log(`\n📍 ${location.name}`);
    console.log(`   Coordinates: ${location.lat.toFixed(4)}°N, ${location.lon.toFixed(4)}°E`);
    console.log(`   Expected: ${location.expectedPattern} pattern, range ${location.expectedRange.min}-${location.expectedRange.max}m`);
    
    const stats = calculateDailyStats(location, testDate);
    console.log(`   Actual: ${stats.pattern} pattern, range ${stats.range.toFixed(2)}m, mean level ${stats.meanLevel.toFixed(2)}m`);
    
    // Test 1: Pattern validation
    totalTests++;
    const patternOk = stats.pattern === location.expectedPattern || 
                     (location.expectedPattern === 'mixed' && (stats.pattern === 'diurnal' || stats.pattern === 'semidiurnal'));
    if (patternOk) {
      console.log(`   ✅ Pattern: ${stats.pattern} matches expected ${location.expectedPattern}`);
      passedTests++;
    } else {
      console.log(`   ❌ Pattern: ${stats.pattern} does not match expected ${location.expectedPattern}`);
    }
    
    // Test 2: Range validation
    totalTests++;
    const rangeOk = stats.range >= location.expectedRange.min && stats.range <= location.expectedRange.max;
    if (rangeOk) {
      console.log(`   ✅ Range: ${stats.range.toFixed(2)}m within expected ${location.expectedRange.min}-${location.expectedRange.max}m`);
      passedTests++;
    } else {
      console.log(`   ❌ Range: ${stats.range.toFixed(2)}m outside expected ${location.expectedRange.min}-${location.expectedRange.max}m`);
    }
    
    // Test 3: Mean level validation
    totalTests++;
    const meanOk = stats.meanLevel >= location.expectedMeanLevel.min && stats.meanLevel <= location.expectedMeanLevel.max;
    if (meanOk) {
      console.log(`   ✅ Mean level: ${stats.meanLevel.toFixed(2)}m within expected ${location.expectedMeanLevel.min}-${location.expectedMeanLevel.max}m`);
      passedTests++;
    } else {
      console.log(`   ❌ Mean level: ${stats.meanLevel.toFixed(2)}m outside expected ${location.expectedMeanLevel.min}-${location.expectedMeanLevel.max}m`);
    }
    
    // Additional: Show extreme details
    const extremes = findTideExtremes(testDate, { lat: location.lat, lon: location.lon, name: location.name });
    if (extremes.length > 0) {
      console.log(`   📊 Extremes:`);
      extremes.forEach((extreme, i) => {
        console.log(`      ${i + 1}. ${extreme.time} - ${extreme.type.toUpperCase()} at ${extreme.level.toFixed(2)}m`);
      });
    }
  }
  
  console.log(`\n📊 Overall Results: ${passedTests}/${totalTests} tests passed (${((passedTests/totalTests) * 100).toFixed(1)}%)`);
  
  if (passedTests === totalTests) {
    console.log('🎉 All regional validation tests passed!');
  } else {
    console.log('⚠️ Some regional characteristics need calibration');
  }
  
  console.groupEnd();
}

// Test seasonal variations
function testSeasonalVariations() {
  console.log('\n📅 Testing Seasonal Variations');
  
  const seasons = [
    { name: 'Winter', date: new Date('2025-01-15') },
    { name: 'Spring', date: new Date('2025-04-15') },
    { name: 'Summer', date: new Date('2025-07-15') },
    { name: 'Fall', date: new Date('2025-10-15') }
  ];
  
  const testLocation = testLocations[0]; // Bangkok
  
  const seasonalRanges = seasons.map(season => {
    const stats = calculateDailyStats(testLocation, season.date);
    return { season: season.name, range: stats.range, meanLevel: stats.meanLevel };
  });
  
  console.log(`\n🌊 Bangkok Seasonal Tidal Ranges:`);
  seasonalRanges.forEach(s => {
    console.log(`   ${s.season}: ${s.range.toFixed(2)}m range, ${s.meanLevel.toFixed(2)}m mean level`);
  });
  
  // Check for reasonable seasonal variation
  const ranges = seasonalRanges.map(s => s.range);
  const maxRange = Math.max(...ranges);
  const minRange = Math.min(...ranges);
  const variation = maxRange - minRange;
  
  if (variation < 0.5) {
    console.log(`   ✅ Seasonal variation: ${variation.toFixed(2)}m (reasonable)`);
  } else {
    console.log(`   ⚠️ Seasonal variation: ${variation.toFixed(2)}m (may need adjustment)`);
  }
}

// Run all tests
runRegionalValidation();
testSeasonalVariations();

export { runRegionalValidation, testSeasonalVariations };