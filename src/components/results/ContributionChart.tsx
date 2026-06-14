'use client'

import { motion } from 'framer-motion'
import { useEffect, useState } from 'react'
import {
  BarChart,
  Bar,
  Cell,
  XAxis,
  YAxis,
  ReferenceLine,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import type { ContributionWithPercentile } from '@/lib/computation/compute-service'
import { fmtPercentile } from '@/lib/utils/formatting'

interface ContributionChartProps {
  contributions: ContributionWithPercentile[]
}

/** Shortened biomarker name for the chart Y-axis — keeps labels from wrapping */
const CHART_LABEL: Record<string, string> = {
  albumin:       'Albumin',
  creatinine:    'Creatinine',
  glucose:       'Glucose',
  crp:           'CRP',
  lymphocytePct: 'Lymph %',
  mcv:           'MCV',
  rdw:           'RDW',
  alp:           'ALP',
  wbc:           'WBC',
}

/** Map contribution magnitude → fill color */
function barColor(contribution: number): string {
  if (contribution < -2)    return '#15803D'
  if (contribution < -0.5)  return '#16A34A'
  if (contribution < 0)     return '#4ADE80'
  if (contribution < 0.5)   return '#FCD34D'
  if (contribution < 2)     return '#D97706'
  return '#DC2626'
}

/** Generate clean integer/half-integer tick marks symmetric around 0 */
function buildTicks(maxAbs: number): number[] {
  const step = maxAbs > 3 ? 1 : maxAbs > 1.5 ? 0.5 : 0.5
  const ticks: number[] = []
  const count = Math.ceil(maxAbs / step)
  for (let i = -count; i <= count; i++) {
    ticks.push(+(i * step).toFixed(1))
  }
  return ticks
}

type TooltipPayload = { payload: ContributionWithPercentile & { chartLabel: string } }

function CustomTooltip({ active, payload }: { active?: boolean; payload?: TooltipPayload[] }) {
  if (!active || !payload?.length) return null
  const d = payload[0]!.payload
  const isProtective = d.contribution < 0

  return (
    <div className="rounded-lg border border-[#E4E4E7] bg-white px-4 py-3 shadow-lg text-xs space-y-1.5 max-w-[220px]">
      <p className="font-semibold text-[#18181B]">{d.displayName}</p>
      <p className="font-mono text-[#71717A]">
        {d.value} {d.unit}{d.imputed ? ' (est.)' : ''}
      </p>
      <p className={`font-medium ${isProtective ? 'text-[#16A34A]' : 'text-[#DC2626]'}`}>
        {isProtective ? '↓' : '↑'} {Math.abs(d.contribution).toFixed(1)} yr{' '}
        {isProtective ? 'younger' : 'older'}
      </p>
      {d.cohortPercentile !== null && (
        <p className="text-[#71717A]">
          {fmtPercentile(d.cohortPercentile)} in your age group
        </p>
      )}
    </div>
  )
}

export function ContributionChart({ contributions }: ContributionChartProps) {
  // Detect mobile to narrow the YAxis
  const [isMobile, setIsMobile] = useState(false)
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 640)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  // Sort: most protective at top, most aging at bottom; exclude imputed values
  const data = [...contributions]
    .filter(c => !c.imputed)
    .sort((a, b) => a.contribution - b.contribution)
    .map(c => ({ ...c, chartLabel: CHART_LABEL[c.key] ?? c.displayName }))

  const maxAbs = Math.max(...data.map(d => Math.abs(d.contribution)), 0.5)
  const ticks = buildTicks(maxAbs)
  const domain: [number, number] = [ticks[0]! - 0.1, ticks[ticks.length - 1]! + 0.1]

  const yAxisWidth = isMobile ? 72 : 110

  return (
    <motion.section
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.15, ease: 'easeOut' }}
      className="rounded-xl border border-[#E4E4E7] bg-white p-6"
    >
      <h2 className="mb-1 text-sm font-semibold text-[#18181B]">What&apos;s aging you?</h2>
      <p className="mb-6 text-xs text-[#71717A]">
        Years of biological age each biomarker adds or removes vs your cohort average.
        Hover a bar for detail.
      </p>

      <div style={{ height: data.length * 52 + 32 }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            layout="vertical"
            margin={{ top: 0, right: isMobile ? 32 : 48, bottom: 0, left: 4 }}
            barSize={16}
          >
            <XAxis
              type="number"
              domain={domain}
              ticks={ticks}
              tickFormatter={v => `${v > 0 ? '+' : ''}${v.toFixed(v % 1 === 0 ? 0 : 1)}`}
              tick={{ fontSize: 10, fill: '#71717A' }}
              axisLine={{ stroke: '#E4E4E7' }}
              tickLine={false}
            />
            <YAxis
              type="category"
              dataKey="chartLabel"
              width={yAxisWidth}
              tick={{ fontSize: isMobile ? 11 : 12, fill: '#18181B' }}
              axisLine={false}
              tickLine={false}
            />
            <ReferenceLine x={0} stroke="#D4D4D8" strokeWidth={1.5} />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: '#F9FAFB' }} />
            <Bar dataKey="contribution" radius={[0, 3, 3, 0]} isAnimationActive animationDuration={600}>
              {data.map((entry, i) => (
                <Cell key={i} fill={barColor(entry.contribution)} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-4 text-xs text-[#71717A]">
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-2.5 rounded-sm bg-[#16A34A]" />
          Protective
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-2.5 rounded-sm bg-[#DC2626]" />
          Aging signal
        </span>
      </div>
    </motion.section>
  )
}
