import { Suspense } from 'react'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { BiomarkerForm } from '@/components/forms/BiomarkerForm'

export const metadata = {
  title: 'Your Lab Values — LabAge',
}

function FormSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="h-10 rounded-lg bg-[#E4E4E7]" />
      <div className="h-10 rounded-lg bg-[#E4E4E7]" />
      <div className="grid grid-cols-2 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-16 rounded-lg bg-[#E4E4E7]" />
        ))}
      </div>
    </div>
  )
}

export default function ComputePage() {
  return (
    <div className="mx-auto w-full max-w-[680px] px-6 py-12">
      {/* Nav */}
      <Link
        href="/"
        className="mb-8 inline-flex items-center gap-1.5 text-sm text-[#71717A] hover:text-[#18181B] transition-colors"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Back
      </Link>

      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight text-[#18181B]">
          Your Lab Values
        </h1>
        <p className="mt-1.5 text-sm text-[#71717A]">
          Enter values from your most recent blood panel. Required fields are marked with{' '}
          <span className="text-[#DC2626]">*</span>.
        </p>
      </div>

      {/*
        Wrap BiomarkerForm in Suspense because it calls useSearchParams().
        Per Next.js 16 docs, components using useSearchParams must be
        wrapped in a Suspense boundary to allow prerendering of surrounding content.
      */}
      <Suspense fallback={<FormSkeleton />}>
        <BiomarkerForm />
      </Suspense>
    </div>
  )
}
