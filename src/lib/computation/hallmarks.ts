/**
 * Biomarker → Hallmarks of Aging mapping.
 *
 * Maps PhenoAge biomarker values to the 12 Hallmarks of Aging framework.
 * Hallmarks covered: those with direct proxy biomarkers in a standard blood panel.
 *
 * Reference:
 *   López-Otín C, Blasco MA, Partridge L, et al.
 *   "Hallmarks of aging: An expanding universe."
 *   Cell. 2023;186(2):243–278.
 */

import hallmarkDefs from '../../../data/hallmark_mapping.json'
import type { BiomarkerInput, BiomarkerKey } from '@/types/biomarkers'

// ─── Public Types ─────────────────────────────────────────────────────────────

export type HallmarkStatus = 'OPTIMAL' | 'WATCH' | 'ELEVATED' | 'NOT_ASSESSED'

export interface HallmarkResult {
  key: string
  displayName: string
  status: HallmarkStatus
  /** Biomarker keys relevant to this hallmark */
  biomarkers: BiomarkerKey[]
  /** Biomarker keys that were present (not imputed) and used for assessment */
  presentBiomarkers: BiomarkerKey[]
  /** Human-readable explanation of the status */
  explanation: string
  citation: string
}

// ─── Threshold Definitions ────────────────────────────────────────────────────
//
// Each biomarker used in a hallmark context has:
//   OPTIMAL range  → the target zone  (two-sided for most)
//   ELEVATED range → clinically concerning
//   WATCH          → the gap between optimal and elevated
//
// Thresholds are in US units (same units as BiomarkerInput).

interface Thresholds {
  /** Value at or below which → OPTIMAL (for "lower is better" biomarkers) */
  optimalMax?: number
  /** Value at or above which → OPTIMAL (for "higher is better" biomarkers) */
  optimalMin?: number
  /** Value at or above which → ELEVATED (for "lower is better" biomarkers) */
  elevatedMin?: number
  /** Value at or below which → ELEVATED (for "higher is better" biomarkers) */
  elevatedMax?: number
}

function scoreBiomarker(value: number, t: Thresholds): 'OPTIMAL' | 'WATCH' | 'ELEVATED' {
  // Lower-is-better biomarker (e.g. CRP, glucose, RDW, WBC)
  if (t.optimalMax !== undefined && t.elevatedMin !== undefined) {
    if (value <= t.optimalMax)  return 'OPTIMAL'
    if (value >= t.elevatedMin) return 'ELEVATED'
    return 'WATCH'
  }

  // Higher-is-better biomarker (e.g. albumin, lymphocytePct)
  if (t.optimalMin !== undefined && t.elevatedMax !== undefined) {
    if (value >= t.optimalMin)  return 'OPTIMAL'
    if (value <= t.elevatedMax) return 'ELEVATED'
    return 'WATCH'
  }

  return 'WATCH' // fallback
}

// ─── Per-Hallmark Assessment Logic ───────────────────────────────────────────

type HallmarkKey = keyof typeof hallmarkDefs

interface HallmarkDef {
  biomarkers: BiomarkerKey[]
  assess: (input: BiomarkerInput) => {
    status: HallmarkStatus
    presentBiomarkers: BiomarkerKey[]
    explanation: string
  }
}

const HALLMARK_LOGIC: Record<HallmarkKey, HallmarkDef> = {
  chronic_inflammation: {
    biomarkers: ['crp', 'wbc'],
    assess(input) {
      const present: BiomarkerKey[] = []
      const scores: ('OPTIMAL' | 'WATCH' | 'ELEVATED')[] = []

      if (input.crp != null) {
        present.push('crp')
        scores.push(scoreBiomarker(input.crp, { optimalMax: 1.0, elevatedMin: 3.0 }))
      }
      if (input.wbc != null) {
        present.push('wbc')
        // WBC: normal range 3.5–9.5 K/μL; elevated > 11.0
        scores.push(scoreBiomarker(input.wbc, { optimalMax: 9.5, elevatedMin: 11.0 }))
      }

      const status = aggregateStatus(scores)
      return {
        status,
        presentBiomarkers: present,
        explanation: explanationFor(status, {
          OPTIMAL: 'Your CRP and WBC are in the optimal range, suggesting low systemic inflammation.',
          WATCH:   'One or more inflammation markers are mildly elevated. Monitoring and lifestyle interventions may help.',
          ELEVATED:'Your inflammation markers (CRP and/or WBC) are significantly elevated — a key driver of accelerated biological aging.',
          NOT_ASSESSED: 'No inflammation markers (CRP, WBC) were provided.',
        }),
      }
    },
  },

  deregulated_nutrient_sensing: {
    biomarkers: ['glucose'],
    assess(input) {
      if (input.glucose == null) {
        return notAssessed(['glucose'], 'No glucose value was provided.')
      }
      // Fasting glucose: < 100 = normal, 100-125 = pre-diabetic, ≥ 126 = diabetic
      const score = scoreBiomarker(input.glucose, { optimalMax: 99, elevatedMin: 126 })
      return {
        status:            score,
        presentBiomarkers: ['glucose'],
        explanation: explanationFor(score, {
          OPTIMAL: `Your glucose (${input.glucose} mg/dL) is in the optimal range, indicating healthy insulin sensitivity.`,
          WATCH:   `Your glucose (${input.glucose} mg/dL) is in the pre-diabetic range. Dietary changes can help normalize it.`,
          ELEVATED:`Your glucose (${input.glucose} mg/dL) is elevated, indicating insulin resistance or diabetes — a strong driver of accelerated aging.`,
          NOT_ASSESSED: '',
        }),
      }
    },
  },

  loss_of_proteostasis: {
    biomarkers: ['albumin'],
    assess(input) {
      if (input.albumin == null) {
        return notAssessed(['albumin'], 'No albumin value was provided.')
      }
      // Albumin: > 4.0 = optimal, < 3.5 = low/elevated concern
      const score = scoreBiomarker(input.albumin, { optimalMin: 4.0, elevatedMax: 3.5 })
      return {
        status:            score,
        presentBiomarkers: ['albumin'],
        explanation: explanationFor(score, {
          OPTIMAL: `Your albumin (${input.albumin} g/dL) reflects healthy protein synthesis and liver function.`,
          WATCH:   `Your albumin (${input.albumin} g/dL) is slightly below optimal. Protein intake and liver health may benefit from attention.`,
          ELEVATED:`Your albumin (${input.albumin} g/dL) is low — a significant marker of impaired protein homeostasis and liver stress.`,
          NOT_ASSESSED: '',
        }),
      }
    },
  },

  mitochondrial_dysfunction: {
    biomarkers: ['creatinine'],
    assess(input) {
      if (input.creatinine == null) {
        return notAssessed(['creatinine'], 'No creatinine value was provided.')
      }
      // Creatinine context: very low (<0.6) may indicate muscle loss; high (>1.3 female, >1.5 male) may indicate kidney stress
      // As a proxy for mitochondrial/muscle function: moderate is optimal
      const score = scoreBiomarker(input.creatinine, { optimalMin: 0.6, elevatedMax: 0.5 })
      // Note: high creatinine signals kidney issue, not mitochondrial dysfunction directly
      // For simplicity, flag very low values as ELEVATED (muscle wasting)
      const status: HallmarkStatus = score === 'ELEVATED' ? 'ELEVATED' : 'OPTIMAL'
      return {
        status,
        presentBiomarkers: ['creatinine'],
        explanation: explanationFor(status, {
          OPTIMAL: `Your creatinine (${input.creatinine} mg/dL) reflects adequate muscle mass and mitochondrial output.`,
          WATCH:   `Your creatinine (${input.creatinine} mg/dL) is borderline. This can reflect reduced muscle mass or kidney changes.`,
          ELEVATED:`Your creatinine (${input.creatinine} mg/dL) is very low, which may reflect reduced muscle mass and mitochondrial capacity.`,
          NOT_ASSESSED: '',
        }),
      }
    },
  },

  cellular_senescence: {
    biomarkers: ['rdw', 'mcv', 'alp'],
    assess(input) {
      const present: BiomarkerKey[] = []
      const scores: ('OPTIMAL' | 'WATCH' | 'ELEVATED')[] = []

      if (input.rdw != null) {
        present.push('rdw')
        // RDW: < 13.0 = optimal, > 14.5 = elevated
        scores.push(scoreBiomarker(input.rdw, { optimalMax: 13.0, elevatedMin: 14.5 }))
      }
      if (input.mcv != null) {
        present.push('mcv')
        // MCV: 80–100 fL normal; > 100 = macrocytosis (aging signal)
        scores.push(scoreBiomarker(input.mcv, { optimalMax: 97, elevatedMin: 101 }))
      }
      if (input.alp != null) {
        present.push('alp')
        // ALP: 44–147 U/L typical range
        scores.push(scoreBiomarker(input.alp, { optimalMax: 100, elevatedMin: 147 }))
      }

      const status = aggregateStatus(scores)
      return {
        status,
        presentBiomarkers: present,
        explanation: explanationFor(status, {
          OPTIMAL: 'Your RDW, MCV, and ALP values suggest healthy red blood cell turnover and low senescent burden.',
          WATCH:   'One or more markers of cellular aging (RDW, MCV, ALP) are mildly outside the optimal range.',
          ELEVATED:'Your hematological aging markers (elevated RDW and/or MCV) indicate increased cellular senescence and hematopoietic stress.',
          NOT_ASSESSED: 'No markers of cellular senescence (RDW, MCV, ALP) were provided.',
        }),
      }
    },
  },

  altered_intercellular_communication: {
    biomarkers: ['lymphocytePct'],
    assess(input) {
      if (input.lymphocytePct == null) {
        return notAssessed(['lymphocytePct'], 'No lymphocyte percentage was provided.')
      }
      // Lymphocyte %: 20–40% = optimal; < 15% = lymphopenia (elevated concern)
      const score = scoreBiomarker(input.lymphocytePct, { optimalMin: 20, elevatedMax: 15 })
      return {
        status:            score,
        presentBiomarkers: ['lymphocytePct'],
        explanation: explanationFor(score, {
          OPTIMAL: `Your lymphocyte % (${input.lymphocytePct}%) reflects a healthy adaptive immune system.`,
          WATCH:   `Your lymphocyte % (${input.lymphocytePct}%) is slightly below the optimal range — a subtle immune aging signal.`,
          ELEVATED:`Your lymphocyte % (${input.lymphocytePct}%) is low, suggesting immunosenescence and impaired adaptive immunity.`,
          NOT_ASSESSED: '',
        }),
      }
    },
  },
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function notAssessed(biomarkers: BiomarkerKey[], explanation: string) {
  return { status: 'NOT_ASSESSED' as const, presentBiomarkers: [] as BiomarkerKey[], explanation }
}

function aggregateStatus(
  scores: ('OPTIMAL' | 'WATCH' | 'ELEVATED')[],
): HallmarkStatus {
  if (scores.length === 0) return 'NOT_ASSESSED'
  if (scores.some(s => s === 'ELEVATED')) return 'ELEVATED'
  if (scores.some(s => s === 'WATCH'))    return 'WATCH'
  return 'OPTIMAL'
}

function explanationFor(
  status: HallmarkStatus,
  messages: Record<HallmarkStatus, string>,
): string {
  return messages[status] ?? ''
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Map a user's biomarker values to the Hallmarks of Aging framework.
 * Returns one result per hallmark, including status and explanation.
 */
export function computeHallmarks(input: BiomarkerInput): HallmarkResult[] {
  return (Object.entries(HALLMARK_LOGIC) as [HallmarkKey, HallmarkDef][]).map(
    ([key, def]) => {
      const meta = hallmarkDefs[key]
      const { status, presentBiomarkers, explanation } = def.assess(input)

      return {
        key,
        displayName:       meta.displayName,
        status,
        biomarkers:        def.biomarkers,
        presentBiomarkers,
        explanation,
        citation:          meta.citation,
      }
    },
  )
}
