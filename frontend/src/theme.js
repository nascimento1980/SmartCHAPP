import { createTheme } from '@mui/material/styles'
import { SPACING, COMPONENT_SPACING } from './theme/spacing'

// Cores da marca CleanHealth
const cleanHealthColors = {
  primary: {
    main: '#2E7DD2',
    light: '#5B9BE6',
    dark: '#1B5AA3',
    contrastText: '#FFFFFF'
  },
  secondary: {
    main: '#F5A623',
    light: '#F7C55C',
    dark: '#D68910',
    contrastText: '#FFFFFF'
  },
  success: {
    main: '#4CAF50',
    light: '#81C784',
    dark: '#388E3C',
    contrastText: '#FFFFFF'
  },
  warning: {
    main: '#FF9800',
    light: '#FFB74D',
    dark: '#F57C00',
    contrastText: '#FFFFFF'
  },
  error: {
    main: '#F44336',
    light: '#E57373',
    dark: '#D32F2F',
    contrastText: '#FFFFFF'
  },
  info: {
    main: '#2196F3',
    light: '#64B5F6',
    dark: '#1976D2',
    contrastText: '#FFFFFF'
  },
  grey: {
    50: '#FAFAFA',
    100: '#F5F5F5',
    200: '#EEEEEE',
    300: '#E0E0E0',
    400: '#BDBDBD',
    500: '#9E9E9E',
    600: '#757575',
    700: '#616161',
    800: '#424242',
    900: '#212121'
  },
  background: {
    default: '#F5F7FA',
    paper: '#FFFFFF'
  },
  text: {
    primary: '#212121',
    secondary: '#757575',
    disabled: '#BDBDBD'
  },
  divider: '#E0E0E0'
}

// Tipografia consistente
const typography = {
  fontFamily: '"Proxima Nova", "Arvo", "Roboto", "Helvetica", "Arial", sans-serif',
  h1: {
    fontSize: '2.5rem',
    fontWeight: 700,
    lineHeight: 1.2,
    letterSpacing: '-0.02em'
  },
  h2: {
    fontSize: '2rem',
    fontWeight: 600,
    lineHeight: 1.3,
    letterSpacing: '-0.01em'
  },
  h3: {
    fontSize: '1.75rem',
    fontWeight: 600,
    lineHeight: 1.3
  },
  h4: {
    fontSize: '1.5rem',
    fontWeight: 600,
    lineHeight: 1.4
  },
  h5: {
    fontSize: '1.25rem',
    fontWeight: 600,
    lineHeight: 1.4
  },
  h6: {
    fontSize: '1.125rem',
    fontWeight: 600,
    lineHeight: 1.4
  },
  subtitle1: {
    fontSize: '1rem',
    fontWeight: 500,
    lineHeight: 1.5
  },
  subtitle2: {
    fontSize: '0.875rem',
    fontWeight: 500,
    lineHeight: 1.5
  },
  body1: {
    fontSize: '1rem',
    lineHeight: 1.6
  },
  body2: {
    fontSize: '0.875rem',
    lineHeight: 1.6
  },
  button: {
    fontSize: '0.875rem',
    fontWeight: 600,
    textTransform: 'none',
    letterSpacing: '0.01em'
  },
  caption: {
    fontSize: '0.75rem',
    lineHeight: 1.4
  },
  overline: {
    fontSize: '0.75rem',
    fontWeight: 500,
    textTransform: 'uppercase',
    letterSpacing: '0.1em'
  }
}

// Componentes customizados com espaçamento consistente
const components = {
  MuiButton: {
    styleOverrides: {
      root: {
        borderRadius: COMPONENT_SPACING.button.borderRadius || 2,
        fontWeight: 600,
        textTransform: 'none',
        padding: `${SPACING.MD * 4}px ${SPACING.LG * 4}px`,
        boxShadow: 'none',
        transition: 'all 0.2s ease-in-out',
        minHeight: '40px',
        '&:hover': {
          boxShadow: '0 4px 12px rgba(46, 125, 210, 0.3)',
          transform: 'translateY(-1px)'
        },
        '&:active': {
          transform: 'translateY(0)'
        }
      },
      contained: {
        background: 'linear-gradient(135deg, #2E7DD2 0%, #1B5AA3 100%)',
        '&:hover': {
          background: 'linear-gradient(135deg, #1B5AA3 0%, #0F3F73 100%)'
        }
      },
      outlined: {
        borderWidth: '2px',
        '&:hover': {
          borderWidth: '2px'
        }
      },
      sizeSmall: {
        padding: `${SPACING.SM * 4}px ${SPACING.MD * 4}px`,
        minHeight: '32px',
        fontSize: '0.875rem'
      },
      sizeLarge: {
        padding: `${SPACING.LG * 4}px ${SPACING.XL * 4}px`,
        minHeight: '48px',
        fontSize: '1rem'
      }
    }
  },
  MuiCard: {
    styleOverrides: {
      root: {
        borderRadius: COMPONENT_SPACING.card.borderRadius * 4,
        boxShadow: '0 2px 12px rgba(0, 0, 0, 0.08)',
        border: '1px solid #E8ECF0',
        transition: 'all 0.2s ease-in-out',
        '&:hover': {
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.12)',
          transform: 'translateY(-2px)'
        }
      }
    }
  },
  MuiCardContent: {
    styleOverrides: {
      root: {
        padding: `${SPACING.CARD_PADDING * 4}px`,
        '&:last-child': {
          paddingBottom: `${SPACING.CARD_PADDING * 4}px`
        }
      }
    }
  },
  MuiPaper: {
    styleOverrides: {
      root: {
        borderRadius: COMPONENT_SPACING.card.borderRadius * 4,
        boxShadow: '0 2px 12px rgba(0, 0, 0, 0.08)'
      }
    }
  },
  MuiTextField: {
    styleOverrides: {
      root: {
        '& .MuiOutlinedInput-root': {
          borderRadius: 2 * 4,
          transition: 'all 0.2s ease-in-out',
          '&:hover .MuiOutlinedInput-notchedOutline': {
            borderColor: '#2E7DD2',
            borderWidth: '2px'
          },
          '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
            borderColor: '#2E7DD2',
            borderWidth: '2px'
          }
        }
      }
    }
  },
  MuiChip: {
    styleOverrides: {
      root: {
        borderRadius: 20,
        fontWeight: 500,
        fontSize: '0.75rem',
        height: '24px',
        '& .MuiChip-label': {
          padding: '0 8px'
        }
      }
    }
  },
  MuiTabs: {
    styleOverrides: {
      root: {
        borderBottom: '2px solid #E8ECF0',
        '& .MuiTabs-indicator': {
          backgroundColor: '#2E7DD2',
          height: 3,
          borderRadius: '3px 3px 0 0'
        }
      }
    }
  },
  MuiTab: {
    styleOverrides: {
      root: {
        textTransform: 'none',
        fontWeight: 600,
        fontSize: '0.875rem',
        color: '#616161',
        padding: `${SPACING.MD * 4}px ${SPACING.LG * 4}px`,
        minHeight: '48px',
        '&.Mui-selected': {
          color: '#2E7DD2'
        }
      }
    }
  },
  MuiAppBar: {
    styleOverrides: {
      root: {
        backgroundColor: '#FFFFFF',
        color: '#2E7DD2',
        boxShadow: '0 1px 4px rgba(0, 0, 0, 0.08)',
        borderBottom: '1px solid #E8ECF0'
      }
    }
  },
  MuiDrawer: {
    styleOverrides: {
      paper: {
        backgroundColor: '#F5F7FA',
        borderRight: '1px solid #E8ECF0'
      }
    }
  },
  MuiListItemButton: {
    styleOverrides: {
      root: {
        borderRadius: 2 * 4,
        margin: `${SPACING.XS * 4}px ${SPACING.SM * 4}px`,
        transition: 'all 0.2s ease-in-out',
        '&:hover': {
          backgroundColor: 'rgba(46, 125, 210, 0.08)',
          transform: 'translateX(4px)'
        },
        '&.Mui-selected': {
          backgroundColor: 'rgba(46, 125, 210, 0.12)',
          color: '#2E7DD2',
          '&:hover': {
            backgroundColor: 'rgba(46, 125, 210, 0.16)'
          }
        }
      }
    }
  },
  MuiDialog: {
    styleOverrides: {
      paper: {
        borderRadius: 3 * 4,
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.12)'
      }
    }
  },
  MuiDialogTitle: {
    styleOverrides: {
      root: {
        padding: `${SPACING.DIALOG_PADDING * 4}px ${SPACING.DIALOG_PADDING * 4}px ${SPACING.MD * 4}px`
      }
    }
  },
  MuiDialogContent: {
    styleOverrides: {
      root: {
        padding: `${SPACING.MD * 4}px ${SPACING.DIALOG_PADDING * 4}px`
      }
    }
  },
  MuiDialogActions: {
    styleOverrides: {
      root: {
        padding: `${SPACING.MD * 4}px ${SPACING.DIALOG_PADDING * 4}px ${SPACING.DIALOG_PADDING * 4}px`
      }
    }
  },
  MuiTable: {
    styleOverrides: {
      root: {
        '& .MuiTableCell-root': {
          padding: `${SPACING.SM * 4}px ${SPACING.MD * 4}px`,
          borderBottom: '1px solid #E0E0E0'
        },
        '& .MuiTableHead-root .MuiTableCell-root': {
          padding: `${SPACING.MD * 4}px ${SPACING.MD * 4}px`,
          fontWeight: 600,
          backgroundColor: '#F5F7FA'
        }
      }
    }
  },
  MuiGrid: {
    styleOverrides: {
      root: {
        '&.MuiGrid-container': {
          gap: `${SPACING.LG * 4}px`
        }
      }
    }
  },
  MuiStack: {
    styleOverrides: {
      root: {
        '&.MuiStack-root': {
          gap: `${SPACING.MD * 4}px`
        }
      }
    }
  }
}

const theme = createTheme({
  palette: cleanHealthColors,
  typography,
  components,
  spacing: 8, // Base unit de 8px
  shape: {
    borderRadius: 8
  },
  breakpoints: {
    values: {
      xs: 0,
      sm: 600,
      md: 960,
      lg: 1280,
      xl: 1920
    }
  }
})

export default theme
