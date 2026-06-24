import { useDeferredValue, useEffect, useMemo, useState, useTransition } from 'react'
import { Navigate, useParams } from 'react-router-dom'
import { Alert, Card, CardContent, Stack, TextField, Typography } from '@mui/material'
import { ProgramGrid } from '../components/ProgramGrid'
import { LoadingScreen } from '../App'
import { loadAdmissionLines2025, loadBatchPayload } from '../data/loadSiteData'
import type { AdmissionLine, BatchPayload } from '../types'
import { buildAdmissionLineIndex, formatNumber, isTrack, searchRoute } from '../data/derive'

export function BatchPage() {
  const { batchSlug, track } = useParams()
  const activeTrack = isTrack(track) ? track : null
  const [payload, setPayload] = useState<BatchPayload | null>(null)
  const [admissionLines, setAdmissionLines] = useState<AdmissionLine[]>([])
  const [keyword, setKeyword] = useState('')
  const deferredKeyword = useDeferredValue(keyword)
  const [, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!batchSlug || !activeTrack) return
    let alive = true
    setPayload(null)
    setAdmissionLines([])
    setKeyword('')
    setError(null)
    loadBatchPayload(activeTrack, batchSlug)
      .then((nextPayload) => {
        if (!alive) return
        setPayload(nextPayload)
      })
      .catch((loadError: unknown) => {
        if (alive) setError(loadError instanceof Error ? loadError.message : '批次数据加载失败')
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
  }, [activeTrack, batchSlug])

  const programs = useMemo(() => payload?.programs ?? [], [payload])
  const admissionLineIndex = useMemo(() => buildAdmissionLineIndex(admissionLines), [admissionLines])
  const filteredPrograms = useMemo(() => {
    const normalizedKeyword = deferredKeyword.trim().toLocaleLowerCase('zh-CN')
    if (!normalizedKeyword) return programs
    return programs.filter((program) =>
      [program.schoolCode, program.schoolName, program.majorCode, program.majorName, program.remarks]
        .join(' ')
        .toLocaleLowerCase('zh-CN')
        .includes(normalizedKeyword),
    )
  }, [deferredKeyword, programs])

  if (!batchSlug || !activeTrack) {
    return <Navigate replace to={searchRoute('physics')} />
  }

  if (error) return <Alert severity="error">{error}</Alert>
  if (!payload) return <LoadingScreen />

  return (
    <Stack spacing={2}>
      <Stack spacing={0.5}>
        <Typography component="h1" variant="h1">
          {payload.batch.batchName}
        </Typography>
        <Typography color="text.secondary">
          当前显示 {formatNumber(filteredPrograms.length)} 条，批次总量 {formatNumber(programs.length)} 条。
        </Typography>
      </Stack>
      <Card>
        <CardContent>
          <TextField
            fullWidth
            label="在本批次内检索"
            onChange={(event) => {
              const nextKeyword = event.target.value
              startTransition(() => setKeyword(nextKeyword))
            }}
            placeholder="院校、专业、备注"
            value={keyword}
          />
        </CardContent>
      </Card>
      <ProgramGrid admissionLineIndex={admissionLineIndex} programs={filteredPrograms} track={activeTrack} />
    </Stack>
  )
}
