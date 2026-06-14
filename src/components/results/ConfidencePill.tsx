import type { ConfidenceLevel } from '@/types/computation'

interface ConfidencePillProps {
  level: ConfidenceLevel
  presentCount: number
  totalCount: number
}

const CONFIG: Record<ConfidenceLevel, { label: string; classes: string; pulse: boolean }> = {
  HIGH:         { label: 'High confidence',     classes: 'bg-[#DCFCE7] text-[#16A34A]',   pulse: false },
  MODERATE:     { label: 'Moderate confidence', classes: 'bg-[#FEF3C7] text-[#D97706]',   pulse: false },
  LIMITED:      { label: 'Limited confidence',  classes: 'bg-[#FEF3C7] text-[#D97706]',   pulse: true  },
  INSUFFICIENT: { label: 'Insufficient data',   classes: 'bg-[#FEE2E2] text-[#DC2626]',   pulse: true  },
}

export function ConfidencePill({ level, presentCount, totalCount }: ConfidencePillProps) {
  const { label, classes, pulse } = CONFIG[level]
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${classes} ${pulse ? 'animate-pulse' : ''}`}
      title={`${presentCount}/${totalCount} biomarkers provided`}
    >
      {label} · {presentCount}/{totalCount}
    </span>
  )
}
