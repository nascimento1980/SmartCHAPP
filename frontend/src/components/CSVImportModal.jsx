import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  LinearProgress,
  Alert,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Chip,
  Divider,
  FormControl,
  InputLabel,
  Select,
  MenuItem
} from '@mui/material';
import {
  CloudUpload,
  Download,
  CheckCircle,
  Error,
  Warning,
  Info
} from '@mui/icons-material';
import api from '../services/api';
import { useQueryClient } from 'react-query';

const CSVImportModal = ({ open, onClose, onImportSuccess }) => {
  const queryClient = useQueryClient();
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [templateType, setTemplateType] = useState('lead'); // 'lead' | 'client'

  const handleFileChange = (event) => {
    const selectedFile = event.target.files[0];
    if (!selectedFile) return;
    const isCSV = selectedFile.type === 'text/csv' || selectedFile.name.endsWith('.csv');
    const isXLSX = selectedFile.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' || selectedFile.name.endsWith('.xlsx');
    if (isCSV || isXLSX) {
      setFile(selectedFile);
      setError(null);
      setResult(null);
    } else {
      setError('Por favor, selecione um arquivo CSV ou XLSX válido');
      setFile(null);
    }
  };

  const handleDownloadTemplateCSV = async () => {
    try {
      const response = await api.get(`/customer-contacts/template-csv?type=${templateType}`, {
        responseType: 'blob'
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `template-${templateType === 'client' ? 'clients' : 'leads'}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Erro ao baixar template:', error);
      setError('Erro ao baixar template CSV');
    }
  };

  const handleDownloadTemplateXLSM = async () => {
    try {
      const response = await api.get(`/customer-contacts/template-xlsm?type=${templateType}`, {
        responseType: 'blob'
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `template-${templateType === 'client' ? 'clients' : 'leads'}.xlsm`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Erro ao baixar template XLSM:', error);
      setError('Erro ao baixar template XLSM');
    }
  };

  const handleUpload = async () => {
    if (!file) return;

    setUploading(true);
    setError(null);
    setResult(null);

    try {
      const formData = new FormData();
      const isCSV = file.type === 'text/csv' || file.name.endsWith('.csv');
      const isXLSX = file.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' || file.name.endsWith('.xlsx');

      if (isCSV) {
        formData.append('csvFile', file);
      } else if (isXLSX) {
        formData.append('xlsxFile', file);
      } else {
        setError('Formato não suportado. Use CSV ou XLSX.');
        setUploading(false);
        return;
      }

      let endpoint = isCSV ? '/customer-contacts/import-csv' : '/customer-contacts/import-xlsx';
      let response;
      try {
        response = await api.post(endpoint, formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
      } catch (err) {
        // Fallback para alias v1
        if (err?.response?.status === 404) {
          endpoint = isCSV ? '/v1/customer-contacts/import-csv' : '/v1/customer-contacts/import-xlsx';
          response = await api.post(endpoint, formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
          });
        } else {
          throw err;
        }
      }

      setResult(response.data);
      if (response.data.success && onImportSuccess) onImportSuccess(response.data);
      // Invalidate lists to reflect imported leads immediately
      try {
        queryClient.invalidateQueries('leadsList');
        queryClient.invalidateQueries('customerContactsList');
      } catch (_) {}
    } catch (error) {
      console.error('Erro na importação:', error);
      if (error.response?.data) {
        setError(error.response.data.error || 'Erro na importação');
        if (error.response.data.details) {
          setResult({ success: false, errors: error.response.data.details, imported: 0 });
        }
      } else {
        setError('Erro na importação. Verifique o arquivo e tente novamente.');
      }
    } finally {
      setUploading(false);
    }
  };

  const handleClose = () => {
    setFile(null);
    setError(null);
    setResult(null);
    onClose();
  };

  const getStatusIcon = (type) => {
    switch (type) {
      case 'success':
        return <CheckCircle color="success" />;
      case 'error':
        return <Error color="error" />;
      case 'warning':
        return <Warning color="warning" />;
      default:
        return <Info color="info" />;
    }
  };

  const getStatusColor = (type) => {
    switch (type) {
      case 'success':
        return 'success';
      case 'error':
        return 'error';
      case 'warning':
        return 'warning';
      default:
        return 'info';
    }
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Box display="flex" alignItems="center" gap={1}>
          <CloudUpload color="primary" />
          Importar Dados via CSV/XLSX
        </Box>
      </DialogTitle>

      <DialogContent>
        {!result && (
          <Box>
            <Typography variant="body2" color="text.secondary" paragraph>
              Importe registros em lote via <strong>CSV</strong> ou <strong>XLSX</strong>.
              Campos obrigatórios: <strong>Nome da Empresa</strong> e <strong>Segmento</strong>.
              Para <strong>Clientes</strong>, informe <strong>CNPJ</strong> ou <strong>CPF</strong>.
            </Typography>

            <Typography variant="body2" color="text.secondary" paragraph>
              <strong>Campos opcionais:</strong> origem, nome do contato, email, telefone, celular, endereço, cidade, estado, CEP, CNPJ/CPF, observações, prioridade (baixa|media|alta), score (0..100)
            </Typography>

            <Box mb={2} sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
              <FormControl size="small" sx={{ minWidth: 180 }}>
                <InputLabel>Tipo de Importação</InputLabel>
                <Select
                  value={templateType}
                  label="Tipo de Importação"
                  onChange={(e) => setTemplateType(e.target.value)}
                >
                  <MenuItem value="lead">Leads</MenuItem>
                  <MenuItem value="client">Clientes</MenuItem>
                </Select>
              </FormControl>

              <Button variant="outlined" startIcon={<Download />} onClick={handleDownloadTemplateCSV}>
                Baixar Template CSV
              </Button>
              <Button variant="outlined" startIcon={<Download />} onClick={handleDownloadTemplateXLSM}>
                Baixar Template XLSX
              </Button>
            </Box>

            <Box border={2} borderColor="grey.300" borderRadius={2} p={3} textAlign="center" bgcolor="grey.50" sx={{ borderStyle: 'dashed' }}>
              <input
                accept=".csv,.xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv"
                style={{ display: 'none' }}
                id="file-input"
                type="file"
                onChange={handleFileChange}
              />
              <label htmlFor="file-input">
                <Button variant="contained" component="span" startIcon={<CloudUpload />} disabled={uploading}>
                  Selecionar Arquivo CSV/XLSX
                </Button>
              </label>

              {file && (
                <Box mt={2}>
                  <Typography variant="body2" color="primary">Arquivo selecionado: {file.name}</Typography>
                  <Typography variant="caption" color="text.secondary">Tamanho: {(file.size / 1024).toFixed(2)} KB</Typography>
                </Box>
              )}
            </Box>

            {error && (
              <Alert severity="error" sx={{ mt: 2 }}>
                {error}
              </Alert>
            )}
          </Box>
        )}

        {uploading && (
          <Box mt={2}>
            <Typography variant="body2" gutterBottom>Processando arquivo...</Typography>
            <LinearProgress />
          </Box>
        )}

        {result && (
          <Box>
            <Alert severity={result.success ? 'success' : 'error'} sx={{ mb: 2 }}>
              {result.success ? result.message : result.error}
            </Alert>
            {result.success && (
              <Box>
                <Typography variant="h6" gutterBottom>Resumo da Importação</Typography>
                <Box display="flex" gap={2} mb={2}>
                  <Chip label={`${result.imported} leads importados`} color="success" icon={<CheckCircle />} />
                  <Chip label={`${result.totalLeads} total de leads`} color="primary" variant="outlined" />
                  <Chip label={`${result.totalClients} total de clientes`} color="secondary" variant="outlined" />
                </Box>
              </Box>
            )}
            {result.errors && result.errors.length > 0 && (
              <Box>
                <Typography variant="h6" gutterBottom color="error">Erros Encontrados ({result.errors.length})</Typography>
                <List dense>
                  {result.errors.map((err, index) => (
                    <ListItem key={index}>
                      <ListItemIcon><Error color="error" /></ListItemIcon>
                      <ListItemText primary={err} primaryTypographyProps={{ variant: 'body2' }} />
                    </ListItem>
                  ))}
                </List>
              </Box>
            )}
          </Box>
        )}
      </DialogContent>

      <DialogActions>
        {!result && (
          <Button onClick={handleClose} disabled={uploading}>Cancelar</Button>
        )}
        {!result && file && (
          <Button onClick={handleUpload} variant="contained" disabled={uploading} startIcon={<CloudUpload />}>
            {uploading ? 'Importando...' : 'Importar Leads'}
          </Button>
        )}
        {result && (
          <Button onClick={handleClose} variant="contained">Fechar</Button>
        )}
      </DialogActions>
    </Dialog>
  );
};

export default CSVImportModal;