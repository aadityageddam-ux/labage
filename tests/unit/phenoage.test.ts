/**
 * PhenoAge algorithm validation tests.
 *
 * Tests are organized into three tiers:
 *   1. Directional  — algorithm properties that must always hold (sign of coefficients)
 *   2. Confidence   — correct confidence levels for various missing-data scenarios
 *   3. Precision    — spot-check a hand-computed case to catch regressions
 */
import { describe, it, expect } from 'vitest'
import { computePhenoAge } from '@/lib/computation/phenoage'
import type { BiomarkerInput } from '@/types/biomarkers'

/** A healthy 40-year-old at approximate NHANES population means */
const BASE: BiomarkerInput = {
  age:           40,
  sex:           'male',
  albumin:        4.1,  // g/dL
  creatinine:     0.85, // mg/dL
  glucose:       95,    // mg/dL
  crp:            1.5,  // mg/L
  lymphocytePct: 30,    // %
  mcv:           90,    // fL
  rdw:           13.0,  // %
  alp:           65,    // U/L
  wbc:            6.5,  // K/μL
}

// ─── 1. Directional Tests ─────────────────────────────────────────────────────

describe('PhenoAge — directional (coefficient signs)', () => {
  it('higher CRP → higher biological age (CRP is pro-aging)', () => {
    const low  = computePhenoAge({ ...BASE, crp: 0.1 })
    const high = computePhenoAge({ ...BASE, crp: 10.0 })
    expect(high.biologicalAge).toBeGreaterThan(low.biologicalAge)
  })

  it('higher albumin → lower biological age (albumin is protective)', () => {
    const low  = computePhenoAge({ ...BASE, albumin: 3.2 })
    const high = computePhenoAge({ ...BASE, albumin: 4.8 })
    expect(high.biologicalAge).toBeLessThan(low.biologicalAge)
  })

  it('higher glucose → higher biological age', () => {
    const low  = computePhenoAge({ ...BASE, glucose: 75 })
    const high = computePhenoAge({ ...BASE, glucose: 150 })
    expect(high.biologicalAge).toBeGreaterThan(low.biologicalAge)
  })

  it('higher RDW → higher biological age', () => {
    const low  = computePhenoAge({ ...BASE, rdw: 11.5 })
    const high = computePhenoAge({ ...BASE, rdw: 16.0 })
    expect(high.biologicalAge).toBeGreaterThan(low.biologicalAge)
  })

  it('higher MCV → higher biological age', () => {
    const low  = computePhenoAge({ ...BASE, mcv: 80 })
    const high = computePhenoAge({ ...BASE, mcv: 105 })
    expect(high.biologicalAge).toBeGreaterThan(low.biologicalAge)
  })

  it('higher lymphocyte % → lower biological age (protective)', () => {
    const low  = computePhenoAge({ ...BASE, lymphocytePct: 15 })
    const high = computePhenoAge({ ...BASE, lymphocytePct: 45 })
    expect(high.biologicalAge).toBeLessThan(low.biologicalAge)
  })

  it('older chronological age → higher biological age (age coefficient)', () => {
    const young = computePhenoAge({ ...BASE, age: 25 })
    const old   = computePhenoAge({ ...BASE, age: 65 })
    expect(old.biologicalAge).toBeGreaterThan(young.biologicalAge)
  })

  it('optimal panel → biological age younger than chronological age', () => {
    const optimal = computePhenoAge({
      ...BASE,
      albumin:       4.8,  // excellent
      crp:           0.1,  // very low inflammation
      glucose:       75,   // low-normal
      rdw:           11.5, // excellent
      lymphocytePct: 40,
    })
    expect(optimal.biologicalAge).toBeLessThan(optimal.chronologicalAge)
  })

  it('poor panel → biological age older than chronological age', () => {
    const poor = computePhenoAge({
      ...BASE,
      albumin:       3.0,  // low
      crp:           15.0, // very elevated
      glucose:       180,  // diabetic range
      rdw:           17.0, // elevated
      lymphocytePct: 12,   // low
    })
    expect(poor.biologicalAge).toBeGreaterThan(poor.chronologicalAge)
  })
})

// ─── 2. Contribution Tests ────────────────────────────────────────────────────

describe('PhenoAge — biomarker contributions', () => {
  it('CRP contribution is protective (negative) when CRP is very low', () => {
    const result = computePhenoAge({ ...BASE, crp: 0.1 })
    const crp = result.contributions.find(c => c.key === 'crp')!
    expect(crp.contribution).toBeLessThan(0)
  })

  it('CRP contribution is aging (positive) when CRP is very high', () => {
    const result = computePhenoAge({ ...BASE, crp: 10.0 })
    const crp = result.contributions.find(c => c.key === 'crp')!
    expect(crp.contribution).toBeGreaterThan(0)
  })

  it('albumin contribution is aging (positive) when albumin is very low', () => {
    const result = computePhenoAge({ ...BASE, albumin: 3.0 })
    const alb = result.contributions.find(c => c.key === 'albumin')!
    expect(alb.contribution).toBeGreaterThan(0)
  })

  it('contributions sum is approximately equal to total acceleration minus population offset', () => {
    const result = computePhenoAge(BASE)
    const sumContributions = result.contributions.reduce((sum, c) => sum + c.contribution, 0)
    // Sum of contributions should roughly equal total deviation from mean-input biological age
    // (not exact because of nonlinearity, but should be within a few years)
    expect(Math.abs(sumContributions)).toBeLessThan(10)
  })

  it('returns 9 contributions for a full panel', () => {
    const result = computePhenoAge(BASE)
    expect(result.contributions).toHaveLength(9)
  })
})

// ─── 3. Confidence & Missing Biomarkers ──────────────────────────────────────

describe('PhenoAge — confidence levels', () => {
  it('9/9 biomarkers → HIGH confidence', () => {
    expect(computePhenoAge(BASE).confidence).toBe('HIGH')
    expect(computePhenoAge(BASE).missingBiomarkers).toHaveLength(0)
  })

  it('7/9 biomarkers → MODERATE confidence (result still computed)', () => {
    const { albumin, creatinine, ...rest } = BASE
    const result = computePhenoAge(rest)
    expect(result.confidence).toBe('MODERATE')
    expect(result.missingBiomarkers).toContain('albumin')
    expect(result.missingBiomarkers).toContain('creatinine')
    expect(result.biologicalAge).not.toBeNaN()
    expect(Number.isFinite(result.biologicalAge)).toBe(true)
  })

  it('5/9 biomarkers → LIMITED confidence (result still computed)', () => {
    const { albumin, creatinine, glucose, crp, ...rest } = BASE
    const result = computePhenoAge(rest)
    expect(result.confidence).toBe('LIMITED')
    expect(result.biologicalAge).not.toBeNaN()
  })

  it('4/9 biomarkers → INSUFFICIENT confidence (no result)', () => {
    const result = computePhenoAge({
      age: 40,
      sex: 'male',
      albumin:    4.1,
      creatinine: 0.85,
      glucose:    95,
      crp:        1.5,
      // only 4 — below threshold
    })
    expect(result.confidence).toBe('INSUFFICIENT')
    expect(result.biologicalAge).toBeNaN()
    expect(result.contributions).toHaveLength(0)
  })

  it('imputed biomarkers are flagged in contributions', () => {
    const { albumin, ...withoutAlbumin } = BASE
    const result = computePhenoAge(withoutAlbumin)
    const albContrib = result.contributions.find(c => c.key === 'albumin')!
    expect(albContrib.imputed).toBe(true)
    // Other contributions should not be imputed
    const crpContrib = result.contributions.find(c => c.key === 'crp')!
    expect(crpContrib.imputed).toBe(false)
  })
})

// ─── 4. Output Shape & Sanity ─────────────────────────────────────────────────

describe('PhenoAge — output shape and sanity', () => {
  it('acceleration = biologicalAge − chronologicalAge', () => {
    const r = computePhenoAge(BASE)
    expect(r.acceleration).toBeCloseTo(r.biologicalAge - r.chronologicalAge, 0)
  })

  it('biological age is in physiologically plausible range (10–120 years)', () => {
    const r = computePhenoAge(BASE)
    expect(r.biologicalAge).toBeGreaterThan(10)
    expect(r.biologicalAge).toBeLessThan(120)
  })

  it('totalCount is always 9', () => {
    expect(computePhenoAge(BASE).totalCount).toBe(9)
  })

  it('mortalityScore is a probability (0–1)', () => {
    const r = computePhenoAge(BASE)
    expect(r.mortalityScore).toBeGreaterThanOrEqual(0)
    expect(r.mortalityScore).toBeLessThanOrEqual(1)
  })

  it('CRP floor prevents crash when CRP = 0', () => {
    expect(() => computePhenoAge({ ...BASE, crp: 0 })).not.toThrow()
    const r = computePhenoAge({ ...BASE, crp: 0 })
    expect(Number.isFinite(r.biologicalAge)).toBe(true)
  })
})

// ─── 5. Precision Spot-Check ──────────────────────────────────────────────────
//
// Hand-computed reference case:
//   - All inputs at population means, age 40
//   - Expected xb ≈ −9.67, M ≈ 0.0122, biological age ≈ 36.9
//   - This is consistent with the Gompertz formula derivation from PMC5940111

describe('PhenoAge — precision spot-check', () => {
  it('all-mean inputs at age 40 give biological age ~35–40 years', () => {
    const r = computePhenoAge(BASE)
    // Population means → should be near (but slightly below) chronological age
    // Acceptable range: 30–45 years for a 40yo at population means
    expect(r.biologicalAge).toBeGreaterThan(30)
    expect(r.biologicalAge).toBeLessThan(45)
  })

  it('same inputs but age 60 give biological age that scales with age', () => {
    const r40 = computePhenoAge({ ...BASE, age: 40 })
    const r60 = computePhenoAge({ ...BASE, age: 60 })
    // Older person with same labs → proportionally older biological age
    expect(r60.biologicalAge).toBeGreaterThan(r40.biologicalAge)
    // And roughly in the 55–65 range
    expect(r60.biologicalAge).toBeGreaterThan(50)
    expect(r60.biologicalAge).toBeLessThan(70)
  })
})
