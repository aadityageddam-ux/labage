import type { Citation } from '@/lib/computation/compute-service'

interface CitationsFooterProps {
  citations: Citation[]
  missingBiomarkers: string[]
}

export function CitationsFooter({ citations, missingBiomarkers }: CitationsFooterProps) {
  return (
    <footer className="border-t border-[#E4E4E7] pt-6 space-y-4">
      {/* Missing biomarkers callout */}
      {missingBiomarkers.length > 0 && (
        <div className="rounded-lg border border-[#D97706]/30 bg-[#FEF3C7] px-4 py-3">
          <p className="text-xs font-medium text-[#D97706]">
            {missingBiomarkers.length} biomarker{missingBiomarkers.length > 1 ? 's' : ''} estimated from population means:
            {' '}<span className="font-mono">{missingBiomarkers.join(', ')}</span>
          </p>
          <p className="mt-1 text-xs text-[#92400E]">
            Adding these from your CBC or CMP would improve accuracy to HIGH confidence.
          </p>
        </div>
      )}

      {/* Scientific citations */}
      <div className="space-y-1.5">
        {citations.map(c => (
          <p key={c.label} className="text-xs text-[#71717A]">
            <span className="font-medium text-[#A1A1AA] uppercase tracking-wide text-[0.65rem]">
              {c.label}
            </span>{' '}
            {c.url ? (
              <a
                href={c.url}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-[#18181B] underline underline-offset-2 transition-colors"
              >
                {c.ref}
              </a>
            ) : (
              c.ref
            )}
          </p>
        ))}
      </div>

      {/* Disclaimer */}
      <p className="text-xs text-[#A1A1AA] border-t border-[#E4E4E7] pt-4">
        This is not a medical diagnosis. Biological age estimates are statistical —
        consult your physician for clinical interpretation of your lab results.
      </p>
    </footer>
  )
}
