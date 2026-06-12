import { describe, it, expect } from 'vitest'
import { computeConfidence, confidenceLabel } from '@/lib/computation/confidence'

describe('computeConfidence', () => {
  it('returns HIGH for 9 biomarkers (full panel)', () =>
    expect(computeConfidence(9)).toBe('HIGH'))

  it('returns MODERATE for 8 biomarkers', () =>
    expect(computeConfidence(8)).toBe('MODERATE'))

  it('returns MODERATE for 7 biomarkers', () =>
    expect(computeConfidence(7)).toBe('MODERATE'))

  it('returns LIMITED for 6 biomarkers', () =>
    expect(computeConfidence(6)).toBe('LIMITED'))

  it('returns LIMITED for 5 biomarkers', () =>
    expect(computeConfidence(5)).toBe('LIMITED'))

  it('returns INSUFFICIENT for 4 biomarkers', () =>
    expect(computeConfidence(4)).toBe('INSUFFICIENT'))

  it('returns INSUFFICIENT for 0 biomarkers', () =>
    expect(computeConfidence(0)).toBe('INSUFFICIENT'))
})

describe('confidenceLabel', () => {
  it('returns human-readable string for each level', () => {
    expect(confidenceLabel('HIGH')).toBe('High confidence')
    expect(confidenceLabel('MODERATE')).toBe('Moderate confidence')
    expect(confidenceLabel('LIMITED')).toBe('Limited confidence')
    expect(confidenceLabel('INSUFFICIENT')).toBe('Insufficient data')
  })
})
