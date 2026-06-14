'use client'

import { HelpCircle, AlertCircle } from 'lucide-react'
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from '@/components/ui/tooltip'

interface BiomarkerFieldProps {
  id: string
  label: string
  unit: string
  step?: string
  placeholder?: string
  value: string
  onChange: (value: string) => void
  onBlur?: () => void
  required?: boolean
  tooltip: string
  error?: string | null
  /** Amber border — value is present but outside optimal range (not an error, just a notice) */
  rangeWarning?: boolean
}

export function BiomarkerField({
  id,
  label,
  unit,
  step = 'any',
  placeholder = '',
  value,
  onChange,
  onBlur,
  required = false,
  tooltip,
  error,
  rangeWarning,
}: BiomarkerFieldProps) {
  const hasError = Boolean(error)
  const borderClass = hasError
    ? 'border-[#DC2626] focus-within:ring-[#DC2626]/20'
    : rangeWarning
    ? 'border-[#D97706] focus-within:ring-[#D97706]/20'
    : 'border-[#E4E4E7] focus-within:border-[#18181B] focus-within:ring-[#18181B]/10'

  return (
    <div className="space-y-1">
      <div className="flex items-center gap-1.5">
        <label
          htmlFor={id}
          className="text-sm font-medium text-[#18181B]"
        >
          {label}
          {required && (
            <span className="ml-0.5 text-[#DC2626]" aria-hidden>*</span>
          )}
        </label>

        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              className="flex-shrink-0 text-[#71717A] hover:text-[#18181B] transition-colors"
              aria-label={`About ${label}`}
            >
              <HelpCircle className="h-3.5 w-3.5" />
            </button>
          </TooltipTrigger>
          <TooltipContent>{tooltip}</TooltipContent>
        </Tooltip>
      </div>

      <div
        className={`flex items-center rounded-lg border bg-white ring-2 ring-transparent transition-all ${borderClass}`}
      >
        <input
          id={id}
          name={id}
          type="number"
          inputMode="decimal"
          step={step}
          placeholder={placeholder}
          value={value}
          onChange={e => onChange(e.target.value)}
          onBlur={onBlur}
          className="min-w-0 flex-1 bg-transparent px-3 py-2.5 text-sm text-[#18181B] placeholder:text-[#A1A1AA] focus:outline-none font-mono"
          aria-describedby={hasError ? `${id}-error` : undefined}
          aria-invalid={hasError}
        />
        <span className="flex-shrink-0 border-l border-[#E4E4E7] px-3 py-2.5 text-xs text-[#71717A] font-mono bg-[#FAFAFA] rounded-r-lg select-none">
          {unit}
        </span>
      </div>

      {hasError && (
        <p id={`${id}-error`} role="alert" className="flex items-center gap-1 text-xs text-[#DC2626]">
          <AlertCircle className="h-3 w-3 flex-shrink-0" />
          {error}
        </p>
      )}
    </div>
  )
}
