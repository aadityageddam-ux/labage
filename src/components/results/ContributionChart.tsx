'use client'

import { motion } from 'framer-motion'
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

/** Map contribution magnitude → fill color */
function barColor(contribution: number): string {
  if (contribution < -2)    return '#15803D' // dark green
  if (contribution < -0.5)  return '#16A34A' // green
  if (contribution < 0)     return '#4ADE80' // light green
  if (contribution < 0.5)   return '#FCD34D' // yellow (near-neutral)
  if (contribution < 2)     return '#D97706' // amber
  return '#DC2626'                            // red
}

// Custom tooltip rendered by Recharts
function CustomTooltip({ active, payload }: { active?: boolean; payload?: { payload: ContributionWithPercentile }[] }) {
  if (!active || !payload?.length) return null
  const d = payload[0]!.payload
  const isProtective = d.contribution < 0

  return (
    <div className="rounded-lg border border-[#E4E4E7] bg-white px-4 py-3 shadow-lg text-xs space-y-1.5 max-w-[220px]">
      <p className="font-semibold text-[#18181B]">{d.displayName}</p>
      <p className="font-mono text-[#71717A]">
        {d.value} {d.unit}{d.imputed ? ' (estimated)' : ''}
      </p>
      <p className={`font-medium ${isProtective ? 'text-[#16A34A]' : 'text-[#DC2626]'}`}>
        {isProtective ? '↓' : '↑'}{' '}
        {Math.abs(d.contribution).toFixed(1)} yr{' '}
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
  // Sort: most protective (most negative) at top, most aging at bottom
  const data = [...contributions]
    .filter(c => !c.imputed)
    .sort((a, b) => a.contribution - b.contribution)

  // Symmetric x-axis domain
  const maxAbs = Math.max(...data.map(d => Math.abs(d.contribution)), 1)
  const domain: [number, number] = [-(maxAbs + 0.3), maxAbs + 0.3]

  return (
    <motion.section
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.15, ease: 'easeOut' }}
      className="rounded-xl border border-[#E4E4E7] bg-white p-6"
    >
      <h2 className="mb-1 text-sm font-semibold text-[#18181B]">What&apos;s aging you?</h2>
      <p className="mb-6 text-xs text-[#71717A]">
        Each bar shows how many biological years this biomarker adds or removes
        compared to your age/sex cohort average.
      </p>

      <div style={{ height: data.length * 52 + 32 }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            layout="vertical"
            margin={{ top: 0, right: 56, bottom: 0, left: 8 }}
            barSize={18}
          >
            <XAxis
              type="number"
              domain={domain}
              tickFormatter={v => `${v > 0 ? '+' : ''}${v.toFixed(1)}`}
              tick={{ fontSize: 10, fill: '#71717A' }}
              axisLine={{ stroke: '#E4E4E7' }}
              tickLine={false}
            />
            <YAxis
              type="category"
              dataKey="displayName"
              width={130}
              tick={{ fontSize: 12, fill: '#18181B' }}
              axisLine={false}
              tickLine={false}
            />
            <ReferenceLine x={0} stroke="#E4E4E7" strokeWidth={1.5} />
            <Tooltip
              content={<CustomTooltip />}
              cursor={{ fill: '#F4F4F5' }}
            />
            <Bar dataKey="contribution" radius={[0, 3, 3, 0]} isAnimationActive animationDuration={600}>
              {data.map((entry, i) => (
                <Cell key={i} fill={barColor(entry.contribution)} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Legend */}
      <div className="mt-4 flex flex-wrap items-center gap-4 text-xs text-[#71717A]">
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-2.5 rounded-sm bg-[#16A34A]" />
          Protective (younger)
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-2.5 rounded-sm bg-[#DC2626]" />
          Aging signal (older)
        </span>
        <span className="ml-auto italic">Hover bars for detail</span>
      </div>
    </motion.section>
  )
}
