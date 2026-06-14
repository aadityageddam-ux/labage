'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { ChevronDown } from 'lucide-react'
import type { HallmarkResult, HallmarkStatus } from '@/lib/computation/hallmarks'

interface HallmarkGridProps {
  hallmarks: HallmarkResult[]
}

const STATUS_CONFIG: Record<HallmarkStatus, { icon: string; label: string; cardClass: string; badgeClass: string }> = {
  OPTIMAL:      { icon: '✅', label: 'Optimal',      cardClass: 'border-[#16A34A]/20 bg-[#F0FDF4]', badgeClass: 'bg-[#DCFCE7] text-[#16A34A]' },
  WATCH:        { icon: '⚠️', label: 'Watch',        cardClass: 'border-[#D97706]/20 bg-[#FFFBEB]', badgeClass: 'bg-[#FEF3C7] text-[#D97706]' },
  ELEVATED:     { icon: '🔴', label: 'Elevated',     cardClass: 'border-[#DC2626]/20 bg-[#FFF5F5]', badgeClass: 'bg-[#FEE2E2] text-[#DC2626]' },
  NOT_ASSESSED: { icon: '—',  label: 'Not assessed', cardClass: 'border-[#E4E4E7] bg-[#FAFAFA]',    badgeClass: 'bg-[#F4F4F5] text-[#71717A]' },
}

function HallmarkCard({ hallmark }: { hallmark: HallmarkResult }) {
  const [expanded, setExpanded] = useState(false)
  const { icon, label, cardClass, badgeClass } = STATUS_CONFIG[hallmark.status]

  return (
    <div className={`rounded-xl border p-4 transition-shadow hover:shadow-sm ${cardClass}`}>
      {/* Header row */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-start gap-2">
          <span className="mt-0.5 text-base leading-none" aria-hidden>{icon}</span>
          <div>
            <p className="text-sm font-medium text-[#18181B]">{hallmark.displayName}</p>
            {hallmark.presentBiomarkers.length > 0 && (
              <p className="mt-0.5 text-xs text-[#71717A]">
                {hallmark.presentBiomarkers.join(', ')}
              </p>
            )}
          </div>
        </div>
        <span className={`flex-shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${badgeClass}`}>
          {label}
        </span>
      </div>

      {/* Explanation (always visible, short) */}
      {hallmark.status !== 'NOT_ASSESSED' && (
        <p className="mt-3 text-xs leading-relaxed text-[#71717A]">
          {hallmark.explanation}
        </p>
      )}

      {/* Expandable mechanism */}
      {hallmark.status !== 'NOT_ASSESSED' && (
        <button
          type="button"
          onClick={() => setExpanded(e => !e)}
          className="mt-3 flex items-center gap-1 text-xs text-[#71717A] hover:text-[#18181B] transition-colors"
        >
          <ChevronDown
            className={`h-3 w-3 transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`}
          />
          {expanded ? 'Less' : 'Mechanism'}
        </button>
      )}

      {expanded && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="overflow-hidden"
        >
          <p className="mt-2 text-xs leading-relaxed text-[#71717A] border-t border-[#E4E4E7]/60 pt-2">
            {hallmark.explanation}
          </p>
          <p className="mt-1.5 text-xs text-[#A1A1AA] italic">{hallmark.citation}</p>
        </motion.div>
      )}
    </div>
  )
}

export function HallmarkGrid({ hallmarks }: HallmarkGridProps) {
  // Sort: ELEVATED → WATCH → OPTIMAL → NOT_ASSESSED
  const order: HallmarkStatus[] = ['ELEVATED', 'WATCH', 'OPTIMAL', 'NOT_ASSESSED']
  const sorted = [...hallmarks].sort(
    (a, b) => order.indexOf(a.status) - order.indexOf(b.status),
  )

  return (
    <motion.section
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.3, ease: 'easeOut' }}
      className="space-y-4"
    >
      <div>
        <h2 className="text-sm font-semibold text-[#18181B]">Hallmarks of Aging</h2>
        <p className="mt-1 text-xs text-[#71717A]">
          How your biomarkers map to the 12 Hallmarks of Aging (López-Otín et al., 2023).
        </p>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {sorted.map(h => (
          <HallmarkCard key={h.key} hallmark={h} />
        ))}
      </div>
    </motion.section>
  )
}
