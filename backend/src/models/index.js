const { sequelize } = require('../config/database');

// Importar todos os modelos
const User = require('./User');
const Product = require('./Product');
const Proposal = require('./Proposal');
const ProposalItem = require('./ProposalItem');
const Visit = require('./Visit');
const Activity = require('./Activity');
const Contact = require('./Contact');
const Form = require('./Form');
const FormSubmission = require('./FormSubmission');
const CompanySetting = require('./CompanySetting');
const Employee = require('./Employee');
const UserInvite = require('./UserInvite');
const IntegrationSetting = require('./IntegrationSetting');
const RolePermission = require('./RolePermission');
const Segment = require('./Segment');
const Department = require('./Department');
const RoleProfile = require('./RoleProfile');
const Vehicle = require('./Vehicle');
const Maintenance = require('./Maintenance');
const FuelExpense = require('./FuelExpense');
const VisitPlanning = require('./VisitPlanning');
const VisitPlanningItem = require('./VisitPlanningItem');
const PlanningInvite = require('./PlanningInvite');
const PlanningCollaborator = require('./PlanningCollaborator');
const CustomerContact = require('./CustomerContact');
const Deal = require('./Deal');
const Ticket = require('./Ticket');
const LeadScore = require('./LeadScore');
const Pipeline = require('./Pipeline');
const UserSession = require('./UserSession');
const FacilityPOP = require('./FacilityPOP');
const FacilityPOPStep = require('./FacilityPOPStep');
const FacilityExecution = require('./FacilityExecution');
const FacilityExecutionStep = require('./FacilityExecutionStep');
const FacilityEvidence = require('./FacilityEvidence');

// Definir associações
const defineAssociations = () => {
  console.log('🔄 Definindo associações dos modelos...');
  
  // User associations
  User.hasMany(CustomerContact, { foreignKey: 'responsible_id', as: 'customerContacts' });
  User.hasMany(Proposal, { foreignKey: 'user_id', as: 'proposals' });
  User.hasMany(Visit, { foreignKey: 'responsible_id', as: 'visits' });
  User.hasMany(Activity, { foreignKey: 'user_id', as: 'activities' });
  User.hasMany(VisitPlanning, { foreignKey: 'responsible_id', as: 'visitPlannings' });
  User.hasMany(Vehicle, { foreignKey: 'responsible_id', as: 'vehicles' });
  User.hasMany(Maintenance, { foreignKey: 'responsible_id', as: 'maintenances' });
  User.hasMany(FuelExpense, { foreignKey: 'driver_id', as: 'fuelExpenses' });
  // IntegrationSetting não tem foreign keys para User
  User.hasMany(UserInvite, { foreignKey: 'invited_by', as: 'userInvites' });

  // CustomerContact associations
  CustomerContact.belongsTo(User, { foreignKey: 'responsible_id', as: 'responsible' });
  CustomerContact.hasMany(Activity, { foreignKey: 'customer_contact_id', as: 'activities' });
  CustomerContact.hasMany(Contact, { foreignKey: 'customer_contact_id', as: 'contacts' });
  CustomerContact.hasMany(Proposal, { foreignKey: 'customer_contact_id', as: 'proposals' });
  // Visit associations removidas - tabela visits usa client_id e lead_id diretamente
  CustomerContact.hasMany(Deal, { foreignKey: 'customer_contact_id', as: 'deals' });
  CustomerContact.hasMany(Ticket, { foreignKey: 'customer_contact_id', as: 'tickets' });
  CustomerContact.hasMany(VisitPlanningItem, { foreignKey: 'client_id', as: 'planningItems' });
  CustomerContact.hasMany(LeadScore, { foreignKey: 'customer_contact_id', as: 'leadScore' });

  // Visit associations
  Visit.belongsTo(User, { foreignKey: 'responsible_id', as: 'responsible' });
  Visit.belongsTo(User, { foreignKey: 'deleted_by', as: 'deletedBy' });
  Visit.belongsTo(VisitPlanning, { foreignKey: 'planning_id', as: 'planning' });
  Visit.belongsTo(CustomerContact, { foreignKey: 'customer_contact_id', as: 'customerContact' });
  // Visit usa client_id para associar com CustomerContact

  // VisitPlanning associations
  VisitPlanning.belongsTo(User, { foreignKey: 'responsible_id', as: 'responsible' });
  VisitPlanning.hasMany(VisitPlanningItem, { foreignKey: 'planning_id', as: 'items' });
  VisitPlanning.hasMany(Visit, { foreignKey: 'planning_id', as: 'visits' });
  VisitPlanning.hasMany(PlanningInvite, { foreignKey: 'planning_id', as: 'invites' });
  VisitPlanning.hasMany(PlanningCollaborator, { foreignKey: 'planning_id', as: 'collaborators' });

  // VisitPlanningItem associations
  VisitPlanningItem.belongsTo(VisitPlanning, { foreignKey: 'planning_id', as: 'planning' });
  VisitPlanningItem.belongsTo(CustomerContact, { foreignKey: 'client_id', as: 'customerContact' });

  // PlanningInvite associations
  PlanningInvite.belongsTo(VisitPlanning, { foreignKey: 'planning_id', as: 'planning' });
  PlanningInvite.belongsTo(User, { foreignKey: 'inviter_id', as: 'inviter' });
  PlanningInvite.belongsTo(User, { foreignKey: 'invited_user_id', as: 'invitedUser' });

  // PlanningCollaborator associations
  PlanningCollaborator.belongsTo(VisitPlanning, { foreignKey: 'planning_id', as: 'planning' });
  PlanningCollaborator.belongsTo(User, { foreignKey: 'user_id', as: 'user' });
  PlanningCollaborator.belongsTo(User, { foreignKey: 'added_by', as: 'addedBy' });

  // User associations for collaboration
  User.hasMany(PlanningInvite, { foreignKey: 'inviter_id', as: 'sentInvites' });
  User.hasMany(PlanningInvite, { foreignKey: 'invited_user_id', as: 'receivedInvites' });
  User.hasMany(PlanningCollaborator, { foreignKey: 'user_id', as: 'collaborations' });
  User.hasMany(PlanningCollaborator, { foreignKey: 'added_by', as: 'addedCollaborators' });

  // UserSession associations
  User.hasMany(UserSession, { foreignKey: 'user_id', as: 'sessions' });
  UserSession.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

  // Proposal associations
  Proposal.belongsTo(User, { foreignKey: 'user_id', as: 'user' });
  Proposal.belongsTo(CustomerContact, { foreignKey: 'customer_contact_id', as: 'customerContact' });
  Proposal.hasMany(ProposalItem, { foreignKey: 'proposal_id', as: 'items' });

  // ProposalItem associations
  ProposalItem.belongsTo(Proposal, { foreignKey: 'proposal_id', as: 'proposal' });
  ProposalItem.belongsTo(Product, { foreignKey: 'product_id', as: 'product' });

  // Activity associations
  Activity.belongsTo(User, { foreignKey: 'user_id', as: 'user' });
  Activity.belongsTo(CustomerContact, { foreignKey: 'customer_contact_id', as: 'customerContact' });

  // Contact associations
  Contact.belongsTo(CustomerContact, { foreignKey: 'customer_contact_id', as: 'customerContact' });

  // Form associations
  Form.belongsTo(User, { foreignKey: 'created_by', as: 'created_by_user' });
  Form.hasMany(FormSubmission, { foreignKey: 'form_id', as: 'submissions' });

  // FormSubmission associations
  FormSubmission.belongsTo(Form, { foreignKey: 'form_id', as: 'form' });
  FormSubmission.belongsTo(User, { foreignKey: 'submitted_by', as: 'submitted_by_user' });

  // Deal associations
  Deal.belongsTo(User, { foreignKey: 'responsible_id', as: 'responsible' });
  Deal.belongsTo(CustomerContact, { foreignKey: 'customer_contact_id', as: 'customerContact' });
  Deal.belongsTo(Pipeline, { foreignKey: 'pipeline_id', as: 'pipeline' });

  // Ticket associations
  Ticket.belongsTo(User, { foreignKey: 'assigned_to', as: 'assignedTo' });
  Ticket.belongsTo(User, { foreignKey: 'created_by', as: 'createdBy' });
  Ticket.belongsTo(CustomerContact, { foreignKey: 'customer_contact_id', as: 'customerContact' });

  // LeadScore associations
  LeadScore.belongsTo(CustomerContact, { foreignKey: 'customer_contact_id', as: 'customerContact' });

  // Pipeline associations
  Pipeline.hasMany(Deal, { foreignKey: 'pipeline_id', as: 'deals' });

  // Facility associations
  FacilityPOP.belongsTo(User, { foreignKey: 'created_by', as: 'creator' });
  FacilityPOP.belongsTo(User, { foreignKey: 'approved_by', as: 'approver' });
  FacilityPOP.hasMany(FacilityPOPStep, { foreignKey: 'pop_id', as: 'steps' });
  FacilityPOP.hasMany(FacilityExecution, { foreignKey: 'pop_id', as: 'executions' });
  
  FacilityPOPStep.belongsTo(FacilityPOP, { foreignKey: 'pop_id', as: 'pop' });
  FacilityPOPStep.hasMany(FacilityExecutionStep, { foreignKey: 'step_id', as: 'executions' });
  
  FacilityExecution.belongsTo(FacilityPOP, { foreignKey: 'pop_id', as: 'pop' });
  FacilityExecution.belongsTo(User, { foreignKey: 'executed_by', as: 'executor' });
  FacilityExecution.belongsTo(User, { foreignKey: 'supervisor_id', as: 'supervisor' });
  FacilityExecution.hasMany(FacilityExecutionStep, { foreignKey: 'execution_id', as: 'steps' });
  
  FacilityExecutionStep.belongsTo(FacilityExecution, { foreignKey: 'execution_id', as: 'execution' });
  FacilityExecutionStep.belongsTo(FacilityPOPStep, { foreignKey: 'step_id', as: 'step' });
  FacilityExecutionStep.hasMany(FacilityEvidence, { foreignKey: 'execution_step_id', as: 'evidences' });
  
  FacilityEvidence.belongsTo(FacilityExecutionStep, { foreignKey: 'execution_step_id', as: 'executionStep' });
  FacilityEvidence.belongsTo(User, { foreignKey: 'uploaded_by', as: 'uploader' });
  
  // User associations for facilities
  User.hasMany(FacilityPOP, { foreignKey: 'created_by', as: 'createdPOPs' });
  User.hasMany(FacilityPOP, { foreignKey: 'approved_by', as: 'approvedPOPs' });
  User.hasMany(FacilityExecution, { foreignKey: 'executed_by', as: 'facilityExecutions' });
  User.hasMany(FacilityExecution, { foreignKey: 'supervisor_id', as: 'supervisedExecutions' });
  User.hasMany(FacilityEvidence, { foreignKey: 'uploaded_by', as: 'uploadedEvidences' });

  // Product associations
  Product.hasMany(ProposalItem, { foreignKey: 'product_id', as: 'proposalItems' });

  // Fleet associations
  Department.hasMany(Vehicle, { foreignKey: 'department_id', as: 'vehicles' });
  Vehicle.belongsTo(Department, { foreignKey: 'department_id', as: 'department' });
  Vehicle.belongsTo(User, { foreignKey: 'responsible_id', as: 'responsible' });
  
  Vehicle.hasMany(Maintenance, { foreignKey: 'vehicle_id', as: 'maintenances' });
  Maintenance.belongsTo(Vehicle, { foreignKey: 'vehicle_id', as: 'vehicle' });
  Maintenance.belongsTo(User, { foreignKey: 'responsible_id', as: 'responsible' });
  
  Vehicle.hasMany(FuelExpense, { foreignKey: 'vehicle_id', as: 'fuelExpenses' });
  FuelExpense.belongsTo(Vehicle, { foreignKey: 'vehicle_id', as: 'vehicle' });
  FuelExpense.belongsTo(User, { foreignKey: 'driver_id', as: 'driver' });
  
  // Employee associations (usar Employee.uuid para FK externa)
  User.belongsTo(Employee, { foreignKey: 'employee_id', targetKey: 'uuid', as: 'employee' });
  Employee.hasOne(User, { foreignKey: 'employee_id', sourceKey: 'uuid', as: 'user' });
  Employee.belongsTo(Department, { foreignKey: 'department_id', as: 'department' });
  
  // Segment associations
  Segment.hasMany(CustomerContact, { foreignKey: 'segment_id', as: 'contacts' });
  CustomerContact.belongsTo(Segment, { foreignKey: 'segment_id', as: 'segmentRef' });

  console.log('✅ Todas as associações foram definidas com sucesso!');
};

// Sincronizar modelos com o banco de dados
const syncModels = async () => {
  try {
    console.log('🔄 Sincronizando modelos com o banco de dados...');
    
    // Definir associações primeiro
    defineAssociations();
    
    // Sincronizar todos os modelos
    await sequelize.sync({ alter: true });
    
    console.log('✅ Modelos sincronizados com sucesso!');
  } catch (error) {
    console.error('❌ Erro ao sincronizar modelos:', error);
    throw error;
  }
};

// Exportar modelos e funções
module.exports = {
  sequelize,
  User,
  Product,
  Proposal,
  ProposalItem,
  Visit,
  Activity,
  Contact,
  Form,
  FormSubmission,
  CompanySetting,
  Employee,
  UserInvite,
  IntegrationSetting,
  RolePermission,
  Segment,
  Department,
  RoleProfile,
  Vehicle,
  Maintenance,
  FuelExpense,
  VisitPlanning,
  VisitPlanningItem,
  PlanningInvite,
  PlanningCollaborator,
  CustomerContact,
  Deal,
  Ticket,
  LeadScore,
  Pipeline,
  UserSession,
  FacilityPOP,
  FacilityPOPStep,
  FacilityExecution,
  FacilityExecutionStep,
  FacilityEvidence,
  defineAssociations,
  syncModels
};