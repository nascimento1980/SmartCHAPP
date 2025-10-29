require('dotenv').config();
const { sequelize, RolePermission } = require('../models');

const checkPermissions = async () => {
  try {
    console.log('🔍 Verificando permissões atuais...\n');

    const allPermissions = await RolePermission.findAll();
    
    if (allPermissions.length === 0) {
      console.log('❌ Nenhuma permissão encontrada no banco de dados');
      return;
    }

    for (const rolePerm of allPermissions) {
      console.log(`👤 Role: ${rolePerm.role}`);
      console.log(`📋 Permissões (${rolePerm.permissions.length}):`);
      
      if (rolePerm.permissions && rolePerm.permissions.length > 0) {
        rolePerm.permissions.forEach(perm => {
          console.log(`   - ${perm}`);
        });
      } else {
        console.log('   - Nenhuma permissão definida');
      }
      
      console.log('');
    }

    // Verificar especificamente a permissão de frota
    console.log('🚗 Verificando permissão de frota...');
    const fleetPermissions = allPermissions.filter(rp => 
      rp.permissions && rp.permissions.includes('menu.fleet')
    );
    
    if (fleetPermissions.length > 0) {
      console.log('✅ Permissão de frota encontrada para os seguintes roles:');
      fleetPermissions.forEach(rp => {
        console.log(`   - ${rp.role}`);
      });
    } else {
      console.log('❌ Permissão de frota NÃO encontrada');
    }

  } catch (error) {
    console.error('❌ Erro ao verificar permissões:', error);
  } finally {
    await sequelize.close();
    process.exit(0);
  }
};

// Executar script se chamado diretamente
if (require.main === module) {
  checkPermissions();
}

module.exports = checkPermissions;
