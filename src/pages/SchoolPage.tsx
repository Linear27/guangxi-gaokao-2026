import { useEffect, useMemo, useState } from 'react'
import { Navigate, useParams } from 'react-router-dom'
import { Alert, Box, Stack, Tab, Tabs, Typography } from '@mui/material'
import { ProgramGrid } from '../components/ProgramGrid'
import { SchoolSummary } from '../components/SchoolSummary'
import { LoadingScreen } from '../App'
import { loadAdmissionLines2025, loadSchoolPayload } from '../data/loadSiteData'
import type { AdmissionLine, SchoolPayload } from '../types'
import { admissionLineKey, batchNamesForPrograms, buildAdmissionLineIndex, isTrack, searchRoute } from '../data/derive'

export function SchoolPage() {
  const { schoolCode, track } = useParams()
  const activeTrack = isTrack(track) ? track : null
  const [payload, setPayload] = useState<SchoolPayload | null>(null)
  const [admissionLines, setAdmissionLines] = useState<AdmissionLine[]>([])
  const [error, setError] = useState<string | null>(null)
  const [selectedBatch, setSelectedBatch] = useState(0)

  useEffect(() => {
    if (!schoolCode || !activeTrack) return
    let alive = true
    setPayload(null)
    setAdmissionLines([])
    setError(null)
    setSelectedBatch(0)
    loadSchoolPayload(activeTrack, schoolCode)
      .then((nextPayload) => {
        if (!alive) return
        setPayload(nextPayload)
      })
      .catch((loadError: unknown) => {
        if (alive) setError(loadError instanceof Error ? loadError.message : '院校数据加载失败')
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
  }, [activeTrack, schoolCode])

  const programs = useMemo(() => payload?.programs ?? [], [payload])
  const batchNames = useMemo(() => batchNamesForPrograms(programs), [programs])
  const admissionLineIndex = useMemo(() => buildAdmissionLineIndex(admissionLines), [admissionLines])

  useEffect(() => {
    if (programs.length === 0 || admissionLines.length === 0) return
    const firstBatchWithLine = batchNames.findIndex((batchName) =>
      programs.some((program) => program.batchName === batchName && admissionLineIndex.has(admissionLineKey(program))),
    )
    if (firstBatchWithLine >= 0) {
      setSelectedBatch(firstBatchWithLine)
    }
  }, [admissionLineIndex, admissionLines.length, batchNames, programs])

  if (!schoolCode || !activeTrack) {
    return <Navigate replace to={searchRoute('physics')} />
  }

  if (error) return <Alert severity="error">{error}</Alert>
  if (!payload) return <LoadingScreen />

  const activeBatchName = batchNames[selectedBatch] ?? batchNames[0] ?? ''
  const activePrograms = programs.filter((program) => program.batchName === activeBatchName)

  return (
    <Stack spacing={2}>
      <SchoolSummary batchNames={batchNames} school={payload.school} />
      <Box sx={{ bgcolor: 'background.paper', border: 1, borderColor: 'divider', borderRadius: 1 }}>
        <Tabs
          onChange={(_event, value: number) => setSelectedBatch(value)}
          scrollButtons="auto"
          value={selectedBatch}
          variant="scrollable"
        >
          {batchNames.map((batchName) => (
            <Tab key={batchName} label={batchName} />
          ))}
        </Tabs>
      </Box>
      <Stack spacing={1}>
        <Typography component="h2" variant="h2">
          {activeBatchName}
        </Typography>
        <ProgramGrid admissionLineIndex={admissionLineIndex} programs={activePrograms} track={activeTrack} />
      </Stack>
    </Stack>
  )
}
