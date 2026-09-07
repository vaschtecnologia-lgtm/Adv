import React, { useState } from 'react';
import { 
  Trash2, 
  RotateCcw, 
  Search, 
  Scale, 
  Users, 
  Calendar, 
  FileText, 
  AlertTriangle, 
  CheckCircle2, 
  ShieldAlert, 
  Clock, 
  ArrowLeft,
  X,
  Lock,
  Filter
} from 'lucide-react';
import { TrashItem, TeamMember } from '../types';

interface LixeiraViewProps {
  trashItems: TrashItem[];
  onRestoreItem: (item: TrashItem) => void;
  onPermanentlyDeleteItem: (item: TrashItem) => void;
  onEmptyTrash: () => void;
  onOpenMasterReset?: () => void;
  activeUser?: TeamMember;
  deletionPassword?: string;
  onClose?: () => void;
}

export const LixeiraView: React.FC<LixeiraViewProps> = ({
  trashItems,
  onRestoreItem,
  onPermanentlyDeleteItem,
  onEmptyTrash,
  onOpenMasterReset,
  activeUser,
  deletionPassword = '123456',
  onClose,
}) => {
  const [filterType, setFilterType] = useState<'all' | 'processo' | 'cliente' | 'prazo' | 'documento'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Empty trash confirm state
  const [isEmptyConfirmOpen, setIsEmptyConfirmOpen] = useState(false);
  const [emptyPasswordInput, setEmptyPasswordInput] = useState('');
  const [emptyPasswordError, setEmptyPasswordError] = useState('');

  // Single item permanent delete state
  const [itemToPurge, setItemToPurge] = useState<TrashItem | null>(null);
  const [purgePasswordInput, setPurgePasswordInput] = useState('');
  const [purgePasswordError, setPurgePasswordError] = useState('');

  const filteredItems = trashItems.filter((item) => {
    const matchesType = filterType === 'all' || item.type === filterType;
    const matchesSearch = !searchQuery.trim() || 
      item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.subtitle && item.subtitle.toLowerCase().includes(searchQuery.toLowerCase())) ||
      item.deletedBy.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesType && matchesSearch;
  });

  const countByType = {
    all: trashItems.length,
    processo: trashItems.filter((i) => i.type === 'processo').length,
    cliente: trashItems.filter((i) => i.type === 'cliente').length,
    prazo: trashItems.filter((i) => i.type === 'prazo').length,
    documento: trashItems.filter((i) => i.type === 'documento').length,
  };

  const handleConfirmEmptyTrash = (e: React.FormEvent) => {
    e.preventDefault();
    if (activeUser?.privilege === 'leitura') {
      setEmptyPasswordError('Acesso Negado: Usuários sem privilégio não podem esvaziar a lixeira.');
      return;
    }

    if (emptyPasswordInput === deletionPassword) {
      onEmptyTrash();
      setIsEmptyConfirmOpen(false);
      setEmptyPasswordInput('');
      setEmptyPasswordError('');
    } else {
      setEmptyPasswordError('Senha de segurança incorreta.');
    }
  };

  const handleConfirmPurgeItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!itemToPurge) return;

    if (activeUser?.privilege === 'leitura') {
      setPurgePasswordError('Acesso Negado: Usuários sem privilégio não podem purgar itens.');
      return;
    }

    if (purgePasswordInput === deletionPassword) {
      onPermanentlyDeleteItem(itemToPurge);
      setItemToPurge(null);
      setPurgePasswordInput('');
      setPurgePasswordError('');
    } else {
      setPurgePasswordError('Senha de segurança incorreta.');
    }
  };

  const getItemIcon = (type: TrashItem['type']) => {
    switch (type) {
      case 'processo':
        return <Scale className="w-5 h-5 text-blue-400" />;
      case 'cliente':
        return <Users className="w-5 h-5 text-emerald-400" />;
      case 'prazo':
        return <Calendar className="w-5 h-5 text-amber-400" />;
      case 'documento':
        return <FileText className="w-5 h-5 text-purple-400" />;
      default:
        return <Trash2 className="w-5 h-5 text-slate-400" />;
    }
  };

  const getItemTypeBadge = (type: TrashItem['type']) => {
    switch (type) {
      case 'processo':
        return <span className="text-[10px] px-2 py-0.5 rounded font-bold uppercase tracking-wider bg-blue-500/10 text-blue-400 border border-blue-500/20">Processo</span>;
      case 'cliente':
        return <span className="text-[10px] px-2 py-0.5 rounded font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">Cliente</span>;
      case 'prazo':
        return <span className="text-[10px] px-2 py-0.5 rounded font-bold uppercase tracking-wider bg-amber-500/10 text-amber-400 border border-amber-500/20">Prazo</span>;
      case 'documento':
        return <span className="text-[10px] px-2 py-0.5 rounded font-bold uppercase tracking-wider bg-purple-500/10 text-purple-400 border border-purple-500/20">Documento</span>;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-850 to-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 w-96 h-96 bg-rose-500/5 rounded-full blur-3xl pointer-events-none"></div>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400 shadow-inner">
              <Trash2 className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-extrabold text-slate-100 tracking-tight">
                  Lixeira & Itens Excluídos
                </h1>
                <span className="text-xs px-2 py-0.5 rounded-full font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30">
                  {trashItems.length} {trashItems.length === 1 ? 'item' : 'itens'}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                Recupere processos e cadastros excluídos a qualquer momento ou execute a limpeza permanente com senha de segurança.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {onOpenMasterReset && (
              <button
                type="button"
                onClick={onOpenMasterReset}
                className="px-3.5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-black transition flex items-center gap-1.5 cursor-pointer shadow-md shadow-rose-950"
                title="Zerar e limpar todo o sistema com a senha master 1414"
              >
                <Trash2 className="w-4 h-4" />
                Exclusão Geral (Zerar Sistema)
              </button>
            )}
            {trashItems.length > 0 && (
              <button
                onClick={() => {
                  setEmptyPasswordInput('');
                  setEmptyPasswordError('');
                  setIsEmptyConfirmOpen(true);
                }}
                className="px-3.5 py-2 rounded-xl bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 border border-rose-500/30 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
                Esvaziar Lixeira
              </button>
            )}
            {onClose && (
              <button
                onClick={onClose}
                className="p-2 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-xl transition cursor-pointer"
                title="Voltar"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Filters and Search Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-slate-900 p-3.5 rounded-xl border border-slate-800">
        {/* Type tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
          <button
            onClick={() => setFilterType('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
              filterType === 'all'
                ? 'bg-amber-500 text-slate-950 font-bold shadow-md shadow-amber-500/20'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            Todos ({countByType.all})
          </button>
          <button
            onClick={() => setFilterType('processo')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
              filterType === 'processo'
                ? 'bg-blue-500 text-slate-950 font-bold'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            <Scale className="w-3.5 h-3.5" />
            Processos ({countByType.processo})
          </button>
          <button
            onClick={() => setFilterType('cliente')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
              filterType === 'cliente'
                ? 'bg-emerald-500 text-slate-950 font-bold'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            Clientes ({countByType.cliente})
          </button>
          <button
            onClick={() => setFilterType('prazo')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
              filterType === 'prazo'
                ? 'bg-amber-500 text-slate-950 font-bold'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            Prazos ({countByType.prazo})
          </button>
          <button
            onClick={() => setFilterType('documento')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
              filterType === 'documento'
                ? 'bg-purple-500 text-slate-950 font-bold'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            Documentos ({countByType.documento})
          </button>
        </div>

        {/* Search */}
        <div className="relative min-w-[240px]">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Pesquisar nos itens excluídos..."
            className="w-full pl-9 pr-3 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-xs text-slate-100 placeholder-slate-500 focus:border-amber-500 focus:outline-none"
          />
        </div>
      </div>

      {/* Items List */}
      {filteredItems.length === 0 ? (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center space-y-3">
          <div className="w-16 h-16 rounded-2xl bg-slate-800/80 border border-slate-700 flex items-center justify-center mx-auto text-slate-500">
            <Trash2 className="w-8 h-8" />
          </div>
          <h3 className="text-base font-bold text-slate-300">A lixeira está vazia</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Nenhum processo ou cadastro foi excluído no momento. Quando você excluir itens, eles serão arquivados aqui para restauração segura.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3">
          {filteredItems.map((item) => (
            <div
              key={item.id}
              className="bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-xl p-4 transition shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4 group"
            >
              <div className="flex items-start gap-3.5 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-center shrink-0 mt-0.5">
                  {getItemIcon(item.type)}
                </div>
                <div className="min-w-0 space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    {getItemTypeBadge(item.type)}
                    <h4 className="text-sm font-bold text-slate-200 truncate">
                      {item.title}
                    </h4>
                  </div>
                  {item.subtitle && (
                    <p className="text-xs text-slate-400 line-clamp-1">
                      {item.subtitle}
                    </p>
                  )}
                  <div className="flex items-center gap-3 text-[11px] text-slate-500">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3 text-slate-400" />
                      Excluído em {new Date(item.deletedAt).toLocaleString('pt-BR')}
                    </span>
                    <span>•</span>
                    <span className="text-slate-400 font-medium">
                      Por: {item.deletedBy}
                    </span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                <button
                  onClick={() => onRestoreItem(item)}
                  className="px-3 py-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-sm"
                  title="Restaurar item para o banco de dados ativo"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  Restaurar
                </button>
                <button
                  onClick={() => {
                    setItemToPurge(item);
                    setPurgePasswordInput('');
                    setPurgePasswordError('');
                  }}
                  className="px-2.5 py-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 text-xs font-semibold transition flex items-center gap-1 cursor-pointer"
                  title="Excluir definitivamente este item"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Excluir
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Empty Trash Confirmation Modal */}
      {isEmptyConfirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-sm animate-fade-in no-print">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-rose-400">
              <span className="p-2.5 bg-rose-500/10 rounded-xl text-xl">⚠️</span>
              <div>
                <h3 className="text-lg font-bold text-slate-100">Esvaziar Lixeira Definitivamente</h3>
                <p className="text-xs text-slate-400">Esta ação apagará {trashItems.length} registros permanentemente</p>
              </div>
            </div>

            <div className="p-3.5 bg-slate-950 rounded-xl border border-slate-800 text-xs space-y-1.5">
              <span className="block text-rose-400 font-bold">Aviso Crítico de Segurança:</span>
              <p className="text-slate-300 leading-relaxed">
                Todos os processos, clientes e prazos arquivados na lixeira serão purgados de forma irrecuperável.
              </p>
            </div>

            <form onSubmit={handleConfirmEmptyTrash} className="space-y-3">
              <div>
                <label className="block text-slate-300 font-semibold mb-1 text-xs">
                  Digite a Senha de Segurança (padrão 123456):
                </label>
                <input
                  type="password"
                  value={emptyPasswordInput}
                  onChange={(e) => {
                    setEmptyPasswordInput(e.target.value);
                    setEmptyPasswordError('');
                  }}
                  placeholder="••••••••"
                  autoFocus
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-slate-100 focus:border-amber-500 focus:outline-none text-center font-mono tracking-widest text-lg"
                />
                {emptyPasswordError && (
                  <p className="text-[11px] text-rose-400 font-medium mt-1.5 bg-rose-950/20 px-2 py-1 rounded border border-rose-950/30">
                    {emptyPasswordError}
                  </p>
                )}
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsEmptyConfirmOpen(false)}
                  className="flex-1 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-lg cursor-pointer transition border border-slate-700 text-center"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 bg-rose-600 hover:bg-rose-500 text-slate-950 text-xs font-bold rounded-lg cursor-pointer transition text-center shadow-lg shadow-rose-600/20"
                >
                  Esvaziar Agora
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Single Item Purge Confirmation Modal */}
      {itemToPurge && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-sm animate-fade-in no-print">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-rose-400">
              <span className="p-2.5 bg-rose-500/10 rounded-xl text-xl">🗑️</span>
              <div>
                <h3 className="text-lg font-bold text-slate-100">Excluir Definitivamente</h3>
                <p className="text-xs text-slate-400">Purga irrecuperável de registro</p>
              </div>
            </div>

            <div className="p-3.5 bg-slate-950 rounded-xl border border-slate-800 text-xs space-y-1">
              <span className="block text-slate-400 font-medium">Item a ser purgado:</span>
              <strong className="block text-slate-200 text-sm">{itemToPurge.title}</strong>
              {itemToPurge.subtitle && <p className="text-slate-400">{itemToPurge.subtitle}</p>}
            </div>

            <form onSubmit={handleConfirmPurgeItem} className="space-y-3">
              <div>
                <label className="block text-slate-300 font-semibold mb-1 text-xs">
                  Digite a Senha de Segurança para confirmar:
                </label>
                <input
                  type="password"
                  value={purgePasswordInput}
                  onChange={(e) => {
                    setPurgePasswordInput(e.target.value);
                    setPurgePasswordError('');
                  }}
                  placeholder="••••••••"
                  autoFocus
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-slate-100 focus:border-amber-500 focus:outline-none text-center font-mono tracking-widest text-lg"
                />
                {purgePasswordError && (
                  <p className="text-[11px] text-rose-400 font-medium mt-1.5 bg-rose-950/20 px-2 py-1 rounded border border-rose-950/30">
                    {purgePasswordError}
                  </p>
                )}
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setItemToPurge(null)}
                  className="flex-1 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-lg cursor-pointer transition border border-slate-700 text-center"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 bg-rose-600 hover:bg-rose-500 text-slate-950 text-xs font-bold rounded-lg cursor-pointer transition text-center shadow-lg shadow-rose-600/20"
                >
                  Confirmar Exclusão
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
