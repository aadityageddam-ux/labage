'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, RotateCcw } from 'lucide-react'
import type { ComputeResponse } from '@/lib/computation/compute-service'
import { fmt1, fmtPercentile } from '@/lib/utils/formatting'

function ConfidencePill({ level }: { level: string }) {
  const styles = {
    HIGH:         'bg-[#DCFCE7] text-[#16A34A]',
    MODERATE:     'bg-[#FEF3C7] text-[#D97706]',
    LIMITED:      'bg-[#FEF3C7] text-[#D97706]',
    INSUFFICIENT: 'bg-[#FEE2E2] text-[#DC2626]',
  }[level] ?? 'bg-[#F4F4F5] text-[#71717A]'

  const labels = {
    HIGH:         'High confidence',
    MODERATE:     'Moderate confidence',
    LIMITED:      'Limited confidence',
    INSUFFICIENT: 'Insufficient data',
  }[level] ?? level

  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${styles}`}>
      {labels}
    </span>
  )
}

export default function ResultsPage() {
  const router = useRouter()
  const [result, setResult] = useState<ComputeResponse | null>(null)

  useEffect(() => {
    const stored = sessionStorage.getItem('labage-result')
    if (!stored) {
      router.replace('/compute')
      return
    }
    try {
      setResult(JSON.parse(stored) as ComputeResponse)
    } catch {
      router.replace('/compute')
    }
  }, [router])

  if (!result) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#E4E4E7] border-t-[#16A34A]" />
      </div>
    )
  }

  const { biologicalAge, chronologicalAge, acceleration, accelerationLabel, percentile, confidence } = result
  const isInsufficient = confidence === 'INSUFFICIENT'
  const isYounger = Number.isFinite(acceleration) && acceleration < 0

  const accelColor = !Number.isFinite(acceleration)
    ? 'text-[#71717A]'
    : Math.abs(acceleration) < 1
    ? 'text-[#71717A]'
    : isYounger
    ? 'text-[#16A34A]'
    : 'text-[#DC2626]'

  return (
    <div className="mx-auto w-full max-w-[680px] px-6 py-12">

      {/* Nav */}
      <div className="mb-8 flex items-center justify-between">
        <Link
          href="/compute"
          className="inline-flex items-center gap-1.5 text-sm text-[#71717A] hover:text-[#18181B] transition-colors"
        >
          <RotateCcw className="h-3.5 w-3.5" />
          Recompute
        </Link>
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-sm text-[#71717A] hover:text-[#18181B] transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Home
        </Link>
      </div>

      {isInsufficient ? (
        <div className="rounded-xl border border-[#E4E4E7] bg-white p-8 text-center space-y-4">
          <p className="text-lg font-medium text-[#18181B]">Not enough data</p>
          <p className="text-sm text-[#71717A]">
            Please provide at least 5 of the 9 biomarkers to compute a biological age estimate.
          </p>
          <Link
            href="/compute"
            className="inline-flex items-center gap-2 rounded-lg bg-[#16A34A] px-5 py-2.5 text-sm font-medium text-white hover:bg-[#15803D] transition-colors"
          >
            Add more biomarkers
          </Link>
        </div>
      ) : (
        <div className="space-y-8">

          {/* ── Hero ── */}
          <section
            className="rounded-xl border border-[#E4E4E7] bg-white p-8"
            data-testid="biological-age"
          >
            <div className="flex items-end justify-between">
              {/* Biological age */}
              <div>
                <p className="mb-1 text-xs font-medium uppercase tracking-widest text-[#71717A]">
                  Biological Age
                </p>
                <p
                  className="font-serif italic leading-none"
                  style={{ fontSize: '5rem', color: isYounger ? '#16A34A' : '#DC2626' }}
                >
                  {fmt1(biologicalAge)}
                </p>
              </div>

              {/* Chronological age */}
              <div className="text-right">
                <p className="mb-1 text-xs font-medium uppercase tracking-widest text-[#71717A]">
                  Chronological Age
                </p>
                <p className="text-5xl font-semibold text-[#71717A]">
                  {chronologicalAge}
                </p>
              </div>
            </div>

            {/* Summary row */}
            <div className="mt-6 space-y-2">
              <p className={`text-base font-medium ${accelColor}`}>
                {accelerationLabel}
              </p>
              <div className="flex flex-wrap items-center gap-2 text-sm text-[#71717A]">
                {percentile !== null && (
                  <span>{fmtPercentile(percentile)} percentile for your cohort</span>
                )}
                {percentile !== null && <span>·</span>}
                <ConfidencePill level={confidence} />
                <span>
                  ({result.presentCount}/{result.totalCount} biomarkers)
                </span>
              </div>
            </div>
          </section>

          {/* ── What's coming ── */}
          <section className="rounded-xl border border-dashed border-[#E4E4E7] p-6 text-center space-y-2">
            <p className="text-sm font-medium text-[#18181B]">Full breakdown coming in Step 6</p>
            <p className="text-xs text-[#71717A]">
              Contribution chart · Hallmark grid · Percentile panel · Citations
            </p>
          </section>

          {/* ── Missing biomarkers callout ── */}
          {result.missingBiomarkers.length > 0 && (
            <section className="rounded-xl border border-[#D97706]/30 bg-[#FEF3C7] p-5">
              <p className="text-sm font-medium text-[#D97706]">
                {result.missingBiomarkers.length} biomarker{result.missingBiomarkers.length > 1 ? 's' : ''} imputed from population means
              </p>
              <p className="mt-1 text-xs text-[#92400E]">
                Adding {result.missingBiomarkers.join(', ')} would improve accuracy from{' '}
                {confidence} confidence to HIGH.
              </p>
            </section>
          )}

          {/* ── Citations footer ── */}
          <footer className="border-t border-[#E4E4E7] pt-6 space-y-1">
            {result.citations.map(c => (
              <p key={c.label} className="text-xs text-[#71717A]">
                <span className="font-medium">{c.label}:</span>{' '}
                {c.url ? (
                  <a href={c.url} target="_blank" rel="noopener noreferrer"
                     className="hover:text-[#18181B] underline underline-offset-2">
                    {c.ref}
                  </a>
                ) : c.ref}
              </p>
            ))}
            <p className="mt-3 text-xs text-[#A1A1AA]">
              This is not a medical diagnosis. Consult your physician for clinical interpretation.
            </p>
          </footer>

        </div>
      )}
    </div>
  )
}
