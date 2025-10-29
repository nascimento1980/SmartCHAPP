/*
  Script: wipe_data.js
  Uso (DEV):
    CONFIRM_WIPE=YES NODE_ENV=development node src/scripts/wipe_data.js --visits --contacts --planning

  Flags:
    --visits     -> limpa tabela unificada de visitas (Visit)
    --contacts   -> limpa contatos (clientes/leads) (CustomerContact)
    --planning   -> limpa planejamento (VisitPlanningItem, PlanningInvite, PlanningCollaborator, VisitPlanning)
    --all        -> todas as opções acima
*/

require('dotenv').config();

const { sequelize } = require('../config/database');
const {
  Visit,
  VisitPlanning,
  VisitPlanningItem,
  PlanningInvite,
  PlanningCollaborator,
  CustomerContact
} = require('../models');

async function main() {
  try {
    if (process.env.CONFIRM_WIPE !== 'YES') {
      console.error('ABORTADO: defina CONFIRM_WIPE=YES para executar a limpeza.');
      process.exit(1);
    }

    const args = process.argv.slice(2);
    const wipeAll = args.includes('--all');
    const wipeVisits = wipeAll || args.includes('--visits');
    const wipeContacts = wipeAll || args.includes('--contacts');
    const wipePlanning = wipeAll || args.includes('--planning');

    if (!wipeVisits && !wipeContacts && !wipePlanning) {
      console.error('Nada a fazer. Forneça pelo menos uma flag: --visits --contacts --planning ou --all');
      process.exit(1);
    }

    await sequelize.authenticate();
    console.log('✅ Conectado ao banco');

    await sequelize.transaction(async (t) => {
      // Ordem importa para manter integridade
      if (wipeVisits) {
        const deleted = await Visit.destroy({ where: {}, transaction: t });
        console.log(`🗑️  Visit (visitas): ${deleted} registros apagados`);
      }

      if (wipePlanning) {
        const delInvites = await PlanningInvite.destroy({ where: {}, transaction: t });
        const delCollabs = await PlanningCollaborator.destroy({ where: {}, transaction: t });
        const delItems = await VisitPlanningItem.destroy({ where: {}, transaction: t });
        const delPlans = await VisitPlanning.destroy({ where: {}, transaction: t });
        console.log(`🗑️  PlanningInvite: ${delInvites}, PlanningCollaborator: ${delCollabs}, VisitPlanningItem: ${delItems}, VisitPlanning: ${delPlans}`);
      }

      if (wipeContacts) {
        const deleted = await CustomerContact.destroy({ where: {}, transaction: t });
        console.log(`🗑️  CustomerContact (clientes/leads): ${deleted} registros apagados`);
      }
    });

    console.log('✅ Limpeza concluída com sucesso.');
    process.exit(0);
  } catch (err) {
    console.error('❌ Falha na limpeza:', err);
    process.exit(1);
  }
}

main();


