/**
 * Test script to validate tide prediction accuracy
 * Compares harmonic engine predictions against known tide patterns
 */

import { predictTideLevel, findTideExtremes } from '../lib/harmonic-engine';
import type { LocationData } from '../lib/tide-service';

// Test locations with known tidal characteristics
const testLocations: LocationData[] = [
  {
    name: 'Bangkok (Upper Gulf)',
    lat: 13.7563,
    lon: 100.5018
  },
  {
    name: 'Phuket (Andaman Sea)',
    lat: 7.8804,
    lon: 98.3923
  },
  {
    name: 'Samut Prakan (Gulf)',
    lat: 13.5994,
    lon: 100.5989
  },
  {
    name: 'Songkhla (Lower Gulf)',
    lat: 7.1688,
    lon: 100.6004
  }
];

// Test dates covering different lunar phases
const testDates = [
  new Date('2025-01-09'), // Current date
  new Date('2025-01-15'), // New moon
  new Date('2025-01-23'), // Full moon
  new Date('2025-02-05'), // First quarter
  new Date('2025-02-13'), // Last quarter
];

function runAccuracyTests() {
  console.group('🌊 Tide Prediction Accuracy Tests');
  
  let totalTests = 0;
  let passedTests = 0;
  
  for (const location of testLocations) {
    console.log(`\n📍 Testing: ${location.name}`);
    console.log(`   Coordinates: ${location.lat.toFixed(4)}°N, ${location.lon.toFixed(4)}°E`);
    
    for (const date of testDates) {
      console.log(`\n   📅 Date: ${date.toISOString().split('T')[0]}`);
      
      // Test 1: Check if predictions are within reasonable bounds
      const test1 = testPredictionBounds(location, date);
      totalTests++;
      if (test1.passed) passedTests++;
      
      // Test 2: Check if we get reasonable number of tide extremes
      const test2 = testTideExtremes(location, date);
      totalTests++;
      if (test2.passed) passedTests++;
      
      // Test 3: Check diurnal vs semidiurnal pattern
      const test3 = testTidalPattern(location, date);
      totalTests++;
      if (test3.passed) passedTests++;
      
      // Test 4: Check spring vs neap tide variation
      const test4 = testSpringNeapVariation(location, date);
      totalTests++;
      if (test4.passed) passedTests++;
    }
  }
  
  console.log(`\n✅ Test Results: ${passedTests}/${totalTests} passed`);
  console.log(`   Success Rate: ${((passedTests/totalTests) * 100).toFixed(1)}%`);
  
  if (passedTests === totalTests) {
    console.log('🎉 All accuracy tests passed!');
  } else {
    console.log('⚠️ Some tests failed - review predictions');
  }
  
  console.groupEnd();
}

function testPredictionBounds(location: LocationData, date: Date): { passed: boolean; message: string } {
  // Test water levels at different times
  const levels: number[] = [];
  
  for (let hour = 0; hour < 24; hour += 3) {
    const prediction = predictTideLevel(date, location, { hour, minute: 0 });
    levels.push(prediction.level);
  }
  
  const minLevel = Math.min(...levels);
  const maxLevel = Math.max(...levels);
  const range = maxLevel - minLevel;
  
  // Reasonable bounds for Thai coastal waters
  const expectedMin = -0.5; // Below MSL
  const expectedMax = 3.5;  // Above MSL
  const expectedRange = 0.5; // Minimum tidal range
  
  const passed = minLevel >= expectedMin && maxLevel <= expectedMax && range >= expectedRange;
  
  return {
    passed,
    message: passed 
      ? `Levels within bounds: ${minLevel.toFixed(2)}m to ${maxLevel.toFixed(2)}m (range: ${range.toFixed(2)}m)`
      : `Levels out of bounds: ${minLevel.toFixed(2)}m to ${maxLevel.toFixed(2)}m (range: ${range.toFixed(2)}m)`
  };
}

function testTideExtremes(location: LocationData, date: Date): { passed: boolean; message: string } {
  const extremes = findTideExtremes(date, location);
  
  // Should have 2-4 extremes per day in Thai waters
  const expectedMin = 2;
  const expectedMax = 4;
  
  const passed = extremes.length >= expectedMin && extremes.length <= expectedMax;
  
  return {
    passed,
    message: passed 
      ? `Found ${extremes.length} tide extremes (expected ${expectedMin}-${expectedMax})`
      : `Found ${extremes.length} tide extremes (expected ${expectedMin}-${expectedMax})`
  };
}

function testTidalPattern(location: LocationData, date: Date): { passed: boolean; message: string } {
  const extremes = findTideExtremes(date, location);
  const highTides = extremes.filter(e => e.type === 'high');
  const lowTides = extremes.filter(e => e.type === 'low');
  
  // Check pattern consistency
  const hasHighTides = highTides.length > 0;
  const hasLowTides = lowTides.length > 0;
  const reasonableTimeGap = checkTimeGaps(extremes);
  
  const passed = hasHighTides && hasLowTides && reasonableTimeGap;
  
  return {
    passed,
    message: passed 
      ? `Pattern OK: ${highTides.length} highs, ${lowTides.length} lows`
      : `Pattern issue: ${highTides.length} highs, ${lowTides.length} lows`
  };
}

function testSpringNeapVariation(location: LocationData, date: Date): { passed: boolean; message: string } {
  // Get lunar phase (simplified)
  const lunarDay = Math.floor((date.getTime() - new Date('2025-01-01').getTime()) / (1000 * 60 * 60 * 24)) % 29.5;
  
  // Spring tide: near new moon (0) or full moon (14.75)
  // Neap tide: near first quarter (7.375) or last quarter (22.125)
  const isSpringTide = lunarDay < 3 || lunarDay > 12 || lunarDay < 17;
  
  const extremes = findTideExtremes(date, location);
  const highTides = extremes.filter(e => e.type === 'high');
  const lowTides = extremes.filter(e => e.type === 'low');
  
  if (highTides.length === 0 || lowTides.length === 0) {
    return { passed: false, message: 'No tide extremes found' };
  }
  
  const avgHigh = highTides.reduce((sum, e) => sum + e.level, 0) / highTides.length;
  const avgLow = lowTides.reduce((sum, e) => sum + e.level, 0) / lowTides.length;
  const tidalRange = avgHigh - avgLow;
  
  // Spring tides should have larger ranges than neap tides
  const expectedRange = isSpringTide ? 1.5 : 1.0;
  const passed = tidalRange >= expectedRange * 0.8; // Allow 20% tolerance
  
  return {
    passed,
    message: passed 
      ? `Tidal range ${tidalRange.toFixed(2)}m appropriate for ${isSpringTide ? 'spring' : 'neap'} tide`
      : `Tidal range ${tidalRange.toFixed(2)}m unexpected for ${isSpringTide ? 'spring' : 'neap'} tide`
  };
}

function checkTimeGaps(extremes: any[]): boolean {
  if (extremes.length < 2) return false;
  
  // Sort by time
  const sorted = [...extremes].sort((a, b) => {
    const [ha, ma] = a.time.split(':').map(Number);
    const [hb, mb] = b.time.split(':').map(Number);
    return (ha * 60 + ma) - (hb * 60 + mb);
  });
  
  // Check time gaps between consecutive extremes
  for (let i = 1; i < sorted.length; i++) {
    const [h1, m1] = sorted[i-1].time.split(':').map(Number);
    const [h2, m2] = sorted[i].time.split(':').map(Number);
    const gapHours = (h2 * 60 + m2 - h1 * 60 - m1) / 60;
    
    // Reasonable gap: 4-8 hours between extremes
    if (gapHours < 4 || gapHours > 8) {
      return false;
    }
  }
  
  return true;
}

// Run tests if this file is executed directly
if (typeof window === 'undefined') {
  runAccuracyTests();
}

export { runAccuracyTests };