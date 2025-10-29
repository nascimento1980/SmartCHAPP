const { sequelize, User } = require('../models');
const bcrypt = require('bcryptjs');

async function fixMasterUser() {
  try {
    console.log('🔄 Corrigindo usuário master...');

    // Buscar o usuário master
    const masterUser = await User.findOne({
      where: { email: 'admin@chealth.com.br' }
    });

    if (!masterUser) {
      console.log('❌ Usuário master não encontrado. Criando novo usuário...');
      
      // Criar hash da senha
      const hashedPassword = await bcrypt.hash('123456', 10);
      
      // Criar usuário master
      const newMasterUser = await User.create({
        username: 'admin',
        name: 'Administrador Master',
        email: 'admin@chealth.com.br',
        password: hashedPassword,
        role: 'master',
        department: 'TI',
        is_active: true,
        must_change_password: false
      });
      
      console.log('✅ Usuário master criado com sucesso!');
      console.log(`📊 ID: ${newMasterUser.id}`);
      console.log(`👤 Nome: ${newMasterUser.name}`);
      console.log(`📧 Email: ${newMasterUser.email}`);
      console.log(`🔑 Username: ${newMasterUser.username}`);
      console.log(`🔑 Role: ${newMasterUser.role}`);
      
    } else {
      console.log('✅ Usuário master encontrado, corrigindo dados...');
      
      // Corrigir username e senha
      const hashedPassword = await bcrypt.hash('123456', 10);
      
      await masterUser.update({
        username: 'admin',
        password: hashedPassword,
        role: 'master',
        department: 'TI',
        is_active: true,
        must_change_password: false
      });
      
      console.log('✅ Usuário master corrigido com sucesso!');
      console.log(`📊 ID: ${masterUser.id}`);
      console.log(`👤 Nome: ${masterUser.name}`);
      console.log(`📧 Email: ${masterUser.email}`);
      console.log(`🔑 Username: ${masterUser.username}`);
      console.log(`🔑 Role: ${masterUser.role}`);
    }

    // Verificar se o usuário pode fazer login
    console.log('\n🧪 Testando login do usuário master...');
    
    const testUser = await User.findOne({
      where: { email: 'admin@chealth.com.br' }
    });
    
    if (testUser) {
      const isPasswordValid = await testUser.checkPassword('123456');
      console.log(`✅ Senha válida: ${isPasswordValid}`);
      
      if (isPasswordValid) {
        console.log('🎉 Usuário master configurado corretamente!');
        console.log('\n🔑 Credenciais de acesso:');
        console.log('  Username/Email: admin@chealth.com.br');
        console.log('  Senha: 123456');
        console.log('  Role: master');
      } else {
        console.log('❌ Problema com a senha do usuário');
      }
    }

    // Listar todos os usuários master
    const allMasterUsers = await User.findAll({
      where: { role: 'master' }
    });

    console.log(`\n📊 Total de usuários master: ${allMasterUsers.length}`);
    allMasterUsers.forEach(user => {
      console.log(`  - ${user.name} (${user.email}) - ${user.username} - ${user.role}`);
    });

    console.log('\n🎉 Processo concluído com sucesso!');
    console.log('\n🔗 URLs para teste:');
    console.log('- Frontend: http://localhost:3000');
    console.log('- API Login: http://localhost:3001/api/auth/login');

  } catch (error) {
    console.error('❌ Erro ao corrigir usuário master:', error);
  } finally {
    await sequelize.close();
  }
}

// Executar se chamado diretamente
if (require.main === module) {
  fixMasterUser();
}

module.exports = fixMasterUser;