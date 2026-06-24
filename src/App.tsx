import { lazy, Suspense, useEffect, useState } from 'react'
import { Navigate, Route, Routes, useParams } from 'react-router-dom'
import { Alert, Box, CircularProgress, Container } from '@mui/material'
import { loadSummaryData } from './data/loadSiteData'
import { AppShell } from './components/AppShell'
import { HomePage } from './pages/HomePage'
import type { SummaryData, Track } from './types'
import { isTrack, legacyRouteFor, tracks } from './data/derive'

const SearchPage = lazy(() => import('./pages/SearchPage').then((module) => ({ default: module.SearchPage })))
const SchoolPage = lazy(() => import('./pages/SchoolPage').then((module) => ({ default: module.SchoolPage })))
const BatchPage = lazy(() => import('./pages/BatchPage').then((module) => ({ default: module.BatchPage })))

export default function App() {
  const [summaries, setSummaries] = useState<Record<Track, SummaryData> | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    Promise.all(tracks.map(async (track) => [track, await loadSummaryData(track)] as const))
      .then((entries) => setSummaries(Object.fromEntries(entries) as Record<Track, SummaryData>))
      .catch((loadError: unknown) => {
        setError(loadError instanceof Error ? loadError.message : 'summary.json 加载失败')
      })
  }, [])

  if (error) {
    return (
      <Container sx={{ py: 4 }}>
        <Alert severity="error">{error}</Alert>
      </Container>
    )
  }

  if (!summaries) return <LoadingScreen />

  return (
    <AppShell summaries={summaries}>
      <Suspense fallback={<LoadingScreen />}>
        <Routes>
          <Route path="/" element={<HomePage summaries={summaries} />} />
          <Route path="/:track/search" element={<SearchRoute summaries={summaries} />} />
          <Route path="/:track/schools/:schoolCode" element={<SchoolRoute />} />
          <Route path="/:track/batches/:batchSlug" element={<BatchRoute />} />
          <Route path="/search" element={<Navigate replace to={legacyRouteFor('/search')} />} />
          <Route path="/schools/:schoolCode" element={<LegacyRoute />} />
          <Route path="/batches/:batchSlug" element={<LegacyRoute />} />
          <Route path="*" element={<Navigate replace to="/" />} />
        </Routes>
      </Suspense>
    </AppShell>
  )
}

function LegacyRoute() {
  return <Navigate replace to={legacyRouteFor(window.location.pathname)} />
}

function SearchRoute({ summaries }: { summaries: Record<Track, SummaryData> }) {
  const { track } = useParams()
  const routeKey = isTrack(track) ? track : 'invalid'
  return <SearchPage key={routeKey} summaries={summaries} />
}

function SchoolRoute() {
  const { schoolCode, track } = useParams()
  const routeKey = `${isTrack(track) ? track : 'invalid'}-${schoolCode ?? ''}`
  return <SchoolPage key={routeKey} />
}

function BatchRoute() {
  const { batchSlug, track } = useParams()
  const routeKey = `${isTrack(track) ? track : 'invalid'}-${batchSlug ?? ''}`
  return <BatchPage key={routeKey} />
}

export function LoadingScreen() {
  return (
    <Box sx={{ alignItems: 'center', display: 'flex', minHeight: '100dvh', justifyContent: 'center' }}>
      <CircularProgress aria-label="加载数据" />
    </Box>
  )
}
