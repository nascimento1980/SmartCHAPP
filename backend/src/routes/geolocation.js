const express = require('express');
const router = express.Router();
const geoLocationService = require('../services/GeoLocationService');
const { CompanySetting } = require('../models');

/**
 * POST /api/geolocation/calculate-distance
 * Calcula a distância entre a sede da empresa e um endereço de destino
 */
router.post('/calculate-distance', async (req, res) => {
  try {
    const { destination, origin: originOverride } = req.body;

    if (!destination || (!destination.address && !(destination.lat && destination.lon))) {
      return res.status(400).json({
        error: 'Dados de destino insuficientes',
        details: 'Informe endereço completo ou coordenadas (lat/lon) do destino'
      });
    }

    // Buscar endereço/coords da sede da empresa (suporta company* e chaves simples)
    const [
      addressSetting,
      citySetting,
      stateSetting,
      zipcodeSetting,
      latSetting,
      lonSetting,
      companyAddressSetting,
      companyCitySetting,
      companyStateSetting,
      companyZipSetting,
      companyLatSetting,
      companyLonSetting
    ] = await Promise.all([
      CompanySetting.findOne({ where: { setting_key: 'address' } }),
      CompanySetting.findOne({ where: { setting_key: 'city' } }),
      CompanySetting.findOne({ where: { setting_key: 'state' } }),
      CompanySetting.findOne({ where: { setting_key: 'zipcode' } }),
      CompanySetting.findOne({ where: { setting_key: 'lat' } }),
      CompanySetting.findOne({ where: { setting_key: 'lon' } }),
      CompanySetting.findOne({ where: { setting_key: 'companyAddress' } }),
      CompanySetting.findOne({ where: { setting_key: 'companyCity' } }),
      CompanySetting.findOne({ where: { setting_key: 'companyState' } }),
      CompanySetting.findOne({ where: { setting_key: 'companyZip' } }),
      CompanySetting.findOne({ where: { setting_key: 'companyLatitude' } }),
      CompanySetting.findOne({ where: { setting_key: 'companyLongitude' } })
    ]);

    // Preparar origem (sede da empresa) com fallback assertivo
    const DEFAULT_ORIGIN = { address: 'Eusébio', city: 'Eusébio', state: 'CE', country: 'Brasil', lat: -3.8925, lon: -38.4550 };
    // Permitir override de origem se fornecido explicitamente
    const origin = originOverride && (originOverride.lat || originOverride.address || (originOverride.city && originOverride.state))
      ? {
          address: originOverride.address,
          city: originOverride.city,
          state: originOverride.state,
          country: originOverride.country || 'Brasil',
          lat: originOverride.lat,
          lon: originOverride.lon
        }
      : {
          address: companyAddressSetting?.setting_value || addressSetting?.setting_value || DEFAULT_ORIGIN.address,
          city: companyCitySetting?.setting_value || citySetting?.setting_value || DEFAULT_ORIGIN.city,
          state: companyStateSetting?.setting_value || stateSetting?.setting_value || DEFAULT_ORIGIN.state,
          country: 'Brasil'
        };

    // Se já tiver coordenadas salvas, usar SEMPRE coordenadas da empresa (nunca SP)
    const latVal = companyLatSetting?.setting_value ?? latSetting?.setting_value;
    const lonVal = companyLonSetting?.setting_value ?? lonSetting?.setting_value;
    if (latVal != null && lonVal != null && latVal !== '' && lonVal !== '') {
      const latNum = parseFloat(latVal);
      const lonNum = parseFloat(lonVal);
      if (!Number.isNaN(latNum) && !Number.isNaN(lonNum)) {
        origin.lat = latNum;
        origin.lon = lonNum;
      }
    }
    if (!origin.lat || !origin.lon) {
      origin.lat = DEFAULT_ORIGIN.lat;
      origin.lon = DEFAULT_ORIGIN.lon;
    }

    // Preparar destino (+ suporte a CEP como fonte de dados)
    let dest = {
      address: destination.address || undefined,
      city: destination.city || undefined,
      state: destination.state || undefined,
      country: destination.country || 'Brasil'
    };

    // Não forçar cidade/estado do cadastro da empresa ao destino.
    // Mantemos apenas o que veio do cliente, CEP (ViaCEP) ou entrada do usuário.

    // Se vier CEP e estiver faltando logradouro/cidade/estado, consultar ViaCEP
    if (destination.cep && (!dest.address || !dest.city || !dest.state)) {
      try {
        const axios = require('axios');
        const cleanCep = String(destination.cep).replace(/\D/g, '');
        if (cleanCep.length === 8) {
          const via = await axios.get(`https://viacep.com.br/ws/${cleanCep}/json/`, { timeout: 5000 });
          if (!via.data?.erro) {
            dest.address = dest.address || via.data?.logradouro || undefined;
            dest.city = dest.city || via.data?.localidade || dest.city;
            dest.state = dest.state || via.data?.uf || dest.state;
          }
        }
      } catch (_) {}
    }

    // Se destino já tiver coordenadas, usar; caso contrário, geocodificar melhor esforço (mesmo sem logradouro)
    if (destination.lat && destination.lon) {
      dest.lat = parseFloat(destination.lat);
      dest.lon = parseFloat(destination.lon);
    } else {
      try {
        const geo = await geoLocationService.geocodeAddress(dest.address || '', dest.city, dest.state, dest.country);
        if (geo && geo.lat && geo.lon) {
          dest.lat = geo.lat;
          dest.lon = geo.lon;
        }
      } catch (_) {}
    }

    // Calcular métricas
    const metrics = await geoLocationService.calculateTripMetrics(origin, dest, {
      mode: 'car',
      consumption: req.body.consumption || 10, // km/l
      fuelPrice: req.body.fuelPrice || 5.50 // R$/litro
    });

    // Salvar coordenadas da sede se não existirem
    if (!latSetting && metrics.origin.lat) {
      await CompanySetting.create({
        setting_key: 'lat',
        setting_value: metrics.origin.lat.toString()
      });
    }
    if (!lonSetting && metrics.origin.lon) {
      await CompanySetting.create({
        setting_key: 'lon',
        setting_value: metrics.origin.lon.toString()
      });
    }

    res.json({
      success: true,
      ...metrics
    });

  } catch (error) {
    console.error('Erro ao calcular distância:', error);
    // Responder de forma não fatal para não quebrar o frontend
    res.json({
      success: false,
      error: 'Erro ao calcular distância',
      details: error.message,
      distance: 0,
      travelTime: 0,
      fuelConsumption: 0,
      travelCost: 0
    });
  }
});

/**
 * POST /api/geolocation/geocode
 * Geocodifica um endereço para obter coordenadas
 */
router.post('/geocode', async (req, res) => {
  try {
    const { address, city, state, country, cep, cnpj } = req.body || {};

    // Suporte a CEP: buscar dados no ViaCEP quando fornecido
    let useAddress = address;
    let useCity = city;
    let useState = state;
    if (cep && (!useCity || !useState || !useAddress)) {
      try {
        const axios = require('axios');
        const cleanCep = String(cep).replace(/\D/g, '');
        if (cleanCep.length === 8) {
          const via = await axios.get(`https://viacep.com.br/ws/${cleanCep}/json/`, { timeout: 5000 });
          if (!via.data?.erro) {
            useAddress = useAddress || via.data?.logradouro || '';
            useCity = useCity || via.data?.localidade || '';
            useState = useState || via.data?.uf || '';
          }
        }
      } catch (_) {}
    }

    // Fallback para cidade/estado usando configurações da empresa, quando ausentes
    if (!useCity || !useState) {
      try {
        const [citySetting, stateSetting] = await Promise.all([
          CompanySetting.findOne({ where: { setting_key: 'city' } }),
          CompanySetting.findOne({ where: { setting_key: 'state' } })
        ]);
        if (!useCity) useCity = citySetting?.setting_value;
        if (!useState) useState = stateSetting?.setting_value;
      } catch (_) {}
    }

    // Se ainda não houver endereço, tentaremos geocodificar por cidade/estado (o serviço já tem fallback)

    const result = await geoLocationService.geocodeAddress(
      useAddress,
      useCity,
      useState,
      country || 'Brasil'
    );

    if (!result) {
      return res.status(404).json({
        error: 'Endereço não encontrado',
        details: 'Não foi possível geocodificar o endereço fornecido'
      });
    }

    res.json({
      success: true,
      ...result
    });

  } catch (error) {
    console.error('Erro ao geocodificar:', error);
    res.status(500).json({
      error: 'Erro ao geocodificar endereço',
      details: error.message
    });
  }
});

module.exports = router;

