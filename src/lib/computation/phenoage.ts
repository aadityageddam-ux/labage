/**
 * PhenoAge biological age algorithm.
 *
 * Reference:
 *   Levine ME, Lu AT, Quach A, et al.
 *   "An epigenetic biomarker of aging for lifespan and healthspan."
 *   Aging (Albany NY). 2018;10(4):573–591. PMID: 29676998
 *
 * Implementation verified against:
 *   - PMC5940111 Table 1 (biomarker coefficients)
 *   - KyteProject/phenotypic-age-calc (unit conversions + Gompertz formula)
 *   - hillarylinmd/phenoage (alternative validated implementation)
 */

import type { BiomarkerInput, BiomarkerContribution, BiomarkerKey } from '@/types/biomarkers'
import type { PhenoAgeResult } from '@/types/computation'
import { BIOMARKER_KEYS } from '@/types/biomarkers'
import { computeConfidence } from './confidence'

// ─── Published Coefficients (Levine 2018 Table 1) ────────────────────────────
//
// IMPORTANT: These coefficients require SI units as input.
// US-unit values must be converted via the helpers below before applying.

const COEFF = {
  intercept:     -19.9067,
  albumin:        -0.0336,  // per g/L        (US input: g/dL × 10  → g/L)
  creatinine:      0.0095,  // per μmol/L     (US input: mg/dL × 88.4 → μmol/L)
  glucose:         0.1953,  // per mmol/L     (US input: mg/dL × 0.0555 → mmol/L)
  crpLn:           0.0954,  // per ln(mg/dL)  (US input: mg/L × 0.1 → mg/dL, then ln)
  lymphocytePct:  -0.0120,  // per %
  mcv:             0.0268,  // per fL
  rdw:             0.3306,  // per %
  alp:             0.00188, // per U/L
  wbc:             0.0554,  // per K/μL
  age:             0.0804,  // per year
} as const

// ─── Gompertz Mortality Model ─────────────────────────────────────────────────
//
// M = 1 − exp(−exp(xb) × (exp(γ × t) − 1) / γ)
//
// γ = Gompertz shape parameter (rate of mortality increase with age)
// t = 120 months (10-year mortality horizon used to train the model)

const GOMPERTZ_GAMMA = 0.0076927
const GOMPERTZ_T     = 120 // months

// Precompute the time-dependent factor: (exp(γt) − 1) / γ ≈ 197.25
const GOMPERTZ_FACTOR = (Math.exp(GOMPERTZ_GAMMA * GOMPERTZ_T) - 1) / GOMPERTZ_GAMMA

// ─── Phenotypic Age Conversion ────────────────────────────────────────────────
//
// PhenoAge = α + ln(β × ln(1 − M)) / γ₂

const PHENO_ALPHA = 141.50225
const PHENO_BETA  = -0.00553
const PHENO_GAMMA =  0.09165

// ─── Population Means (fallback for missing biomarkers) ───────────────────────
//
// Approximate NHANES adult means (all ages, both sexes combined).
// These will be replaced with age/sex-stratified NHANES 2017–2018 means in Step 3.

const POPULATION_MEANS = {
  albumin:      4.1,  // g/dL
  creatinine:   0.85, // mg/dL
  glucose:      95,   // mg/dL
  crp:          1.5,  // mg/L
  lymphocytePct: 30,  // %
  mcv:          90,   // fL
  rdw:          13.0, // %
  alp:          65,   // U/L
  wbc:          6.5,  // K/μL
} as const satisfies Record<BiomarkerKey, number>

// ─── Display Metadata ─────────────────────────────────────────────────────────

const BIOMARKER_META = {
  albumin:       { displayName: 'Albumin',              unit: 'g/dL' },
  creatinine:    { displayName: 'Creatinine',           unit: 'mg/dL' },
  glucose:       { displayName: 'Glucose',              unit: 'mg/dL' },
  crp:           { displayName: 'C-Reactive Protein',   unit: 'mg/L' },
  lymphocytePct: { displayName: 'Lymphocyte %',         unit: '%' },
  mcv:           { displayName: 'MCV',                  unit: 'fL' },
  rdw:           { displayName: 'RDW',                  unit: '%' },
  alp:           { displayName: 'Alkaline Phosphatase', unit: 'U/L' },
  wbc:           { displayName: 'WBC',                  unit: 'K/μL' },
} as const satisfies Record<BiomarkerKey, { displayName: string; unit: string }>

// ─── Unit Conversion Helpers ──────────────────────────────────────────────────

/** g/dL → g/L */
const toGperL = (gDL: number) => gDL * 10

/** mg/dL → μmol/L */
const toUmolPerL = (mgDL: number) => mgDL * 88.4

/** mg/dL → mmol/L */
const toMmolPerL = (mgDL: number) => mgDL * 0.0555

/**
 * CRP: mg/L → ln(mg/dL)
 * A minimum floor of 0.001 mg/dL prevents ln(0) = −Infinity.
 */
const toCRPLn = (mgL: number) => Math.log(Math.max(mgL * 0.1, 0.001))

// ─── Internal Resolved Shape ─────────────────────────────────────────────────

type ResolvedBiomarkers = Record<BiomarkerKey, { value: number; imputed: boolean }>

/** Build the Gompertz linear predictor (xb) from resolved US-unit biomarkers + age. */
function buildXb(inputs: ResolvedBiomarkers, age: number): number {
  return (
    COEFF.intercept +
    COEFF.albumin       * toGperL(inputs.albumin.value) +
    COEFF.creatinine    * toUmolPerL(inputs.creatinine.value) +
    COEFF.glucose       * toMmolPerL(inputs.glucose.value) +
    COEFF.crpLn         * toCRPLn(inputs.crp.value) +
    COEFF.lymphocytePct * inputs.lymphocytePct.value +
    COEFF.mcv           * inputs.mcv.value +
    COEFF.rdw           * inputs.rdw.value +
    COEFF.alp           * inputs.alp.value +
    COEFF.wbc           * inputs.wbc.value +
    COEFF.age           * age
  )
}

/** Gompertz 10-year mortality probability from linear predictor. */
function mortalityFromXb(xb: number): number {
  return 1 - Math.exp(-Math.exp(xb) * GOMPERTZ_FACTOR)
}

/**
 * Phenotypic age in years from 10-year Gompertz mortality probability.
 * Clamps M to 0.9999 to prevent ln(0) at extreme values.
 */
function phenoAgeFromMortality(M: number): number {
  const m = Math.min(M, 0.9999)
  return PHENO_ALPHA + Math.log(PHENO_BETA * Math.log(1 - m)) / PHENO_GAMMA
}

/**
 * Per-biomarker contributions in biological-age-years.
 *
 * Contribution of biomarker k = PhenoAge(actual) − PhenoAge(k replaced by population mean).
 *   Positive  = this biomarker is adding biological age (aging signal)
 *   Negative  = this biomarker is subtracting biological age (protective signal)
 */
function buildContributions(
  inputs: ResolvedBiomarkers,
  age: number,
): BiomarkerContribution[] {
  const baselineAge = phenoAgeFromMortality(mortalityFromXb(buildXb(inputs, age)))

  return BIOMARKER_KEYS.map((key): BiomarkerContribution => {
    const { value, imputed } = inputs[key]

    // Replace this biomarker with its population mean, all others unchanged
    const withMean: ResolvedBiomarkers = {
      ...inputs,
      [key]: { value: POPULATION_MEANS[key], imputed: true },
    }
    const meanAge = phenoAgeFromMortality(mortalityFromXb(buildXb(withMean, age)))
    const contribution = round1(baselineAge - meanAge)

    return {
      key,
      displayName: BIOMARKER_META[key].displayName,
      value,
      unit: BIOMARKER_META[key].unit,
      contribution,
      imputed,
    }
  })
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Compute biological age using the PhenoAge algorithm (Levine et al., 2018).
 *
 * - Missing biomarkers are imputed with population means; confidence is reduced.
 * - Returns `biologicalAge: NaN` with `confidence: 'INSUFFICIENT'` if fewer than
 *   5 of the 9 biomarkers are provided.
 *
 * @param input  Blood panel values in US units. Age and sex are required.
 */
export function computePhenoAge(input: BiomarkerInput): PhenoAgeResult {
  // Resolve present / missing biomarkers
  const missingBiomarkers: BiomarkerKey[] = []
  const resolved = {} as ResolvedBiomarkers

  for (const key of BIOMARKER_KEYS) {
    const val = input[key]
    if (val != null && isFinite(val)) {
      resolved[key] = { value: val, imputed: false }
    } else {
      missingBiomarkers.push(key)
      resolved[key] = { value: POPULATION_MEANS[key], imputed: true }
    }
  }

  const presentCount = BIOMARKER_KEYS.length - missingBiomarkers.length
  const confidence = computeConfidence(presentCount)

  if (confidence === 'INSUFFICIENT') {
    return {
      biologicalAge:      NaN,
      chronologicalAge:   input.age,
      acceleration:       NaN,
      mortalityScore:     NaN,
      linearPredictor:    NaN,
      presentCount,
      totalCount:         9,
      confidence,
      contributions:      [],
      missingBiomarkers,
    }
  }

  const xb           = buildXb(resolved, input.age)
  const mortalityScore = mortalityFromXb(xb)
  const biologicalAge  = phenoAgeFromMortality(mortalityScore)
  const contributions  = buildContributions(resolved, input.age)

  return {
    biologicalAge:    round1(biologicalAge),
    chronologicalAge: input.age,
    acceleration:     round1(biologicalAge - input.age),
    mortalityScore,
    linearPredictor:  xb,
    presentCount,
    totalCount:       9,
    confidence,
    contributions,
    missingBiomarkers,
  }
}

// ─── Utilities ────────────────────────────────────────────────────────────────

function round1(n: number): number {
  return Math.round(n * 10) / 10
}
