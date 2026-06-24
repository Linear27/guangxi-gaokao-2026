import {
  Autocomplete,
  Button,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  TextField,
} from '@mui/material'
import RestartAltIcon from '@mui/icons-material/RestartAlt'
import type { Batch, School } from '../types'
import type { SearchFilters } from '../data/derive'

type BatchFilterProps = {
  filters: SearchFilters
  keywordValue: string
  batches: Batch[]
  schools: School[]
  majorGroups: string[]
  firstSubjects: string[]
  secondSubjects: string[]
  onChange: (filters: SearchFilters) => void
  onKeywordChange: (keyword: string) => void
  onReset: () => void
}

export function BatchFilter({
  batches,
  filters,
  firstSubjects,
  keywordValue,
  majorGroups,
  onChange,
  onKeywordChange,
  onReset,
  schools,
  secondSubjects,
}: BatchFilterProps) {
  const selectedSchool = schools.find((school) => school.schoolCode === filters.schoolCode) ?? null

  return (
    <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
      <TextField
        label="关键词"
        onChange={(event) => onKeywordChange(event.target.value)}
        placeholder="院校、专业、备注"
        value={keywordValue}
      />
      <FormControl sx={{ minWidth: 220 }}>
        <InputLabel id="batch-filter-label">批次</InputLabel>
        <Select
          label="批次"
          labelId="batch-filter-label"
          onChange={(event) => onChange({ ...filters, batchName: event.target.value })}
          value={filters.batchName}
        >
          <MenuItem value="">全部批次</MenuItem>
          {batches.map((batch) => (
            <MenuItem key={batch.batchName} value={batch.batchName}>
              {batch.batchName}
            </MenuItem>
          ))}
        </Select>
      </FormControl>
      <Autocomplete
        getOptionLabel={(school) => `${school.schoolCode} ${school.schoolName}`}
        onChange={(_event, school) => onChange({ ...filters, schoolCode: school?.schoolCode ?? '' })}
        options={schools}
        renderInput={(params) => <TextField {...params} label="院校" />}
        sx={{ minWidth: 260 }}
        value={selectedSchool}
      />
      <FormControl sx={{ minWidth: 130 }}>
        <InputLabel id="group-filter-label">专业组</InputLabel>
        <Select
          label="专业组"
          labelId="group-filter-label"
          onChange={(event) => onChange({ ...filters, majorGroupCode: event.target.value })}
          value={filters.majorGroupCode}
        >
          <MenuItem value="">全部</MenuItem>
          {majorGroups.map((group) => (
            <MenuItem key={group} value={group}>
              {group}
            </MenuItem>
          ))}
        </Select>
      </FormControl>
      <FormControl sx={{ minWidth: 130 }}>
        <InputLabel id="first-subject-filter-label">首选</InputLabel>
        <Select
          label="首选"
          labelId="first-subject-filter-label"
          onChange={(event) => onChange({ ...filters, firstSubject: event.target.value })}
          value={filters.firstSubject}
        >
          <MenuItem value="">全部</MenuItem>
          {firstSubjects.map((subject) => (
            <MenuItem key={subject} value={subject}>
              {subject}
            </MenuItem>
          ))}
        </Select>
      </FormControl>
      <FormControl sx={{ minWidth: 130 }}>
        <InputLabel id="second-subject-filter-label">再选</InputLabel>
        <Select
          label="再选"
          labelId="second-subject-filter-label"
          onChange={(event) => onChange({ ...filters, secondSubject: event.target.value })}
          value={filters.secondSubject}
        >
          <MenuItem value="">全部</MenuItem>
          {secondSubjects.map((subject) => (
            <MenuItem key={subject} value={subject}>
              {subject}
            </MenuItem>
          ))}
        </Select>
      </FormControl>
      <Button
        color="inherit"
        onClick={onReset}
        startIcon={<RestartAltIcon />}
        sx={{ alignSelf: { xs: 'stretch', md: 'center' } }}
        variant="outlined"
      >
        重置
      </Button>
    </Stack>
  )
}
