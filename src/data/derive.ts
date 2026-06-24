import type { AdmissionLine, PlanCount, Program, ProgramRow, Track, Tuition } from '../types'

export type SearchFilters = {
  keyword: string
  batchName: string
  schoolCode: string
  majorGroupCode: string
  firstSubject: string
  secondSubject: string
}

export const tracks: Track[] = ['physics', 'history']

export function isTrack(value: string | undefined): value is Track {
  return value === 'physics' || value === 'history'
}

export function trackLabel(track: Track): string {
  return track === 'physics' ? '物理类' : '历史类'
}

export function trackTitle(track: Track): string {
  return `广西 2026 ${trackLabel(track)}招生计划查询`
}

export function trackDataBase(track: Track): string {
  return `/data/tracks/${track}`
}

export function summaryUrl(track: Track): string {
  return `${trackDataBase(track)}/summary.json`
}

export function programsUrl(track: Track): string {
  return `${trackDataBase(track)}/programs.json`
}

export function schoolsUrl(track: Track): string {
  return `${trackDataBase(track)}/schools.json`
}

export function schoolPayloadUrl(track: Track, schoolCode: string): string {
  return `${trackDataBase(track)}/schools/${encodeURIComponent(schoolCode)}.json`
}

export function batchPayloadUrl(track: Track, batchSlug: string): string {
  return `${trackDataBase(track)}/batches/${encodeURIComponent(batchSlug)}.json`
}

export function historyAdmissionLinesUrl(track: Track): string {
  return `${trackDataBase(track)}/history/2025/guangxi-${track}-admission-lines.json`
}

export function schoolRoute(track: Track, schoolCode: string): string {
  return `/${track}/schools/${encodeURIComponent(schoolCode)}`
}

export function batchRoute(track: Track, batchSlug: string): string {
  return `/${track}/batches/${encodeURIComponent(batchSlug)}`
}

export function searchRoute(track: Track, keyword?: string): string {
  const base = `/${track}/search`
  return keyword ? `${base}?keyword=${encodeURIComponent(keyword)}` : base
}

export function searchParamsWithKeyword(currentSearch: string, keyword: string): string {
  const searchParams = new URLSearchParams(currentSearch)
  const normalizedKeyword = keyword.trim()
  if (normalizedKeyword) {
    searchParams.set('keyword', normalizedKeyword)
  } else {
    searchParams.delete('keyword')
  }
  const nextSearch = searchParams.toString()
  return nextSearch ? `?${nextSearch}` : ''
}

export function filtersWithKeyword(filters: SearchFilters, keyword: string): SearchFilters {
  return { ...filters, keyword: keyword.trim() }
}

export function homeRoute(track: Track): string {
  return `/?track=${track}`
}

export function routeForTrack(pathname: string, search: string, nextTrack: Track): string {
  const searchParams = new URLSearchParams(search)
  const segments = pathname.split('/').filter(Boolean)
  const currentTrack = isTrack(segments[0]) ? segments[0] : null

  if (!currentTrack) {
    searchParams.set('track', nextTrack)
    return `/?${searchParams.toString()}`
  }

  segments[0] = nextTrack
  return `/${segments.map((segment) => encodeURIComponent(segment)).join('/')}${search}`
}

export function legacyRouteFor(pathname: string): string {
  if (pathname === '/search') return '/physics/search'
  if (pathname.startsWith('/schools/')) return `/physics${pathname}`
  if (pathname.startsWith('/batches/')) return `/physics${pathname}`
  return '/physics/search'
}

export type ProgramSearchEntry = {
  program: Program
  searchText: string
}

export function programId(program: Program, index: number): string {
  return [
    program.batchName,
    program.schoolCode,
    program.majorGroupCode,
    program.majorCode,
    program.pdfPage,
    index,
  ].join('-')
}

export type AdmissionLineIndex = Map<string, AdmissionLine>

export function toRows(programs: Program[], admissionLineIndex?: AdmissionLineIndex): ProgramRow[] {
  return programs.map((program, index) => ({
    ...program,
    id: programId(program, index),
    history2025: admissionLineIndex?.get(admissionLineKey(program)) ?? null,
  }))
}

export function buildAdmissionLineIndex(admissionLines: AdmissionLine[]): AdmissionLineIndex {
  return new Map(admissionLines.map((line) => [admissionLineKey(line), line]))
}

export function batchNamesForPrograms(programs: Program[]): string[] {
  return Array.from(new Set(programs.map((program) => program.batchName)))
}

export function buildProgramSearchIndex(programs: Program[]): ProgramSearchEntry[] {
  return programs.map((program) => ({
    program,
    searchText: normalize(
      [
        program.batchName,
        program.schoolCode,
        program.schoolName,
        program.majorGroupCode,
        program.majorCode,
        program.majorName,
        program.remarks,
      ].join(' '),
    ),
  }))
}

export function applyIndexedSearchFilters(index: ProgramSearchEntry[], filters: SearchFilters): Program[] {
  const keyword = normalize(filters.keyword)
  return index
    .filter(({ program, searchText }) => {
      if (filters.batchName && program.batchName !== filters.batchName) return false
      if (filters.schoolCode && program.schoolCode !== filters.schoolCode) return false
      if (filters.majorGroupCode && program.majorGroupCode !== filters.majorGroupCode) return false
      if (filters.firstSubject && (program.firstSubject ?? '') !== filters.firstSubject) return false
      if (filters.secondSubject && (program.secondSubject ?? '') !== filters.secondSubject) return false
      if (!keyword) return true
      return searchText.includes(keyword)
    })
    .map(({ program }) => program)
}

export function applySearchFilters(programs: Program[], filters: SearchFilters): Program[] {
  const keyword = normalize(filters.keyword)
  return programs.filter((program) => {
    if (filters.batchName && program.batchName !== filters.batchName) return false
    if (filters.schoolCode && program.schoolCode !== filters.schoolCode) return false
    if (filters.majorGroupCode && program.majorGroupCode !== filters.majorGroupCode) return false
    if (filters.firstSubject && (program.firstSubject ?? '') !== filters.firstSubject) return false
    if (filters.secondSubject && (program.secondSubject ?? '') !== filters.secondSubject) return false
    if (!keyword) return true

    const haystack = normalize(
      [
        program.batchName,
        program.schoolCode,
        program.schoolName,
        program.majorGroupCode,
        program.majorCode,
        program.majorName,
        program.remarks,
      ].join(' '),
    )
    return haystack.includes(keyword)
  })
}

export function distinctStrings(values: Array<string | null | undefined>): string[] {
  return Array.from(new Set(values.filter((value): value is string => Boolean(value)))).sort(
    naturalCompare,
  )
}

export function formatNumber(value: number | null | undefined): string {
  return typeof value === 'number' ? value.toLocaleString('zh-CN') : '—'
}

export function formatPlanCount(value: PlanCount | null | undefined): string {
  if (typeof value === 'number') return value.toLocaleString('zh-CN')
  return value || '—'
}

export function formatTuition(value: Tuition | null | undefined): string {
  if (typeof value === 'number') return value.toLocaleString('zh-CN')
  return value || '—'
}

export function admissionLineKey(value: Pick<Program, 'track' | 'batchName' | 'schoolCode' | 'majorGroupCode'>): string {
  return [value.track, value.batchName, value.schoolCode, value.majorGroupCode].join('|')
}

export function naturalCompare(left: string, right: string): number {
  return left.localeCompare(right, 'zh-CN', { numeric: true })
}

function normalize(value: string): string {
  return value.trim().toLocaleLowerCase('zh-CN')
}
