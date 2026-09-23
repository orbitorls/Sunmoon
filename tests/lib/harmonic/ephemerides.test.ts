import {
  calculateAstronomicalArguments,
  calculateLocalMeanLunarTime,
  dateToJulianDay,
  getDeltaTSeconds,
} from '@/lib/harmonic/ephemerides'

describe('ephemerides delta-T placement', () => {
  // Regression test: delta-T (TT - UT1) must NOT be added to tau (a civil UT
  // hour angle). It belongs in T = (JD_TT - 2451545) / 36525, used by the
  // s/h/p/N/pp mean-longitude polynomials.
  const fixed = new Date('2025-03-24T00:00:00.000Z')

  it('tau has no residual delta-T shift (~0.303 deg = deltaT/3600 * 15)', () => {
    const jd = dateToJulianDay(fixed)
    const t = (jd - 2451545.0) / 36525.0
    const utHours = fixed.getUTCHours() + fixed.getUTCMinutes() / 60 + fixed.getUTCSeconds() / 3600
    const DEG2RAD = Math.PI / 180
    const sDeg = 10 // arbitrary fixed s/h inputs, isolating tau's own formula
    const hDeg = 20

    const expectedTauNoDeltaT =
      utHours +
      0 / 15 +
      0.00256 * Math.cos((125.04 - 1934.136 * t) * DEG2RAD) +
      (hDeg - sDeg) / 15

    const tau = calculateLocalMeanLunarTime(fixed, 0, sDeg, hDeg)

    // If the old '+ deltaT' term (deltaT/3600 hours ~ 0.02h ~ 0.303deg) were
    // still present, this diff would be ~0.02h instead of ~0.
    expect(Math.abs(tau - expectedTauNoDeltaT)).toBeLessThan(1e-9)

    const deltaTHours = getDeltaTSeconds(fixed) / 3600
    expect(deltaTHours * 15).toBeCloseTo(0.303, 2)
  })

  it('s/h/p/N/pp polynomials use T derived from JD_TT (JD_UT + deltaT)', () => {
    const jdUT = dateToJulianDay(fixed)
    const jdTT = jdUT + getDeltaTSeconds(fixed) / 86400
    const T = (jdTT - 2451545.0) / 36525.0

    const expectedS =
      218.3164477 +
      481267.88123421 * T -
      0.0015786 * T * T +
      (T * T * T) / 538841 -
      (T * T * T * T) / 65194000

    const args = calculateAstronomicalArguments(fixed)
    const normalizedExpectedS = ((expectedS % 360) + 360) % 360

    expect(args.s).toBeCloseTo(normalizedExpectedS, 9)
  })
})
