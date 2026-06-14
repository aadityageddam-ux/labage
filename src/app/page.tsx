import Link from 'next/link'

export default function Home() {
  const demoHref =
    '/compute?age=34&sex=female&albumin=4.4&creatinine=0.8&glucose=85' +
    '&crp=0.3&lymphocytePct=32&mcv=90&rdw=12.1&alp=58&wbc=5.1'

  return (
    <div className="flex min-h-screen flex-col">
      {/* Minimal nav */}
      <nav className="mx-auto flex w-full max-w-[680px] items-center justify-between px-6 py-5">
        <span className="text-sm font-semibold tracking-tight text-[#18181B]">LabAge</span>
        <a
          href="https://github.com"
          target="_blank"
          rel="noopener noreferrer"
          className="text-[#71717A] hover:text-[#18181B] transition-colors"
          aria-label="GitHub"
        >
          <svg viewBox="0 0 16 16" fill="currentColor" className="h-4 w-4" aria-hidden>
            <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"/>
          </svg>
        </a>
      </nav>

      {/* Hero — sits in the upper third of the viewport, not dead-center */}
      <main className="mx-auto w-full max-w-[680px] flex-1 px-6 pt-16 pb-12 sm:pt-24">
        <div className="space-y-7">
          <h1 className="text-[clamp(2rem,8vw,2.75rem)] font-semibold leading-tight tracking-tight text-[#18181B]">
            How old are your cells?
          </h1>

          <p className="max-w-[440px] text-base leading-relaxed text-[#71717A] sm:text-lg">
            Enter your blood panel. Get your biological age in seconds —
            based on the PhenoAge algorithm and real population data.
          </p>

          <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center">
            <Link
              href="/compute"
              className="inline-flex min-h-[44px] items-center gap-2 rounded-lg bg-[#16A34A] px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-[#15803D] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#16A34A] focus-visible:ring-offset-2"
            >
              Get started →
            </Link>
            <Link
              href={demoHref}
              className="min-h-[44px] flex items-center text-sm text-[#71717A] underline-offset-2 hover:text-[#18181B] hover:underline transition-colors"
            >
              Try with example data
            </Link>
          </div>
        </div>

        {/* Trust signals — flush to bottom on tall screens via margin-top auto-ish */}
        <div className="mt-16 border-t border-[#E4E4E7] pt-6">
          <div className="flex flex-wrap gap-x-6 gap-y-1.5 text-xs text-[#71717A]">
            <span>Based on PhenoAge · Levine 2018</span>
            <span>NHANES 2017–2018 reference</span>
            <span>No account required</span>
            <span>Nothing stored</span>
          </div>
        </div>
      </main>
    </div>
  )
}
