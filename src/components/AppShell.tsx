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
import type { SummaryData } from '../types'

const repositoryUrl = 'https://github.com/Linear27/gaokao-guide-2026-physics'

type AppShellProps = {
  summary: SummaryData
  children: ReactNode
}

export function AppShell({ summary, children }: AppShellProps) {
  const location = useLocation()
  const theme = useTheme()
  const compact = useMediaQuery(theme.breakpoints.down('sm'))

  return (
    <Box sx={{ minHeight: '100dvh' }}>
      <AppBar color="inherit" elevation={0} position="sticky" sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Toolbar sx={{ gap: 2 }}>
          <Typography
            component={RouterLink}
            sx={{ color: 'text.primary', fontWeight: 700, textDecoration: 'none' }}
            to="/"
            variant={compact ? 'subtitle1' : 'h6'}
          >
            广西 2026 物理类招生计划
          </Typography>
          <Box sx={{ flexGrow: 1 }} />
          <Stack direction="row" spacing={1}>
            <Button
              color={location.pathname === '/' ? 'primary' : 'inherit'}
              component={RouterLink}
              startIcon={!compact ? <HomeIcon /> : undefined}
              to="/"
              variant={location.pathname === '/' ? 'contained' : 'text'}
            >
              首页
            </Button>
            <Button
              color={location.pathname.startsWith('/search') ? 'primary' : 'inherit'}
              component={RouterLink}
              startIcon={!compact ? <SearchIcon /> : undefined}
              to="/search"
              variant={location.pathname.startsWith('/search') ? 'contained' : 'text'}
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
            当前数据：{summary.counts.schools.toLocaleString('zh-CN')} 所院校，
            {summary.counts.programs.toLocaleString('zh-CN')} 条专业计划。
          </Typography>
          <Typography variant="body2">
            非官方整理版，填报前请以官方材料、高校招生章程和招生考试院发布信息为准。
          </Typography>
        </Stack>
      </Container>
    </Box>
  )
}
