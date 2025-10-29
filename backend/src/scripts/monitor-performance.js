// Script de monitoramento de performance do sistema
const axios = require('axios');
const { performance } = require('perf_hooks');

class PerformanceMonitor {
  constructor(baseUrl = 'http://localhost:3001/api') {
    this.baseUrl = baseUrl;
    this.results = [];
  }

  // Medir tempo de resposta de uma requisição
  async measureEndpoint(endpoint, options = {}) {
    const url = `${this.baseUrl}${endpoint}`;
    const startTime = performance.now();
    
    try {
      const response = await axios.get(url, {
        timeout: 10000,
        headers: {
          'Authorization': options.token ? `Bearer ${options.token}` : undefined,
          ...options.headers
        },
        ...options
      });
      
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      const result = {
        endpoint,
        duration: Math.round(duration),
        status: response.status,
        dataSize: JSON.stringify(response.data).length,
        success: true,
        timestamp: new Date().toISOString()
      };
      
      this.results.push(result);
      return result;
      
    } catch (error) {
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      const result = {
        endpoint,
        duration: Math.round(duration),
        status: error.response?.status || 0,
        error: error.message,
        success: false,
        timestamp: new Date().toISOString()
      };
      
      this.results.push(result);
      return result;
    }
  }

  // Executar múltiplas medições
  async measureMultiple(endpoint, count = 5, options = {}) {
    console.log(`🔍 Medindo performance de ${endpoint} (${count} execuções)...`);
    
    const measurements = [];
    
    for (let i = 0; i < count; i++) {
      const result = await this.measureEndpoint(endpoint, options);
      measurements.push(result);
      
      // Pequena pausa entre requisições
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    return this.calculateStats(measurements);
  }

  // Calcular estatísticas de performance
  calculateStats(measurements) {
    const successfulMeasurements = measurements.filter(m => m.success);
    
    if (successfulMeasurements.length === 0) {
      return {
        success: false,
        errorRate: 100,
        measurements
      };
    }
    
    const durations = successfulMeasurements.map(m => m.duration);
    const dataSizes = successfulMeasurements.map(m => m.dataSize || 0);
    
    return {
      success: true,
      count: measurements.length,
      successCount: successfulMeasurements.length,
      errorRate: ((measurements.length - successfulMeasurements.length) / measurements.length) * 100,
      duration: {
        min: Math.min(...durations),
        max: Math.max(...durations),
        avg: Math.round(durations.reduce((a, b) => a + b, 0) / durations.length),
        median: this.calculateMedian(durations)
      },
      dataSize: {
        min: Math.min(...dataSizes),
        max: Math.max(...dataSizes),
        avg: Math.round(dataSizes.reduce((a, b) => a + b, 0) / dataSizes.length)
      },
      measurements
    };
  }

  calculateMedian(arr) {
    const sorted = [...arr].sort((a, b) => a - b);
    const middle = Math.floor(sorted.length / 2);
    
    if (sorted.length % 2 === 0) {
      return Math.round((sorted[middle - 1] + sorted[middle]) / 2);
    }
    
    return sorted[middle];
  }

  // Gerar relatório de performance
  generateReport() {
    const endpointStats = {};
    
    // Agrupar por endpoint
    this.results.forEach(result => {
      if (!endpointStats[result.endpoint]) {
        endpointStats[result.endpoint] = [];
      }
      endpointStats[result.endpoint].push(result);
    });

    console.log('\n📊 RELATÓRIO DE PERFORMANCE');
    console.log('================================');
    
    Object.entries(endpointStats).forEach(([endpoint, measurements]) => {
      const stats = this.calculateStats(measurements);
      
      console.log(`\n🔗 ${endpoint}`);
      console.log(`   ✅ Sucesso: ${stats.successCount}/${stats.count} (${(100 - stats.errorRate).toFixed(1)}%)`);
      
      if (stats.success) {
        console.log(`   ⏱️  Tempo: ${stats.duration.min}ms - ${stats.duration.max}ms (média: ${stats.duration.avg}ms)`);
        console.log(`   📦 Dados: ${this.formatBytes(stats.dataSize.avg)} (média)`);
        
        // Avaliação da performance
        if (stats.duration.avg < 200) {
          console.log(`   🚀 Performance: EXCELENTE`);
        } else if (stats.duration.avg < 500) {
          console.log(`   ✅ Performance: BOA`);
        } else if (stats.duration.avg < 1000) {
          console.log(`   ⚠️  Performance: REGULAR`);
        } else {
          console.log(`   ❌ Performance: RUIM`);
        }
      } else {
        console.log(`   ❌ Todos os testes falharam`);
      }
    });

    return endpointStats;
  }

  formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
}

// Função principal de teste
async function runPerformanceTests() {
  const monitor = new PerformanceMonitor();
  
  console.log('🚀 INICIANDO TESTES DE PERFORMANCE');
  console.log('==================================');
  console.log('');

  // Endpoints para testar
  const endpoints = [
    '/visits',
    '/visits?page=1&limit=10',
    '/visit-planning',
    '/visit-planning/calendar',
    '/visit-planning/history'
  ];

  try {
    // Testar cada endpoint
    for (const endpoint of endpoints) {
      await monitor.measureMultiple(endpoint, 3);
      await new Promise(resolve => setTimeout(resolve, 500)); // Pausa entre testes
    }

    // Gerar relatório
    monitor.generateReport();

    console.log('\n💡 INTERPRETAÇÃO DOS RESULTADOS:');
    console.log('=================================');
    console.log('🚀 EXCELENTE (< 200ms): Sistema muito rápido');
    console.log('✅ BOA (200-500ms): Performance aceitável');
    console.log('⚠️  REGULAR (500-1000ms): Precisa de otimização');
    console.log('❌ RUIM (> 1000ms): Requer ação imediata');
    console.log('');

  } catch (error) {
    console.error('❌ Erro durante os testes:', error.message);
  }
}

// Executar se chamado diretamente
if (require.main === module) {
  runPerformanceTests()
    .then(() => {
      console.log('🏁 Testes de performance concluídos');
    })
    .catch(error => {
      console.error('💥 Falha nos testes:', error.message);
      process.exit(1);
    });
}

module.exports = {
  PerformanceMonitor,
  runPerformanceTests
};


