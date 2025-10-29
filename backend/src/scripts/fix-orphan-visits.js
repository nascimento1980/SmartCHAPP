const { sequelize } = require('../config/database');
const { Visit, VisitPlanning, User } = require('../models');
const { v4: uuidv4 } = require('uuid');

/**
 * Calcula o início (segunda-feira) e fim (sexta-feira) da semana para uma data
 */
function getWeekDates(date) {
  const d = new Date(date);
  const day = d.getDay(); // 0 = domingo, 6 = sábado
  
  // Para fim de semana, criar planejamento individual
  if (day === 0 || day === 6) {
    return { start: d, end: d, isWeekend: true };
  }
  
  // Calcular segunda-feira
  const daysToMonday = day - 1; // Segunda = 1
  const monday = new Date(d);
  monday.setDate(d.getDate() - daysToMonday);
  monday.setHours(0, 0, 0, 0);
  
  // Calcular sexta-feira
  const friday = new Date(monday);
  friday.setDate(monday.getDate() + 4);
  friday.setHours(0, 0, 0, 0);
  
  return { start: monday, end: friday, isWeekend: false };
}

/**
 * Formatar data para YYYY-MM-DD
 */
function formatDateSQL(date) {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

async function fixOrphanVisits() {
  console.log('🔄 Iniciando correção de visitas órfãs...\n');
  
  try {
    // 1. Buscar todas as visitas agendadas
    const visits = await Visit.findAll({
      where: { status: 'agendada' },
      order: [['scheduled_date', 'ASC']]
    });
    
    console.log(`📊 Total de visitas agendadas encontradas: ${visits.length}\n`);
    
    let fixedCount = 0;
    let alreadyOkCount = 0;
    
    for (const visit of visits) {
      const visitDate = new Date(visit.scheduled_date);
      const responsibleId = visit.responsible_id;
      
      console.log(`\n🔍 Processando: ${visit.title}`);
      console.log(`   Data: ${visitDate.toLocaleDateString('pt-BR')}`);
      console.log(`   Responsável ID: ${responsibleId || 'N/A'}`);
      console.log(`   Planning ID atual: ${visit.planning_id || 'NULL'}`);
      
      // Verificar se o planning_id existe
      let planningExists = false;
      if (visit.planning_id) {
        const existingPlanning = await VisitPlanning.findByPk(visit.planning_id);
        planningExists = !!existingPlanning;
      }
      
      if (planningExists) {
        console.log(`   ✅ Planejamento existe - OK`);
        alreadyOkCount++;
        continue;
      }
      
      console.log(`   ⚠️  Planejamento inválido - criando novo...`);
      
      // Calcular semana
      const { start, end, isWeekend } = getWeekDates(visitDate);
      const weekStartSQL = formatDateSQL(start);
      const weekEndSQL = formatDateSQL(end);
      
      console.log(`   📅 Semana calculada: ${start.toLocaleDateString('pt-BR')} a ${end.toLocaleDateString('pt-BR')}`);
      
      // Buscar planejamento existente para esta semana e usuário
      let planning = await VisitPlanning.findOne({
        where: {
          responsible_id: responsibleId,
          week_start_date: weekStartSQL,
          week_end_date: weekEndSQL
        }
      });
      
      if (!planning) {
        // Criar novo planejamento
        console.log(`   ➕ Criando novo planejamento...`);
        planning = await VisitPlanning.create({
          id: uuidv4(),
          week_start_date: weekStartSQL,
          week_end_date: weekEndSQL,
          planning_type: 'misto',
          status: 'em_planejamento',
          responsible_id: responsibleId,
          notes: isWeekend 
            ? `Planejamento individual para ${start.toLocaleDateString('pt-BR')} (recuperado automaticamente)`
            : `Planejamento para semana de ${start.toLocaleDateString('pt-BR')} a ${end.toLocaleDateString('pt-BR')} (recuperado automaticamente)`
        });
        
        console.log(`   ✅ Planejamento criado: ${planning.id}`);
      } else {
        console.log(`   ♻️  Usando planejamento existente: ${planning.id}`);
      }
      
      // Associar visita ao planejamento
      await visit.update({ planning_id: planning.id });
      console.log(`   ✅ Visita associada ao planejamento`);
      
      fixedCount++;
    }
    
    console.log(`\n\n📈 RESUMO:`);
    console.log(`   ✅ Visitas já corretas: ${alreadyOkCount}`);
    console.log(`   🔧 Visitas corrigidas: ${fixedCount}`);
    console.log(`   📊 Total processado: ${visits.length}`);
    console.log(`\n✅ Correção concluída com sucesso!\n`);
    
  } catch (error) {
    console.error('❌ Erro ao corrigir visitas órfãs:', error);
    throw error;
  }
}

// Executar script
(async () => {
  try {
    await fixOrphanVisits();
    process.exit(0);
  } catch (error) {
    console.error('❌ Erro fatal:', error);
    process.exit(1);
  }
})();

