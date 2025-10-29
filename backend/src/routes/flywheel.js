const express = require('express');
const { asyncHandler } = require('../middleware/errorHandler');
const FlywheelService = require('../services/FlywheelService');

const router = express.Router();

// GET /api/flywheel/metrics - Métricas completas do Flywheel
router.get('/metrics', asyncHandler(async (req, res) => {
  const { start_date, end_date } = req.query;
  
  const dateRange = {};
  if (start_date) dateRange.start = new Date(start_date);
  if (end_date) dateRange.end = new Date(end_date);
  
  const velocity = await FlywheelService.calculateFlywheelVelocity();
  
  res.json({
    message: 'Métricas do Flywheel obtidas com sucesso',
    data: velocity,
    period: {
      start: dateRange.start || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      end: dateRange.end || new Date()
    }
  });
}));

// GET /api/flywheel/attract - Métricas da fase Atrair
router.get('/attract', asyncHandler(async (req, res) => {
  const { start_date, end_date } = req.query;
  
  const dateRange = {};
  if (start_date) dateRange.start = new Date(start_date);
  if (end_date) dateRange.end = new Date(end_date);
  
  const metrics = await FlywheelService.calculateAttractMetrics(dateRange);
  
  res.json({
    message: 'Métricas de atração obtidas com sucesso',
    data: metrics
  });
}));

// GET /api/flywheel/engage - Métricas da fase Engajar
router.get('/engage', asyncHandler(async (req, res) => {
  const { start_date, end_date } = req.query;
  
  const dateRange = {};
  if (start_date) dateRange.start = new Date(start_date);
  if (end_date) dateRange.end = new Date(end_date);
  
  const metrics = await FlywheelService.calculateEngageMetrics(dateRange);
  
  res.json({
    message: 'Métricas de engajamento obtidas com sucesso',
    data: metrics
  });
}));

// GET /api/flywheel/delight - Métricas da fase Encantar
router.get('/delight', asyncHandler(async (req, res) => {
  const { start_date, end_date } = req.query;
  
  const dateRange = {};
  if (start_date) dateRange.start = new Date(start_date);
  if (end_date) dateRange.end = new Date(end_date);
  
  const metrics = await FlywheelService.calculateDelightMetrics(dateRange);
  
  res.json({
    message: 'Métricas de encantamento obtidas com sucesso',
    data: metrics
  });
}));

module.exports = router;