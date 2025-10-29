const { sequelize } = require('../config/database');
const { PlanningInvite, PlanningCollaborator } = require('../models');

async function createCollaborationTables() {
  try {
    console.log('🔧 Iniciando criação das tabelas de colaboração...');

    // Conectar ao banco de dados
    await sequelize.authenticate();
    console.log('✅ Conexão com banco de dados estabelecida');

    // Verificar se as tabelas já existem (SQLite)
    const [inviteTableExists] = await sequelize.query(
      "SELECT name FROM sqlite_master WHERE type='table' AND name='planning_invites'"
    );
    
    const [collaboratorTableExists] = await sequelize.query(
      "SELECT name FROM sqlite_master WHERE type='table' AND name='planning_collaborators'"
    );

    if (inviteTableExists.length > 0 && collaboratorTableExists.length > 0) {
      console.log('⚠️ Tabelas de colaboração já existem, pulando criação...');
      return;
    }

    console.log('📊 Criando tabela planning_invites...');
    
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS planning_invites (
        id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))),2) || '-' || substr('89ab',abs(random()) % 4 + 1, 1) || substr(lower(hex(randomblob(2))),2) || '-' || lower(hex(randomblob(6)))),
        planning_id TEXT NOT NULL REFERENCES visit_planning(id) ON DELETE CASCADE,
        inviter_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        invited_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined', 'cancelled')),
        message TEXT,
        invited_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        responded_at DATETIME,
        response_message TEXT,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(planning_id, invited_user_id)
      );
    `);

    console.log('📊 Criando índices para planning_invites...');
    
    await sequelize.query(`
      CREATE INDEX IF NOT EXISTS idx_planning_invites_planning_id ON planning_invites(planning_id);
      CREATE INDEX IF NOT EXISTS idx_planning_invites_invited_user_id ON planning_invites(invited_user_id);
      CREATE INDEX IF NOT EXISTS idx_planning_invites_inviter_id ON planning_invites(inviter_id);
      CREATE INDEX IF NOT EXISTS idx_planning_invites_status ON planning_invites(status);
    `);

    console.log('📊 Criando tabela planning_collaborators...');
    
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS planning_collaborators (
        id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))),2) || '-' || substr('89ab',abs(random()) % 4 + 1, 1) || substr(lower(hex(randomblob(2))),2) || '-' || lower(hex(randomblob(6)))),
        planning_id TEXT NOT NULL REFERENCES visit_planning(id) ON DELETE CASCADE,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        role TEXT NOT NULL DEFAULT 'collaborator' CHECK (role IN ('owner', 'collaborator', 'viewer')),
        permissions TEXT NOT NULL DEFAULT '{"can_view": true, "can_edit": false, "can_delete": false, "can_invite": false, "can_execute": false}',
        sync_to_calendar INTEGER NOT NULL DEFAULT 1,
        added_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        added_by TEXT NOT NULL REFERENCES users(id),
        last_sync_at DATETIME,
        is_active INTEGER NOT NULL DEFAULT 1,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(planning_id, user_id)
      );
    `);

    console.log('📊 Criando índices para planning_collaborators...');
    
    await sequelize.query(`
      CREATE INDEX IF NOT EXISTS idx_planning_collaborators_planning_id ON planning_collaborators(planning_id);
      CREATE INDEX IF NOT EXISTS idx_planning_collaborators_user_id ON planning_collaborators(user_id);
      CREATE INDEX IF NOT EXISTS idx_planning_collaborators_role ON planning_collaborators(role);
      CREATE INDEX IF NOT EXISTS idx_planning_collaborators_is_active ON planning_collaborators(is_active);
    `);

    console.log('🔍 Verificando criação das tabelas...');
    
    // Verificar se as tabelas foram criadas (SQLite)
    const [finalInviteCheck] = await sequelize.query(
      "SELECT name FROM sqlite_master WHERE type='table' AND name='planning_invites'"
    );
    
    const [finalCollaboratorCheck] = await sequelize.query(
      "SELECT name FROM sqlite_master WHERE type='table' AND name='planning_collaborators'"
    );

    if (finalInviteCheck.length > 0 && finalCollaboratorCheck.length > 0) {
      console.log('✅ Tabelas de colaboração criadas com sucesso!');
      
      // Verificar estrutura das tabelas
      console.log('📝 Estrutura das tabelas:');
      
      const [inviteStructure] = await sequelize.query(
        "PRAGMA table_info(planning_invites)"
      );
      
      const [collaboratorStructure] = await sequelize.query(
        "PRAGMA table_info(planning_collaborators)"
      );

      console.log('📊 Estrutura planning_invites:');
      inviteStructure.forEach(col => {
        console.log(`  - ${col.name}: ${col.type} (${col.notnull === 1 ? 'NOT NULL' : 'NULL'})`);
      });

      console.log('📊 Estrutura planning_collaborators:');
      collaboratorStructure.forEach(col => {
        console.log(`  - ${col.name}: ${col.type} (${col.notnull === 1 ? 'NOT NULL' : 'NULL'})`);
      });

    } else {
      console.log('❌ Erro: Tabelas não foram criadas corretamente');
    }

  } catch (error) {
    console.error('❌ Erro ao criar tabelas de colaboração:', error);
    console.error('❌ Detalhes:', error.message);
  } finally {
    await sequelize.close();
    console.log('🔒 Conexão com banco de dados fechada');
  }
}

// Executar se chamado diretamente
if (require.main === module) {
  createCollaborationTables();
}

module.exports = createCollaborationTables;
