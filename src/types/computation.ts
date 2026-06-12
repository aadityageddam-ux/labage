import type { BiomarkerContribution, BiomarkerKey } from './biomarkers'

export type { BiomarkerContribution, BiomarkerKey }

/**
 * Confidence level based on how many of the 9 biomarkers were user-provided.
 *
 * HIGH         9/9 biomarkers — full computation, no caveats
 * MODERATE     7–8/9 — computation with amber warning
 * LIMITED      5–6/9 — computation with caution banner
 * INSUFFICIENT <5/9  — computation blocked; result is NaN
 */
export type ConfidenceLevel = 'HIGH' | 'MODERATE' | 'LIMITED' | 'INSUFFICIENT'

/** Full result returned by computePhenoAge */
export interface PhenoAgeResult {
  /** Biological age in years (NaN if confidence is INSUFFICIENT) */
  biologicalAge: number
  /** Chronological age from input */
  chronologicalAge: number
  /**
   * biologicalAge − chronologicalAge
   * Negative = biologically younger; Positive = biologically older
   */
  acceleration: number
  /** Gompertz 10-year all-cause mortality probability (0–1) */
  mortalityScore: number
  /** Raw Gompertz linear predictor (xb) before mortality conversion */
  linearPredictor: number
  /** Number of biomarkers supplied by the user (not imputed) */
  presentCount: number
  /** Total possible biomarkers (always 9) */
  totalCount: 9
  confidence: ConfidenceLevel
  contributions: BiomarkerContribution[]
  /** Keys of biomarkers that were missing and replaced with population means */
  missingBiomarkers: BiomarkerKey[]
}
