// Serviço de Roteirização para Otimização de Rotas
class RoutingService {
  constructor() {
    this.googleMapsApiKey = null; // Será configurado via settings
    this.baseUrl = 'https://maps.googleapis.com/maps/api';
  }

  // Configurar API key do Google Maps
  setApiKey(apiKey) {
    this.googleMapsApiKey = apiKey;
  }

  // Calcular distância entre dois pontos (fórmula de Haversine)
  calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Raio da Terra em km
    const dLat = this.deg2rad(lat2 - lat1);
    const dLon = this.deg2rad(lon2 - lon1);
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(this.deg2rad(lat1)) * Math.cos(this.deg2rad(lat2)) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    const distance = R * c; // Distância em km
    return distance;
  }

  deg2rad(deg) {
    return deg * (Math.PI/180);
  }

  // Algoritmo do Vizinho Mais Próximo para roteirização
  nearestNeighborAlgorithm(visits, startLocation) {
    if (!visits || visits.length === 0) return [];

    const unvisited = [...visits];
    const route = [];
    let currentLocation = startLocation;
    let totalDistance = 0;
    let totalTime = 0;

    while (unvisited.length > 0) {
      let nearestIndex = 0;
      let minDistance = Infinity;

      // Encontrar a visita mais próxima
      for (let i = 0; i < unvisited.length; i++) {
        const visit = unvisited[i];
        const distance = this.calculateDistance(
          currentLocation.lat,
          currentLocation.lon,
          visit.latitude || 0,
          visit.longitude || 0
        );

        if (distance < minDistance) {
          minDistance = distance;
          nearestIndex = i;
        }
      }

      const nearestVisit = unvisited.splice(nearestIndex, 1)[0];
      route.push({
        ...nearestVisit,
        distanceFromPrevious: minDistance,
        estimatedTime: this.estimateTravelTime(minDistance),
        cumulativeDistance: totalDistance + minDistance,
        cumulativeTime: totalTime + this.estimateTravelTime(minDistance)
      });

      totalDistance += minDistance;
      totalTime += this.estimateTravelTime(minDistance);
      currentLocation = {
        lat: nearestVisit.latitude || 0,
        lon: nearestVisit.longitude || 0
      };
    }

    return {
      route,
      totalDistance: Math.round(totalDistance * 100) / 100,
      totalTime: Math.round(totalTime * 100) / 100,
      estimatedFuel: this.estimateFuelConsumption(totalDistance)
    };
  }

  // Algoritmo genético para otimização mais avançada
  geneticAlgorithm(visits, startLocation, populationSize = 50, generations = 100) {
    if (!visits || visits.length === 0) return [];

    // Gerar população inicial
    let population = this.generateInitialPopulation(visits, populationSize);
    let bestRoute = null;
    let bestFitness = Infinity;

    for (let generation = 0; generation < generations; generation++) {
      // Avaliar fitness de cada rota
      const fitnessScores = population.map(route => ({
        route,
        fitness: this.calculateRouteFitness(route, startLocation)
      }));

      // Encontrar melhor rota
      const bestInGeneration = fitnessScores.reduce((best, current) => 
        current.fitness < best.fitness ? current : best
      );

      if (bestInGeneration.fitness < bestFitness) {
        bestFitness = bestInGeneration.fitness;
        bestRoute = bestInGeneration.route;
      }

      // Seleção, crossover e mutação
      population = this.evolvePopulation(population, fitnessScores);
    }

    // Calcular métricas da melhor rota
    const optimizedRoute = this.calculateRouteMetrics(bestRoute, startLocation);
    return optimizedRoute;
  }

  // Gerar população inicial aleatória
  generateInitialPopulation(visits, size) {
    const population = [];
    for (let i = 0; i < size; i++) {
      const shuffled = [...visits].sort(() => Math.random() - 0.5);
      population.push(shuffled);
    }
    return population;
  }

  // Calcular fitness de uma rota (menor = melhor)
  calculateRouteFitness(route, startLocation) {
    let totalDistance = 0;
    let currentLocation = startLocation;

    for (const visit of route) {
      const distance = this.calculateDistance(
        currentLocation.lat,
        currentLocation.lon,
        visit.latitude || 0,
        visit.longitude || 0
      );
      totalDistance += distance;
      currentLocation = {
        lat: visit.latitude || 0,
        lon: visit.longitude || 0
      };
    }

    return totalDistance;
  }

  // Evoluir população (seleção, crossover, mutação)
  evolvePopulation(population, fitnessScores) {
    const newPopulation = [];
    const eliteSize = Math.floor(population.length * 0.1); // 10% elite

    // Manter elite
    const elite = fitnessScores
      .sort((a, b) => a.fitness - b.fitness)
      .slice(0, eliteSize)
      .map(item => item.route);

    newPopulation.push(...elite);

    // Gerar resto da população
    while (newPopulation.length < population.length) {
      const parent1 = this.tournamentSelection(population, fitnessScores);
      const parent2 = this.tournamentSelection(population, fitnessScores);
      const child = this.crossover(parent1, parent2);
      const mutatedChild = this.mutate(child);
      newPopulation.push(mutatedChild);
    }

    return newPopulation;
  }

  // Seleção por torneio
  tournamentSelection(population, fitnessScores, tournamentSize = 3) {
    const tournament = [];
    for (let i = 0; i < tournamentSize; i++) {
      const randomIndex = Math.floor(Math.random() * population.length);
      tournament.push(fitnessScores[randomIndex]);
    }
    return tournament.reduce((best, current) => 
      current.fitness < best.fitness ? current : best
    ).route;
  }

  // Crossover (cruzamento) entre duas rotas
  crossover(parent1, parent2) {
    const child = new Array(parent1.length);
    const start = Math.floor(Math.random() * parent1.length);
    const end = Math.floor(Math.random() * parent1.length);

    // Copiar segmento do primeiro pai
    for (let i = start; i <= end; i++) {
      child[i] = parent1[i];
    }

    // Preencher resto com elementos do segundo pai
    let parent2Index = 0;
    for (let i = 0; i < child.length; i++) {
      if (!child[i]) {
        while (child.includes(parent2[parent2Index])) {
          parent2Index++;
        }
        child[i] = parent2[parent2Index];
        parent2Index++;
      }
    }

    return child;
  }

  // Mutação aleatória
  mutate(route, mutationRate = 0.1) {
    const mutated = [...route];
    for (let i = 0; i < mutated.length; i++) {
      if (Math.random() < mutationRate) {
        const j = Math.floor(Math.random() * mutated.length);
        [mutated[i], mutated[j]] = [mutated[j], mutated[i]];
      }
    }
    return mutated;
  }

  // Calcular métricas finais da rota
  calculateRouteMetrics(route, startLocation) {
    let totalDistance = 0;
    let totalTime = 0;
    let currentLocation = startLocation;
    const routeWithMetrics = [];

    for (let i = 0; i < route.length; i++) {
      const visit = route[i];
      const distance = this.calculateDistance(
        currentLocation.lat,
        currentLocation.lon,
        visit.latitude || 0,
        visit.longitude || 0
      );

      totalDistance += distance;
      const travelTime = this.estimateTravelTime(distance);
      totalTime += travelTime;

      routeWithMetrics.push({
        ...visit,
        order: i + 1,
        distanceFromPrevious: Math.round(distance * 100) / 100,
        estimatedTime: Math.round(travelTime * 100) / 100,
        cumulativeDistance: Math.round(totalDistance * 100) / 100,
        cumulativeTime: Math.round(totalTime * 100) / 100
      });

      currentLocation = {
        lat: visit.latitude || 0,
        lon: visit.longitude || 0
      };
    }

    return {
      route: routeWithMetrics,
      totalDistance: Math.round(totalDistance * 100) / 100,
      totalTime: Math.round(totalTime * 100) / 100,
      estimatedFuel: this.estimateFuelConsumption(totalDistance),
      savings: this.calculateSavings(routeWithMetrics)
    };
  }

  // Estimar tempo de viagem (considerando trânsito e velocidade média)
  estimateTravelTime(distance) {
    const averageSpeed = 40; // km/h em área urbana
    const trafficFactor = 1.3; // Fator de trânsito
    const timeInHours = (distance * trafficFactor) / averageSpeed;
    return timeInHours;
  }

  // Estimar consumo de combustível
  estimateFuelConsumption(distance) {
    const fuelEfficiency = 8; // km/l (média para veículos comerciais)
    const fuelConsumption = distance / fuelEfficiency;
    return Math.round(fuelConsumption * 100) / 100;
  }

  // Calcular economia estimada
  calculateSavings(route) {
    // Comparar com rota não otimizada (ordem original)
    const originalDistance = route.reduce((sum, visit) => sum + visit.distanceFromPrevious, 0);
    const optimizedDistance = route[route.length - 1]?.cumulativeDistance || 0;
    
    const distanceSaved = originalDistance - optimizedDistance;
    const fuelSaved = this.estimateFuelConsumption(distanceSaved);
    const timeSaved = route.reduce((sum, visit) => sum + visit.estimatedTime, 0) * 0.2; // 20% de economia de tempo

    return {
      distanceSaved: Math.round(distanceSaved * 100) / 100,
      fuelSaved: Math.round(fuelSaved * 100) / 100,
      timeSaved: Math.round(timeSaved * 100) / 100,
      costSaved: Math.round(fuelSaved * 5.5 * 100) / 100 // R$ 5,50 por litro
    };
  }

  // Otimizar rota considerando restrições
  optimizeRouteWithConstraints(visits, startLocation, constraints = {}) {
    const {
      maxVisitsPerDay = 8,
      workingHours = 8,
      lunchBreak = 1,
      vehicleCapacity = 1000,
      priorityVisits = []
    } = constraints;

    // Filtrar visitas por restrições
    let filteredVisits = visits.filter(visit => {
      // Verificar capacidade do veículo
      if (visit.equipment_weight && visit.equipment_weight > vehicleCapacity) {
        return false;
      }
      return true;
    });

    // Priorizar visitas importantes
    if (priorityVisits.length > 0) {
      filteredVisits.sort((a, b) => {
        const aPriority = priorityVisits.includes(a.id) ? 1 : 0;
        const bPriority = priorityVisits.includes(b.id) ? 1 : 0;
        return bPriority - aPriority;
      });
    }

    // Aplicar algoritmo genético para otimização
    const optimizedRoute = this.geneticAlgorithm(filteredVisits, startLocation);
    
    // Dividir em dias se necessário
    const dailyRoutes = this.splitIntoDailyRoutes(optimizedRoute.route, maxVisitsPerDay, workingHours, lunchBreak);
    
    return {
      ...optimizedRoute,
      dailyRoutes,
      constraints: {
        maxVisitsPerDay,
        workingHours,
        lunchBreak,
        vehicleCapacity
      }
    };
  }

  // Dividir rota em dias de trabalho
  splitIntoDailyRoutes(route, maxVisitsPerDay, workingHours, lunchBreak) {
    const dailyRoutes = [];
    const availableTime = workingHours - lunchBreak;
    
    for (let i = 0; i < route.length; i += maxVisitsPerDay) {
      const dayRoute = route.slice(i, i + maxVisitsPerDay);
      const dayNumber = Math.floor(i / maxVisitsPerDay) + 1;
      
      // Calcular tempo total do dia
      const dayTime = dayRoute.reduce((sum, visit) => sum + visit.estimatedTime, 0);
      
      dailyRoutes.push({
        day: dayNumber,
        visits: dayRoute,
        totalTime: Math.round(dayTime * 100) / 100,
        estimatedFinishTime: this.calculateFinishTime(dayTime, workingHours, lunchBreak),
        isFeasible: dayTime <= availableTime
      });
    }
    
    return dailyRoutes;
  }

  // Calcular horário de término estimado
  calculateFinishTime(totalTime, workingHours, lunchBreak) {
    const startTime = 8; // 8:00 AM
    const availableTime = workingHours - lunchBreak;
    const finishTime = startTime + totalTime;
    
    if (finishTime > startTime + availableTime) {
      return startTime + availableTime;
    }
    
    return finishTime;
  }

  // Gerar relatório de roteirização
  generateRoutingReport(optimizedRoute) {
    const { route, totalDistance, totalTime, estimatedFuel, savings, dailyRoutes } = optimizedRoute;
    
    return {
      summary: {
        totalVisits: route.length,
        totalDistance: `${totalDistance} km`,
        totalTime: `${Math.round(totalTime * 60)} min`,
        estimatedFuel: `${estimatedFuel} L`,
        estimatedCost: `R$ ${Math.round(estimatedFuel * 5.5 * 100) / 100}`
      },
      savings: {
        distanceSaved: `${savings.distanceSaved} km`,
        fuelSaved: `${savings.fuelSaved} L`,
        timeSaved: `${Math.round(savings.timeSaved * 60)} min`,
        costSaved: `R$ ${savings.costSaved}`
      },
      dailyBreakdown: dailyRoutes.map(day => ({
        day: `Dia ${day.day}`,
        visits: day.visits.length,
        totalTime: `${Math.round(day.totalTime * 60)} min`,
        estimatedFinish: `${Math.round(day.estimatedFinishTime)}:00`,
        status: day.isFeasible ? '✅ Viável' : '⚠️ Excede horário'
      })),
      recommendations: this.generateRecommendations(optimizedRoute)
    };
  }

  // Gerar recomendações baseadas na rota
  generateRecommendations(optimizedRoute) {
    const recommendations = [];
    
    if (optimizedRoute.savings.distanceSaved > 10) {
      recommendations.push('🎯 Rota otimizada economiza significativamente em distância');
    }
    
    if (optimizedRoute.savings.fuelSaved > 2) {
      recommendations.push('⛽ Economia de combustível considerável');
    }
    
    if (optimizedRoute.savings.timeSaved > 0.5) {
      recommendations.push('⏰ Tempo de viagem reduzido significativamente');
    }
    
    const longRoutes = optimizedRoute.dailyRoutes.filter(day => !day.isFeasible);
    if (longRoutes.length > 0) {
      recommendations.push('⚠️ Alguns dias excedem o horário de trabalho - considere redistribuir visitas');
    }
    
    return recommendations;
  }
}

export default new RoutingService();
