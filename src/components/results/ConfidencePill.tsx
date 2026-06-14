import type { ConfidenceLevel } from '@/types/computation'

interface ConfidencePillProps {
  level: ConfidenceLevel
  presentCount: number
  totalCount: number
}

const CONFIG: Record<ConfidenceLevel, { label: string; classes: string }> = {
  HIGH:         { label: 'High confidence',        classes: 'bg-[#DCFCE7] text-[#16A34A]' },
  MODERATE:     { label: 'Moderate confidence',    classes: 'bg-[#FEF3C7] text-[#D97706]' },
  LIMITED:      { label: 'Limited confidence',     classes: 'bg-[#FEF3C7] text-[#D97706]' },
  INSUFFICIENT: { label: 'Insufficient data',      classes: 'bg-[#FEE2E2] text-[#DC2626]' },
}

export function ConfidencePill({ level, presentCount, totalCount }: ConfidencePillProps) {
  const { label, classes } = CONFIG[level]
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${classes}`}
      title={`${presentCount}/${totalCount} biomarkers provided`}
    >
      {label} · {presentCount}/{totalCount}
    </span>
  )
}
