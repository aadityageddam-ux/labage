'use client'

import { useState, useCallback, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Loader2, ArrowRight, Lock } from 'lucide-react'
import { BiomarkerField } from './BiomarkerField'
import { UnitToggle } from './UnitToggle'
import { unitLabel, inputStep, toUSForAPI, toDisplayFromUS, type UnitSystem } from '@/lib/utils/units'
import type { BiomarkerKey } from '@/types/biomarkers'
import type { ComputeResponse } from '@/lib/computation/compute-service'

// ─── Field Definitions ────────────────────────────────────────────────────────

interface FieldDef {
  key: BiomarkerKey
  label: string
  required: boolean
  tooltip: string
  placeholder: (system: UnitSystem) => string
}

const REQUIRED_FIELDS: FieldDef[] = [
  {
    key: 'albumin',
    label: 'Albumin',
    required: true,
    tooltip: 'The main protein in blood plasma, reflecting liver function and nutritional status. Found on a Comprehensive Metabolic Panel (CMP).',
    placeholder: s => s === 'US' ? '3.5 – 5.0' : '35 – 50',
  },
  {
    key: 'creatinine',
    label: 'Creatinine',
    required: true,
    tooltip: 'A muscle waste product filtered by the kidneys, measuring kidney function. Found on a Basic or Comprehensive Metabolic Panel.',
    placeholder: s => s === 'US' ? '0.6 – 1.2' : '53 – 106',
  },
  {
    key: 'glucose',
    label: 'Glucose',
    required: true,
    tooltip: 'Blood glucose (sugar) reflecting carbohydrate metabolism and insulin sensitivity. Found on a Basic or Comprehensive Metabolic Panel.',
    placeholder: s => s === 'US' ? '70 – 100' : '3.9 – 5.6',
  },
  {
    key: 'crp',
    label: 'C-Reactive Protein',
    required: true,
    tooltip: 'A sensitive marker of systemic inflammation. Look for "hs-CRP" (high-sensitivity CRP) on your lab report. Always in mg/L.',
    placeholder: _s => '< 3.0',
  },
]

const RECOMMENDED_FIELDS: FieldDef[] = [
  {
    key: 'lymphocytePct',
    label: 'Lymphocyte %',
    required: false,
    tooltip: 'Percentage of white blood cells that are lymphocytes, reflecting adaptive immune health. Found on a Complete Blood Count (CBC) with differential.',
    placeholder: _s => '20 – 40',
  },
  {
    key: 'mcv',
    label: 'MCV',
    required: false,
    tooltip: 'Mean Corpuscular Volume — the average size of red blood cells. Elevated values can indicate B12/folate deficiency or aging. Found on a CBC.',
    placeholder: _s => '80 – 100',
  },
  {
    key: 'rdw',
    label: 'RDW',
    required: false,
    tooltip: 'Red Cell Distribution Width — variation in red blood cell size. Elevated values are linked to inflammation and accelerated aging. Found on a CBC.',
    placeholder: _s => '11 – 14',
  },
  {
    key: 'alp',
    label: 'Alkaline Phosphatase',
    required: false,
    tooltip: 'An enzyme reflecting liver health and bone turnover. Found on a Comprehensive Metabolic Panel (CMP).',
    placeholder: _s => '44 – 147',
  },
  {
    key: 'wbc',
    label: 'WBC Count',
    required: false,
    tooltip: 'Total white blood cell count, measuring immune function and infection status. Found on a Complete Blood Count (CBC).',
    placeholder: _s => '3.5 – 10.5',
  },
]

// ─── Example Data (demo panel) ────────────────────────────────────────────────
// Produces biological age ~22.7 for this 34-year-old — a compelling demo.

const EXAMPLE_US: Partial<Record<BiomarkerKey, string>> & { age: string; sex: 'male' | 'female' } = {
  age:           '34',
  sex:           'female',
  albumin:       '4.4',
  creatinine:    '0.8',
  glucose:       '85',
  crp:           '0.3',
  lymphocytePct: '32',
  mcv:           '90',
  rdw:           '12.1',
  alp:           '58',
  wbc:           '5.1',
}

// ─── Types ────────────────────────────────────────────────────────────────────

type FormValues = Partial<Record<BiomarkerKey, string>> & {
  age: string
  sex: 'male' | 'female'
}

type FieldErrors = Partial<Record<BiomarkerKey | 'age' | 'sex', string>>

// ─── Component ───────────────────────────────────────────────────────────────

export function BiomarkerForm() {
  const router        = useRouter()
  const searchParams  = useSearchParams()

  const [unitSystem, setUnitSystem] = useState<UnitSystem>('US')
  const [values, setValues]         = useState<FormValues>({ age: '', sex: 'female' })
  const [errors, setErrors]         = useState<FieldErrors>({})
  const [submitting, setSubmitting] = useState(false)
  const [apiError, setApiError]     = useState<string | null>(null)

  // Pre-fill from URL params (demo link or shared link)
  useEffect(() => {
    const fromURL: Partial<FormValues> = {}
    const paramAge = searchParams.get('age')
    const paramSex = searchParams.get('sex')
    if (paramAge) fromURL.age = paramAge
    if (paramSex === 'male' || paramSex === 'female') fromURL.sex = paramSex

    const bioKeys: BiomarkerKey[] = [
      'albumin', 'creatinine', 'glucose', 'crp',
      'lymphocytePct', 'mcv', 'rdw', 'alp', 'wbc',
    ]
    for (const key of bioKeys) {
      const v = searchParams.get(key)
      if (v) fromURL[key] = v
    }

    if (Object.keys(fromURL).length > 0) {
      setValues(prev => ({ ...prev, ...fromURL }))
    }
  }, [searchParams])

  const setField = useCallback((key: keyof FormValues, val: string) => {
    setValues(prev => ({ ...prev, [key]: val }))
    // Clear error on change
    setErrors(prev => {
      const next = { ...prev }
      delete next[key as keyof FieldErrors]
      return next
    })
  }, [])

  // When switching unit systems, convert existing numeric values
  const handleUnitToggle = useCallback((newSystem: UnitSystem) => {
    if (newSystem === unitSystem) return
    setValues(prev => {
      const next = { ...prev }
      for (const key of ['albumin', 'creatinine', 'glucose'] as BiomarkerKey[]) {
        const raw = prev[key]
        if (!raw || raw === '') continue
        const num = parseFloat(raw)
        if (!Number.isFinite(num)) continue
        // Convert: current display → US → new display
        const usValue   = toUSForAPI(key, num, unitSystem)
        const newDisplay = toDisplayFromUS(key, usValue, newSystem)
        next[key] = newDisplay.toString()
      }
      return next
    })
    setUnitSystem(newSystem)
  }, [unitSystem])

  const fillExample = useCallback(() => {
    if (unitSystem === 'US') {
      setValues({ ...EXAMPLE_US })
    } else {
      // Convert example values to SI for display
      const siValues: Partial<Record<BiomarkerKey, string>> = {}
      for (const key of ['albumin', 'creatinine', 'glucose'] as BiomarkerKey[]) {
        const usVal = parseFloat(EXAMPLE_US[key] ?? '0')
        siValues[key] = toDisplayFromUS(key, usVal, 'SI').toString()
      }
      // Non-converted fields
      setValues({
        ...EXAMPLE_US,
        ...siValues,
      })
    }
    setErrors({})
    setApiError(null)
  }, [unitSystem])

  // Required fields are filled (non-empty)
  const requiredFilled = REQUIRED_FIELDS.every(f => {
    const v = values[f.key]
    return v !== undefined && v !== ''
  }) && values.age !== ''

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault()
    setApiError(null)

    // Convert all display values to US units for API
    const payload: Record<string, unknown> = {
      age: parseFloat(values.age),
      sex: values.sex,
    }
    for (const key of [...REQUIRED_FIELDS, ...RECOMMENDED_FIELDS].map(f => f.key)) {
      const raw = values[key]
      if (!raw || raw === '') continue
      const num = parseFloat(raw)
      if (!Number.isFinite(num)) continue
      payload[key] = toUSForAPI(key, num, unitSystem)
    }

    setSubmitting(true)
    try {
      const res = await fetch('/api/compute', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(payload),
      })

      if (!res.ok) {
        const body = await res.json() as { error?: string; details?: { field: string; message: string }[] }
        if (res.status === 422 && body.details) {
          const fieldErrors: FieldErrors = {}
          for (const d of body.details) {
            fieldErrors[d.field as keyof FieldErrors] = d.message
          }
          setErrors(fieldErrors)
        } else {
          setApiError(body.error ?? 'Something went wrong. Please try again.')
        }
        return
      }

      const result = await res.json() as ComputeResponse
      // Store result in sessionStorage and navigate to results page
      sessionStorage.setItem('labage-result', JSON.stringify(result))
      router.push('/results')

    } catch {
      setApiError('Network error. Please check your connection and try again.')
    } finally {
      setSubmitting(false)
    }
  }, [values, unitSystem, router])

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-8">

      {/* ── Age + Sex ── */}
      <section className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          {/* Age */}
          <div className="space-y-1">
            <label htmlFor="age" className="text-sm font-medium text-[#18181B]">
              Age <span className="text-[#DC2626]" aria-hidden>*</span>
            </label>
            <div className={`flex items-center rounded-lg border bg-white ring-2 ring-transparent transition-all ${
              errors.age
                ? 'border-[#DC2626]'
                : 'border-[#E4E4E7] focus-within:border-[#18181B] focus-within:ring-[#18181B]/10'
            }`}>
              <input
                id="age"
                type="number"
                inputMode="numeric"
                min="1"
                max="120"
                step="1"
                placeholder="34"
                value={values.age}
                onChange={e => setField('age', e.target.value)}
                className="min-w-0 flex-1 bg-transparent px-3 py-2.5 text-sm text-[#18181B] placeholder:text-[#A1A1AA] focus:outline-none font-mono"
              />
              <span className="flex-shrink-0 border-l border-[#E4E4E7] px-3 py-2.5 text-xs text-[#71717A] font-mono bg-[#FAFAFA] rounded-r-lg select-none">
                years
              </span>
            </div>
            {errors.age && (
              <p className="text-xs text-[#DC2626]">{errors.age}</p>
            )}
          </div>

          {/* Sex */}
          <div className="space-y-1">
            <label className="text-sm font-medium text-[#18181B]">
              Sex <span className="text-[#DC2626]" aria-hidden>*</span>
            </label>
            <div className="flex gap-2 pt-1">
              {(['male', 'female'] as const).map(s => (
                <label
                  key={s}
                  className={`flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-lg border py-2.5 text-sm transition-all ${
                    values.sex === s
                      ? 'border-[#18181B] bg-[#18181B] text-white font-medium'
                      : 'border-[#E4E4E7] bg-white text-[#71717A] hover:border-[#18181B] hover:text-[#18181B]'
                  }`}
                >
                  <input
                    type="radio"
                    name="sex"
                    value={s}
                    checked={values.sex === s}
                    onChange={() => setField('sex', s)}
                    className="sr-only"
                  />
                  {s.charAt(0).toUpperCase() + s.slice(1)}
                </label>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Required biomarkers ── */}
      <section className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="h-px flex-1 bg-[#E4E4E7]" />
          <span className="text-xs font-medium uppercase tracking-widest text-[#71717A]">Required</span>
          <div className="h-px flex-1 bg-[#E4E4E7]" />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {REQUIRED_FIELDS.map(f => (
            <BiomarkerField
              key={f.key}
              id={f.key}
              label={f.label}
              unit={unitLabel(f.key, unitSystem)}
              step={inputStep(f.key, unitSystem)}
              placeholder={f.placeholder(unitSystem)}
              value={values[f.key] ?? ''}
              onChange={v => setField(f.key, v)}
              required={f.required}
              tooltip={f.tooltip}
              error={errors[f.key]}
            />
          ))}
        </div>
      </section>

      {/* ── Recommended biomarkers ── */}
      <section className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="h-px flex-1 bg-[#E4E4E7]" />
          <span className="text-xs font-medium uppercase tracking-widest text-[#71717A]">Recommended</span>
          <div className="h-px flex-1 bg-[#E4E4E7]" />
        </div>
        <p className="text-xs text-[#71717A]">
          Found on a Complete Blood Count (CBC). Adding these improves accuracy.
        </p>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {RECOMMENDED_FIELDS.map(f => (
            <BiomarkerField
              key={f.key}
              id={f.key}
              label={f.label}
              unit={unitLabel(f.key, unitSystem)}
              step={inputStep(f.key, unitSystem)}
              placeholder={f.placeholder(unitSystem)}
              value={values[f.key] ?? ''}
              onChange={v => setField(f.key, v)}
              required={false}
              tooltip={f.tooltip}
              error={errors[f.key]}
            />
          ))}
        </div>
      </section>

      {/* ── Unit toggle ── */}
      <UnitToggle system={unitSystem} onChange={handleUnitToggle} />

      {/* ── API error ── */}
      {apiError && (
        <div className="rounded-lg border border-[#DC2626]/30 bg-[#FEE2E2] px-4 py-3 text-sm text-[#DC2626]">
          {apiError}
        </div>
      )}

      {/* ── Submit + trust signal ── */}
      <div className="space-y-3 pt-2">
        <button
          type="submit"
          disabled={!requiredFilled || submitting}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#16A34A] px-6 py-3 text-sm font-medium text-white transition-all hover:bg-[#15803D] disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-[#16A34A]"
        >
          {submitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Computing…
            </>
          ) : (
            <>
              Compute Biological Age
              <ArrowRight className="h-4 w-4" />
            </>
          )}
        </button>

        <p className="flex items-center justify-center gap-1.5 text-xs text-[#71717A]">
          <Lock className="h-3 w-3" />
          Your data never leaves this page — no account, no storage.
        </p>
      </div>

      {/* ── Try example data ── */}
      <div className="border-t border-[#E4E4E7] pt-4 text-center">
        <button
          type="button"
          onClick={fillExample}
          className="text-sm text-[#71717A] underline-offset-2 hover:text-[#18181B] hover:underline transition-colors"
        >
          Try with example data
        </button>
      </div>

    </form>
  )
}
