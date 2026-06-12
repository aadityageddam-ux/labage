/**
 * Biomarker types for LabAge input/output.
 * All user-facing values are in US units (g/dL, mg/dL, mg/L, etc.)
 */

export const BIOMARKER_KEYS = [
  'albumin',
  'creatinine',
  'glucose',
  'crp',
  'lymphocytePct',
  'mcv',
  'rdw',
  'alp',
  'wbc',
] as const

export type BiomarkerKey = (typeof BIOMARKER_KEYS)[number]

/**
 * User-provided blood panel values.
 * Age and sex are required; all biomarkers are optional (missing ones are imputed).
 *
 * Units:
 *   albumin       g/dL
 *   creatinine    mg/dL
 *   glucose       mg/dL
 *   crp           mg/L
 *   lymphocytePct %
 *   mcv           fL
 *   rdw           %
 *   alp           U/L
 *   wbc           K/μL (thousands per microliter)
 */
export interface BiomarkerInput {
  /** Chronological age in years */
  age: number
  /** Biological sex — used for NHANES percentile reference (Step 3) */
  sex: 'male' | 'female'

  albumin?: number
  creatinine?: number
  glucose?: number
  crp?: number
  lymphocytePct?: number
  mcv?: number
  rdw?: number
  alp?: number
  wbc?: number
}

/** Per-biomarker contribution to biological age from the PhenoAge computation */
export interface BiomarkerContribution {
  key: BiomarkerKey
  displayName: string
  /** Value used in computation (user-provided or imputed from population mean) */
  value: number
  unit: string
  /**
   * Years of biological age this biomarker adds/removes relative to population mean.
   * Positive  = aging signal (above-mean harmful contribution)
   * Negative  = protective signal (below-mean beneficial contribution)
   */
  contribution: number
  /** True if value was substituted from population mean (not user-provided) */
  imputed: boolean
}
