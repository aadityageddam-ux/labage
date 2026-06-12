import type { ConfidenceLevel } from '@/types/computation'

/**
 * Map a biomarker present-count to a confidence level.
 *
 * Thresholds (from PRD §Feature 3):
 *   9/9  → HIGH
 *   7–8  → MODERATE
 *   5–6  → LIMITED
 *   <5   → INSUFFICIENT (computation blocked)
 */
export function computeConfidence(presentCount: number): ConfidenceLevel {
  if (presentCount >= 9) return 'HIGH'
  if (presentCount >= 7) return 'MODERATE'
  if (presentCount >= 5) return 'LIMITED'
  return 'INSUFFICIENT'
}

/** Human-readable label for a confidence level */
export function confidenceLabel(level: ConfidenceLevel): string {
  switch (level) {
    case 'HIGH':         return 'High confidence'
    case 'MODERATE':     return 'Moderate confidence'
    case 'LIMITED':      return 'Limited confidence'
    case 'INSUFFICIENT': return 'Insufficient data'
    default: {
      const _exhaustive: never = level
      return _exhaustive
    }
  }
}
