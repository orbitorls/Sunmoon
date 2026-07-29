// tests/lib/domain/datum-converter.test.ts
import { convertLevel } from '@/lib/domain/datum-converter';

describe('convertLevel', () => {
  it('converts MLLW to MSL using a known offset', () => {
    const result = convertLevel({ value: 2.1, from: 'MLLW', to: 'MSL', offsetMeters: 0.8 });
    expect(result).toBeCloseTo(1.3, 3);
  });
});
