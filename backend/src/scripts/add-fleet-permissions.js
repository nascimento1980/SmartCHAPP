const { RolePermission } = require('../models');
const { sequelize } = require('../config/database');

async function addFleetPermissions() {
  try {
    console.log('🚀 Iniciando adição de permissões de fleet...');
    
    await sequelize.authenticate();
    console.log('✅ Conectado ao banco de dados');
    
    // Buscar permissão atual do admin
    const adminPerm = await RolePermission.findOne({
      where: { role: 'admin' }
    });
    
    if (!adminPerm) {
      console.log('❌ Permissão do admin não encontrada');
      return;
    }
    
    const currentPerms = adminPerm.permissions;
    console.log(`📋 Permissões atuais: ${currentPerms.length} items`);
    
    // Adicionar permissões faltantes
    const newPerms = [
      'menu.fleet',
      'menu.fleet.vehicles',
      'menu.fleet.maintenance', 
      'menu.fleet.fuel',
      'fleet.view',
      'fleet.create',
      'fleet.edit',
      'fleet.delete'
    ];
    
    // Verificar quais estão faltando
    const missingPerms = newPerms.filter(p => !currentPerms.includes(p));
    console.log(`🔍 Permissões faltantes (${missingPerms.length}):`, missingPerms);
    
    if (missingPerms.length > 0) {
      const updatedPerms = [...currentPerms, ...missingPerms];
      
      await adminPerm.update({ 
        permissions: updatedPerms,
        updated_at: new Date()
      });
      
      console.log('✅ Permissões atualizadas com sucesso!');
      console.log(`📊 Total de permissões agora: ${updatedPerms.length}`);
      console.log('🆕 Novas permissões adicionadas:', missingPerms);
    } else {
      console.log('✅ Todas as permissões de fleet já existem');
    }
    
    // Verificar resultado final
    const updated = await RolePermission.findOne({
      where: { role: 'admin' }
    });
    
    const hasFleetMenu = updated.permissions.includes('menu.fleet');
    console.log(`🎯 menu.fleet presente: ${hasFleetMenu ? '✅' : '❌'}`);
    
  } catch (error) {
    console.error('❌ Erro ao adicionar permissões:', error);
    console.error(error.stack);
  } finally {
    await sequelize.close();
    console.log('🔚 Conexão fechada');
  }
}

// Executar se for chamado diretamente
if (require.main === module) {
  addFleetPermissions();
}

module.exports = addFleetPermissions;