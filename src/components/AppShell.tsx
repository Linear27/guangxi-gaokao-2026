import { Link as RouterLink, useLocation } from 'react-router-dom'
import {
  AppBar,
  Box,
  Button,
  Container,
  IconButton,
  Stack,
  Toolbar,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material'
import SearchIcon from '@mui/icons-material/Search'
import HomeIcon from '@mui/icons-material/Home'
import GitHubIcon from '@mui/icons-material/GitHub'
import type { ReactNode } from 'react'
import type { SummaryData, Track } from '../types'
import { homeRoute, isTrack, searchRoute, trackLabel } from '../data/derive'
import { TrackSwitch } from './TrackSwitch'

const repositoryUrl = 'https://github.com/Linear27/guangxi-gaokao-2026'

type AppShellProps = {
  summaries: Record<Track, SummaryData>
  children: ReactNode
}

export function AppShell({ summaries, children }: AppShellProps) {
  const location = useLocation()
  const theme = useTheme()
  const compact = useMediaQuery(theme.breakpoints.down('sm'))
  const pathTrack = location.pathname.split('/')[1]
  const queryTrack = new URLSearchParams(location.search).get('track') ?? undefined
  const activeTrack: Track = isTrack(pathTrack) ? pathTrack : isTrack(queryTrack) ? queryTrack : 'physics'
  const activeSummary = summaries[activeTrack]
  const isSearchPath = location.pathname.endsWith('/search') || location.pathname === '/search'
  const isHome = location.pathname === '/'
  const activeHomeRoute = homeRoute(activeTrack)

  return (
    <Box sx={{ minHeight: '100dvh' }}>
      <AppBar color="inherit" elevation={0} position="sticky" sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Toolbar sx={{ gap: 2 }}>
          <Typography
            component={RouterLink}
            sx={{ color: 'text.primary', fontWeight: 700, textDecoration: 'none' }}
            to={activeHomeRoute}
            variant={compact ? 'subtitle1' : 'h6'}
          >
            广西 2026 招生计划查询
          </Typography>
          <Box sx={{ flexGrow: 1 }} />
          <Stack direction="row" spacing={1}>
            {!compact ? <TrackSwitch size="small" track={activeTrack} /> : null}
            <Button
              color={location.pathname === '/' ? 'primary' : 'inherit'}
              component={RouterLink}
              startIcon={!compact ? <HomeIcon /> : undefined}
              to={activeHomeRoute}
              variant={location.pathname === '/' ? 'contained' : 'text'}
            >
              首页
            </Button>
            <Button
              color={isSearchPath ? 'primary' : 'inherit'}
              component={RouterLink}
              startIcon={!compact ? <SearchIcon /> : undefined}
              to={searchRoute(activeTrack)}
              variant={isSearchPath ? 'contained' : 'text'}
            >
              查计划
            </Button>
            {compact ? (
              <IconButton aria-label="GitHub 仓库" color="inherit" href={repositoryUrl} target="_blank">
                <GitHubIcon />
              </IconButton>
            ) : (
              <Button color="inherit" href={repositoryUrl} startIcon={<GitHubIcon />} target="_blank" variant="text">
                GitHub
              </Button>
            )}
          </Stack>
        </Toolbar>
      </AppBar>
      <Container maxWidth="xl" sx={{ py: { xs: 2, md: 3 } }}>
        {children}
      </Container>
      <Container component="footer" maxWidth="xl" sx={{ color: 'text.secondary', pb: 3 }}>
        <Stack spacing={0.5}>
          <Typography variant="body2">
            {isHome ? '当前查看' : '当前科类'}：{trackLabel(activeTrack)}，
            {activeSummary.counts.schools.toLocaleString('zh-CN')} 所院校，
            {activeSummary.counts.programs.toLocaleString('zh-CN')} 条专业计划。
          </Typography>
          <Typography variant="body2">
            非官方整理版，填报前请以官方材料、高校招生章程和招生考试院发布信息为准。
          </Typography>
        </Stack>
      </Container>
    </Box>
  )
}
