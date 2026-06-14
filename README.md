# LabAge — Biological Age Calculator

A minimalist web app that calculates your biological age using the **PhenoAge algorithm** (Levine et al., 2018) and real-world population reference data (NHANES 2017–2018).

**[Try it live](https://labage.app)** — no signup, no storage, entirely client-side.

---

## What It Does

Enter 9 biomarkers from your blood panel. LabAge computes:

- **Biological Age** — how old your cells are based on phenotypic aging
- **Acceleration** — how many years older or younger you are than your chronological age
- **Cohort Percentile** — where you rank vs. age/sex-matched peers
- **Aging Hallmarks** — which of the 6 Hallmarks of Aging your labs suggest
- **Confidence Level** — based on how many biomarkers you provided

---

## Features

- **No signup, no storage** — data never leaves your browser (sessionStorage only during computation)
- **Instant results** — runs client-side, no server-side computation
- **Mobile-optimized** — works at 375px (small phones) to 1280px+ (desktop)
- **Scientific** — implements Levine 2018 PhenoAge algorithm with SI unit conversions
- **Accessible** — min-height 44px touch targets, semantic HTML, ARIA labels
- **Responsive typography** — clamp() font scaling at every breakpoint

---

## Tech Stack

- **Frontend**: Next.js 16.2.9 (App Router)
- **Styling**: Tailwind CSS v4 + design tokens
- **Charts**: Recharts 3.8.1 (BarChart, Tooltip)
- **Animations**: Framer Motion 12.40.0
- **UI Primitives**: Radix UI (@radix-ui/react-tooltip)
- **Icons**: Lucide React 1.x
- **Testing**: Vitest + Playwright
- **Fonts**: Instrument Serif (italic, 1.3 weight), Inter, JetBrains Mono

---

## Getting Started

### Prerequisites
- Node.js 18+
- npm or pnpm

### Install & Run

```bash
git clone https://github.com/aaditya-geddam/labage.git
cd labage
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Build for Production

```bash
npm run build
npm run start
```

### Run Tests

```bash
npm run test                # Single run
npm run test:watch         # Watch mode
npm run test:coverage      # Coverage report
```

---

## Project Structure

```
labage/
├── src/
│   ├── app/
│   │   ├── page.tsx                    # Landing page
│   │   ├── compute/page.tsx            # Form page
│   │   ├── results/page.tsx            # Results page
│   │   ├── about/page.tsx              # About/FAQ
│   │   ├── api/
│   │   │   ├── compute/route.ts        # POST /api/compute
│   │   │   └── reference/route.ts      # GET /api/reference?age=&sex=
│   │   └── layout.tsx
│   ├── components/
│   │   ├── forms/
│   │   │   ├── BiomarkerForm.tsx       # Main input form
│   │   │   ├── BiomarkerField.tsx      # Single input + tooltip
│   │   │   ├── UnitToggle.tsx          # US ↔ SI switch
│   │   ├── results/
│   │   │   ├── BiologicalAgeHero.tsx   # Hero section (age display)
│   │   │   ├── ContributionChart.tsx   # Diverging bar chart
│   │   │   ├── PercentilePanel.tsx     # Percentile tracks
│   │   │   ├── HallmarkGrid.tsx        # 6 hallmark cards
│   │   │   ├── CitationsFooter.tsx     # Citations + disclaimer
│   │   │   └── ConfidencePill.tsx      # Confidence badge
│   │   └── ui/tooltip.tsx              # Radix tooltip provider
│   ├── lib/
│   │   ├── computation/
│   │   │   ├── phenoage.ts             # PhenoAge algorithm
│   │   │   ├── confidence.ts           # Confidence level logic
│   │   │   ├── percentile.ts           # Percentile interpolation
│   │   │   ├── hallmarks.ts            # 6 Hallmarks logic
│   │   │   └── compute-service.ts      # Orchestration + typing
│   │   ├── validation/biomarkers.ts    # Input validation
│   │   └── utils/
│   │       ├── formatting.ts           # fmtPercentile(), fmtSigned()
│   │       └── units.ts                # US ↔ SI conversion
│   └── types/
│       ├── biomarkers.ts               # BiomarkerInput interface
│       └── computation.ts              # ComputeResponse, ConfidenceLevel
├── data/
│   ├── nhanes_reference.json           # 14 strata percentile data
│   └── hallmark_mapping.json           # 6 Hallmarks definitions
├── tests/
│   ├── unit/
│   │   ├── phenoage.test.ts            # Algorithm tests
│   │   ├── confidence.test.ts
│   │   ├── percentile.test.ts
│   │   ├── hallmarks.test.ts
│   │   ├── validation.test.ts
│   │   └── formatting.test.ts
│   └── e2e/
│       └── api.test.ts                 # API integration tests
├── .github/workflows/
│   └── ci.yml                          # GitHub Actions CI/CD
├── vercel.json                         # Vercel deployment config
├── next.config.ts
├── tsconfig.json
├── tailwind.config.ts
├── vitest.config.ts
└── README.md (this file)
```

---

## Algorithm: PhenoAge (Levine 2018)

LabAge implements the PhenoAge algorithm from *Levine ME, et al. Aging. 2018;10(4):573–591.*

### Input Biomarkers (9 total)

**Required (4):**
- Albumin (g/dL)
- Creatinine (mg/dL)
- Glucose (mg/dL)
- C-Reactive Protein (mg/L)

**Recommended (5):**
- Lymphocyte % (%)
- Mean Cell Volume (fL)
- Red Cell Distribution Width (%)
- Alkaline Phosphatase (U/L)
- WBC Count (K/µL)

### Computation

1. **Convert to SI units** where needed (g/dL→g/L, mg/dL→μmol/L, etc.)
2. **Linear predictor** — weighted sum of biomarkers + age term
3. **Gompertz mortality model** — phenotypic age = age + years acceleration
4. **Confidence** — based on biomarker count (HIGH=9/9, MODERATE=7-8/9, LIMITED=5-6/9, INSUFFICIENT=<5/9)

### Percentiles

Age/sex-stratified percentiles from NHANES 2017–2018 (N=5,114 participants, 14 strata).
Uses linear interpolation between p5/p10/p25/p50/p75/p90/p95 anchors.

---

## Design Tokens

All colors use Tailwind hex values (no CSS variables required):

| Token | Hex | Use |
|---|---|---|
| longevity-green | `#16A34A` | CTA buttons, protective biomarkers, young bio-age |
| neutral-zinc | `#71717A` | Body text, secondary labels |
| accent-amber | `#D97706` | Warnings, age-accelerating signals |
| danger-red | `#DC2626` | High-risk signals, negative states |
| surface-white | `#FFFFFF` | Cards, backgrounds |
| border-light | `#E4E4E7` | Dividers, card borders |
| surface-muted | `#F4F4F5` | Input backgrounds, disabled states |

**Fonts:**
- **Display**: Instrument Serif (italic, 1.3 weight) for biological age number
- **Body**: Inter (400/500/600) for all body text
- **Mono**: JetBrains Mono for technical values

---

## Deployment

### Vercel (Recommended)

```bash
npm i -g vercel
vercel
```

Push to GitHub and Vercel will auto-deploy on every push to `main`.

See `vercel.json` for environment and build settings.

### Self-Hosted

```bash
npm run build
npm run start
```

Requires Node.js 18+.

---

## CI/CD

GitHub Actions workflow (`.github/workflows/ci.yml`):

- **Lint**: ESLint + TypeScript
- **Test**: Vitest (unit + integration)
- **Build**: Next.js production build
- **Deploy**: Auto-deploy to Vercel on `main` push

---

## Known Limitations

- **No backend persistence** — results are sessionStorage-only (lost on tab close)
- **No medical interpretation** — estimates are statistical; consult your physician for clinical decisions
- **Reference data age** — NHANES 2017–2018 (5+ years old); recommend updating every 2 years
- **Imputation** — missing biomarkers use NHANES mean for the stratum (reduces confidence level)

---

## Contributing

Contributions welcome! Please:

1. Fork the repo
2. Create a feature branch (`git checkout -b feature/your-feature`)
3. Commit with descriptive messages
4. Push and open a PR

All PRs must:
- Pass CI (linting, tests, build)
- Include tests for new functionality
- Follow the TypeScript/Tailwind conventions

---

## Testing Philosophy

- **Unit tests** cover all computation logic (algorithm, percentiles, hallmarks, validation)
- **Integration tests** verify API routes end-to-end
- **No E2E tests for UI** — visual testing done manually in Chrome DevTools at 375px, 768px, 1280px

**Test coverage target**: 90%+ on `src/lib/computation/`, 85%+ on `src/lib/validation/`

---

## References

- **PhenoAge**: Levine ME, Lu AT, Quach A, et al. An epigenetic biomarker of aging for lifespan and healthspan. *Aging* (Albany NY). 2018;10(4):573–591. https://www.ncbi.nlm.nih.gov/pubmed/29676998
- **Hallmarks of Aging**: López-Otín C, Blasco MA, Partridge L, et al. Hallmarks of aging: an expanding universe. *Cell*. 2023;186(2):243–278. https://doi.org/10.1016/j.cell.2022.11.001
- **NHANES**: National Health and Nutrition Examination Survey (CDC/NCHS). https://www.cdc.gov/nchs/nhanes/

---

## License

MIT

---

## Support

- **Issues**: [GitHub Issues](https://github.com/aaditya-geddam/labage/issues)
- **Discussions**: [GitHub Discussions](https://github.com/aaditya-geddam/labage/discussions)
- **Email**: aaditya.geddam@gmail.com

---

**Built with ❤️ by [Aaditya Geddam](https://github.com/aaditya-geddam)**

*Last updated: 2026-06-14*
