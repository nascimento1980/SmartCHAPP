import React from 'react'
import { Box, CircularProgress, Typography } from '@mui/material'

const LoadingScreen = () => {
  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        backgroundColor: '#F5F7FA'
      }}
    >
      <CircularProgress size={50} sx={{ mb: 2 }} />
      <Typography variant="h6" color="primary">
        CH_SMART
      </Typography>
      <Typography variant="body2" color="text.secondary">
        Clean & Health Soluções
      </Typography>
    </Box>
  )
}

export default LoadingScreen