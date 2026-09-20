/**
 * Ephemerides helpers for the harmonic tide engine.
 * - DE430 polynomial coefficients for fundamental arguments
 * - ΔT interpolation table (seconds)
 * - Leap second epochs
 *
 * The formulas follow Astronomical Almanac (2019) section B and
 * Schureman (1958) tables, adapted for double-precision JavaScript.
 */

export interface AstronomicalArguments {
  s: number // mean longitude of moon (deg)
  h: number // mean longitude of sun (deg)
  p: number // longitude of moon's perigee (deg)
  N: number // longitude of moon's ascending node (deg)
  pp: number // longitude of sun's perigee (deg)
  tau: number // local mean lunar time (hours)
}

export interface EphemeridesMetadata {
  id: string
  source: string
  deltaTSource: string
  leapSecondsVersion: string
  updatedAt: string
}

const METADATA: EphemeridesMetadata = {
  id: "DE430",
  source: "NASA JPL Development Ephemeris 430 (DE430)",
  deltaTSource: "NASA polynomial fit (Espenak & Meeus, 2015 update)",
  leapSecondsVersion: "IERS Bulletin C (Jan 2017)",
  updatedAt: "2025-05-01T00:00:00Z",
}

/**
 * ΔT (TT - UT1) sample table for interpolation (seconds).
 * Values are averaged per year (source NASA / IERS historical data).
 * We provide coverage from 1950 to 2035 with 5-year spacing.
 */
const DELTA_T_TABLE: Array<{ year: number; deltaT: number }> = [
  { year: 1950, deltaT: 29.15 },
  { year: 1955, deltaT: 30.07 },
  { year: 1960, deltaT: 33.15 },
  { year: 1965, deltaT: 45.48 },
  { year: 1970, deltaT: 50.54 },
  { year: 1975, deltaT: 52.17 },
  { year: 1980, deltaT: 54.87 },
  { year: 1985, deltaT: 56.97 },
  { year: 1990, deltaT: 57.95 },
  { year: 1995, deltaT: 60.75 },
  { year: 2000, deltaT: 63.83 },
  { year: 2005, deltaT: 64.69 },
  { year: 2010, deltaT: 66.07 },
  { year: 2015, deltaT: 68.75 },
  { year: 2020, deltaT: 70.32 },
  { year: 2025, deltaT: 72.60 },
  { year: 2030, deltaT: 74.10 },
  { year: 2035, deltaT: 75.60 },
]

/**
 * Leap second effective dates (UTC) and cumulative TAI-UTC offset (seconds).
 * Source: IERS Bulletin C.
 */
const LEAP_SECONDS: Array<{ effective: string; offset: number }> = [
  { effective: "1972-01-01T00:00:00Z", offset: 10 },
  { effective: "1972-07-01T00:00:00Z", offset: 11 },
  { effective: "1973-01-01T00:00:00Z", offset: 12 },
  { effective: "1974-01-01T00:00:00Z", offset: 13 },
  { effective: "1975-01-01T00:00:00Z", offset: 14 },
  { effective: "1976-01-01T00:00:00Z", offset: 15 },
  { effective: "1977-01-01T00:00:00Z", offset: 16 },
  { effective: "1978-01-01T00:00:00Z", offset: 17 },
  { effective: "1979-01-01T00:00:00Z", offset: 18 },
  { effective: "1980-01-01T00:00:00Z", offset: 19 },
  { effective: "1981-07-01T00:00:00Z", offset: 20 },
  { effective: "1982-07-01T00:00:00Z", offset: 21 },
  { effective: "1983-07-01T00:00:00Z", offset: 22 },
  { effective: "1985-07-01T00:00:00Z", offset: 23 },
  { effective: "1988-01-01T00:00:00Z", offset: 24 },
  { effective: "1990-01-01T00:00:00Z", offset: 25 },
  { effective: "1991-01-01T00:00:00Z", offset: 26 },
  { effective: "1992-07-01T00:00:00Z", offset: 27 },
  { effective: "1993-07-01T00:00:00Z", offset: 28 },
  { effective: "1994-07-01T00:00:00Z", offset: 29 },
  { effective: "1996-01-01T00:00:00Z", offset: 30 },
  { effective: "1997-07-01T00:00:00Z", offset: 31 },
  { effective: "1999-01-01T00:00:00Z", offset: 32 },
  { effective: "2006-01-01T00:00:00Z", offset: 33 },
  { effective: "2009-01-01T00:00:00Z", offset: 34 },
  { effective: "2012-07-01T00:00:00Z", offset: 35 },
  { effective: "2015-07-01T00:00:00Z", offset: 36 },
  { effective: "2017-01-01T00:00:00Z", offset: 37 },
]

const DEG2RAD = Math.PI / 180

export function getEphemeridesMetadata(): EphemeridesMetadata {
  return { ...METADATA }
}

/**
 * Interpolate ΔT (seconds) for a given date using linear interpolation.
 */
export function getDeltaTSeconds(date: Date): number {
  const year = date.getUTCFullYear() + (date.getUTCMonth() + 1) / 12
  const table = DELTA_T_TABLE

  if (year <= table[0].year) return table[0].deltaT
  if (year >= table[table.length - 1].year) return table[table.length - 1].deltaT

  for (let i = 0; i < table.length - 1; i++) {
    const a = table[i]
    const b = table[i + 1]
    if (year >= a.year && year <= b.year) {
      const t = (year - a.year) / (b.year - a.year)
      return a.deltaT + t * (b.deltaT - a.deltaT)
    }
  }

  return table[table.length - 1].deltaT
}

/**
 * Total leap-second offset (TAI - UTC) at specified epoch (seconds).
 */
export function getLeapSecondOffset(date: Date): number {
  const target = date.getTime()
  let offset = 0
  for (const entry of LEAP_SECONDS) {
    if (target >= Date.parse(entry.effective)) {
      offset = entry.offset
    } else {
      break
    }
  }
  return offset
}

export function dateToJulianDay(date: Date): number {
  const year = date.getUTCFullYear()
  const month = date.getUTCMonth() + 1
  const day =
    date.getUTCDate() +
    (date.getUTCHours() +
      (date.getUTCMinutes() + (date.getUTCSeconds() + date.getUTCMilliseconds() / 1000) / 60) / 60) /
      24

  let y = year
  let m = month
  if (m <= 2) {
    y -= 1
    m += 12
  }

  const A = Math.floor(y / 100)
  const B = 2 - A + Math.floor(A / 4)

  return (
    Math.floor(365.25 * (y + 4716)) +
    Math.floor(30.6001 * (m + 1)) +
    day +
    B -
    1524.5
  )
}

/**
 * Calculate local mean lunar time tau (hours) for longitude in degrees.
 *
 * tau is Doodson's mean lunar time: the Greenwich hour angle of the mean sun
 * (~15 deg/hour of UT) adjusted by (h - s) so the argument tracks the Moon's
 * mean longitude rather than the Sun's. Without the (h - s) term this would
 * be mean SOLAR time, giving every constituent whose Doodson number has a
 * non-zero tau coefficient (M2, N2, O1, Q1, ...) the wrong period.
 */
export function calculateLocalMeanLunarTime(
  date: Date,
  longitudeDeg: number,
  sDeg: number,
  hDeg: number,
): number {
  const jd = dateToJulianDay(date)
  const t = (jd - 2451545.0) / 36525.0

  const utHours =
    date.getUTCHours() + date.getUTCMinutes() / 60 + date.getUTCSeconds() / 3600

  // Meeus Astronomical Algorithms (chapter 11) approximation for the small
  // nutation-in-longitude term, plus the (h - s) correction (deg -> hours).
  // tau is a civil (UT) hour angle, so it does NOT get a delta-T shift here;
  // delta-T is applied upstream when s/h are derived from TT (see
  // calculateAstronomicalArguments).
  const tau =
    utHours +
    longitudeDeg / 15 +
    0.00256 * Math.cos((125.04 - 1934.136 * t) * DEG2RAD) +
    (hDeg - sDeg) / 15
  return ((tau % 24) + 24) % 24
}

function normalizeAngle(angleDegrees: number): number {
  let value = angleDegrees % 360
  if (value < 0) value += 360
  return value
}

/**
 * Fundamental arguments using DE430 polynomials (Meeus 1998, Chap. 47).
 * The mean-longitude polynomials (s, h, p, N, pp) are functions of T in
 * Terrestrial Time, so delta-T is added to the UT Julian Day before T is
 * derived. Returns degrees in [0, 360).
 */
export function calculateAstronomicalArguments(
  date: Date,
  longitudeDeg = 0,
): AstronomicalArguments {
  const jd = dateToJulianDay(date)
  const jdTT = jd + getDeltaTSeconds(date) / 86400
  const T = (jdTT - 2451545.0) / 36525.0

  const s =
    218.3164477 +
    481267.88123421 * T -
    0.0015786 * T * T +
    T * T * T / 538841 -
    T * T * T * T / 65194000

  const h =
    280.4664567 +
    36000.76982779 * T +
    0.0003032 * T * T +
    T * T * T / 49931000 -
    T * T * T * T / 153000000

  const p =
    83.3532465 +
    4069.0137287 * T -
    0.0103200 * T * T -
    T * T * T / 80053 +
    T * T * T * T / 18999000

  const N =
    125.0445479 -
    1934.1362891 * T +
    0.0020754 * T * T +
    T * T * T / 467441 -
    T * T * T * T / 60616000

  const pp =
    282.9373480 +
    1.71945766 * T +
    0.0004527 * T * T +
    T * T * T / 300000000

  const tau = calculateLocalMeanLunarTime(date, longitudeDeg, s, h)

  return {
    s: normalizeAngle(s),
    h: normalizeAngle(h),
    p: normalizeAngle(p),
    N: normalizeAngle(N),
    pp: normalizeAngle(pp),
    tau,
  }
}

export function getLeapSecondTable() {
  return LEAP_SECONDS.map((entry) => ({ ...entry }))
}
