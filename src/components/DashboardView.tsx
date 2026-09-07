import React from 'react';
import { 
  Scale, 
  Search, 
  FileText, 
  Calendar, 
  Users, 
  AlertTriangle, 
  Clock, 
  CheckCircle2, 
  Sparkles, 
  ArrowRight, 
  Share2, 
  TrendingUp,
  Building2,
  ExternalLink,
  MessageSquare
} from 'lucide-react';
import { LegalProcess, ProcessDeadline, Client, LawOfficeSettings } from '../types';
import { TabType } from './Navbar';
import { formatCurrencyBRL } from '../utils/documentGenerator';

interface DashboardViewProps {
  processes: LegalProcess[];
  deadlines: ProcessDeadline[];
  clients: Client[];
  office: LawOfficeSettings;
  onNavigateTab: (tab: TabType) => void;
  onSelectProcess: (processId: string) => void;
  onOpenNewDocumentModal: (type?: string, clientId?: string) => void;
  onOpenGlobalSearch?: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  processes,
  deadlines,
  clients,
  office,
  onNavigateTab,
  onSelectProcess,
  onOpenNewDocumentModal,
  onOpenGlobalSearch,
}) => {
  const activeProcesses = processes.filter((p) => p.status === 'Ativo');
  const pendingDeadlines = deadlines.filter((d) => d.status !== 'cumprido');
  const urgentDeadlines = deadlines.filter((d) => d.status === 'alerta' || d.status === 'atrasado');

  // Flatten recent movements from all processes
  const recentMovements = processes
    .flatMap((proc) =>
      proc.movements.map((mov, idx) => ({
        ...mov,
        uniqueKey: `${proc.id}-${mov.id}-${idx}`,
        processId: proc.id,
        cnjNumber: proc.cnjNumber,
        clientName: proc.activeParty,
        court: proc.court,
      }))
    )
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 5);

  const totalValueInLitigation = processes.reduce((acc, p) => acc + (p.value || 0), 0);

  const handleDeepLinkFromDashboard = (cnj: string) => {
    localStorage.setItem('wono_search_cnj_query', cnj);
    localStorage.setItem('wono_andamentos_view_mode', 'search');
    onNavigateTab('processes');
  };

  const handleSendWhatsApp = (phone: string, text: string) => {
    const cleanPhone = phone.replace(/[^0-9]/g, '');
    const encoded = encodeURIComponent(text);
    window.open(`https://wa.me/55${cleanPhone}?text=${encoded}`, '_blank');
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-850 to-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-6 shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 w-96 h-96 bg-amber-500/5 rounded-full blur-3xl pointer-events-none"></div>
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 sm:gap-6 relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" /> Escritório Conectado
              </span>
              <span className="text-xs text-slate-400">
                OAB/{office.primaryLawyer.oabState} nº {office.primaryLawyer.oabNumber}
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl md:text-3xl font-extrabold text-slate-100 tracking-tight">
              Olá, {office.primaryLawyer.name}
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 mt-1 max-w-2xl leading-relaxed">
              Sistema de monitoramento processual ativo. Os andamentos judiciais da base DataJud/CNJ estão sincronizados com sua pauta de prazos e gerador de procurações.
            </p>
          </div>

          {/* Quick Action Hub Buttons */}
          <div className="flex flex-wrap sm:flex-nowrap gap-2 sm:gap-2.5 w-full lg:w-auto">
            <button
              id="dashboard-btn-busca-automatica"
              onClick={() => {
                localStorage.setItem('wono_andamentos_view_mode', 'search');
                onNavigateTab('andamentos');
              }}
              className="px-3.5 sm:px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs sm:text-sm transition flex items-center justify-center gap-2 shadow-lg shadow-amber-500/30 cursor-pointer flex-1 sm:flex-initial whitespace-nowrap"
            >
              <Sparkles className="w-4 h-4 shrink-0 text-slate-950" />
              <span>Busca Automática CNJ</span>
            </button>
            <button
              onClick={() => {
                localStorage.setItem('wono_andamentos_view_mode', 'feed');
                onNavigateTab('andamentos');
              }}
              className="px-3 sm:px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-semibold text-xs sm:text-sm transition flex items-center justify-center gap-1.5 cursor-pointer flex-1 sm:flex-initial whitespace-nowrap"
            >
              <Search className="w-4 h-4 text-amber-400 shrink-0" />
              <span>Ver Processos</span>
            </button>
            <button
              onClick={() => onOpenNewDocumentModal('procuracao')}
              className="px-3 sm:px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-semibold text-xs sm:text-sm transition flex items-center justify-center gap-1.5 cursor-pointer flex-1 sm:flex-initial whitespace-nowrap"
            >
              <FileText className="w-4 h-4 text-amber-400 shrink-0" />
              <span>Procuração</span>
            </button>
            <button
              onClick={() => onOpenNewDocumentModal('contrato_honorarios')}
              className="px-3 sm:px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-semibold text-xs sm:text-sm transition flex items-center justify-center gap-1.5 cursor-pointer flex-1 sm:flex-initial whitespace-nowrap"
            >
              <Scale className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Contrato</span>
            </button>
          </div>
        </div>
      </div>

      {/* Lupa de Busca Global - Central Search Hub Card */}
      {onOpenGlobalSearch && (
        <div 
          onClick={onOpenGlobalSearch}
          className="bg-slate-900/90 hover:bg-slate-900 border border-slate-800 hover:border-amber-500/50 rounded-2xl p-3.5 sm:p-4 shadow-lg flex items-center justify-between gap-3 sm:gap-4 transition cursor-pointer group shadow-amber-950/10"
        >
          <div className="flex items-center gap-3 sm:gap-4 flex-1 min-w-0">
            <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 group-hover:scale-105 transition shrink-0 shadow-inner">
              <Search className="w-5 h-5" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="text-xs sm:text-sm font-bold text-slate-100 group-hover:text-amber-300 transition">
                  Lupa de Busca Geral & CNJ
                </span>
                <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-500/15 text-amber-300 font-bold border border-amber-500/25">
                  Atalho Global
                </span>
              </div>
              <p className="text-xs text-slate-400 truncate mt-0.5">
                Pesquise por Processo CNJ, Autor, Réu, CPF/CNPJ, Prazos Fatais, Clientes ou Documentos...
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <kbd className="hidden sm:inline-block text-[11px] px-2.5 py-1 bg-slate-950 border border-slate-700 rounded-lg text-slate-400 font-mono group-hover:border-amber-500/40">
              Ctrl + K
            </kbd>
            <button 
              type="button"
              className="px-3 sm:px-4 py-2 bg-amber-500 group-hover:bg-amber-400 text-slate-950 rounded-xl font-bold text-xs sm:text-sm transition flex items-center gap-1.5 shadow-md shadow-amber-500/20 pointer-events-none"
            >
              <span>Buscar</span>
              <Search className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Card 1: Processos Ativos */}
        <div 
          onClick={() => onNavigateTab('andamentos')}
          className="bg-slate-900 border border-slate-800 hover:border-slate-700 p-5 rounded-xl transition cursor-pointer group shadow-sm"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Processos Ativos</span>
            <div className="w-9 h-9 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center group-hover:scale-110 transition">
              <Scale className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-100">{processes.length}</div>
          <div className="text-xs text-slate-400 mt-1 flex items-center justify-between">
            <span>{activeProcesses.length} em andamento</span>
            <span className="text-blue-400 font-medium flex items-center gap-0.5">
              Ver todos <ArrowRight className="w-3 h-3" />
            </span>
          </div>
        </div>

        {/* Card 2: Prazos Fatais & Audiências */}
        <div 
          onClick={() => onNavigateTab('prazos')}
          className="bg-slate-900 border border-slate-800 hover:border-slate-700 p-5 rounded-xl transition cursor-pointer group shadow-sm"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Prazos & Audiências</span>
            <div className={`w-9 h-9 rounded-lg flex items-center justify-center group-hover:scale-110 transition ${
              urgentDeadlines.length > 0 ? 'bg-rose-500/10 text-rose-400' : 'bg-amber-500/10 text-amber-400'
            }`}>
              <Calendar className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-100">{pendingDeadlines.length}</div>
          <div className="text-xs text-slate-400 mt-1 flex items-center justify-between">
            <span className={urgentDeadlines.length > 0 ? 'text-rose-400 font-semibold' : ''}>
              {urgentDeadlines.length} urgentes / alerta
            </span>
            <span className="text-amber-400 font-medium flex items-center gap-0.5">
              Pauta CPC <ArrowRight className="w-3 h-3" />
            </span>
          </div>
        </div>

        {/* Card 3: Clientes Ativos */}
        <div 
          onClick={() => onNavigateTab('clientes')}
          className="bg-slate-900 border border-slate-800 hover:border-slate-700 p-5 rounded-xl transition cursor-pointer group shadow-sm"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Clientes Cadastrados</span>
            <div className="w-9 h-9 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center group-hover:scale-110 transition">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-100">{clients.length}</div>
          <div className="text-xs text-slate-400 mt-1 flex items-center justify-between">
            <span>PF & PJ qualificados</span>
            <span className="text-emerald-400 font-medium flex items-center gap-0.5">
              Gerenciar <ArrowRight className="w-3 h-3" />
            </span>
          </div>
        </div>

        {/* Card 4: Valor em Contencioso */}
        <div className="bg-slate-900 border border-slate-800 p-5 rounded-xl shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Valor das Causas</span>
            <div className="w-9 h-9 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
          <div className="text-xl font-bold text-slate-100">{formatCurrencyBRL(totalValueInLitigation)}</div>
          <div className="text-xs text-slate-400 mt-1">
            Volume financeiro sob patrocínio
          </div>
        </div>
      </div>

      {/* Main 2-Column Section: Latest Andamentos vs Urgent Deadlines */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Column 1 & 2: Recent Andamentos from Online Base */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
                <Search className="w-4 h-4 text-amber-400" />
                Últimos Andamentos Coletados
              </h2>
              <span className="text-[10px] px-2 py-0.5 rounded bg-amber-500/10 text-amber-300 font-semibold border border-amber-500/20">
                Sincronizado
              </span>
            </div>
            <button
              onClick={() => onNavigateTab('andamentos')}
              className="text-xs text-amber-400 hover:text-amber-300 font-medium flex items-center gap-1 cursor-pointer"
            >
              Ver todos os processos <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-3">
            {recentMovements.map((mov) => {
              const dateFormatted = new Date(mov.date).toLocaleDateString('pt-BR', {
                day: '2-digit',
                month: 'short',
                hour: '2-digit',
                minute: '2-digit',
              });

              return (
                <div
                  key={mov.uniqueKey}
                  className="bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-xl p-4 transition space-y-3 shadow-sm"
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span 
                          onClick={() => handleDeepLinkFromDashboard(mov.cnjNumber)}
                          className="text-xs font-mono font-bold text-amber-400 hover:text-amber-300 hover:underline cursor-pointer flex items-center gap-1 group"
                          title="Clique para pesquisar este processo nos Tribunais em tempo real"
                        >
                          {mov.cnjNumber}
                          <Search className="w-3.5 h-3.5 text-amber-400 opacity-70 group-hover:opacity-100 transition" />
                        </span>
                        <span className="text-slate-500">•</span>
                        <span className="text-xs text-slate-300 font-semibold">{mov.clientName}</span>
                      </div>
                      <h3 className="text-sm font-bold text-slate-100 mt-1">
                        {mov.title}
                      </h3>
                    </div>
                    <span className="text-xs text-slate-400 bg-slate-800/80 px-2.5 py-1 rounded-md">
                      {dateFormatted}
                    </span>
                  </div>

                  <p className="text-xs text-slate-300 bg-slate-950/60 p-3 rounded-lg border border-slate-800/80 line-clamp-3 leading-relaxed">
                    {mov.description}
                  </p>

                  {/* AI Insight Box if available */}
                  {mov.aiAnalysis && (
                    <div className="bg-amber-950/20 border border-amber-500/20 rounded-lg p-3 text-xs space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-amber-300 flex items-center gap-1">
                          <Sparkles className="w-3.5 h-3.5 text-amber-400" /> Resumo Jurídico & Ação:
                        </span>
                        {mov.aiAnalysis.urgency && (
                          <span className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase ${
                            mov.aiAnalysis.urgency === 'alta' || mov.aiAnalysis.urgency === 'fatal'
                              ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                              : 'bg-emerald-500/20 text-emerald-300'
                          }`}>
                            Urgência: {mov.aiAnalysis.urgency}
                          </span>
                        )}
                      </div>
                      <p className="text-slate-200">
                        {mov.aiAnalysis.summary}
                      </p>
                      <p className="text-slate-400 text-[11px]">
                        <strong>Providência Sugerida:</strong> {mov.aiAnalysis.recommendedAction}
                      </p>
                    </div>
                  )}

                  {/* Actions Bar */}
                  <div className="flex items-center justify-between pt-1 text-xs">
                    <button
                      onClick={() => onSelectProcess(mov.processId)}
                      className="text-amber-400 hover:text-amber-300 font-semibold flex items-center gap-1 cursor-pointer"
                    >
                      Ver autos completos <ArrowRight className="w-3.5 h-3.5" />
                    </button>

                    {mov.aiAnalysis?.suggestedWhatsApp && (
                      <button
                        onClick={() => {
                          const client = clients.find((c) => c.name === mov.clientName);
                          handleSendWhatsApp(
                            client?.whatsapp || client?.phone || office.phone,
                            mov.aiAnalysis!.suggestedWhatsApp
                          );
                        }}
                        className="px-3 py-1 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 rounded-lg font-medium transition flex items-center gap-1.5 cursor-pointer"
                        title="Enviar explicação em linguagem clara para o cliente via WhatsApp"
                      >
                        <MessageSquare className="w-3.5 h-3.5 text-emerald-400" />
                        Avisar Cliente no WhatsApp
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Column 3: Deadlines and Fast Document Generator */}
        <div className="space-y-6">
          {/* Deadlines Box */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                <Calendar className="w-4 h-4 text-amber-400" />
                Prazos Fatais Próximos
              </h2>
              <button
                onClick={() => onNavigateTab('prazos')}
                className="text-xs text-amber-400 hover:text-amber-300 cursor-pointer"
              >
                Pauta Completa
              </button>
            </div>

            <div className="space-y-2.5">
              {pendingDeadlines.length === 0 ? (
                <p className="text-xs text-slate-400 py-4 text-center">Nenhum prazo pendente no momento.</p>
              ) : (
                pendingDeadlines.map((dead) => (
                  <div
                    key={dead.id}
                    className="p-3 bg-slate-950 border border-slate-800 rounded-lg space-y-1.5 text-xs"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-slate-200 line-clamp-1">{dead.title}</span>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        dead.daysLeft <= 3
                          ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                          : 'bg-amber-500/20 text-amber-300'
                      }`}>
                        {dead.daysLeft} dias
                      </span>
                    </div>
                    <div className="text-slate-400 flex items-center justify-between text-[11px]">
                      <span>{dead.clientName}</span>
                      <span>Fatal: {new Date(dead.fatalDate + 'T12:00:00').toLocaleDateString('pt-BR')}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Quick Document Builder Callout */}
          <div className="bg-gradient-to-br from-slate-900 to-amber-950/40 border border-amber-500/30 rounded-xl p-5 shadow-sm space-y-3">
            <div className="flex items-center gap-2 text-amber-400 font-bold text-sm">
              <FileText className="w-4 h-4" />
              Minutas Jurídicas Rápidas
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              Gere procurações com poderes especiais (CPC Art. 105) e contratos de honorários com taxa de êxito e quitação formatados para impressão em folha A4 com timbre do escritório.
            </p>
            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                onClick={() => onOpenNewDocumentModal('procuracao')}
                className="p-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold text-center border border-slate-700 cursor-pointer"
              >
                Procuração
              </button>
              <button
                onClick={() => onOpenNewDocumentModal('contrato_honorarios')}
                className="p-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold text-center border border-slate-700 cursor-pointer"
              >
                Contrato Honorários
              </button>
              <button
                onClick={() => onOpenNewDocumentModal('declaracao_hipossuficiencia')}
                className="p-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold text-center border border-slate-700 cursor-pointer"
              >
                Justiça Gratuita
              </button>
              <button
                onClick={() => onOpenNewDocumentModal('recibo_honorarios')}
                className="p-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold text-center border border-slate-700 cursor-pointer"
              >
                Recibo Quitação
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
