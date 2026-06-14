'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { RotateCcw, ArrowLeft, Copy, Check } from 'lucide-react'
import type { ComputeResponse } from '@/lib/computation/compute-service'

import { BiologicalAgeHero }  from '@/components/results/BiologicalAgeHero'
import { ContributionChart }   from '@/components/results/ContributionChart'
import { PercentilePanel }     from '@/components/results/PercentilePanel'
import { HallmarkGrid }        from '@/components/results/HallmarkGrid'
import { CitationsFooter }     from '@/components/results/CitationsFooter'

export default function ResultsPage() {
  const router = useRouter()
  const [result, setResult]   = useState<ComputeResponse | null>(null)
  const [copied, setCopied]   = useState(false)

  useEffect(() => {
    const stored = sessionStorage.getItem('labage-result')
    if (!stored) { router.replace('/compute'); return }
    try { setResult(JSON.parse(stored) as ComputeResponse) }
    catch { router.replace('/compute') }
  }, [router])

  const handleCopy = useCallback(() => {
    if (!result) return
    const { biologicalAge, chronologicalAge, acceleration, accelerationLabel, percentile, confidence } = result
    const text = [
      `LabAge — Biological Age Report`,
      ``,
      `Biological Age:      ${biologicalAge.toFixed(1)} years`,
      `Chronological Age:   ${chronologicalAge} years`,
      `Acceleration:        ${accelerationLabel}`,
      percentile !== null ? `Cohort Percentile:   ${Math.round(percentile)}th` : null,
      `Confidence:          ${confidence} (${result.presentCount}/${result.totalCount} biomarkers)`,
      ``,
      `Algorithm: PhenoAge (Levine et al., Aging 2018)`,
      `Reference: NHANES 2017–2018 · labage.app`,
    ].filter(Boolean).join('\n')

    navigator.clipboard.writeText(text).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }, [result])

  /* ── Loading ── */
  if (!result) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#E4E4E7] border-t-[#16A34A]" />
      </div>
    )
  }

  const { biologicalAge, chronologicalAge, acceleration, accelerationLabel,
          percentile, confidence, presentCount, totalCount,
          contributions, hallmarks, missingBiomarkers, citations } = result

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
            className="inline-flex min-h-[44px] items-center gap-2 rounded-lg bg-[#16A34A] px-5 py-2.5 text-sm font-medium text-white hover:bg-[#15803D] transition-colors">
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
          className="inline-flex min-h-[44px] items-center gap-1.5 text-sm text-[#71717A] hover:text-[#18181B] transition-colors">
          <RotateCcw className="h-3.5 w-3.5" /> Recompute
        </Link>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleCopy}
            className="inline-flex min-h-[44px] items-center gap-1.5 rounded-lg border border-[#E4E4E7] bg-white px-3 text-sm text-[#71717A] hover:border-[#18181B] hover:text-[#18181B] transition-colors"
            aria-label="Copy result to clipboard"
          >
            {copied
              ? <><Check className="h-3.5 w-3.5 text-[#16A34A]" /> Copied</>
              : <><Copy className="h-3.5 w-3.5" /> Copy</>
            }
          </button>
          <Link href="/"
            className="inline-flex min-h-[44px] items-center gap-1.5 text-sm text-[#71717A] hover:text-[#18181B] transition-colors">
            <ArrowLeft className="h-3.5 w-3.5" /> Home
          </Link>
        </div>
      </div>

      {/* 32px between sections (space-y-8) per PRD */}
      <div className="space-y-8">
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
        {contributions.length > 0 && (
          <ContributionChart contributions={contributions} />
        )}
        <PercentilePanel
          biologicalAgePercentile={percentile}
          contributions={contributions}
        />
        {hallmarks.length > 0 && (
          <HallmarkGrid hallmarks={hallmarks} />
        )}
        <CitationsFooter
          citations={citations}
          missingBiomarkers={missingBiomarkers}
        />
      </div>
    </div>
  )
}
