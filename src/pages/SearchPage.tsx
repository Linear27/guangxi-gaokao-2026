import { lazy, Suspense, useDeferredValue, useEffect, useMemo, useState, useTransition } from 'react'
import { Navigate, useParams, useSearchParams } from 'react-router-dom'
import { Alert, Box, Card, CardContent, Stack, Typography } from '@mui/material'
import { BatchFilter } from '../components/BatchFilter'
import { loadAdmissionLines2025, loadProgramsData, loadSchoolIndexData } from '../data/loadSiteData'
import type { AdmissionLine, Program, School, SummaryData, Track } from '../types'
import {
  applyIndexedSearchFilters,
  buildAdmissionLineIndex,
  buildProgramSearchIndex,
  formatNumber,
  isTrack,
  searchRoute,
  trackLabel,
  type SearchFilters,
} from '../data/derive'

const ProgramGrid = lazy(() =>
  import('../components/ProgramGrid').then((module) => ({ default: module.ProgramGrid })),
)

type SearchPageProps = {
  summaries: Record<Track, SummaryData>
}

const initialFilters: SearchFilters = {
  keyword: '',
  batchName: '',
  schoolCode: '',
  majorGroupCode: '',
  firstSubject: '',
  secondSubject: '',
}

export function SearchPage({ summaries }: SearchPageProps) {
  const params = useParams()
  const track = params.track
  const [searchParams] = useSearchParams()
  const keywordParam = searchParams.get('keyword')?.trim() ?? ''
  const [filters, setFilters] = useState<SearchFilters>({ ...initialFilters, keyword: keywordParam })
  const deferredFilters = useDeferredValue(filters)
  const [, startTransition] = useTransition()
  const [schools, setSchools] = useState<School[] | null>(null)
  const [programs, setPrograms] = useState<Program[]>([])
  const [admissionLines, setAdmissionLines] = useState<AdmissionLine[]>([])
  const [error, setError] = useState<string | null>(null)

  const activeTrack = isTrack(track) ? track : null
  const summary = activeTrack ? summaries[activeTrack] : summaries.physics

  useEffect(() => {
    if (!activeTrack) return
    let alive = true
    setPrograms([])
    setSchools(null)
    setAdmissionLines([])
    setError(null)

    Promise.all([loadProgramsData(activeTrack), loadSchoolIndexData(activeTrack)])
      .then(([programsPayload, schoolsPayload]) => {
        if (!alive) return
        setPrograms(programsPayload.programs)
        setSchools(schoolsPayload.schools)
      })
      .catch((loadError: unknown) => {
        if (alive) {
          setError(loadError instanceof Error ? loadError.message : '检索数据加载失败')
        }
      })

    loadAdmissionLines2025(activeTrack)
      .then((admissionLinesPayload) => {
        if (alive) setAdmissionLines(admissionLinesPayload.admissionLines)
      })
      .catch((loadError: unknown) => {
        if (alive) {
          setError(loadError instanceof Error ? loadError.message : '2025 参考线加载失败')
        }
      })

    return () => {
      alive = false
    }
  }, [activeTrack])

  useEffect(() => {
    setFilters((currentFilters) =>
      currentFilters.keyword === keywordParam ? currentFilters : { ...currentFilters, keyword: keywordParam },
    )
  }, [keywordParam])

  const majorGroups = summary.filterOptions.majorGroups
  const firstSubjects = summary.filterOptions.firstSubjects
  const secondSubjects = summary.filterOptions.secondSubjects
  const searchIndex = useMemo(() => buildProgramSearchIndex(programs), [programs])
  const admissionLineIndex = useMemo(() => buildAdmissionLineIndex(admissionLines), [admissionLines])
  const filteredPrograms = useMemo(
    () => applyIndexedSearchFilters(searchIndex, deferredFilters),
    [deferredFilters, searchIndex],
  )
  const visibleProgramCount = programs.length > 0 ? filteredPrograms.length : summary.counts.programs

  if (!activeTrack) return <Navigate replace to={searchRoute('physics')} />
  if (error) return <Alert severity="error">{error}</Alert>

  return (
    <Stack spacing={2}>
      <Stack spacing={0.5}>
        <Typography component="h1" variant="h1">
          {trackLabel(activeTrack)}招生计划检索
        </Typography>
        <Typography color="text.secondary">
          当前显示 {formatNumber(visibleProgramCount)} 条，数据总量 {formatNumber(summary.counts.programs)} 条。
        </Typography>
      </Stack>
      <Card>
        <CardContent>
          <BatchFilter
            batches={summary.batches}
            filters={filters}
            firstSubjects={firstSubjects}
            majorGroups={majorGroups}
            onChange={(nextFilters) => startTransition(() => setFilters(nextFilters))}
            schools={schools ?? []}
            secondSubjects={secondSubjects}
          />
        </CardContent>
      </Card>
      <Suspense fallback={null}>
        {programs.length > 0 ? (
          <ProgramGrid admissionLineIndex={admissionLineIndex} programs={filteredPrograms} track={activeTrack} />
        ) : (
          <Box sx={{ height: 640, minHeight: 360 }} />
        )}
      </Suspense>
    </Stack>
  )
}
