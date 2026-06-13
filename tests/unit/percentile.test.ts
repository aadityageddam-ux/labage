import { describe, it, expect } from 'vitest'
import {
  getBiomarkerPercentile,
  getPhenoAgePercentile,
  getBiomarkerStats,
  getPhenoAgeStats,
  AVAILABLE_STRATA,
} from '@/lib/computation/percentile'

// ─── Reference Data Coverage ─────────────────────────────────────────────────

describe('NHANES reference data coverage', () => {
  it('has strata for all expected age bins and both sexes', () => {
    const expectedBins = ['18_30', '30_40', '40_50', '50_60', '60_70', '70_80', '80_90']
    for (const bin of expectedBins) {
      expect(AVAILABLE_STRATA).toContain(`male_${bin}`)
      expect(AVAILABLE_STRATA).toContain(`female_${bin}`)
    }
  })

  it('has 14 strata total (7 bins × 2 sexes)', () => {
    expect(AVAILABLE_STRATA.length).toBe(14)
  })
})

// ─── Biomarker Percentile Lookups ────────────────────────────────────────────

describe('getBiomarkerPercentile', () => {
  it('returns a number between 1 and 99 for valid input', () => {
    const pct = getBiomarkerPercentile('albumin', 4.2, 40, 'male')
    expect(pct).not.toBeNull()
    expect(pct!).toBeGreaterThanOrEqual(1)
    expect(pct!).toBeLessThanOrEqual(99)
  })

  it('returns null for an unknown stratum', () => {
    // age 5 is below any NHANES range
    const pct = getBiomarkerPercentile('albumin', 4.2, 5, 'male')
    expect(pct).toBeNull()
  })

  it('low CRP → low percentile (anti-inflammatory signal)', () => {
    const low  = getBiomarkerPercentile('crp', 0.1, 45, 'female')
    const high = getBiomarkerPercentile('crp', 10.0, 45, 'female')
    expect(low).not.toBeNull()
    expect(high).not.toBeNull()
    expect(low!).toBeLessThan(high!)
  })

  it('median albumin value → ~50th percentile', () => {
    // Get the actual p50 from stats and look it up
    const stats = getBiomarkerStats('albumin', 40, 'male')
    expect(stats).not.toBeNull()
    const pct = getBiomarkerPercentile('albumin', stats!.p50, 40, 'male')
    expect(pct!).toBeGreaterThanOrEqual(45)
    expect(pct!).toBeLessThanOrEqual(55)
  })

  it('p10 albumin value → ~10th percentile', () => {
    const stats = getBiomarkerStats('albumin', 40, 'male')!
    const pct = getBiomarkerPercentile('albumin', stats.p10, 40, 'male')!
    expect(pct).toBeGreaterThanOrEqual(7)
    expect(pct).toBeLessThanOrEqual(13)
  })

  it('p90 albumin value → ~90th percentile', () => {
    const stats = getBiomarkerStats('albumin', 40, 'male')!
    const pct = getBiomarkerPercentile('albumin', stats.p90, 40, 'male')!
    expect(pct).toBeGreaterThanOrEqual(87)
    expect(pct).toBeLessThanOrEqual(93)
  })

  it('works for all 9 biomarker keys', () => {
    const keys = ['albumin', 'creatinine', 'glucose', 'crp', 'lymphocytePct', 'mcv', 'rdw', 'alp', 'wbc'] as const
    for (const key of keys) {
      const stats = getBiomarkerStats(key, 45, 'female')
      expect(stats).not.toBeNull()
      const pct = getBiomarkerPercentile(key, stats!.p50, 45, 'female')
      expect(pct).not.toBeNull()
    }
  })

  it('clamps below p5 values to ≥ 1', () => {
    const pct = getBiomarkerPercentile('albumin', 0.1, 40, 'male') // impossibly low
    expect(pct).toBeGreaterThanOrEqual(1)
  })

  it('clamps above p95 values to ≤ 99', () => {
    const pct = getBiomarkerPercentile('albumin', 9.9, 40, 'male') // impossibly high
    expect(pct).toBeLessThanOrEqual(99)
  })
})

// ─── PhenoAge Percentile ──────────────────────────────────────────────────────

describe('getPhenoAgePercentile', () => {
  it('returns a number between 1 and 99', () => {
    const pct = getPhenoAgePercentile(45, 50, 'male')
    expect(pct).not.toBeNull()
    expect(pct!).toBeGreaterThanOrEqual(1)
    expect(pct!).toBeLessThanOrEqual(99)
  })

  it('biologically older → higher percentile', () => {
    const younger = getPhenoAgePercentile(35, 50, 'female')
    const older   = getPhenoAgePercentile(65, 50, 'female')
    expect(younger).not.toBeNull()
    expect(older).not.toBeNull()
    expect(older!).toBeGreaterThan(younger!)
  })

  it('median PhenoAge → ~50th percentile', () => {
    const stats = getPhenoAgeStats(45, 'male')
    expect(stats).not.toBeNull()
    const pct = getPhenoAgePercentile(stats!.p50, 45, 'male')!
    expect(pct).toBeGreaterThanOrEqual(45)
    expect(pct).toBeLessThanOrEqual(55)
  })

  it('returns null for out-of-range age', () => {
    const pct = getPhenoAgePercentile(50, 5, 'male')
    expect(pct).toBeNull()
  })
})

// ─── Stats Lookups ────────────────────────────────────────────────────────────

describe('getBiomarkerStats', () => {
  it('returns stats with all required fields', () => {
    const stats = getBiomarkerStats('crp', 35, 'female')
    expect(stats).not.toBeNull()
    const fields = ['n', 'mean', 'sd', 'p5', 'p10', 'p25', 'p50', 'p75', 'p90', 'p95']
    for (const field of fields) {
      expect(stats).toHaveProperty(field)
    }
  })

  it('percentile values are monotonically increasing', () => {
    const stats = getBiomarkerStats('albumin', 40, 'male')!
    expect(stats.p5).toBeLessThan(stats.p10)
    expect(stats.p10).toBeLessThan(stats.p25)
    expect(stats.p25).toBeLessThan(stats.p50)
    expect(stats.p50).toBeLessThan(stats.p75)
    expect(stats.p75).toBeLessThan(stats.p90)
    expect(stats.p90).toBeLessThan(stats.p95)
  })

  it('n is a positive integer', () => {
    const stats = getBiomarkerStats('wbc', 60, 'female')!
    expect(stats.n).toBeGreaterThan(0)
    expect(Number.isInteger(stats.n)).toBe(true)
  })
})
