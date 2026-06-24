import { useMemo } from 'react'
import { Link as RouterLink } from 'react-router-dom'
import { Box, Link, Tooltip, Typography } from '@mui/material'
import { DataGrid, type GridColDef, type GridSortDirection } from '@mui/x-data-grid'
import type { Program, ProgramRow, Track } from '../types'
import {
  type AdmissionLineIndex,
  formatNumber,
  formatPlanCount,
  formatTuition,
  schoolRoute,
  toRows,
} from '../data/derive'

type ProgramGridProps = {
  programs: Program[]
  height?: number
  admissionLineIndex?: AdmissionLineIndex
  track: Track
}

const historyScoreSortOrder: readonly GridSortDirection[] = ['desc', 'asc', null]
const historyRankSortOrder: readonly GridSortDirection[] = ['asc', 'desc', null]

function buildColumns(track: Track): GridColDef<ProgramRow>[] {
  return [
    {
      field: 'batchName',
      headerName: '批次',
      minWidth: 190,
      flex: 1,
    },
    {
      field: 'schoolCode',
      headerName: '院校代码',
      width: 100,
      renderCell: (params) => (
        <Link component={RouterLink} to={schoolRoute(track, params.row.schoolCode)} underline="hover">
          {params.row.schoolCode}
        </Link>
      ),
    },
    {
      field: 'schoolName',
      headerName: '院校',
      minWidth: 160,
      flex: 1,
      renderCell: (params) => (
        <Tooltip title={params.row.schoolName}>
          <Link component={RouterLink} to={schoolRoute(track, params.row.schoolCode)} underline="hover">
            {params.row.schoolName}
          </Link>
        </Tooltip>
      ),
    },
    {
      field: 'majorGroupCode',
      headerName: '专业组',
      width: 92,
    },
    {
      field: 'subjects',
      headerName: '选科',
      minWidth: 120,
      valueGetter: (_value, row) => [row.firstSubject, row.secondSubject].filter(Boolean).join(' / '),
    },
    {
      field: 'majorCode',
      headerName: '专业代码',
      width: 100,
    },
    {
      field: 'majorName',
      headerName: '专业',
      minWidth: 220,
      flex: 1.2,
    },
    {
      field: 'planCount',
      headerName: '计划',
      width: 146,
      valueFormatter: (value) => formatPlanCount(value),
    },
    {
      field: 'history2025Score',
      headerName: '2025 最低分',
      width: 120,
      description: '2025 年同批次同院校专业组投档最低分，仅供参考。',
      valueGetter: (_value, row) => row.history2025?.minScore ?? null,
      valueFormatter: (value) => formatNumber(value as number | null),
      sortingOrder: historyScoreSortOrder,
      getSortComparator: (sortDirection) => nullableNumberComparator(sortDirection),
    },
    {
      field: 'history2025Rank',
      headerName: '2025 位次',
      width: 120,
      description: '2025 年同批次同院校专业组投档最低分对应位次，仅供参考。',
      valueGetter: (_value, row) => row.history2025?.rank ?? null,
      valueFormatter: (value) => formatNumber(value as number | null),
      sortingOrder: historyRankSortOrder,
      getSortComparator: (sortDirection) => nullableNumberComparator(sortDirection),
    },
    {
      field: 'durationYears',
      headerName: '学制',
      width: 82,
      valueFormatter: (value) => (typeof value === 'number' ? `${value} 年` : '—'),
    },
    {
      field: 'tuitionPerYear',
      headerName: '学费/年',
      width: 110,
      valueFormatter: (value) => formatTuition(value),
    },
    {
      field: 'campus',
      headerName: '校区',
      minWidth: 120,
      flex: 0.8,
      valueFormatter: (value) => value || '—',
    },
    {
      field: 'remarks',
      headerName: '备注',
      minWidth: 240,
      flex: 1.4,
      renderCell: (params) => (
        <Tooltip title={params.row.remarks || ''}>
          <Typography noWrap variant="body2">
            {params.row.remarks || '—'}
          </Typography>
        </Tooltip>
      ),
    },
    {
      field: 'history2025Remarks',
      headerName: '2025 备注',
      minWidth: 150,
      flex: 0.8,
      description: '2025 年同批次同院校专业组投档备注，仅供参考。',
      valueGetter: (_value, row) => row.history2025?.remarks ?? '',
      renderCell: (params) => (
        <Tooltip title={params.row.history2025?.remarks || ''}>
          <Typography noWrap variant="body2">
            {params.row.history2025?.remarks || '—'}
          </Typography>
        </Tooltip>
      ),
    },
    {
      field: 'pdfPage',
      headerName: 'PDF 页',
      width: 92,
    },
    {
      field: 'bookPage',
      headerName: '书页',
      width: 82,
      valueFormatter: (value) => formatNumber(value as number | null),
    },
  ]
}

export function ProgramGrid({ programs, height = 640, admissionLineIndex, track }: ProgramGridProps) {
  const rows = useMemo(() => toRows(programs, admissionLineIndex), [admissionLineIndex, programs])
  const columns = useMemo(() => buildColumns(track), [track])

  return (
    <Box sx={{ height, minHeight: 360, width: '100%' }}>
      <DataGrid columns={columns} rows={rows} />
    </Box>
  )
}

function nullableNumberComparator(sortDirection: GridSortDirection) {
  return (left: unknown, right: unknown): number => {
    const leftNumber = typeof left === 'number' ? left : null
    const rightNumber = typeof right === 'number' ? right : null

    if (leftNumber === null && rightNumber === null) return 0
    if (leftNumber === null) return 1
    if (rightNumber === null) return -1

    return sortDirection === 'desc' ? rightNumber - leftNumber : leftNumber - rightNumber
  }
}
