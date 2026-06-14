'use client'

import { motion } from 'framer-motion'
import type { ContributionWithPercentile } from '@/lib/computation/compute-service'

interface PercentilePanelProps {
  biologicalAgePercentile: number | null
  contributions: ContributionWithPercentile[]
}

function PercentileTrack({
  percentile,
  label,
  size = 'md',
}: {
  percentile: number | null
  label: string
  size?: 'lg' | 'md'
}) {
  const pct = percentile ?? 50
  const clamped = Math.max(1, Math.min(99, pct))

  const dotColor =
    clamped < 25 ? '#16A34A'
    : clamped < 75 ? '#D97706'
    : '#DC2626'

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-xs text-[#71717A]">
        <span className={size === 'lg' ? 'font-medium text-[#18181B]' : ''}>{label}</span>
        {percentile !== null ? (
          <span className={`font-mono font-medium ${
            clamped < 25 ? 'text-[#16A34A]' : clamped < 75 ? 'text-[#D97706]' : 'text-[#DC2626]'
          }`}>
            {Math.round(clamped)}th pct
          </span>
        ) : (
          <span className="text-[#A1A1AA]">—</span>
        )}
      </div>

      {/* Track */}
      <div className={`relative rounded-full bg-[#F4F4F5] ${size === 'lg' ? 'h-3' : 'h-1.5'}`}>
        {/* Colored fill */}
        <div
          className="absolute inset-y-0 left-0 rounded-full transition-all duration-700"
          style={{
            width: `${clamped}%`,
            background: clamped < 25
              ? 'linear-gradient(to right, #16A34A, #4ADE80)'
              : clamped < 75
              ? 'linear-gradient(to right, #4ADE80, #FCD34D, #D97706)'
              : 'linear-gradient(to right, #D97706, #DC2626)',
          }}
        />
        {/* Dot */}
        {percentile !== null && (
          <div
            className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow-sm transition-all duration-700"
            style={{
              left: `${clamped}%`,
              width: size === 'lg' ? 16 : 10,
              height: size === 'lg' ? 16 : 10,
              background: dotColor,
            }}
          />
        )}
      </div>

      {size === 'lg' && (
        <div className="flex justify-between text-xs text-[#A1A1AA]">
          <span>10th</span><span>25th</span><span>50th</span><span>75th</span><span>90th</span>
        </div>
      )}
    </div>
  )
}

export function PercentilePanel({ biologicalAgePercentile, contributions }: PercentilePanelProps) {
  const withPercentile = contributions.filter(c => c.cohortPercentile !== null && !c.imputed)

  return (
    <motion.section
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.22, ease: 'easeOut' }}
      className="rounded-xl border border-[#E4E4E7] bg-white p-6 space-y-6"
    >
      <div>
        <h2 className="text-sm font-semibold text-[#18181B]">How you compare</h2>
        <p className="mt-1 text-xs text-[#71717A]">
          Percentile ranks vs NHANES 2017–2018 age and sex matched peers.
          Lower = biologically younger.
        </p>
      </div>

      {/* Overall biological age percentile */}
      <PercentileTrack
        percentile={biologicalAgePercentile}
        label="Biological Age"
        size="lg"
      />

      {/* Per-biomarker breakdown */}
      {withPercentile.length > 0 && (
        <div className="space-y-3 border-t border-[#E4E4E7] pt-5">
          <p className="text-xs font-medium text-[#71717A] uppercase tracking-widest">
            Individual Biomarkers
          </p>
          {withPercentile.map(c => (
            <PercentileTrack
              key={c.key}
              percentile={c.cohortPercentile}
              label={`${c.displayName} (${c.value} ${c.unit})`}
              size="md"
            />
          ))}
        </div>
      )}
    </motion.section>
  )
}
