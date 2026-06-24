import { describe, expect, it } from 'vitest'
import {
  admissionLineKey,
  batchRoute,
  filtersWithKeyword,
  historyAdmissionLinesUrl,
  homeRoute,
  legacyRouteFor,
  programsUrl,
  routeForTrack,
  searchParamsWithKeyword,
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
    expect(homeRoute('history')).toBe('/?track=history')
  })

  it('keeps legacy routes on the physics track', () => {
    expect(legacyRouteFor('/search')).toBe('/physics/search')
    expect(legacyRouteFor('/schools/10607')).toBe('/physics/schools/10607')
    expect(legacyRouteFor('/batches/batch-k0a44m')).toBe('/physics/batches/batch-k0a44m')
  })

  it('switches route track while preserving the current page and query', () => {
    expect(routeForTrack('/physics/search', '?keyword=民族班', 'history')).toBe('/history/search?keyword=民族班')
    expect(routeForTrack('/history/batches/batch-k0a44m', '', 'physics')).toBe('/physics/batches/batch-k0a44m')
    expect(routeForTrack('/', '', 'history')).toBe('/?track=history')
    expect(routeForTrack('/', '?track=history', 'physics')).toBe('/?track=physics')
    expect(routeForTrack('/', '?keyword=民族班&track=physics', 'history')).toBe(
      '/?keyword=%E6%B0%91%E6%97%8F%E7%8F%AD&track=history',
    )
  })

  it('keeps the search keyword in query params', () => {
    expect(searchParamsWithKeyword('', '广西艺术学院')).toBe(
      '?keyword=%E5%B9%BF%E8%A5%BF%E8%89%BA%E6%9C%AF%E5%AD%A6%E9%99%A2',
    )
    expect(searchParamsWithKeyword('?foo=bar&keyword=旧关键词', '民族班')).toBe(
      '?foo=bar&keyword=%E6%B0%91%E6%97%8F%E7%8F%AD',
    )
    expect(searchParamsWithKeyword('?foo=bar&keyword=民族班', '')).toBe('?foo=bar')
    expect(searchParamsWithKeyword('?keyword=民族班', '   ')).toBe('')
  })

  it('commits keyword without changing other filters', () => {
    expect(
      filtersWithKeyword(
        {
          keyword: '旧关键词',
          batchName: '本科普通批',
          schoolCode: '10607',
          majorGroupCode: '101',
          firstSubject: '历史',
          secondSubject: '不限',
        },
        '  广西艺术学院  ',
      ),
    ).toEqual({
      keyword: '广西艺术学院',
      batchName: '本科普通批',
      schoolCode: '10607',
      majorGroupCode: '101',
      firstSubject: '历史',
      secondSubject: '不限',
    })
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
