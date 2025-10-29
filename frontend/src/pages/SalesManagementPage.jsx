import React from 'react';
import { Box, Container, Typography, Breadcrumbs, Link } from '@mui/material';
import { Home, TrendingUp, Person } from '@mui/icons-material';

import RequireRole from '../components/RequireRole';

const SalesManagementPage = () => {
  return (
    <RequireRole allowedRoles={['admin', 'manager', 'sales', 'master']}>
      <Container maxWidth="xl">
        <Box sx={{ py: 3 }}>
          {/* Breadcrumbs */}
          <Breadcrumbs sx={{ mb: 3 }}>
            <Link href="/dashboard" color="inherit" sx={{ display: 'flex', alignItems: 'center' }}>
              <Home sx={{ mr: 0.5 }} fontSize="small" />
              Dashboard
            </Link>
            <Link href="/sales" color="inherit" sx={{ display: 'flex', alignItems: 'center' }}>
              <TrendingUp sx={{ mr: 0.5 }} fontSize="small" />
              Vendas
            </Link>
            <Typography color="text.primary" sx={{ display: 'flex', alignItems: 'center' }}>
              <Person sx={{ mr: 0.5 }} fontSize="small" />
              Gestão de Leads
            </Typography>
          </Breadcrumbs>

          {/* Conteúdo da página */}
          <SalesLeadManager />
        </Box>
      </Container>
    </RequireRole>
  );
};

export default SalesManagementPage;




