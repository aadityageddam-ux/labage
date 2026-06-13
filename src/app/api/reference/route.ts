/**
 * GET /api/reference
 *
 * Returns NHANES 2017-2018 percentile reference data for a given age/sex stratum.
 * Used by the results page to draw reference range overlays on charts.
 *
 * Query params:
 *   age   required  chronological age (integer)
 *   sex   required  'male' | 'female'
 */

import type { NextRequest } from 'next/server'
import { getBiomarkerStats, getPhenoAgeStats, AVAILABLE_STRATA, REFERENCE_META } from '@/lib/computation/percentile'
import { BIOMARKER_KEYS } from '@/types/biomarkers'

export async function GET(request: NextRequest): Promise<Response> {
  const { searchParams } = request.nextUrl

  const ageParam = searchParams.get('age')
  const sexParam = searchParams.get('sex')

  if (!ageParam || !sexParam) {
    return Response.json(
      { error: "Query params 'age' (number) and 'sex' ('male'|'female') are required." },
      { status: 400 },
    )
  }

  const age = Number(ageParam)
  if (!Number.isFinite(age) || age < 1 || age > 120) {
    return Response.json({ error: 'age must be a number between 1 and 120.' }, { status: 400 })
  }

  if (sexParam !== 'male' && sexParam !== 'female') {
    return Response.json({ error: "sex must be 'male' or 'female'." }, { status: 400 })
  }

  const sex = sexParam as 'male' | 'female'

  // Collect stats for all biomarkers in this stratum
  const biomarkerStats: Record<string, ReturnType<typeof getBiomarkerStats>> = {}
  for (const key of BIOMARKER_KEYS) {
    biomarkerStats[key] = getBiomarkerStats(key, age, sex)
  }

  const phenoageStats = getPhenoAgeStats(age, sex)

  if (!phenoageStats) {
    return Response.json(
      { error: `No NHANES reference data available for age ${age}. Coverage: 18–89 years.` },
      { status: 404 },
    )
  }

  return Response.json({
    meta: REFERENCE_META,
    availableStrata: AVAILABLE_STRATA,
    phenoage: phenoageStats,
    biomarkers: biomarkerStats,
  })
}
