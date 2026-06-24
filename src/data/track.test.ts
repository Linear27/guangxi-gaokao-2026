import { describe, expect, it } from 'vitest'
import {
  admissionLineKey,
  batchRoute,
  historyAdmissionLinesUrl,
  legacyRouteFor,
  programsUrl,
  schoolRoute,
  summaryUrl,
} from './derive'

describe('track-aware public data paths', () => {
  it('loads each track from its own public data directory', () => {
    expect(summaryUrl('physics')).toBe('/data/tracks/physics/summary.json')
    expect(programsUrl('history')).toBe('/data/tracks/history/programs.json')
  })

  it('builds track-prefixed public routes', () => {
    expect(schoolRoute('history', '10607')).toBe('/history/schools/10607')
    expect(batchRoute('physics', 'batch-k0a44m')).toBe('/physics/batches/batch-k0a44m')
  })

  it('keeps legacy routes on the physics track', () => {
    expect(legacyRouteFor('/search')).toBe('/physics/search')
    expect(legacyRouteFor('/schools/10607')).toBe('/physics/schools/10607')
    expect(legacyRouteFor('/batches/batch-k0a44m')).toBe('/physics/batches/batch-k0a44m')
  })
})

describe('track-aware 2025 admission line matching', () => {
  it('includes track in history admission line data URLs and match keys', () => {
    expect(historyAdmissionLinesUrl('history')).toBe(
      '/data/tracks/history/history/2025/guangxi-history-admission-lines.json',
    )
    expect(
      admissionLineKey({
        track: 'history',
        batchName: '本科普通批',
        schoolCode: '10607',
        majorGroupCode: '101',
      }),
    ).toBe('history|本科普通批|10607|101')
  })
})
