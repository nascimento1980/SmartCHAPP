const { sequelize, User } = require('../models');
const jwt = require('jsonwebtoken');

async function testMasterPermissionsAPI() {
  try {
    console.log('🧪 Testando API de permissões para usuário master...');

    // Buscar usuário master
    const masterUser = await User.findOne({ where: { email: 'admin@chealth.com.br' } });
    
    if (!masterUser) {
      console.log('❌ Usuário master não encontrado');
      return;
    }

    console.log('✅ Usuário master encontrado:', masterUser.email);

    // Gerar token JWT
    const token = jwt.sign(
      { userId: masterUser.id, role: masterUser.role },
      'ch-smart-jwt-secret-2024-clean-health',
      { expiresIn: '24h' }
    );

    console.log('🔑 Token JWT gerado:', token.substring(0, 50) + '...');

    // Testar rota de permissões
    console.log('\n🌐 Testando rota /permissions/me...');
    
    // Simular requisição HTTP
    const axios = require('axios');
    
    try {
      const response = await axios.get('http://localhost:3001/api/permissions/me', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      console.log('✅ API de permissões funcionando:');
      console.log('  Status:', response.status);
      console.log('  Role:', response.data.role);
      console.log('  Total Permissions:', response.data.permissions.length);
      
      // Verificar permissões específicas
      const permissions = response.data.permissions;
      const menuPermissions = permissions.filter(p => p.startsWith('menu.'));
      
      console.log('\n🎯 Permissões de Menu encontradas:', menuPermissions.length);
      menuPermissions.forEach(perm => console.log('  -', perm));
      
      // Verificar se todas as permissões de menu estão presentes
      const requiredMenuPerms = [
        'menu.dashboard', 'menu.crm', 'menu.products', 'menu.proposals',
        'menu.visits', 'menu.forms', 'menu.analytics', 'menu.pipeline',
        'menu.people', 'menu.settings', 'menu.fleet', 'menu.sales'
      ];
      
      console.log('\n🔍 Verificação de permissões obrigatórias:');
      requiredMenuPerms.forEach(perm => {
        const has = permissions.includes(perm);
        console.log(`  ${perm}: ${has ? '✅' : '❌'}`);
      });

    } catch (error) {
      console.log('❌ Erro ao testar API de permissões:');
      if (error.response) {
        console.log('  Status:', error.response.status);
        console.log('  Data:', error.response.data);
      } else {
        console.log('  Error:', error.message);
      }
    }

    // Testar rota de autenticação
    console.log('\n🔐 Testando rota /auth/me...');
    
    try {
      const authResponse = await axios.get('http://localhost:3001/api/auth/me', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      console.log('✅ API de autenticação funcionando:');
      console.log('  Status:', authResponse.status);
      console.log('  User ID:', authResponse.data.user.id);
      console.log('  User Role:', authResponse.data.user.role);
      console.log('  User Email:', authResponse.data.user.email);

    } catch (error) {
      console.log('❌ Erro ao testar API de autenticação:');
      if (error.response) {
        console.log('  Status:', error.response.status);
        console.log('  Data:', error.response.data);
      } else {
        console.log('  Error:', error.message);
      }
    }

    console.log('\n🎉 Teste da API concluído!');

  } catch (error) {
    console.error('❌ Erro ao testar API:', error);
  } finally {
    await sequelize.close();
  }
}

// Executar se chamado diretamente
if (require.main === module) {
  testMasterPermissionsAPI();
}

module.exports = testMasterPermissionsAPI;