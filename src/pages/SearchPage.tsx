import { lazy, Suspense, useEffect, useMemo, useState, useTransition } from 'react'
import { Navigate, useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { Alert, Box, Card, CardContent, Stack, Typography } from '@mui/material'
import { BatchFilter } from '../components/BatchFilter'
import { TrackSwitch } from '../components/TrackSwitch'
import { loadAdmissionLines2025, loadProgramsData, loadSchoolIndexData } from '../data/loadSiteData'
import type { AdmissionLine, Program, School, SummaryData, Track } from '../types'
import {
  applyIndexedSearchFilters,
  buildAdmissionLineIndex,
  buildProgramSearchIndex,
  filtersWithKeyword,
  formatNumber,
  isTrack,
  searchParamsWithKeyword,
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

const keywordDebounceMs = 300

export function SearchPage({ summaries }: SearchPageProps) {
  const params = useParams()
  const track = params.track
  const [searchParams] = useSearchParams()
  const location = useLocation()
  const navigate = useNavigate()
  const keywordParam = searchParams.get('keyword')?.trim() ?? ''
  const [draftKeyword, setDraftKeyword] = useState(keywordParam)
  const [filters, setFilters] = useState<SearchFilters>({ ...initialFilters, keyword: keywordParam })
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
    setDraftKeyword(keywordParam)
    setFilters((currentFilters) =>
      currentFilters.keyword === keywordParam ? currentFilters : { ...currentFilters, keyword: keywordParam },
    )
  }, [keywordParam])

  useEffect(() => {
    const normalizedKeyword = draftKeyword.trim()
    if (normalizedKeyword === filters.keyword) return

    const timeoutId = window.setTimeout(() => {
      setFilters((currentFilters) => filtersWithKeyword(currentFilters, normalizedKeyword))
      const nextSearch = searchParamsWithKeyword(location.search, normalizedKeyword)
      const currentSearch = location.search || ''
      if (nextSearch !== currentSearch) {
        navigate(`${location.pathname}${nextSearch}`, { replace: true })
      }
    }, keywordDebounceMs)

    return () => window.clearTimeout(timeoutId)
  }, [draftKeyword, filters.keyword, location.pathname, location.search, navigate, startTransition])

  const majorGroups = summary.filterOptions.majorGroups
  const firstSubjects = summary.filterOptions.firstSubjects
  const secondSubjects = summary.filterOptions.secondSubjects
  const searchIndex = useMemo(() => buildProgramSearchIndex(programs), [programs])
  const admissionLineIndex = useMemo(() => buildAdmissionLineIndex(admissionLines), [admissionLines])
  const filteredPrograms = useMemo(
    () => applyIndexedSearchFilters(searchIndex, filters),
    [filters, searchIndex],
  )
  const visibleProgramCount = programs.length > 0 ? filteredPrograms.length : summary.counts.programs

  if (!activeTrack) return <Navigate replace to={searchRoute('physics')} />
  if (error) return <Alert severity="error">{error}</Alert>

  const handleFilterChange = (nextFilters: SearchFilters) => {
    startTransition(() => setFilters(nextFilters))
  }

  const handleReset = () => {
    setDraftKeyword('')
    setFilters(initialFilters)
    const nextSearch = searchParamsWithKeyword(location.search, '')
    const currentSearch = location.search || ''
    if (nextSearch !== currentSearch) {
      navigate(`${location.pathname}${nextSearch}`, { replace: true })
    }
  }

  return (
    <Stack spacing={2}>
      <Stack spacing={0.5}>
        <TrackSwitch track={activeTrack} />
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
            keywordValue={draftKeyword}
            majorGroups={majorGroups}
            onChange={handleFilterChange}
            onKeywordChange={setDraftKeyword}
            onReset={handleReset}
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
