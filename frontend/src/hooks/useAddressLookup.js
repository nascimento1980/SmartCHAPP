/**
 * Hook customizado para busca automática de endereços
 * Integra CEP (ViaCEP), CNPJ (ReceitaWS) e Geolocalização
 */

import { useState } from 'react';
import api from '../services/api';
import { useSnackbar } from 'notistack';

export const useAddressLookup = () => {
  const { enqueueSnackbar } = useSnackbar();
  const [loading, setLoading] = useState({
    cep: false,
    cnpj: false,
    geocode: false
  });

  /**
   * Busca endereço pelo CEP e geocodifica automaticamente
   */
  const searchByCep = async (cep, onSuccess) => {
    const cleanCep = cep.replace(/\D/g, ''); // Remove formatação
    
    if (!cleanCep || cleanCep.length !== 8) {
      enqueueSnackbar('CEP inválido. Digite 8 dígitos.', { variant: 'warning' });
      return null;
    }

    setLoading(prev => ({ ...prev, cep: true }));
    
    try {
      // Buscar CEP na ViaCEP (enviar apenas números)
      const response = await api.get(`/external-data/cep/${cleanCep}`);
      
      if (response.data) {
        const addressData = {
          address: response.data.address || '',
          complement: response.data.complement || '',
          neighborhood: response.data.neighborhood || '',
          city: response.data.city || '',
          state: response.data.state || '',
          zipcode: response.data.cep || cleanCep
        };

        // Geocodificar automaticamente para obter lat/lon
        try {
          const geoResponse = await api.post('/geolocation/geocode', {
            address: addressData.address,
            city: addressData.city,
            state: addressData.state,
            country: 'Brasil'
          });

          if (geoResponse.data.success) {
            addressData.lat = geoResponse.data.lat;
            addressData.lon = geoResponse.data.lon;
            console.log('✅ Coordenadas obtidas:', { lat: addressData.lat, lon: addressData.lon });
          }
        } catch (geoError) {
          console.warn('⚠️ Geocodificação falhou:', geoError.message);
          // Não bloqueia se geocodificação falhar
        }

        enqueueSnackbar('CEP encontrado! Endereço preenchido automaticamente.', { 
          variant: 'success' 
        });

        if (onSuccess) onSuccess(addressData);
        return addressData;
      }
    } catch (error) {
      console.error('Erro ao buscar CEP:', error);
      const errorMsg = error.response?.data?.error || 'Erro ao buscar CEP. Tente novamente.';
      enqueueSnackbar(errorMsg, { variant: 'error' });
      return null;
    } finally {
      setLoading(prev => ({ ...prev, cep: false }));
    }
  };

  /**
   * Busca dados da empresa pelo CNPJ e geocodifica automaticamente
   */
  const searchByCnpj = async (cnpj, onSuccess) => {
    const cleanCnpj = cnpj.replace(/\D/g, ''); // Remove formatação
    
    if (!cleanCnpj || cleanCnpj.length !== 14) {
      enqueueSnackbar('CNPJ inválido. Digite 14 dígitos.', { variant: 'warning' });
      return null;
    }

    setLoading(prev => ({ ...prev, cnpj: true }));
    
    try {
      // Buscar CNPJ na ReceitaWS (enviar apenas números)
      const response = await api.get(`/external-data/cnpj/${cleanCnpj}`);
      
      if (response.data) {
        const companyData = {
          cnpj: response.data.cnpj || cleanCnpj,
          company_name: response.data.company_name || '',
          fantasy_name: response.data.fantasy_name || '',
          email: response.data.email || '',
          phone: response.data.phone || '',
          address: response.data.address || '',
          number: response.data.number || '',
          complement: response.data.complement || '',
          neighborhood: response.data.neighborhood || '',
          city: response.data.city || '',
          state: response.data.state || '',
          zipcode: response.data.zipcode || '',
          activity: response.data.activity || '',
          status: response.data.status || ''
        };

        // Geocodificar automaticamente para obter lat/lon
        if (companyData.address && companyData.city && companyData.state) {
          try {
            const fullAddress = `${companyData.address}, ${companyData.number || 'S/N'}`;
            const geoResponse = await api.post('/geolocation/geocode', {
              address: fullAddress,
              city: companyData.city,
              state: companyData.state,
              country: 'Brasil'
            });

            if (geoResponse.data.success) {
              companyData.lat = geoResponse.data.lat;
              companyData.lon = geoResponse.data.lon;
              console.log('✅ Coordenadas obtidas:', { lat: companyData.lat, lon: companyData.lon });
            }
          } catch (geoError) {
            console.warn('⚠️ Geocodificação falhou:', geoError.message);
            // Não bloqueia se geocodificação falhar
          }
        }

        enqueueSnackbar('CNPJ encontrado! Dados preenchidos automaticamente.', { 
          variant: 'success' 
        });

        if (onSuccess) onSuccess(companyData);
        return companyData;
      }
    } catch (error) {
      console.error('Erro ao buscar CNPJ:', error);
      
      if (error.response?.status === 429) {
        enqueueSnackbar('Limite de consultas excedido. Aguarde alguns minutos.', { 
          variant: 'warning' 
        });
      } else {
        const errorMsg = error.response?.data?.error || 'Erro ao buscar CNPJ. Tente novamente.';
        enqueueSnackbar(errorMsg, { variant: 'error' });
      }
      return null;
    } finally {
      setLoading(prev => ({ ...prev, cnpj: false }));
    }
  };

  /**
   * Geocodifica um endereço completo para obter coordenadas
   */
  const geocodeAddress = async (address, city, state, onSuccess) => {
    if (!address || !city || !state) {
      enqueueSnackbar('Endereço incompleto para geocodificação.', { variant: 'warning' });
      return null;
    }

    setLoading(prev => ({ ...prev, geocode: true }));
    
    try {
      const response = await api.post('/geolocation/geocode', {
        address,
        city,
        state,
        country: 'Brasil'
      });

      if (response.data.success) {
        const coords = {
          lat: response.data.lat,
          lon: response.data.lon,
          display_name: response.data.display_name
        };

        enqueueSnackbar('Localização encontrada!', { variant: 'success' });

        if (onSuccess) onSuccess(coords);
        return coords;
      }
    } catch (error) {
      console.error('Erro ao geocodificar:', error);
      const errorMsg = error.response?.data?.error || 'Não foi possível localizar o endereço.';
      enqueueSnackbar(errorMsg, { variant: 'warning' });
      return null;
    } finally {
      setLoading(prev => ({ ...prev, geocode: false }));
    }
  };

  /**
   * Formata CEP para o padrão 00000-000
   */
  const formatCep = (value) => {
    const numbers = value.replace(/\D/g, '');
    if (numbers.length <= 5) return numbers;
    return `${numbers.slice(0, 5)}-${numbers.slice(5, 8)}`;
  };

  /**
   * Formata CNPJ para o padrão 00.000.000/0000-00
   */
  const formatCnpj = (value) => {
    const numbers = value.replace(/\D/g, '');
    if (numbers.length <= 2) return numbers;
    if (numbers.length <= 5) return `${numbers.slice(0, 2)}.${numbers.slice(2)}`;
    if (numbers.length <= 8) return `${numbers.slice(0, 2)}.${numbers.slice(2, 5)}.${numbers.slice(5)}`;
    if (numbers.length <= 12) return `${numbers.slice(0, 2)}.${numbers.slice(2, 5)}.${numbers.slice(5, 8)}/${numbers.slice(8)}`;
    return `${numbers.slice(0, 2)}.${numbers.slice(2, 5)}.${numbers.slice(5, 8)}/${numbers.slice(8, 12)}-${numbers.slice(12, 14)}`;
  };

  return {
    searchByCep,
    searchByCnpj,
    geocodeAddress,
    formatCep,
    formatCnpj,
    loading
  };
};

