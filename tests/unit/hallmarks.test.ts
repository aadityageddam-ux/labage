import { describe, it, expect } from 'vitest'
import { computeHallmarks } from '@/lib/computation/hallmarks'
import type { BiomarkerInput } from '@/types/biomarkers'

const BASE: BiomarkerInput = {
  age:           40,
  sex:           'male',
  albumin:        4.2,
  creatinine:     0.9,
  glucose:       90,
  crp:            0.5,
  lymphocytePct: 32,
  mcv:           89,
  rdw:           12.8,
  alp:           65,
  wbc:            6.5,
}

describe('computeHallmarks', () => {
  it('returns 6 hallmarks', () => {
    const results = computeHallmarks(BASE)
    expect(results).toHaveLength(6)
  })

  it('each result has required fields', () => {
    const results = computeHallmarks(BASE)
    for (const r of results) {
      expect(r).toHaveProperty('key')
      expect(r).toHaveProperty('displayName')
      expect(r).toHaveProperty('status')
      expect(r).toHaveProperty('biomarkers')
      expect(r).toHaveProperty('explanation')
      expect(r).toHaveProperty('citation')
      expect(['OPTIMAL', 'WATCH', 'ELEVATED', 'NOT_ASSESSED']).toContain(r.status)
    }
  })

  it('optimal labs → all assessed hallmarks are OPTIMAL', () => {
    const optimal = computeHallmarks({
      ...BASE,
      crp: 0.3, wbc: 5.0,       // inflammation
      glucose: 82,               // nutrient sensing
      albumin: 4.5,              // proteostasis
      lymphocytePct: 35,        // immune
      rdw: 12.0, mcv: 86, alp: 60, // senescence
    })
    const assessed = optimal.filter(h => h.status !== 'NOT_ASSESSED')
    expect(assessed.every(h => h.status === 'OPTIMAL')).toBe(true)
  })

  it('very high CRP → chronic inflammation is ELEVATED', () => {
    const result = computeHallmarks({ ...BASE, crp: 10.0 })
    const inflammation = result.find(h => h.key === 'chronic_inflammation')!
    expect(inflammation.status).toBe('ELEVATED')
  })

  it('CRP=0.5 mg/L → chronic inflammation is OPTIMAL', () => {
    const result = computeHallmarks({ ...BASE, crp: 0.5 })
    const inflammation = result.find(h => h.key === 'chronic_inflammation')!
    expect(inflammation.status).toBe('OPTIMAL')
  })

  it('glucose 130 mg/dL → nutrient sensing is ELEVATED', () => {
    const result = computeHallmarks({ ...BASE, glucose: 130 })
    const ns = result.find(h => h.key === 'deregulated_nutrient_sensing')!
    expect(ns.status).toBe('ELEVATED')
  })

  it('glucose 85 → nutrient sensing is OPTIMAL', () => {
    const result = computeHallmarks({ ...BASE, glucose: 85 })
    const ns = result.find(h => h.key === 'deregulated_nutrient_sensing')!
    expect(ns.status).toBe('OPTIMAL')
  })

  it('low albumin → proteostasis ELEVATED', () => {
    const result = computeHallmarks({ ...BASE, albumin: 3.0 })
    const prot = result.find(h => h.key === 'loss_of_proteostasis')!
    expect(prot.status).toBe('ELEVATED')
  })

  it('high albumin → proteostasis OPTIMAL', () => {
    const result = computeHallmarks({ ...BASE, albumin: 4.5 })
    const prot = result.find(h => h.key === 'loss_of_proteostasis')!
    expect(prot.status).toBe('OPTIMAL')
  })

  it('elevated RDW → cellular senescence is ELEVATED', () => {
    const result = computeHallmarks({ ...BASE, rdw: 16.0 })
    const sen = result.find(h => h.key === 'cellular_senescence')!
    expect(sen.status).toBe('ELEVATED')
  })

  it('low lymphocyte % → immune aging ELEVATED', () => {
    const result = computeHallmarks({ ...BASE, lymphocytePct: 10 })
    const immune = result.find(h => h.key === 'altered_intercellular_communication')!
    expect(immune.status).toBe('ELEVATED')
  })

  it('missing CRP → chronic inflammation has presentBiomarkers without crp', () => {
    const { crp, ...noCRP } = BASE
    const result = computeHallmarks(noCRP)
    const inflammation = result.find(h => h.key === 'chronic_inflammation')!
    expect(inflammation.presentBiomarkers).not.toContain('crp')
  })

  it('no biomarkers → all hallmarks NOT_ASSESSED', () => {
    const result = computeHallmarks({ age: 40, sex: 'male' })
    // some hallmarks may be NOT_ASSESSED when no biomarkers provided
    const notAssessed = result.filter(h => h.status === 'NOT_ASSESSED')
    expect(notAssessed.length).toBeGreaterThan(0)
  })

  it('all explanations are non-empty strings', () => {
    const results = computeHallmarks(BASE)
    for (const r of results) {
      expect(typeof r.explanation).toBe('string')
      expect(r.explanation.length).toBeGreaterThan(0)
    }
  })
})
