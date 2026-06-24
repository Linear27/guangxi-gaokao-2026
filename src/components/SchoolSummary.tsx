import { Card, CardContent, Chip, Stack, Typography } from '@mui/material'
import type { School } from '../types'
import { formatNumber, trackLabel } from '../data/derive'

type SchoolSummaryProps = {
  school: School
  batchNames: string[]
}

export function SchoolSummary({ batchNames, school }: SchoolSummaryProps) {
  return (
    <Card>
      <CardContent>
        <Stack spacing={2}>
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={1} sx={{ justifyContent: 'space-between' }}>
            <div>
              <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mb: 0.5 }}>
                <Typography color="text.secondary" variant="body2">
                  {school.schoolCode}
                </Typography>
                <Chip color="primary" label={`${trackLabel(school.track)}招生计划`} size="small" variant="outlined" />
              </Stack>
              <Typography component="h1" variant="h1">
                {school.schoolName}
              </Typography>
            </div>
            <Typography color="text.secondary" variant="body2">
              专业记录 {formatNumber(school.programCount)} 条
            </Typography>
          </Stack>
          <Stack direction="row" sx={{ flexWrap: 'wrap', gap: 1 }}>
            <Chip label={`所在地：${school.schoolLocation || '—'}`} />
            <Chip label={`咨询电话：${school.consultPhone || '—'}`} />
            <Chip label={`总计划：${formatNumber(school.schoolTotalPlan)}`} />
          </Stack>
          <Stack direction="row" sx={{ flexWrap: 'wrap', gap: 1 }}>
            {batchNames.map((batchName) => (
              <Chip color="primary" key={batchName} label={batchName} variant="outlined" />
            ))}
          </Stack>
        </Stack>
      </CardContent>
    </Card>
  )
}
