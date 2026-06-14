'use client'

import { motion } from 'framer-motion'
import { ConfidencePill } from './ConfidencePill'
import { fmtPercentile } from '@/lib/utils/formatting'
import type { ConfidenceLevel } from '@/types/computation'

interface BiologicalAgeHeroProps {
  biologicalAge: number
  chronologicalAge: number
  acceleration: number
  accelerationLabel: string
  percentile: number | null
  confidence: ConfidenceLevel
  presentCount: number
  totalCount: 9
}

export function BiologicalAgeHero({
  biologicalAge,
  chronologicalAge,
  acceleration,
  accelerationLabel,
  percentile,
  confidence,
  presentCount,
  totalCount,
}: BiologicalAgeHeroProps) {
  const absAcc = Math.abs(acceleration)
  const isNeutral = absAcc < 1
  const isYounger = !isNeutral && acceleration < 0

  const ageColor = isNeutral
    ? '#71717A'
    : isYounger
    ? '#16A34A'
    : '#DC2626'

  const accelBg = isNeutral
    ? 'bg-[#F4F4F5] text-[#71717A]'
    : isYounger
    ? 'bg-[#DCFCE7] text-[#16A34A]'
    : 'bg-[#FEE2E2] text-[#DC2626]'

  return (
    <motion.section
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      className="rounded-xl border border-[#E4E4E7] bg-white p-8"
      data-testid="biological-age"
    >
      {/* Two large numbers */}
      <div className="flex items-end justify-between gap-4">
        <div className="min-w-0">
          <p className="mb-1 whitespace-nowrap text-xs font-medium uppercase tracking-widest text-[#71717A]">
            Biological Age
          </p>
          <p
            className="font-serif italic leading-none"
            style={{ fontSize: 'clamp(3.5rem, 16vw, 6rem)', color: ageColor }}
          >
            {biologicalAge.toFixed(1)}
          </p>
        </div>
        <div className="flex-shrink-0 text-right">
          <p className="mb-1 whitespace-nowrap text-xs font-medium uppercase tracking-widest text-[#71717A]">
            Chron. Age
          </p>
          <p className="leading-none font-semibold text-[#71717A]"
             style={{ fontSize: 'clamp(2rem, 10vw, 3.5rem)' }}>
            {chronologicalAge}
          </p>
        </div>
      </div>

      {/* Acceleration + meta row */}
      <div className="mt-6 space-y-3">
        <span className={`inline-flex items-center rounded-full px-3 py-1.5 text-sm font-medium ${accelBg}`}>
          {isYounger ? '↓' : isNeutral ? '→' : '↑'} {accelerationLabel}
        </span>

        <div className="flex flex-wrap items-center gap-2 text-sm text-[#71717A]">
          {percentile !== null && (
            <span>{fmtPercentile(percentile)} percentile for your cohort</span>
          )}
          {percentile !== null && (
            <span className="text-[#E4E4E7]">·</span>
          )}
          <ConfidencePill level={confidence} presentCount={presentCount} totalCount={totalCount} />
        </div>
      </div>
    </motion.section>
  )
}
