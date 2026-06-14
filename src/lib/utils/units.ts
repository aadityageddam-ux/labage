/**
 * US ↔ SI unit conversion utilities for PhenoAge biomarkers.
 *
 * The API always expects US units. Values are stored in the active
 * display unit system and converted to US before submission.
 */

import type { BiomarkerKey } from '@/types/biomarkers'

export type UnitSystem = 'US' | 'SI'

// ─── Unit Labels ──────────────────────────────────────────────────────────────

const US_LABELS: Record<BiomarkerKey, string> = {
  albumin:       'g/dL',
  creatinine:    'mg/dL',
  glucose:       'mg/dL',
  crp:           'mg/L',
  lymphocytePct: '%',
  mcv:           'fL',
  rdw:           '%',
  alp:           'U/L',
  wbc:           'K/μL',
}

const SI_LABELS: Record<BiomarkerKey, string> = {
  albumin:       'g/L',
  creatinine:    'μmol/L',
  glucose:       'mmol/L',
  crp:           'mg/L',    // same in both systems
  lymphocytePct: '%',
  mcv:           'fL',
  rdw:           '%',
  alp:           'U/L',
  wbc:           '×10⁹/L', // same numeric value as K/μL
}

export function unitLabel(key: BiomarkerKey, system: UnitSystem): string {
  return system === 'US' ? US_LABELS[key] : SI_LABELS[key]
}

// ─── Conversion Factors ───────────────────────────────────────────────────────

const US_TO_SI_FACTOR: Partial<Record<BiomarkerKey, number>> = {
  albumin:    10,      // g/dL → g/L
  creatinine: 88.4,    // mg/dL → μmol/L
  glucose:    0.0555,  // mg/dL → mmol/L
}

// ─── Public Converters ────────────────────────────────────────────────────────

/** Convert a US-unit value to SI display units. Returns the value unchanged if no conversion. */
export function toSIDisplay(key: BiomarkerKey, usValue: number): number {
  const factor = US_TO_SI_FACTOR[key]
  return factor ? usValue * factor : usValue
}

/** Convert an SI-unit display value back to US units (for API submission). */
export function fromSIDisplay(key: BiomarkerKey, siValue: number): number {
  const factor = US_TO_SI_FACTOR[key]
  return factor ? siValue / factor : siValue
}

/**
 * Convert a display value (in the current unit system) to US units for API submission.
 * Returns the value unchanged if already in US, or converts from SI.
 */
export function toUSForAPI(key: BiomarkerKey, displayValue: number, system: UnitSystem): number {
  if (system === 'US') return displayValue
  return fromSIDisplay(key, displayValue)
}

/**
 * Convert a US-unit value to the current display unit system.
 */
export function toDisplayFromUS(key: BiomarkerKey, usValue: number, system: UnitSystem): number {
  if (system === 'US') return usValue
  return toSIDisplay(key, usValue)
}

// ─── Input Step / Precision ───────────────────────────────────────────────────
//
// The HTML <input step="..."> attribute should reflect the precision expected
// for each biomarker in each unit system.

const US_STEPS: Record<BiomarkerKey, string> = {
  albumin:       '0.1',
  creatinine:    '0.01',
  glucose:       '1',
  crp:           '0.01',
  lymphocytePct: '0.1',
  mcv:           '0.1',
  rdw:           '0.1',
  alp:           '1',
  wbc:           '0.1',
}

const SI_STEPS: Record<BiomarkerKey, string> = {
  albumin:       '1',
  creatinine:    '1',
  glucose:       '0.1',
  crp:           '0.01',
  lymphocytePct: '0.1',
  mcv:           '0.1',
  rdw:           '0.1',
  alp:           '1',
  wbc:           '0.1',
}

export function inputStep(key: BiomarkerKey, system: UnitSystem): string {
  return system === 'US' ? US_STEPS[key] : SI_STEPS[key]
}
