/**
 * Compute service — orchestrates PhenoAge, percentile lookups, and hallmark mapping
 * into the full API response shape.
 */

import type { BiomarkerInput, BiomarkerContribution, BiomarkerKey } from '@/types/biomarkers'
import type { ConfidenceLevel } from '@/types/computation'
import { computePhenoAge } from './phenoage'
import { computeHallmarks, type HallmarkResult } from './hallmarks'
import { getBiomarkerPercentile, getPhenoAgePercentile } from './percentile'

// ─── Response Types ───────────────────────────────────────────────────────────

export interface ContributionWithPercentile extends BiomarkerContribution {
  /** Percentile rank of this biomarker value in the user's age/sex cohort (null if unavailable) */
  cohortPercentile: number | null
}

export interface Citation {
  label: string
  ref: string
  url?: string
}

export interface ComputeResponse {
  biologicalAge: number
  chronologicalAge: number
  acceleration: number
  /** Human-readable acceleration label */
  accelerationLabel: string
  /** Percentile of biological age vs chronological-age-matched NHANES cohort */
  percentile: number | null
  confidence: ConfidenceLevel
  /** 0–100 score corresponding to confidence level */
  confidenceScore: number
  presentCount: number
  totalCount: 9
  contributions: ContributionWithPercentile[]
  hallmarks: HallmarkResult[]
  missingBiomarkers: BiomarkerKey[]
  citations: Citation[]
}

// ─── Static Citations ─────────────────────────────────────────────────────────

const CITATIONS: Citation[] = [
  {
    label: 'PhenoAge Algorithm',
    ref:   'Levine ME et al. Aging (Albany NY). 2018;10(4):573–591.',
    url:   'https://pubmed.ncbi.nlm.nih.gov/29676998/',
  },
  {
    label: 'Reference Population',
    ref:   'National Health and Nutrition Examination Survey (NHANES) 2017–2018. CDC/NCHS.',
    url:   'https://wwwn.cdc.gov/nchs/nhanes/continuousnhanes/default.aspx?BeginYear=2017',
  },
  {
    label: 'Hallmarks of Aging',
    ref:   'López-Otín C et al. Cell. 2023;186(2):243–278.',
    url:   'https://pubmed.ncbi.nlm.nih.gov/36646986/',
  },
]

// ─── Helpers ─────────────────────────────────────────────────────────────────

function confidenceScore(level: ConfidenceLevel): number {
  switch (level) {
    case 'HIGH':         return 100
    case 'MODERATE':     return 83  // avg of 7/9 and 8/9
    case 'LIMITED':      return 61  // avg of 5/9 and 6/9
    case 'INSUFFICIENT': return 0
    default: {
      const _e: never = level
      return 0
    }
  }
}

function buildAccelerationLabel(acceleration: number): string {
  if (!Number.isFinite(acceleration)) return 'Insufficient data'
  const abs = Math.abs(acceleration)
  const rounded = Math.round(abs * 10) / 10
  if (Math.abs(acceleration) < 1) return 'Approximately your chronological age'
  return acceleration < 0
    ? `${rounded} year${rounded !== 1 ? 's' : ''} younger biologically`
    : `${rounded} year${rounded !== 1 ? 's' : ''} older biologically`
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Run the full LabAge computation pipeline for one set of biomarker inputs.
 */
export function runComputation(input: BiomarkerInput): ComputeResponse {
  // 1. PhenoAge core computation
  const pheno = computePhenoAge(input)

  // 2. Cohort percentile for biological age
  const percentile = Number.isFinite(pheno.biologicalAge)
    ? getPhenoAgePercentile(pheno.biologicalAge, input.age, input.sex)
    : null

  // 3. Per-biomarker percentiles
  const contributions: ContributionWithPercentile[] = pheno.contributions.map(c => ({
    ...c,
    cohortPercentile: getBiomarkerPercentile(c.key, c.value, input.age, input.sex),
  }))

  // 4. Hallmark mapping
  const hallmarks = computeHallmarks(input)

  return {
    biologicalAge:     pheno.biologicalAge,
    chronologicalAge:  pheno.chronologicalAge,
    acceleration:      pheno.acceleration,
    accelerationLabel: buildAccelerationLabel(pheno.acceleration),
    percentile,
    confidence:        pheno.confidence,
    confidenceScore:   confidenceScore(pheno.confidence),
    presentCount:      pheno.presentCount,
    totalCount:        pheno.totalCount,
    contributions,
    hallmarks,
    missingBiomarkers: pheno.missingBiomarkers,
    citations:         CITATIONS,
  }
}
