/**
 * Componente reutilizável para campos de endereço com busca automática
 * Suporta CEP, CNPJ e Geocodificação
 */

import React from 'react';
import {
  Grid,
  TextField,
  InputAdornment,
  IconButton,
  CircularProgress,
  Tooltip
} from '@mui/material';
import { Search, MyLocation } from '@mui/icons-material';
import { useAddressLookup } from '../hooks/useAddressLookup';

const AddressFields = ({
  formData,
  onChange,
  showCnpj = false,
  disabled = false,
  variant = 'outlined'
}) => {
  const { searchByCep, searchByCnpj, geocodeAddress, formatCep, formatCnpj, loading } = useAddressLookup();

  const handleChange = (field) => (event) => {
    onChange({
      ...formData,
      [field]: event.target.value
    });
  };

  const handleCepSearch = async () => {
    const result = await searchByCep(formData.zipcode, (data) => {
      onChange({
        ...formData,
        ...data
      });
    });
  };

  const handleCnpjSearch = async () => {
    const result = await searchByCnpj(formData.cnpj, (data) => {
      onChange({
        ...formData,
        ...data
      });
    });
  };

  const handleGeocode = async () => {
    const result = await geocodeAddress(
      formData.address,
      formData.city,
      formData.state,
      (coords) => {
        onChange({
          ...formData,
          lat: coords.lat,
          lon: coords.lon
        });
      }
    );
  };

  return (
    <>
      {/* CNPJ (opcional) */}
      {showCnpj && (
        <Grid item xs={12} md={6}>
          <TextField
            fullWidth
            label="CNPJ"
            value={formData.cnpj || ''}
            onChange={(e) => {
              const formatted = formatCnpj(e.target.value);
              onChange({ ...formData, cnpj: formatted });
            }}
            disabled={disabled}
            variant={variant}
            placeholder="00.000.000/0000-00"
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <Tooltip title="Buscar dados pela Receita Federal">
                    <span>
                      <IconButton
                        onClick={handleCnpjSearch}
                        disabled={loading.cnpj || disabled || !formData.cnpj}
                        edge="end"
                      >
                        {loading.cnpj ? <CircularProgress size={20} /> : <Search />}
                      </IconButton>
                    </span>
                  </Tooltip>
                </InputAdornment>
              )
            }}
            helperText="Digite o CNPJ e clique na lupa para preencher automaticamente"
          />
        </Grid>
      )}

      {/* CEP */}
      <Grid item xs={12} md={showCnpj ? 6 : 4}>
        <TextField
          fullWidth
          label="CEP"
          value={formData.zipcode || ''}
          onChange={(e) => {
            const formatted = formatCep(e.target.value);
            onChange({ ...formData, zipcode: formatted });
          }}
          disabled={disabled}
          variant={variant}
          placeholder="00000-000"
          InputProps={{
            endAdornment: (
              <InputAdornment position="end">
                <Tooltip title="Buscar endereço pelo CEP">
                  <span>
                    <IconButton
                      onClick={handleCepSearch}
                      disabled={loading.cep || disabled || !formData.zipcode}
                      edge="end"
                    >
                      {loading.cep ? <CircularProgress size={20} /> : <Search />}
                    </IconButton>
                  </span>
                </Tooltip>
              </InputAdornment>
            )
          }}
          helperText="Digite o CEP e clique na lupa"
        />
      </Grid>

      {/* Coordenadas com Geocoding */}
      <Grid item xs={12} md={showCnpj ? 8 : 6}>
        <TextField
          fullWidth
          label="Endereço"
          value={formData.address || ''}
          onChange={handleChange('address')}
          disabled={disabled}
          variant={variant}
          placeholder="Rua, Avenida, etc."
        />
      </Grid>

      {/* Número */}
      <Grid item xs={12} md={showCnpj ? 4 : 2}>
        <TextField
          fullWidth
          label="Número"
          value={formData.number || ''}
          onChange={handleChange('number')}
          disabled={disabled}
          variant={variant}
          placeholder="123"
        />
      </Grid>

      {/* Complemento */}
      <Grid item xs={12} md={4}>
        <TextField
          fullWidth
          label="Complemento"
          value={formData.complement || ''}
          onChange={handleChange('complement')}
          disabled={disabled}
          variant={variant}
          placeholder="Apto, Sala, etc."
        />
      </Grid>

      {/* Bairro */}
      <Grid item xs={12} md={4}>
        <TextField
          fullWidth
          label="Bairro"
          value={formData.neighborhood || ''}
          onChange={handleChange('neighborhood')}
          disabled={disabled}
          variant={variant}
          placeholder="Nome do bairro"
        />
      </Grid>

      {/* Cidade */}
      <Grid item xs={12} md={4}>
        <TextField
          fullWidth
          label="Cidade"
          value={formData.city || ''}
          onChange={handleChange('city')}
          disabled={disabled}
          variant={variant}
          placeholder="Nome da cidade"
        />
      </Grid>

      {/* Estado */}
      <Grid item xs={12} md={2}>
        <TextField
          fullWidth
          label="Estado"
          value={formData.state || ''}
          onChange={(e) => {
            const value = e.target.value.toUpperCase().slice(0, 2);
            onChange({ ...formData, state: value });
          }}
          disabled={disabled}
          variant={variant}
          placeholder="UF"
          inputProps={{ maxLength: 2 }}
        />
      </Grid>

      {/* Botão para Geocodificar */}
      <Grid item xs={12} md={10}>
        <TextField
          fullWidth
          label="Coordenadas (Lat/Lon)"
          value={formData.lat && formData.lon ? `${formData.lat}, ${formData.lon}` : ''}
          disabled
          variant={variant}
          InputProps={{
            endAdornment: (
              <InputAdornment position="end">
                <Tooltip title="Buscar coordenadas geográficas do endereço">
                  <span>
                    <IconButton
                      onClick={handleGeocode}
                      disabled={loading.geocode || disabled || !formData.address || !formData.city || !formData.state}
                      edge="end"
                      color="primary"
                    >
                      {loading.geocode ? <CircularProgress size={20} /> : <MyLocation />}
                    </IconButton>
                  </span>
                </Tooltip>
              </InputAdornment>
            )
          }}
          helperText="Clique no ícone para obter coordenadas precisas (necessário para cálculo de distâncias)"
        />
      </Grid>
    </>
  );
};

export default AddressFields;

