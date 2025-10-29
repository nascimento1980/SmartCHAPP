import React, { useState, useEffect } from 'react'
import {
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  TextField,
  Grid,
  Chip,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Fab,
  Tooltip,
  Alert,
  Snackbar,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Switch,
  FormControlLabel,
  Divider,
  Tabs,
  Tab
} from '@mui/material'
import {
  Add,
  Edit,
  Delete,
  Search,
  FilterList,
  Visibility,
  Description,
  Settings,
  ExpandMore,
  ContentCopy,
  Share,
  Download,
  Preview,
  Assignment,
  Checklist,
  ContactSupport,
  Engineering,
  Category,
  Create
} from '@mui/icons-material'
import { useAuth } from '../contexts/AuthContext'
import api from '../services/api'

const FormsPage = () => {
  const { user } = useAuth()
  const [forms, setForms] = useState([])
  const [loading, setLoading] = useState(true)
  const [openDialog, setOpenDialog] = useState(false)
  const [selectedForm, setSelectedForm] = useState(null)
  const [viewForm, setViewForm] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterCategory, setFilterCategory] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [activeTab, setActiveTab] = useState(0)
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' })

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: '',
    fields: [],
    settings: {
      allow_anonymous: false,
      require_authentication: true,
      allow_file_upload: false,
      max_submissions: 0,
      active: true
    }
  })

  const statusColors = {
    active: 'success',
    inactive: 'default',
    draft: 'warning',
    archived: 'error'
  }

  const categoryLabels = {
    'audit': 'Auditorias',
    'checklist': 'Checklists',
    'contact': 'Contatos',
    'technical_visit': 'Visita Técnica',
    'other': 'Outros',
    'creation': 'Criação'
  }

  const subSections = [
    {
      id: 'audit',
      title: 'Formulários - Auditorias',
      icon: <Assignment />,
      description: 'Formulários para auditorias e inspeções',
      color: '#1976d2'
    },
    {
      id: 'checklist',
      title: 'Formulários - Checklists',
      icon: <Checklist />,
      description: 'Checklists de processos e procedimentos',
      color: '#388e3c'
    },
    {
      id: 'contact',
      title: 'Formulários - Contatos',
      icon: <ContactSupport />,
      description: 'Formulários de contato e comunicação',
      color: '#f57c00'
    },
    {
      id: 'technical_visit',
      title: 'Formulários - Visita Técnica',
      icon: <Engineering />,
      description: 'Formulários para visitas técnicas',
      color: '#7b1fa2'
    },
    {
      id: 'other',
      title: 'Formulários - Outros',
      icon: <Category />,
      description: 'Outros tipos de formulários',
      color: '#d32f2f'
    },
    {
      id: 'creation',
      title: 'Formulários - Criação',
      icon: <Create />,
      description: 'Criar novos formulários personalizados',
      color: '#1976d2'
    }
  ]

  useEffect(() => {
    fetchForms()
  }, [searchTerm, filterCategory, filterStatus, activeTab])

  const fetchForms = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      if (searchTerm) params.append('search', searchTerm)
      if (filterCategory) params.append('category', filterCategory)
      if (filterStatus) params.append('status', filterStatus)
      
      // Filtrar por subseção ativa
      const currentSubSection = subSections[activeTab]
      if (currentSubSection && currentSubSection.id !== 'creation') {
        params.append('category', currentSubSection.id)
      }
      
      const response = await api.get(`/forms?${params.toString()}`)
      setForms(response.data.forms || [])
    } catch (error) {
      console.error('Erro ao buscar formulários:', error)
      setSnackbar({
        open: true,
        message: 'Erro ao carregar formulários',
        severity: 'error'
      })
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)

    try {
      if (selectedForm) {
        await api.patch(`/forms/${selectedForm.id}`, formData)
        setSnackbar({
          open: true,
          message: 'Formulário atualizado com sucesso',
          severity: 'success'
        })
      } else {
        await api.post('/forms', formData)
        setSnackbar({
          open: true,
          message: 'Formulário criado com sucesso',
          severity: 'success'
        })
      }

      setOpenDialog(false)
      setSelectedForm(null)
      setFormData({
        title: '',
        description: '',
        category: '',
        fields: [],
        settings: {
          allow_anonymous: false,
          require_authentication: true,
          allow_file_upload: false,
          max_submissions: 0,
          active: true
        }
      })
      fetchForms()
    } catch (error) {
      console.error('Erro ao salvar formulário:', error)
      setSnackbar({
        open: true,
        message: error.response?.data?.message || 'Erro ao salvar formulário',
        severity: 'error'
      })
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (formId) => {
    if (window.confirm('Tem certeza que deseja excluir este formulário?')) {
      try {
        await api.delete(`/forms/${formId}`)
        setSnackbar({
          open: true,
          message: 'Formulário excluído com sucesso',
          severity: 'success'
        })
        fetchForms()
      } catch (error) {
        console.error('Erro ao excluir formulário:', error)
        setSnackbar({
          open: true,
          message: 'Erro ao excluir formulário',
          severity: 'error'
        })
      }
    }
  }

  const handleEdit = (form) => {
    setSelectedForm(form)
    setFormData({
      title: form.title,
      description: form.description,
      category: form.category,
      fields: form.fields || [],
      settings: form.settings || {
        allow_anonymous: false,
        require_authentication: true,
        allow_file_upload: false,
        max_submissions: 0,
        active: true
      }
    })
    setOpenDialog(true)
  }

  const handleView = (form) => {
    setViewForm(form)
  }

  const handleDuplicate = async (form) => {
    try {
      const duplicatedForm = {
        ...form,
        title: `${form.title} (Cópia)`,
        id: undefined,
        created_at: undefined,
        updated_at: undefined
      }
      await api.post('/forms', duplicatedForm)
      setSnackbar({
        open: true,
        message: 'Formulário duplicado com sucesso',
        severity: 'success'
      })
      fetchForms()
    } catch (error) {
      console.error('Erro ao duplicar formulário:', error)
      setSnackbar({
        open: true,
        message: 'Erro ao duplicar formulário',
        severity: 'error'
      })
    }
  }

  const addField = () => {
    const newField = {
      id: Date.now(),
      type: 'text',
      label: '',
      required: false,
      options: []
    }
    setFormData({
      ...formData,
      fields: [...formData.fields, newField]
    })
  }

  const updateField = (index, field) => {
    const updatedFields = [...formData.fields]
    updatedFields[index] = field
    setFormData({
      ...formData,
      fields: updatedFields
    })
  }

  const removeField = (index) => {
    const updatedFields = formData.fields.filter((_, i) => i !== index)
    setFormData({
      ...formData,
      fields: updatedFields
    })
  }

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('pt-BR')
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" gutterBottom>
          Gestão de Formulários
        </Typography>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={() => setOpenDialog(true)}
        >
          Novo Formulário
        </Button>
      </Box>

      {/* Abas de Subseções */}
      <Card sx={{ mb: 3 }}>
        <CardContent sx={{ p: 0 }}>
          <Tabs
            value={activeTab}
            onChange={(e, newValue) => setActiveTab(newValue)}
            variant="scrollable"
            scrollButtons="auto"
            sx={{
              '& .MuiTab-root': {
                minHeight: 64,
                textTransform: 'none',
                fontSize: '0.875rem'
              }
            }}
          >
            {subSections.map((section, index) => (
              <Tab
                key={section.id}
                label={
                  <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <Box sx={{ color: section.color, mb: 0.5 }}>
                      {section.icon}
                    </Box>
                    <Typography variant="caption" sx={{ textAlign: 'center' }}>
                      {section.title}
                    </Typography>
                  </Box>
                }
                sx={{
                  minWidth: 120,
                  '&.Mui-selected': {
                    color: section.color
                  }
                }}
              />
            ))}
          </Tabs>
        </CardContent>
      </Card>

      {/* Informações da Subseção */}
      {activeTab < subSections.length && (
        <Card sx={{ mb: 3, backgroundColor: `${subSections[activeTab].color}10` }}>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <Box sx={{ color: subSections[activeTab].color, mr: 2 }}>
                {subSections[activeTab].icon}
              </Box>
              <Box>
                <Typography variant="h6" sx={{ color: subSections[activeTab].color }}>
                  {subSections[activeTab].title}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {subSections[activeTab].description}
                </Typography>
              </Box>
            </Box>
            
            {activeTab === 5 && ( // Subseção de Criação
              <Alert severity="info" sx={{ mb: 2 }}>
                <Typography variant="body2">
                  Crie formulários personalizados para diferentes necessidades do seu negócio.
                  Escolha o tipo de campo, configure validações e defina as permissões de acesso.
                </Typography>
              </Alert>
            )}
          </CardContent>
        </Card>
      )}

      {/* Filtros */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                placeholder="Buscar formulários..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                InputProps={{
                  startAdornment: <Search sx={{ mr: 1, color: 'text.secondary' }} />
                }}
              />
            </Grid>
            <Grid item xs={12} md={3}>
              <FormControl fullWidth>
                <InputLabel>Status</InputLabel>
                <Select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  label="Status"
                >
                  <MenuItem value="">Todos</MenuItem>
                  <MenuItem value="active">Ativo</MenuItem>
                  <MenuItem value="inactive">Inativo</MenuItem>
                  <MenuItem value="draft">Rascunho</MenuItem>
                  <MenuItem value="archived">Arquivado</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={3}>
              <Button
                fullWidth
                variant="outlined"
                startIcon={<FilterList />}
                onClick={() => {
                  setSearchTerm('')
                  setFilterStatus('')
                }}
              >
                Limpar Filtros
              </Button>
            </Grid>
            <Grid item xs={12} md={2}>
              <Button
                fullWidth
                variant="contained"
                startIcon={<Add />}
                onClick={() => setOpenDialog(true)}
                sx={{ backgroundColor: subSections[activeTab]?.color }}
              >
                Novo
              </Button>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Lista de Formulários */}
      <Card>
        <CardContent>
          <TableContainer component={Paper} variant="outlined">
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Formulário</TableCell>
                  <TableCell>Categoria</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Criado em</TableCell>
                  <TableCell>Submissões</TableCell>
                  <TableCell align="center">Ações</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {forms.map((form) => (
                  <TableRow key={form.id} hover>
                    <TableCell>
                      <Box>
                        <Typography variant="subtitle2" fontWeight="bold">
                          {form.title}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {form.description}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={categoryLabels[form.category] || form.category}
                        size="small"
                        color="primary"
                        variant="outlined"
                      />
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={form.settings?.active ? 'Ativo' : 'Inativo'}
                        color={statusColors[form.settings?.active ? 'active' : 'inactive']}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      {formatDate(form.created_at)}
                    </TableCell>
                    <TableCell>
                      {form.submissions_count || 0}
                    </TableCell>
                    <TableCell align="center">
                      <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center' }}>
                        <Tooltip title="Visualizar">
                          <IconButton
                            size="small"
                            onClick={() => handleView(form)}
                          >
                            <Visibility />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Editar">
                          <IconButton
                            size="small"
                            onClick={() => handleEdit(form)}
                          >
                            <Edit />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Duplicar">
                          <IconButton
                            size="small"
                            onClick={() => handleDuplicate(form)}
                          >
                            <ContentCopy />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Excluir">
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() => handleDelete(form.id)}
                          >
                            <Delete />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>

          {forms.length === 0 && !loading && (
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <Typography variant="body1" color="text.secondary">
                Nenhum formulário encontrado
              </Typography>
            </Box>
          )}
        </CardContent>
      </Card>

      {/* Dialog de Criação/Edição */}
      <Dialog
        open={openDialog}
        onClose={() => setOpenDialog(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          {selectedForm ? 'Editar Formulário' : 'Novo Formulário'}
        </DialogTitle>
        <DialogContent>
          <Box component="form" onSubmit={handleSubmit} sx={{ mt: 2 }}>
            <Grid container spacing={3}>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Título do Formulário"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  required
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Descrição"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  multiline
                  rows={3}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                                  <FormControl fullWidth>
                    <InputLabel>Categoria</InputLabel>
                    <Select
                      value={formData.category}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                      label="Categoria"
                      required
                    >
                      <MenuItem value="audit">Auditorias</MenuItem>
                      <MenuItem value="checklist">Checklists</MenuItem>
                      <MenuItem value="contact">Contatos</MenuItem>
                      <MenuItem value="technical_visit">Visita Técnica</MenuItem>
                      <MenuItem value="other">Outros</MenuItem>
                    </Select>
                  </FormControl>
              </Grid>

              <Grid item xs={12}>
                <Typography variant="h6" gutterBottom>
                  Campos do Formulário
                </Typography>
                <Button
                  variant="outlined"
                  startIcon={<Add />}
                  onClick={addField}
                  sx={{ mb: 2 }}
                >
                  Adicionar Campo
                </Button>

                {formData.fields.map((field, index) => (
                  <Accordion key={field.id} sx={{ mb: 2 }}>
                    <AccordionSummary expandIcon={<ExpandMore />}>
                      <Typography>
                        Campo {index + 1}: {field.label || 'Sem título'}
                      </Typography>
                    </AccordionSummary>
                    <AccordionDetails>
                      <Grid container spacing={2}>
                        <Grid item xs={12} md={6}>
                          <TextField
                            fullWidth
                            label="Rótulo do Campo"
                            value={field.label}
                            onChange={(e) => updateField(index, { ...field, label: e.target.value })}
                          />
                        </Grid>
                        <Grid item xs={12} md={3}>
                          <TextField
                            fullWidth
                            label="Seção (opcional)"
                            value={field.section || ''}
                            onChange={(e) => updateField(index, { ...field, section: e.target.value })}
                          />
                        </Grid>
                        <Grid item xs={12} md={3}>
                          <FormControl fullWidth>
                            <InputLabel>Tipo</InputLabel>
                            <Select
                              value={field.type}
                              onChange={(e) => updateField(index, { ...field, type: e.target.value })}
                              label="Tipo"
                            >
                              <MenuItem value="text">Texto</MenuItem>
                              <MenuItem value="textarea">Área de Texto</MenuItem>
                              <MenuItem value="number">Número</MenuItem>
                              <MenuItem value="email">Email</MenuItem>
                              <MenuItem value="select">Seleção</MenuItem>
                              <MenuItem value="checkbox">Checkbox</MenuItem>
                              <MenuItem value="radio">Radio</MenuItem>
                              <MenuItem value="date">Data</MenuItem>
                              <MenuItem value="file">Arquivo</MenuItem>
                              <MenuItem value="files">Arquivos Múltiplos</MenuItem>
                              <MenuItem value="multiselect">Seleção Múltipla</MenuItem>
                              <MenuItem value="signature">Assinatura</MenuItem>
                            </Select>
                          </FormControl>
                        </Grid>
                        <Grid item xs={12} md={6}>
                          <FormControl fullWidth>
                            <InputLabel>Vincular a variável do sistema</InputLabel>
                            <Select
                              value={field.bind || ''}
                              label="Vincular a variável do sistema"
                              onChange={(e) => updateField(index, { ...field, bind: e.target.value })}
                            >
                              <MenuItem value="">Nenhum</MenuItem>
                              <MenuItem value="visit.title">Visita - Título</MenuItem>
                              <MenuItem value="visit.type">Visita - Tipo</MenuItem>
                              <MenuItem value="visit.address">Visita - Endereço</MenuItem>
                              <MenuItem value="visit.scheduled_date">Visita - Data</MenuItem>
                              <MenuItem value="visit.scheduled_time">Visita - Hora</MenuItem>
                              <MenuItem value="visit.responsible.name">Responsável - Nome</MenuItem>
                              <MenuItem value="client.company_name">Cliente - Nome</MenuItem>
                              <MenuItem value="client.contact">Cliente - Contato</MenuItem>
                            </Select>
                          </FormControl>
                        </Grid>
                        <Grid item xs={12} md={3}>
                          <FormControlLabel
                            control={
                              <Switch
                                checked={field.required}
                                onChange={(e) => updateField(index, { ...field, required: e.target.checked })}
                              />
                            }
                            label="Obrigatório"
                          />
                        </Grid>
                        <Grid item xs={12}>
                          <Button
                            variant="outlined"
                            color="error"
                            size="small"
                            onClick={() => removeField(index)}
                          >
                            Remover Campo
                          </Button>
                        </Grid>
                      </Grid>
                    </AccordionDetails>
                  </Accordion>
                ))}
              </Grid>

              <Grid item xs={12}>
                <Typography variant="h6" gutterBottom>
                  Configurações
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={12} md={6}>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={formData.settings.allow_anonymous}
                          onChange={(e) => setFormData({
                            ...formData,
                            settings: { ...formData.settings, allow_anonymous: e.target.checked }
                          })}
                        />
                      }
                      label="Permitir submissões anônimas"
                    />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={formData.settings.require_authentication}
                          onChange={(e) => setFormData({
                            ...formData,
                            settings: { ...formData.settings, require_authentication: e.target.checked }
                          })}
                        />
                      }
                      label="Requer autenticação"
                    />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={formData.settings.allow_file_upload}
                          onChange={(e) => setFormData({
                            ...formData,
                            settings: { ...formData.settings, allow_file_upload: e.target.checked }
                          })}
                        />
                      }
                      label="Permitir upload de arquivos"
                    />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={formData.settings.active}
                          onChange={(e) => setFormData({
                            ...formData,
                            settings: { ...formData.settings, active: e.target.checked }
                          })}
                        />
                      }
                      label="Formulário ativo"
                    />
                  </Grid>
                </Grid>
              </Grid>
            </Grid>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)}>
            Cancelar
          </Button>
          <Button
            variant="contained"
            onClick={handleSubmit}
            disabled={loading}
          >
            {selectedForm ? 'Atualizar' : 'Criar'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog de Visualização */}
      <Dialog
        open={!!viewForm}
        onClose={() => setViewForm(null)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          Visualizar Formulário
        </DialogTitle>
        <DialogContent>
          {viewForm && (
            <Box sx={{ mt: 2 }}>
              <Typography variant="h6" gutterBottom>
                {viewForm.title}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                {viewForm.description}
              </Typography>

              <Grid container spacing={2} sx={{ mb: 3 }}>
                <Grid item xs={6}>
                  <Typography variant="subtitle2" color="text.secondary">
                    Categoria
                  </Typography>
                  <Chip
                    label={categoryLabels[viewForm.category] || viewForm.category}
                    size="small"
                    color="primary"
                    variant="outlined"
                  />
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="subtitle2" color="text.secondary">
                    Status
                  </Typography>
                  <Chip
                    label={viewForm.settings?.active ? 'Ativo' : 'Inativo'}
                    color={statusColors[viewForm.settings?.active ? 'active' : 'inactive']}
                    size="small"
                  />
                </Grid>
              </Grid>

              <Typography variant="h6" gutterBottom>
                Campos ({viewForm.fields?.length || 0})
              </Typography>
              {viewForm.fields?.map((field, index) => (
                <Box key={index} sx={{ mb: 2, p: 2, border: '1px solid #e0e0e0', borderRadius: 1 }}>
                  <Typography variant="subtitle2">
                    {field.label}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Tipo: {field.type} | Obrigatório: {field.required ? 'Sim' : 'Não'}
                  </Typography>
                </Box>
              ))}

              <Typography variant="h6" gutterBottom sx={{ mt: 3 }}>
                Configurações
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                  <Typography variant="body2">
                    Submissões anônimas: {viewForm.settings?.allow_anonymous ? 'Sim' : 'Não'}
                  </Typography>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Typography variant="body2">
                    Requer autenticação: {viewForm.settings?.require_authentication ? 'Sim' : 'Não'}
                  </Typography>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Typography variant="body2">
                    Upload de arquivos: {viewForm.settings?.allow_file_upload ? 'Sim' : 'Não'}
                  </Typography>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Typography variant="body2">
                    Máximo de submissões: {viewForm.settings?.max_submissions || 'Ilimitado'}
                  </Typography>
                </Grid>
              </Grid>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setViewForm(null)}>
            Fechar
          </Button>
          <Button
            variant="contained"
            startIcon={<Share />}
            onClick={() => {
              // Implementar compartilhamento
              navigator.clipboard.writeText(`${window.location.origin}/forms/${viewForm?.id}`)
              setSnackbar({
                open: true,
                message: 'Link copiado para a área de transferência',
                severity: 'success'
              })
            }}
          >
            Compartilhar
          </Button>
        </DialogActions>
      </Dialog>

      {/* Floating Action Button */}
      <Fab
        color="primary"
        aria-label="add"
        sx={{
          position: 'fixed',
          bottom: 16,
          right: 16,
        }}
        onClick={() => setOpenDialog(true)}
      >
        <Add />
      </Fab>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
      >
        <Alert severity={snackbar.severity} onClose={() => setSnackbar({ ...snackbar, open: false })}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  )
}

export default FormsPage 