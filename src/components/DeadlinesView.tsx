import React, { useState } from 'react';
import { 
  Calendar as CalendarIcon, 
  Clock, 
  AlertTriangle, 
  CheckCircle2, 
  Plus, 
  Search, 
  Filter, 
  Scale, 
  User, 
  ChevronRight,
  Sparkles,
  ArrowUpDown,
  FileText,
  Edit3,
  Trash2,
  Download,
  ExternalLink
} from 'lucide-react';
import { ProcessDeadline, LegalProcess, Client } from '../types';

interface DeadlinesViewProps {
  deadlines: ProcessDeadline[];
  processes: LegalProcess[];
  clients: Client[];
  onAddDeadline: (deadline: Omit<ProcessDeadline, 'id'>) => void;
  onUpdateDeadline: (deadline: ProcessDeadline) => void;
  onDeleteDeadline: (id: string) => void;
  onToggleDeadlineStatus: (id: string) => void;
  onSelectProcess: (processId: string) => void;
  onSimulateUrgentDeadline?: () => void;
  notificationPermission?: NotificationPermission;
  onRequestNotificationPermission?: () => void;
}

export const DeadlinesView: React.FC<DeadlinesViewProps> = ({
  deadlines,
  processes,
  clients,
  onAddDeadline,
  onUpdateDeadline,
  onDeleteDeadline,
  onToggleDeadlineStatus,
  onSelectProcess,
  onSimulateUrgentDeadline,
  notificationPermission = 'default',
  onRequestNotificationPermission,
}) => {
  const [filterStatus, setFilterStatus] = useState<string>('pendentes');
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingDeadlineId, setEditingDeadlineId] = useState<string | null>(null);

  // CPC Working Days Calculator States
  const [showCpcCalculator, setShowCpcCalculator] = useState(false);
  const [cpcStartDate, setCpcStartDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [cpcDays, setCpcDays] = useState<number>(15);
  const [cpcType, setCpcType] = useState<'úteis' | 'corridos'>('úteis');
  const [cpcCalculationResult, setCpcCalculationResult] = useState<string | null>(null);

  // Helper to calculate legal deadlines in working days or consecutive days (reproduced from Astrea system logic)
  const calculateCpcDeadline = (start: string, daysCount: number, calcType: 'úteis' | 'corridos'): string => {
    if (!start) return '';
    const holidays = [
      '01-01', // Confraternização Universal (Ano Novo)
      '04-21', // Tiradentes
      '05-01', // Dia do Trabalho
      '09-07', // Independência do Brasil
      '10-12', // Nossa Senhora Aparecida
      '11-02', // Finados
      '11-15', // Proclamação da República
      '12-25', // Natal
    ];
    let currentDate = new Date(start + 'T12:00:00');
    
    if (calcType === 'corridos') {
      currentDate.setDate(currentDate.getDate() + daysCount);
      return currentDate.toISOString().split('T')[0];
    }

    let daysAdded = 0;
    while (daysAdded < daysCount) {
      currentDate.setDate(currentDate.getDate() + 1);
      const dayOfWeek = currentDate.getDay(); // 0: Sunday, 6: Saturday
      const monthDayStr = `${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(currentDate.getDate()).padStart(2, '0')}`;
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
      const isHoliday = holidays.includes(monthDayStr);
      
      if (!isWeekend && !isHoliday) {
        daysAdded++;
      }
    }
    return currentDate.toISOString().split('T')[0];
  };

  const handleApplyCpcCalculation = () => {
    const result = calculateCpcDeadline(cpcStartDate, cpcDays, cpcType);
    if (result) {
      setFatalDate(result);
      const daysOfWeek = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];
      const calculatedDateObj = new Date(result + 'T12:00:00');
      const dayName = daysOfWeek[calculatedDateObj.getDay()];
      setCpcCalculationResult(`Calculado: ${new Date(result + 'T12:00:00').toLocaleDateString('pt-BR')} (${dayName})`);
    }
  };

  // Delete deadline confirmation
  const [deleteConfirm, setDeleteConfirm] = useState<{
    isOpen: boolean;
    deadline: ProcessDeadline | null;
  }>({
    isOpen: false,
    deadline: null,
  });

  // Deadline form
  const [selectedProcessId, setSelectedProcessId] = useState(processes[0]?.id || '');
  const [title, setTitle] = useState('');
  const [type, setType] = useState<ProcessDeadline['type']>('Prazo CPC');
  const [fatalDate, setFatalDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 15);
    return d.toISOString().split('T')[0];
  });
  const [notes, setNotes] = useState('');
  const [responsibleLawyer, setResponsibleLawyer] = useState('Dr. Vagner Schmidt da Silva');
  const [reminderHours, setReminderHours] = useState<number>(24);

  const handleOpenNewModal = () => {
    setEditingDeadlineId(null);
    setSelectedProcessId(processes[0]?.id || '');
    setTitle('');
    setType('Prazo CPC');
    const d = new Date();
    d.setDate(d.getDate() + 15);
    setFatalDate(d.toISOString().split('T')[0]);
    setNotes('');
    setResponsibleLawyer('Dr. Vagner Schmidt da Silva');
    setReminderHours(24);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (item: ProcessDeadline) => {
    setEditingDeadlineId(item.id);
    setSelectedProcessId(item.processId);
    setTitle(item.title);
    setType(item.type);
    setFatalDate(item.fatalDate);
    setNotes(item.notes || '');
    setResponsibleLawyer(item.responsibleLawyer || 'Dr. Vagner Schmidt da Silva');
    setReminderHours(item.reminderHours !== undefined ? item.reminderHours : 24);
    setIsModalOpen(true);
  };

  // Google Calendar URL Generator
  const getGoogleCalendarUrl = (item: ProcessDeadline) => {
    const eventTitle = `[Prazo Fatal OAB] ${item.title}`;
    const cleanDate = item.fatalDate.replace(/-/g, ''); // YYYYMMDD
    
    // All-day event start and end dates (end date must be the next day)
    const d = new Date(item.fatalDate + 'T12:00:00');
    d.setDate(d.getDate() + 1);
    const nextDayStr = d.toISOString().split('T')[0].replace(/-/g, '');
    
    const dates = `${cleanDate}/${nextDayStr}`;
    const details = `Processo: ${item.processNumber}\n` +
                    `Cliente: ${item.clientName}\n` +
                    `Tipo: ${item.type}\n` +
                    `Responsável: ${item.responsibleLawyer || 'Não designado'}\n\n` +
                    `Notas:\n${item.notes || 'Sem observações'}\n\nSincronizado via Advocacia Digital OAB.`;
                    
    return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(eventTitle)}&dates=${dates}&details=${encodeURIComponent(details)}`;
  };

  // Standard .ics File Downloader
  const handleDownloadIcs = (item: ProcessDeadline) => {
    const cleanDate = item.fatalDate.replace(/-/g, ''); // YYYYMMDD
    const d = new Date(item.fatalDate + 'T12:00:00');
    d.setDate(d.getDate() + 1);
    const nextDayStr = d.toISOString().split('T')[0].replace(/-/g, '');

    const summary = `[Prazo Fatal OAB] ${item.title}`;
    const description = `Processo: ${item.processNumber}\\nCliente: ${item.clientName}\\nTipo: ${item.type}\\nResponsável: ${item.responsibleLawyer || 'N/A'}\\n\\nNotas:\\n${item.notes || 'Sem notas'}`;
    
    const icsLines = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Advocacia Digital//NONSGML v1.0//PT',
      'BEGIN:VEVENT',
      `DTSTART;VALUE=DATE:${cleanDate}`,
      `DTEND;VALUE=DATE:${nextDayStr}`,
      `SUMMARY:${summary}`,
      `DESCRIPTION:${description}`,
      'STATUS:CONFIRMED',
      'TRANSP:TRANSPARENT',
      'END:VEVENT',
      'END:VCALENDAR'
    ];

    const blob = new Blob([icsLines.join('\r\n')], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `prazo_OAB_${item.id}_${cleanDate}.ics`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Handle deadline form submit
  const handleSaveDeadline = (e: React.FormEvent) => {
    e.preventDefault();
    const proc = processes.find((p) => p.id === selectedProcessId) || processes[0];

    const today = new Date();
    const targetDate = new Date(fatalDate + 'T12:00:00');
    const diffTime = targetDate.getTime() - today.getTime();
    const daysLeft = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (editingDeadlineId) {
      const existing = deadlines.find((d) => d.id === editingDeadlineId);
      if (!existing) return;

      onUpdateDeadline({
        ...existing,
        processId: proc ? proc.id : existing.processId,
        processNumber: proc ? proc.cnjNumber : existing.processNumber,
        clientName: proc ? proc.activeParty : existing.clientName,
        title: title || existing.title,
        type,
        fatalDate,
        daysLeft: Math.max(0, daysLeft),
        status: existing.status === 'cumprido' ? 'cumprido' : daysLeft <= 2 ? 'alerta' : 'pendente',
        responsibleLawyer,
        notes,
        reminderHours,
      });
    } else {
      onAddDeadline({
        processId: proc ? proc.id : '',
        processNumber: proc ? proc.cnjNumber : '0000000-00.0000.0.00.0000',
        clientName: proc ? proc.activeParty : 'Geral',
        title: title || `Prazo Judicial - ${type}`,
        type,
        startDate: new Date().toISOString().split('T')[0],
        fatalDate,
        status: daysLeft <= 2 ? 'alerta' : 'pendente',
        daysLeft: Math.max(0, daysLeft),
        responsibleLawyer,
        notes,
        reminderHours,
      });
    }

    setIsModalOpen(false);
  };


  const filteredDeadlines = deadlines.filter((d) => {
    if (filterStatus === 'pendentes' && d.status === 'cumprido') return false;
    if (filterStatus === 'urgentes' && d.status !== 'alerta' && d.status !== 'atrasado') return false;
    if (filterStatus === 'cumpridos' && d.status !== 'cumprido') return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        d.title.toLowerCase().includes(q) ||
        d.processNumber.toLowerCase().includes(q) ||
        d.clientName.toLowerCase().includes(q) ||
        d.type.toLowerCase().includes(q)
      );
    }
    return true;
  }).sort((a, b) => {
    if (a.status === 'cumprido' && b.status !== 'cumprido') return 1;
    if (b.status === 'cumprido' && a.status !== 'cumprido') return -1;
    return new Date(a.fatalDate).getTime() - new Date(b.fatalDate).getTime();
  });

  const urgentCount = deadlines.filter((d) => d.status === 'alerta' || d.status === 'atrasado').length;
  const pendingCount = deadlines.filter((d) => d.status !== 'cumprido').length;

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-6 shadow-lg flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1">
              <CalendarIcon className="w-3.5 h-3.5" /> Pauta Processual & Contagem CPC/2015
            </span>
          </div>
          <h2 className="text-lg sm:text-xl font-bold text-slate-100">
            Agenda de Prazos Fatais e Audiências
          </h2>
          <p className="text-xs text-slate-400 mt-1 max-w-2xl">
            Gestão de preclusões, contestações, recursos, audiências de conciliação e instrução com alertas de tempestividade.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
          {onSimulateUrgentDeadline && (
            <button
              onClick={onSimulateUrgentDeadline}
              className="px-3.5 sm:px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-amber-400 border border-amber-500/30 font-bold text-xs sm:text-sm rounded-xl transition flex items-center justify-center gap-2 cursor-pointer shadow-sm whitespace-nowrap"
              title="Cria um prazo vencendo amanhã para disparar o alerta visual e log do sistema"
            >
              <Clock className="w-4 h-4 text-amber-400" />
              Simular Prazo 24h
            </button>
          )}

          <button
            onClick={handleOpenNewModal}
            className="px-4 sm:px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs sm:text-sm rounded-xl transition flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-amber-500/20 whitespace-nowrap"
          >
            <Plus className="w-4 h-4" />
            Agendar Novo Prazo
          </button>
        </div>
      </div>


      {/* Native Notification Status Banner */}
      {onRequestNotificationPermission && (
        <div className={`p-4 rounded-xl border flex flex-col md:flex-row md:items-center justify-between gap-4 transition shadow-md ${
          notificationPermission === 'granted'
            ? 'bg-emerald-950/20 border-emerald-500/20 text-slate-100'
            : notificationPermission === 'denied'
            ? 'bg-rose-950/20 border-rose-500/20 text-slate-100'
            : 'bg-slate-900 border-slate-800 text-slate-100'
        }`}>
          <div className="flex gap-3 items-start md:items-center">
            <span className={`p-2 rounded-lg shrink-0 flex items-center justify-center ${
              notificationPermission === 'granted'
                ? 'bg-emerald-500/10 text-emerald-400'
                : notificationPermission === 'denied'
                ? 'bg-rose-500/10 text-rose-400'
                : 'bg-amber-500/10 text-amber-400'
            }`}>
              {notificationPermission === 'granted' ? (
                <CheckCircle2 className="w-5 h-5" />
              ) : notificationPermission === 'denied' ? (
                <AlertTriangle className="w-5 h-5" />
              ) : (
                <Clock className="w-5 h-5 text-amber-400 animate-pulse" />
              )}
            </span>
            <div>
              <h4 className="text-sm font-bold flex items-center gap-2 flex-wrap">
                <span>Notificações Nativas do Sistema Operacional</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded font-bold uppercase ${
                  notificationPermission === 'granted'
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/20'
                    : notificationPermission === 'denied'
                    ? 'bg-rose-500/20 text-rose-300 border border-rose-500/20'
                    : 'bg-amber-500/20 text-amber-300 border border-amber-500/20'
                }`}>
                  {notificationPermission === 'granted'
                    ? 'Ativo'
                    : notificationPermission === 'denied'
                    ? 'Bloqueado'
                    : 'Aguardando Permissão'}
                </span>
              </h4>
              <p className="text-xs text-slate-400 mt-0.5">
                {notificationPermission === 'granted'
                  ? 'Você receberá avisos sonoros e popups nativos do Windows/Mac/Linux mesmo quando estiver em outras abas.'
                  : notificationPermission === 'denied'
                  ? 'As notificações estão desativadas. Para reativar, clique no ícone de cadeado na barra de endereços do seu navegador.'
                  : 'Ative para receber alertas visuais nativos na área de trabalho quando um prazo preclusivo vencer em menos de 24h.'}
              </p>
            </div>
          </div>
          
          {notificationPermission !== 'granted' && notificationPermission !== 'denied' && (
            <button
              onClick={onRequestNotificationPermission}
              className="px-4 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs sm:text-sm rounded-xl transition cursor-pointer flex items-center justify-center gap-1.5 shadow-md shadow-amber-500/10 self-start md:self-center"
            >
              <span>Ativar Alertas Nativos</span>
            </button>
          )}

          {notificationPermission === 'granted' && (
            <button
              onClick={() => {
                if (typeof window !== 'undefined' && 'Notification' in window) {
                  try {
                    new Notification('🔔 Teste de Alerta - Wono Advocacia', {
                      body: 'Parabéns! Suas notificações nativas estão funcionando 100%.',
                      icon: '/favicon.ico',
                    });
                  } catch (err) {
                    console.error('Erro de permissão no iframe:', err);
                  }
                }
              }}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 font-semibold text-xs rounded-lg transition cursor-pointer flex items-center justify-center gap-1 self-start md:self-center"
            >
              <span>Testar Alerta</span>
            </button>
          )}
        </div>
      )}


      {/* Stats row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex items-center justify-between shadow-sm">
          <div>
            <span className="text-xs text-slate-400 font-semibold uppercase">Prazos Pendentes</span>
            <div className="text-2xl font-bold text-slate-100">{pendingCount}</div>
          </div>
          <div className="w-10 h-10 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center">
            <Clock className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex items-center justify-between shadow-sm">
          <div>
            <span className="text-xs text-rose-400 font-semibold uppercase">Urgentes / Fatais (≤ 3 dias)</span>
            <div className="text-2xl font-bold text-rose-300">{urgentCount}</div>
          </div>
          <div className="w-10 h-10 rounded-lg bg-rose-500/10 text-rose-400 flex items-center justify-center">
            <AlertTriangle className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex items-center justify-between shadow-sm">
          <div>
            <span className="text-xs text-emerald-400 font-semibold uppercase">Cumpridos / Arquivados</span>
            <div className="text-2xl font-bold text-emerald-300">
              {deadlines.filter((d) => d.status === 'cumprido').length}
            </div>
          </div>
          <div className="w-10 h-10 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-1 bg-slate-900 p-1.5 rounded-xl border border-slate-800 w-full sm:w-auto">
          {[
            { id: 'pendentes', label: 'Pendentes' },
            { id: 'urgentes', label: 'Urgentes (Alerta)' },
            { id: 'cumpridos', label: 'Cumpridos' },
            { id: 'todos', label: 'Todos' },
          ].map((f) => (
            <button
              key={f.id}
              onClick={() => setFilterStatus(f.id)}
              className={`px-3 py-1.5 rounded-lg font-medium transition cursor-pointer flex-1 sm:flex-none text-center ${
                filterStatus === f.id
                  ? 'bg-amber-500 text-slate-950 font-bold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Filtrar por título, cliente ou CNJ..."
            className="w-full pl-9 pr-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-slate-200 placeholder-slate-500 focus:outline-none focus:border-amber-500"
          />
        </div>
      </div>

      {/* Deadlines Table/List */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-lg">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950 text-slate-400 uppercase tracking-wider font-semibold border-b border-slate-800 text-[11px]">
              <tr>
                <th className="py-3.5 px-4 w-12 text-center">Status</th>
                <th className="py-3.5 px-4">Prazo / Obrigação Processual</th>
                <th className="py-3.5 px-4">Processo / Cliente</th>
                <th className="py-3.5 px-4">Tipo</th>
                <th className="py-3.5 px-4">Data Fatal</th>
                <th className="py-3.5 px-4">Tempo Restante</th>
                <th className="py-3.5 px-4 text-right">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {filteredDeadlines.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-500">
                    Nenhum prazo encontrado para os filtros selecionados.
                  </td>
                </tr>
              ) : (
                filteredDeadlines.map((item) => {
                  const isDone = item.status === 'cumprido';
                  const isUrgent = item.daysLeft <= 3 && !isDone;

                  return (
                    <tr
                      key={item.id}
                      className={`hover:bg-slate-850/60 transition ${
                        isDone ? 'opacity-50' : ''
                      }`}
                    >
                      {/* Checkbox / Status toggle */}
                      <td className="py-3.5 px-4 text-center">
                        <button
                          onClick={() => onToggleDeadlineStatus(item.id)}
                          className={`w-5 h-5 rounded flex items-center justify-center cursor-pointer transition ${
                            isDone
                              ? 'bg-emerald-500 text-slate-950'
                              : 'border border-slate-600 hover:border-amber-400 bg-slate-950'
                          }`}
                          title={isDone ? 'Marcar como pendente' : 'Marcar como cumprido'}
                        >
                          {isDone && <CheckCircle2 className="w-3.5 h-3.5" />}
                        </button>
                      </td>

                      {/* Title & Notes */}
                      <td className="py-3.5 px-4 max-w-xs">
                        <div className={`font-bold text-slate-100 ${isDone ? 'line-through text-slate-400' : ''}`}>
                          {item.title}
                        </div>
                        {item.notes && (
                          <div className="text-[11px] text-slate-400 truncate mt-0.5 max-w-sm">
                            {item.notes}
                          </div>
                        )}
                        {item.reminderHours !== undefined && item.reminderHours > 0 && (
                          <div className="flex items-center gap-1 text-[10px] text-amber-500/95 mt-1 font-semibold">
                            <Clock className="w-3 h-3 text-amber-400" /> Lembrete ativo: {item.reminderHours}h antes
                          </div>
                        )}
                      </td>

                      {/* Process & Client */}
                      <td className="py-3.5 px-4">
                        <div className="font-mono text-amber-400 font-semibold">{item.processNumber}</div>
                        <div className="text-slate-300 text-[11px]">{item.clientName}</div>
                      </td>

                      {/* Type */}
                      <td className="py-3.5 px-4">
                        <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-medium text-[10px]">
                          {item.type}
                        </span>
                      </td>

                      {/* Fatal Date */}
                      <td className="py-3.5 px-4 font-semibold">
                        {new Date(item.fatalDate + 'T12:00:00').toLocaleDateString('pt-BR', {
                          weekday: 'short',
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric',
                        })}
                      </td>

                      {/* Days Left badge */}
                      <td className="py-3.5 px-4">
                        {isDone ? (
                          <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 text-[10px] font-bold">
                            Cumprido
                          </span>
                        ) : (
                          <span
                            className={`px-2.5 py-1 rounded text-[10px] font-bold ${
                              isUrgent
                                ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30 animate-pulse'
                                : item.daysLeft <= 7
                                ? 'bg-amber-500/20 text-amber-300'
                                : 'bg-slate-800 text-slate-300'
                            }`}
                          >
                            {item.daysLeft === 0 ? 'HOJE (FATAL)' : `${item.daysLeft} dias restantes`}
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Add to Google Calendar */}
                          <a
                            href={getGoogleCalendarUrl(item)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1.5 hover:bg-slate-800 text-slate-400 hover:text-blue-400 rounded transition cursor-pointer flex items-center justify-center"
                            title="Adicionar ao Google Agenda"
                          >
                            <CalendarIcon className="w-3.5 h-3.5" />
                          </a>

                          {/* Download .ics */}
                          <button
                            onClick={() => handleDownloadIcs(item)}
                            className="p-1.5 hover:bg-slate-800 text-slate-400 hover:text-emerald-400 rounded transition cursor-pointer flex items-center justify-center"
                            title="Baixar arquivo de agenda (.ics)"
                          >
                            <Download className="w-3.5 h-3.5" />
                          </button>

                          <button
                            onClick={() => handleOpenEditModal(item)}
                            className="p-1.5 hover:bg-slate-800 text-slate-400 hover:text-amber-400 rounded transition cursor-pointer"
                            title="Editar Prazo / Audiência"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>

                          <button
                            onClick={() => setDeleteConfirm({ isOpen: true, deadline: item })}
                            className="p-1.5 hover:bg-slate-800 text-slate-400 hover:text-red-400 rounded transition cursor-pointer"
                            title="Excluir Prazo"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>

                          <button
                            onClick={() => onSelectProcess(item.processId)}
                            className="text-amber-400 hover:text-amber-300 text-xs font-semibold flex items-center gap-0.5 cursor-pointer pl-1"
                          >
                            Autos <ChevronRight className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Deadline Form (Create / Edit) */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/80 backdrop-blur-sm flex justify-center items-center p-4">
          <div className="bg-slate-900 border border-slate-700 w-full max-w-lg rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                <CalendarIcon className="w-5 h-5 text-amber-400" />
                {editingDeadlineId ? 'Editar Prazo ou Audiência' : 'Lançar Novo Prazo ou Audiência'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveDeadline} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  Vincular ao Processo Judicial *
                </label>
                <select
                  value={selectedProcessId}
                  onChange={(e) => setSelectedProcessId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-slate-100 focus:border-amber-500 focus:outline-none font-mono"
                >
                  {processes.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.cnjNumber} - {p.activeParty}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  Título da Obrigação / Descrição do Prazo *
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Ex: Apelação Cível, Contestação, Audiência UNA..."
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-slate-100 focus:border-amber-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Tipo de Evento</label>
                  <select
                    value={type}
                    onChange={(e) => setType(e.target.value as any)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-slate-100 focus:border-amber-500 focus:outline-none"
                  >
                    <option value="Prazo CPC">Prazo CPC (Geral)</option>
                    <option value="Audiência">Audiência de Instrução/Conciliação</option>
                    <option value="Recurso">Recurso (Apelação, Agravo, Embargos)</option>
                    <option value="Manifestação">Manifestação / Petição Simples</option>
                    <option value="Perícia">Perícia / Quesitos</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Data Fatal *</label>
                  <input
                    type="date"
                    required
                    value={fatalDate}
                    onChange={(e) => setFatalDate(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-slate-100 focus:border-amber-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Astrea-style Legal Deadlines Calculator */}
              <div className="border border-slate-800 bg-slate-950/50 rounded-xl p-3 space-y-2">
                <button
                  type="button"
                  onClick={() => setShowCpcCalculator(!showCpcCalculator)}
                  className="w-full text-left font-bold text-amber-400 flex items-center justify-between text-xs hover:text-amber-300 cursor-pointer focus:outline-none"
                >
                  <span className="flex items-center gap-1.5 font-bold">
                    <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                    Calculadora Novo CPC (Dias Úteis) Astrea Style
                  </span>
                  <span>{showCpcCalculator ? 'Recolher ▲' : 'Expandir ▼'}</span>
                </button>
                
                {showCpcCalculator && (
                  <div className="space-y-2.5 pt-2 border-t border-slate-800/60 animate-in fade-in slide-in-from-top-2 duration-200">
                    <p className="text-[10px] text-slate-400 leading-normal">
                      Calcula a data fatal excluindo finais de semana e feriados nacionais brasileiros, conforme o Art. 219 do Novo CPC.
                    </p>
                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <label className="block text-[10px] text-slate-400 mb-1">Data da Intimação</label>
                        <input
                          type="date"
                          value={cpcStartDate}
                          onChange={(e) => setCpcStartDate(e.target.value)}
                          className="w-full px-2 py-1 bg-slate-900 border border-slate-700 rounded-lg text-slate-100 font-mono text-[11px] focus:outline-none focus:border-amber-500"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] text-slate-400 mb-1">Qtd. Dias</label>
                        <input
                          type="number"
                          value={cpcDays}
                          onChange={(e) => setCpcDays(Number(e.target.value))}
                          className="w-full px-2 py-1 bg-slate-900 border border-slate-700 rounded-lg text-slate-100 text-[11px] focus:outline-none focus:border-amber-500"
                          min={1}
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] text-slate-400 mb-1">Tipo de Dias</label>
                        <select
                          value={cpcType}
                          onChange={(e) => setCpcType(e.target.value as any)}
                          className="w-full px-2 py-1 bg-slate-900 border border-slate-700 rounded-lg text-slate-100 text-[11px] focus:outline-none focus:border-amber-500"
                        >
                          <option value="úteis">Dias Úteis</option>
                          <option value="corridos">Dias Corridos</option>
                        </select>
                      </div>
                    </div>
                    
                    <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                      <button
                        type="button"
                        onClick={handleApplyCpcCalculation}
                        className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-lg text-[11px] transition cursor-pointer"
                      >
                        Calcular & Aplicar
                      </button>
                      {cpcCalculationResult && (
                        <span className="text-[11px] text-emerald-400 font-bold bg-emerald-500/10 border border-emerald-500/20 px-2 py-1 rounded-lg">
                          {cpcCalculationResult}
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  Advogado(a) Responsável
                </label>
                <input
                  type="text"
                  value={responsibleLawyer}
                  onChange={(e) => setResponsibleLawyer(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-slate-100 focus:border-amber-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  Observações e Orientações da Peça
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                  placeholder="Teses a abordar, documentos anexos, preposto escalado..."
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-slate-100 focus:border-amber-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1 flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-amber-400" /> Notificação de Lembrete Prévio
                </label>
                <select
                  value={reminderHours}
                  onChange={(e) => setReminderHours(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-slate-100 focus:border-amber-500 focus:outline-none"
                >
                  <option value={12}>Disparar alerta 12 horas antes do vencimento</option>
                  <option value={24}>Disparar alerta 24 horas antes do vencimento (Padrão)</option>
                  <option value={48}>Disparar alerta 48 horas antes do vencimento</option>
                  <option value={72}>Disparar alerta 72 horas antes do vencimento</option>
                  <option value={0}>Sem lembrete prévio</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg font-semibold cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-lg font-bold cursor-pointer"
                >
                  {editingDeadlineId ? 'Salvar Alterações' : 'Confirmar Agendamento'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Delete Deadline Confirmation */}
      {deleteConfirm.isOpen && deleteConfirm.deadline && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/80 backdrop-blur-sm flex justify-center items-center p-4">
          <div className="bg-slate-900 border border-slate-700 w-full max-w-md rounded-2xl p-6 shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
              <Trash2 className="w-5 h-5 text-red-400" />
              Excluir Prazo da Agenda
            </h3>
            <p className="text-xs text-slate-300 leading-relaxed">
              Deseja realmente remover o prazo <strong className="text-amber-400">"{deleteConfirm.deadline.title}"</strong> vinculado ao processo {deleteConfirm.deadline.processNumber}?
            </p>
            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
              <button
                onClick={() => setDeleteConfirm({ isOpen: false, deadline: null })}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-semibold cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  onDeleteDeadline(deleteConfirm.deadline!.id);
                  setDeleteConfirm({ isOpen: false, deadline: null });
                }}
                className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-lg text-xs font-bold cursor-pointer"
              >
                Confirmar Exclusão
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
