import { Link as RouterLink } from 'react-router-dom'
import {
  Button,
  Card,
  CardActionArea,
  CardContent,
  Chip,
  Divider,
  Grid,
  Stack,
  Typography,
} from '@mui/material'
import SearchIcon from '@mui/icons-material/Search'
import type { BatchSummary, SummaryData, Track } from '../types'
import { batchRoute, formatNumber, searchRoute, trackLabel } from '../data/derive'

type HomePageProps = {
  summaries: Record<Track, SummaryData>
}

type BatchGroup = {
  title: string
  batches: Array<{
    batchName: string
    shortName: string
  }>
}

const batchGroups: BatchGroup[] = [
  {
    title: '本科提前批',
    batches: [
      { batchName: '本科提前批空军招飞类', shortName: '空军招飞类' },
      { batchName: '本科提前批艺术类本科第一批', shortName: '艺术类本科第一批' },
      { batchName: '本科提前批艺术类本科第二批', shortName: '艺术类本科第二批' },
      { batchName: '本科提前批体育类', shortName: '体育类' },
      { batchName: '本科提前批其他一类', shortName: '其他一类' },
      { batchName: '本科提前批其他二类', shortName: '其他二类' },
      { batchName: '本科提前批其他三类', shortName: '其他三类' },
    ],
  },
  {
    title: '本科普通/预科',
    batches: [
      { batchName: '本科普通批', shortName: '本科普通批' },
      { batchName: '其他预科批', shortName: '其他预科批' },
    ],
  },
  {
    title: '高职高专提前批',
    batches: [
      { batchName: '高职高专提前批定向类', shortName: '定向类' },
      { batchName: '高职高专提前批艺术类', shortName: '艺术类' },
      { batchName: '高职高专提前批体育类', shortName: '体育类' },
      { batchName: '高职高专提前批其他类', shortName: '其他类' },
    ],
  },
  {
    title: '高职高专普通批',
    batches: [{ batchName: '高职高专普通批', shortName: '高职高专普通批' }],
  },
]

const admissionTypeKeywords = ['预科类', '免费少数民族预科班', '少数民族预科班', '民族班', '边防军人子女预科班']

export function HomePage({ summaries }: HomePageProps) {
  const physicsBatchMap = new Map(summaries.physics.batches.map((batch) => [batch.batchName, batch]))
  const historyBatchMap = new Map(summaries.history.batches.map((batch) => [batch.batchName, batch]))
  const totalSchools = Object.values(summaries).reduce((sum, summary) => sum + summary.counts.schools, 0)

  return (
    <Stack spacing={3}>
      <Card>
        <CardContent>
          <Stack spacing={2}>
            <Typography component="h1" variant="h1">
              广西 2026 招生计划查询
            </Typography>
            <Typography color="text.secondary" variant="body1">
              整理自《2026年广西高考指南招生计划篇》，支持按院校、专业、批次和科类查询，并提供 PDF 页码/书页码用于核对。
            </Typography>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
              <Button component={RouterLink} startIcon={<SearchIcon />} to={searchRoute('physics')}>
                查物理类
              </Button>
              <Button component={RouterLink} startIcon={<SearchIcon />} to={searchRoute('history')} variant="outlined">
                查历史类
              </Button>
            </Stack>
          </Stack>
        </CardContent>
      </Card>

      <Grid container spacing={2}>
        <Grid size={{ xs: 12, md: 4 }}>
          <MetricCard label="物理类专业计划" to={searchRoute('physics')} value={summaries.physics.counts.programs} />
        </Grid>
        <Grid size={{ xs: 12, md: 4 }}>
          <MetricCard label="历史类专业计划" to={searchRoute('history')} value={summaries.history.counts.programs} />
        </Grid>
        <Grid size={{ xs: 12, md: 4 }}>
          <MetricCard label="两科院校合计" to={searchRoute('physics')} value={totalSchools} />
        </Grid>
      </Grid>

      <Grid container spacing={2}>
        <Grid size={{ xs: 12, md: 8 }}>
          <Card>
            <CardContent>
              <Stack spacing={2}>
                <Typography component="h2" variant="h2">
                  按批次浏览
                </Typography>
                <Stack divider={<Divider flexItem />} spacing={1.5}>
                  {batchGroups.map((group) => (
                    <BatchGroupSection
                      group={group}
                      historyBatchMap={historyBatchMap}
                      key={group.title}
                      physicsBatchMap={physicsBatchMap}
                    />
                  ))}
                </Stack>
              </Stack>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, md: 4 }}>
          <Card>
            <CardContent>
              <Stack spacing={2}>
                <Typography component="h2" variant="h2">
                  招生类型提示
                </Typography>
                <Typography color="text.secondary" variant="body2">
                  预科和民族班可能分布在不同批次，可直接用这些关键词检索。
                </Typography>
                <Stack direction="row" sx={{ flexWrap: 'wrap', gap: 1 }}>
                  {admissionTypeKeywords.map((keyword) => (
                    <Chip
                      clickable
                      color="primary"
                      component={RouterLink}
                      key={keyword}
                      label={keyword}
                      to={searchRoute('physics', keyword)}
                      variant="outlined"
                    />
                  ))}
                </Stack>
              </Stack>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Stack>
  )
}

type BatchGroupSectionProps = {
  group: BatchGroup
  historyBatchMap: Map<string, BatchSummary>
  physicsBatchMap: Map<string, BatchSummary>
}

function BatchGroupSection({ group, historyBatchMap, physicsBatchMap }: BatchGroupSectionProps) {
  const physicsBatches = resolveGroupBatches(physicsBatchMap, group)
  const historyBatches = resolveGroupBatches(historyBatchMap, group)
  const total =
    physicsBatches.reduce((sum, item) => sum + item.batch.programCount, 0) +
    historyBatches.reduce((sum, item) => sum + item.batch.programCount, 0)

  return (
    <Stack spacing={1}>
      <Stack direction="row" spacing={1} sx={{ alignItems: 'baseline', justifyContent: 'space-between' }}>
        <Typography component="h3" variant="h3">
          {group.title}
        </Typography>
        <Typography color="text.secondary" variant="body2">
          {formatNumber(total)} 条
        </Typography>
      </Stack>
      <TrackBatchChips batches={physicsBatches} track="physics" />
      <TrackBatchChips batches={historyBatches} track="history" />
    </Stack>
  )
}

function resolveGroupBatches(batchMap: Map<string, BatchSummary>, group: BatchGroup) {
  return group.batches
    .map((item) => {
      const batch = batchMap.get(item.batchName)
      return batch ? { ...item, batch } : null
    })
    .filter((item): item is { batchName: string; shortName: string; batch: BatchSummary } => Boolean(item))
}

type TrackBatchChipsProps = {
  batches: Array<{ batchName: string; shortName: string; batch: BatchSummary }>
  track: Track
}

function TrackBatchChips({ batches, track }: TrackBatchChipsProps) {
  if (batches.length === 0) return null

  return (
    <Stack spacing={0.75}>
      <Typography color="text.secondary" variant="body2">
        {trackLabel(track)}
      </Typography>
      <Stack direction="row" sx={{ flexWrap: 'wrap', gap: 1 }}>
        {batches.map(({ batch, shortName }) => (
          <Chip
            clickable
            color="primary"
            component={RouterLink}
            key={`${track}-${batch.batchName}`}
            label={`${shortName} ${formatNumber(batch.programCount)} 条`}
            to={batchRoute(track, batch.slug)}
            variant="outlined"
          />
        ))}
      </Stack>
    </Stack>
  )
}

type MetricCardProps = {
  label: string
  to: string
  value: number
}

function MetricCard({ label, to, value }: MetricCardProps) {
  return (
    <Card>
      <CardActionArea component={RouterLink} to={to}>
        <CardContent>
          <Typography color="text.secondary" variant="body2">
            {label}
          </Typography>
          <Typography component="p" variant="h2">
            {formatNumber(value)}
          </Typography>
        </CardContent>
      </CardActionArea>
    </Card>
  )
}
