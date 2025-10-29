// Sistema de espaçamento consistente para CleanHealth
// Baseado em múltiplos de 4px para alinhamento perfeito

// Espaçamentos base (em unidades de 4px)
export const SPACING = {
  XS: 1,    // 4px
  SM: 2,    // 8px
  MD: 3,    // 12px
  LG: 4,    // 16px
  XL: 6,    // 24px
  XXL: 8,   // 32px
  
  // Espaçamentos específicos para componentes
  CARD_PADDING: 5,      // 20px
  SECTION_PADDING: 6,   // 24px
  PAGE_PADDING: 8,      // 32px
  DIALOG_PADDING: 6,    // 24px
  SIDEBAR_PADDING: 4    // 16px
}

// Configurações específicas de componentes
export const COMPONENT_SPACING = {
  button: {
    borderRadius: 2,    // 8px
    padding: {
      small: { vertical: 2, horizontal: 3 },   // 8px 12px
      medium: { vertical: 3, horizontal: 4 },  // 12px 16px
      large: { vertical: 4, horizontal: 6 }    // 16px 24px
    }
  },
  card: {
    borderRadius: 3,    // 12px
    padding: 5,         // 20px
    margin: 4           // 16px
  },
  input: {
    borderRadius: 2,    // 8px
    padding: 3          // 12px
  },
  modal: {
    borderRadius: 3,    // 12px
    padding: 6          // 24px
  },
  table: {
    cellPadding: { vertical: 2, horizontal: 3 },  // 8px 12px
    headerPadding: { vertical: 3, horizontal: 3 } // 12px 12px
  },
  layout: {
    sidebarWidth: 60,   // 240px
    headerHeight: 16,   // 64px
    footerHeight: 12    // 48px
  }
}

// Função utilitária para converter unidades de spacing em pixels
export const toPx = (spacingUnit) => `${spacingUnit * 4}px`

// Função utilitária para criar espaçamento consistente
export const createSpacing = (top = 0, right = top, bottom = top, left = right) => ({
  paddingTop: toPx(top),
  paddingRight: toPx(right),
  paddingBottom: toPx(bottom),
  paddingLeft: toPx(left)
})

// Função utilitária para criar margem consistente
export const createMargin = (top = 0, right = top, bottom = top, left = right) => ({
  marginTop: toPx(top),
  marginRight: toPx(right),
  marginBottom: toPx(bottom),
  marginLeft: toPx(left)
})

// Breakpoints responsivos para espaçamento
export const RESPONSIVE_SPACING = {
  mobile: {
    padding: SPACING.MD,
    margin: SPACING.SM
  },
  tablet: {
    padding: SPACING.LG,
    margin: SPACING.MD
  },
  desktop: {
    padding: SPACING.XL,
    margin: SPACING.LG
  }
}



