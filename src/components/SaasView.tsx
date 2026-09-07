import React, { useState } from 'react';
import { 
  Building2, 
  Users, 
  DollarSign, 
  ShieldCheck, 
  Zap, 
  Plus, 
  Search, 
  Edit, 
  Trash2, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  Download, 
  Upload, 
  Sparkles, 
  Scale, 
  CreditCard, 
  Lock, 
  Check, 
  Calendar, 
  BarChart3, 
  FileSpreadsheet, 
  Layers, 
  RefreshCw,
  Sliders,
  Database,
  Globe
} from 'lucide-react';
import { 
  TeamMember, 
  FinancialRecord, 
  SaaSTenantConfig, 
  AuditLog, 
  LawOfficeSettings, 
  Client, 
  LegalProcess, 
  ProcessDeadline, 
  LegalDocumentItem,
  TeamMemberRole,
  FinancialType,
  FinancialStatus
} from '../types';
import { formatCurrencyBRL } from '../utils/documentGenerator';
import { CloudDatabaseNetlifyView } from './CloudDatabaseNetlifyView';

interface SaasViewProps {
  office: LawOfficeSettings;
  tenantConfig?: SaaSTenantConfig;
  saasConfig?: SaaSTenantConfig;
  teamMembers: TeamMember[];
  financialRecords: FinancialRecord[];
  auditLogs: AuditLog[];
  clients?: Client[];
  processes?: LegalProcess[];
  deadlines?: ProcessDeadline[];
  documents?: LegalDocumentItem[];
  processesCount?: number;
  clientsCount?: number;
  onUpdateTenantConfig?: (config: SaaSTenantConfig) => void;
  onUpdateSaasConfig?: (config: SaaSTenantConfig) => void;
  onAddTeamMember: (member: TeamMember) => void;
  onUpdateTeamMember: (member: TeamMember) => void;
  onDeleteTeamMember: (id: string) => void;
  onAddFinancialRecord: (record: FinancialRecord) => void;
  onUpdateFinancialRecord: (record: FinancialRecord) => void;
  onDeleteFinancialRecord: (id: string) => void;
  onImportFullBackup?: (importedData: any) => void;
  onOpenDatabaseInstaller?: () => void;
  activeUser?: TeamMember;
}

export const SaasView: React.FC<SaasViewProps> = ({
  office,
  tenantConfig: propTenantConfig,
  saasConfig: propSaasConfig,
  teamMembers,
  financialRecords,
  auditLogs,
  clients = [],
  processes = [],
  deadlines = [],
  documents = [],
  processesCount = 0,
  clientsCount = 0,
  onUpdateTenantConfig,
  onUpdateSaasConfig,
  onAddTeamMember,
  onUpdateTeamMember,
  onDeleteTeamMember,
  onAddFinancialRecord,
  onUpdateFinancialRecord,
  onDeleteFinancialRecord,
  onImportFullBackup = (_importedData: any) => {},
  onOpenDatabaseInstaller,
  activeUser,
}) => {
  const tenantConfig = propTenantConfig || propSaasConfig || {
    tenantId: 'wono-main',
    plan: 'enterprise',
    userSeatsLimit: 10,
    storageLimitMB: 51200,
    storageUsedMB: 1840,
    processLimit: 1000,
    dataJudMonthlyLimit: 5000,
    dataJudQueriesCount: 842,
    aiMonthlyTokensLimit: 1000000,
    aiTokensUsedCount: 142800,
    activeModules: {
      dataJudSync: true,
      aiDocumentGeneration: true,
      whatsappAutomation: true,
      multiUserAudit: true,
      financialManagement: true,
      customBranding: true,
    },
    renewalDate: '2026-12-31',
    backupFrequency: 'diario',
  };

  const handleUpdateConfig = (config: SaaSTenantConfig) => {
    if (onUpdateTenantConfig) onUpdateTenantConfig(config);
    if (onUpdateSaasConfig) onUpdateSaasConfig(config);
  };

  const isGeneralAdmin = activeUser?.role === 'Sócio Administrador' || activeUser?.privilege === 'total';

  const [activeSubTab, setActiveSubTabState] = useState<'equipe' | 'financeiro' | 'planos' | 'auditoria' | 'banco-dados' | 'deploy-netlify'>(() => {
    return (localStorage.getItem('wono_saas_active_subtab') as any) || 'equipe';
  });

  const setActiveSubTab = (tab: 'equipe' | 'financeiro' | 'planos' | 'auditoria' | 'banco-dados' | 'deploy-netlify') => {
    localStorage.setItem('wono_saas_active_subtab', tab);
    setActiveSubTabState(tab);
  };

  // Search and filters
  const [teamSearch, setTeamSearch] = useState('');
  const [finSearch, setFinSearch] = useState('');
  const [finStatusFilter, setFinStatusFilter] = useState<string>('todos');

  // Team Member Modal State (Create / Edit)
  const [isTeamModalOpen, setIsTeamModalOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<TeamMember | null>(null);
  const [memberName, setMemberName] = useState('');
  const [memberEmail, setMemberEmail] = useState('');
  const [memberPhone, setMemberPhone] = useState('');
  const [memberRole, setMemberRole] = useState<TeamMemberRole>('Advogado Pleno');
  const [memberPrivilege, setMemberPrivilege] = useState<'total' | 'parcial' | 'leitura'>('parcial');
  const [memberOab, setMemberOab] = useState('');
  const [memberOabState, setMemberOabState] = useState('SP');
  const [memberStatus, setMemberStatus] = useState<'ativo' | 'inativo'>('ativo');

  // Financial Record Modal State (Create / Edit)
  const [isFinModalOpen, setIsFinModalOpen] = useState(false);
  const [editingFin, setEditingFin] = useState<FinancialRecord | null>(null);
  const [finTitle, setFinTitle] = useState('');
  const [finCategory, setFinCategory] = useState<'Receita' | 'Despesa'>('Receita');
  const [finType, setFinType] = useState<FinancialType>('Honorários Iniciais (Pró-labore)');
  const [finClientId, setFinClientId] = useState<string>(clients[0]?.id || '');
  const [finProcessId, setFinProcessId] = useState<string>('');
  const [finAmount, setFinAmount] = useState<number>(1500);
  const [finDueDate, setFinDueDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [finStatus, setFinStatus] = useState<FinancialStatus>('Pendente');
  const [finPaymentMethod, setFinPaymentMethod] = useState<'PIX' | 'Boleto Bancário' | 'Cartão de Crédito' | 'TED / Transferência'>('PIX');
  const [finNotes, setFinNotes] = useState('');

  // Delete Confirm Modal
  const [deleteConfirm, setDeleteConfirm] = useState<{
    isOpen: boolean;
    type: 'team' | 'fin';
    id: string;
    title: string;
  }>({
    isOpen: false,
    type: 'team',
    id: '',
    title: '',
  });

  // Calculate SaaS Financial Summary
  const totalReceitas = financialRecords
    .filter((f) => f.category === 'Receita')
    .reduce((acc, f) => acc + f.amount, 0);

  const totalRecebido = financialRecords
    .filter((f) => f.category === 'Receita' && f.status === 'Pago')
    .reduce((acc, f) => acc + f.amount, 0);

  const totalPendente = financialRecords
    .filter((f) => f.category === 'Receita' && f.status === 'Pendente')
    .reduce((acc, f) => acc + f.amount, 0);

  const totalDespesas = financialRecords
    .filter((f) => f.category === 'Despesa')
    .reduce((acc, f) => acc + f.amount, 0);

  // Open Team Modal (New or Edit)
  const handleOpenTeamModal = (member?: TeamMember) => {
    if (member) {
      setEditingMember(member);
      setMemberName(member.name);
      setMemberEmail(member.email);
      setMemberPhone(member.phone);
      setMemberRole(member.role);
      setMemberPrivilege(member.privilege || 'parcial');
      setMemberOab(member.oabNumber || '');
      setMemberOabState(member.oabState || 'SP');
      setMemberStatus(member.status);
    } else {
      setEditingMember(null);
      setMemberName('');
      setMemberEmail('');
      setMemberPhone('');
      setMemberRole('Advogado Pleno');
      setMemberPrivilege('parcial');
      setMemberOab('');
      setMemberOabState('SP');
      setMemberStatus('ativo');
    }
    setIsTeamModalOpen(true);
  };

  const handleSaveTeamMember = (e: React.FormEvent) => {
    e.preventDefault();
    if (!memberName || !memberEmail) return;

    if (editingMember) {
      const updated: TeamMember = {
        ...editingMember,
        name: memberName,
        email: memberEmail,
        phone: memberPhone,
        role: memberRole,
        privilege: memberPrivilege,
        oabNumber: memberOab || undefined,
        oabState: memberOab ? memberOabState : undefined,
        status: memberStatus,
      };
      onUpdateTeamMember(updated);
    } else {
      const avatarColors = [
        'from-amber-500 to-amber-700',
        'from-emerald-500 to-teal-700',
        'from-blue-500 to-indigo-700',
        'from-purple-500 to-pink-700',
        'from-cyan-500 to-blue-700'
      ];
      const newMember: TeamMember = {
        id: `team-${Date.now()}`,
        name: memberName,
        email: memberEmail,
        phone: memberPhone,
        role: memberRole,
        privilege: memberPrivilege,
        oabNumber: memberOab || undefined,
        oabState: memberOab ? memberOabState : undefined,
        status: memberStatus,
        casesAssignedCount: 0,
        avatarColor: avatarColors[teamMembers.length % avatarColors.length],
        createdAt: new Date().toISOString().split('T')[0],
      };
      onAddTeamMember(newMember);
    }
    setIsTeamModalOpen(false);
  };

  // Open Financial Modal (New or Edit)
  const handleOpenFinModal = (record?: FinancialRecord) => {
    if (record) {
      setEditingFin(record);
      setFinTitle(record.title);
      setFinCategory(record.category);
      setFinType(record.type);
      setFinClientId(record.clientId || '');
      setFinProcessId(record.processId || '');
      setFinAmount(record.amount);
      setFinDueDate(record.dueDate);
      setFinStatus(record.status);
      setFinPaymentMethod(record.paymentMethod);
      setFinNotes(record.notes || '');
    } else {
      setEditingFin(null);
      setFinTitle('Honorários Contratuais');
      setFinCategory('Receita');
      setFinType('Honorários Iniciais (Pró-labore)');
      setFinClientId(clients[0]?.id || '');
      setFinProcessId('');
      setFinAmount(1500);
      setFinDueDate(new Date().toISOString().split('T')[0]);
      setFinStatus('Pendente');
      setFinPaymentMethod('PIX');
      setFinNotes('');
    }
    setIsFinModalOpen(true);
  };

  const handleSaveFinancialRecord = (e: React.FormEvent) => {
    e.preventDefault();
    if (!finTitle || finAmount <= 0) return;

    const matchedClient = clients.find((c) => c.id === finClientId);
    const matchedProcess = processes.find((p) => p.id === finProcessId);

    if (editingFin) {
      const updated: FinancialRecord = {
        ...editingFin,
        title: finTitle,
        category: finCategory,
        type: finType,
        clientId: finClientId || undefined,
        clientName: matchedClient ? matchedClient.name : 'Geral / Não vinculado',
        processId: finProcessId || undefined,
        processNumber: matchedProcess ? matchedProcess.cnjNumber : undefined,
        amount: Number(finAmount),
        dueDate: finDueDate,
        status: finStatus,
        paymentDate: finStatus === 'Pago' ? (editingFin.paymentDate || new Date().toISOString().split('T')[0]) : undefined,
        paymentMethod: finPaymentMethod,
        notes: finNotes,
      };
      onUpdateFinancialRecord(updated);
    } else {
      const newFin: FinancialRecord = {
        id: `fin-${Date.now()}`,
        title: finTitle,
        category: finCategory,
        type: finType,
        clientId: finClientId || undefined,
        clientName: matchedClient ? matchedClient.name : 'Geral / Não vinculado',
        processId: finProcessId || undefined,
        processNumber: matchedProcess ? matchedProcess.cnjNumber : undefined,
        amount: Number(finAmount),
        dueDate: finDueDate,
        status: finStatus,
        paymentDate: finStatus === 'Pago' ? new Date().toISOString().split('T')[0] : undefined,
        paymentMethod: finPaymentMethod,
        notes: finNotes,
        createdAt: new Date().toISOString().split('T')[0],
      };
      onAddFinancialRecord(newFin);
    }
    setIsFinModalOpen(false);
  };

  const handleToggleFinPaid = (record: FinancialRecord) => {
    const nextStatus: FinancialStatus = record.status === 'Pago' ? 'Pendente' : 'Pago';
    const updated: FinancialRecord = {
      ...record,
      status: nextStatus,
      paymentDate: nextStatus === 'Pago' ? new Date().toISOString().split('T')[0] : undefined,
    };
    onUpdateFinancialRecord(updated);
  };

  // Export Full SaaS Database (JSON)
  const handleExportFullDatabase = () => {
    const fullBackup = {
      version: '1.0.0',
      exportedAt: new Date().toISOString(),
      office,
      tenantConfig,
      teamMembers,
      clients,
      processes,
      deadlines,
      documents,
      financialRecords,
      auditLogs,
    };

    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(fullBackup, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `wono_advocacia_backup_${new Date().toISOString().split('T')[0]}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  // Import JSON Backup
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        if (parsed && (parsed.clients || parsed.processes || parsed.office)) {
          onImportFullBackup(parsed);
          alert('Backup restaurado com sucesso no workspace WONO ADVOCACIA!');
        } else {
          alert('Arquivo JSON inválido. Estrutura não reconhecida.');
        }
      } catch (err) {
        alert('Erro ao processar arquivo de backup.');
      }
    };
    reader.readAsText(file);
  };

  // Filtered members
  const filteredTeam = teamMembers.filter((m) => {
    if (!teamSearch.trim()) return true;
    const q = teamSearch.toLowerCase();
    return (
      m.name.toLowerCase().includes(q) ||
      m.email.toLowerCase().includes(q) ||
      m.role.toLowerCase().includes(q) ||
      (m.oabNumber && m.oabNumber.toLowerCase().includes(q))
    );
  });

  // Filtered financial
  const filteredFin = financialRecords.filter((f) => {
    if (finStatusFilter !== 'todos' && f.status.toLowerCase() !== finStatusFilter.toLowerCase()) return false;
    if (!finSearch.trim()) return true;
    const q = finSearch.toLowerCase();
    return (
      f.title.toLowerCase().includes(q) ||
      f.clientName.toLowerCase().includes(q) ||
      f.type.toLowerCase().includes(q) ||
      (f.processNumber && f.processNumber.includes(q))
    );
  });

  return (
    <div className="space-y-6">
      {/* SaaS Workspace Header Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 w-96 h-96 bg-amber-500/5 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20"></div>

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <span className="text-xs font-black uppercase tracking-wider px-3 py-1 rounded-full bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20 flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 fill-current" />
                WONO {tenantConfig.plan.toUpperCase()}
              </span>
              <span className="text-xs text-emerald-400 font-semibold flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                Ambiente SaaS Ativo
              </span>
              <span className="text-xs text-slate-400 font-mono">
                Renovação: {new Date(tenantConfig.renewalDate).toLocaleDateString('pt-BR')}
              </span>
            </div>

            <h2 className="text-2xl font-black text-slate-100 tracking-tight flex items-center gap-2">
              <Building2 className="w-7 h-7 text-amber-400" />
              {office.officeName || 'WONO ADVOCACIA'} • Central SaaS & Workspace
            </h2>
            <p className="text-xs text-slate-400 max-w-3xl leading-relaxed">
              Plataforma completa de gestão jurídica multiusuário, controle financeiro de honorários, auditoria LGPD e integração com tribunais federais e estaduais (DataJud).
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={handleExportFullDatabase}
              className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl border border-slate-700 flex items-center gap-2 transition cursor-pointer"
            >
              <Download className="w-4 h-4 text-amber-400" />
              Backup Integral JSON
            </button>
            <label className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl border border-slate-700 flex items-center gap-2 transition cursor-pointer">
              <Upload className="w-4 h-4 text-emerald-400" />
              Importar Backup
              <input type="file" accept=".json" onChange={handleFileUpload} className="hidden" />
            </label>
          </div>
        </div>

        {/* Quota Progress Meters */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6 pt-6 border-t border-slate-800/80 text-xs">
          <div className="bg-slate-950/70 p-3.5 rounded-xl border border-slate-800/80 space-y-1.5">
            <div className="flex items-center justify-between text-slate-400">
              <span className="flex items-center gap-1 font-medium">
                <Scale className="w-3.5 h-3.5 text-amber-400" /> Processos
              </span>
              <span className="font-bold text-slate-200">{processes.length} / {tenantConfig.processLimit}</span>
            </div>
            <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
              <div 
                className="h-full bg-amber-500 rounded-full" 
                style={{ width: `${Math.min(100, (processes.length / tenantConfig.processLimit) * 100)}%` }}
              ></div>
            </div>
          </div>

          <div className="bg-slate-950/70 p-3.5 rounded-xl border border-slate-800/80 space-y-1.5">
            <div className="flex items-center justify-between text-slate-400">
              <span className="flex items-center gap-1 font-medium">
                <Users className="w-3.5 h-3.5 text-emerald-400" /> Usuários / Equipe
              </span>
              <span className="font-bold text-slate-200">{teamMembers.length} / {tenantConfig.userSeatsLimit}</span>
            </div>
            <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
              <div 
                className="h-full bg-emerald-500 rounded-full" 
                style={{ width: `${Math.min(100, (teamMembers.length / tenantConfig.userSeatsLimit) * 100)}%` }}
              ></div>
            </div>
          </div>

          <div className="bg-slate-950/70 p-3.5 rounded-xl border border-slate-800/80 space-y-1.5">
            <div className="flex items-center justify-between text-slate-400">
              <span className="flex items-center gap-1 font-medium">
                <Sparkles className="w-3.5 h-3.5 text-purple-400" /> IA & DataJud
              </span>
              <span className="font-bold text-slate-200">{tenantConfig.dataJudQueriesCount} / {tenantConfig.dataJudMonthlyLimit}</span>
            </div>
            <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
              <div 
                className="h-full bg-purple-500 rounded-full" 
                style={{ width: `${Math.min(100, (tenantConfig.dataJudQueriesCount / tenantConfig.dataJudMonthlyLimit) * 100)}%` }}
              ></div>
            </div>
          </div>

          <div className="bg-slate-950/70 p-3.5 rounded-xl border border-slate-800/80 space-y-1.5">
            <div className="flex items-center justify-between text-slate-400">
              <span className="flex items-center gap-1 font-medium">
                <Lock className="w-3.5 h-3.5 text-blue-400" /> Armazenamento
              </span>
              <span className="font-bold text-slate-200">{(tenantConfig.storageUsedMB / 1024).toFixed(1)} GB / {(tenantConfig.storageLimitMB / 1024).toFixed(0)} GB</span>
            </div>
            <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
              <div 
                className="h-full bg-blue-500 rounded-full" 
                style={{ width: `${Math.min(100, (tenantConfig.storageUsedMB / tenantConfig.storageLimitMB) * 100)}%` }}
              ></div>
            </div>
          </div>
        </div>
      </div>

      {/* SaaS Tabs Navigation */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-2 overflow-x-auto text-xs">
        <button
          onClick={() => setActiveSubTab('equipe')}
          className={`px-4 py-2 rounded-xl font-bold transition flex items-center gap-2 cursor-pointer ${
            activeSubTab === 'equipe'
              ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
              : 'bg-slate-900 text-slate-400 hover:text-slate-200 hover:bg-slate-850'
          }`}
        >
          <Users className="w-4 h-4" />
          Equipe & Licenças OAB ({teamMembers.length})
        </button>

        <button
          onClick={() => setActiveSubTab('financeiro')}
          className={`px-4 py-2 rounded-xl font-bold transition flex items-center gap-2 cursor-pointer ${
            activeSubTab === 'financeiro'
              ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
              : 'bg-slate-900 text-slate-400 hover:text-slate-200 hover:bg-slate-850'
          }`}
        >
          {isGeneralAdmin ? (
            <DollarSign className="w-4 h-4" />
          ) : (
            <Lock className="w-3.5 h-3.5 text-amber-500 shrink-0" />
          )}
          Financeiro & Honorários SaaS ({financialRecords.length})
        </button>

        <button
          onClick={() => setActiveSubTab('planos')}
          className={`px-4 py-2 rounded-xl font-bold transition flex items-center gap-2 cursor-pointer ${
            activeSubTab === 'planos'
              ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
              : 'bg-slate-900 text-slate-400 hover:text-slate-200 hover:bg-slate-850'
          }`}
        >
          <Zap className="w-4 h-4" />
          Planos & Assinatura WONO
        </button>

        <button
          onClick={() => setActiveSubTab('auditoria')}
          className={`px-4 py-2 rounded-xl font-bold transition flex items-center gap-2 cursor-pointer ${
            activeSubTab === 'auditoria'
              ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
              : 'bg-slate-900 text-slate-400 hover:text-slate-200 hover:bg-slate-850'
          }`}
        >
          <ShieldCheck className="w-4 h-4" />
          Auditoria LGPD & Logs ({auditLogs.length})
        </button>

        <button
          onClick={() => setActiveSubTab('banco-dados')}
          className={`px-4 py-2 rounded-xl font-bold transition flex items-center gap-2 cursor-pointer ${
            activeSubTab === 'banco-dados'
              ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
              : 'bg-slate-900 text-slate-400 hover:text-slate-200 hover:bg-slate-850'
          }`}
        >
          <Database className="w-4 h-4 text-emerald-400" />
          Banco de Dados Grátis (Firebase / Supabase)
        </button>

        <button
          onClick={() => setActiveSubTab('deploy-netlify')}
          className={`px-4 py-2 rounded-xl font-bold transition flex items-center gap-2 cursor-pointer ${
            activeSubTab === 'deploy-netlify'
              ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
              : 'bg-slate-900 text-slate-400 hover:text-slate-200 hover:bg-slate-850'
          }`}
        >
          <Globe className="w-4 h-4 text-cyan-400" />
          Publicar no Netlify (Deploy)
        </button>
      </div>

      {/* Subtab 1: Gestão de Equipe (CRUD) */}
      {activeSubTab === 'equipe' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={teamSearch}
                onChange={(e) => setTeamSearch(e.target.value)}
                placeholder="Buscar membro por nome, OAB, cargo ou e-mail..."
                className="w-full pl-10 pr-4 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-500"
              />
            </div>

            <button
              onClick={() => handleOpenTeamModal()}
              className="px-4 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl flex items-center justify-center gap-2 cursor-pointer transition shadow-lg shadow-amber-500/20"
            >
              <Plus className="w-4 h-4" />
              Adicionar Advogado / Membro
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredTeam.map((member) => (
              <div
                key={member.id}
                className="bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-2xl p-5 shadow-lg space-y-4 transition flex flex-col justify-between"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-3">
                      <div className={`w-11 h-11 rounded-xl bg-gradient-to-tr ${member.avatarColor} text-white font-black text-sm flex items-center justify-center shadow`}>
                        {member.name.split(' ').map((n) => n[0]).slice(0, 2).join('')}
                      </div>
                      <div>
                        <h4 className="font-bold text-slate-100 text-sm">{member.name}</h4>
                        <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                          <span className="text-[11px] px-2 py-0.5 rounded-full bg-slate-800 text-amber-300 font-semibold border border-slate-700 inline-block">
                            {member.role}
                          </span>
                          <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wider ${
                            member.privilege === 'total' 
                              ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' 
                              : member.privilege === 'parcial'
                              ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                              : 'bg-slate-800 text-slate-400 border border-slate-700'
                          }`}>
                            {member.privilege === 'total' ? 'Master' : member.privilege === 'parcial' ? 'Parcial' : 'Leitura'}
                          </span>
                        </div>
                      </div>
                    </div>

                    <span className={`text-[10px] px-2 py-0.5 rounded font-bold ${
                      member.status === 'ativo' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'bg-red-500/20 text-red-300'
                    }`}>
                      {member.status.toUpperCase()}
                    </span>
                  </div>

                  <div className="space-y-1 text-xs text-slate-400 pt-2 border-t border-slate-800">
                    {member.oabNumber && (
                      <p className="flex items-center justify-between">
                        <span>Inscrição OAB:</span>
                        <strong className="text-slate-200 font-mono">OAB/{member.oabState} nº {member.oabNumber}</strong>
                      </p>
                    )}
                    <p className="flex items-center justify-between">
                      <span>E-mail:</span>
                      <span className="text-slate-300 truncate max-w-[180px]">{member.email}</span>
                    </p>
                    <p className="flex items-center justify-between">
                      <span>Telefone:</span>
                      <span className="text-slate-300">{member.phone || 'Não informado'}</span>
                    </p>
                    <p className="flex items-center justify-between">
                      <span>Processos Ativos:</span>
                      <span className="text-amber-400 font-bold">{member.casesAssignedCount} causas</span>
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800/80">
                  <button
                    onClick={() => handleOpenTeamModal(member)}
                    className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold flex items-center gap-1 cursor-pointer transition"
                    title="Editar Membro"
                  >
                    <Edit className="w-3.5 h-3.5 text-amber-400" />
                    Editar
                  </button>
                  <button
                    onClick={() => {
                      setDeleteConfirm({
                        isOpen: true,
                        type: 'team',
                        id: member.id,
                        title: member.name,
                      });
                    }}
                    className="p-2 bg-red-950/30 hover:bg-red-900/50 text-red-400 border border-red-800/40 rounded-lg text-xs font-semibold flex items-center gap-1 cursor-pointer transition"
                    title="Excluir Membro"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Subtab 2: Financeiro & Honorários SaaS (CRUD) */}
      {activeSubTab === 'financeiro' && (
        !isGeneralAdmin ? (
          <div className="bg-slate-900 border border-slate-850 rounded-2xl p-8 max-w-lg mx-auto text-center space-y-5 my-12 shadow-xl relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-amber-500"></div>
            <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500 shadow-xl mx-auto">
              <Lock className="w-8 h-8 animate-bounce" />
            </div>
            <div className="space-y-2">
              <h3 className="text-base font-extrabold text-slate-100">Acesso Financeiro Restrito</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Você está tentando acessar o módulo de controle de fluxo de caixa, receitas judiciais e lançamentos de honorários contratuais da banca jurídica.
              </p>
              <p className="text-xs text-slate-400 leading-relaxed">
                Suas permissões atuais (<strong>{activeUser?.privilege === 'parcial' ? 'Parcial' : 'Leitura'}</strong>) não autorizam a visualização ou alteração de dados financeiros. Entre em contato com o <strong>Sócio Administrador Geral</strong> para revogar restrições.
              </p>
            </div>
            <div className="pt-3 border-t border-slate-800">
              <button
                onClick={() => setActiveSubTab('equipe')}
                className="px-5 py-2.5 bg-slate-850 hover:bg-slate-800 text-slate-200 hover:text-slate-100 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 mx-auto cursor-pointer"
              >
                <span>Voltar para Gestão de Equipe</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Financial Metrics Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-2">
                <div className="flex items-center justify-between text-slate-400 text-xs font-semibold">
                  <span>Total Faturado</span>
                  <DollarSign className="w-4 h-4 text-emerald-400" />
                </div>
                <div className="text-2xl font-black text-slate-100">{formatCurrencyBRL(totalReceitas)}</div>
                <p className="text-[11px] text-slate-400">Honorários contratuais e êxito</p>
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-2">
                <div className="flex items-center justify-between text-slate-400 text-xs font-semibold">
                  <span>Recebido / Liquidado</span>
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                </div>
                <div className="text-2xl font-black text-emerald-400">{formatCurrencyBRL(totalRecebido)}</div>
                <p className="text-[11px] text-emerald-400/80">Quitado em conta / PIX</p>
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-2">
                <div className="flex items-center justify-between text-slate-400 text-xs font-semibold">
                  <span>A Receber / Parcelas</span>
                  <Clock className="w-4 h-4 text-amber-400" />
                </div>
                <div className="text-2xl font-black text-amber-400">{formatCurrencyBRL(totalPendente)}</div>
                <p className="text-[11px] text-amber-400/80">Parcelas futuras e êxito previsto</p>
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-2">
                <div className="flex items-center justify-between text-slate-400 text-xs font-semibold">
                  <span>Despesas & Custas</span>
                  <AlertCircle className="w-4 h-4 text-red-400" />
                </div>
                <div className="text-2xl font-black text-red-400">{formatCurrencyBRL(totalDespesas)}</div>
                <p className="text-[11px] text-slate-400">Guias, diligências e operacionais</p>
              </div>
            </div>

          {/* Financial Filter & Create Action */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative w-64">
                <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={finSearch}
                  onChange={(e) => setFinSearch(e.target.value)}
                  placeholder="Buscar lançamento..."
                  className="w-full pl-10 pr-4 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-500"
                />
              </div>

              <select
                value={finStatusFilter}
                onChange={(e) => setFinStatusFilter(e.target.value)}
                className="px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-amber-500 cursor-pointer"
              >
                <option value="todos">Todos os Status</option>
                <option value="pago">Apenas Pagos</option>
                <option value="pendente">Apenas Pendentes</option>
                <option value="atrasado">Apenas Atrasados</option>
              </select>
            </div>

            <button
              onClick={() => handleOpenFinModal()}
              className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl flex items-center justify-center gap-2 cursor-pointer transition shadow-lg shadow-amber-500/20"
            >
              <Plus className="w-4 h-4" />
              Novo Lançamento Financeiro
            </button>
          </div>

          {/* Financial Records Table */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-lg">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-950 text-slate-400 uppercase font-semibold text-[10px] tracking-wider border-b border-slate-800">
                  <tr>
                    <th className="px-4 py-3">Descrição / Tipo</th>
                    <th className="px-4 py-3">Cliente / Processo</th>
                    <th className="px-4 py-3">Vencimento</th>
                    <th className="px-4 py-3">Forma</th>
                    <th className="px-4 py-3">Valor</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {filteredFin.map((record) => (
                    <tr key={record.id} className="hover:bg-slate-850/60 transition">
                      <td className="px-4 py-3.5">
                        <div className="font-bold text-slate-100">{record.title}</div>
                        <div className="text-[11px] text-amber-400/80">{record.type}</div>
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="font-medium text-slate-200">{record.clientName}</div>
                        {record.processNumber && (
                          <div className="font-mono text-[10px] text-slate-400">{record.processNumber}</div>
                        )}
                      </td>
                      <td className="px-4 py-3.5 text-slate-300">
                        {new Date(record.dueDate + 'T12:00:00').toLocaleDateString('pt-BR')}
                        {record.paymentDate && (
                          <div className="text-[10px] text-emerald-400">Pago em {new Date(record.paymentDate + 'T12:00:00').toLocaleDateString('pt-BR')}</div>
                        )}
                      </td>
                      <td className="px-4 py-3.5 text-slate-300">{record.paymentMethod}</td>
                      <td className="px-4 py-3.5 font-bold font-mono text-sm text-slate-100">
                        {formatCurrencyBRL(record.amount)}
                      </td>
                      <td className="px-4 py-3.5">
                        <button
                          onClick={() => handleToggleFinPaid(record)}
                          className={`px-2.5 py-1 rounded-full text-[10px] font-bold border flex items-center gap-1 cursor-pointer transition ${
                            record.status === 'Pago'
                              ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/30'
                              : record.status === 'Atrasado'
                              ? 'bg-red-500/20 text-red-300 border-red-500/30'
                              : 'bg-amber-500/20 text-amber-300 border-amber-500/30 hover:bg-amber-500/30'
                          }`}
                          title="Clique para alternar Pago / Pendente"
                        >
                          {record.status === 'Pago' && <Check className="w-3 h-3" />}
                          {record.status}
                        </button>
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleOpenFinModal(record)}
                            className="p-1.5 hover:bg-slate-800 text-slate-300 hover:text-amber-400 rounded-lg transition cursor-pointer"
                            title="Editar Lançamento"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => {
                              setDeleteConfirm({
                                isOpen: true,
                                type: 'fin',
                                id: record.id,
                                title: record.title,
                              });
                            }}
                            className="p-1.5 hover:bg-red-950/40 text-slate-400 hover:text-red-400 rounded-lg transition cursor-pointer"
                            title="Excluir Lançamento"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )
    )}

      {/* Subtab 3: Planos & Assinatura WONO */}
      {activeSubTab === 'planos' && (
        <div className="space-y-6">
          <div className="text-center max-w-xl mx-auto space-y-2">
            <h3 className="text-xl font-bold text-slate-100">Planos de Assinatura WONO ADVOCACIA</h3>
            <p className="text-xs text-slate-400">
              Escolha a infraestrutura ideal para a escala de processos, equipe jurídica e automação DataJud do seu escritório.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Starter */}
            <div className={`bg-slate-900 border rounded-2xl p-6 shadow-xl flex flex-col justify-between space-y-6 ${
              tenantConfig.plan === 'Starter' ? 'border-amber-500 ring-1 ring-amber-500/30' : 'border-slate-800'
            }`}>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-base text-slate-100">WONO Starter</h4>
                  {tenantConfig.plan === 'Starter' && (
                    <span className="text-[10px] px-2 py-0.5 rounded bg-amber-500 text-slate-950 font-bold">PLANO ATUAL</span>
                  )}
                </div>
                <div className="text-2xl font-black text-slate-100">
                  R$ 149<span className="text-xs text-slate-400 font-normal">/mês</span>
                </div>
                <ul className="space-y-2 text-xs text-slate-300">
                  <li className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-400" /> Até 100 Processos Judiciais</li>
                  <li className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-400" /> 2 Usuários / Advogados</li>
                  <li className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-400" /> Gerador de Procurações e Contratos</li>
                  <li className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-400" /> Agenda de Prazos Básica</li>
                </ul>
              </div>

              <button
                onClick={() => {
                  onUpdateTenantConfig({ ...tenantConfig, plan: 'Starter', monthlyFee: 149 });
                }}
                disabled={tenantConfig.plan === 'Starter'}
                className={`w-full py-2.5 rounded-xl font-bold text-xs transition cursor-pointer ${
                  tenantConfig.plan === 'Starter'
                    ? 'bg-slate-800 text-slate-400 cursor-not-allowed'
                    : 'bg-amber-500 hover:bg-amber-400 text-slate-950'
                }`}
              >
                {tenantConfig.plan === 'Starter' ? 'Plano Ativo' : 'Mudar para Starter'}
              </button>
            </div>

            {/* Pro */}
            <div className={`bg-slate-900 border rounded-2xl p-6 shadow-xl flex flex-col justify-between space-y-6 ${
              tenantConfig.plan === 'Pro' ? 'border-amber-500 ring-1 ring-amber-500/30' : 'border-slate-800'
            }`}>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-base text-slate-100">WONO Pro</h4>
                  {tenantConfig.plan === 'Pro' && (
                    <span className="text-[10px] px-2 py-0.5 rounded bg-amber-500 text-slate-950 font-bold">PLANO ATUAL</span>
                  )}
                </div>
                <div className="text-2xl font-black text-amber-400">
                  R$ 299<span className="text-xs text-slate-400 font-normal">/mês</span>
                </div>
                <ul className="space-y-2 text-xs text-slate-300">
                  <li className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-400" /> Até 1.000 Processos Judiciais</li>
                  <li className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-400" /> 5 Licenças de Advogados</li>
                  <li className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-400" /> IA para Resumos de Despacho</li>
                  <li className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-400" /> Sincronização DataJud Diária</li>
                  <li className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-400" /> Gestão Financeira de Honorários</li>
                </ul>
              </div>

              <button
                onClick={() => {
                  onUpdateTenantConfig({ ...tenantConfig, plan: 'Pro', monthlyFee: 299 });
                }}
                disabled={tenantConfig.plan === 'Pro'}
                className={`w-full py-2.5 rounded-xl font-bold text-xs transition cursor-pointer ${
                  tenantConfig.plan === 'Pro'
                    ? 'bg-slate-800 text-slate-400 cursor-not-allowed'
                    : 'bg-amber-500 hover:bg-amber-400 text-slate-950'
                }`}
              >
                {tenantConfig.plan === 'Pro' ? 'Plano Ativo' : 'Mudar para Pro'}
              </button>
            </div>

            {/* Enterprise */}
            <div className={`bg-slate-900 border rounded-2xl p-6 shadow-xl flex flex-col justify-between space-y-6 ${
              tenantConfig.plan === 'Enterprise' ? 'border-amber-500 ring-2 ring-amber-500/40' : 'border-slate-800'
            }`}>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-base text-slate-100 flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-amber-400" />
                    WONO Enterprise
                  </h4>
                  {tenantConfig.plan === 'Enterprise' && (
                    <span className="text-[10px] px-2 py-0.5 rounded bg-amber-500 text-slate-950 font-bold">PLANO ATUAL</span>
                  )}
                </div>
                <div className="text-2xl font-black text-amber-400">
                  R$ 499<span className="text-xs text-slate-400 font-normal">/mês</span>
                </div>
                <ul className="space-y-2 text-xs text-slate-300">
                  <li className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-400" /> Processos Ilimitados (5.000+)</li>
                  <li className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-400" /> 15 Licenças & Permissões RBAC</li>
                  <li className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-400" /> IA Gemini Avançada Ilimitada</li>
                  <li className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-400" /> DataJud Tempo Real e Diários Oficiais</li>
                  <li className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-400" /> Backup Diário & Trilha de Auditoria</li>
                </ul>
              </div>

              <button
                onClick={() => {
                  onUpdateTenantConfig({ ...tenantConfig, plan: 'Enterprise', monthlyFee: 499 });
                }}
                disabled={tenantConfig.plan === 'Enterprise'}
                className={`w-full py-2.5 rounded-xl font-bold text-xs transition cursor-pointer ${
                  tenantConfig.plan === 'Enterprise'
                    ? 'bg-slate-800 text-slate-400 cursor-not-allowed'
                    : 'bg-amber-500 hover:bg-amber-400 text-slate-950'
                }`}
              >
                {tenantConfig.plan === 'Enterprise' ? 'Plano Ativo' : 'Mudar para Enterprise'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Subtab 4: Auditoria LGPD & Logs */}
      {activeSubTab === 'auditoria' && (
        <div className="space-y-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="font-bold text-sm text-slate-100 flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  Trilha de Auditoria & Conformidade LGPD
                </h3>
                <p className="text-xs text-slate-400">
                  Registro imutável de ações operacionais e acessos a dados de clientes e processos judiciais.
                </p>
              </div>

              <span className="text-xs px-2.5 py-1 rounded bg-slate-800 text-slate-300 font-mono">
                {auditLogs.length} eventos registrados
              </span>
            </div>

            <div className="space-y-2.5 max-h-[500px] overflow-y-auto pr-1">
              {auditLogs.map((log) => (
                <div
                  key={log.id}
                  className="p-3 bg-slate-950 border border-slate-800 rounded-xl flex items-start justify-between gap-3 text-xs"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] px-2 py-0.5 rounded font-bold ${
                        log.action === 'CREATE' ? 'bg-emerald-500/20 text-emerald-300' :
                        log.action === 'UPDATE' ? 'bg-amber-500/20 text-amber-300' :
                        log.action === 'DELETE' ? 'bg-red-500/20 text-red-300' :
                        'bg-blue-500/20 text-blue-300'
                      }`}>
                        {log.action} • {log.entity}
                      </span>
                      <span className="font-semibold text-slate-200">{log.userName}</span>
                      <span className="text-[10px] text-slate-500">({log.userRole})</span>
                    </div>
                    <p className="text-slate-300">{log.description}</p>
                  </div>

                  <span className="font-mono text-[11px] text-slate-500 whitespace-nowrap">
                    {log.timestamp}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Subtab 5 & 6: Banco de Dados Gratuito & Publicar no Netlify */}
      {(activeSubTab === 'banco-dados' || activeSubTab === 'deploy-netlify') && (
        <CloudDatabaseNetlifyView
          office={office}
          clients={clients}
          processes={processes}
          deadlines={deadlines}
          documents={documents}
          teamMembers={teamMembers}
          financialRecords={financialRecords}
          saasConfig={tenantConfig}
          auditLogs={auditLogs}
          onImportFullBackup={onImportFullBackup}
          onOpenDatabaseInstaller={onOpenDatabaseInstaller}
        />
      )}

      {/* Modal: Create/Edit Team Member */}
      {isTeamModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/80 backdrop-blur-sm flex justify-center items-center p-4">
          <div className="bg-slate-900 border border-slate-700 w-full max-w-lg rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                <Users className="w-5 h-5 text-amber-400" />
                {editingMember ? 'Editar Membro da Equipe' : 'Adicionar Novo Advogado / Membro'}
              </h3>
              <button onClick={() => setIsTeamModalOpen(false)} className="text-slate-400 hover:text-white cursor-pointer">
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveTeamMember} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Nome Completo *</label>
                <input
                  type="text"
                  required
                  value={memberName}
                  onChange={(e) => setMemberName(e.target.value)}
                  placeholder="Ex: Dr. Roberto Martins"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-slate-100 focus:border-amber-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">E-mail Institucional *</label>
                  <input
                    type="email"
                    required
                    value={memberEmail}
                    onChange={(e) => setMemberEmail(e.target.value)}
                    placeholder="advogado@wonoadvocacia.com.br"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-slate-100 focus:border-amber-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Telefone / WhatsApp</label>
                  <input
                    type="text"
                    value={memberPhone}
                    onChange={(e) => setMemberPhone(e.target.value)}
                    placeholder="(11) 98888-7777"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-slate-100 focus:border-amber-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Função / Cargo no Escritório</label>
                <select
                  value={memberRole}
                  onChange={(e) => setMemberRole(e.target.value as TeamMemberRole)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-slate-100 focus:border-amber-500 focus:outline-none"
                >
                  <option value="Sócio Administrador">Sócio Administrador</option>
                  <option value="Advogado Sênior">Advogado Sênior</option>
                  <option value="Advogado Pleno">Advogado Pleno</option>
                  <option value="Advogado Júnior">Advogado Júnior</option>
                  <option value="Paralegal / Estagiário">Paralegal / Estagiário</option>
                  <option value="Financeiro & Administrativo">Financeiro & Administrativo</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Nível de Privilégio no Sistema *</label>
                <select
                  value={memberPrivilege}
                  onChange={(e) => setMemberPrivilege(e.target.value as 'total' | 'parcial' | 'leitura')}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-slate-100 focus:border-amber-500 focus:outline-none"
                >
                  <option value="total">Privilégio Total (Master/Administração - Cria, Edita e Altera Senhas)</option>
                  <option value="parcial">Privilégio Parcial (Edição/Criação - Sem alteração de configurações master)</option>
                  <option value="leitura">Sem Privilégios (Apenas Consulta / Leitura)</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Número OAB (Se houver)</label>
                  <input
                    type="text"
                    value={memberOab}
                    onChange={(e) => setMemberOab(e.target.value)}
                    placeholder="Ex: 412.390"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-slate-100 focus:border-amber-500 focus:outline-none font-mono"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Seccional (UF)</label>
                  <input
                    type="text"
                    value={memberOabState}
                    onChange={(e) => setMemberOabState(e.target.value.toUpperCase())}
                    maxLength={2}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-slate-100 focus:border-amber-500 focus:outline-none font-mono uppercase"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Status da Conta</label>
                <div className="flex gap-3">
                  <label className="flex items-center gap-2 text-slate-200 cursor-pointer">
                    <input
                      type="radio"
                      name="status"
                      checked={memberStatus === 'ativo'}
                      onChange={() => setMemberStatus('ativo')}
                      className="text-amber-500 focus:ring-amber-500"
                    />
                    Ativo
                  </label>
                  <label className="flex items-center gap-2 text-slate-200 cursor-pointer">
                    <input
                      type="radio"
                      name="status"
                      checked={memberStatus === 'inativo'}
                      onChange={() => setMemberStatus('inativo')}
                      className="text-amber-500 focus:ring-amber-500"
                    />
                    Inativo / Licença
                  </label>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsTeamModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg font-semibold cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-lg font-bold cursor-pointer shadow"
                >
                  Salvar Membro
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Create/Edit Financial Record */}
      {isFinModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/80 backdrop-blur-sm flex justify-center items-center p-4">
          <div className="bg-slate-900 border border-slate-700 w-full max-w-lg rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-amber-400" />
                {editingFin ? 'Editar Lançamento Financeiro' : 'Novo Lançamento Financeiro'}
              </h3>
              <button onClick={() => setIsFinModalOpen(false)} className="text-slate-400 hover:text-white cursor-pointer">
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveFinancialRecord} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Título / Descrição do Lançamento *</label>
                <input
                  type="text"
                  required
                  value={finTitle}
                  onChange={(e) => setFinTitle(e.target.value)}
                  placeholder="Ex: Honorários Iniciais - Carlos Eduardo (Parc. 1/3)"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-slate-100 focus:border-amber-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Categoria</label>
                  <select
                    value={finCategory}
                    onChange={(e) => setFinCategory(e.target.value as any)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-slate-100 focus:border-amber-500 focus:outline-none"
                  >
                    <option value="Receita">Receita (Honorários)</option>
                    <option value="Despesa">Despesa (Custas / Diligência)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Tipo de Honorário / Despesa</label>
                  <select
                    value={finType}
                    onChange={(e) => setFinType(e.target.value as any)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-slate-100 focus:border-amber-500 focus:outline-none"
                  >
                    <option value="Honorários Iniciais (Pró-labore)">Honorários Iniciais (Pró-labore)</option>
                    <option value="Honorários Mensais / Retainer">Honorários Mensais / Retainer</option>
                    <option value="Honorários de Êxito (Ad Exitum)">Honorários de Êxito (Ad Exitum)</option>
                    <option value="Honorários Sucumbenciais">Honorários Sucumbenciais</option>
                    <option value="Custas Processuais / Diligência">Custas Processuais / Diligência</option>
                    <option value="Despesa Operacional">Despesa Operacional</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Cliente Vinculado</label>
                  <select
                    value={finClientId}
                    onChange={(e) => setFinClientId(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-slate-100 focus:border-amber-500 focus:outline-none"
                  >
                    <option value="">Nenhum / Não vinculado</option>
                    {clients.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Processo Vinculado</label>
                  <select
                    value={finProcessId}
                    onChange={(e) => setFinProcessId(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-slate-100 focus:border-amber-500 focus:outline-none"
                  >
                    <option value="">Nenhum / Não vinculado</option>
                    {processes.map((p) => (
                      <option key={p.id} value={p.id}>{p.cnjNumber}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Valor (R$) *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={finAmount}
                    onChange={(e) => setFinAmount(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-slate-100 focus:border-amber-500 focus:outline-none font-mono"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Data Vencimento *</label>
                  <input
                    type="date"
                    required
                    value={finDueDate}
                    onChange={(e) => setFinDueDate(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-slate-100 focus:border-amber-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Status</label>
                  <select
                    value={finStatus}
                    onChange={(e) => setFinStatus(e.target.value as any)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-slate-100 focus:border-amber-500 focus:outline-none"
                  >
                    <option value="Pendente">Pendente</option>
                    <option value="Pago">Pago</option>
                    <option value="Atrasado">Atrasado</option>
                    <option value="Cancelado">Cancelado</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Forma de Pagamento</label>
                <select
                  value={finPaymentMethod}
                  onChange={(e) => setFinPaymentMethod(e.target.value as any)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-slate-100 focus:border-amber-500 focus:outline-none"
                >
                  <option value="PIX">PIX</option>
                  <option value="Boleto Bancário">Boleto Bancário</option>
                  <option value="Cartão de Crédito">Cartão de Crédito</option>
                  <option value="TED / Transferência">TED / Transferência</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Observações Financeiras</label>
                <textarea
                  value={finNotes}
                  onChange={(e) => setFinNotes(e.target.value)}
                  rows={2}
                  placeholder="Detalhes sobre a nota fiscal, banco emissor, juros..."
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-slate-100 focus:border-amber-500 focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsFinModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg font-semibold cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-lg font-bold cursor-pointer shadow"
                >
                  Salvar Lançamento
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirm.isOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/80 backdrop-blur-sm flex justify-center items-center p-4">
          <div className="bg-slate-900 border border-slate-700 w-full max-w-md rounded-2xl p-6 shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
              <Trash2 className="w-5 h-5 text-red-400" />
              Confirmar Exclusão
            </h3>
            <p className="text-xs text-slate-300 leading-relaxed">
              Tem certeza que deseja excluir <strong>{deleteConfirm.title}</strong>? Esta ação é irreversível e será registrada nos logs de auditoria.
            </p>
            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
              <button
                onClick={() => setDeleteConfirm({ isOpen: false, type: 'team', id: '', title: '' })}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-semibold cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  if (deleteConfirm.type === 'team') {
                    onDeleteTeamMember(deleteConfirm.id);
                  } else {
                    onDeleteFinancialRecord(deleteConfirm.id);
                  }
                  setDeleteConfirm({ isOpen: false, type: 'team', id: '', title: '' });
                }}
                className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-lg text-xs font-bold cursor-pointer"
              >
                Sim, Excluir
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
