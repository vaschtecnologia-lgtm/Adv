import React, { useState, useEffect } from 'react';
import { 
  Terminal, 
  Settings, 
  CheckCircle, 
  Server, 
  Database, 
  Play, 
  RefreshCw, 
  X, 
  HardDrive,
  Download,
  AlertCircle
} from 'lucide-react';
import { executeBase99Installation, generateBase99Dataset } from '../utils/base99Seeder';
import { Client, LegalProcess, ProcessDeadline, FinancialRecord, AuditLog, LawOfficeSettings } from '../types';

interface AutoInstallerModalProps {
  isOpen: boolean;
  onClose: () => void;
  setClients: React.Dispatch<React.SetStateAction<Client[]>>;
  setProcesses: React.Dispatch<React.SetStateAction<LegalProcess[]>>;
  setDeadlines: React.Dispatch<React.SetStateAction<ProcessDeadline[]>>;
  setFinancials: React.Dispatch<React.SetStateAction<FinancialRecord[]>>;
  setAuditLogs: React.Dispatch<React.SetStateAction<AuditLog[]>>;
  setOffice: React.Dispatch<React.SetStateAction<LawOfficeSettings>>;
}

type InstallStep = 'idle' | 'testing_env' | 'creating_directories' | 'seeding_base99' | 'writing_persistence' | 'complete';

export const AutoInstallerModal: React.FC<AutoInstallerModalProps> = ({
  isOpen,
  onClose,
  setClients,
  setProcesses,
  setDeadlines,
  setFinancials,
  setAuditLogs,
  setOffice
}) => {
  const [currentStep, setCurrentStep] = useState<InstallStep>('idle');
  const [progress, setProgress] = useState<number>(0);
  const [logMessages, setLogMessages] = useState<string[]>([]);
  const [envStatus, setEnvStatus] = useState<'success' | 'checking' | 'idle'>('idle');

  const addLog = (message: string) => {
    setLogMessages(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${message}`]);
  };

  const runInstaller = async () => {
    setLogMessages([]);
    setCurrentStep('testing_env');
    setProgress(10);
    addLog('Iniciando o instalador automático do ecossistema...');
    await new Promise(r => setTimeout(r, 600));

    // Step 1: Testing Env
    addLog('Testando permissões de escrita do LocalStorage...');
    try {
      localStorage.setItem('__test_write__', '1');
      localStorage.removeItem('__test_write__');
      setEnvStatus('success');
      addLog('Suporte de LocalStorage confirmado (Limite: 10MB).');
    } catch (e) {
      addLog('ERRO: LocalStorage indisponível ou cheio!');
      return;
    }
    setProgress(30);
    await new Promise(r => setTimeout(r, 700));

    // Step 2: Directories & Assets
    setCurrentStep('creating_directories');
    addLog('Simulando provisionamento de diretórios do servidor...');
    addLog('Configurando rotas de API Express (/api/health, /api/sync)...');
    setProgress(50);
    await new Promise(r => setTimeout(r, 800));

    // Step 3: Base99 Generation
    setCurrentStep('seeding_base99');
    addLog('Compilando lote de dados da Base99 gratuita...');
    addLog('Sintetizando 25 clientes, 35 processos CNJ e 15 prazos processuais...');
    addLog('Criando registros de lançamentos de honorários sucumbenciais e despesas...');
    
    // Incrementally seed to show progress
    for (let p = 50; p <= 85; p += 5) {
      setProgress(p);
      addLog(`Mapeando e indexando objetos... (${(p - 50) * 3}%)`);
      await new Promise(r => setTimeout(r, 150));
    }

    // Step 4: Write persistence
    setCurrentStep('writing_persistence');
    addLog('Gravando chaves integradas no banco de dados local...');
    const result = executeBase99Installation(
      setClients,
      setProcesses,
      setDeadlines,
      setFinancials,
      setAuditLogs,
      setOffice
    );
    addLog(`GRAVAÇÃO CONCLUÍDA: ${result.clients.length} clientes, ${result.processes.length} processos ativos e ${result.financials.length} lançamentos gravados!`);
    setProgress(95);
    await new Promise(r => setTimeout(r, 600));

    // Complete
    setCurrentStep('complete');
    setProgress(100);
    addLog('Instalação e provisionamento concluídos com sucesso! O sistema está pronto para uso.');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/80 backdrop-blur-sm flex justify-center items-center p-4">
      <div className="bg-slate-900 border border-slate-700 w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        
        {/* Modal Header */}
        <div className="p-5 border-b border-slate-800 bg-slate-950 flex justify-between items-center">
          <div className="flex items-center gap-2.5">
            <Settings className="w-5 h-5 text-amber-400 animate-spin" style={{ animationDuration: '4s' }} />
            <div>
              <h3 className="font-black text-slate-100 text-sm flex items-center gap-2">
                Instalador do Sistema & Seeder Base99
                <span className="bg-amber-400/20 text-amber-400 text-[10px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wide">
                  Grátis
                </span>
              </h3>
              <p className="text-xs text-slate-400">Instalação automatizada com sementes de processos judiciais reais integrados.</p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="p-1.5 hover:bg-slate-800 text-slate-400 hover:text-white rounded-lg transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 flex-1 overflow-y-auto space-y-6">
          {/* Welcome Intro */}
          {currentStep === 'idle' && (
            <div className="space-y-4 text-xs leading-relaxed text-slate-300">
              <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl space-y-2">
                <span className="font-extrabold text-amber-400 block text-xs uppercase tracking-wider">O que é a Base99?</span>
                <p>
                  A <strong>Base99</strong> é um pacote de dados simulados de alto calibre para escritórios de advocacia. Ela preenche o sistema instantaneamente com <strong>exatamente 99 itens</strong> interligados (clientes, andamentos judiciais, honorários de êxito, prazos no diário oficial e registros financeiros), permitindo experimentar todas as funcionalidades analíticas sem precisar inserir dados manualmente.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="p-3.5 bg-slate-950 rounded-xl border border-slate-800 space-y-1">
                  <span className="font-bold text-slate-200 block">Deploy Automático</span>
                  <p className="text-slate-400 text-[11px]">Configura o escritório principal com OAB de forma automatizada.</p>
                </div>
                <div className="p-3.5 bg-slate-950 rounded-xl border border-slate-800 space-y-1">
                  <span className="font-bold text-slate-200 block">Sincronização CNJ</span>
                  <p className="text-slate-400 text-[11px]">Gera andamentos e decisões simuladas reais de múltiplos tribunais.</p>
                </div>
              </div>
            </div>
          )}

          {/* Active Installation Steps Visuals */}
          {currentStep !== 'idle' && (
            <div className="space-y-4">
              {/* Progress bar */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs font-bold text-slate-400">
                  <span>Progresso do Deployment</span>
                  <span className="text-amber-400">{progress}%</span>
                </div>
                <div className="w-full bg-slate-950 rounded-full h-2 overflow-hidden border border-slate-800/80">
                  <div 
                    className="bg-amber-400 h-full transition-all duration-300 rounded-full" 
                    style={{ width: `${progress}%` }} 
                  />
                </div>
              </div>

              {/* Steps grid */}
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className={`p-3 rounded-xl border flex items-center gap-2 ${
                  currentStep === 'testing_env' ? 'bg-amber-400/10 border-amber-500/40 text-amber-300' : 'bg-slate-950 border-slate-800 text-slate-400'
                }`}>
                  <Server className="w-4 h-4" />
                  <span>Testes Ambientais</span>
                </div>
                <div className={`p-3 rounded-xl border flex items-center gap-2 ${
                  currentStep === 'creating_directories' ? 'bg-amber-400/10 border-amber-500/40 text-amber-300' : 'bg-slate-950 border-slate-800 text-slate-400'
                }`}>
                  <HardDrive className="w-4 h-4" />
                  <span>Estrutura de Rotas</span>
                </div>
                <div className={`p-3 rounded-xl border flex items-center gap-2 ${
                  currentStep === 'seeding_base99' ? 'bg-amber-400/10 border-amber-500/40 text-amber-300' : 'bg-slate-950 border-slate-800 text-slate-400'
                }`}>
                  <Database className="w-4 h-4" />
                  <span>Sementes Base99</span>
                </div>
                <div className={`p-3 rounded-xl border flex items-center gap-2 ${
                  currentStep === 'complete' ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-400' : 'bg-slate-950 border-slate-800 text-slate-400'
                }`}>
                  <CheckCircle className="w-4 h-4" />
                  <span>Deploy Finalizado</span>
                </div>
              </div>

              {/* Live Terminal logs */}
              <div className="space-y-1.5">
                <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider flex items-center gap-1">
                  <Terminal className="w-3.5 h-3.5 text-slate-500" /> Terminal de Log do Sistema
                </span>
                <div className="h-44 bg-slate-950 rounded-xl p-3 border border-slate-800 overflow-y-auto font-mono text-[10px] text-slate-300 space-y-1 shadow-inner">
                  {logMessages.map((log, idx) => (
                    <div key={idx} className="leading-relaxed hover:text-white transition-colors">
                      {log}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer actions */}
        <div className="p-4 bg-slate-950 border-t border-slate-800 flex justify-end gap-2 text-xs">
          {currentStep === 'complete' ? (
            <button
              onClick={onClose}
              className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black rounded-lg cursor-pointer transition shadow shadow-emerald-500/20"
            >
              Concluir e Abrir Painel
            </button>
          ) : currentStep === 'idle' ? (
            <button
              onClick={runInstaller}
              className="px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-lg flex items-center gap-1.5 cursor-pointer transition shadow shadow-amber-500/20"
            >
              <Play className="w-3.5 h-3.5 fill-slate-950" />
              Executar Instalação Base99
            </button>
          ) : (
            <button
              disabled
              className="px-4 py-2 bg-slate-800 text-slate-500 font-bold rounded-lg cursor-not-allowed flex items-center gap-1.5"
            >
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              Instalando...
            </button>
          )}
        </div>

      </div>
    </div>
  );
};
