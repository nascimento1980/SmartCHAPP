/**
 * Serviço de Geolocalização e Cálculo de Distâncias
 * 
 * Fornece funcionalidades para:
 * - Geocodificação de endereços (obter lat/lon)
 * - Cálculo de distância entre dois pontos
 * - Estimativa de tempo de viagem
 */

const axios = require('axios');

class GeoLocationService {
  constructor() {
    // Pode usar Google Maps API, OpenStreetMap Nominatim, ou outra API
    this.nominatimBaseUrl = 'https://nominatim.openstreetmap.org';
    this.googleApiKey = process.env.GOOGLE_MAPS_API_KEY || null;
  }

  /**
   * Calcula a distância entre dois pontos usando a fórmula de Haversine
   * @param {number} lat1 - Latitude do ponto 1
   * @param {number} lon1 - Longitude do ponto 1
   * @param {number} lat2 - Latitude do ponto 2
   * @param {number} lon2 - Longitude do ponto 2
   * @returns {number} Distância em quilômetros
   */
  calculateDistance(lat1, lon1, lat2, lon2) {
    // Validar entradas
    if (!lat1 || !lon1 || !lat2 || !lon2) {
      console.warn('⚠️ Coordenadas inválidas para cálculo de distância');
      return 0;
    }

    const R = 6371; // Raio da Terra em km
    const dLat = this.toRadians(lat2 - lat1);
    const dLon = this.toRadians(lon2 - lon1);
    
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRadians(lat1)) * Math.cos(this.toRadians(lat2)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c;

    return Math.round(distance * 100) / 100; // Arredondar para 2 casas decimais
  }

  /**
   * Converte graus para radianos
   */
  toRadians(degrees) {
    return degrees * (Math.PI / 180);
  }

  /**
   * Geocodifica um endereço completo para obter coordenadas
   * @param {string} address - Endereço completo
   * @param {string} city - Cidade
   * @param {string} state - Estado
   * @param {string} country - País (padrão: Brasil)
   * @returns {Object} { lat, lon } ou null se não encontrado
   */
  async geocodeAddress(address, city, state, country = 'Brasil') {
    try {
      // Construir query de busca
      const query = [address, city, state, country].filter(Boolean).join(', ');
      
      console.log('🌍 Geocodificando endereço:', query);

      const response = await axios.get(`${this.nominatimBaseUrl}/search`, {
        params: {
          q: query,
          format: 'json',
          limit: 1,
          addressdetails: 1
        },
        headers: {
          'User-Agent': 'CH-SMART-CRM/1.0' // Nominatim requer User-Agent
        },
        timeout: 10000
      });

      if (response.data && response.data.length > 0) {
        const result = response.data[0];
        const lat = parseFloat(result.lat);
        const lon = parseFloat(result.lon);

        console.log('✅ Geocodificação bem-sucedida:', {
          address: query,
          lat,
          lon,
          display_name: result.display_name
        });

        return { lat, lon, display_name: result.display_name };
      }

      console.warn('⚠️ Endereço não encontrado:', query);
      // Fallback 1: tentar geocodificar apenas cidade/estado/país
      if (city && state) {
        const q2 = `${city}, ${state}, ${country}`;
        console.log('🌍 Fallback geocode (cidade/estado):', q2);
        const r2 = await axios.get(`${this.nominatimBaseUrl}/search`, {
          params: { q: q2, format: 'json', limit: 1, addressdetails: 1 },
          headers: { 'User-Agent': 'CH-SMART-CRM/1.0' },
          timeout: 10000
        });
        if (r2.data && r2.data.length > 0) {
          const result = r2.data[0];
          return { lat: parseFloat(result.lat), lon: parseFloat(result.lon), display_name: result.display_name };
        }
      }
      // Fallback 2: tentar apenas estado/país
      if (state) {
        const q3 = `${state}, ${country}`;
        console.log('🌍 Fallback geocode (estado):', q3);
        const r3 = await axios.get(`${this.nominatimBaseUrl}/search`, {
          params: { q: q3, format: 'json', limit: 1, addressdetails: 1 },
          headers: { 'User-Agent': 'CH-SMART-CRM/1.0' },
          timeout: 10000
        });
        if (r3.data && r3.data.length > 0) {
          const result = r3.data[0];
          return { lat: parseFloat(result.lat), lon: parseFloat(result.lon), display_name: result.display_name };
        }
      }
      return null;

    } catch (error) {
      console.error('❌ Erro ao geocodificar endereço:', error.message);
      return null;
    }
  }

  /**
   * Estima o tempo de viagem baseado na distância
   * @param {number} distanceKm - Distância em km
   * @param {string} mode - Modo de transporte ('car', 'walk', 'bike')
   * @returns {number} Tempo estimado em minutos
   */
  estimateTravelTime(distanceKm, mode = 'car') {
    if (!distanceKm || distanceKm <= 0) return 0;

    // Velocidades médias (km/h)
    const speeds = {
      car: 40,   // Média urbana
      walk: 5,   // Caminhada
      bike: 15   // Bicicleta
    };

    const speed = speeds[mode] || speeds.car;
    const timeHours = distanceKm / speed;
    const timeMinutes = Math.round(timeHours * 60);

    return timeMinutes;
  }

  /**
   * Estima o consumo de combustível
   * @param {number} distanceKm - Distância em km
   * @param {number} consumption - Consumo médio (km/l)
   * @returns {number} Litros estimados
   */
  estimateFuelConsumption(distanceKm, consumption = 10) {
    if (!distanceKm || distanceKm <= 0) return 0;
    
    const liters = distanceKm / consumption;
    return Math.round(liters * 100) / 100; // 2 casas decimais
  }

  /**
   * Estima o custo da viagem
   * @param {number} distanceKm - Distância em km
   * @param {number} fuelPrice - Preço do combustível por litro
   * @param {number} consumption - Consumo médio (km/l)
   * @returns {number} Custo estimado em R$
   */
  estimateTravelCost(distanceKm, fuelPrice = 5.50, consumption = 10) {
    const fuelLiters = this.estimateFuelConsumption(distanceKm, consumption);
    const cost = fuelLiters * fuelPrice;
    
    return Math.round(cost * 100) / 100; // 2 casas decimais
  }

  /**
   * Distância por rota (Google Directions), com fallback para Haversine
   * @param {{lat:number,lon:number}} origin
   * @param {{lat:number,lon:number}} destination
   * @returns {Promise<number>} distância em km
   */
  async getRouteDistanceKm(origin, destination) {
    try {
      if (this.googleApiKey && origin?.lat && origin?.lon && destination?.lat && destination?.lon) {
        const url = 'https://maps.googleapis.com/maps/api/directions/json';
        const params = {
          origin: `${origin.lat},${origin.lon}`,
          destination: `${destination.lat},${destination.lon}`,
          mode: 'driving',
          key: this.googleApiKey
        };
        const resp = await axios.get(url, { params, timeout: 10000 });
        const route = resp.data?.routes?.[0];
        const leg = route?.legs?.[0];
        const meters = leg?.distance?.value;
        if (typeof meters === 'number' && meters > 0) {
          return Math.round((meters / 1000) * 100) / 100;
        }
      }
    } catch (err) {
      console.warn('⚠️ Falha Google Directions, usando Haversine:', err?.message);
    }
    // Fallback para Haversine
    return this.calculateDistance(origin?.lat, origin?.lon, destination?.lat, destination?.lon);
  }

  /**
   * Calcula todas as métricas de viagem de uma vez
   * @param {Object} origin - { lat, lon } ou endereço completo
   * @param {Object} destination - { lat, lon } ou endereço completo
   * @param {Object} options - Opções de cálculo
   * @returns {Object} Métricas completas
   */
  async calculateTripMetrics(origin, destination, options = {}) {
    try {
      let originCoords = origin;
      let destCoords = destination;

      // Geocodificar se necessário
      if (!origin.lat || !origin.lon) {
        originCoords = await this.geocodeAddress(
          origin.address,
          origin.city,
          origin.state,
          origin.country
        );
        if (!originCoords) {
          throw new Error('Não foi possível geocodificar o endereço de origem');
        }
      }

      if (!destination.lat || !destination.lon) {
        destCoords = await this.geocodeAddress(
          destination.address,
          destination.city,
          destination.state,
          destination.country
        );
        if (!destCoords) {
          throw new Error('Não foi possível geocodificar o endereço de destino');
        }
      }

      // Calcular distância por rota quando possível (fallback para Haversine)
      const distance = await this.getRouteDistanceKm(
        { lat: originCoords.lat, lon: originCoords.lon },
        { lat: destCoords.lat, lon: destCoords.lon }
      );

      // Calcular métricas adicionais
      const travelTime = this.estimateTravelTime(distance, options.mode);
      const fuelConsumption = this.estimateFuelConsumption(distance, options.consumption);
      const travelCost = this.estimateTravelCost(distance, options.fuelPrice, options.consumption);

      return {
        distance,
        travelTime,
        fuelConsumption,
        travelCost,
        origin: originCoords,
        destination: destCoords
      };

    } catch (error) {
      console.error('❌ Erro ao calcular métricas de viagem:', error);
      throw error;
    }
  }
}

module.exports = new GeoLocationService();

