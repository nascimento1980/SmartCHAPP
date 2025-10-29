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
  Tooltip,
  Alert,
  Snackbar,
  Avatar,
  Switch,
  FormControlLabel
} from '@mui/material'
import {
  Add,
  Edit,
  Delete,
  Search,
  FilterList,
  Visibility,
  Inventory,
  LocalOffer,
  Category
} from '@mui/icons-material'
import { useAuth } from '../contexts/AuthContext'
import api from '../services/api'

const ProductsPage = () => {
  const { user } = useAuth()
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [openDialog, setOpenDialog] = useState(false)
  const [selectedProduct, setSelectedProduct] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterCategory, setFilterCategory] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' })
  const [viewProduct, setViewProduct] = useState(null)
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    code: '',
    category: '',
    price: '',
    promotional_price: '',
    stock_quantity: '',
    min_stock: '',
    unit: '',
    brand: '',
    status: 'ativo'
  })

  const statusColors = {
    ativo: 'success',
    inativo: 'error',
    em_promocao: 'warning',
    esgotado: 'error'
  }

  const categoryLabels = {
    higiene: 'Higiene',
    limpeza: 'Limpeza',
    papelaria: 'Papelaria',
    equipamentos: 'Equipamentos',
    acessorios: 'Acessórios',
    luvas: 'Luvas',
    fibras: 'Fibras',
    sacos_lixo: 'Sacos de Lixo',
    spartan: 'Spartan Brasil',
    outros: 'Outros'
  }

  useEffect(() => {
    fetchProducts()
  }, [searchTerm, filterCategory, filterStatus])

  const fetchProducts = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      if (searchTerm) params.append('search', searchTerm)
      if (filterCategory) params.append('category', filterCategory)
      if (filterStatus) params.append('status', filterStatus)
      
      const response = await api.get(`/products?${params.toString()}`)
      setProducts(response.data.products || [])
    } catch (error) {
      console.error('Erro ao buscar produtos:', error)
      setSnackbar({
        open: true,
        message: 'Erro ao carregar produtos',
        severity: 'error'
      })
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (productId) => {
    if (window.confirm('Tem certeza que deseja excluir este produto?')) {
      try {
        await api.delete(`/products/${productId}`)
        setSnackbar({
          open: true,
          message: 'Produto excluído com sucesso',
          severity: 'success'
        })
        fetchProducts()
      } catch (error) {
        setSnackbar({
          open: true,
          message: 'Erro ao excluir produto',
          severity: 'error'
        })
      }
    }
  }

  const handleStatusToggle = async (productId, currentStatus) => {
    try {
      const newStatus = currentStatus === 'ativo' ? 'inativo' : 'ativo'
      await api.patch(`/products/${productId}`, { status: newStatus })
      setSnackbar({
        open: true,
        message: 'Status do produto atualizado',
        severity: 'success'
      })
      fetchProducts()
    } catch (error) {
      setSnackbar({
        open: true,
        message: 'Erro ao atualizar status',
        severity: 'error'
      })
    }
  }

  const handleOpenDialog = (product = null) => {
    if (product) {
      setFormData({
        name: product.name || '',
        description: product.description || '',
        code: product.code || '',
        category: product.category || '',
        price: product.price || '',
        promotional_price: product.promotional_price || '',
        stock_quantity: product.stock_quantity || '',
        min_stock: product.min_stock || '',
        unit: product.unit || '',
        brand: product.brand || '',
        status: product.status || 'ativo'
      })
      setSelectedProduct(product)
    } else {
      setFormData({
        name: '',
        description: '',
        code: '',
        category: '',
        price: '',
        promotional_price: '',
        stock_quantity: '',
        min_stock: '',
        unit: '',
        brand: '',
        status: 'ativo'
      })
      setSelectedProduct(null)
    }
    setOpenDialog(true)
  }

  const handleCloseDialog = () => {
    setOpenDialog(false)
    setSelectedProduct(null)
    setFormData({
      name: '',
      description: '',
      code: '',
      category: '',
      price: '',
      promotional_price: '',
      stock_quantity: '',
      min_stock: '',
      unit: '',
      brand: '',
      status: 'ativo'
    })
  }

  const handleSubmit = async () => {
    try {
      if (selectedProduct) {
        await api.put(`/products/${selectedProduct.id}`, formData)
        setSnackbar({
          open: true,
          message: 'Produto atualizado com sucesso',
          severity: 'success'
        })
      } else {
        await api.post('/products', formData)
        setSnackbar({
          open: true,
          message: 'Produto criado com sucesso',
          severity: 'success'
        })
      }
      handleCloseDialog()
      fetchProducts()
    } catch (error) {
      setSnackbar({
        open: true,
        message: 'Erro ao salvar produto',
        severity: 'error'
      })
    }
  }

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value || 0)
  }

  const getProductIcon = (category) => {
    switch (category) {
      case 'higiene':
        return <Inventory color="primary" />
      case 'limpeza':
        return <Category color="secondary" />
      case 'papelaria':
        return <LocalOffer color="info" />
      default:
        return <Inventory color="default" />
    }
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" gutterBottom>
          Gestão de Produtos
        </Typography>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={() => handleOpenDialog()}
        >
          Novo Produto
        </Button>
      </Box>

      {/* Filtros */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                placeholder="Buscar produtos..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                InputProps={{
                  startAdornment: <Search sx={{ mr: 1, color: 'text.secondary' }} />
                }}
              />
            </Grid>
            <Grid item xs={12} md={3}>
              <FormControl fullWidth>
                <InputLabel>Categoria</InputLabel>
                <Select
                  value={filterCategory}
                  onChange={(e) => setFilterCategory(e.target.value)}
                  label="Categoria"
                >
                  <MenuItem value="">Todas</MenuItem>
                  {Object.entries(categoryLabels).map(([value, label]) => (
                    <MenuItem key={value} value={value}>{label}</MenuItem>
                  ))}
                </Select>
              </FormControl>
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
                  <MenuItem value="ativo">Ativo</MenuItem>
                  <MenuItem value="inativo">Inativo</MenuItem>
                  <MenuItem value="em_promocao">Em Promoção</MenuItem>
                  <MenuItem value="esgotado">Esgotado</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={2}>
              <Button
                fullWidth
                variant="outlined"
                startIcon={<FilterList />}
                onClick={() => {
                  setSearchTerm('')
                  setFilterCategory('')
                  setFilterStatus('')
                }}
              >
                Limpar
              </Button>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Lista de Produtos */}
      <Card>
        <CardContent>
          <TableContainer component={Paper} variant="outlined">
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Produto</TableCell>
                  <TableCell>Categoria</TableCell>
                  <TableCell>Código</TableCell>
                  <TableCell>Preço</TableCell>
                  <TableCell>Estoque</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Marca</TableCell>
                  <TableCell align="center">Ações</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {products.map((product) => (
                  <TableRow key={product.id} hover>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <Avatar sx={{ bgcolor: 'primary.main' }}>
                          {getProductIcon(product.category)}
                        </Avatar>
                        <Box>
                          <Typography variant="subtitle2" fontWeight="bold">
                            {product.name}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {product.description?.substring(0, 50)}...
                          </Typography>
                        </Box>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={categoryLabels[product.category] || product.category}
                        size="small"
                        variant="outlined"
                      />
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" fontFamily="monospace">
                        {product.code}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" fontWeight="bold">
                        {formatCurrency(product.price)}
                      </Typography>
                      {product.promotional_price && (
                        <Typography variant="caption" color="error">
                          Promoção: {formatCurrency(product.promotional_price)}
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell>
                      <Typography 
                        variant="body2" 
                        color={product.stock_quantity <= product.min_stock ? 'error' : 'inherit'}
                      >
                        {product.stock_quantity} {product.unit}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Chip
                          label={product.status}
                          color={statusColors[product.status] || 'default'}
                          size="small"
                        />
                        <FormControlLabel
                          control={
                            <Switch
                              checked={product.status === 'ativo'}
                              onChange={() => handleStatusToggle(product.id, product.status)}
                              size="small"
                            />
                          }
                          label=""
                        />
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {product.brand || 'N/A'}
                      </Typography>
                    </TableCell>
                    <TableCell align="center">
                      <Box sx={{ display: 'flex', gap: 1 }}>
                        <Tooltip title="Visualizar">
                          <IconButton 
                            size="small"
                            onClick={() => setViewProduct(product)}
                          >
                            <Visibility />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Editar">
                          <IconButton 
                            size="small"
                            onClick={() => handleOpenDialog(product)}
                          >
                            <Edit />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Excluir">
                          <IconButton 
                            size="small"
                            color="error"
                            onClick={() => handleDelete(product.id)}
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
          
          {products.length === 0 && !loading && (
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <Typography variant="body1" color="text.secondary">
                Nenhum produto encontrado
              </Typography>
            </Box>
          )}
        </CardContent>
      </Card>

      {/* Dialog de Criação/Edição */}
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="md" fullWidth>
        <DialogTitle>
          {selectedProduct ? 'Editar Produto' : 'Novo Produto'}
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Nome do Produto"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Código"
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                required
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Descrição"
                multiline
                rows={2}
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Categoria</InputLabel>
                <Select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  label="Categoria"
                >
                  {Object.entries(categoryLabels).map(([value, label]) => (
                    <MenuItem key={value} value={value}>{label}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Marca"
                value={formData.brand}
                onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                label="Preço"
                type="number"
                value={formData.price}
                onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                required
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                label="Preço Promocional"
                type="number"
                value={formData.promotional_price}
                onChange={(e) => setFormData({ ...formData, promotional_price: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                label="Unidade"
                value={formData.unit}
                onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                placeholder="Ex: UN, KG, L"
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Quantidade em Estoque"
                type="number"
                value={formData.stock_quantity}
                onChange={(e) => setFormData({ ...formData, stock_quantity: e.target.value })}
                required
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Estoque Mínimo"
                type="number"
                value={formData.min_stock}
                onChange={(e) => setFormData({ ...formData, min_stock: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Status</InputLabel>
                <Select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  label="Status"
                >
                  <MenuItem value="ativo">Ativo</MenuItem>
                  <MenuItem value="inativo">Inativo</MenuItem>
                  <MenuItem value="em_promocao">Em Promoção</MenuItem>
                  <MenuItem value="esgotado">Esgotado</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancelar</Button>
          <Button onClick={handleSubmit} variant="contained">
            {selectedProduct ? 'Atualizar' : 'Criar'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog de Visualização */}
      <Dialog open={!!viewProduct} onClose={() => setViewProduct(null)} maxWidth="md" fullWidth>
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Avatar sx={{ bgcolor: 'primary.main' }}>
              {viewProduct && getProductIcon(viewProduct.category)}
            </Avatar>
            Detalhes do Produto
          </Box>
        </DialogTitle>
        <DialogContent>
          {viewProduct && (
            <Grid container spacing={3} sx={{ mt: 1 }}>
              <Grid item xs={12} md={6}>
                <Typography variant="h6" gutterBottom>Informações Básicas</Typography>
                <Box sx={{ mb: 2 }}>
                  <Typography variant="subtitle2" color="textSecondary">Nome</Typography>
                  <Typography variant="body1">{viewProduct.name}</Typography>
                </Box>
                <Box sx={{ mb: 2 }}>
                  <Typography variant="subtitle2" color="textSecondary">Código</Typography>
                  <Typography variant="body1" fontFamily="monospace">{viewProduct.code}</Typography>
                </Box>
                <Box sx={{ mb: 2 }}>
                  <Typography variant="subtitle2" color="textSecondary">Descrição</Typography>
                  <Typography variant="body1">{viewProduct.description || 'Sem descrição'}</Typography>
                </Box>
                <Box sx={{ mb: 2 }}>
                  <Typography variant="subtitle2" color="textSecondary">Categoria</Typography>
                  <Chip
                    label={categoryLabels[viewProduct.category] || viewProduct.category}
                    size="small"
                    variant="outlined"
                  />
                </Box>
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="h6" gutterBottom>Preços e Estoque</Typography>
                <Box sx={{ mb: 2 }}>
                  <Typography variant="subtitle2" color="textSecondary">Preço</Typography>
                  <Typography variant="body1" fontWeight="bold">
                    {formatCurrency(viewProduct.price)}
                  </Typography>
                  {viewProduct.promotional_price && (
                    <Typography variant="caption" color="error">
                      Promoção: {formatCurrency(viewProduct.promotional_price)}
                    </Typography>
                  )}
                </Box>
                <Box sx={{ mb: 2 }}>
                  <Typography variant="subtitle2" color="textSecondary">Estoque</Typography>
                  <Typography 
                    variant="body1" 
                    color={viewProduct.stock_quantity <= viewProduct.min_stock ? 'error' : 'inherit'}
                  >
                    {viewProduct.stock_quantity} {viewProduct.unit}
                  </Typography>
                  {viewProduct.min_stock && (
                    <Typography variant="caption" color="textSecondary">
                      Mín: {viewProduct.min_stock} {viewProduct.unit}
                    </Typography>
                  )}
                </Box>
                <Box sx={{ mb: 2 }}>
                  <Typography variant="subtitle2" color="textSecondary">Status</Typography>
                  <Chip
                    label={viewProduct.status}
                    color={statusColors[viewProduct.status] || 'default'}
                    size="small"
                  />
                </Box>
                <Box sx={{ mb: 2 }}>
                  <Typography variant="subtitle2" color="textSecondary">Marca</Typography>
                  <Typography variant="body1">{viewProduct.brand || 'N/A'}</Typography>
                </Box>
              </Grid>
            </Grid>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setViewProduct(null)}>Fechar</Button>
          <Button 
            onClick={() => {
              setViewProduct(null)
              handleOpenDialog(viewProduct)
            }} 
            variant="contained"
          >
            Editar
          </Button>
        </DialogActions>
      </Dialog>

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

export default ProductsPage