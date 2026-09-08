import React, { useState } from 'react';
import { 
  AlertOctagon, 
  Trash2, 
  Lock, 
  Download, 
  CheckCircle2, 
  X, 
  AlertTriangle,
  Scale,
  Users,
  Calendar,
  FileText,
  DollarSign,
  ShieldAlert
} from 'lucide-react';

interface MasterResetModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirmReset: () => void;
  stats: {
    processesCount: number;
    clientsCount: number;
    deadlinesCount: number;
    documentsCount: number;
    trashCount: number;
    financialCount: number;
  };
  onDownloadBackup?: () => void;
  deletionPassword?: string;
}

export const MasterResetModal: React.FC<MasterResetModalProps> = ({
  isOpen,
  onClose,
  onConfirmReset,
  stats,
  onDownloadBackup,
  deletionPassword,
}) => {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const cleanInput = password.trim();
    const isMasterPassword = cleanInput === '1414';
    const isUserDeletionPassword = deletionPassword && cleanInput === deletionPassword.trim();

    if (!isMasterPassword && !isUserDeletionPassword) {
      setError(`Senha incorreta! Digite a senha master autorizada (1414) ou sua senha de exclusão cadastrada${deletionPassword ? ` (${deletionPassword})` : ''} para prosseguir com a exclusão geral.`);
      return;
    }

    setIsProcessing(true);
    setTimeout(() => {
      onConfirmReset();
      setIsProcessing(false);
      setPassword('');
      setError('');
      onClose();
    }, 600);
  };

  const totalRecords = 
    stats.processesCount + 
    stats.clientsCount + 
    stats.deadlinesCount + 
    stats.documentsCount + 
    stats.trashCount + 
    stats.financialCount;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-900 border-2 border-rose-600/50 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-5 text-slate-100 relative">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-200 p-1 rounded-lg hover:bg-slate-800 transition cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex items-start gap-3.5 border-b border-slate-800 pb-4">
          <div className="p-3 bg-rose-500/10 border border-rose-500/30 text-rose-400 rounded-xl shrink-0">
            <AlertOctagon className="w-7 h-7" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-black text-rose-400 tracking-tight">
                Exclusão Geral • Zerar Todo o Sistema
              </h3>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-rose-950 text-rose-300 border border-rose-800 font-bold flex items-center gap-1">
                <Lock className="w-3 h-3" /> Senha Master Exigida
              </span>
            </div>
            <p className="text-xs text-slate-300 mt-1 leading-relaxed">
              Esta ação apagará <strong>definitivamente</strong> todos os processos judiciais, andamentos, prazos fatais, clientes cadastrados, documentos, histórico financeiro e lixeira.
            </p>
          </div>
        </div>

        {/* Inventory Summary */}
        <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2.5">
          <div className="flex items-center justify-between text-xs text-slate-300 font-bold border-b border-slate-800/80 pb-1.5">
            <span>Registros que serão excluídos e zerados:</span>
            <span className="text-rose-400 font-mono font-black">{totalRecords} registros</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
            <div className="bg-slate-900/80 p-2 rounded-lg border border-slate-800/80 flex items-center justify-between">
              <span className="text-slate-400 flex items-center gap-1">
                <Scale className="w-3.5 h-3.5 text-amber-400" /> Processos:
              </span>
              <strong className="font-mono text-slate-100">{stats.processesCount}</strong>
            </div>

            <div className="bg-slate-900/80 p-2 rounded-lg border border-slate-800/80 flex items-center justify-between">
              <span className="text-slate-400 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-rose-400" /> Prazos:
              </span>
              <strong className="font-mono text-slate-100">{stats.deadlinesCount}</strong>
            </div>

            <div className="bg-slate-900/80 p-2 rounded-lg border border-slate-800/80 flex items-center justify-between">
              <span className="text-slate-400 flex items-center gap-1">
                <Users className="w-3.5 h-3.5 text-blue-400" /> Clientes:
              </span>
              <strong className="font-mono text-slate-100">{stats.clientsCount}</strong>
            </div>

            <div className="bg-slate-900/80 p-2 rounded-lg border border-slate-800/80 flex items-center justify-between">
              <span className="text-slate-400 flex items-center gap-1">
                <FileText className="w-3.5 h-3.5 text-emerald-400" /> Documentos:
              </span>
              <strong className="font-mono text-slate-100">{stats.documentsCount}</strong>
            </div>

            <div className="bg-slate-900/80 p-2 rounded-lg border border-slate-800/80 flex items-center justify-between">
              <span className="text-slate-400 flex items-center gap-1">
                <DollarSign className="w-3.5 h-3.5 text-emerald-400" /> Financeiro:
              </span>
              <strong className="font-mono text-slate-100">{stats.financialCount}</strong>
            </div>

            <div className="bg-slate-900/80 p-2 rounded-lg border border-slate-800/80 flex items-center justify-between">
              <span className="text-slate-400 flex items-center gap-1">
                <Trash2 className="w-3.5 h-3.5 text-rose-400" /> Lixeira:
              </span>
              <strong className="font-mono text-slate-100">{stats.trashCount}</strong>
            </div>
          </div>
        </div>

        {/* Optional Backup before wipe */}
        {onDownloadBackup && (
          <div className="flex items-center justify-between p-3 bg-amber-500/5 rounded-xl border border-amber-500/20 text-xs">
            <div className="space-y-0.5">
              <span className="font-bold text-amber-300">Recomendação de Segurança:</span>
              <p className="text-[11px] text-slate-400">Deseja exportar um backup antes de limpar?</p>
            </div>
            <button
              type="button"
              onClick={onDownloadBackup}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-amber-300 font-bold rounded-lg border border-amber-500/30 transition flex items-center gap-1.5 cursor-pointer text-xs shrink-0"
            >
              <Download className="w-3.5 h-3.5" /> Baixar Backup .JSON
            </button>
          </div>
        )}

        {/* Password Form */}
        <form onSubmit={handleSubmit} className="space-y-4 pt-1">
          <div className="space-y-2">
            <label className="block text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-rose-400" /> Confirmar com Senha Master ou Exclusão:
              </span>
              <span className="text-[11px] text-slate-400 font-normal">Autenticação</span>
            </label>
            <input
              type="password"
              autoFocus
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setError('');
              }}
              placeholder="Digite a senha (1414 ou de exclusão)..."
              className="w-full px-4 py-3 bg-slate-950 border-2 border-rose-500/40 rounded-xl text-center text-lg font-mono font-black text-rose-300 placeholder-slate-600 focus:outline-none focus:border-rose-500 tracking-widest"
            />
            {error && (
              <p className="text-xs text-rose-400 font-semibold flex items-center gap-1 bg-rose-950/40 p-2 rounded-lg border border-rose-900">
                <AlertTriangle className="w-4 h-4 shrink-0" /> {error}
              </p>
            )}
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isProcessing}
              className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs rounded-xl transition cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isProcessing || !password.trim()}
              className="px-5 py-2.5 bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white font-extrabold text-xs sm:text-sm rounded-xl transition flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-rose-900/40"
            >
              <Trash2 className="w-4 h-4" />
              {isProcessing ? 'Zerando Todo o Sistema...' : 'Confirmar Exclusão Geral (Zerar Tudo)'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
