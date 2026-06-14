'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { RotateCcw, ArrowLeft } from 'lucide-react'
import type { ComputeResponse } from '@/lib/computation/compute-service'

import { BiologicalAgeHero }  from '@/components/results/BiologicalAgeHero'
import { ContributionChart }   from '@/components/results/ContributionChart'
import { PercentilePanel }     from '@/components/results/PercentilePanel'
import { HallmarkGrid }        from '@/components/results/HallmarkGrid'
import { CitationsFooter }     from '@/components/results/CitationsFooter'

export default function ResultsPage() {
  const router = useRouter()
  const [result, setResult] = useState<ComputeResponse | null>(null)

  useEffect(() => {
    const stored = sessionStorage.getItem('labage-result')
    if (!stored) { router.replace('/compute'); return }
    try {
      setResult(JSON.parse(stored) as ComputeResponse)
    } catch {
      router.replace('/compute')
    }
  }, [router])

  /* ── Loading state ── */
  if (!result) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#E4E4E7] border-t-[#16A34A]" />
      </div>
    )
  }

  const {
    biologicalAge, chronologicalAge, acceleration, accelerationLabel,
    percentile, confidence, presentCount, totalCount,
    contributions, hallmarks, missingBiomarkers, citations,
  } = result

  /* ── Insufficient data ── */
  if (confidence === 'INSUFFICIENT') {
    return (
      <div className="mx-auto w-full max-w-[680px] px-6 py-12">
        <Link href="/compute"
          className="mb-8 inline-flex items-center gap-1.5 text-sm text-[#71717A] hover:text-[#18181B] transition-colors">
          <ArrowLeft className="h-3.5 w-3.5" /> Back
        </Link>
        <div className="rounded-xl border border-[#E4E4E7] bg-white p-10 text-center space-y-4">
          <p className="text-lg font-medium text-[#18181B]">Not enough data</p>
          <p className="text-sm text-[#71717A] max-w-xs mx-auto">
            Please provide at least 5 of the 9 biomarkers to compute a biological age estimate.
          </p>
          <Link href="/compute"
            className="inline-flex items-center gap-2 rounded-lg bg-[#16A34A] px-5 py-2.5 text-sm font-medium text-white hover:bg-[#15803D] transition-colors">
            Add more biomarkers
          </Link>
        </div>
      </div>
    )
  }

  /* ── Full results ── */
  return (
    <div className="mx-auto w-full max-w-[680px] px-6 py-12">

      {/* Nav */}
      <div className="mb-8 flex items-center justify-between">
        <Link href="/compute"
          className="inline-flex items-center gap-1.5 text-sm text-[#71717A] hover:text-[#18181B] transition-colors">
          <RotateCcw className="h-3.5 w-3.5" /> Recompute
        </Link>
        <Link href="/"
          className="inline-flex items-center gap-1.5 text-sm text-[#71717A] hover:text-[#18181B] transition-colors">
          <ArrowLeft className="h-3.5 w-3.5" /> Home
        </Link>
      </div>

      <div className="space-y-6">

        {/* Section A — Hero */}
        <BiologicalAgeHero
          biologicalAge={biologicalAge}
          chronologicalAge={chronologicalAge}
          acceleration={acceleration}
          accelerationLabel={accelerationLabel}
          percentile={percentile}
          confidence={confidence}
          presentCount={presentCount}
          totalCount={totalCount}
        />

        {/* Section B — Contribution chart */}
        {contributions.length > 0 && (
          <ContributionChart contributions={contributions} />
        )}

        {/* Section C — Percentile panel */}
        <PercentilePanel
          biologicalAgePercentile={percentile}
          contributions={contributions}
        />

        {/* Section D — Hallmark grid */}
        {hallmarks.length > 0 && (
          <HallmarkGrid hallmarks={hallmarks} />
        )}

        {/* Section E — Citations + missing biomarker callout */}
        <CitationsFooter
          citations={citations}
          missingBiomarkers={missingBiomarkers}
        />

      </div>
    </div>
  )
}
