import React, { useState, useMemo, useEffect } from 'react';
import { 
  Users, 
  UserCheck, 
  Shield, 
  Activity, 
  FileText, 
  CheckCircle2, 
  Plus, 
  Search, 
  Edit, 
  Trash2, 
  Briefcase, 
  Phone, 
  Mail, 
  Key, 
  CheckSquare, 
  Square, 
  UserPlus, 
  PlusCircle, 
  LayoutGrid, 
  List,
  AlertTriangle,
  UserX,
  ArrowRightLeft,
  Settings,
  Clock,
  Sparkles
} from 'lucide-react';
import { TeamMember, TeamMemberRole, LegalProcess } from '../types';

interface EquipeViewProps {
  teamMembers: TeamMember[];
  processes: LegalProcess[];
  onAddTeamMember: (member: Omit<TeamMember, 'id' | 'createdAt'>) => void;
  onUpdateTeamMember: (member: TeamMember) => void;
  onDeleteTeamMember: (id: string) => void;
  activeUser?: TeamMember;
}

interface CollaboratorTask {
  id: string;
  userId: string;
  userName: string;
  text: string;
  dueDate: string;
  completed: boolean;
  priority: 'baixa' | 'media' | 'alta';
}

const ROLES: TeamMemberRole[] = [
  'Sócio Administrador',
  'Advogado Sênior',
  'Advogado Pleno',
  'Advogado Júnior',
  'Paralegal / Estagiário',
  'Financeiro & Administrativo'
];

const AVATAR_GRADIENTS = [
  { name: 'Amber Glow', value: 'from-amber-500 to-amber-700' },
  { name: 'Emerald Wave', value: 'from-emerald-500 to-teal-700' },
  { name: 'Ocean Depths', value: 'from-blue-500 to-indigo-700' },
  { name: 'Midnight Purple', value: 'from-purple-500 to-pink-700' },
  { name: 'Crimson Dusk', value: 'from-rose-500 to-red-700' },
  { name: 'Slate Stone', value: 'from-slate-600 to-slate-800' }
];

export const EquipeView: React.FC<EquipeViewProps> = ({
  teamMembers,
  processes,
  onAddTeamMember,
  onUpdateTeamMember,
  onDeleteTeamMember,
  activeUser
}) => {
  // Tabs and views states
  const [viewMode, setViewMode] = useState<'cards' | 'table' | 'permissions' | 'tasks'>('cards');
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  
  // Modal for add/edit
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<TeamMember | null>(null);

  // Form states
  const [formName, setFormName] = useState('');
  const [formRole, setFormRole] = useState<TeamMemberRole>('Advogado Pleno');
  const [formEmail, setFormEmail] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formOabNumber, setFormOabNumber] = useState('');
  const [formOabState, setFormOabState] = useState('GO');
  const [formPrivilege, setFormPrivilege] = useState<'total' | 'parcial' | 'leitura'>('parcial');
  const [formStatus, setFormStatus] = useState<'ativo' | 'inativo'>('ativo');
  const [formAvatarGradient, setFormAvatarGradient] = useState('from-blue-500 to-indigo-700');

  // Collaborator Tasks (Mock database of assignments)
  const [tasks, setTasks] = useState<CollaboratorTask[]>(() => {
    const saved = localStorage.getItem('wono_collaborator_tasks');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return [];
      }
    }
    // Default initial tasks
    return [
      { id: 'task-1', userId: 'team-3', userName: 'Dr. Marcelo Silveira', text: 'Protocolar contestação no processo da Unimed', dueDate: '2026-09-12', completed: false, priority: 'alta' },
      { id: 'task-2', userId: 'team-4', userName: 'Larissa Fontes Ribeiro', text: 'Solicitar certidão de casamento atualizada do cliente Carlos', dueDate: '2026-09-10', completed: true, priority: 'media' },
      { id: 'task-3', userId: 'team-2', userName: 'Dra. Juliana Mendes Bastos', text: 'Análise de acórdão favorável para tese de recurso especial', dueDate: '2026-09-15', completed: false, priority: 'media' },
      { id: 'task-4', userId: 'team-3', userName: 'Dr. Marcelo Silveira', text: 'Realizar ligação de retorno para tirar dúvidas sobre custas judiciais', dueDate: '2026-09-09', completed: false, priority: 'baixa' }
    ];
  });

  // Task form state
  const [taskText, setTaskText] = useState('');
  const [taskUser, setTaskUser] = useState('');
  const [taskPriority, setTaskPriority] = useState<'baixa' | 'media' | 'alta'>('media');
  const [taskDueDate, setTaskDueDate] = useState('');

  // Persist tasks
  useEffect(() => {
    localStorage.setItem('wono_collaborator_tasks', JSON.stringify(tasks));
  }, [tasks]);

  const isGeneralAdmin = activeUser?.role === 'Sócio Administrador' || activeUser?.privilege === 'total';

  // Computed Team Stats
  const stats = useMemo(() => {
    const total = teamMembers.length;
    const active = teamMembers.filter(m => m.status === 'ativo').length;
    const lawyers = teamMembers.filter(m => m.role.includes('Advogado') || m.role.includes('Sócio')).length;
    const pendingTasks = tasks.filter(t => !t.completed).length;
    
    // Average processes assigned to active members
    const activeWithCases = teamMembers.filter(m => m.status === 'ativo');
    const totalAssigned = activeWithCases.reduce((acc, curr) => acc + (curr.casesAssignedCount || 0), 0);
    const avgCases = activeWithCases.length > 0 ? (totalAssigned / activeWithCases.length).toFixed(1) : '0';

    return { total, active, lawyers, pendingTasks, avgCases };
  }, [teamMembers, tasks]);

  // Filtered list of members
  const filteredTeam = useMemo(() => {
    return teamMembers.filter(member => {
      const matchesSearch = 
        member.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        member.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (member.oabNumber && member.oabNumber.includes(searchTerm)) ||
        member.role.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesRole = roleFilter === 'all' || member.role === roleFilter;
      const matchesStatus = statusFilter === 'all' || member.status === statusFilter;

      return matchesSearch && matchesRole && matchesStatus;
    });
  }, [teamMembers, searchTerm, roleFilter, statusFilter]);

  // Open Form Modal for add/edit
  const handleOpenModal = (member?: TeamMember) => {
    if (member) {
      setEditingMember(member);
      setFormName(member.name);
      setFormRole(member.role);
      setFormEmail(member.email);
      setFormPhone(member.phone);
      setFormOabNumber(member.oabNumber || '');
      setFormOabState(member.oabState || 'GO');
      setFormPrivilege(member.privilege || 'parcial');
      setFormStatus(member.status);
      setFormAvatarGradient(member.avatarColor);
    } else {
      setEditingMember(null);
      setFormName('');
      setFormRole('Advogado Pleno');
      setFormEmail('');
      setFormPhone('');
      setFormOabNumber('');
      setFormOabState('GO');
      setFormPrivilege('parcial');
      setFormStatus('ativo');
      // Pick a random gradient as default
      const randomGradient = AVATAR_GRADIENTS[Math.floor(Math.random() * AVATAR_GRADIENTS.length)].value;
      setFormAvatarGradient(randomGradient);
    }
    setIsModalOpen(true);
  };

  const handleSaveMember = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim() || !formEmail.trim()) return;

    // Estimate processes count by finding cases in database with this lawyer's name
    const matchesCount = processes.filter(p => p.responsibleLawyer && p.responsibleLawyer.toLowerCase().includes(formName.toLowerCase())).length;

    const memberData = {
      name: formName.trim(),
      role: formRole,
      email: formEmail.trim(),
      phone: formPhone.trim(),
      oabNumber: formRole.includes('Advogado') || formRole.includes('Sócio') ? formOabNumber.trim() : undefined,
      oabState: formRole.includes('Advogado') || formRole.includes('Sócio') ? formOabState : undefined,
      privilege: formPrivilege,
      status: formStatus,
      avatarColor: formAvatarGradient,
      casesAssignedCount: editingMember ? editingMember.casesAssignedCount : matchesCount
    };

    if (editingMember) {
      onUpdateTeamMember({
        ...editingMember,
        ...memberData
      });
    } else {
      onAddTeamMember(memberData);
    }
    setIsModalOpen(false);
  };

  const handleDeleteClick = (memberId: string, memberName: string) => {
    if (confirm(`Tem certeza de que deseja remover ${memberName} da equipe? Esta ação revogará todo o acesso ao sistema.`)) {
      onDeleteTeamMember(memberId);
    }
  };

  // Add Task
  const handleAddTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskText.trim() || !taskUser) return;

    const userObj = teamMembers.find(m => m.id === taskUser);
    if (!userObj) return;

    const newTask: CollaboratorTask = {
      id: `task-${Date.now()}`,
      userId: taskUser,
      userName: userObj.name,
      text: taskText.trim(),
      dueDate: taskDueDate || new Date().toISOString().split('T')[0],
      completed: false,
      priority: taskPriority
    };

    setTasks(prev => [newTask, ...prev]);
    setTaskText('');
    setTaskDueDate('');
  };

  // Toggle Task Completion
  const handleToggleTask = (taskId: string) => {
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, completed: !t.completed } : t));
  };

  // Delete Task
  const handleDeleteTask = (taskId: string) => {
    setTasks(prev => prev.filter(t => t.id !== taskId));
  };

  return (
    <div className="space-y-6">
      {/* Dynamic Header Description */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-xl">
        <div className="space-y-1.5 min-w-0">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-400">
              <Users className="w-5 h-5" />
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-100 tracking-tight uppercase">Equipe & Colaboradores</h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-400">
            Controle de advogados, estagiários e assessores administrativos. Gerencie permissões de acesso, atribuição de processos e tarefas operacionais da banca.
          </p>
        </div>
        <div className="flex items-center gap-2.5 self-start md:self-center shrink-0">
          <button
            onClick={() => handleOpenModal()}
            className="px-4 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl flex items-center gap-2 shadow-lg shadow-amber-500/15 cursor-pointer transition"
          >
            <UserPlus className="w-4 h-4 shrink-0" />
            Adicionar Colaborador
          </button>
        </div>
      </div>

      {/* Analytics Dashboard Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3.5 sm:gap-4">
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl shadow shadow-slate-950/20 flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-amber-500/10 text-amber-400 shrink-0">
            <Users className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Total Geral</span>
            <span className="text-xl sm:text-2xl font-black text-slate-100">{stats.total}</span>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl shadow shadow-slate-950/20 flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-emerald-500/10 text-emerald-400 shrink-0">
            <UserCheck className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Colaboradores Ativos</span>
            <span className="text-xl sm:text-2xl font-black text-slate-100">{stats.active}</span>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl shadow shadow-slate-950/20 flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-blue-500/10 text-blue-400 shrink-0">
            <Briefcase className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Advogados Ativos</span>
            <span className="text-xl sm:text-2xl font-black text-slate-100">{stats.lawyers}</span>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl shadow shadow-slate-950/20 flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-indigo-500/10 text-indigo-400 shrink-0">
            <Activity className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Média de Causas</span>
            <span className="text-xl sm:text-2xl font-black text-slate-100">{stats.avgCases} <span className="text-xs text-slate-500 font-normal">/adv</span></span>
          </div>
        </div>

        <div className="col-span-2 lg:col-span-1 bg-slate-900 border border-slate-800 p-4 rounded-xl shadow shadow-slate-950/20 flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-rose-500/10 text-rose-400 shrink-0">
            <Clock className="w-5 h-5 animate-pulse" />
          </div>
          <div className="min-w-0">
            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Tarefas de Apoio</span>
            <span className="text-xl sm:text-2xl font-black text-rose-400">{stats.pendingTasks} <span className="text-xs text-slate-500 font-normal">pendentes</span></span>
          </div>
        </div>
      </div>

      {/* Tabs / Subnavigation & Filters Panel */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-lg space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800/80 pb-4">
          {/* Sub Navigation Tabs */}
          <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800/80 self-start inline-flex">
            <button
              onClick={() => setViewMode('cards')}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
                viewMode === 'cards'
                  ? 'bg-amber-500 text-slate-950 shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              Grelha de Perfis
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
                viewMode === 'table'
                  ? 'bg-amber-500 text-slate-950 shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <List className="w-3.5 h-3.5" />
              Tabela Densa
            </button>
            <button
              onClick={() => setViewMode('permissions')}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
                viewMode === 'permissions'
                  ? 'bg-amber-500 text-slate-950 shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Shield className="w-3.5 h-3.5" />
              Matriz de Acesso
            </button>
            <button
              onClick={() => setViewMode('tasks')}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
                viewMode === 'tasks'
                  ? 'bg-amber-500 text-slate-950 shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              Agenda de Apoio
              {stats.pendingTasks > 0 && (
                <span className="bg-rose-500 text-white text-[9px] px-1.5 py-0.2 rounded-full font-black animate-bounce">
                  {stats.pendingTasks}
                </span>
              )}
            </button>
          </div>

          {/* Quick Stats Summary */}
          <div className="flex items-center gap-2.5 text-xs text-slate-400 font-mono">
            <span>Operador Atual:</span>
            <span className="px-2.5 py-1 rounded bg-slate-950 border border-slate-800 text-amber-300 font-bold flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-emerald-500"></span>
              {activeUser?.name || 'Administrador'}
            </span>
          </div>
        </div>

        {/* Filters Panel (Visible on grid and table tabs) */}
        {(viewMode === 'cards' || viewMode === 'table') && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar por nome, OAB ou email..."
                className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-amber-500 transition"
              />
            </div>

            <div>
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-amber-500 cursor-pointer"
              >
                <option value="all">Todos os Cargos</option>
                {ROLES.map(role => (
                  <option key={role} value={role}>{role}</option>
                ))}
              </select>
            </div>

            <div>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-amber-500 cursor-pointer"
              >
                <option value="all">Todos os Status</option>
                <option value="ativo">Apenas Ativos</option>
                <option value="inativo">Apenas Inativos</option>
              </select>
            </div>
          </div>
        )}
      </div>

      {/* Main Tab Renderings */}
      
      {/* 1. CARDS LAYOUT */}
      {viewMode === 'cards' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredTeam.length === 0 ? (
            <div className="col-span-full bg-slate-900 border border-slate-800 rounded-2xl p-10 text-center space-y-3">
              <UserX className="w-12 h-12 text-slate-600 mx-auto" />
              <h3 className="font-bold text-slate-300 text-sm">Nenhum colaborador localizado</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">Tente alterar o filtro ou digite um termo de busca diferente.</p>
            </div>
          ) : (
            filteredTeam.map((member) => {
              const userProcesses = processes.filter(p => p.responsibleLawyer && p.responsibleLawyer.toLowerCase().includes(member.name.toLowerCase()));
              return (
                <div 
                  key={member.id}
                  className="bg-slate-900 border border-slate-800 hover:border-slate-700/80 rounded-2xl p-5 shadow-lg transition flex flex-col justify-between space-y-4 group"
                >
                  <div className="space-y-3.5">
                    {/* Header: Avatar, Name, Badge, Status */}
                    <div className="flex items-start justify-between gap-2.5">
                      <div className="flex items-center gap-3">
                        <div className={`w-11 h-11 rounded-xl bg-gradient-to-tr ${member.avatarColor} text-slate-950 font-black text-sm flex items-center justify-center shadow`}>
                          {member.name.split(' ').map(n => n[0]).slice(0, 2).join('')}
                        </div>
                        <div className="min-w-0">
                          <h3 className="font-extrabold text-slate-100 text-sm truncate max-w-[140px] xl:max-w-[180px] group-hover:text-amber-400 transition">
                            {member.name}
                          </h3>
                          <p className="text-[11px] font-semibold text-slate-400 mt-0.5 truncate">{member.role}</p>
                        </div>
                      </div>
                      <span className={`text-[9px] px-2 py-0.5 rounded font-black tracking-wider uppercase border shrink-0 ${
                        member.status === 'ativo' 
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' 
                          : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                      }`}>
                        {member.status}
                      </span>
                    </div>

                    {/* Meta info block */}
                    <div className="space-y-2 text-xs text-slate-400 border-t border-slate-800/80 pt-3">
                      {member.oabNumber && (
                        <p className="flex items-center justify-between font-mono">
                          <span>Inscrição OAB:</span>
                          <strong className="text-slate-200">OAB/{member.oabState} nº {member.oabNumber}</strong>
                        </p>
                      )}
                      
                      <p className="flex items-center justify-between">
                        <span>E-mail profissional:</span>
                        <span className="text-slate-300 truncate max-w-[160px] font-medium" title={member.email}>{member.email}</span>
                      </p>

                      <p className="flex items-center justify-between">
                        <span>Telefone / Celular:</span>
                        <span className="text-slate-300">{member.phone || 'Não informado'}</span>
                      </p>

                      <p className="flex items-center justify-between">
                        <span>Acesso ao Sistema:</span>
                        <span className={`px-1.5 py-0.2 text-[9px] font-black uppercase rounded ${
                          member.privilege === 'total' 
                            ? 'bg-amber-400 text-slate-950' 
                            : member.privilege === 'parcial'
                            ? 'bg-blue-500/20 text-blue-300 border border-blue-500/20'
                            : 'bg-slate-800 text-slate-400'
                        }`}>
                          {member.privilege === 'total' ? 'Administrador Geral' : member.privilege === 'parcial' ? 'Escrita/Leitura' : 'Apenas Leitura'}
                        </span>
                      </p>

                      {/* Active Cases Assigned Indicator */}
                      <div className="bg-slate-950 p-2 rounded-xl flex items-center justify-between mt-1 border border-slate-800/60">
                        <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Causas sob responsabilidade</span>
                        <span className="text-xs font-black text-amber-400 font-mono">{userProcesses.length || member.casesAssignedCount} processos</span>
                      </div>
                    </div>
                  </div>

                  {/* Actions Bar */}
                  <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800/80">
                    <button
                      onClick={() => handleOpenModal(member)}
                      className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 hover:text-white text-slate-300 rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer transition border border-slate-700/60"
                    >
                      <Edit className="w-3.5 h-3.5 text-amber-400" />
                      Editar
                    </button>
                    <button
                      onClick={() => handleDeleteClick(member.id, member.name)}
                      disabled={!isGeneralAdmin}
                      className="p-1.5 bg-rose-500/10 hover:bg-rose-500 text-rose-400 hover:text-white rounded-lg transition disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-rose-400 disabled:cursor-not-allowed border border-rose-500/20"
                      title={isGeneralAdmin ? "Remover Colaborador" : "Privilégio insuficiente para remover membros"}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* 2. DENSE TABLE LAYOUT */}
      {viewMode === 'table' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-950 text-slate-400 border-b border-slate-800 text-[10px] font-bold uppercase tracking-wider">
                  <th className="py-3.5 px-4">Nome & Cargo</th>
                  <th className="py-3.5 px-4">Inscrição OAB</th>
                  <th className="py-3.5 px-4">E-mail</th>
                  <th className="py-3.5 px-4">Telefone</th>
                  <th className="py-3.5 px-4">Nível Acesso</th>
                  <th className="py-3.5 px-4">Causas Ativas</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80 text-slate-300">
                {filteredTeam.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-10 px-4 text-center text-slate-500">
                      Nenhum colaborador localizado para os filtros informados.
                    </td>
                  </tr>
                ) : (
                  filteredTeam.map((member) => (
                    <tr key={member.id} className="hover:bg-slate-850/40 transition">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2.5">
                          <div className={`w-8 h-8 rounded-lg bg-gradient-to-tr ${member.avatarColor} text-slate-950 font-extrabold text-[11px] flex items-center justify-center shrink-0`}>
                            {member.name.split(' ').map(n => n[0]).slice(0, 2).join('')}
                          </div>
                          <div className="min-w-0">
                            <span className="font-bold text-slate-100 block truncate max-w-[150px]">{member.name}</span>
                            <span className="text-[10px] text-slate-500 font-semibold block">{member.role}</span>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4 font-mono font-bold text-slate-200">
                        {member.oabNumber ? `OAB/${member.oabState} ${member.oabNumber}` : <span className="text-slate-600">-</span>}
                      </td>
                      <td className="py-3 px-4 text-slate-400">{member.email}</td>
                      <td className="py-3 px-4 font-mono">{member.phone || '-'}</td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-0.5 text-[9px] font-bold uppercase rounded ${
                          member.privilege === 'total' 
                            ? 'bg-amber-400/10 text-amber-300 border border-amber-500/20' 
                            : member.privilege === 'parcial'
                            ? 'bg-blue-500/10 text-blue-300 border border-blue-500/20'
                            : 'bg-slate-800 text-slate-400'
                        }`}>
                          {member.privilege === 'total' ? 'Master' : member.privilege === 'parcial' ? 'Parcial' : 'Leitura'}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-mono text-center font-bold text-amber-400">
                        {processes.filter(p => p.responsibleLawyer && p.responsibleLawyer.toLowerCase().includes(member.name.toLowerCase())).length || member.casesAssignedCount}
                      </td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                          member.status === 'ativo' ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/25' : 'bg-rose-500/15 text-rose-400'
                        }`}>
                          {member.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleOpenModal(member)}
                            className="p-1 text-slate-400 hover:text-amber-400 rounded hover:bg-slate-800 transition"
                            title="Editar"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteClick(member.id, member.name)}
                            disabled={!isGeneralAdmin}
                            className="p-1 text-slate-400 hover:text-rose-400 rounded hover:bg-slate-800 transition disabled:opacity-20"
                            title="Remover"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 3. ACCESS PERMISSIONS MATRIX (INTERACTIVE & EDUCATIONAL) */}
      {viewMode === 'permissions' && (
        <div className="space-y-5">
          {/* Permissions explanation box */}
          <div className="bg-blue-950/20 border border-blue-900/50 rounded-2xl p-4 flex items-start gap-3">
            <Shield className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <h4 className="text-xs sm:text-sm font-bold text-slate-200">Hierarquia de Privilégios da Banca</h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                Cada operador do sistema herda as permissões de seu nível de acesso. Somente usuários com privilégio <strong>Master</strong> (Administrador) podem excluir processos, alterar dados financeiros estratégicos, ou cadastrar novos funcionários.
              </p>
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-950 text-slate-400 border-b border-slate-800 text-[10px] font-bold uppercase tracking-wider">
                    <th className="py-3 px-4">Módulo do Sistema</th>
                    <th className="py-3 px-4 text-center">Nível Master</th>
                    <th className="py-3 px-4 text-center">Nível Parcial</th>
                    <th className="py-3 px-4 text-center">Nível Leitura</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/80 text-slate-300">
                  <tr>
                    <td className="py-3 px-4 font-semibold text-slate-200">Visualizar Processos e Diários</td>
                    <td className="py-3 px-4 text-center text-emerald-400 font-extrabold text-[14px]">✓</td>
                    <td className="py-3 px-4 text-center text-emerald-400 font-extrabold text-[14px]">✓</td>
                    <td className="py-3 px-4 text-center text-emerald-400 font-extrabold text-[14px]">✓</td>
                  </tr>
                  <tr>
                    <td className="py-3 px-4 font-semibold text-slate-200">Inserir/Editar Processos, Prazos e Clientes</td>
                    <td className="py-3 px-4 text-center text-emerald-400 font-extrabold text-[14px]">✓</td>
                    <td className="py-3 px-4 text-center text-emerald-400 font-extrabold text-[14px]">✓</td>
                    <td className="py-3 px-4 text-center text-rose-500 font-bold text-[13px]">✗</td>
                  </tr>
                  <tr>
                    <td className="py-3 px-4 font-semibold text-slate-200">Emitir Contratos & Procurações Clientes</td>
                    <td className="py-3 px-4 text-center text-emerald-400 font-extrabold text-[14px]">✓</td>
                    <td className="py-3 px-4 text-center text-emerald-400 font-extrabold text-[14px]">✓</td>
                    <td className="py-3 px-4 text-center text-rose-500 font-bold text-[13px]">✗</td>
                  </tr>
                  <tr>
                    <td className="py-3 px-4 font-semibold text-slate-200">Gestão Financeira & Lançamento de Caixa</td>
                    <td className="py-3 px-4 text-center text-emerald-400 font-extrabold text-[14px]">✓</td>
                    <td className="py-3 px-4 text-center text-rose-500 font-bold text-[13px]">✗ <span className="text-[9px] text-slate-500 font-normal">(Apenas Leitura)</span></td>
                    <td className="py-3 px-4 text-center text-rose-500 font-bold text-[13px]">✗</td>
                  </tr>
                  <tr>
                    <td className="py-3 px-4 font-semibold text-slate-200">Cadastro de Colaboradores & Equipe</td>
                    <td className="py-3 px-4 text-center text-emerald-400 font-extrabold text-[14px]">✓</td>
                    <td className="py-3 px-4 text-center text-rose-500 font-bold text-[13px]">✗</td>
                    <td className="py-3 px-4 text-center text-rose-500 font-bold text-[13px]">✗</td>
                  </tr>
                  <tr>
                    <td className="py-3 px-4 font-semibold text-slate-200">Exclusão Definitiva (Zerar Sistema/Banco SQL)</td>
                    <td className="py-3 px-4 text-center text-emerald-400 font-extrabold text-[14px]">✓ <span className="text-[9px] text-amber-500 font-bold">(Senha 1414)</span></td>
                    <td className="py-3 px-4 text-center text-rose-500 font-bold text-[13px]">✗</td>
                    <td className="py-3 px-4 text-center text-rose-500 font-bold text-[13px]">✗</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 4. AGENDA DE APOIO (TASKS COLLABORATORS) */}
      {viewMode === 'tasks' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Add Task Panel */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-4 h-fit">
            <h3 className="font-extrabold text-slate-200 text-sm flex items-center gap-2">
              <PlusCircle className="w-4 h-4 text-amber-400" /> Atribuir Nova Demanda de Apoio
            </h3>
            
            <form onSubmit={handleAddTask} className="space-y-4 text-xs">
              <div className="space-y-1">
                <label className="text-[10px] uppercase font-extrabold text-slate-400">Descrição da Tarefa</label>
                <textarea
                  value={taskText}
                  onChange={(e) => setTaskText(e.target.value)}
                  placeholder="Ex: Ligar para Tribunal de Justiça e cobrar andamento da liminar..."
                  rows={3}
                  required
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-amber-500 resize-none text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-extrabold text-slate-400">Atribuir Para</label>
                  <select
                    value={taskUser}
                    onChange={(e) => setTaskUser(e.target.value)}
                    required
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-2 py-2 text-slate-300 focus:outline-none focus:border-amber-500 cursor-pointer text-xs"
                  >
                    <option value="">Selecione...</option>
                    {teamMembers.map(m => (
                      <option key={m.id} value={m.id}>{m.name.split(' ')[0]} ({m.role.replace('Advogado ', '')})</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-extrabold text-slate-400">Data Limite</label>
                  <input
                    type="date"
                    value={taskDueDate}
                    onChange={(e) => setTaskDueDate(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-2 py-1.5 text-slate-200 focus:outline-none focus:border-amber-500 font-mono text-xs"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] uppercase font-extrabold text-slate-400 block">Prioridade</label>
                <div className="flex gap-2">
                  {(['baixa', 'media', 'alta'] as const).map(prio => (
                    <button
                      type="button"
                      key={prio}
                      onClick={() => setTaskPriority(prio)}
                      className={`flex-1 py-1.5 rounded-lg font-bold text-[10px] uppercase transition border ${
                        taskPriority === prio
                          ? prio === 'alta'
                            ? 'bg-rose-500/10 border-rose-500 text-rose-400 font-black'
                            : prio === 'media'
                            ? 'bg-amber-500/10 border-amber-500 text-amber-400 font-black'
                            : 'bg-emerald-500/10 border-emerald-500 text-emerald-400 font-black'
                          : 'bg-slate-950 border-slate-800 text-slate-500 hover:text-slate-300'
                      }`}
                    >
                      {prio}
                    </button>
                  ))}
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black uppercase text-xs rounded-xl flex items-center justify-center gap-1.5 shadow transition cursor-pointer"
              >
                <Plus className="w-4 h-4" /> Delegar à Equipe
              </button>
            </form>
          </div>

          {/* Pending Tasks List */}
          <div className="col-span-2 bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800/85 pb-3">
              <h3 className="font-extrabold text-slate-200 text-sm flex items-center gap-2">
                <Clock className="w-4 h-4 text-amber-400" /> Fluxo de Atividades Internas
              </h3>
              <span className="text-[10px] bg-slate-950 border border-slate-800 text-slate-400 px-2 py-1 rounded font-mono font-bold">
                {tasks.filter(t => !t.completed).length} Atividades Pendentes
              </span>
            </div>

            <div className="space-y-2.5 max-h-[480px] overflow-y-auto pr-1">
              {tasks.length === 0 ? (
                <div className="py-12 text-center text-slate-500 text-xs">
                  Nenhuma atividade ou mandado interno pendente.
                </div>
              ) : (
                tasks.map(task => {
                  const userObj = teamMembers.find(m => m.id === task.userId);
                  return (
                    <div 
                      key={task.id}
                      className={`p-3.5 rounded-xl border transition flex items-start justify-between gap-3 ${
                        task.completed 
                          ? 'bg-slate-950/60 border-slate-900 opacity-60' 
                          : 'bg-slate-950 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex gap-3">
                        <button
                          onClick={() => handleToggleTask(task.id)}
                          className="mt-0.5 text-slate-500 hover:text-amber-400 transition shrink-0 cursor-pointer"
                        >
                          {task.completed ? (
                            <CheckCircle2 className="w-4.5 h-4.5 text-emerald-500" />
                          ) : (
                            <Square className="w-4.5 h-4.5 text-slate-500 hover:text-amber-400" />
                          )}
                        </button>
                        <div className="min-w-0">
                          <p className={`text-xs font-medium text-slate-200 leading-relaxed break-words ${task.completed ? 'line-through text-slate-500' : ''}`}>
                            {task.text}
                          </p>
                          <div className="flex items-center gap-2 flex-wrap mt-1.5 text-[10px]">
                            <span className="font-bold text-slate-400 flex items-center gap-1">
                              <span className={`w-1.5 h-1.5 rounded-full bg-gradient-to-tr ${userObj?.avatarColor || 'from-slate-500 to-slate-700'}`}></span>
                              {task.userName}
                            </span>
                            <span className="text-slate-600">•</span>
                            <span className={`font-mono font-semibold ${
                              task.completed 
                                ? 'text-slate-500' 
                                : new Date(task.dueDate) < new Date() 
                                ? 'text-rose-400 font-extrabold' 
                                : 'text-slate-400'
                            }`}>
                              Prazo: {new Date(task.dueDate + 'T12:00:00').toLocaleDateString('pt-BR')}
                            </span>
                            {!task.completed && (
                              <>
                                <span className="text-slate-600">•</span>
                                <span className={`font-bold uppercase text-[8px] px-1.5 rounded ${
                                  task.priority === 'alta'
                                    ? 'bg-rose-500/10 text-rose-400'
                                    : task.priority === 'media'
                                    ? 'bg-amber-500/10 text-amber-400'
                                    : 'bg-emerald-500/10 text-emerald-400'
                                }`}>
                                  {task.priority}
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      <button
                        onClick={() => handleDeleteTask(task.id)}
                        className="text-slate-600 hover:text-rose-400 p-1 rounded hover:bg-slate-900 transition shrink-0 cursor-pointer"
                        title="Excluir Atribuição"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* CREATE / EDIT MEMBER DIALOG / MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/80 backdrop-blur-sm flex justify-center items-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full overflow-hidden shadow-2xl relative text-slate-300">
            <div className="p-5 border-b border-slate-800 bg-slate-950/80 flex items-center justify-between">
              <h3 className="font-extrabold text-sm text-slate-100 flex items-center gap-1.5">
                <UserPlus className="w-4 h-4 text-amber-400" />
                {editingMember ? `Editar: ${editingMember.name}` : 'Cadastrar Novo Membro'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-500 hover:text-slate-300 font-bold text-lg px-2 cursor-pointer"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleSaveMember} className="p-5 space-y-4 text-xs">
              {/* Full Name */}
              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold text-slate-400 block">Nome Completo</label>
                <input
                  type="text"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="Ex: Dr. Carlos Eduardo de Alencar"
                  required
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-100 focus:outline-none focus:border-amber-500"
                />
              </div>

              {/* Role & System Level */}
              <div className="grid grid-cols-2 gap-3.5">
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold text-slate-400 block">Função / Cargo</label>
                  <select
                    value={formRole}
                    onChange={(e) => setFormRole(e.target.value as TeamMemberRole)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-300 focus:outline-none focus:border-amber-500 cursor-pointer"
                  >
                    {ROLES.map(role => (
                      <option key={role} value={role}>{role}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold text-slate-400 block">Acesso ao Sistema</label>
                  <select
                    value={formPrivilege}
                    onChange={(e) => setFormPrivilege(e.target.value as any)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-300 focus:outline-none focus:border-amber-500 cursor-pointer"
                  >
                    <option value="total">Administrador (Master)</option>
                    <option value="parcial">Advogado (Escrita/Leitura)</option>
                    <option value="leitura">Apenas Consulta (Leitura)</option>
                  </select>
                </div>
              </div>

              {/* Email & Phone */}
              <div className="grid grid-cols-2 gap-3.5">
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold text-slate-400 block">E-mail Corporativo</label>
                  <input
                    type="email"
                    value={formEmail}
                    onChange={(e) => setFormEmail(e.target.value)}
                    placeholder="carlos@wonoadvocacia.com.br"
                    required
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-100 focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold text-slate-400 block">WhatsApp / Telefone</label>
                  <input
                    type="text"
                    value={formPhone}
                    onChange={(e) => setFormPhone(e.target.value)}
                    placeholder="(62) 99123-4567"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-100 focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              {/* OAB details (Conditionally enabled if role is lawyer or administrator) */}
              {(formRole.includes('Advogado') || formRole.includes('Sócio')) && (
                <div className="grid grid-cols-3 gap-3.5 bg-slate-950 p-3 rounded-xl border border-slate-800/80">
                  <div className="col-span-2 space-y-1">
                    <label className="text-[9px] uppercase font-extrabold text-amber-400 block">Nº Inscrição OAB</label>
                    <input
                      type="text"
                      value={formOabNumber}
                      onChange={(e) => setFormOabNumber(e.target.value)}
                      placeholder="Ex: 51.482"
                      required
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-slate-100 font-mono text-xs focus:outline-none focus:border-amber-500"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] uppercase font-extrabold text-amber-400 block">UF Seccional</label>
                    <select
                      value={formOabState}
                      onChange={(e) => setFormOabState(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2 py-1.5 text-slate-300 font-mono text-xs focus:outline-none focus:border-amber-500 cursor-pointer"
                    >
                      {['AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO'].map(uf => (
                        <option key={uf} value={uf}>{uf}</option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              {/* Status & Avatar Choice */}
              <div className="grid grid-cols-2 gap-3.5">
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold text-slate-400 block">Status de Atividade</label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setFormStatus('ativo')}
                      className={`flex-1 py-2 rounded-xl text-center font-bold ${
                        formStatus === 'ativo' 
                          ? 'bg-emerald-500/15 border border-emerald-500 text-emerald-400 font-black' 
                          : 'bg-slate-950 border border-slate-800 text-slate-500 hover:text-slate-300'
                      }`}
                    >
                      Ativo
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormStatus('inativo')}
                      className={`flex-1 py-2 rounded-xl text-center font-bold ${
                        formStatus === 'inativo' 
                          ? 'bg-rose-500/15 border border-rose-500 text-rose-400 font-black' 
                          : 'bg-slate-950 border border-slate-800 text-slate-500 hover:text-slate-300'
                      }`}
                    >
                      Inativo
                    </button>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold text-slate-400 block">Identidade Visual (Avatar)</label>
                  <div className="flex flex-wrap gap-1.5 items-center justify-start pt-1.5">
                    {AVATAR_GRADIENTS.map((g) => (
                      <button
                        type="button"
                        key={g.value}
                        onClick={() => setFormAvatarGradient(g.value)}
                        className={`w-5 h-5 rounded-md bg-gradient-to-tr ${g.value} transition shrink-0 ${
                          formAvatarGradient === g.value
                            ? 'ring-2 ring-amber-400 ring-offset-2 ring-offset-slate-900 scale-110'
                            : 'opacity-70 hover:opacity-100'
                        }`}
                        title={g.name}
                      />
                    ))}
                  </div>
                </div>
              </div>

              {/* Submit / Cancel Buttons */}
              <div className="flex items-center gap-2 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-750 text-slate-300 font-bold rounded-xl text-center cursor-pointer border border-slate-700/60"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black uppercase rounded-xl text-center cursor-pointer shadow-lg shadow-amber-500/10"
                >
                  {editingMember ? 'Atualizar Dados' : 'Criar Colaborador'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
