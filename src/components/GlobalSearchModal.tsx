import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  Search, 
  X, 
  Scale, 
  Users, 
  Calendar, 
  FileText, 
  ArrowRight, 
  Sparkles, 
  ExternalLink, 
  Clock, 
  CheckCircle2, 
  AlertCircle,
  Building,
  Hash
} from 'lucide-react';
import { LegalProcess, Client, ProcessDeadline, LegalDocumentItem } from '../types';
import { TabType } from './Navbar';

interface GlobalSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  processes: LegalProcess[];
  clients: Client[];
  deadlines: ProcessDeadline[];
  documents: LegalDocumentItem[];
  onSelectProcess: (processId: string) => void;
  onNavigateTab: (tab: TabType) => void;
  onOpenOnlineSearchWithQuery?: (query: string) => void;
}

type FilterCategory = 'all' | 'processes' | 'clients' | 'deadlines' | 'documents';

export const GlobalSearchModal: React.FC<GlobalSearchModalProps> = ({
  isOpen,
  onClose,
  processes,
  clients,
  deadlines,
  documents,
  onSelectProcess,
  onNavigateTab,
  onOpenOnlineSearchWithQuery,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeCategory, setActiveCategory] = useState<FilterCategory>('all');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const resultsContainerRef = useRef<HTMLDivElement>(null);

  // Focus input automatically on open
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
      setSelectedIndex(0);
    } else {
      setSearchTerm('');
      setActiveCategory('all');
    }
  }, [isOpen]);

  // Clean search query
  const cleanQuery = searchTerm.trim().toLowerCase();
  const rawDigits = searchTerm.replace(/[^0-9]/g, '');

  // 1. Matched Processes
  const matchedProcesses = useMemo(() => {
    if (!cleanQuery) return processes.slice(0, 5);
    return processes.filter((proc) => {
      const cnjClean = proc.cnjNumber.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
      const activeParty = (proc.activeParty || '').toLowerCase();
      const passiveParty = (proc.passiveParty || '').toLowerCase();
      const subject = (proc.subject || '').toLowerCase();
      const court = (proc.court || '').toLowerCase();
      const lawsuitType = (proc.lawsuitType || '').toLowerCase();
      const branchVara = (proc.branchVara || '').toLowerCase();
      const judge = (proc.judge || '').toLowerCase();
      const lawyer = (proc.responsibleLawyer || '').toLowerCase();

      return (
        cnjClean.includes(rawDigits || cleanQuery) ||
        activeParty.includes(cleanQuery) ||
        passiveParty.includes(cleanQuery) ||
        subject.includes(cleanQuery) ||
        court.includes(cleanQuery) ||
        lawsuitType.includes(cleanQuery) ||
        branchVara.includes(cleanQuery) ||
        judge.includes(cleanQuery) ||
        lawyer.includes(cleanQuery)
      );
    });
  }, [processes, cleanQuery, rawDigits]);

  // 2. Matched Clients
  const matchedClients = useMemo(() => {
    if (!cleanQuery) return clients.slice(0, 4);
    return clients.filter((client) => {
      const name = (client.name || '').toLowerCase();
      const cpfClean = (client.cpfCnpj || '').replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
      const email = (client.email || '').toLowerCase();
      const phone = (client.phone || '').replace(/[^0-9]/g, '');
      const city = (client.city || '').toLowerCase();
      const state = (client.state || '').toLowerCase();

      return (
        name.includes(cleanQuery) ||
        cpfClean.includes(rawDigits || cleanQuery) ||
        email.includes(cleanQuery) ||
        (rawDigits && phone.includes(rawDigits)) ||
        city.includes(cleanQuery) ||
        state.includes(cleanQuery)
      );
    });
  }, [clients, cleanQuery, rawDigits]);

  // 3. Matched Deadlines
  const matchedDeadlines = useMemo(() => {
    if (!cleanQuery) return deadlines.slice(0, 4);
    return deadlines.filter((deadline) => {
      const title = (deadline.title || '').toLowerCase();
      const procNum = (deadline.processNumber || '').replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
      const desc = (deadline.description || '').toLowerCase();
      const cat = (deadline.category || '').toLowerCase();
      const date = deadline.fatalDate || '';

      return (
        title.includes(cleanQuery) ||
        procNum.includes(rawDigits || cleanQuery) ||
        desc.includes(cleanQuery) ||
        cat.includes(cleanQuery) ||
        date.includes(cleanQuery)
      );
    });
  }, [deadlines, cleanQuery, rawDigits]);

  // 4. Matched Documents
  const matchedDocuments = useMemo(() => {
    if (!cleanQuery) return documents.slice(0, 4);
    return documents.filter((doc) => {
      const title = (doc.title || '').toLowerCase();
      const clientName = (doc.clientName || '').toLowerCase();
      const procNum = (doc.processNumber || '').replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
      const type = (doc.type || '').toLowerCase();

      return (
        title.includes(cleanQuery) ||
        clientName.includes(cleanQuery) ||
        procNum.includes(rawDigits || cleanQuery) ||
        type.includes(cleanQuery)
      );
    });
  }, [documents, cleanQuery, rawDigits]);

  // Combined flat results array for keyboard navigation
  const flatResults = useMemo(() => {
    const list: Array<{
      id: string;
      category: 'process' | 'client' | 'deadline' | 'document' | 'cnj_online';
      title: string;
      subtitle: string;
      action: () => void;
      badge?: string;
      badgeColor?: string;
    }> = [];

    // If query exists, always offer instant Online DataJud Search option at top or bottom
    if (cleanQuery.length >= 2) {
      list.push({
        id: 'cnj-online-search-action',
        category: 'cnj_online',
        title: `Consultar "${searchTerm}" no CNJ / DataJud (Varredura Nacional Ao Vivo)`,
        subtitle: 'Buscar processos nos 92 Tribunais Brasileiros (TJ, TRF, TRT, STJ, STF) em tempo real',
        action: () => {
          localStorage.setItem('wono_andamentos_view_mode', 'search');
          localStorage.setItem('wono_andamentos_prefill_query', searchTerm);
          if (onOpenOnlineSearchWithQuery) {
            onOpenOnlineSearchWithQuery(searchTerm);
          } else {
            onNavigateTab('andamentos');
          }
          onClose();
        },
        badge: 'CNJ DataJud',
        badgeColor: 'bg-amber-500/20 text-amber-300 border-amber-500/30'
      });
    }

    if (activeCategory === 'all' || activeCategory === 'processes') {
      matchedProcesses.forEach((p) => {
        list.push({
          id: `proc-${p.id}`,
          category: 'process',
          title: `Processo nº ${p.cnjNumber}`,
          subtitle: `${p.activeParty} vs ${p.passiveParty} • ${p.court} (${p.branchVara || p.comarca})`,
          action: () => {
            onSelectProcess(p.id);
            localStorage.setItem('wono_andamentos_view_mode', 'feed');
            onNavigateTab('andamentos');
            onClose();
          },
          badge: p.status,
          badgeColor: p.status === 'Ativo' ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' : 'bg-slate-700 text-slate-300 border-slate-600'
        });
      });
    }

    if (activeCategory === 'all' || activeCategory === 'clients') {
      matchedClients.forEach((c) => {
        list.push({
          id: `client-${c.id}`,
          category: 'client',
          title: c.name,
          subtitle: `CPF/CNPJ: ${c.cpfCnpj || 'Não informado'} • ${c.phone || c.email || 'Sem contato'} • ${c.city || ''}/${c.state || ''}`,
          action: () => {
            onNavigateTab('clientes');
            onClose();
          },
          badge: c.type === 'PJ' ? 'Pessoa Jurídica' : 'Pessoa Física',
          badgeColor: 'bg-blue-500/20 text-blue-300 border-blue-500/30'
        });
      });
    }

    if (activeCategory === 'all' || activeCategory === 'deadlines') {
      matchedDeadlines.forEach((d) => {
        const days = d.daysLeft ?? 0;
        list.push({
          id: `deadline-${d.id}`,
          category: 'deadline',
          title: d.title,
          subtitle: `Proc: ${d.processNumber} • Data Fatal: ${new Date(d.fatalDate + 'T12:00:00').toLocaleDateString('pt-BR')} • ${d.category}`,
          action: () => {
            onNavigateTab('prazos');
            onClose();
          },
          badge: d.status === 'cumprido' ? 'Cumprido' : days < 0 ? `${Math.abs(days)}d Atrasado` : days === 0 ? 'Vence Hoje!' : `${days}d Restantes`,
          badgeColor: d.status === 'cumprido' ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' : days <= 3 ? 'bg-rose-500/20 text-rose-300 border-rose-500/30' : 'bg-amber-500/20 text-amber-300 border-amber-500/30'
        });
      });
    }

    if (activeCategory === 'all' || activeCategory === 'documents') {
      matchedDocuments.forEach((doc) => {
        list.push({
          id: `doc-${doc.id}`,
          category: 'document',
          title: doc.title,
          subtitle: `Cliente: ${doc.clientName || 'Geral'} • Tipo: ${doc.type.toUpperCase()} • Criado em: ${new Date(doc.createdAt).toLocaleDateString('pt-BR')}`,
          action: () => {
            onNavigateTab('documentos');
            onClose();
          },
          badge: doc.status === 'assinado' ? 'Assinado' : 'Rascunho',
          badgeColor: doc.status === 'assinado' ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' : 'bg-slate-700 text-slate-300 border-slate-600'
        });
      });
    }

    return list;
  }, [cleanQuery, searchTerm, activeCategory, matchedProcesses, matchedClients, matchedDeadlines, matchedDocuments, onSelectProcess, onNavigateTab, onOpenOnlineSearchWithQuery, onClose]);

  // Keyboard navigation inside modal
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev < flatResults.length - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : flatResults.length - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (flatResults[selectedIndex]) {
        flatResults[selectedIndex].action();
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-start justify-center p-3 sm:p-6 md:p-10 bg-slate-950/80 backdrop-blur-md animate-fade-in no-print overflow-y-auto"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div 
        className="bg-slate-900 border border-slate-700/80 rounded-2xl max-w-3xl w-full shadow-2xl overflow-hidden mt-6 sm:mt-12 flex flex-col max-h-[85vh] transition-all border-amber-500/20"
        onKeyDown={handleKeyDown}
      >
        {/* Search Header with Lupa Bar */}
        <div className="p-3.5 sm:p-4 bg-slate-950 border-b border-slate-800 flex items-center gap-3 relative">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500/20 to-amber-600/30 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0 shadow-inner">
            <Search className="w-5 h-5" />
          </div>

          <div className="flex-1 relative">
            <input
              ref={inputRef}
              type="text"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setSelectedIndex(0);
              }}
              placeholder="Digite o número CNJ, nome da parte, CPF/CNPJ, prazo, advogado ou documento..."
              className="w-full bg-transparent text-sm sm:text-base text-slate-100 placeholder:text-slate-500 focus:outline-none pr-8 font-medium"
            />
            {searchTerm && (
              <button
                onClick={() => {
                  setSearchTerm('');
                  inputRef.current?.focus();
                }}
                className="absolute right-0 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-white rounded-md hover:bg-slate-800"
                title="Limpar busca"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <kbd className="hidden sm:inline-block text-[11px] px-2 py-1 bg-slate-800 border border-slate-700 rounded text-slate-400 font-mono">
              ESC
            </kbd>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition"
              title="Fechar (ESC)"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Filter Badges Bar */}
        <div className="px-3.5 sm:px-4 py-2 bg-slate-900/90 border-b border-slate-800 flex items-center gap-1.5 sm:gap-2 overflow-x-auto scrollbar-none text-xs">
          <button
            onClick={() => { setActiveCategory('all'); setSelectedIndex(0); }}
            className={`px-2.5 py-1 rounded-lg font-medium transition cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
              activeCategory === 'all'
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            Todos ({matchedProcesses.length + matchedClients.length + matchedDeadlines.length + matchedDocuments.length})
          </button>

          <button
            onClick={() => { setActiveCategory('processes'); setSelectedIndex(0); }}
            className={`px-2.5 py-1 rounded-lg font-medium transition cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
              activeCategory === 'processes'
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
            }`}
          >
            <Scale className="w-3.5 h-3.5" />
            Processos ({matchedProcesses.length})
          </button>

          <button
            onClick={() => { setActiveCategory('clients'); setSelectedIndex(0); }}
            className={`px-2.5 py-1 rounded-lg font-medium transition cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
              activeCategory === 'clients'
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            Clientes ({matchedClients.length})
          </button>

          <button
            onClick={() => { setActiveCategory('deadlines'); setSelectedIndex(0); }}
            className={`px-2.5 py-1 rounded-lg font-medium transition cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
              activeCategory === 'deadlines'
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            Prazos ({matchedDeadlines.length})
          </button>

          <button
            onClick={() => { setActiveCategory('documents'); setSelectedIndex(0); }}
            className={`px-2.5 py-1 rounded-lg font-medium transition cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
              activeCategory === 'documents'
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            Documentos ({matchedDocuments.length})
          </button>
        </div>

        {/* Results Container */}
        <div ref={resultsContainerRef} className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-2 max-h-[55vh]">
          {flatResults.length === 0 ? (
            <div className="py-12 text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-slate-800 text-slate-500 mx-auto flex items-center justify-center">
                <Search className="w-6 h-6" />
              </div>
              <p className="text-sm font-semibold text-slate-300">
                Nenhum resultado local encontrado para "{searchTerm}"
              </p>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                Deseja consultar este termo em tempo real nos 92 tribunais do Brasil?
              </p>
              {searchTerm && (
                <button
                  onClick={() => {
                    localStorage.setItem('wono_andamentos_view_mode', 'search');
                    localStorage.setItem('wono_andamentos_prefill_query', searchTerm);
                    if (onOpenOnlineSearchWithQuery) {
                      onOpenOnlineSearchWithQuery(searchTerm);
                    } else {
                      onNavigateTab('andamentos');
                    }
                    onClose();
                  }}
                  className="mt-2 inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 rounded-xl font-bold text-xs shadow-lg shadow-amber-500/20 hover:from-amber-400 hover:to-amber-500 transition cursor-pointer"
                >
                  <Sparkles className="w-4 h-4" />
                  Buscar "{searchTerm}" no CNJ DataJud
                </button>
              )}
            </div>
          ) : (
            flatResults.map((item, index) => {
              const isSelected = index === selectedIndex;
              let Icon = Search;
              if (item.category === 'process') Icon = Scale;
              if (item.category === 'client') Icon = Users;
              if (item.category === 'deadline') Icon = Calendar;
              if (item.category === 'document') Icon = FileText;
              if (item.category === 'cnj_online') Icon = Sparkles;

              return (
                <div
                  key={item.id}
                  onClick={item.action}
                  onMouseEnter={() => setSelectedIndex(index)}
                  className={`p-3 sm:p-3.5 rounded-xl border transition cursor-pointer flex items-center justify-between gap-3 group ${
                    isSelected
                      ? item.category === 'cnj_online'
                        ? 'bg-amber-500/15 border-amber-500/50 shadow-md shadow-amber-500/10'
                        : 'bg-slate-800/90 border-slate-600 shadow-md'
                      : item.category === 'cnj_online'
                      ? 'bg-amber-950/20 border-amber-500/30'
                      : 'bg-slate-950/60 border-slate-800/80 hover:bg-slate-800/60 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 border ${
                        item.category === 'cnj_online'
                          ? 'bg-amber-500 text-slate-950 border-amber-400 font-bold'
                          : item.category === 'process'
                          ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                          : item.category === 'client'
                          ? 'bg-blue-500/10 text-blue-400 border-blue-500/30'
                          : item.category === 'deadline'
                          ? 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                          : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`font-bold text-xs sm:text-sm truncate ${
                          item.category === 'cnj_online' ? 'text-amber-300 font-extrabold' : 'text-slate-100'
                        }`}>
                          {item.title}
                        </span>
                        {item.badge && (
                          <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold border ${item.badgeColor}`}>
                            {item.badge}
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] sm:text-xs text-slate-400 truncate mt-0.5">
                        {item.subtitle}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span className="hidden sm:inline text-[11px] font-semibold text-slate-400 group-hover:text-amber-400 transition flex items-center gap-1">
                      Acessar <ArrowRight className="w-3 h-3" />
                    </span>
                    <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-amber-400 sm:hidden" />
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Modal Footer with Keyboard Shortcuts */}
        <div className="p-3 bg-slate-950 border-t border-slate-800 text-[11px] text-slate-400 flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-slate-800 border border-slate-700 rounded text-[10px] text-slate-300 font-mono">↑</kbd>
              <kbd className="px-1.5 py-0.5 bg-slate-800 border border-slate-700 rounded text-[10px] text-slate-300 font-mono">↓</kbd>
              Navegar
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-slate-800 border border-slate-700 rounded text-[10px] text-slate-300 font-mono">ENTER</kbd>
              Abrir
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-slate-800 border border-slate-700 rounded text-[10px] text-slate-300 font-mono">ESC</kbd>
              Fechar
            </span>
          </div>

          <div className="flex items-center gap-1 text-emerald-400 font-semibold text-[11px]">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            Lupa Inteligente Conectada
          </div>
        </div>
      </div>
    </div>
  );
};
