export type ClientType = 'PF' | 'PJ';

export interface ClientAddress {
  street: string;
  number: string;
  complement?: string;
  neighborhood: string;
  city: string;
  state: string;
  zipCode: string;
}

export interface ClientRepresentative {
  name: string;
  cpf: string;
  rg: string;
  nationality: string;
  maritalStatus: string;
  profession: string;
  role: string; // Ex: Sócio Administrador, Diretor, Representante Legal
}

export interface Client {
  id: string;
  type: ClientType;
  name: string; // Nome Completo ou Razão Social
  tradeName?: string; // Nome Fantasia
  cpfCnpj: string;
  rgIe: string;
  nationality: string;
  maritalStatus: string;
  profession: string;
  birthDate?: string;
  email: string;
  phone: string;
  whatsapp: string;
  address: ClientAddress;
  representative?: ClientRepresentative;
  isGratuidadeJusticaEligible: boolean;
  notes: string;
  createdAt: string;
}

export interface ProcessMovementAIAnalysis {
  summary: string;
  clientExplanation: string;
  recommendedAction: string;
  urgency: 'baixa' | 'media' | 'alta' | 'fatal';
  suggestedWhatsApp: string;
  deadlineDays?: number;
  deadlineType?: 'Úteis' | 'Corridos';
  tendency?: 'Positiva' | 'Negativa' | 'Neutra';
}

export interface ProcessMovement {
  id: string;
  date: string;
  code: string;
  title: string;
  description: string;
  organ: string;
  isJudicialDecision: boolean;
  deadlineDays?: number;
  deadlineType?: 'Úteis' | 'Corridos';
  deadlineDate?: string;
  aiAnalysis?: ProcessMovementAIAnalysis;
  tendency?: 'Positiva' | 'Negativa' | 'Neutra';
}

export type DeadlineStatus = 'pendente' | 'cumprido' | 'alerta' | 'atrasado';
export type DeadlineType = 'Prazo CPC' | 'Audiência' | 'Recurso' | 'Réplica' | 'Contestação' | 'Perícia' | 'Manifestação' | 'Outro';

export interface ProcessDeadline {
  id: string;
  processId: string;
  processNumber: string;
  clientName: string;
  title: string;
  type: DeadlineType;
  startDate: string;
  fatalDate: string;
  status: DeadlineStatus;
  daysLeft: number;
  responsibleLawyer: string;
  notes?: string;
  reminderHours?: number; // Ex: 12, 24, 48
  reminderNotified?: boolean;
}

export type ProcessStatus = 'Ativo' | 'Suspenso' | 'Arquivado' | 'Em Recurso' | 'Fase de Execução' | 'Sentenciado';

export interface LegalProcess {
  id: string;
  cnjNumber: string;
  court: string;
  branchVara: string;
  comarca: string;
  lawsuitType: string;
  subject: string;
  value: number;
  distributionDate: string;
  status: ProcessStatus;
  activeParty: string;
  passiveParty: string;
  clientId: string;
  responsibleLawyer: string;
  judge?: string;
  movements: ProcessMovement[];
  lastSyncDate: string;
  notes: string;
  tags?: string[];
}

export interface LawOfficeSettings {
  officeName: string;
  officeBrandTagline: string;
  cnpj: string;
  primaryLawyer: {
    name: string;
    oabNumber: string;
    oabState: string;
    cpf: string;
    email: string;
    phone: string;
  };
  additionalLawyers: Array<{
    id: string;
    name: string;
    oabNumber: string;
    oabState: string;
    email: string;
  }>;
  address: ClientAddress;
  phone: string;
  whatsapp: string;
  email: string;
  website: string;
  bankAccount: {
    pixKey: string;
    bankName: string;
    agency: string;
    accountNumber: string;
    accountHolder: string;
  };
  whatsappWebhookUrl?: string;
  whatsappApiKey?: string;
  whatsappMessageTemplate?: string;
}

export type DocumentType =
  | 'procuracao'
  | 'contrato_honorarios'
  | 'declaracao_hipossuficiencia'
  | 'substabelecimento'
  | 'recibo_honorarios';

export interface DocumentPowers {
  adJudiciaGeral: boolean;
  receberDarQuitacao: boolean;
  transigirAcordos: boolean;
  substabelecerComReserva: boolean;
  substabelecerSemReserva: boolean;
  levantarRpvPrecatório: boolean;
  reconhecerProcedencia: boolean;
  firmarCompromisso: boolean;
  extrajudicialAdmin: boolean;
  especialCriminal?: boolean;
}

export interface ContractFeeOptions {
  feeType: 'pro_labore_e_exito' | 'apenas_exito' | 'apenas_fixo' | 'mensalidade';
  fixedValue: number;
  installmentsCount: number;
  installmentValue: number;
  contingencyPercent: number; // Ex: 20% ou 30% (quota litis)
  sucumbenceBelongsToLawyer: boolean;
  expensesPaidByClient: boolean;
  interestRateLate: number; // Multa de 2% e juros de 1% a.m.
  firstDueDate: string;
  forumCity: string;
}

export interface LegalDocumentItem {
  id: string;
  type: DocumentType;
  title: string;
  clientId: string;
  processId?: string;
  createdAt: string;
  status: 'rascunho' | 'pronto' | 'assinado';
  powers?: DocumentPowers;
  fees?: ContractFeeOptions;
  customClauses?: string[];
  substabelecidoNome?: string;
  substabelecidoOAB?: string;
  receiptValue?: number;
  receiptReference?: string;
}

// SaaS Models & Types
export type TeamMemberRole = 
  | 'Sócio Administrador'
  | 'Advogado Sênior'
  | 'Advogado Pleno'
  | 'Advogado Júnior'
  | 'Paralegal / Estagiário'
  | 'Financeiro & Administrativo';

export interface TeamMember {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: TeamMemberRole;
  privilege?: 'total' | 'parcial' | 'leitura'; // Total, Parcial, Sem Privilégio (Leitura)
  oabNumber?: string;
  oabState?: string;
  status: 'ativo' | 'inativo';
  casesAssignedCount: number;
  avatarColor: string;
  createdAt: string;
}

export type FinancialCategory = 'Receita' | 'Despesa';
export type FinancialType = 
  | 'Honorários Iniciais (Pró-labore)'
  | 'Honorários Mensais / Retainer'
  | 'Honorários de Êxito (Ad Exitum)'
  | 'Honorários Sucumbenciais'
  | 'Custas Processuais / Diligência'
  | 'Despesa Operacional';

export type FinancialStatus = 'Pendente' | 'Pago' | 'Atrasado' | 'Cancelado';

export interface FinancialRecord {
  id: string;
  title: string;
  category: FinancialCategory;
  type: FinancialType;
  clientId?: string;
  clientName: string;
  processId?: string;
  processNumber?: string;
  amount: number;
  dueDate: string;
  paymentDate?: string;
  status: FinancialStatus;
  paymentMethod: 'PIX' | 'Boleto Bancário' | 'Cartão de Crédito' | 'TED / Transferência';
  notes?: string;
  createdAt: string;
}

export type SaaSSubscriptionPlan = 'Starter' | 'Pro' | 'Enterprise';

export interface SaaSTenantConfig {
  plan: SaaSSubscriptionPlan;
  status: 'ativo' | 'em_trial' | 'suspenso';
  renewalDate: string;
  monthlyFee: number;
  processLimit: number;
  clientLimit: number;
  userSeatsLimit: number;
  usedSeatsCount: number;
  storageUsedMB: number;
  storageLimitMB: number;
  dataJudQueriesCount: number;
  dataJudMonthlyLimit: number;
  aiTokensUsed: number;
  aiMonthlyTokenLimit: number;
  customDomain?: string;
  autoSyncEnabled: boolean;
  backupFrequency: 'diario' | 'semanal' | 'mensal';
}

export interface AuditLog {
  id: string;
  timestamp: string;
  userName: string;
  userRole: string;
  action: 'CREATE' | 'UPDATE' | 'DELETE' | 'SYNC' | 'EXPORT' | 'AI_QUERY' | 'RESTORE' | 'PURGE';
  entity: 'PROCESSO' | 'CLIENTE' | 'PRAZO' | 'DOCUMENTO' | 'FINANCEIRO' | 'EQUIPE' | 'CONFIG' | 'LIXEIRA';
  description: string;
}

export interface TrashItem {
  id: string;
  originalId: string;
  type: 'processo' | 'cliente' | 'prazo' | 'documento';
  title: string;
  subtitle?: string;
  deletedAt: string;
  deletedBy: string;
  data: any;
}

