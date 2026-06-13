/**
 * POST /api/compute
 *
 * Accepts a blood panel JSON body, validates inputs, runs the full
 * PhenoAge computation pipeline, and returns the structured result.
 */

import { validateBiomarkerInput, parseBiomarkerInput } from '@/lib/validation/biomarkers'
import { runComputation } from '@/lib/computation/compute-service'

export async function POST(request: Request): Promise<Response> {
  // Parse body
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return Response.json(
      { error: 'Invalid JSON body.' },
      { status: 400 },
    )
  }

  // Validate inputs
  const validation = validateBiomarkerInput(body)
  if (!validation.valid) {
    return Response.json(
      {
        error: 'Validation failed.',
        details: validation.errors,
      },
      { status: 422 },
    )
  }

  // Parse into typed input
  const input = parseBiomarkerInput(body as Record<string, unknown>)

  // Run full computation
  const result = runComputation(input)

  // If insufficient data, return 200 with the INSUFFICIENT result rather than erroring —
  // the client renders a "not enough data" state based on confidence field.
  return Response.json(result, { status: 200 })
}
