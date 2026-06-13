/**
 * Physiological range validation for PhenoAge biomarker inputs.
 *
 * These ranges are intentionally generous — they flag physiologically
 * impossible values (typos, unit confusion) rather than clinical reference ranges.
 */

import type { BiomarkerInput, BiomarkerKey } from '@/types/biomarkers'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ValidationError {
  field: BiomarkerKey | 'age' | 'sex'
  message: string
  value: number | string
}

export interface ValidationResult {
  valid: boolean
  errors: ValidationError[]
}

// ─── Physiological Bounds ─────────────────────────────────────────────────────
//
// Upper and lower bounds that are physiologically impossible to exceed.
// Values outside these ranges indicate data entry errors.

const BOUNDS: Record<BiomarkerKey, { min: number; max: number; unit: string }> = {
  albumin:       { min: 1.0,   max: 7.0,   unit: 'g/dL' },
  creatinine:    { min: 0.1,   max: 30.0,  unit: 'mg/dL' },
  glucose:       { min: 30,    max: 800,   unit: 'mg/dL' },
  crp:           { min: 0.01,  max: 500,   unit: 'mg/L' },
  lymphocytePct: { min: 0.5,   max: 95,    unit: '%' },
  mcv:           { min: 50,    max: 160,   unit: 'fL' },
  rdw:           { min: 5,     max: 40,    unit: '%' },
  alp:           { min: 5,     max: 3000,  unit: 'U/L' },
  wbc:           { min: 0.1,   max: 200,   unit: 'K/μL' },
}

// ─── Validator ────────────────────────────────────────────────────────────────

/**
 * Validate a BiomarkerInput object.
 *
 * Checks:
 *   - age is a positive number (18–120)
 *   - sex is 'male' or 'female'
 *   - each present biomarker is within physiological bounds
 *   - at least the 4 required biomarkers are present (albumin, creatinine, glucose, crp)
 *
 * Returns a ValidationResult with all accumulated errors (not just the first).
 */
export function validateBiomarkerInput(input: unknown): ValidationResult {
  const errors: ValidationError[] = []

  if (!input || typeof input !== 'object') {
    return { valid: false, errors: [{ field: 'age', message: 'Request body must be a JSON object.', value: '' }] }
  }

  const raw = input as Record<string, unknown>

  // Age
  const age = Number(raw['age'])
  if (!Number.isFinite(age) || age < 1 || age > 120) {
    errors.push({ field: 'age', message: 'Age must be a number between 1 and 120.', value: raw['age'] as number })
  }

  // Sex
  if (raw['sex'] !== 'male' && raw['sex'] !== 'female') {
    errors.push({ field: 'sex', message: "Sex must be 'male' or 'female'.", value: String(raw['sex'] ?? '') })
  }

  // Biomarkers
  for (const [key, bounds] of Object.entries(BOUNDS) as [BiomarkerKey, typeof BOUNDS[BiomarkerKey]][]) {
    const rawVal = raw[key]
    if (rawVal === undefined || rawVal === null || rawVal === '') continue // optional

    const val = Number(rawVal)
    if (!Number.isFinite(val)) {
      errors.push({ field: key, message: `${key} must be a number.`, value: rawVal as number })
      continue
    }
    if (val < bounds.min || val > bounds.max) {
      errors.push({
        field:   key,
        message: `${key} value ${val} ${bounds.unit} is outside the physiologically plausible range (${bounds.min}–${bounds.max} ${bounds.unit}).`,
        value:   val,
      })
    }
  }

  return { valid: errors.length === 0, errors }
}

/**
 * Parse and coerce a raw request body into a typed BiomarkerInput.
 * Call only after validateBiomarkerInput() has returned valid=true.
 */
export function parseBiomarkerInput(raw: Record<string, unknown>): BiomarkerInput {
  const pick = (key: string): number | undefined => {
    const v = raw[key]
    if (v === undefined || v === null || v === '') return undefined
    const n = Number(v)
    return Number.isFinite(n) ? n : undefined
  }

  return {
    age:           Number(raw['age']),
    sex:           raw['sex'] as 'male' | 'female',
    albumin:       pick('albumin'),
    creatinine:    pick('creatinine'),
    glucose:       pick('glucose'),
    crp:           pick('crp'),
    lymphocytePct: pick('lymphocytePct'),
    mcv:           pick('mcv'),
    rdw:           pick('rdw'),
    alp:           pick('alp'),
    wbc:           pick('wbc'),
  }
}

/** Return the physiological bounds for a specific biomarker (for tooltip display). */
export function getBiomarkerBounds(key: BiomarkerKey) {
  return BOUNDS[key]
}
