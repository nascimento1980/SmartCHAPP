const { sequelize } = require('../config/database');

async function unifyClientsLeadsFixed() {
  try {
    console.log('🚀 Iniciando unificação das tabelas clients e leads...');
    
    // 1. Verificar se a tabela já existe e removê-la se necessário
    console.log('🧹 Limpando tabela existente se houver...');
    await sequelize.query('DROP TABLE IF EXISTS customer_contacts');
    
    // 2. Criar a nova tabela unificada 'customer_contacts' com constraints mais flexíveis
    console.log('📋 Criando tabela unificada customer_contacts...');
    await sequelize.query(`
      CREATE TABLE customer_contacts (
        id UUID PRIMARY KEY DEFAULT (lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))),2) || '-' || substr('89ab',abs(random()) % 4 + 1, 1) || substr(lower(hex(randomblob(2))),2) || '-' || lower(hex(randomblob(6)))),
        
        -- Campos comuns
        company_name VARCHAR(200) NOT NULL,
        contact_name VARCHAR(100) NOT NULL,
        email VARCHAR(255),
        phone VARCHAR(20),
        mobile VARCHAR(20),
        position VARCHAR(100),
        address TEXT,
        city VARCHAR(100),
        state VARCHAR(2),
        zipcode VARCHAR(10),
        website VARCHAR(255),
        employees_count INTEGER DEFAULT 0,
        segment VARCHAR(100) NOT NULL,
        status TEXT DEFAULT 'ativo',
        responsible_id UUID,
        custom_fields JSON DEFAULT '{}',
        tags JSON DEFAULT '[]',
        notes TEXT,
        
        -- Campo para diferenciar tipo
        type TEXT NOT NULL CHECK (type IN ('lead', 'client')),
        
        -- Campos específicos de leads
        source VARCHAR(100), -- origem do lead
        priority TEXT DEFAULT 'media', -- removida constraint para aceitar valores existentes
        score INTEGER DEFAULT 0,
        estimated_revenue DECIMAL(12,2) DEFAULT 0,
        next_contact_date DATETIME,
        
        -- Campos específicos de clientes
        cnpj VARCHAR(20),
        cpf VARCHAR(15),
        monthly_revenue DECIMAL(12,2) DEFAULT 0,
        credit_limit DECIMAL(12,2) DEFAULT 0,
        payment_terms VARCHAR(50) DEFAULT '30 dias',
        discount_percentage DECIMAL(5,2) DEFAULT 0,
        next_visit_date DATETIME,
        last_visit_date DATETIME,
        
        -- Datas de conversão e controle
        conversion_date DATETIME, -- quando lead virou client
        original_id UUID, -- referência ao ID original da tabela de origem
        
        -- Campos de auditoria
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);
    
    // 3. Migrar dados da tabela clients
    console.log('📊 Migrando dados da tabela clients...');
    await sequelize.query(`
      INSERT INTO customer_contacts (
        company_name, contact_name, email, phone, mobile, position,
        address, city, state, zipcode, website, employees_count,
        segment, status, responsible_id, custom_fields, tags, notes,
        type, cnpj, cpf, monthly_revenue, credit_limit, payment_terms,
        discount_percentage, next_visit_date, last_visit_date,
        conversion_date, original_id, created_at, updated_at
      )
      SELECT 
        company_name, contact_name, email, phone, mobile, position,
        address, city, state, zipcode, website, employees_count,
        segment, status, responsible_id, custom_fields, tags, notes,
        'client' as type, cnpj, cpf, monthly_revenue, credit_limit, payment_terms,
        discount_percentage, next_visit_date, last_visit_date,
        conversion_date, id as original_id, created_at, updated_at
      FROM clients;
    `);
    
    // 4. Migrar dados da tabela leads com normalização de prioridade
    console.log('📊 Migrando dados da tabela leads...');
    await sequelize.query(`
      INSERT INTO customer_contacts (
        company_name, contact_name, email, phone, mobile, position,
        address, city, state, zipcode, website, employees_count,
        segment, status, responsible_id, custom_fields, tags,
        type, source, priority, score, estimated_revenue, next_contact_date,
        conversion_date, original_id, created_at, updated_at
      )
      SELECT 
        company_name, contact_name, email, phone, mobile, position,
        address, city, state, zipcode, website, employees_count,
        segment, status, responsible_id, custom_fields, tags,
        'lead' as type, source, 
        CASE 
          WHEN priority = 'média' THEN 'media'
          WHEN priority = 'alta' THEN 'alta'
          WHEN priority = 'baixa' THEN 'baixa'
          ELSE 'media'
        END as priority,
        score, estimated_revenue, next_contact_date,
        conversion_date, id as original_id, created_at, updated_at
      FROM leads;
    `);
    
    // 5. Verificar migração
    const [clientsCount] = await sequelize.query("SELECT COUNT(*) as count FROM clients");
    const [leadsCount] = await sequelize.query("SELECT COUNT(*) as count FROM leads");
    const [contactsCount] = await sequelize.query("SELECT COUNT(*) as count FROM customer_contacts");
    const [contactsByType] = await sequelize.query(`
      SELECT type, COUNT(*) as count 
      FROM customer_contacts 
      GROUP BY type 
      ORDER BY type
    `);
    
    console.log('\n📊 Verificação da migração:');
    console.log(`  Clients originais: ${clientsCount[0].count}`);
    console.log(`  Leads originais: ${leadsCount[0].count}`);
    console.log(`  Total unificado: ${contactsCount[0].count}`);
    console.log('  Por tipo:');
    contactsByType.forEach(row => {
      console.log(`    ${row.type}: ${row.count}`);
    });
    
    if (contactsCount[0].count === (clientsCount[0].count + leadsCount[0].count)) {
      console.log('\n✅ Migração realizada com sucesso!');
      console.log('\n📋 Estrutura da tabela unificada:');
      console.log('  - Campo "type" diferencia lead de client');
      console.log('  - Campo "original_id" mantém referência ao ID original');
      console.log('  - Todos os campos específicos de cada tipo preservados');
      console.log('  - Prioridade normalizada (média -> media)');
      console.log('\n⚠️  Próximos passos:');
      console.log('  1. Atualizar modelos para usar CustomerContact');
      console.log('  2. Atualizar APIs para usar tabela unificada');
      console.log('  3. Atualizar frontend para usar nova estrutura');
      console.log('  4. Após teste, remover tabelas antigas');
    } else {
      console.log('\n❌ Erro na migração - contagem não confere!');
    }
    
  } catch (error) {
    console.error('❌ Erro na unificação:', error);
  } finally {
    await sequelize.close();
  }
}

unifyClientsLeadsFixed();