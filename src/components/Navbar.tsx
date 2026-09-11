import React from 'react';
import { 
  Scale, 
  FileText, 
  Search, 
  Calendar, 
  Users, 
  Settings, 
  ShieldCheck,
  RefreshCw,
  Sparkles,
  Building2,
  Trash2,
  Sun,
  Moon,
  Server
} from 'lucide-react';
import { LawOfficeSettings, TeamMember } from '../types';

export type TabType = 'dashboard' | 'andamentos' | 'documentos' | 'prazos' | 'clientes' | 'equipe' | 'saas' | 'lixeira';

interface NavbarProps {
  currentTab: TabType;
  onSelectTab: (tab: TabType) => void;
  office: LawOfficeSettings;
  onOpenSettings: () => void;
  onOpenGlobalSearch?: () => void;
  onOpenMasterReset?: () => void;
  onOpenDatabaseInstaller?: () => void;
  isSyncing: boolean;
  onTriggerGlobalSync: () => void;
  activeDeadlinesCount: number;
  teamMembers: TeamMember[];
  activeUserId: string;
  onSelectActiveUser: (userId: string) => void;
  trashCount?: number;
  theme?: 'dark' | 'light';
  onToggleTheme?: (theme: 'dark' | 'light') => void;
  onSwitchToPlayground?: () => void;
}


export const Navbar: React.FC<NavbarProps> = ({
  currentTab,
  onSelectTab,
  office,
  onOpenSettings,
  onOpenGlobalSearch,
  onOpenMasterReset,
  onOpenDatabaseInstaller,
  isSyncing,
  onTriggerGlobalSync,
  activeDeadlinesCount,
  teamMembers,
  activeUserId,
  onSelectActiveUser,
  trashCount = 0,
  theme = 'dark',
  onToggleTheme,
  onSwitchToPlayground,
}) => {
  return (
    <header className="bg-slate-900 text-white border-b border-slate-800 sticky top-0 z-40 shadow-lg no-print">
      {/* Top micro bar with office and lawyer credentials */}
      <div className="bg-slate-950 px-3 sm:px-4 py-1.5 text-[11px] sm:text-xs text-slate-400 flex flex-wrap items-center justify-between gap-2 border-b border-slate-800/80">
        <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
          <span className="flex items-center gap-1.5 text-emerald-400 font-medium whitespace-nowrap">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse shrink-0"></span>
            Base DataJud / CNJ Conectada
          </span>
          <span className="hidden md:inline text-slate-600">|</span>
          <span className="hidden md:inline truncate max-w-xs xl:max-w-md">
            Advogado Resp.: <strong className="text-slate-200">{office.primaryLawyer.name}</strong> (OAB/{office.primaryLawyer.oabState} {office.primaryLawyer.oabNumber})
          </span>
        </div>
        <div className="flex items-center gap-2.5 ml-auto">
          {onSwitchToPlayground && (
            <button
              onClick={onSwitchToPlayground}
              className="flex items-center gap-1.5 text-amber-300 hover:text-amber-200 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 transition text-[11px] font-bold cursor-pointer py-0.5 px-2.5 rounded-lg shrink-0"
              title="Acessar o Google AI Studio Multimodal Playground"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-400 shrink-0 animate-pulse" />
              <span>Playground IA</span>
            </button>
          )}

          {onOpenDatabaseInstaller && (
            <button
              onClick={onOpenDatabaseInstaller}
              className="flex items-center gap-1 text-amber-300 hover:text-amber-200 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 transition text-[11px] font-bold cursor-pointer py-0.5 px-2 rounded-lg shrink-0"
              title="Gerar instalador para computador do escritório, rede local e banco de dados SQL"
            >
              <Server className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <span>Instalador PC / Rede / Banco SQL</span>
            </button>
          )}

          <span className="hidden lg:inline text-slate-400 truncate max-w-[180px]">
            {office.officeName}
          </span>
          <button
            onClick={onTriggerGlobalSync}
            disabled={isSyncing}
            className="flex items-center gap-1 text-slate-300 hover:text-amber-300 transition text-[11px] sm:text-xs font-medium cursor-pointer py-0.5 px-1.5 rounded hover:bg-slate-900 shrink-0"
            title="Sincronizar todos os processos com os diários e tribunais"
          >
            <RefreshCw className={`w-3.5 h-3.5 shrink-0 ${isSyncing ? 'animate-spin text-amber-400' : ''}`} />
            <span>{isSyncing ? 'Sincronizando...' : 'Atualizar Andamentos'}</span>
          </button>
        </div>
      </div>

      {/* Main navigation header */}
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14 sm:h-16 gap-2 sm:gap-4">
          {/* Logo & Brand */}
          <div className="flex items-center gap-2.5 sm:gap-3 cursor-pointer shrink-0" onClick={() => onSelectTab('dashboard')}>
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg bg-gradient-to-br from-amber-600 to-amber-700 flex items-center justify-center shadow-md shadow-amber-900/30 border border-amber-500/30 shrink-0">
              <Scale className="w-5 h-5 sm:w-6 sm:h-6 text-slate-950" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 sm:gap-2">
                <span className="font-extrabold text-sm sm:text-lg tracking-tight text-slate-100 uppercase truncate max-w-[130px] sm:max-w-none">
                  {office.officeName || 'WONO ADVOCACIA'}
                </span>
                <span className="hidden xs:flex text-[9px] sm:text-[10px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 font-semibold border border-amber-500/30 items-center gap-1 shrink-0">
                  <Sparkles className="w-2.5 h-2.5" /> IA & CNJ
                </span>
              </div>
              <p className="text-[10px] sm:text-xs text-slate-400 font-normal truncate max-w-[140px] sm:max-w-xs">
                {office.officeBrandTagline || 'Gestão Processual & Minutas'}
              </p>
            </div>
          </div>

          {/* Nav Items (Desktop / Tablet Large) */}
          <nav className="hidden lg:flex items-center gap-1">
            <button
              onClick={() => onSelectTab('dashboard')}
              className={`px-2.5 xl:px-3 py-2 rounded-lg text-xs xl:text-sm font-medium transition flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                currentTab === 'dashboard'
                  ? 'bg-slate-800 text-amber-400 shadow-inner'
                  : 'text-slate-300 hover:bg-slate-800/60 hover:text-white'
              }`}
            >
              <Scale className="w-4 h-4" />
              Painel Geral
            </button>

            <button
              onClick={() => {
                localStorage.setItem('wono_andamentos_view_mode', 'feed');
                onSelectTab('andamentos');
              }}
              className={`px-2.5 xl:px-3 py-2 rounded-lg text-xs xl:text-sm font-medium transition flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                currentTab === 'andamentos'
                  ? 'bg-slate-800 text-amber-400 shadow-inner'
                  : 'text-slate-300 hover:bg-slate-800/60 hover:text-white'
              }`}
            >
              <Search className="w-4 h-4" />
              Andamentos Online
              <span className="bg-amber-400/20 text-amber-300 text-[10px] px-1 py-0.2 rounded font-semibold">
                CNJ
              </span>
            </button>

            <button
              id="navbar-btn-busca-automatica"
              onClick={() => {
                localStorage.setItem('wono_andamentos_view_mode', 'search');
                onSelectTab('andamentos');
              }}
              className="px-2.5 xl:px-3 py-2 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded-lg text-xs xl:text-sm font-extrabold transition flex items-center gap-1.5 cursor-pointer whitespace-nowrap shadow-sm shadow-amber-500/10"
              title="Executar busca de processos por CPF, Nome, OAB ou CNJ nos tribunais"
            >
              <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
              <span>Busca Automática CNJ</span>
            </button>

            <button
              onClick={() => onSelectTab('documentos')}
              className={`px-2.5 xl:px-3 py-2 rounded-lg text-xs xl:text-sm font-medium transition flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                currentTab === 'documentos'
                  ? 'bg-slate-800 text-amber-400 shadow-inner'
                  : 'text-slate-300 hover:bg-slate-800/60 hover:text-white'
              }`}
            >
              <FileText className="w-4 h-4" />
              Procurações & Contratos
            </button>

            <button
              onClick={() => onSelectTab('prazos')}
              className={`px-2.5 xl:px-3 py-2 rounded-lg text-xs xl:text-sm font-medium transition flex items-center gap-1.5 cursor-pointer relative whitespace-nowrap ${
                currentTab === 'prazos'
                  ? 'bg-slate-800 text-amber-400 shadow-inner'
                  : 'text-slate-300 hover:bg-slate-800/60 hover:text-white'
              }`}
            >
              <Calendar className="w-4 h-4" />
              Prazos & Pautas
              {activeDeadlinesCount > 0 && (
                <span className="bg-rose-500 text-white text-[10px] px-1.5 py-0.5 rounded-full font-bold">
                  {activeDeadlinesCount}
                </span>
              )}
            </button>

            <button
              onClick={() => onSelectTab('clientes')}
              className={`px-2.5 xl:px-3 py-2 rounded-lg text-xs xl:text-sm font-medium transition flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                currentTab === 'clientes'
                  ? 'bg-slate-800 text-amber-400 shadow-inner'
                  : 'text-slate-300 hover:bg-slate-800/60 hover:text-white'
              }`}
            >
              <Users className="w-4 h-4" />
              Clientes
            </button>

            <button
              onClick={() => onSelectTab('equipe')}
              className={`px-2.5 xl:px-3 py-2 rounded-lg text-xs xl:text-sm font-medium transition flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                currentTab === 'equipe'
                  ? 'bg-slate-800 text-amber-400 shadow-inner'
                  : 'text-slate-300 hover:bg-slate-800/60 hover:text-white'
              }`}
            >
              <Users className="w-4 h-4 text-amber-400" />
              Equipe & Apoio
            </button>

            <button
              onClick={() => onSelectTab('saas')}
              className={`px-2.5 xl:px-3 py-2 rounded-lg text-xs xl:text-sm font-medium transition flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                currentTab === 'saas'
                  ? 'bg-slate-800 text-amber-400 shadow-inner'
                  : 'text-slate-300 hover:bg-slate-800/60 hover:text-white'
              }`}
            >
              <Building2 className="w-4 h-4" />
              Gestão SaaS
            </button>

            <button
              onClick={() => onSelectTab('lixeira')}
              className={`px-2.5 xl:px-3 py-2 rounded-lg text-xs xl:text-sm font-medium transition flex items-center gap-1.5 cursor-pointer relative whitespace-nowrap ${
                currentTab === 'lixeira'
                  ? 'bg-rose-950/40 text-rose-300 border border-rose-800/50 shadow-inner'
                  : 'text-slate-300 hover:bg-slate-800/60 hover:text-rose-300'
              }`}
              title="Lixeira e itens excluídos"
            >
              <Trash2 className="w-4 h-4 text-rose-400" />
              Lixeira
              {trashCount > 0 && (
                <span className="bg-rose-500/20 text-rose-300 border border-rose-500/30 text-[10px] px-1.5 py-0.2 rounded font-extrabold">
                  {trashCount}
                </span>
              )}
            </button>
          </nav>

          {/* Action buttons */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {/* Global Search Lupa Bar (Desktop) */}
            {onOpenGlobalSearch && (
              <button
                id="navbar-btn-lupa-busca"
                onClick={onOpenGlobalSearch}
                className="hidden md:flex items-center gap-2 px-2.5 xl:px-3 py-1.5 rounded-lg bg-slate-950/90 hover:bg-slate-800 border border-slate-800 hover:border-amber-500/40 text-slate-400 hover:text-slate-200 transition group cursor-pointer shadow-inner shrink-0"
                title="Lupa de Busca Geral (Ctrl+K) - Pesquise processos, partes, CPF, prazos e CNJ"
              >
                <Search className="w-4 h-4 text-amber-400 group-hover:scale-110 transition shrink-0" />
                <span className="text-xs font-medium text-slate-400 group-hover:text-slate-300 hidden xl:inline">
                  Buscar no sistema...
                </span>
                <span className="text-xs font-medium text-slate-400 group-hover:text-slate-300 xl:hidden">
                  Buscar...
                </span>
                <kbd className="text-[10px] px-1.5 py-0.5 rounded bg-slate-900 border border-slate-700 text-slate-400 font-mono group-hover:border-amber-500/40">
                  Ctrl+K
                </kbd>
              </button>
            )}

            {/* Mobile Search Lupa Button */}
            {onOpenGlobalSearch && (
              <button
                id="mobile-btn-lupa-busca"
                onClick={onOpenGlobalSearch}
                className="md:hidden p-2 min-h-[38px] min-w-[38px] flex items-center justify-center text-amber-400 hover:text-white bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 rounded-lg transition cursor-pointer shrink-0 shadow-sm"
                title="Lupa de Busca Geral"
              >
                <Search className="w-4 h-4" />
              </button>
            )}

            {/* Session Switcher with Badge */}
            <div className="flex items-center gap-1 bg-slate-950/80 px-2 sm:px-2.5 py-1.5 rounded-lg border border-slate-800 shrink-0">
              <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider hidden md:inline">Operador:</span>
              <select
                value={activeUserId}
                onChange={(e) => onSelectActiveUser(e.target.value)}
                className="bg-transparent text-[11px] sm:text-xs font-semibold text-amber-300 focus:outline-none cursor-pointer pr-1 max-w-[90px] sm:max-w-[140px] truncate"
                title="Trocar operador ativo para testar níveis de privilégio"
              >
                {teamMembers.map((member) => (
                  <option key={member.id} value={member.id} className="bg-slate-900 text-slate-100 text-xs">
                    {member.name.split(' ')[0]} ({member.privilege === 'total' ? 'Master' : member.privilege === 'parcial' ? 'Parcial' : 'Leitura'})
                  </option>
                ))}
              </select>
            </div>

            {/* Servidor Grátis & Banco de Dados Button */}
            {onOpenDatabaseInstaller && (
              <button
                id="navbar-btn-servidor-gratis"
                onClick={onOpenDatabaseInstaller}
                className="flex items-center gap-1.5 px-2.5 py-1.5 bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/35 rounded-lg transition text-xs font-black cursor-pointer shrink-0 shadow-sm shadow-emerald-500/10"
                title="Instalar Servidor Grátis no PC ou na Nuvem & Gerar Banco de Dados SQL"
              >
                <Server className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span className="hidden sm:inline">Servidor Grátis</span>
                <span className="bg-emerald-400/20 text-emerald-200 text-[9px] px-1 py-0.2 rounded font-black hidden xl:inline">
                  R$ 0,00
                </span>
              </button>
            )}

            {/* Master Reset / Exclusão Geral Button */}
            {onOpenMasterReset && (
              <button
                onClick={onOpenMasterReset}
                className="hidden md:flex items-center gap-1.5 px-2.5 py-1.5 bg-rose-950/40 hover:bg-rose-600 text-rose-300 hover:text-white border border-rose-800/60 rounded-lg transition text-xs font-bold cursor-pointer shrink-0"
                title="Exclusão Geral - Zerar Todo o Sistema"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span className="hidden xl:inline">Zerar Sistema</span>
              </button>
            )}

            {/* Quick Dark / Light Theme Toggle */}
            <button
              onClick={() => onToggleTheme && onToggleTheme(theme === 'dark' ? 'light' : 'dark')}
              className="p-2 min-h-[38px] min-w-[38px] flex items-center justify-center text-slate-400 hover:text-amber-400 hover:bg-slate-800 rounded-lg transition cursor-pointer shrink-0 border border-slate-800"
              title={theme === 'dark' ? 'Mudar para Modo Claro (Light)' : 'Mudar para Modo Escuro (Dark)'}
            >
              {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-300" />}
            </button>

            <button
              onClick={onOpenSettings}
              className="p-2 min-h-[38px] min-w-[38px] flex items-center justify-center text-slate-400 hover:text-slate-100 hover:bg-slate-800 rounded-lg transition cursor-pointer shrink-0 border border-slate-800"
              title="Configurações do Escritório & OAB"
            >
              <Settings className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Mobile / Tablet Horizontal Navigation Scrollbar */}
      <div className="lg:hidden bg-slate-950 border-t border-slate-800/80 px-2 py-1.5">
        <div className="flex items-center gap-1 overflow-x-auto no-scrollbar scroll-smooth">
          {onOpenGlobalSearch && (
            <button
              onClick={onOpenGlobalSearch}
              className="flex items-center gap-1.5 px-3 py-2 bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/40 rounded-lg text-xs font-extrabold shrink-0 transition shadow-sm cursor-pointer"
              title="Abrir Lupa de Busca Geral"
            >
              <Search className="w-3.5 h-3.5 text-amber-400" />
              <span>Lupa de Busca</span>
            </button>
          )}

          <button
            onClick={() => onSelectTab('dashboard')}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold shrink-0 transition ${
              currentTab === 'dashboard'
                ? 'bg-amber-500 text-slate-950 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            <Scale className="w-4 h-4" />
            Painel
          </button>

          <button
            onClick={() => {
              localStorage.setItem('wono_andamentos_view_mode', 'feed');
              onSelectTab('andamentos');
            }}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold shrink-0 transition ${
              currentTab === 'andamentos'
                ? 'bg-amber-500 text-slate-950 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            <Search className="w-4 h-4" />
            Andamentos
          </button>

          <button
            id="mobile-navbar-btn-busca-automatica"
            onClick={() => {
              localStorage.setItem('wono_andamentos_view_mode', 'search');
              onSelectTab('andamentos');
            }}
            className="flex items-center gap-1.5 px-3 py-2 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded-lg text-xs font-bold shrink-0 transition"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            Busca Automática
          </button>

          <button
            onClick={() => onSelectTab('documentos')}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold shrink-0 transition ${
              currentTab === 'documentos'
                ? 'bg-amber-500 text-slate-950 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            <FileText className="w-4 h-4" />
            Documentos
          </button>

          <button
            onClick={() => onSelectTab('prazos')}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold shrink-0 transition relative ${
              currentTab === 'prazos'
                ? 'bg-amber-500 text-slate-950 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            <Calendar className="w-4 h-4" />
            Prazos
            {activeDeadlinesCount > 0 && (
              <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse"></span>
            )}
          </button>

          <button
            onClick={() => onSelectTab('clientes')}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold shrink-0 transition ${
              currentTab === 'clientes'
                ? 'bg-amber-500 text-slate-950 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            <Users className="w-4 h-4" />
            Clientes
          </button>

          <button
            onClick={() => onSelectTab('equipe')}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold shrink-0 transition ${
              currentTab === 'equipe'
                ? 'bg-amber-500 text-slate-950 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            <Users className="w-4 h-4 text-amber-400" />
            Equipe
          </button>

          <button
            onClick={() => onSelectTab('saas')}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold shrink-0 transition ${
              currentTab === 'saas'
                ? 'bg-amber-500 text-slate-950 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            <Building2 className="w-4 h-4" />
            SaaS
          </button>

          {onOpenDatabaseInstaller && (
            <button
              onClick={onOpenDatabaseInstaller}
              className="flex items-center gap-1.5 px-3 py-2 bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 rounded-lg text-xs font-black shrink-0 transition"
              title="Instalar Servidor Grátis & Banco"
            >
              <Server className="w-3.5 h-3.5 text-emerald-400" />
              <span>Servidor Grátis</span>
            </button>
          )}

          <button
            onClick={() => onSelectTab('lixeira')}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold shrink-0 transition ${
              currentTab === 'lixeira'
                ? 'bg-rose-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-rose-300 hover:bg-slate-900'
            }`}
          >
            <Trash2 className="w-4 h-4" />
            Lixeira {trashCount > 0 && `(${trashCount})`}
          </button>
        </div>
      </div>
    </header>
  );
};
