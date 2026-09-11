import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { 
  Client, 
  LegalProcess, 
  ProcessDeadline, 
  LegalDocumentItem, 
  TeamMember, 
  FinancialRecord, 
  LawOfficeSettings, 
  AuditLog 
} from '../types';
import { getCloudDatabaseConfig } from './databaseService';

// Supabase URL & Key detection
export const getSupabaseConfig = () => {
  // Try environment variables first
  let url = import.meta.env.VITE_SUPABASE_URL || '';
  let anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

  // Fallback to local storage settings
  if (!url || !anonKey) {
    const savedConfig = getCloudDatabaseConfig();
    if (savedConfig && savedConfig.supabase) {
      url = url || savedConfig.supabase.url || '';
      anonKey = anonKey || savedConfig.supabase.anonKey || '';
    }
  }

  return {
    url: url.trim(),
    anonKey: anonKey.trim(),
    isConfigured: !!url.trim() && !!anonKey.trim()
  };
};

// Lazy initializer for Supabase Client
let supabaseInstance: SupabaseClient | null = null;
export const getSupabase = (): SupabaseClient | null => {
  const { url, anonKey, isConfigured } = getSupabaseConfig();
  if (!isConfigured) return null;

  if (!supabaseInstance) {
    supabaseInstance = createClient(url, anonKey);
  }
  return supabaseInstance;
};

// Check if we can reach Supabase
export const testSupabaseConnection = async (): Promise<{ success: boolean; message: string }> => {
  const supabase = getSupabase();
  if (!supabase) {
    return { success: false, message: 'Supabase não configurado. Adicione a URL e a Anon Key nas configurações.' };
  }

  try {
    // Just run a simple quick query on office_settings or check system
    const { data, error } = await supabase.from('office_settings').select('id').limit(1);
    if (error) {
      // If error is table not found, connection worked, but schema is missing
      if (error.code === 'PGRST116' || error.message?.includes('does not exist')) {
        return { 
          success: true, 
          message: 'Conectado com sucesso! Mas atenção: as tabelas ainda não foram criadas no Supabase. Cole o script SQL no SQL Editor.' 
        };
      }
      return { success: false, message: `Erro de conexão: ${error.message} (Código ${error.code})` };
    }
    return { success: true, message: 'Conectado com sucesso! Comunicação com Supabase ativa e tabelas prontas.' };
  } catch (err: any) {
    return { success: false, message: `Erro inesperado ao conectar: ${err.message || err}` };
  }
};

// ==========================================
// DATA MAPPING UTILITIES (CamelCase <=> SnakeCase)
// ==========================================

export const mapOfficeToDb = (o: LawOfficeSettings) => ({
  id: 'main-office',
  office_name: o.officeName,
  office_brand_tagline: o.officeBrandTagline || '',
  cnpj: o.cnpj || '',
  email: o.email || '',
  phone: o.phone || '',
  whatsapp: o.whatsapp || '',
  address_street: o.address?.street || '',
  address_number: o.address?.number || '',
  address_complement: o.address?.complement || '',
  address_neighborhood: o.address?.neighborhood || '',
  address_city: o.address?.city || '',
  address_state: o.address?.state || '',
  address_zip_code: o.address?.zipCode || '',
  pix_key: o.bankAccount?.pixKey || '',
  pix_bank: o.bankAccount?.bankName || '',
  pix_agency: o.bankAccount?.agency || '',
  pix_account_number: o.bankAccount?.accountNumber || '',
  pix_account_holder: o.bankAccount?.accountHolder || '',
  primary_lawyer_name: o.primaryLawyer?.name || 'Dr. Vagner Schmidt da Silva',
  primary_lawyer_oab: o.primaryLawyer?.oabNumber || '45678',
  primary_lawyer_state: o.primaryLawyer?.oabState || 'GO',
  primary_lawyer_cpf: o.primaryLawyer?.cpf || '',
  primary_lawyer_email: o.primaryLawyer?.email || '',
  primary_lawyer_phone: o.primaryLawyer?.phone || '',
  primary_lawyer_nationality: (o.primaryLawyer as any)?.nationality || 'Brasileiro(a)',
  primary_lawyer_marital_status: (o.primaryLawyer as any)?.maritalStatus || 'Casado(a)',
});

export const mapDbToOffice = (row: any): LawOfficeSettings => {
  if (!row) return {
    officeName: 'WONO ADVOCACIA',
    officeBrandTagline: 'Assessoria Jurídica & Advocacia Estratégica',
    cnpj: '',
    email: 'contato@wonoadvocacia.com.br',
    phone: '',
    whatsapp: '',
    website: '',
    address: { street: '', number: '', complement: '', neighborhood: '', city: 'Goiânia', state: 'GO', zipCode: '' },
    bankAccount: { pixKey: '', bankName: '', agency: '', accountNumber: '', accountHolder: '' },
    primaryLawyer: { name: 'Dr. Vagner Schmidt da Silva', oabNumber: '45678', oabState: 'GO', cpf: '', email: '', phone: '' },
    additionalLawyers: []
  };
  return {
    officeName: row.office_name,
    officeBrandTagline: row.office_brand_tagline,
    cnpj: row.cnpj,
    email: row.email,
    phone: row.phone,
    whatsapp: row.whatsapp,
    website: row.website || '',
    address: {
      street: row.address_street,
      number: row.address_number,
      complement: row.address_complement,
      neighborhood: row.address_neighborhood,
      city: row.address_city,
      state: row.address_state,
      zipCode: row.address_zip_code,
    },
    bankAccount: {
      pixKey: row.pix_key,
      bankName: row.pix_bank,
      agency: row.pix_agency || '',
      accountNumber: row.pix_account_number || '',
      accountHolder: row.pix_account_holder || '',
    },
    primaryLawyer: {
      name: row.primary_lawyer_name,
      oabNumber: row.primary_lawyer_oab,
      oabState: row.primary_lawyer_state,
      cpf: row.primary_lawyer_cpf,
      email: row.primary_lawyer_email,
      phone: row.primary_lawyer_phone,
    },
    additionalLawyers: []
  };
};

export const mapTeamToDb = (m: TeamMember) => ({
  id: m.id,
  name: m.name,
  email: m.email,
  phone: m.phone || '',
  role: m.role,
  privilege: m.privilege,
  oab_number: m.oabNumber || '',
  oab_state: m.oabState || '',
  status: m.status || 'ativo',
  cases_assigned_count: m.casesAssignedCount || 0,
  avatar_color: m.avatarColor || '#3b82f6',
  created_at: m.createdAt || new Date().toISOString().split('T')[0],
});

export const mapDbToTeam = (row: any): TeamMember => ({
  id: row.id,
  name: row.name,
  email: row.email,
  phone: row.phone || '',
  role: row.role,
  privilege: row.privilege,
  oabNumber: row.oab_number,
  oabState: row.oab_state,
  status: row.status,
  casesAssignedCount: row.cases_assigned_count || 0,
  avatarColor: row.avatar_color || '#3b82f6',
  createdAt: row.created_at || new Date().toISOString().split('T')[0],
});

export const mapClientToDb = (c: Client) => ({
  id: c.id,
  name: c.name,
  type: c.type || 'PF',
  cpf_cnpj: c.cpfCnpj,
  rg_ie: c.rgIe || '',
  nationality: c.nationality || 'Brasileiro(a)',
  marital_status: c.maritalStatus || 'Solteiro(a)',
  profession: c.profession || '',
  email: c.email || '',
  phone: c.phone || '',
  whatsapp: c.whatsapp || '',
  address_street: c.address?.street || '',
  address_number: c.address?.number || '',
  address_complement: c.address?.complement || '',
  address_neighborhood: c.address?.neighborhood || '',
  address_city: c.address?.city || '',
  address_state: c.address?.state || '',
  address_zip_code: c.address?.zipCode || '',
  representative_name: c.representative?.name || '',
  representative_cpf: c.representative?.cpf || '',
  representative_rg: c.representative?.rg || '',
  representative_nationality: c.representative?.nationality || '',
  representative_marital_status: c.representative?.maritalStatus || '',
  representative_profession: c.representative?.profession || '',
  representative_role: c.representative?.role || '',
  is_gratuidade_justica_eligible: c.isGratuidadeJusticaEligible || false,
  notes: c.notes || '',
  created_at: c.createdAt || new Date().toISOString(),
  updated_at: new Date().toISOString(),
});

export const mapDbToClient = (row: any): Client => ({
  id: row.id,
  name: row.name,
  type: row.type || 'PF',
  cpfCnpj: row.cpf_cnpj,
  rgIe: row.rg_ie || '',
  nationality: row.nationality || 'brasileiro(a)',
  maritalStatus: row.marital_status || 'solteiro(a)',
  profession: row.profession || '',
  email: row.email || '',
  phone: row.phone || '',
  whatsapp: row.whatsapp || '',
  address: {
    street: row.address_street || '',
    number: row.address_number || '',
    complement: row.address_complement || '',
    neighborhood: row.address_neighborhood || '',
    city: row.address_city || '',
    state: row.address_state || '',
    zipCode: row.address_zip_code || '',
  },
  representative: row.representative_name ? {
    name: row.representative_name,
    cpf: row.representative_cpf,
    role: row.representative_role,
    rg: row.representative_rg || '',
    nationality: row.representative_nationality || 'brasileiro(a)',
    maritalStatus: row.representative_marital_status || 'solteiro(a)',
    profession: row.representative_profession || '',
  } : undefined,
  isGratuidadeJusticaEligible: row.is_gratuidade_justica_eligible || false,
  notes: row.notes || '',
  createdAt: row.created_at || new Date().toISOString().split('T')[0],
});

export const mapProcessToDb = (p: LegalProcess) => ({
  id: p.id,
  cnj_number: p.cnjNumber,
  court: p.court,
  sigla: (p as any).sigla || '',
  instance: (p as any).instance || '1ª Instância',
  branch_vara: p.branchVara || '',
  comarca: p.comarca || '',
  lawsuit_type: p.lawsuitType || '',
  subject: p.subject || '',
  value: p.value || 0,
  distribution_date: p.distributionDate || new Date().toISOString().split('T')[0],
  status: p.status || 'Ativo',
  active_party: p.activeParty || '',
  passive_party: p.passiveParty || '',
  judge: p.judge || '',
  responsible_lawyer: p.responsibleLawyer || '',
  client_id: p.clientId || null,
  digital_link: (p as any).digitalLink || '',
  notes: p.notes || '',
  created_at: (p as any).createdAt || new Date().toISOString(),
  updated_at: new Date().toISOString(),
});

export const mapDbToProcess = (row: any, movementsRow: any[] = []): LegalProcess => {
  const proc: LegalProcess = {
    id: row.id,
    cnjNumber: row.cnj_number,
    court: row.court,
    branchVara: row.branch_vara,
    comarca: row.comarca,
    lawsuitType: row.lawsuit_type,
    subject: row.subject,
    value: Number(row.value) || 0,
    distributionDate: row.distribution_date,
    status: row.status,
    activeParty: row.active_party,
    passiveParty: row.passive_party,
    judge: row.judge,
    responsibleLawyer: row.responsible_lawyer,
    clientId: row.client_id,
    notes: row.notes,
    lastSyncDate: row.updated_at || new Date().toISOString(),
    movements: movementsRow.map(mov => ({
      id: mov.id,
      date: mov.movement_date,
      code: mov.code,
      title: mov.title,
      description: mov.description,
      organ: mov.organ,
      isJudicialDecision: mov.is_judicial_decision,
      deadlineDays: mov.deadline_days,
    })).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
  };
  (proc as any).sigla = row.sigla;
  (proc as any).instance = row.instance;
  (proc as any).digitalLink = row.digital_link;
  (proc as any).createdAt = row.created_at;
  return proc;
};

export const mapMovementToDb = (m: any, processId: string) => ({
  id: m.id,
  process_id: processId,
  movement_date: m.date || new Date().toISOString(),
  code: m.code || '99999',
  title: m.title,
  description: m.description || '',
  organ: m.organ || '',
  is_judicial_decision: !!m.isJudicialDecision,
  deadline_days: m.deadlineDays || null,
});

export const mapDeadlineToDb = (d: ProcessDeadline) => ({
  id: d.id,
  process_id: d.processId || null,
  process_number: d.processNumber || '',
  client_name: d.clientName || '',
  title: d.title,
  start_date: d.startDate || new Date().toISOString().split('T')[0],
  due_date: d.fatalDate,
  type: d.type || 'Prazo CPC',
  status: d.status || 'pendente',
  completed: d.status === 'cumprido',
  priority: (d as any).priority || 'media',
  responsible_lawyer: d.responsibleLawyer || '',
  notes: d.notes || '',
  reminder_hours: d.reminderHours || null,
  reminder_notified: d.reminderNotified || false,
  created_at: (d as any).createdAt || new Date().toISOString(),
});

export const mapDbToDeadline = (row: any): ProcessDeadline => {
  const diffTime = new Date(row.due_date).getTime() - Date.now();
  const daysLeft = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  const deadline: ProcessDeadline = {
    id: row.id,
    processId: row.process_id || '',
    processNumber: row.process_number || '',
    clientName: row.client_name || '',
    title: row.title,
    type: row.type || 'Prazo CPC',
    startDate: row.start_date || new Date().toISOString().split('T')[0],
    fatalDate: row.due_date,
    status: row.completed ? 'cumprido' : (row.status || 'pendente'),
    responsibleLawyer: row.responsible_lawyer,
    notes: row.notes,
    daysLeft: daysLeft,
    reminderHours: row.reminder_hours || undefined,
    reminderNotified: row.reminder_notified || false,
  };
  (deadline as any).priority = row.priority || 'media';
  (deadline as any).createdAt = row.created_at;
  return deadline;
};

export const mapDocumentToDb = (doc: LegalDocumentItem) => ({
  id: doc.id,
  type: doc.type,
  title: doc.title,
  client_id: doc.clientId || null,
  process_id: doc.processId || null,
  status: doc.status || 'rascunho',
  powers: doc.powers ? JSON.stringify(doc.powers) : null,
  fees: doc.fees ? JSON.stringify(doc.fees) : null,
  custom_clauses: doc.customClauses ? JSON.stringify(doc.customClauses) : null,
  substabelecido_nome: doc.substabelecidoNome || '',
  substabelecido_oab: doc.substabelecidoOAB || '',
  receipt_value: doc.receiptValue || null,
  receipt_reference: doc.receiptReference || '',
  content: (doc as any).content || '',
  created_at: doc.createdAt || new Date().toISOString(),
  updated_at: new Date().toISOString(),
});

export const mapDbToDocument = (row: any): LegalDocumentItem => {
  const doc: LegalDocumentItem = {
    id: row.id,
    type: row.type,
    title: row.title,
    clientId: row.client_id,
    processId: row.process_id,
    status: row.status || 'rascunho',
    powers: row.powers ? (typeof row.powers === 'string' ? JSON.parse(row.powers) : row.powers) : undefined,
    fees: row.fees ? (typeof row.fees === 'string' ? JSON.parse(row.fees) : row.fees) : undefined,
    customClauses: row.custom_clauses ? (typeof row.custom_clauses === 'string' ? JSON.parse(row.custom_clauses) : row.custom_clauses) : undefined,
    substabelecidoNome: row.substabelecido_nome,
    substabelecidoOAB: row.substabelecido_oab,
    receiptValue: row.receipt_value,
    receiptReference: row.receipt_reference,
    createdAt: row.created_at,
  };
  (doc as any).content = row.content || '';
  return doc;
};

export const mapFinancialToDb = (f: FinancialRecord) => ({
  id: f.id,
  title: f.title,
  category: f.category, // 'Receita' | 'Despesa'
  type: f.type,
  client_id: f.clientId || null,
  client_name: f.clientName || 'Cliente Geral',
  process_id: f.processId || null,
  process_number: f.processNumber || '',
  amount: f.amount || 0,
  due_date: f.dueDate,
  payment_date: f.paymentDate || null,
  status: f.status || 'Pendente',
  payment_method: f.paymentMethod || 'PIX',
  notes: f.notes || '',
  created_at: f.createdAt || new Date().toISOString(),
});

export const mapDbToFinancial = (row: any): FinancialRecord => ({
  id: row.id,
  title: row.title,
  category: row.category as 'Receita' | 'Despesa',
  type: row.type as any,
  clientId: row.client_id,
  clientName: row.client_name || 'Cliente Geral',
  processId: row.process_id,
  processNumber: row.process_number || '',
  amount: Number(row.amount) || 0,
  dueDate: row.due_date,
  paymentDate: row.payment_date,
  status: row.status as any,
  paymentMethod: (row.payment_method || 'PIX') as any,
  notes: row.notes,
  createdAt: row.created_at,
});

export const mapAuditToDb = (log: AuditLog) => ({
  id: log.id,
  timestamp: log.timestamp || new Date().toISOString(),
  user_name: log.userName || '',
  user_role: log.userRole || '',
  action: log.action,
  entity: log.entity,
  description: log.description || '',
});

export const mapDbToAudit = (row: any): AuditLog => ({
  id: row.id,
  timestamp: row.timestamp,
  userName: row.user_name || '',
  userRole: row.user_role || '',
  action: row.action as any,
  entity: row.entity as any,
  description: row.description || '',
});

// ==========================================
// LIVE SYNC OPERATIONS
// ==========================================

export const syncAllFromSupabase = async (): Promise<{
  success: boolean;
  data?: {
    office: LawOfficeSettings;
    clients: Client[];
    processes: LegalProcess[];
    deadlines: ProcessDeadline[];
    documents: LegalDocumentItem[];
    teamMembers: TeamMember[];
    financialRecords: FinancialRecord[];
    auditLogs: AuditLog[];
  };
  message: string;
}> => {
  const supabase = getSupabase();
  if (!supabase) return { success: false, message: 'Supabase não configurado.' };

  try {
    // 1. Fetch in parallel
    const [
      resOffice,
      resTeam,
      resClients,
      resProcesses,
      resMovements,
      resDeadlines,
      resDocuments,
      resFinancial,
      resAudit
    ] = await Promise.all([
      supabase.from('office_settings').select('*').limit(1),
      supabase.from('team_members').select('*'),
      supabase.from('clients').select('*'),
      supabase.from('legal_processes').select('*'),
      supabase.from('process_movements').select('*'),
      supabase.from('process_deadlines').select('*'),
      supabase.from('legal_documents').select('*'),
      supabase.from('financial_records').select('*'),
      supabase.from('audit_logs').select('*').order('timestamp', { ascending: false }).limit(200),
    ]);

    // Handle initial schema empty errors gracefully
    if (resOffice.error || resTeam.error || resClients.error || resProcesses.error) {
      const err = resOffice.error || resTeam.error || resClients.error || resProcesses.error;
      if (err?.message?.includes('does not exist')) {
        return { 
          success: false, 
          message: 'As tabelas necessárias não existem no Supabase. Por favor, vá até a aba de banco de dados e execute o script SQL.' 
        };
      }
      return { success: false, message: `Erro ao buscar dados: ${err?.message}` };
    }

    // 2. Map data
    const office = resOffice.data?.[0] ? mapDbToOffice(resOffice.data[0]) : mapDbToOffice(null);
    const teamMembers = (resTeam.data || []).map(mapDbToTeam);
    const clients = (resClients.data || []).map(mapDbToClient);
    
    // Group movements by process_id
    const movementsByProcId: Record<string, any[]> = {};
    (resMovements.data || []).forEach(mov => {
      if (!movementsByProcId[mov.process_id]) movementsByProcId[mov.process_id] = [];
      movementsByProcId[mov.process_id].push(mov);
    });

    const processes = (resProcesses.data || []).map(row => 
      mapDbToProcess(row, movementsByProcId[row.id] || [])
    );

    const deadlines = (resDeadlines.data || []).map(mapDbToDeadline);
    const documents = (resDocuments.data || []).map(mapDbToDocument);
    const financialRecords = (resFinancial.data || []).map(mapDbToFinancial);
    const auditLogs = (resAudit.data || []).map(mapDbToAudit);

    return {
      success: true,
      data: {
        office,
        clients,
        processes,
        deadlines,
        documents,
        teamMembers,
        financialRecords,
        auditLogs,
      },
      message: 'Sincronização com Supabase concluída com sucesso!'
    };
  } catch (err: any) {
    return { success: false, message: `Erro ao sincronizar do Supabase: ${err.message || err}` };
  }
};

export const syncAllToSupabase = async (data: {
  office: LawOfficeSettings;
  clients: Client[];
  processes: LegalProcess[];
  deadlines: ProcessDeadline[];
  documents: LegalDocumentItem[];
  teamMembers: TeamMember[];
  financialRecords: FinancialRecord[];
  auditLogs: AuditLog[];
}): Promise<{ success: boolean; message: string }> => {
  const supabase = getSupabase();
  if (!supabase) return { success: false, message: 'Supabase não configurado.' };

  try {
    // 1. Office Settings
    const officeDb = mapOfficeToDb(data.office);
    await supabase.from('office_settings').upsert(officeDb);

    // 2. Team Members
    if (data.teamMembers.length > 0) {
      const teamDb = data.teamMembers.map(mapTeamToDb);
      await supabase.from('team_members').upsert(teamDb);
    }

    // 3. Clients
    if (data.clients.length > 0) {
      const clientsDb = data.clients.map(mapClientToDb);
      await supabase.from('clients').upsert(clientsDb);
    }

    // 4. Processes and Movements (Cascade)
    if (data.processes.length > 0) {
      const processesDb = data.processes.map(mapProcessToDb);
      await supabase.from('legal_processes').upsert(processesDb);

      // Extract all movements
      const movementsDb = data.processes.flatMap(p => 
        (p.movements || []).map(m => mapMovementToDb(m, p.id))
      );
      if (movementsDb.length > 0) {
        await supabase.from('process_movements').upsert(movementsDb);
      }
    }

    // 5. Deadlines
    if (data.deadlines.length > 0) {
      const deadlinesDb = data.deadlines.map(mapDeadlineToDb);
      await supabase.from('process_deadlines').upsert(deadlinesDb);
    }

    // 6. Documents
    if (data.documents.length > 0) {
      const docsDb = data.documents.map(mapDocumentToDb);
      await supabase.from('legal_documents').upsert(docsDb);
    }

    // 7. Financial Records
    if (data.financialRecords.length > 0) {
      const finDb = data.financialRecords.map(mapFinancialToDb);
      await supabase.from('financial_records').upsert(finDb);
    }

    // 8. Audit Logs
    if (data.auditLogs.length > 0) {
      // Limit to last 100 to avoid batch size limits
      const logsDb = data.auditLogs.slice(0, 100).map(mapAuditToDb);
      await supabase.from('audit_logs').upsert(logsDb);
    }

    return { success: true, message: 'Todos os dados locais foram publicados no Supabase com sucesso!' };
  } catch (err: any) {
    return { success: false, message: `Erro ao enviar dados para o Supabase: ${err.message || err}` };
  }
};

// ==========================================
// DELETION & SYNC SINGLE ROW HELPER
// ==========================================

export const upsertSingleRow = async (table: string, mappedRow: any): Promise<boolean> => {
  const supabase = getSupabase();
  if (!supabase) return false;
  try {
    const { error } = await supabase.from(table).upsert(mappedRow);
    if (error) {
      console.error(`[Supabase] Erro ao salvar na tabela ${table}:`, error);
      return false;
    }
    return true;
  } catch (err) {
    console.error(`[Supabase] Falha de comunicação na tabela ${table}:`, err);
    return false;
  }
};

export const deleteSingleRow = async (table: string, id: string): Promise<boolean> => {
  const supabase = getSupabase();
  if (!supabase) return false;
  try {
    const { error } = await supabase.from(table).delete().eq('id', id);
    if (error) {
      console.error(`[Supabase] Erro ao deletar da tabela ${table}:`, error);
      return false;
    }
    return true;
  } catch (err) {
    console.error(`[Supabase] Falha de comunicação na tabela ${table}:`, err);
    return false;
  }
};

// ==========================================
// PURGE / RESET DATABASE FUNCTION
// ==========================================

export const purgeAllSupabaseTables = async (): Promise<{ success: boolean; message: string }> => {
  const supabase = getSupabase();
  if (!supabase) return { success: true, message: 'Supabase não configurado. Limpeza ignorada com sucesso (modo local ativo).' };

  try {
    // Delete in order to satisfy foreign key constraints
    await Promise.all([
      supabase.from('audit_logs').delete().neq('id', 'temp_placeholder'),
      supabase.from('legal_documents').delete().neq('id', 'temp_placeholder'),
      supabase.from('financial_records').delete().neq('id', 'temp_placeholder'),
      supabase.from('process_deadlines').delete().neq('id', 'temp_placeholder'),
      supabase.from('process_movements').delete().neq('id', 'temp_placeholder'),
    ]);

    // Now delete main parents
    await Promise.all([
      supabase.from('legal_processes').delete().neq('id', 'temp_placeholder'),
    ]);

    await Promise.all([
      supabase.from('clients').delete().neq('id', 'temp_placeholder'),
      supabase.from('team_members').delete().neq('id', 'vagner_admin_root'), // Keep main admin if desired
    ]);

    return { success: true, message: 'Tabelas do Supabase limpas com sucesso!' };
  } catch (err: any) {
    return { success: false, message: `Erro ao limpar tabelas no Supabase: ${err.message || err}` };
  }
};
