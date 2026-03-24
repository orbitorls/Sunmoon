/**
 * Specific accuracy test with detailed output
 * Focus on high-traffic location (Bangkok area)
 */

import { predictTideLevel, findTideExtremes } from '../lib/harmonic-engine';
import { calculateLunarPhase } from '../lib/tide-service';

const bangkokLocation = {
  name: 'Bangkok (Upper Gulf)',
  lat: 13.7563,
  lon: 100.5018
};

const testDate = new Date('2025-01-09');

function detailedBangkokTest() {
  console.log('\n🔍 Detailed Bangkok Tide Analysis');
  console.log(`📅 Date: ${testDate.toDateString()}`);
  
  // Get lunar phase
  calculateLunarPhase(testDate).then(lunar => {
    console.log(`🌙 Lunar Phase: ${lunar.isWaxingMoon ? 'Waxing' : 'Waning'}, ${lunar.lunarPhaseKham} ค่ำ`);
    
    // Analyze tide extremes
    const extremes = findTideExtremes(testDate, bangkokLocation);
    console.log('\n📊 Tide Extremes:');
    extremes.forEach((extreme, i) => {
      console.log(`  ${i + 1}. ${extreme.time} - ${extreme.type.toUpperCase()} tide at ${extreme.level}m (confidence: ${extreme.confidence}%)`);
    });
    
    // Analyze hourly predictions
    console.log('\n⏰ Hourly Water Levels:');
    for (let hour = 0; hour < 24; hour += 2) {
      const prediction = predictTideLevel(testDate, bangkokLocation, { hour, minute: 0 });
      console.log(`  ${hour.toString().padStart(2, '0')}:00 - ${prediction.level.toFixed(2)}m (${prediction.confidence}% confidence, dominant: ${prediction.constituent || 'mixed'})`);
    }
    
    // Check physical consistency
    const levels = [];
    for (let hour = 0; hour < 24; hour++) {
      const prediction = predictTideLevel(testDate, bangkokLocation, { hour, minute: 0 });
      levels.push(prediction.level);
    }
    
    const minLevel = Math.min(...levels);
    const maxLevel = Math.max(...levels);
    const range = maxLevel - minLevel;
    
    console.log('\n📈 Statistics:');
    console.log(`  Min level: ${minLevel.toFixed(2)}m`);
    console.log(`  Max level: ${maxLevel.toFixed(2)}m`);
    console.log(`  Daily range: ${range.toFixed(2)}m`);
    
    // Physical consistency checks
    console.log('\n✅ Consistency Checks:');
    
    // 1. Range check
    const reasonableRange = range >= 0.5 && range <= 3.0;
    console.log(`  Tidal range: ${reasonableRange ? '✅' : '❌'} ${range.toFixed(2)}m (expected 0.5-3.0m)`);
    
    // 2. Level bounds check
    const reasonableLevels = minLevel >= -0.5 && maxLevel <= 3.5;
    console.log(`  Level bounds: ${reasonableLevels ? '✅' : '❌'} ${minLevel.toFixed(2)}m to ${maxLevel.toFixed(2)}m (expected -0.5 to 3.5m)`);
    
    // 3. Extremes count check
    const reasonableExtremes = extremes.length >= 2 && extremes.length <= 4;
    console.log(`  Extremes count: ${reasonableExtremes ? '✅' : '❌'} ${extremes.length} (expected 2-4 per day)`);
    
    // 4. Time gap check
    const timeGapsOk = checkTimeGaps(extremes);
    console.log(`  Time gaps: ${timeGapsOk ? '✅' : '❌'} (4-8 hours between extremes)`);
    
    // 5. Regional pattern check (Gulf of Thailand - mainly diurnal)
    const highTides = extremes.filter(e => e.type === 'high');
    const lowTides = extremes.filter(e => e.type === 'low');
    const diurnalPattern = highTides.length === 1 && lowTides.length === 1;
    console.log(`  Diurnal pattern: ${diurnalPattern ? '✅' : '⚠️'} ${highTides.length} highs, ${lowTides.length} lows (Gulf typically diurnal)`);
    
  }).catch(err => {
    console.error('❌ Error:', err);
  });
}

function checkTimeGaps(extremes: any[]): boolean {
  if (extremes.length < 2) return false;
  
  const sorted = [...extremes].sort((a, b) => {
    const [ha, ma] = a.time.split(':').map(Number);
    const [hb, mb] = b.time.split(':').map(Number);
    return (ha * 60 + ma) - (hb * 60 + mb);
  });
  
  for (let i = 1; i < sorted.length; i++) {
    const [h1, m1] = sorted[i-1].time.split(':').map(Number);
    const [h2, m2] = sorted[i].time.split(':').map(Number);
    const gapHours = (h2 * 60 + m2 - h1 * 60 - m1) / 60;
    
    if (gapHours < 4 || gapHours > 8) {
      return false;
    }
  }
  
  return true;
}

detailedBangkokTest();