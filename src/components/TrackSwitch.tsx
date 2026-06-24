import { useLocation, useNavigate } from 'react-router-dom'
import { ToggleButton, ToggleButtonGroup } from '@mui/material'
import type { Track } from '../types'
import { routeForTrack, trackLabel } from '../data/derive'

type TrackSwitchProps = {
  size?: 'small' | 'medium'
  track: Track
}

export function TrackSwitch({ size = 'medium', track }: TrackSwitchProps) {
  const location = useLocation()
  const navigate = useNavigate()

  return (
    <ToggleButtonGroup
      aria-label="选择科类"
      exclusive
      onChange={(_event, nextTrack: Track | null) => {
        if (!nextTrack || nextTrack === track) return
        navigate(routeForTrack(location.pathname, location.search, nextTrack))
      }}
      size={size}
      value={track}
    >
      <ToggleButton value="physics">{trackLabel('physics')}</ToggleButton>
      <ToggleButton value="history">{trackLabel('history')}</ToggleButton>
    </ToggleButtonGroup>
  )
}
