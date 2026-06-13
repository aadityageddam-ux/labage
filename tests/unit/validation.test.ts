import { describe, it, expect } from 'vitest'
import { validateBiomarkerInput, parseBiomarkerInput } from '@/lib/validation/biomarkers'

const VALID_BODY = {
  age: 34,
  sex: 'female',
  albumin: 4.4,
  creatinine: 0.8,
  glucose: 85,
  crp: 0.3,
  lymphocytePct: 32,
  mcv: 90,
  rdw: 12.1,
  alp: 58,
  wbc: 5.1,
}

describe('validateBiomarkerInput', () => {
  it('passes a fully valid body', () => {
    const result = validateBiomarkerInput(VALID_BODY)
    expect(result.valid).toBe(true)
    expect(result.errors).toHaveLength(0)
  })

  it('passes with optional biomarkers missing', () => {
    const { lymphocytePct, mcv, rdw, alp, wbc, ...partial } = VALID_BODY
    expect(validateBiomarkerInput(partial).valid).toBe(true)
  })

  it('fails when body is not an object', () => {
    expect(validateBiomarkerInput(null).valid).toBe(false)
    expect(validateBiomarkerInput('string').valid).toBe(false)
    expect(validateBiomarkerInput(42).valid).toBe(false)
  })

  it('fails when age is missing or invalid', () => {
    expect(validateBiomarkerInput({ ...VALID_BODY, age: undefined }).valid).toBe(false)
    expect(validateBiomarkerInput({ ...VALID_BODY, age: -1 }).valid).toBe(false)
    expect(validateBiomarkerInput({ ...VALID_BODY, age: 200 }).valid).toBe(false)
    expect(validateBiomarkerInput({ ...VALID_BODY, age: 'old' }).valid).toBe(false)
  })

  it('fails when sex is invalid', () => {
    expect(validateBiomarkerInput({ ...VALID_BODY, sex: 'other' }).valid).toBe(false)
    expect(validateBiomarkerInput({ ...VALID_BODY, sex: undefined }).valid).toBe(false)
  })

  it('fails when albumin is out of physiological range', () => {
    const high = validateBiomarkerInput({ ...VALID_BODY, albumin: 10.0 })
    expect(high.valid).toBe(false)
    expect(high.errors[0].field).toBe('albumin')

    const low = validateBiomarkerInput({ ...VALID_BODY, albumin: 0.1 })
    expect(low.valid).toBe(false)
  })

  it('fails when CRP is impossibly high', () => {
    const result = validateBiomarkerInput({ ...VALID_BODY, crp: 600 })
    expect(result.valid).toBe(false)
    expect(result.errors.some(e => e.field === 'crp')).toBe(true)
  })

  it('accumulates multiple errors', () => {
    const result = validateBiomarkerInput({
      ...VALID_BODY,
      age:      -1,
      albumin:  99,
      crp:      -5,
    })
    expect(result.valid).toBe(false)
    expect(result.errors.length).toBeGreaterThanOrEqual(3)
  })

  it('allows borderline-valid values', () => {
    expect(validateBiomarkerInput({ ...VALID_BODY, albumin: 1.0 }).valid).toBe(true)
    expect(validateBiomarkerInput({ ...VALID_BODY, albumin: 7.0 }).valid).toBe(true)
    expect(validateBiomarkerInput({ ...VALID_BODY, crp: 0.01 }).valid).toBe(true)
  })
})

describe('parseBiomarkerInput', () => {
  it('coerces string numbers to numbers', () => {
    const raw = { ...VALID_BODY, albumin: '4.4', glucose: '85' }
    const parsed = parseBiomarkerInput(raw as Record<string, unknown>)
    expect(parsed.albumin).toBe(4.4)
    expect(parsed.glucose).toBe(85)
  })

  it('treats empty strings as undefined (optional fields)', () => {
    const raw = { ...VALID_BODY, rdw: '' }
    const parsed = parseBiomarkerInput(raw as Record<string, unknown>)
    expect(parsed.rdw).toBeUndefined()
  })

  it('preserves sex and age correctly', () => {
    const parsed = parseBiomarkerInput(VALID_BODY as Record<string, unknown>)
    expect(parsed.sex).toBe('female')
    expect(parsed.age).toBe(34)
  })
})
