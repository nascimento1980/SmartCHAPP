/**
 * Script para recalcular distâncias de visitas existentes
 */

const { Visit, CustomerContact, CompanySetting } = require('../models');
const geoLocationService = require('../services/GeoLocationService');

async function calculateVisitDistances() {
  console.log('🔄 Iniciando recálculo de distâncias...\n');
  
  try {
    // 1. Verificar se endereço da sede está configurado
    const [addressSetting, citySetting, stateSetting, latSetting, lonSetting] = await Promise.all([
      CompanySetting.findOne({ where: { setting_key: 'address' } }),
      CompanySetting.findOne({ where: { setting_key: 'city' } }),
      CompanySetting.findOne({ where: { setting_key: 'state' } }),
      CompanySetting.findOne({ where: { setting_key: 'lat' } }),
      CompanySetting.findOne({ where: { setting_key: 'lon' } })
    ]);

    if (!addressSetting || !citySetting || !stateSetting) {
      console.error('❌ ERRO: Endereço da sede não configurado!');
      console.log('\n📋 Para configurar:');
      console.log('1. Acesse o sistema via browser');
      console.log('2. Vá em Configurações > Empresa');
      console.log('3. Preencha: Endereço, Cidade e Estado');
      console.log('4. Execute este script novamente\n');
      return;
    }

    console.log('✅ Endereço da sede configurado:');
    console.log(`   ${addressSetting.setting_value}`);
    console.log(`   ${citySetting.setting_value}/${stateSetting.setting_value}\n`);

    // 2. Preparar origem (sede)
    const origin = {
      address: addressSetting.setting_value,
      city: citySetting.setting_value,
      state: stateSetting.setting_value,
      country: 'Brasil'
    };

    if (latSetting && lonSetting) {
      origin.lat = parseFloat(latSetting.setting_value);
      origin.lon = parseFloat(lonSetting.setting_value);
      console.log('✅ Coordenadas da sede encontradas no cache\n');
    }

    // 3. Buscar visitas agendadas sem distância calculada
    const visits = await Visit.findAll({
      where: {
        status: 'agendada',
        planned_distance: 0
      },
      include: [
        {
          model: CustomerContact,
          as: 'customerContact',
          required: false
        }
      ]
    });

    console.log(`📊 Encontradas ${visits.length} visitas sem distância calculada\n`);

    if (visits.length === 0) {
      console.log('✅ Todas as visitas já têm distância calculada!');
      return;
    }

    let successCount = 0;
    let failCount = 0;

    // 4. Calcular distância para cada visita
    for (const visit of visits) {
      console.log(`\n🔍 Processando: ${visit.title}`);
      
      try {
        // Preparar destino
        const dest = {
          address: visit.address,
          city: visit.customerContact?.city || citySetting.setting_value,
          state: visit.customerContact?.state || stateSetting.setting_value,
          country: 'Brasil'
        };

        if (!dest.address) {
          console.log(`   ⚠️  Sem endereço - pulando`);
          failCount++;
          continue;
        }

        console.log(`   📍 Destino: ${dest.address}, ${dest.city}/${dest.state}`);

        // Calcular métricas
        const metrics = await geoLocationService.calculateTripMetrics(origin, dest, {
          mode: 'car',
          consumption: 10,
          fuelPrice: 5.50
        });

        // Atualizar visita
        await visit.update({
          planned_distance: metrics.distance,
          planned_fuel: metrics.fuelConsumption,
          planned_cost: metrics.travelCost
        });

        console.log(`   ✅ Distância: ${metrics.distance} km`);
        console.log(`   ⛽ Combustível: ${metrics.fuelConsumption} L`);
        console.log(`   💰 Custo: R$ ${metrics.travelCost}`);
        
        successCount++;

        // Delay para respeitar rate limit da API (1 req/seg)
        await new Promise(resolve => setTimeout(resolve, 1100));

      } catch (error) {
        console.log(`   ❌ Erro: ${error.message}`);
        failCount++;
      }
    }

    console.log('\n\n📈 RESUMO:');
    console.log(`   ✅ Sucesso: ${successCount}`);
    console.log(`   ❌ Falha: ${failCount}`);
    console.log(`   📊 Total: ${visits.length}`);
    console.log('\n✅ Recálculo concluído!\n');

  } catch (error) {
    console.error('\n❌ Erro fatal:', error);
    throw error;
  }
}

// Executar
(async () => {
  try {
    await calculateVisitDistances();
    process.exit(0);
  } catch (error) {
    console.error('❌ Erro:', error);
    process.exit(1);
  }
})();

