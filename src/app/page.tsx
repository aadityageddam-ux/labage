export default function Home() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-6">
      <main className="w-full max-w-[680px] space-y-6">
        <h1 className="text-4xl font-semibold tracking-tight text-[#18181B]">
          How old are your cells?
        </h1>
        <p className="text-lg text-[#71717A]">
          Enter your blood panel. Get your biological age in seconds.
        </p>
        <div className="flex gap-4">
          <a
            href="/compute"
            className="inline-flex items-center gap-2 rounded-lg bg-[#16A34A] px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[#15803D]"
          >
            Get started →
          </a>
          <a
            href="/compute?demo=true"
            className="text-sm font-medium text-[#71717A] underline-offset-4 hover:underline"
          >
            Try with example data
          </a>
        </div>
        <p className="text-xs text-[#71717A]">
          Based on PhenoAge · Levine 2018 · NHANES population reference · No account required
        </p>
      </main>
    </div>
  )
}
