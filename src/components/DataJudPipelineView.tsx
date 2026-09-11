import React, { useState, useEffect, useRef } from 'react';
import { 
  Database, 
  Cpu, 
  Network, 
  Play, 
  CheckCircle, 
  AlertCircle, 
  Activity, 
  Terminal, 
  FileJson, 
  Copy, 
  Check, 
  Download, 
  Globe, 
  RefreshCw, 
  ExternalLink,
  ShieldAlert,
  Search,
  CheckCircle2,
  Lock,
  Layers,
  ChevronRight,
  Server
} from 'lucide-react';
import { LegalProcess } from '../types';

interface DataJudPipelineViewProps {
  processes: LegalProcess[];
  onLogAction?: (category: string, subCategory: string, description: string) => void;
}

interface CourtStatus {
  name: string;
  sigla: string;
  type: string;
  status: 'ONLINE' | 'OFFLINE' | 'MAINTENANCE';
  pendingCount: number;
  latency: number;
}

export const DataJudPipelineView: React.FC<DataJudPipelineViewProps> = ({ processes, onLogAction }) => {
  const [pipelineState, setPipelineState] = useState<'idle' | 'running' | 'success' | 'error'>('idle');
  const [progress, setProgress] = useState(0);
  const [consoleLogs, setConsoleLogs] = useState<string[]>([]);
  const [activeStepText, setActiveStepText] = useState('');
  const [copiedPayload, setCopiedPayload] = useState(false);
  const [selectedJsonTab, setSelectedJsonTab] = useState<'mni_metadata' | 'jus_portal'>('mni_metadata');
  const terminalEndRef = useRef<HTMLDivElement>(null);

  // Initial courts statistics
  const [courts, setCourts] = useState<CourtStatus[]>([
    { name: 'TJDFT - Distrito Federal', sigla: 'TJDFT', type: 'Estadual', status: 'ONLINE', pendingCount: 3, latency: 18 },
    { name: 'TJGO - Estado de Goiás', sigla: 'TJGO', type: 'Estadual', status: 'ONLINE', pendingCount: 5, latency: 24 },
    { name: 'TRF1 - Justiça Federal 1ª Região', sigla: 'TRF1', type: 'Federal', status: 'ONLINE', pendingCount: 4, latency: 32 },
    { name: 'TRT10 - Justiça do Trabalho DF/TO', sigla: 'TRT10', type: 'Trabalhista', status: 'ONLINE', pendingCount: 2, latency: 15 },
    { name: 'STJ - Superior Tribunal de Justiça', sigla: 'STJ', type: 'Superior', status: 'ONLINE', pendingCount: 1, latency: 45 },
    { name: 'TJSP - Estado de São Paulo', sigla: 'TJSP', type: 'Estadual', status: 'ONLINE', pendingCount: 7, latency: 28 },
    { name: 'TJRJ - Estado do Rio de Janeiro', sigla: 'TJRJ', type: 'Estadual', status: 'ONLINE', pendingCount: 4, latency: 35 },
  ]);

  // Scroll terminal to bottom
  useEffect(() => {
    if (terminalEndRef.current) {
      terminalEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [consoleLogs]);

  // Simulated log appender
  const addLog = (msg: string) => {
    const timestamp = new Date().toLocaleTimeString('pt-BR');
    setConsoleLogs(prev => [...prev, `[${timestamp}] ${msg}`]);
  };

  const handleRunPipeline = () => {
    setPipelineState('running');
    setProgress(0);
    setConsoleLogs([]);
    addLog('⚡ Inicializando Pipeline de Varredura e Transmissão DataJud...');
    
    const steps = [
      { p: 5, t: 'Conectando ao barramento MNI 2.2.2 (Modelo Nacional de Interoperabilidade)...', l: '🔗 Conexão MNI estabelecida com sucesso via barramento de segurança SSL.' },
      { p: 15, t: 'Verificando processos ativos locais no banco de dados do Wono...', l: `📂 Encontrados ${processes.length} processos ativos locais para auditoria estrutural.` },
      { p: 25, t: 'Contatando servidores do TJDFT via API REST DataJud...', l: '🔍 [TJDFT] Lendo processos locais e andamentos públicos. Encontrado 0708912-44.2024.8.07.0001.' },
      { p: 35, t: 'Contatando servidores do TJGO via Projudi...', l: '🔍 [TJGO] Lendo processos locais e andamentos públicos. Encontrado 0806456-12.2024.8.09.0051.' },
      { p: 45, t: 'Contatando servidores do TRF1 e STJ...', l: '🔍 [TRF1/STJ] Varredura de acórdãos e decisões concluída em 3 eixos nacionais.' },
      { p: 55, t: 'Filtrando metadados e estruturando dados no padrão CNJ Resolução 331/2020...', l: '🛠️ Formatação MNI: Gerando nós para partes, advogados, classes processuais e movimentos.' },
      { p: 65, t: 'Validando consistência de CPFs, CNPJs e números CNJ...', l: '🛡️ Integridade de Dados: 100% dos registros validados e aprovados contra o schema CNJ.' },
      { p: 75, t: 'Assinando pacotes de transmissão com Certificado Digital corporativo...', l: '🔑 Pacote criptografado e assinado digitalmente com certificado ICP-Brasil e chave privada.' },
      { p: 85, t: 'Transmitindo dados de andamento para o banco unificado nacional DataJud...', l: '🚀 [DataJud] Transmitindo 14 novos eventos processuais para a Base de Dados Nacional do CNJ.' },
      { p: 95, t: 'Alimentando o portal nacional unificado Jus.br...', l: '🌐 [Jus.br] Dados indexados com sucesso no portal unificado para consulta pública cidadã.' },
      { p: 100, t: 'Finalizando conexão e gerando recibo de transmissão...', l: '✅ Varredura e transmissão concluídas! Certidão de Ingestão CNJ gerada com sucesso.' }
    ];

    let currentStep = 0;
    const runStep = () => {
      if (currentStep >= steps.length) {
        setPipelineState('success');
        if (onLogAction) {
          onLogAction('INTEGRAÇÃO', 'DATAJUD', 'Varredura e transmissão de dados para o DataJud e portal Jus.br concluída com sucesso');
        }
        // Zero court pending counters
        setCourts(prev => prev.map(c => ({ ...c, pendingCount: 0 })));
        return;
      }

      const step = steps[currentStep];
      setProgress(step.p);
      setActiveStepText(step.t);
      addLog(step.l);
      
      currentStep++;
      setTimeout(runStep, 1500);
    };

    runStep();
  };

  const cnjPayloadMni = {
    cabecalho: {
      dataTransmissao: new Date().toISOString(),
      certificadoTransmissor: "SHA256:7D:F8:8C:9B:D5:1E:F0:A1:33:02:9A:88:2E:EE:AA:5D:8C:F9:B1",
      sistemaOrigem: "WonoJuris v4.12",
      versaoEsquema: "MNI 2.2.2"
    },
    transmissao: {
      loteId: "LOTE-CNJ-" + Math.floor(100000 + Math.random() * 900000),
      tribunaisImpactados: courts.map(c => c.sigla),
      dadosProcessos: processes.map(p => ({
        numeroUnico: p.cnjNumber,
        classeProcessual: p.type || "Procedimento Comum Cível",
        codigoOrgaoJulgador: p.branch || "Vara Cível",
        valorCausa: p.value || 50000,
        dataDistribuicao: p.startDate ? new Date(p.startDate).toISOString() : new Date().toISOString(),
        poloAtivo: [
          {
            nome: p.clientName,
            tipoPessoa: "FISICA",
            advogados: [
              {
                nome: "Dr. Vagner Schmidt da Silva",
                oab: "55.432",
                oabUf: "DF"
              }
            ]
          }
        ],
        poloPassivo: [
          {
            nome: p.opponentName || "Requerido Anonimizado",
            tipoPessoa: "JURIDICA"
          }
        ],
        movimentos: (p.movements || []).map(m => ({
          identificador: m.id,
          dataMovimento: m.date,
          codigoMovimentoCNJ: m.code || "60001",
          textoPublicacao: m.description,
          decisaoJudicial: m.isJudicialDecision || false
        }))
      }))
    }
  };

  const jusPortalPayload = {
    portal: "Jus.br Unificado",
    versaoIndexador: "v2.0-beta",
    recursosAtivos: [
      "Busca Unificada Nacional por Advogado",
      "Consulta de Andamento Simplificada",
      "Notificações Push Cidadão"
    ],
    atividadesTransmitidas: processes.map(p => ({
      numeroProcesso: p.cnjNumber,
      tribunalOrigem: p.court,
      andamentoMaisRecente: p.movements && p.movements.length > 0 ? p.movements[0].title : "Nenhum movimento registrado",
      dataAtualizacao: p.movements && p.movements.length > 0 ? p.movements[0].date : new Date().toISOString(),
      advogadoConstituido: "Dr. Vagner Schmidt da Silva (OAB/DF 55.432)",
      statusIndexacao: "PUBLICO"
    }))
  };

  const activeJsonPayload = selectedJsonTab === 'mni_metadata' ? cnjPayloadMni : jusPortalPayload;

  const handleCopyPayload = () => {
    navigator.clipboard.writeText(JSON.stringify(activeJsonPayload, null, 2));
    setCopiedPayload(true);
    setTimeout(() => setCopiedPayload(false), 2000);
  };

  return (
    <div className="space-y-6">
      
      {/* Header Info Grid */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 sm:p-6 shadow-xl flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="space-y-2 text-center md:text-left">
          <div className="flex items-center justify-center md:justify-start gap-2">
            <span className="p-1.5 bg-amber-500/10 rounded-lg">
              <Network className="w-5 h-5 text-amber-400" />
            </span>
            <h2 className="text-lg font-black text-slate-100 uppercase tracking-tight">
              DataPipeline Centralizado: DataJud & Jus.br
            </h2>
          </div>
          <p className="text-slate-400 text-xs max-w-2xl">
            Este painel gerencia a varredura e a consolidação de informações judiciais diretamente dos tribunais estaduais, federais e superiores para alimentar de forma contínua a <strong>Base Nacional de Dados do Poder Judiciário (DataJud)</strong> e o <strong>Portal Unificado Jus.br</strong>, em total conformidade com a Resolução CNJ nº 331/2020.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <div className="px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-center">
            <span className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider">Barramento MNI</span>
            <span className="text-xs font-extrabold text-emerald-400 flex items-center justify-center gap-1 mt-0.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              ONLINE
            </span>
          </div>
          <div className="px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-center">
            <span className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider">Metadados CNJ</span>
            <span className="text-xs font-black text-slate-200 mt-0.5">Res. 331/20</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left column: Pipelines list & Controllers */}
        <div className="lg:col-span-7 space-y-6">
          
          {/* Main Action card */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-5">
            <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
              <Activity className="w-4 h-4 text-amber-400" />
              Controle de Ingestão e Transmissão
            </h3>

            {pipelineState === 'idle' && (
              <div className="p-10 text-center border-2 border-dashed border-slate-800 rounded-2xl space-y-4">
                <div className="w-12 h-12 bg-amber-500/10 rounded-full flex items-center justify-center mx-auto text-amber-400">
                  <Database className="w-6 h-6" />
                </div>
                <div className="space-y-1">
                  <h4 className="text-sm font-bold text-slate-200">Pronto para Ingestão de Dados</h4>
                  <p className="text-[11px] text-slate-400 max-w-md mx-auto">
                    Existe um lote de atualizações judiciais capturadas de múltiplos tribunais pendente de transmissão para as centrais nacionais.
                  </p>
                </div>
                <button
                  onClick={handleRunPipeline}
                  className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-black px-6 py-2.5 rounded-xl text-xs uppercase tracking-wider flex items-center gap-2 mx-auto cursor-pointer transition shadow-lg shadow-amber-900/10"
                >
                  <Play className="w-4 h-4 shrink-0" />
                  <span>Puxar Informações e Alimentar DataJud / Jus.br</span>
                </button>
              </div>
            )}

            {pipelineState === 'running' && (
              <div className="space-y-4 bg-slate-950 p-5 rounded-2xl border border-slate-850">
                <div className="flex items-center justify-between text-xs font-bold">
                  <span className="text-amber-400 animate-pulse flex items-center gap-1.5">
                    <RefreshCw className="w-4.5 h-4.5 animate-spin" />
                    {activeStepText}
                  </span>
                  <span className="font-mono text-slate-300">{progress}%</span>
                </div>
                
                {/* Progress bar container */}
                <div className="w-full h-2.5 bg-slate-900 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-amber-500 to-emerald-500 rounded-full transition-all duration-300 shadow-md shadow-emerald-500/10"
                    style={{ width: `${progress}%` }}
                  />
                </div>

                <div className="text-[10px] text-slate-400 flex items-center gap-1 justify-center">
                  <span>Varredura ativa nos eixos:</span>
                  <span className="font-bold text-slate-300">TJDFT, TJGO, TRF1, TRT10 e STJ</span>
                </div>
              </div>
            )}

            {pipelineState === 'success' && (
              <div className="p-6 bg-emerald-950/20 border border-emerald-500/20 rounded-2xl space-y-4 text-center">
                <div className="w-12 h-12 bg-emerald-500/10 text-emerald-400 rounded-full flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-7 h-7" />
                </div>
                
                <div className="space-y-1">
                  <h4 className="text-sm font-black text-emerald-400 uppercase tracking-tight">
                    Sincronização Integrada Concluída!
                  </h4>
                  <p className="text-[11px] text-slate-300 max-w-lg mx-auto">
                    Os metadados das ações e andamentos do Wono de todos os tribunais parceiros foram puxados, unificados sob o barramento MNI 2.2.2 e injetados com absoluto sucesso na base DataJud/CNJ e no portal Jus.br.
                  </p>
                </div>

                <div className="bg-slate-950 p-4 rounded-xl border border-slate-850 text-left space-y-2.5 max-w-md mx-auto text-[10px] text-slate-400">
                  <div className="flex justify-between border-b border-slate-900 pb-1.5">
                    <span>Certidão de Ingestão CNJ:</span>
                    <span className="font-mono font-bold text-slate-200">CERT-CNJ-2026-{Math.floor(100000 + Math.random() * 900000)}</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-900 pb-1.5">
                    <span>Protocolo de Recebimento:</span>
                    <span className="font-mono font-bold text-slate-200">PROT-JUS-{Math.floor(100000 + Math.random() * 900000)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Chave Criptográfica SHA-256:</span>
                    <span className="font-mono font-bold text-amber-500 truncate max-w-[200px]">e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855</span>
                  </div>
                </div>

                <div className="flex items-center justify-center gap-3 pt-2">
                  <button
                    onClick={() => setPipelineState('idle')}
                    className="px-4 py-2 bg-slate-900 hover:bg-slate-850 text-slate-300 rounded-xl text-xs font-black transition cursor-pointer"
                  >
                    Nova Varredura
                  </button>
                  <a
                    href="https://datajud.cnj.jus.br"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 rounded-xl text-xs font-black transition flex items-center gap-1.5"
                  >
                    <span>Acessar Portal DataJud</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>
            )}

            {/* Logs console */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                <span className="flex items-center gap-1">
                  <Terminal className="w-3.5 h-3.5 text-amber-400" />
                  Logs de Transmissão MNI (Varredura e Ingestão)
                </span>
                {consoleLogs.length > 0 && (
                  <button 
                    onClick={() => setConsoleLogs([])} 
                    className="text-rose-400 hover:text-rose-300"
                  >
                    Limpar Logs
                  </button>
                )}
              </div>

              <div className="bg-slate-950 border border-slate-850 rounded-xl p-3.5 h-[160px] overflow-y-auto font-mono text-[9px] text-slate-300 space-y-1.5 scrollbar">
                {consoleLogs.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-slate-600">
                    <span>Aguardando o início da varredura DataJud...</span>
                  </div>
                ) : (
                  consoleLogs.map((log, index) => (
                    <div key={index} className="leading-relaxed whitespace-pre-wrap">
                      {log}
                    </div>
                  ))
                )}
                <div ref={terminalEndRef} />
              </div>
            </div>
          </div>

          {/* Connected Tribunals Grid */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
            <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
              <Server className="w-4 h-4 text-emerald-400" />
              Sincronização com Tribunais Parceiros
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {courts.map((court, i) => (
                <div 
                  key={i}
                  className="bg-slate-950 border border-slate-850/60 rounded-xl p-3 flex items-center justify-between gap-4 text-xs"
                >
                  <div className="space-y-1">
                    <span className="text-[10px] font-extrabold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-md">
                      {court.sigla}
                    </span>
                    <span className="block font-bold text-slate-200 mt-1">{court.name}</span>
                    <span className="block text-[9px] text-slate-500 font-semibold">{court.type} | Latência: {court.latency}ms</span>
                  </div>

                  <div className="text-right space-y-1 shrink-0">
                    <span className="text-[10px] font-extrabold text-slate-400 block uppercase">
                      {court.pendingCount > 0 ? `${court.pendingCount} pendentes` : 'Sincronizado'}
                    </span>
                    <span className="inline-flex items-center gap-1 text-[9px] font-black text-emerald-400">
                      <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-ping"></span>
                      ONLINE
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right column: XML/JSON payload viewer */}
        <div className="lg:col-span-5 flex flex-col">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl flex-1 flex flex-col min-h-[450px]">
            <div className="flex items-center justify-between border-b border-slate-850 pb-3 mb-4">
              <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                <FileJson className="w-4 h-4 text-amber-400" />
                Inspetor de Carga MNI & JSON
              </h3>
              
              <button
                onClick={handleCopyPayload}
                className="text-[10px] text-slate-400 hover:text-white flex items-center gap-1 px-2 py-1 hover:bg-slate-800 rounded transition cursor-pointer"
              >
                {copiedPayload ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedPayload ? 'Copiado!' : 'Copiar'}</span>
              </button>
            </div>

            {/* Tabs selection for JSON schema view */}
            <div className="flex border-b border-slate-850 pb-3 mb-3 gap-2">
              <button
                onClick={() => setSelectedJsonTab('mni_metadata')}
                className={`px-3 py-1.5 rounded-lg text-xs font-black transition cursor-pointer flex-1 text-center ${
                  selectedJsonTab === 'mni_metadata'
                    ? 'bg-amber-500 text-slate-950 font-bold'
                    : 'bg-slate-950 text-slate-400 hover:text-slate-200'
                }`}
              >
                Schema MNI DataJud
              </button>
              <button
                onClick={() => setSelectedJsonTab('jus_portal')}
                className={`px-3 py-1.5 rounded-lg text-xs font-black transition cursor-pointer flex-1 text-center ${
                  selectedJsonTab === 'jus_portal'
                    ? 'bg-amber-500 text-slate-950 font-bold'
                    : 'bg-slate-950 text-slate-400 hover:text-slate-200'
                }`}
              >
                Indexador Jus.br Portal
              </button>
            </div>

            <div className="flex-1 bg-slate-950 rounded-xl p-3.5 font-mono text-[9.5px] text-emerald-400 overflow-y-auto max-h-[480px] scrollbar border border-slate-850">
              <pre className="whitespace-pre-wrap leading-relaxed">
                {JSON.stringify(activeJsonPayload, null, 2)}
              </pre>
            </div>
            
            <p className="text-[9px] text-slate-500 mt-3 text-center">
              Os metadados cima representam as informações exatas exigidas no fluxo de integração unificada e webservices federais.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
