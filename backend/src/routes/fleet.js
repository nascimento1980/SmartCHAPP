const express = require('express');
const router = express.Router();
const { Vehicle, Maintenance, FuelExpense, User, Department } = require('../models');
const { asyncHandler } = require('../middleware/errorHandler');
const { Op } = require('sequelize');

// ===== ROTAS DE VEÍCULOS =====

// GET /api/fleet/vehicles - Listar veículos
router.get('/vehicles', asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, search, status, type, department_id } = req.query;
  const offset = (page - 1) * limit;

  const whereClause = {};
  
  if (search) {
    whereClause[Op.or] = [
      { plate: { [Op.like]: `%${search}%` } },
      { brand: { [Op.like]: `%${search}%` } },
      { model: { [Op.like]: `%${search}%` } }
    ];
  }

  if (status) {
    whereClause.status = status;
  }

  if (type) {
    whereClause.type = type;
  }

  if (department_id) {
    whereClause.department_id = department_id;
  }

  const { count, rows } = await Vehicle.findAndCountAll({
    where: whereClause,
    include: [
      {
        model: User,
        as: 'responsible',
        attributes: ['id', 'name', 'email']
      },
      {
        model: Department,
        as: 'department',
        attributes: ['id', 'name']
      }
    ],
    order: [['created_at', 'DESC']],
    limit: parseInt(limit),
    offset: parseInt(offset)
  });

  res.json({
    vehicles: rows,
    total: count,
    page: parseInt(page),
    totalPages: Math.ceil(count / limit)
  });
}));

// POST /api/fleet/vehicles - Criar veículo
router.post('/vehicles', asyncHandler(async (req, res) => {
  const vehicle = await Vehicle.create(req.body);
  
  const createdVehicle = await Vehicle.findByPk(vehicle.id, {
    include: [
      {
        model: User,
        as: 'responsible',
        attributes: ['id', 'name', 'email']
      },
      {
        model: Department,
        as: 'department',
        attributes: ['id', 'name']
      }
    ]
  });

  res.status(201).json({
    message: 'Veículo criado com sucesso',
    vehicle: createdVehicle
  });
}));

// GET /api/fleet/vehicles/:id - Buscar veículo por ID
router.get('/vehicles/:id', asyncHandler(async (req, res) => {
  const vehicle = await Vehicle.findByPk(req.params.id, {
    include: [
      {
        model: User,
        as: 'responsible',
        attributes: ['id', 'name', 'email']
      },
      {
        model: Department,
        as: 'department',
        attributes: ['id', 'name']
      }
    ]
  });

  if (!vehicle) {
    return res.status(404).json({ error: 'Veículo não encontrado' });
  }

  res.json({ vehicle });
}));

// PUT /api/fleet/vehicles/:id - Atualizar veículo
router.put('/vehicles/:id', asyncHandler(async (req, res) => {
  const vehicle = await Vehicle.findByPk(req.params.id);

  if (!vehicle) {
    return res.status(404).json({ error: 'Veículo não encontrado' });
  }

  await vehicle.update(req.body);
  
  const updatedVehicle = await Vehicle.findByPk(vehicle.id, {
    include: [
      {
        model: User,
        as: 'responsible',
        attributes: ['id', 'name', 'email']
      },
      {
        model: Department,
        as: 'department',
        attributes: ['id', 'name']
      }
    ]
  });

  res.json({
    message: 'Veículo atualizado com sucesso',
    vehicle: updatedVehicle
  });
}));

// DELETE /api/fleet/vehicles/:id - Deletar veículo
router.delete('/vehicles/:id', asyncHandler(async (req, res) => {
  const vehicle = await Vehicle.findByPk(req.params.id);

  if (!vehicle) {
    return res.status(404).json({ error: 'Veículo não encontrado' });
  }

  await vehicle.destroy();

  res.json({ message: 'Veículo deletado com sucesso' });
}));

// ===== ROTAS DE MANUTENÇÃO =====

// GET /api/fleet/maintenance - Listar manutenções
router.get('/maintenance', asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, vehicle_id, status, type } = req.query;
  const offset = (page - 1) * limit;

  const whereClause = {};
  
  if (vehicle_id) {
    whereClause.vehicle_id = vehicle_id;
  }

  if (status) {
    whereClause.status = status;
  }

  if (type) {
    whereClause.type = type;
  }

  const { count, rows } = await Maintenance.findAndCountAll({
    where: whereClause,
    include: [
      {
        model: Vehicle,
        as: 'vehicle',
        attributes: ['id', 'plate', 'brand', 'model']
      },
      {
        model: User,
        as: 'responsible',
        attributes: ['id', 'name', 'email']
      }
    ],
    order: [['scheduled_date', 'ASC']],
    limit: parseInt(limit),
    offset: parseInt(offset)
  });

  res.json({
    maintenances: rows,
    total: count,
    page: parseInt(page),
    totalPages: Math.ceil(count / limit)
  });
}));

// POST /api/fleet/maintenance - Criar manutenção
router.post('/maintenance', asyncHandler(async (req, res) => {
  const maintenance = await Maintenance.create(req.body);
  
  const createdMaintenance = await Maintenance.findByPk(maintenance.id, {
    include: [
      {
        model: Vehicle,
        as: 'vehicle',
        attributes: ['id', 'plate', 'brand', 'model']
      },
      {
        model: User,
        as: 'responsible',
        attributes: ['id', 'name', 'email']
      }
    ]
  });

  res.status(201).json({
    message: 'Manutenção agendada com sucesso',
    maintenance: createdMaintenance
  });
}));

// PUT /api/fleet/maintenance/:id - Atualizar manutenção
router.put('/maintenance/:id', asyncHandler(async (req, res) => {
  const maintenance = await Maintenance.findByPk(req.params.id);

  if (!maintenance) {
    return res.status(404).json({ error: 'Manutenção não encontrada' });
  }

  await maintenance.update(req.body);
  
  const updatedMaintenance = await Maintenance.findByPk(maintenance.id, {
    include: [
      {
        model: Vehicle,
        as: 'vehicle',
        attributes: ['id', 'plate', 'brand', 'model']
      },
      {
        model: User,
        as: 'responsible',
        attributes: ['id', 'name', 'email']
      }
    ]
  });

  res.json({
    message: 'Manutenção atualizada com sucesso',
    maintenance: updatedMaintenance
  });
}));

// ===== ROTAS DE GASTOS COM COMBUSTÍVEL =====

// GET /api/fleet/fuel - Listar gastos com combustível
router.get('/fuel', asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, vehicle_id, fuel_type, start_date, end_date } = req.query;
  const offset = (page - 1) * limit;

  const whereClause = {};
  
  if (vehicle_id) {
    whereClause.vehicle_id = vehicle_id;
  }

  if (fuel_type) {
    whereClause.fuel_type = fuel_type;
  }

  if (start_date && end_date) {
    whereClause.date = {
      [Op.between]: [start_date, end_date]
    };
  }

  const { count, rows } = await FuelExpense.findAndCountAll({
    where: whereClause,
    include: [
      {
        model: Vehicle,
        as: 'vehicle',
        attributes: ['id', 'plate', 'brand', 'model']
      },
      {
        model: User,
        as: 'driver',
        attributes: ['id', 'name', 'email']
      }
    ],
    order: [['date', 'DESC']],
    limit: parseInt(limit),
    offset: parseInt(offset)
  });

  res.json({
    fuelExpenses: rows,
    total: count,
    page: parseInt(page),
    totalPages: Math.ceil(count / limit)
  });
}));

// POST /api/fleet/fuel - Registrar gasto com combustível
router.post('/fuel', asyncHandler(async (req, res) => {
  const fuelExpense = await FuelExpense.create(req.body);
  
  const createdFuelExpense = await FuelExpense.findByPk(fuelExpense.id, {
    include: [
      {
        model: Vehicle,
        as: 'vehicle',
        attributes: ['id', 'plate', 'brand', 'model']
      },
      {
        model: User,
        as: 'driver',
        attributes: ['id', 'name', 'email']
      }
    ]
  });

  res.status(201).json({
    message: 'Gasto com combustível registrado com sucesso',
    fuelExpense: createdFuelExpense
  });
}));

// ===== ROTAS DE RELATÓRIOS =====

// GET /api/fleet/reports/summary - Resumo da frota
router.get('/reports/summary', asyncHandler(async (req, res) => {
  const totalVehicles = await Vehicle.count();
  const activeVehicles = await Vehicle.count({ where: { status: 'ativo' } });
  const maintenanceVehicles = await Vehicle.count({ where: { status: 'manutencao' } });
  
  const pendingMaintenance = await Maintenance.count({ 
    where: { 
      status: { [Op.in]: ['agendada', 'em_andamento'] } 
    } 
  });

  const totalFuelCost = await FuelExpense.sum('total_cost', {
    where: {
      date: {
        [Op.gte]: new Date(new Date().getFullYear(), 0, 1) // Ano atual
      }
    }
  });

  res.json({
    summary: {
      totalVehicles,
      activeVehicles,
      maintenanceVehicles,
      pendingMaintenance,
      totalFuelCost: totalFuelCost || 0
    }
  });
}));

// GET /api/fleet/reports/maintenance-schedule - Cronograma de manutenções
router.get('/reports/maintenance-schedule', asyncHandler(async (req, res) => {
  const { days = 30 } = req.query;
  
  const endDate = new Date();
  endDate.setDate(endDate.getDate() + parseInt(days));

  const maintenances = await Maintenance.findAll({
    where: {
      scheduled_date: {
        [Op.between]: [new Date(), endDate]
      },
      status: { [Op.in]: ['agendada', 'em_andamento'] }
    },
    include: [
      {
        model: Vehicle,
        as: 'vehicle',
        attributes: ['id', 'plate', 'brand', 'model']
      }
    ],
    order: [['scheduled_date', 'ASC']]
  });

  res.json({ maintenances });
}));

module.exports = router;
