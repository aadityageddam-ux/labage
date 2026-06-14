'use client'

import type { UnitSystem } from '@/lib/utils/units'

interface UnitToggleProps {
  system: UnitSystem
  onChange: (system: UnitSystem) => void
}

export function UnitToggle({ system, onChange }: UnitToggleProps) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-[#71717A]">Units:</span>
      <div className="flex rounded-md border border-[#E4E4E7] bg-white text-xs overflow-hidden">
        {(['US', 'SI'] as const).map(s => (
          <button
            key={s}
            type="button"
            onClick={() => onChange(s)}
            className={`px-3 py-1.5 transition-colors font-medium ${
              system === s
                ? 'bg-[#18181B] text-white'
                : 'text-[#71717A] hover:text-[#18181B] hover:bg-[#F4F4F5]'
            }`}
            aria-pressed={system === s}
          >
            {s}
          </button>
        ))}
      </div>
      {system === 'SI' && (
        <span className="text-xs text-[#71717A]">
          (g/L · μmol/L · mmol/L)
        </span>
      )}
    </div>
  )
}
