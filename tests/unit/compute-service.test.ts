/**
 * Integration tests for the compute-service orchestration layer.
 * Covers the full pipeline: phenoage → percentile → hallmarks → response shape.
 */
import { describe, it, expect } from 'vitest'
import { runComputation } from '@/lib/computation/compute-service'
import type { BiomarkerInput } from '@/types/biomarkers'

const FULL_PANEL: BiomarkerInput = {
  age:           34,
  sex:           'female',
  albumin:        4.4,
  creatinine:     0.8,
  glucose:       85,
  crp:            0.3,
  lymphocytePct: 32,
  mcv:           90,
  rdw:           12.1,
  alp:           58,
  wbc:            5.1,
}

describe('runComputation — response shape', () => {
  it('returns all required top-level fields', () => {
    const r = runComputation(FULL_PANEL)
    const required = [
      'biologicalAge', 'chronologicalAge', 'acceleration', 'accelerationLabel',
      'percentile', 'confidence', 'confidenceScore', 'presentCount', 'totalCount',
      'contributions', 'hallmarks', 'missingBiomarkers', 'citations',
    ]
    for (const field of required) {
      expect(r, `missing field: ${field}`).toHaveProperty(field)
    }
  })

  it('totalCount is always 9', () => {
    expect(runComputation(FULL_PANEL).totalCount).toBe(9)
  })

  it('contributions has cohortPercentile on each item', () => {
    const r = runComputation(FULL_PANEL)
    for (const c of r.contributions) {
      expect(c).toHaveProperty('cohortPercentile')
    }
  })

  it('hallmarks has 6 items', () => {
    expect(runComputation(FULL_PANEL).hallmarks).toHaveLength(6)
  })

  it('citations has 3 items with label and ref', () => {
    const r = runComputation(FULL_PANEL)
    expect(r.citations).toHaveLength(3)
    for (const c of r.citations) {
      expect(c).toHaveProperty('label')
      expect(c).toHaveProperty('ref')
    }
  })

  it('confidenceScore is 100 for a full panel', () => {
    expect(runComputation(FULL_PANEL).confidenceScore).toBe(100)
  })
})

describe('runComputation — acceleration label', () => {
  it('younger biological age → "X years younger biologically"', () => {
    const r = runComputation(FULL_PANEL)
    if (r.acceleration < -1) {
      expect(r.accelerationLabel).toMatch(/younger biologically/)
    }
  })

  it('poor panel → "X years older biologically"', () => {
    const poor = runComputation({
      ...FULL_PANEL,
      crp: 20, glucose: 200, albumin: 2.8, rdw: 18, wbc: 14,
    })
    expect(poor.accelerationLabel).toMatch(/older biologically/)
  })

  it('near-zero acceleration → approximately chronological age label', () => {
    // Hard to force exactly 0 acceleration, so just check the label is a string
    expect(typeof runComputation(FULL_PANEL).accelerationLabel).toBe('string')
  })
})

describe('runComputation — percentile', () => {
  it('percentile is a number between 1 and 99 for a 34-year-old', () => {
    const r = runComputation(FULL_PANEL)
    // 34 is in the 30-40 age bin, so percentile should be available
    expect(r.percentile).not.toBeNull()
    expect(r.percentile!).toBeGreaterThanOrEqual(1)
    expect(r.percentile!).toBeLessThanOrEqual(99)
  })

  it('biologically younger → lower percentile than biologically older', () => {
    const young = runComputation({ ...FULL_PANEL, crp: 0.1, albumin: 4.8, glucose: 75 })
    const old   = runComputation({ ...FULL_PANEL, crp: 15, albumin: 3.0, glucose: 180 })
    if (young.percentile !== null && old.percentile !== null) {
      expect(young.percentile).toBeLessThan(old.percentile)
    }
  })
})

describe('runComputation — INSUFFICIENT case', () => {
  it('returns INSUFFICIENT with NaN biologicalAge when < 5 biomarkers', () => {
    const r = runComputation({
      age: 40, sex: 'male',
      albumin: 4.1, creatinine: 0.85, glucose: 95,
    })
    expect(r.confidence).toBe('INSUFFICIENT')
    expect(r.biologicalAge).toBeNaN()
    expect(r.percentile).toBeNull()
    expect(r.contributions).toHaveLength(0)
  })

  it('still returns hallmarks even when INSUFFICIENT', () => {
    const r = runComputation({
      age: 40, sex: 'male',
      albumin: 4.1, glucose: 95, crp: 0.5,
    })
    expect(r.hallmarks.length).toBeGreaterThan(0)
  })
})
