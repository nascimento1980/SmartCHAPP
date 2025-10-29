const { Vehicle, Maintenance, FuelExpense, User, Department } = require('../models');
const { sequelize } = require('../config/database');

const createSampleFleet = async () => {
  try {
    console.log('🚗 Criando dados de exemplo para a frota...');

    // Buscar usuário admin
    const adminUser = await User.findOne({ where: { email: 'admin@chealth.com.br' } });
    if (!adminUser) {
      console.log('❌ Usuário admin não encontrado. Execute primeiro o script de usuários.');
      return;
    }

    // Buscar departamentos
    const departments = await Department.findAll();
    if (departments.length === 0) {
      console.log('❌ Nenhum departamento encontrado. Execute primeiro o script de departamentos.');
      return;
    }

    // Criar veículos de exemplo
    const vehicles = await Vehicle.bulkCreate([
      {
        plate: 'ABC-1234',
        brand: 'Toyota',
        model: 'Corolla',
        year: 2022,
        color: 'Prata',
        type: 'carro',
        fuel_type: 'flex',
        transmission: 'automatico',
        engine_capacity: 2.0,
        mileage: 15000,
        status: 'ativo',
        purchase_date: '2022-01-15',
        purchase_price: 120000.00,
        insurance_expiry: '2024-12-31',
        inspection_expiry: '2024-06-30',
        responsible_id: adminUser.id,
        department_id: departments[0].id,
        notes: 'Veículo principal para visitas comerciais'
      },
      {
        plate: 'DEF-5678',
        brand: 'Honda',
        model: 'Civic',
        year: 2021,
        color: 'Preto',
        type: 'carro',
        fuel_type: 'flex',
        transmission: 'automatico',
        engine_capacity: 1.8,
        mileage: 25000,
        status: 'ativo',
        purchase_date: '2021-06-20',
        purchase_price: 110000.00,
        insurance_expiry: '2024-12-31',
        inspection_expiry: '2024-08-15',
        responsible_id: adminUser.id,
        department_id: departments[0].id,
        notes: 'Veículo para equipe de vendas'
      },
      {
        plate: 'GHI-9012',
        brand: 'Ford',
        model: 'Ranger',
        year: 2023,
        color: 'Branco',
        type: 'caminhao',
        fuel_type: 'diesel',
        transmission: 'manual',
        engine_capacity: 3.2,
        mileage: 8000,
        status: 'ativo',
        purchase_date: '2023-03-10',
        purchase_price: 180000.00,
        insurance_expiry: '2025-12-31',
        inspection_expiry: '2025-03-10',
        responsible_id: adminUser.id,
        department_id: departments[1].id,
        notes: 'Caminhão para entregas e instalações'
      },
      {
        plate: 'JKL-3456',
        brand: 'Fiat',
        model: 'Ducato',
        year: 2022,
        color: 'Azul',
        type: 'van',
        fuel_type: 'diesel',
        transmission: 'manual',
        engine_capacity: 2.3,
        mileage: 18000,
        status: 'manutencao',
        purchase_date: '2022-08-05',
        purchase_price: 140000.00,
        insurance_expiry: '2024-12-31',
        inspection_expiry: '2024-08-05',
        responsible_id: adminUser.id,
        department_id: departments[1].id,
        notes: 'Van para transporte de equipamentos'
      },
      {
        plate: 'MNO-7890',
        brand: 'Yamaha',
        model: 'XJ6',
        year: 2021,
        color: 'Vermelho',
        type: 'moto',
        fuel_type: 'gasolina',
        transmission: 'manual',
        engine_capacity: 0.6,
        mileage: 12000,
        status: 'ativo',
        purchase_date: '2021-11-12',
        purchase_price: 25000.00,
        insurance_expiry: '2024-12-31',
        inspection_expiry: '2024-11-12',
        responsible_id: adminUser.id,
        department_id: departments[0].id,
        notes: 'Moto para deslocamentos rápidos na cidade'
      }
    ]);

    console.log(`✅ ${vehicles.length} veículos criados com sucesso`);

    // Criar manutenções de exemplo
    const maintenances = await Maintenance.bulkCreate([
      {
        vehicle_id: vehicles[3].id, // Van em manutenção
        type: 'corretiva',
        description: 'Troca de correia dentada e revisão geral',
        scheduled_date: '2024-08-20',
        priority: 'alta',
        cost: 2500.00,
        mechanic: 'Auto Center São Paulo',
        workshop: 'Auto Center São Paulo - Zona Sul',
        mileage_at_service: 18000,
        next_maintenance_mileage: 23000,
        next_maintenance_date: '2024-11-20',
        responsible_id: adminUser.id,
        notes: 'Manutenção preventiva programada'
      },
      {
        vehicle_id: vehicles[0].id, // Corolla
        type: 'preventiva',
        description: 'Troca de óleo e filtros',
        scheduled_date: '2024-09-15',
        priority: 'media',
        cost: 350.00,
        mechanic: 'Toyota Center',
        workshop: 'Toyota Center - Centro',
        mileage_at_service: 15000,
        next_maintenance_mileage: 20000,
        next_maintenance_date: '2024-12-15',
        responsible_id: adminUser.id,
        notes: 'Manutenção preventiva padrão'
      },
      {
        vehicle_id: vehicles[2].id, // Ranger
        type: 'preventiva',
        description: 'Revisão de freios e suspensão',
        scheduled_date: '2024-10-05',
        priority: 'media',
        cost: 800.00,
        mechanic: 'Ford Service',
        workshop: 'Ford Service - Zona Norte',
        mileage_at_service: 8000,
        next_maintenance_mileage: 13000,
        next_maintenance_date: '2025-01-05',
        responsible_id: adminUser.id,
        notes: 'Primeira revisão do caminhão'
      }
    ]);

    console.log(`✅ ${maintenances.length} manutenções criadas com sucesso`);

    // Criar gastos com combustível de exemplo
    const fuelExpenses = await FuelExpense.bulkCreate([
      {
        vehicle_id: vehicles[0].id, // Corolla
        date: '2024-08-15',
        fuel_type: 'gasolina',
        quantity_liters: 45.5,
        price_per_liter: 5.89,
        total_cost: 268.00,
        gas_station: 'Shell - Av. Paulista',
        mileage: 15000,
        driver_id: adminUser.id,
        purpose: 'trabalho',
        notes: 'Abastecimento para visitas da semana',
        receipt_number: 'REC-001-2024'
      },
      {
        vehicle_id: vehicles[1].id, // Civic
        date: '2024-08-14',
        fuel_type: 'etanol',
        quantity_liters: 38.2,
        price_per_liter: 3.99,
        total_cost: 152.42,
        gas_station: 'Petrobras - Rua Augusta',
        mileage: 25000,
        driver_id: adminUser.id,
        purpose: 'trabalho',
        notes: 'Abastecimento para equipe de vendas',
        receipt_number: 'REC-002-2024'
      },
      {
        vehicle_id: vehicles[2].id, // Ranger
        date: '2024-08-13',
        fuel_type: 'diesel',
        quantity_liters: 65.0,
        price_per_liter: 4.29,
        total_cost: 278.85,
        gas_station: 'BR - Marginal Tietê',
        mileage: 8000,
        driver_id: adminUser.id,
        purpose: 'entrega',
        notes: 'Abastecimento para entrega de equipamentos',
        receipt_number: 'REC-003-2024'
      },
      {
        vehicle_id: vehicles[4].id, // Moto
        date: '2024-08-12',
        fuel_type: 'gasolina',
        quantity_liters: 12.5,
        price_per_liter: 5.89,
        total_cost: 73.63,
        gas_station: 'Ipiranga - Rua Consolação',
        mileage: 12000,
        driver_id: adminUser.id,
        purpose: 'trabalho',
        notes: 'Abastecimento para deslocamentos urbanos',
        receipt_number: 'REC-004-2024'
      }
    ]);

    console.log(`✅ ${fuelExpenses.length} gastos com combustível criados com sucesso`);

    console.log('🎉 Frota de exemplo criada com sucesso!');
    console.log(`📊 Resumo:`);
    console.log(`   • Veículos: ${vehicles.length}`);
    console.log(`   • Manutenções: ${maintenances.length}`);
    console.log(`   • Gastos com combustível: ${fuelExpenses.length}`);

  } catch (error) {
    console.error('❌ Erro ao criar frota de exemplo:', error);
  } finally {
    await sequelize.close();
  }
};

// Executar se chamado diretamente
if (require.main === module) {
  createSampleFleet();
}

module.exports = createSampleFleet;
