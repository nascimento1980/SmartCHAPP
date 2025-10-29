const { sequelize } = require('../config/database');

async function addCoordinatesToVisits() {
  try {
    console.log('🔄 Adicionando coordenadas às visitas...');
    
    // Coordenadas de exemplo em São Paulo
    const sampleCoordinates = [
      { lat: -23.5505, lon: -46.6333 }, // Centro
      { lat: -23.5631, lon: -46.6544 }, // Vila Madalena
      { lat: -23.5882, lon: -46.6324 }, // Pinheiros
      { lat: -23.5489, lon: -46.6388 }, // Bela Vista
      { lat: -23.5577, lon: -46.6606 }, // Perdizes
      { lat: -23.5955, lon: -46.6734 }, // Vila Leopoldina
      { lat: -23.5671, lon: -46.6967 }, // Lapa
      { lat: -23.5421, lon: -46.6568 }, // Consolação
      { lat: -23.5789, lon: -46.6401 }, // Jardins
      { lat: -23.6014, lon: -46.6521 }  // Vila Pompéia
    ];

    // Adicionar colunas de coordenadas se não existirem
    try {
      await sequelize.query("ALTER TABLE visits ADD COLUMN latitude DECIMAL(10,8);");
      console.log('✅ Coluna latitude adicionada');
    } catch (error) {
      if (error.message.includes('duplicate column name')) {
        console.log('ℹ️ Coluna latitude já existe');
      } else {
        console.log('⚠️ Erro ao adicionar latitude:', error.message);
      }
    }

    try {
      await sequelize.query("ALTER TABLE visits ADD COLUMN longitude DECIMAL(11,8);");
      console.log('✅ Coluna longitude adicionada');
    } catch (error) {
      if (error.message.includes('duplicate column name')) {
        console.log('ℹ️ Coluna longitude já existe');
      } else {
        console.log('⚠️ Erro ao adicionar longitude:', error.message);
      }
    }

    // Buscar visitas existentes
    const visits = await sequelize.query("SELECT id FROM visits", { type: sequelize.QueryTypes.SELECT });
    
    if (visits.length === 0) {
      console.log('ℹ️ Nenhuma visita encontrada para atualizar');
      return;
    }

    console.log(`📍 Atualizando ${visits.length} visitas com coordenadas...`);

    // Atualizar cada visita com coordenadas aleatórias
    for (let i = 0; i < visits.length; i++) {
      const coords = sampleCoordinates[i % sampleCoordinates.length];
      await sequelize.query(
        "UPDATE visits SET latitude = ?, longitude = ? WHERE id = ?",
        {
          replacements: [coords.lat, coords.lon, visits[i].id],
          type: sequelize.QueryTypes.UPDATE
        }
      );
    }

    console.log('✅ Coordenadas adicionadas com sucesso!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Erro ao adicionar coordenadas:', error);
    process.exit(1);
  }
}

addCoordinatesToVisits();
