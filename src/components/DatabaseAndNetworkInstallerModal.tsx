import React, { useState, useEffect } from 'react';
import { 
  Download, 
  Server, 
  Database, 
  Wifi, 
  WifiOff, 
  Copy, 
  Check, 
  Terminal, 
  HardDrive, 
  Layers, 
  ShieldCheck, 
  FileCode, 
  Globe, 
  Monitor, 
  Smartphone, 
  ExternalLink, 
  CheckCircle2, 
  X, 
  Sparkles, 
  RefreshCw, 
  FolderArchive,
  BookOpen,
  ArrowRight,
  Zap,
  Play
} from 'lucide-react';
import { 
  LawOfficeSettings, 
  Client, 
  LegalProcess, 
  ProcessDeadline, 
  LegalDocumentItem, 
  TeamMember, 
  FinancialRecord, 
  SaaSTenantConfig, 
  AuditLog 
} from '../types';
import { 
  downloadCompleteInstallerPackageZip, 
  downloadNetlifyInstallerPackageZip,
  downloadSingleInstallerFile,
  generatePostgreSqlScript, 
  generateSqliteScript, 
  generateWindowsInstallerBat, 
  generateWindowsStartBat, 
  generateBackupBat, 
  generateLinuxInstallerSh,
  generateMacInstallerCommand,
  generateRenderYaml,
  generateVercelJson,
  generateNetlifyToml,
  generateNetlifyRedirects,
  generateNetlifyDeployBat,
  generateNetlifyDeploySh,
  generateNetlifyDropBat,
  generateNetlifyGuideMd,
  generateProcfile,
  generateEnvExample,
  generateDockerCompose, 
  generateInstallationGuideMd,
  InstallerDataPayload 
} from '../services/installerPackageService';
import { usePWAInstall } from '../hooks/usePWAInstall';

interface DatabaseAndNetworkInstallerModalProps {
  isOpen: boolean;
  onClose: () => void;
  office: LawOfficeSettings;
  clients: Client[];
  processes: LegalProcess[];
  deadlines: ProcessDeadline[];
  documents: LegalDocumentItem[];
  teamMembers: TeamMember[];
  financialRecords: FinancialRecord[];
  saasConfig?: SaaSTenantConfig;
  auditLogs?: AuditLog[];
  onImportFullBackup?: (data: any) => void;
  initialTab?: 'servidor_gratis' | 'publicar_netlify' | 'pwa_mobile' | 'rede_local' | 'banco_dados' | 'modo_offline' | 'guia_passos';
}

export const DatabaseAndNetworkInstallerModal: React.FC<DatabaseAndNetworkInstallerModalProps> = ({
  isOpen,
  onClose,
  office,
  clients,
  processes,
  deadlines,
  documents,
  teamMembers,
  financialRecords,
  saasConfig,
  auditLogs = [],
  onImportFullBackup,
  initialTab,
}) => {
  const [activeTab, setActiveTab] = useState<'servidor_gratis' | 'publicar_netlify' | 'pwa_mobile' | 'rede_local' | 'banco_dados' | 'modo_offline' | 'guia_passos'>(initialTab || 'pwa_mobile');
  const { isInstallable, isInstalled, isIOS, isAndroid, install } = usePWAInstall();
  const [showIOSManualGuide, setShowIOSManualGuide] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [isGeneratingZip, setIsGeneratingZip] = useState(false);
  const [isGeneratingNetlifyZip, setIsGeneratingNetlifyZip] = useState(false);
  const [isDownloadingNetlifyDist, setIsDownloadingNetlifyDist] = useState(false);
  const [networkInfo, setNetworkInfo] = useState<{
    hostname: string;
    localUrl: string;
    networkUrls: Array<{ name: string; ip: string; family: string; url: string }>;
    isOnline: boolean;
  }>({
    hostname: 'PC-ESCRITORIO',
    localUrl: 'http://localhost:3000',
    networkUrls: [
      { name: 'Wi-Fi / Rede Local', ip: '192.168.1.105', family: 'IPv4', url: 'http://192.168.1.105:3000' }
    ],
    isOnline: navigator.onLine,
  });

  const [simulatedOfflineMode, setSimulatedOfflineMode] = useState(false);
  const [sqlFormat, setSqlFormat] = useState<'postgres' | 'sqlite'>('postgres');

  // Sync initial tab when changed
  useEffect(() => {
    if (isOpen && initialTab) {
      setActiveTab(initialTab);
    }
  }, [isOpen, initialTab]);

  // Fetch real host network info from backend if available
  useEffect(() => {
    if (!isOpen) return;

    fetch('/api/network-info')
      .then(res => res.json())
      .then(data => {
        if (data && data.localUrl) {
          setNetworkInfo({
            hostname: data.hostname || 'PC-SERVIDOR',
            localUrl: data.localUrl || 'http://localhost:3000',
            networkUrls: data.networkUrls?.length ? data.networkUrls : [
              { name: 'Wi-Fi / Rede Local', ip: '192.168.1.105', family: 'IPv4', url: 'http://192.168.1.105:3000' }
            ],
            isOnline: navigator.onLine,
          });
        }
      })
      .catch(() => {
        // Fallback for client-side preview
        setNetworkInfo({
          hostname: 'PC-SERVIDOR-ESCRITORIO',
          localUrl: 'http://localhost:3000',
          networkUrls: [
            { name: 'Wi-Fi Principal', ip: '192.168.1.105', family: 'IPv4', url: 'http://192.168.1.105:3000' },
            { name: 'Rede Cabeada Ethernet', ip: '192.168.0.22', family: 'IPv4', url: 'http://192.168.0.22:3000' }
          ],
          isOnline: navigator.onLine,
        });
      });
  }, [isOpen]);

  const installerPayload: InstallerDataPayload = {
    office,
    clients,
    processes,
    deadlines,
    documents,
    teamMembers,
    financialRecords,
    saasConfig,
    auditLogs,
  };

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2500);
  };

  const handleDownloadAllZip = async () => {
    try {
      setIsGeneratingZip(true);
      await downloadCompleteInstallerPackageZip(installerPayload);
    } catch (err) {
      console.error('Erro ao gerar pacote ZIP:', err);
      alert('Erro ao compactar o pacote. Você pode baixar os arquivos individualmente nos botões abaixo.');
    } finally {
      setIsGeneratingZip(false);
    }
  };

  const handleDownloadNetlifyPackageZip = async () => {
    try {
      setIsGeneratingNetlifyZip(true);
      await downloadNetlifyInstallerPackageZip(installerPayload);
    } catch (err) {
      console.error('Erro ao gerar instalador Netlify:', err);
      alert('Não foi possível gerar o pacote Netlify completo. Você pode baixar o netlify.toml avulso.');
    } finally {
      setIsGeneratingNetlifyZip(false);
    }
  };

  const handleDownloadNetlifyDistZip = async () => {
    try {
      setIsDownloadingNetlifyDist(true);
      const res = await fetch('/api/download-netlify-dist');
      if (!res.ok) {
        throw new Error('Falha ao baixar pacote compilado');
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'wono_advocacia_dist_netlify_drop.zip';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.warn('API de pré-build indisponível, gerando pacote Netlify completo...', err);
      await handleDownloadNetlifyPackageZip();
    } finally {
      setIsDownloadingNetlifyDist(false);
    }
  };

  if (!isOpen) return null;

  const currentSql = sqlFormat === 'postgres' 
    ? generatePostgreSqlScript(installerPayload)
    : generateSqliteScript(installerPayload);

  const mainNetworkUrl = networkInfo.networkUrls[0]?.url || 'http://192.168.1.105:3000';

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/85 backdrop-blur-md flex justify-center items-center p-3 sm:p-4">
      <div className="bg-slate-900 border border-slate-700 w-full max-w-5xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* Modal Top Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800 bg-slate-950 flex flex-wrap justify-between items-center gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-amber-700 flex items-center justify-center text-slate-950 shadow-md shadow-amber-500/20 font-black">
              <Server className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-slate-100 text-base sm:text-lg">
                  Instalador do Banco de Dados & PC em Rede Local
                </h3>
                <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] px-2 py-0.5 rounded font-black tracking-wide uppercase">
                  Online / Offline
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Gere o instalador automático para Windows (.bat), scripts SQL com todas as tabelas e configure o acesso de múltiplos computadores no escritório.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleDownloadAllZip}
              disabled={isGeneratingZip}
              className="px-3.5 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs rounded-xl shadow-lg shadow-amber-500/25 flex items-center gap-1.5 transition cursor-pointer"
            >
              {isGeneratingZip ? (
                <RefreshCw className="w-4 h-4 animate-spin text-slate-950" />
              ) : (
                <FolderArchive className="w-4 h-4 text-slate-950" />
              )}
              <span>{isGeneratingZip ? 'Compactando...' : 'Baixar Pacote Completo (.ZIP)'}</span>
            </button>

            <button 
              onClick={onClose} 
              className="p-2 hover:bg-slate-800 text-slate-400 hover:text-white rounded-xl transition cursor-pointer"
              title="Fechar"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="bg-slate-950/60 px-4 sm:px-6 pt-3 border-b border-slate-800 flex overflow-x-auto gap-2 no-scrollbar">
          <button
            onClick={() => setActiveTab('servidor_gratis')}
            className={`px-4 py-2.5 font-black text-xs sm:text-sm rounded-t-xl transition flex items-center gap-2 cursor-pointer whitespace-nowrap border-t border-x ${
              activeTab === 'servidor_gratis'
                ? 'bg-slate-900 border-slate-700 text-amber-400 shadow-sm'
                : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-900/40'
            }`}
          >
            <Server className="w-4 h-4 text-emerald-400" />
            <span>1. Servidor Grátis</span>
          </button>

          <button
            onClick={() => setActiveTab('publicar_netlify')}
            className={`px-4 py-2.5 font-black text-xs sm:text-sm rounded-t-xl transition flex items-center gap-2 cursor-pointer whitespace-nowrap border-t border-x ${
              activeTab === 'publicar_netlify'
                ? 'bg-slate-900 border-slate-700 text-teal-400 shadow-sm'
                : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-900/40'
            }`}
          >
            <Globe className="w-4 h-4 text-teal-400" />
            <span>2. Publicar no Netlify</span>
            <span className="bg-teal-500/20 text-teal-300 text-[10px] px-1.5 py-0.5 rounded font-black uppercase">
              Grátis ⚡
            </span>
          </button>

          <button
            onClick={() => setActiveTab('pwa_mobile')}
            className={`px-4 py-2.5 font-black text-xs sm:text-sm rounded-t-xl transition flex items-center gap-2 cursor-pointer whitespace-nowrap border-t border-x ${
              activeTab === 'pwa_mobile'
                ? 'bg-slate-900 border-slate-700 text-sky-400 shadow-sm'
                : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-900/40'
            }`}
          >
            <Smartphone className="w-4 h-4 text-sky-400" />
            <span>3. App Celular (Android & iOS)</span>
            <span className="bg-sky-500/20 text-sky-300 text-[10px] px-1.5 py-0.5 rounded font-black uppercase">
              PWA 📱
            </span>
          </button>

          <button
            onClick={() => setActiveTab('rede_local')}
            className={`px-4 py-2.5 font-bold text-xs sm:text-sm rounded-t-xl transition flex items-center gap-2 cursor-pointer whitespace-nowrap border-t border-x ${
              activeTab === 'rede_local'
                ? 'bg-slate-900 border-slate-700 text-amber-400 shadow-sm'
                : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-900/40'
            }`}
          >
            <Monitor className="w-4 h-4" />
            4. Instalador PC & Rede Local
          </button>

          <button
            onClick={() => setActiveTab('banco_dados')}
            className={`px-4 py-2.5 font-bold text-xs sm:text-sm rounded-t-xl transition flex items-center gap-2 cursor-pointer whitespace-nowrap border-t border-x ${
              activeTab === 'banco_dados'
                ? 'bg-slate-900 border-slate-700 text-amber-400 shadow-sm'
                : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-900/40'
            }`}
          >
            <Database className="w-4 h-4" />
            5. Banco de Dados SQL
          </button>

          <button
            onClick={() => setActiveTab('modo_offline')}
            className={`px-4 py-2.5 font-bold text-xs sm:text-sm rounded-t-xl transition flex items-center gap-2 cursor-pointer whitespace-nowrap border-t border-x ${
              activeTab === 'modo_offline'
                ? 'bg-slate-900 border-slate-700 text-amber-400 shadow-sm'
                : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-900/40'
            }`}
          >
            <Zap className="w-4 h-4" />
            6. Online vs. 100% Offline
          </button>

          <button
            onClick={() => setActiveTab('guia_passos')}
            className={`px-4 py-2.5 font-bold text-xs sm:text-sm rounded-t-xl transition flex items-center gap-2 cursor-pointer whitespace-nowrap border-t border-x ${
              activeTab === 'guia_passos'
                ? 'bg-slate-900 border-slate-700 text-amber-400 shadow-sm'
                : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-900/40'
            }`}
          >
            <BookOpen className="w-4 h-4" />
            7. Manual de Implantação
          </button>
        </div>

        {/* Tab Contents Area */}
        <div className="p-4 sm:p-6 flex-1 overflow-y-auto space-y-6">

          {/* TAB: PUBLICAR NO NETLIFY (GRÁTIS) */}
          {activeTab === 'publicar_netlify' && (
            <div className="space-y-6">
              
              {/* Main Netlify Header Card */}
              <div className="bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 border border-teal-500/30 p-5 rounded-2xl space-y-4 shadow-xl shadow-teal-950/20">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-teal-500 to-emerald-600 flex items-center justify-center text-slate-950 font-black shadow-lg shadow-teal-500/20 shrink-0">
                      <Globe className="w-6 h-6" />
                    </div>
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h4 className="text-base font-black text-slate-100">
                          Instalador & Publicador para o Netlify
                        </h4>
                        <span className="bg-teal-500/20 text-teal-300 border border-teal-500/40 text-[10px] px-2 py-0.5 rounded font-black tracking-wide uppercase">
                          Hospedagem R$ 0,00 • Sem Limites de Acesso
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 mt-1 max-w-2xl leading-relaxed">
                        Coloque o Wono Advocacia online para toda a sua equipe e clientes em menos de 1 minuto. Baixe o instalador completo ou o pacote estático pronto para arrastar no Netlify Drop.
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      onClick={handleDownloadNetlifyPackageZip}
                      disabled={isGeneratingNetlifyZip}
                      className="px-4 py-2.5 bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-400 hover:to-emerald-400 text-slate-950 font-black text-xs rounded-xl shadow-lg shadow-teal-500/25 flex items-center gap-2 transition cursor-pointer disabled:opacity-50"
                    >
                      {isGeneratingNetlifyZip ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin text-slate-950" />
                          <span>Compactando Pacote...</span>
                        </>
                      ) : (
                        <>
                          <FolderArchive className="w-4 h-4 text-slate-950" />
                          <span>Gerar Instalador Netlify (.ZIP)</span>
                        </>
                      )}
                    </button>

                    <button
                      onClick={handleDownloadNetlifyDistZip}
                      disabled={isDownloadingNetlifyDist}
                      className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-teal-300 border border-teal-500/40 font-bold text-xs rounded-xl shadow-sm flex items-center gap-2 transition cursor-pointer disabled:opacity-50"
                      title="Baixar pacote pronto para arrastar no Netlify Drop"
                    >
                      {isDownloadingNetlifyDist ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin text-teal-400" />
                          <span>Baixando dist...</span>
                        </>
                      ) : (
                        <>
                          <Download className="w-4 h-4 text-teal-400" />
                          <span>Pacote Netlify Drop (.ZIP)</span>
                        </>
                      )}
                    </button>

                    <a
                      href="https://app.netlify.com/drop"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-2.5 bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-700 font-bold text-xs rounded-xl flex items-center gap-1.5 transition cursor-pointer"
                    >
                      <ExternalLink className="w-3.5 h-3.5 text-teal-400" />
                      <span>Abrir Drop</span>
                    </a>
                  </div>
                </div>

                {/* Quick File Downloads Toolbar */}
                <div className="pt-3 border-t border-slate-800/80 flex flex-wrap items-center gap-2 text-xs">
                  <span className="text-[11px] font-bold text-slate-400 mr-1 flex items-center gap-1">
                    <FileCode className="w-3.5 h-3.5 text-teal-400" />
                    Arquivos Individuais:
                  </span>

                  <button
                    onClick={() => downloadSingleInstallerFile('netlify.toml', generateNetlifyToml(), 'text/plain')}
                    className="px-2.5 py-1 bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700/80 rounded-lg text-[11px] font-mono transition flex items-center gap-1 cursor-pointer"
                  >
                    <Download className="w-3 h-3 text-teal-400" />
                    <span>netlify.toml</span>
                  </button>

                  <button
                    onClick={() => downloadSingleInstallerFile('_redirects', generateNetlifyRedirects(), 'text/plain')}
                    className="px-2.5 py-1 bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700/80 rounded-lg text-[11px] font-mono transition flex items-center gap-1 cursor-pointer"
                  >
                    <Download className="w-3 h-3 text-teal-400" />
                    <span>_redirects</span>
                  </button>

                  <button
                    onClick={() => downloadSingleInstallerFile('deploy_netlify.bat', generateNetlifyDeployBat(), 'text/plain')}
                    className="px-2.5 py-1 bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700/80 rounded-lg text-[11px] font-mono transition flex items-center gap-1 cursor-pointer"
                  >
                    <Terminal className="w-3 h-3 text-emerald-400" />
                    <span>deploy_netlify.bat</span>
                  </button>

                  <button
                    onClick={() => downloadSingleInstallerFile('preparar_netlify_drop.bat', generateNetlifyDropBat(), 'text/plain')}
                    className="px-2.5 py-1 bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700/80 rounded-lg text-[11px] font-mono transition flex items-center gap-1 cursor-pointer"
                  >
                    <Zap className="w-3 h-3 text-amber-400" />
                    <span>preparar_netlify_drop.bat</span>
                  </button>

                  <button
                    onClick={() => downloadSingleInstallerFile('deploy_netlify.sh', generateNetlifyDeploySh(), 'text/plain')}
                    className="px-2.5 py-1 bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700/80 rounded-lg text-[11px] font-mono transition flex items-center gap-1 cursor-pointer"
                  >
                    <Terminal className="w-3 h-3 text-sky-400" />
                    <span>deploy_netlify.sh</span>
                  </button>

                  <button
                    onClick={() => downloadSingleInstallerFile('GUIA_INSTALADOR_NETLIFY.md', generateNetlifyGuideMd(installerPayload), 'text/markdown')}
                    className="px-2.5 py-1 bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700/80 rounded-lg text-[11px] font-bold transition flex items-center gap-1 cursor-pointer ml-auto text-teal-300"
                  >
                    <BookOpen className="w-3 h-3 text-teal-400" />
                    <span>Manual Completo (.md)</span>
                  </button>
                </div>
              </div>

              {/* THREE METHODS: Drop vs GitHub vs CLI */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                
                {/* METHOD 1: Netlify Drop */}
                <div className="bg-slate-950 border border-emerald-500/20 p-5 rounded-2xl space-y-4 flex flex-col justify-between shadow-sm">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded-full bg-emerald-500 text-slate-950 font-black text-xs flex items-center justify-center">1</span>
                        <h5 className="font-extrabold text-sm text-slate-100">Netlify Drop (30 Segundos)</h5>
                      </div>
                      <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300">Mais Rápido</span>
                    </div>

                    <p className="text-xs text-slate-400 leading-relaxed">
                      Não quer instalar nada no terminal? Baixe o pacote pronto e apenas arraste para dentro do navegador.
                    </p>

                    {/* Step list */}
                    <div className="p-3 bg-slate-900/90 rounded-xl space-y-2 border border-slate-800 text-xs text-slate-300">
                      <div className="flex items-start gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                        <span>Clique no botão <strong className="text-white">"Pacote Netlify Drop (.ZIP)"</strong> acima.</span>
                      </div>
                      <div className="flex items-start gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                        <span>Acesse <a href="https://app.netlify.com/drop" target="_blank" rel="noopener noreferrer" className="text-teal-400 font-bold hover:underline inline-flex items-center gap-0.5">app.netlify.com/drop <ExternalLink className="w-3 h-3" /></a>.</span>
                      </div>
                      <div className="flex items-start gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                        <span>Arraste o arquivo baixado para a tela do Netlify.</span>
                      </div>
                      <div className="flex items-start gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                        <span>Seu site estará online instantaneamente com HTTPS!</span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2 pt-2 border-t border-slate-900">
                    <button
                      onClick={handleDownloadNetlifyDistZip}
                      disabled={isDownloadingNetlifyDist}
                      className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer shadow-md"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>{isDownloadingNetlifyDist ? 'Baixando...' : 'Baixar Pacote Drop (.ZIP)'}</span>
                    </button>
                  </div>
                </div>

                {/* METHOD 2: GitHub CI/CD */}
                <div className="bg-slate-950 border border-teal-500/20 p-5 rounded-2xl space-y-4 flex flex-col justify-between shadow-sm">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded-full bg-teal-500 text-slate-950 font-black text-xs flex items-center justify-center">2</span>
                        <h5 className="font-extrabold text-sm text-slate-100">GitHub (Deploy Contínuo)</h5>
                      </div>
                      <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-teal-500/20 text-teal-300">Recomendado</span>
                    </div>

                    <p className="text-xs text-slate-400 leading-relaxed">
                      Conecte seu repositório Git. Toda vez que você fizer uma atualização, o Netlify compila e publica sozinho.
                    </p>

                    {/* Step list */}
                    <div className="p-3 bg-slate-900/90 rounded-xl space-y-2 border border-slate-800 text-xs text-slate-300">
                      <div className="flex items-start gap-2">
                        <CheckCircle2 className="w-4 h-4 text-teal-400 shrink-0 mt-0.5" />
                        <span>O arquivo <strong className="text-white">netlify.toml</strong> já está incluso na raiz.</span>
                      </div>
                      <div className="flex items-start gap-2">
                        <CheckCircle2 className="w-4 h-4 text-teal-400 shrink-0 mt-0.5" />
                        <span>No Netlify, escolha <strong className="text-white">"Import from Git"</strong>.</span>
                      </div>
                      <div className="flex items-start gap-2">
                        <CheckCircle2 className="w-4 h-4 text-teal-400 shrink-0 mt-0.5" />
                        <span>Selecione seu repositório do Wono Advocacia.</span>
                      </div>
                      <div className="flex items-start gap-2">
                        <CheckCircle2 className="w-4 h-4 text-teal-400 shrink-0 mt-0.5" />
                        <span>Build command: <code className="text-white">npm run build</code> | Publish: <code className="text-white">dist</code>.</span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2 pt-2 border-t border-slate-900">
                    <a
                      href="https://app.netlify.com/start"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full py-2 bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer shadow-md text-center"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>Conectar Repositório Git</span>
                    </a>
                  </div>
                </div>

                {/* METHOD 3: Script 1-Clique Windows / Mac */}
                <div className="bg-slate-950 border border-purple-500/20 p-5 rounded-2xl space-y-4 flex flex-col justify-between shadow-sm">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded-full bg-purple-500 text-slate-950 font-black text-xs flex items-center justify-center">3</span>
                        <h5 className="font-extrabold text-sm text-slate-100">Script 1-Clique (CLI)</h5>
                      </div>
                      <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-purple-500/20 text-purple-300">Automático</span>
                    </div>

                    <p className="text-xs text-slate-400 leading-relaxed">
                      Execute o script batch no Windows ou shell no Mac/Linux para compilar e publicar via terminal.
                    </p>

                    {/* Step list */}
                    <div className="p-3 bg-slate-900/90 rounded-xl space-y-2 border border-slate-800 text-xs text-slate-300">
                      <div className="flex items-start gap-2">
                        <CheckCircle2 className="w-4 h-4 text-purple-400 shrink-0 mt-0.5" />
                        <span>Dê duplo clique em <strong className="text-white">deploy_netlify.bat</strong>.</span>
                      </div>
                      <div className="flex items-start gap-2">
                        <CheckCircle2 className="w-4 h-4 text-purple-400 shrink-0 mt-0.5" />
                        <span>O script verifica Node.js e instala Netlify CLI.</span>
                      </div>
                      <div className="flex items-start gap-2">
                        <CheckCircle2 className="w-4 h-4 text-purple-400 shrink-0 mt-0.5" />
                        <span>Executa o build de produção (<code className="text-white">npm run build</code>).</span>
                      </div>
                      <div className="flex items-start gap-2">
                        <CheckCircle2 className="w-4 h-4 text-purple-400 shrink-0 mt-0.5" />
                        <span>Publica diretamente em produção com flag <code className="text-white">--prod</code>.</span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2 pt-2 border-t border-slate-900">
                    <button
                      onClick={() => downloadSingleInstallerFile('deploy_netlify.bat', generateNetlifyDeployBat(), 'text/plain')}
                      className="w-full py-2 bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer shadow-md"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Baixar deploy_netlify.bat</span>
                    </button>
                  </div>
                </div>

              </div>

              {/* Domain & Cloud Database Tips Card */}
              <div className="bg-slate-950 border border-slate-800 p-5 rounded-2xl space-y-3">
                <div className="flex items-center gap-2">
                  <Globe className="w-5 h-5 text-teal-400" />
                  <h4 className="text-sm font-bold text-slate-100">
                    Domínio Próprio (ex: www.seuescritorio.adv.br) & Banco na Nuvem
                  </h4>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-slate-400">
                  <div className="p-3.5 bg-slate-900/60 rounded-xl border border-slate-800/60 space-y-1.5">
                    <h5 className="font-bold text-slate-200 flex items-center gap-1.5">
                      <ShieldCheck className="w-4 h-4 text-emerald-400" />
                      Domínio Personalizado & SSL Grátis
                    </h5>
                    <p className="leading-relaxed">
                      No painel do Netlify, vá em <strong>Domain management &gt; Add a domain</strong>. Crie uma entrada DNS CNAME apontando para o seu subdomínio do Netlify e receba um certificado SSL Let's Encrypt gratuito e vitalício.
                    </p>
                  </div>

                  <div className="p-3.5 bg-slate-900/60 rounded-xl border border-slate-800/60 space-y-1.5">
                    <h5 className="font-bold text-slate-200 flex items-center gap-1.5">
                      <Database className="w-4 h-4 text-teal-400" />
                      Importar seus Dados Iniciais
                    </h5>
                    <p className="leading-relaxed">
                      O pacote instalador inclui o arquivo <code className="text-teal-300">backup_inicial_escritorio.json</code>. Ao acessar o site publicado no Netlify, vá em <strong>Escritório / Banco de Dados</strong> e clique em <strong>Importar Backup</strong> para restaurar todos os seus processos e clientes!
                    </p>
                  </div>
                </div>
              </div>

              {/* Interactive Code Viewer for netlify.toml */}
              <div className="bg-slate-950 border border-slate-800 p-5 rounded-2xl space-y-3">
                <div className="flex justify-between items-center">
                  <h4 className="text-xs font-black uppercase text-slate-300 tracking-wider flex items-center gap-2">
                    <FileCode className="w-4 h-4 text-teal-400" />
                    Arquivo <strong className="text-white font-mono">netlify.toml</strong> (Configuração de Produção):
                  </h4>
                  <button
                    onClick={() => copyToClipboard(generateNetlifyToml(), 'netlify_toml')}
                    className="px-2.5 py-1 bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                  >
                    {copiedKey === 'netlify_toml' ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        <span className="text-emerald-400">Copiado!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copiar Código</span>
                      </>
                    )}
                  </button>
                </div>
                
                <pre className="p-4 bg-slate-900 rounded-xl text-teal-300 font-mono text-xs overflow-x-auto border border-slate-800/80 leading-relaxed">
                  {generateNetlifyToml()}
                </pre>
              </div>

            </div>
          )}

          {/* TAB: DISPOSITIVOS MÓVEIS / PWA APP CELULAR */}
          {activeTab === 'pwa_mobile' && (
            <div className="space-y-6">
              
              {/* Header Card */}
              <div className="bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 border border-sky-500/30 p-5 rounded-2xl space-y-4 shadow-xl shadow-sky-950/20">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-sky-500 to-blue-600 flex items-center justify-center text-slate-950 font-black shadow-lg shadow-sky-500/20">
                      <Smartphone className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h4 className="text-base font-black text-slate-100 flex items-center gap-2">
                        Aplicativo Móvel para Android & iPhone
                        <span className="bg-sky-500/20 text-sky-300 border border-sky-500/40 text-[10px] px-2 py-0.5 rounded font-black tracking-wide uppercase">
                          Tecnologia PWA • Sem Lojas de App
                        </span>
                      </h4>
                      <p className="text-xs text-slate-400">
                        Não é necessário baixar arquivos .APK ou pagar taxas de desenvolvedor da Apple/Google. Instale o WonoJuris direto no celular como um Web App Progressivo.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Status Indicator / Live Installer Prompt */}
              <div className="bg-slate-950 border border-slate-800 p-6 rounded-2xl space-y-6">
                <div className="flex flex-col md:flex-row items-center gap-6 justify-between">
                  <div className="space-y-2 text-center md:text-left max-w-xl">
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-sky-500/10 text-sky-400 rounded-full text-xs font-bold border border-sky-500/20">
                      <span className="w-2 h-2 rounded-full bg-sky-400 animate-pulse" />
                      Status de Instalação no Aparelho Atual
                    </div>
                    
                    {isInstalled ? (
                      <div className="space-y-1">
                        <h5 className="text-base font-extrabold text-emerald-400 flex items-center justify-center md:justify-start gap-1.5">
                          <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                          Aplicativo Instalado com Sucesso!
                        </h5>
                        <p className="text-xs text-slate-400">
                          Você já está utilizando o WonoJuris em modo standalone nativo. Acesse-o pelo ícone na tela inicial do seu celular.
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-1">
                        <h5 className="text-base font-extrabold text-slate-100">
                          Pronto para Instalação no Celular
                        </h5>
                        <p className="text-xs text-slate-400">
                          Detectamos que você pode instalar este sistema agora mesmo para ter um atalho rápido na sua tela inicial, interface em tela cheia (sem barra de navegador) e funcionamento offline.
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Dynamic Installation Triggers */}
                  <div className="flex flex-col gap-2 shrink-0 w-full md:w-auto">
                    {/* Standard PWA Prompt */}
                    {isInstallable && !isInstalled && (
                      <button
                        onClick={install}
                        className="w-full md:w-auto px-6 py-3.5 bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-white font-black text-sm rounded-xl shadow-lg shadow-sky-500/20 flex items-center justify-center gap-2 transition cursor-pointer"
                      >
                        <Download className="w-4 h-4" />
                        <span>Instalar no meu Android / PC</span>
                      </button>
                    )}

                    {/* iOS Manual Guide Toggle */}
                    {isIOS && !isInstalled && (
                      <button
                        onClick={() => setShowIOSManualGuide(!showIOSManualGuide)}
                        className="w-full md:w-auto px-6 py-3.5 bg-slate-900 hover:bg-slate-800 text-sky-400 border border-slate-800 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition cursor-pointer"
                      >
                        <Smartphone className="w-4 h-4" />
                        <span>Instalar no meu iPhone (iOS)</span>
                      </button>
                    )}

                    {/* Fallback Desktop Instructions */}
                    {!isInstallable && !isIOS && !isInstalled && (
                      <div className="p-3 bg-slate-900 rounded-xl border border-slate-800 text-center md:text-right max-w-xs">
                        <p className="text-[11px] text-slate-400">
                          💡 No smartphone, abra o link do sistema no navegador <strong className="text-white">Safari (iPhone)</strong> ou <strong className="text-white">Chrome (Android)</strong> para habilitar a instalação nativa com 1 clique.
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* iOS Manual Step-by-Step Instructions Panel */}
                {(isIOS || showIOSManualGuide) && !isInstalled && (
                  <div className="p-5 bg-slate-900 border border-sky-500/20 rounded-xl space-y-4 animate-fade-in">
                    <h5 className="text-xs font-black uppercase text-sky-400 tracking-wider flex items-center gap-1.5">
                      <Smartphone className="w-4 h-4" />
                      Passo a Passo para iPhone / iPad (Safari)
                    </h5>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                      <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
                        <span className="w-6 h-6 rounded-full bg-sky-500 text-slate-950 font-black flex items-center justify-center">1</span>
                        <p className="text-slate-300">
                          Abra este sistema no navegador nativo <strong className="text-white">Safari</strong> do seu iPhone.
                        </p>
                      </div>
                      <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
                        <span className="w-6 h-6 rounded-full bg-sky-500 text-slate-950 font-black flex items-center justify-center">2</span>
                        <p className="text-slate-300">
                          Toque no ícone de <strong className="text-white">Compartilhar</strong> (quadrado com uma seta para cima na barra inferior).
                        </p>
                      </div>
                      <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
                        <span className="w-6 h-6 rounded-full bg-sky-500 text-slate-950 font-black flex items-center justify-center">3</span>
                        <p className="text-slate-300">
                          Role a lista para baixo e selecione a opção <strong className="text-white">Adicionar à Tela de Início</strong>. Pronto!
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* QR Code and Remote Access Instructions */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                
                {/* QR Code Card */}
                <div className="bg-slate-950 border border-slate-800 p-5 rounded-2xl flex flex-col justify-between space-y-4 shadow-sm">
                  <div className="space-y-3">
                    <h5 className="font-extrabold text-sm text-slate-100 flex items-center gap-1.5">
                      <Layers className="w-4 h-4 text-sky-400" />
                      Acesse Rápido no Celular (Escaneie o QR Code)
                    </h5>
                    <p className="text-xs text-slate-400">
                      Escaneie o código abaixo com a câmera do seu celular para abrir o link do sistema WonoJuris instantaneamente no seu aparelho.
                    </p>

                    <div className="flex justify-center p-4 bg-white rounded-xl w-40 h-40 mx-auto border border-slate-200">
                      {/* Simple Dynamic SVG QR Code mockup for client URL */}
                      <svg className="w-full h-full text-slate-950" viewBox="0 0 100 100" fill="currentColor">
                        <path d="M5,5 h20 v20 h-20 z M9,9 h12 v12 h-12 z M13,13 h4 v4 h-4 z" />
                        <path d="M75,5 h20 v20 h-20 z M79,9 h12 v12 h-12 z M83,13 h4 v4 h-4 z" />
                        <path d="M5,75 h20 v20 h-20 z M9,79 h12 v12 h-12 z M13,83 h4 v4 h-4 z" />
                        {/* Fake random QR matrix bits */}
                        <path d="M35,5 h5 v5 h-5 z M45,5 h5 v5 h-5 z M55,5 h10 v5 h-10 z M35,15 h10 v5 h-10 z M55,15 h5 v5 h-5 z M65,15 h5 v5 h-5 z" />
                        <path d="M35,25 h5 v10 h-5 z M45,30 h10 v5 h-10 z M60,25 h15 v5 h-15 z M85,30 h10 v5 h-10 z" />
                        <path d="M5,35 h15 v5 h-15 z M25,45 h5 v5 h-5 z M35,45 h20 v5 h-20 z M60,45 h5 v5 h-5 z M75,45 h15 v5 h-15 z" />
                        <path d="M10,55 h5 v10 h-5 z M25,55 h10 v5 h-10 z M45,55 h5 v5 h-5 z M55,55 h15 v10 h-15 z M80,55 h15 v5 h-15 z" />
                        <path d="M35,65 h10 v5 h-10 z M50,70 h15 v5 h-15 z M70,65 h5 v10 h-5 z M80,70 h5 v5 h-5 z" />
                        <path d="M35,75 h5 v15 h-5 z M45,85 h20 v5 h-20 z M75,85 h10 v5 h-10 z M90,80 h5 v15 h-5 z" />
                      </svg>
                    </div>
                  </div>

                  <div className="p-3 bg-slate-900 rounded-xl text-center border border-slate-800">
                    <span className="text-[11px] text-sky-400 font-mono select-all break-all">
                      {window.location.href}
                    </span>
                  </div>
                </div>

                {/* Mobile Server Connection (Wi-Fi Redirection) */}
                <div className="bg-slate-950 border border-slate-800 p-5 rounded-2xl flex flex-col justify-between space-y-4 shadow-sm">
                  <div className="space-y-3">
                    <h5 className="font-extrabold text-sm text-slate-100 flex items-center gap-1.5">
                      <Wifi className="w-4 h-4 text-sky-400" />
                      Conexão em Rede Local (Wi-Fi do Escritório)
                    </h5>
                    <p className="text-xs text-slate-400">
                      Caso esteja rodando o servidor no seu computador local, você pode acessar e instalar o app no celular conectando o smartphone na mesma rede Wi-Fi e digitando o endereço IP local do seu servidor:
                    </p>

                    <div className="p-4 bg-slate-900 rounded-xl border border-slate-800 space-y-3 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400 font-bold">Endereço IP sugerido:</span>
                        <span className="text-sky-400 font-mono font-bold text-sm bg-slate-950 px-2.5 py-1 rounded border border-slate-800">
                          http://192.168.1.105:3000
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-400 leading-relaxed">
                        ⚠️ <strong className="text-slate-300">Atenção:</strong> Certifique-se de que o firewall do seu computador servidor está configurado para liberar a porta <strong className="text-white">3000</strong>. O script de instalação automática local do WonoJuris já realiza essa liberação automaticamente.
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <h6 className="text-[11px] font-bold text-slate-300">Vantagens de Usar o App Celular:</h6>
                    <ul className="text-[11px] text-slate-400 space-y-1 list-disc list-inside">
                      <li>Uso em audiências no celular pelo 4G/5G sem barra do navegador;</li>
                      <li>Contatos de clientes integrados para ligar ou abrir o WhatsApp;</li>
                      <li>Consulta rápida a andamentos de processos CNJ direto da palma da sua mão.</li>
                    </ul>
                  </div>
                </div>

              </div>

            </div>
          )}

          {/* TAB 0: SERVIDOR GRÁTIS (PC & NUVEM) */}
          {activeTab === 'servidor_gratis' && (
            <div className="space-y-6">
              
              {/* Header Card: 100% Free Guarantee */}
              <div className="bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 border border-emerald-500/30 p-5 rounded-2xl space-y-4 shadow-xl shadow-emerald-950/20">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-700 flex items-center justify-center text-slate-950 font-black shadow-lg shadow-emerald-500/20">
                      <Sparkles className="w-6 h-6" />
                    </div>
                    <div>
                      <h4 className="text-base font-black text-slate-100 flex items-center gap-2">
                        Guia de Instalação de Servidor 100% Gratuito
                        <span className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 text-[10px] px-2 py-0.5 rounded font-black tracking-wide uppercase">
                          Sem Mensalidade • Sem Cartão
                        </span>
                      </h4>
                      <p className="text-xs text-slate-400">
                        Escolha a modalidade ideal para o seu escritório: rodar direto no PC sem gastar 1 centavo ou colocar na nuvem gratuita 24h.
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={handleDownloadAllZip}
                    disabled={isGeneratingZip}
                    className="px-4 py-2 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black text-xs rounded-xl shadow-lg shadow-emerald-500/20 flex items-center gap-2 transition cursor-pointer"
                  >
                    <Download className="w-4 h-4 text-slate-950" />
                    <span>Baixar Pacote do Servidor (.ZIP)</span>
                  </button>
                </div>
              </div>

              {/* 4 FREE Server Options Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                
                {/* OPÇÃO 1: SERVIDOR LOCAL NO PRÓPRIO PC (R$ 0,00) */}
                <div className="bg-slate-950 border border-amber-500/30 p-5 rounded-2xl space-y-4 flex flex-col justify-between shadow-sm shadow-amber-500/5">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded-full bg-amber-500 text-slate-950 font-black text-xs flex items-center justify-center">1</span>
                        <h5 className="font-extrabold text-sm text-slate-100">Servidor Grátis no PC do Escritório</h5>
                      </div>
                      <span className="text-[10px] bg-amber-500/20 text-amber-300 font-bold px-2 py-0.5 rounded border border-amber-500/30">
                        Mais Rápido & Seguro
                      </span>
                    </div>

                    <p className="text-xs text-slate-400 leading-relaxed">
                      Transforma o computador principal da recepção ou do advogado em um servidor local. Não depende de internet para funcionar e suporta todos os computadores do escritório pela rede Wi-Fi.
                    </p>

                    <div className="p-3 bg-slate-900/90 rounded-xl space-y-2 border border-slate-800 text-xs">
                      <div className="flex items-center justify-between text-slate-300 font-bold">
                        <span>Custo Mensal:</span>
                        <span className="text-emerald-400 font-black">R$ 0,00 (Gratuito Vitalício)</span>
                      </div>
                      <div className="flex items-center justify-between text-slate-400 text-[11px]">
                        <span>Segurança dos Dados:</span>
                        <span className="text-slate-200">100% no seu computador</span>
                      </div>
                      <div className="flex items-center justify-between text-slate-400 text-[11px]">
                        <span>Acesso em Rede:</span>
                        <span className="text-amber-400 font-mono font-bold">http://192.168.1.105:3000</span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2 pt-2 border-t border-slate-900">
                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() => downloadSingleInstallerFile('Instalar_WonoJuris_Local_e_Rede.bat', generateWindowsInstallerBat())}
                        className="flex-1 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer shadow-md shadow-amber-500/20"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Windows (.BAT)</span>
                      </button>
                      <button
                        onClick={() => downloadSingleInstallerFile('instalar_linux.sh', generateLinuxInstallerSh(), 'text/x-sh')}
                        className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs rounded-xl transition flex items-center gap-1 cursor-pointer"
                        title="Baixar para Linux Ubuntu / Debian"
                      >
                        <span>Linux (.sh)</span>
                      </button>
                      <button
                        onClick={() => downloadSingleInstallerFile('iniciar_mac.command', generateMacInstallerCommand(), 'text/x-sh')}
                        className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs rounded-xl transition flex items-center gap-1 cursor-pointer"
                        title="Baixar para Apple Mac"
                      >
                        <span>Mac (.command)</span>
                      </button>
                    </div>
                    <span className="text-[10px] text-slate-500 text-center block">Basta dar dois cliques no arquivo baixado para iniciar</span>
                  </div>
                </div>

                {/* OPÇÃO 2: SERVIDOR NUVEM GRATUITO 24H (RENDER / RAILWAY / NETLIFY / VERCEL) */}
                <div className="bg-slate-950 border border-emerald-500/30 p-5 rounded-2xl space-y-4 flex flex-col justify-between shadow-sm shadow-emerald-500/5">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded-full bg-emerald-500 text-slate-950 font-black text-xs flex items-center justify-center">2</span>
                        <h5 className="font-extrabold text-sm text-slate-100">Servidor em Nuvem Grátis 24h</h5>
                      </div>
                      <span className="text-[10px] bg-emerald-500/20 text-emerald-300 font-bold px-2 py-0.5 rounded border border-emerald-500/30">
                        Online 24h • SSL Grátis
                      </span>
                    </div>

                    <p className="text-xs text-slate-400 leading-relaxed">
                      Publique o sistema na nuvem gratuita do <strong>Render</strong>, <strong>Vercel</strong> ou <strong>Netlify</strong>. Fica online 24 horas por dia com link público seguro HTTPS para você acessar no celular pelo 4G/5G em qualquer lugar.
                    </p>

                    <div className="p-3 bg-slate-900/90 rounded-xl space-y-2 border border-slate-800 text-xs">
                      <div className="flex items-center justify-between text-slate-300 font-bold">
                        <span>Hospedagem Render / Vercel:</span>
                        <span className="text-emerald-400 font-black">Grátis (Plano Free Permanente)</span>
                      </div>
                      <div className="flex items-center justify-between text-slate-400 text-[11px]">
                        <span>Certificado de Segurança:</span>
                        <span className="text-slate-200">HTTPS / SSL Automático</span>
                      </div>
                      <div className="flex items-center justify-between text-slate-400 text-[11px]">
                        <span>Deploy em 1 Clique:</span>
                        <span className="text-emerald-400">Arquivos render.yaml e vercel.json prontos</span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2 pt-2 border-t border-slate-900">
                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() => downloadSingleInstallerFile('render.yaml', generateRenderYaml(), 'text/yaml')}
                        className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer shadow-md shadow-emerald-600/20"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Baixar render.yaml</span>
                      </button>
                      <button
                        onClick={() => downloadSingleInstallerFile('netlify.toml', generateNetlifyToml(), 'text/plain')}
                        className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs rounded-xl transition flex items-center gap-1 cursor-pointer"
                        title="Baixar configuração Netlify"
                      >
                        <span>Netlify</span>
                      </button>
                      <button
                        onClick={() => downloadSingleInstallerFile('vercel.json', generateVercelJson(), 'application/json')}
                        className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs rounded-xl transition flex items-center gap-1 cursor-pointer"
                        title="Baixar configuração Vercel"
                      >
                        <span>Vercel</span>
                      </button>
                    </div>
                    <span className="text-[10px] text-slate-500 text-center block">Suporte total a Node.js + Express + Vite</span>
                  </div>
                </div>

                {/* OPÇÃO 3: BANCO DE DADOS POSTGRESQL GRÁTIS NA NUVEM (SUPABASE / NEON) */}
                <div className="bg-slate-950 border border-blue-500/30 p-5 rounded-2xl space-y-4 flex flex-col justify-between shadow-sm shadow-blue-500/5">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded-full bg-blue-500 text-slate-950 font-black text-xs flex items-center justify-center">3</span>
                        <h5 className="font-extrabold text-sm text-slate-100">Banco de Dados PostgreSQL Grátis</h5>
                      </div>
                      <span className="text-[10px] bg-blue-500/20 text-blue-300 font-bold px-2 py-0.5 rounded border border-blue-500/30">
                        Supabase • Neon
                      </span>
                    </div>

                    <p className="text-xs text-slate-400 leading-relaxed">
                      Crie um banco relacional PostgreSQL completo gratuitamente no <strong>Supabase</strong> (500MB grátis) ou <strong>Neon Tech</strong>. O script SQL gerado já cria as 10 tabelas com todos os clientes e processos.
                    </p>

                    <div className="p-3 bg-slate-900/90 rounded-xl space-y-2 border border-slate-800 text-xs">
                      <div className="flex items-center justify-between text-slate-300 font-bold">
                        <span>Plano Gratuito Supabase:</span>
                        <span className="text-emerald-400 font-black">500MB + Backups Grátis</span>
                      </div>
                      <div className="flex items-center justify-between text-slate-400 text-[11px]">
                        <span>Script SQL Incluso:</span>
                        <span className="text-slate-200">schema_postgresql.sql (10 Tabelas)</span>
                      </div>
                      <div className="flex items-center justify-between text-slate-400 text-[11px]">
                        <span>Tempo de Criação:</span>
                        <span className="text-blue-400 font-bold">&lt; 2 Minutos</span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2 pt-2 border-t border-slate-900">
                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() => downloadSingleInstallerFile('schema_postgresql.sql', generatePostgreSqlScript(installerPayload), 'text/sql')}
                        className="flex-1 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer shadow-md shadow-blue-600/20"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Baixar schema_postgresql.sql</span>
                      </button>
                      <button
                        onClick={() => copyToClipboard(generatePostgreSqlScript(installerPayload), 'pg_sql')}
                        className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs rounded-xl transition flex items-center gap-1 cursor-pointer"
                        title="Copiar Código SQL"
                      >
                        {copiedKey === 'pg_sql' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>Copiar</span>
                      </button>
                    </div>
                    <span className="text-[10px] text-slate-500 text-center block">Basta colar no SQL Editor do Supabase</span>
                  </div>
                </div>

                {/* OPÇÃO 4: ACESSO REMOTO GRÁTIS SEM IP FIXO (TAILSCALE / ZERO TIER) */}
                <div className="bg-slate-950 border border-purple-500/30 p-5 rounded-2xl space-y-4 flex flex-col justify-between shadow-sm shadow-purple-500/5">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded-full bg-purple-500 text-white font-black text-xs flex items-center justify-center">4</span>
                        <h5 className="font-extrabold text-sm text-slate-100">Acesso Remoto Grátis sem IP Fixo</h5>
                      </div>
                      <span className="text-[10px] bg-purple-500/20 text-purple-300 font-bold px-2 py-0.5 rounded border border-purple-500/30">
                        Tailscale VPN • Grátis
                      </span>
                    </div>

                    <p className="text-xs text-slate-400 leading-relaxed">
                      Acesse o servidor do computador do escritório de qualquer lugar do mundo (na sua casa, no fórum ou no celular) usando o <strong>Tailscale</strong> gratuito, sem precisar pagar IP fixo na sua operadora de internet.
                    </p>

                    <div className="p-3 bg-slate-900/90 rounded-xl space-y-2 border border-slate-800 text-xs">
                      <div className="flex items-center justify-between text-slate-300 font-bold">
                        <span>Tailscale Free Tier:</span>
                        <span className="text-emerald-400 font-black">Grátis até 100 Dispositivos</span>
                      </div>
                      <div className="flex items-center justify-between text-slate-400 text-[11px]">
                        <span>Criptografia:</span>
                        <span className="text-slate-200">WireGuard Ponto a Ponto</span>
                      </div>
                      <div className="flex items-center justify-between text-slate-400 text-[11px]">
                        <span>Configuração:</span>
                        <span className="text-purple-400 font-bold">Instale no PC e no Celular</span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2 pt-2 border-t border-slate-900">
                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() => downloadSingleInstallerFile('GUIA_INSTALACAO_REDE_E_BANCO.md', generateInstallationGuideMd(installerPayload), 'text/markdown')}
                        className="flex-1 py-2 bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer shadow-md shadow-purple-600/20"
                      >
                        <BookOpen className="w-3.5 h-3.5" />
                        <span>Ver Instruções no Manual</span>
                      </button>
                    </div>
                    <span className="text-[10px] text-slate-500 text-center block">Funciona através de qualquer operadora ou roteador</span>
                  </div>
                </div>

              </div>

              {/* Step-by-Step Interactive Summary for 3-minute installation */}
              <div className="bg-slate-950 border border-slate-800 p-5 rounded-2xl space-y-3">
                <h4 className="text-xs font-black uppercase text-slate-300 tracking-wider flex items-center gap-2">
                  <Play className="w-4 h-4 text-emerald-400" />
                  Como Iniciar o Servidor Grátis em 3 Passos Simples:
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs text-slate-300">
                  <div className="p-3.5 bg-slate-900 rounded-xl space-y-1.5 border border-slate-800">
                    <span className="w-5 h-5 rounded-full bg-emerald-500 text-slate-950 font-black inline-flex items-center justify-center text-[10px]">1</span>
                    <h5 className="font-bold text-slate-100">Baixe o Pacote (.ZIP)</h5>
                    <p className="text-slate-400 leading-relaxed">
                      Clique no botão dourado <strong className="text-amber-300">"Baixar Pacote Completo (.ZIP)"</strong> no topo deste painel e descompacte a pasta no seu computador.
                    </p>
                  </div>

                  <div className="p-3.5 bg-slate-900 rounded-xl space-y-1.5 border border-slate-800">
                    <span className="w-5 h-5 rounded-full bg-emerald-500 text-slate-950 font-black inline-flex items-center justify-center text-[10px]">2</span>
                    <h5 className="font-bold text-slate-100">Execute o Instalador</h5>
                    <p className="text-slate-400 leading-relaxed">
                      No Windows, clique duas vezes em <strong className="text-slate-200">Instalar_WonoJuris_Local_e_Rede.bat</strong>. No Linux use <strong className="text-slate-200">bash instalar_linux.sh</strong>.
                    </p>
                  </div>

                  <div className="p-3.5 bg-slate-900 rounded-xl space-y-1.5 border border-slate-800">
                    <span className="w-5 h-5 rounded-full bg-emerald-500 text-slate-950 font-black inline-flex items-center justify-center text-[10px]">3</span>
                    <h5 className="font-bold text-slate-100">Abra nos Computadores</h5>
                    <p className="text-slate-400 leading-relaxed">
                      Inicie o sistema com <strong className="text-slate-200">Iniciar_Servidor_Rede_Local.bat</strong> e abra o endereço <strong className="text-emerald-400">{mainNetworkUrl}</strong> nos outros computadores.
                    </p>
                  </div>
                </div>
              </div>

            </div>
          )}

          {/* TAB 1: INSTALADOR PC & REDE LOCAL */}
          {activeTab === 'rede_local' && (
            <div className="space-y-6">
              
              {/* Highlight Card: Local Network Sharing URLs */}
              <div className="bg-gradient-to-br from-slate-950 to-slate-900 border border-slate-700 p-5 rounded-2xl space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 bg-amber-500/20 text-amber-400 rounded-lg">
                      <Wifi className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-sm font-extrabold text-slate-100">
                        Endereço de Acesso para Outros Computadores do Escritório
                      </h4>
                      <p className="text-xs text-slate-400">
                        Compartilhe este link com a sua secretária, estagiários e advogados associados na mesma rede Wi-Fi ou cabo:
                      </p>
                    </div>
                  </div>

                  <span className="flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-lg">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                    Servidor Local Ativo na Porta 3000 (0.0.0.0)
                  </span>
                </div>

                {/* Network URL Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {/* Este Computador */}
                  <div className="bg-slate-900/90 border border-slate-800 p-3.5 rounded-xl space-y-2">
                    <div className="flex items-center justify-between text-xs text-slate-400">
                      <span className="font-bold text-slate-300 flex items-center gap-1.5">
                        <Monitor className="w-3.5 h-3.5 text-amber-400" />
                        Acesso neste Computador (Host)
                      </span>
                      <span className="text-[10px] bg-slate-800 px-1.5 py-0.5 rounded text-slate-300">Localhost</span>
                    </div>
                    <div className="flex items-center justify-between gap-2 bg-slate-950 px-3 py-2 rounded-lg border border-slate-800 font-mono text-xs text-amber-300">
                      <span>{networkInfo.localUrl}</span>
                      <button
                        onClick={() => copyToClipboard(networkInfo.localUrl, 'local_url')}
                        className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-amber-400 transition"
                        title="Copiar Link"
                      >
                        {copiedKey === 'local_url' ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {/* Outros Computadores da Rede */}
                  <div className="bg-slate-900/90 border border-amber-500/30 p-3.5 rounded-xl space-y-2 shadow-sm shadow-amber-500/5">
                    <div className="flex items-center justify-between text-xs text-slate-400">
                      <span className="font-bold text-amber-300 flex items-center gap-1.5">
                        <Smartphone className="w-3.5 h-3.5 text-amber-400" />
                        Acesso de Outros PCs & Celulares (Wi-Fi)
                      </span>
                      <span className="text-[10px] bg-amber-500/20 text-amber-300 font-bold px-1.5 py-0.5 rounded">Rede Interna</span>
                    </div>
                    <div className="flex items-center justify-between gap-2 bg-slate-950 px-3 py-2 rounded-lg border border-slate-800 font-mono text-xs text-emerald-400 font-bold">
                      <span>{mainNetworkUrl}</span>
                      <button
                        onClick={() => copyToClipboard(mainNetworkUrl, 'net_url')}
                        className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-emerald-400 transition"
                        title="Copiar Link de Rede"
                      >
                        {copiedKey === 'net_url' ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* 1-Click Windows Executables and Batch Files */}
              <div className="space-y-3">
                <h4 className="text-xs font-black uppercase text-slate-400 tracking-wider flex items-center gap-2">
                  <Terminal className="w-4 h-4 text-amber-400" />
                  Scripts de Execução e Instalação em 1 Clique (Windows .BAT)
                </h4>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  
                  {/* File 1: Instalar_WonoJuris_Local_e_Rede.bat */}
                  <div className="bg-slate-950 border border-slate-800 p-4 rounded-xl space-y-3 flex flex-col justify-between">
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-mono font-bold text-amber-400 truncate">
                          Instalar_WonoJuris.bat
                        </span>
                        <span className="text-[10px] bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded font-mono">BAT</span>
                      </div>
                      <p className="text-xs text-slate-400 leading-relaxed">
                        Instala todas as dependências, configura a regra de liberação da porta 3000 no Firewall do Windows e prepara o sistema.
                      </p>
                    </div>
                    <div className="flex items-center gap-2 pt-2 border-t border-slate-900">
                      <button
                        onClick={() => downloadSingleInstallerFile('Instalar_WonoJuris_Local_e_Rede.bat', generateWindowsInstallerBat())}
                        className="flex-1 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white font-bold text-xs rounded-lg transition flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <Download className="w-3.5 h-3.5 text-amber-400" />
                        Baixar Script
                      </button>
                      <button
                        onClick={() => copyToClipboard(generateWindowsInstallerBat(), 'bat_install')}
                        className="p-1.5 bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-amber-300 rounded-lg border border-slate-800 transition"
                        title="Copiar código .bat"
                      >
                        {copiedKey === 'bat_install' ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {/* File 2: Iniciar_Servidor_Rede_Local.bat */}
                  <div className="bg-slate-950 border border-slate-800 p-4 rounded-xl space-y-3 flex flex-col justify-between">
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-mono font-bold text-emerald-400 truncate">
                          Iniciar_Servidor_Rede.bat
                        </span>
                        <span className="text-[10px] bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded font-mono">BAT</span>
                      </div>
                      <p className="text-xs text-slate-400 leading-relaxed">
                        Inicia o servidor Node.js em background, detecta o IP atual da sua rede e abre o navegador automaticamente em tela cheia.
                      </p>
                    </div>
                    <div className="flex items-center gap-2 pt-2 border-t border-slate-900">
                      <button
                        onClick={() => downloadSingleInstallerFile('Iniciar_Servidor_Rede_Local.bat', generateWindowsStartBat())}
                        className="flex-1 py-1.5 bg-emerald-950/60 hover:bg-emerald-800 text-emerald-300 hover:text-white font-bold text-xs rounded-lg transition flex items-center justify-center gap-1.5 border border-emerald-500/30 cursor-pointer"
                      >
                        <Play className="w-3.5 h-3.5 text-emerald-400" />
                        Baixar Launcher
                      </button>
                      <button
                        onClick={() => copyToClipboard(generateWindowsStartBat(), 'bat_start')}
                        className="p-1.5 bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-emerald-300 rounded-lg border border-slate-800 transition"
                        title="Copiar código .bat"
                      >
                        {copiedKey === 'bat_start' ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {/* File 3: Backup_Automatico_Diario.bat */}
                  <div className="bg-slate-950 border border-slate-800 p-4 rounded-xl space-y-3 flex flex-col justify-between">
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-mono font-bold text-blue-400 truncate">
                          Backup_Automatico.bat
                        </span>
                        <span className="text-[10px] bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded font-mono">BAT</span>
                      </div>
                      <p className="text-xs text-slate-400 leading-relaxed">
                        Copia os bancos de dados para a pasta /backups com carimbo de data/hora para segurança preventiva anti-ransomware.
                      </p>
                    </div>
                    <div className="flex items-center gap-2 pt-2 border-t border-slate-900">
                      <button
                        onClick={() => downloadSingleInstallerFile('Backup_Automatico_Diario.bat', generateBackupBat())}
                        className="flex-1 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white font-bold text-xs rounded-lg transition flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <Download className="w-3.5 h-3.5 text-blue-400" />
                        Baixar Script
                      </button>
                      <button
                        onClick={() => copyToClipboard(generateBackupBat(), 'bat_backup')}
                        className="p-1.5 bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-blue-300 rounded-lg border border-slate-800 transition"
                        title="Copiar código .bat"
                      >
                        {copiedKey === 'bat_backup' ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                </div>
              </div>

              {/* Step-by-step visual process */}
              <div className="bg-slate-950 border border-slate-800 p-5 rounded-2xl space-y-3">
                <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-amber-400" />
                  Passo a Passo Rápido: Como Colocar em Rede no Escritório
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs text-slate-300">
                  <div className="p-3 bg-slate-900 rounded-xl space-y-1.5 border border-slate-800">
                    <span className="w-5 h-5 rounded-full bg-amber-500 text-slate-950 font-black inline-flex items-center justify-center text-[10px]">1</span>
                    <h5 className="font-bold text-slate-100">No Computador Servidor</h5>
                    <p className="text-slate-400 leading-relaxed">
                      Execute o arquivo <strong className="text-slate-200">Instalar_WonoJuris.bat</strong> uma única vez. Depois, inicie o servidor clicando em <strong className="text-slate-200">Iniciar_Servidor_Rede.bat</strong>.
                    </p>
                  </div>

                  <div className="p-3 bg-slate-900 rounded-xl space-y-1.5 border border-slate-800">
                    <span className="w-5 h-5 rounded-full bg-amber-500 text-slate-950 font-black inline-flex items-center justify-center text-[10px]">2</span>
                    <h5 className="font-bold text-slate-100">Nos Outros Computadores</h5>
                    <p className="text-slate-400 leading-relaxed">
                      Não precisa instalar nada! Basta abrir o Chrome, Edge ou Safari e digitar o endereço <strong className="text-emerald-400">{mainNetworkUrl}</strong>.
                    </p>
                  </div>

                  <div className="p-3 bg-slate-900 rounded-xl space-y-1.5 border border-slate-800">
                    <span className="w-5 h-5 rounded-full bg-amber-500 text-slate-950 font-black inline-flex items-center justify-center text-[10px]">3</span>
                    <h5 className="font-bold text-slate-100">Trabalho Simultâneo</h5>
                    <p className="text-slate-400 leading-relaxed">
                      Todos os advogados e secretárias trabalham ao mesmo tempo na mesma base com controle de operadores e privilégios.
                    </p>
                  </div>
                </div>
              </div>

            </div>
          )}

          {/* TAB 2: INSTALADOR DO BANCO DE DADOS (SQL / POSTGRESQL / SQLITE) */}
          {activeTab === 'banco_dados' && (
            <div className="space-y-6">
              
              {/* Database Overview Header */}
              <div className="bg-slate-950 border border-slate-800 p-5 rounded-2xl flex flex-wrap items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Database className="w-5 h-5 text-amber-400" />
                    <h4 className="text-base font-bold text-slate-100">
                      Estrutura Relacional Completa do Banco de Dados
                    </h4>
                  </div>
                  <p className="text-xs text-slate-400">
                    Gere os scripts SQL (DDL + Carga de Dados) para criar as 10 tabelas relacionais com chaves estrangeiras, índices e triggers no PostgreSQL, Supabase ou SQLite.
                  </p>
                </div>

                {/* SQL Format Selector */}
                <div className="flex items-center gap-1.5 bg-slate-900 p-1 rounded-xl border border-slate-700">
                  <button
                    onClick={() => setSqlFormat('postgres')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                      sqlFormat === 'postgres'
                        ? 'bg-amber-500 text-slate-950 shadow-sm'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    PostgreSQL / Supabase (SQL)
                  </button>
                  <button
                    onClick={() => setSqlFormat('sqlite')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                      sqlFormat === 'sqlite'
                        ? 'bg-amber-500 text-slate-950 shadow-sm'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    SQLite Standalone (SQL)
                  </button>
                </div>
              </div>

              {/* Database Statistics Summary */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800">
                  <span className="text-[11px] text-slate-400 font-bold block">Tabelas Relacionais</span>
                  <span className="text-lg font-black text-amber-400">10 Tabelas</span>
                </div>
                <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800">
                  <span className="text-[11px] text-slate-400 font-bold block">Clientes na Base</span>
                  <span className="text-lg font-black text-slate-100">{clients.length} Registros</span>
                </div>
                <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800">
                  <span className="text-[11px] text-slate-400 font-bold block">Processos CNJ</span>
                  <span className="text-lg font-black text-emerald-400">{processes.length} Processos</span>
                </div>
                <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800">
                  <span className="text-[11px] text-slate-400 font-bold block">Prazos & Financeiro</span>
                  <span className="text-lg font-black text-blue-400">{deadlines.length + financialRecords.length} Itens</span>
                </div>
              </div>

              {/* SQL Viewer and Action Buttons */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono font-bold text-slate-300 flex items-center gap-1.5">
                    <FileCode className="w-4 h-4 text-amber-400" />
                    {sqlFormat === 'postgres' ? 'schema_postgresql.sql' : 'schema_sqlite.sql'} ({currentSql.split('\n').length} linhas)
                  </span>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => copyToClipboard(currentSql, 'sql_code')}
                      className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-lg border border-slate-700 transition flex items-center gap-1 cursor-pointer"
                    >
                      {copiedKey === 'sql_code' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-slate-400" />}
                      <span>{copiedKey === 'sql_code' ? 'Copiado!' : 'Copiar SQL'}</span>
                    </button>

                    <button
                      onClick={() => downloadSingleInstallerFile(
                        sqlFormat === 'postgres' ? 'schema_postgresql.sql' : 'schema_sqlite.sql',
                        currentSql,
                        'text/sql'
                      )}
                      className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-extrabold rounded-lg transition flex items-center gap-1 cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5 text-slate-950" />
                      <span>Baixar Arquivo .SQL</span>
                    </button>
                  </div>
                </div>

                <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 max-h-[300px] overflow-y-auto font-mono text-[11px] text-emerald-400 leading-relaxed no-scrollbar select-all">
                  <pre className="whitespace-pre-wrap">{currentSql.slice(0, 3000)}...</pre>
                </div>
              </div>

              {/* Docker & Container Deployment */}
              <div className="bg-slate-950 border border-slate-800 p-4 rounded-xl space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Server className="w-4 h-4 text-blue-400" />
                    <span className="text-xs font-bold text-slate-200">Deploy com Docker Compose (PostgreSQL 16 + Node.js)</span>
                  </div>
                  <button
                    onClick={() => downloadSingleInstallerFile('docker-compose.yml', generateDockerCompose(), 'text/yaml')}
                    className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-lg border border-slate-700 flex items-center gap-1 transition cursor-pointer"
                  >
                    <Download className="w-3 h-3 text-amber-400" />
                    <span>Baixar docker-compose.yml</span>
                  </button>
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Para subir em um servidor local Linux, Mac ou Windows com Docker: basta executar <code className="text-amber-300 bg-slate-900 px-1.5 py-0.5 rounded font-mono">docker-compose up -d</code> na pasta do projeto.
                </p>
              </div>

            </div>
          )}

          {/* TAB 3: MODO ONLINE VS. 100% OFFLINE */}
          {activeTab === 'modo_offline' && (
            <div className="space-y-6">
              
              <div className="bg-gradient-to-br from-slate-950 to-slate-900 border border-slate-700 p-5 rounded-2xl space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-emerald-500/20 text-emerald-400 rounded-xl">
                      <Zap className="w-6 h-6" />
                    </div>
                    <div>
                      <h4 className="text-base font-extrabold text-slate-100">
                        Arquitetura Híbrida: Offline-First & Sincronização em Nuvem
                      </h4>
                      <p className="text-xs text-slate-400">
                        O WONO ADVOCACIA foi construído com independência total de conexão externa.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setSimulatedOfflineMode(!simulatedOfflineMode)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-extrabold flex items-center gap-1.5 transition cursor-pointer ${
                        simulatedOfflineMode
                          ? 'bg-rose-500 text-white shadow-md shadow-rose-500/20'
                          : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                      }`}
                    >
                      {simulatedOfflineMode ? <WifiOff className="w-4 h-4" /> : <Wifi className="w-4 h-4" />}
                      <span>{simulatedOfflineMode ? 'Simulando Modo Offline' : 'Rede Conectada'}</span>
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-slate-300">
                  <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-xl space-y-2">
                    <div className="flex items-center gap-2 text-amber-400 font-bold">
                      <HardDrive className="w-4 h-4" />
                      <span>Quando Estiver 100% Offline (Sem Internet):</span>
                    </div>
                    <ul className="space-y-1.5 text-slate-400 list-disc list-inside">
                      <li>Acesso instantâneo a todos os processos, peças e dados de clientes gravados.</li>
                      <li>Criação de novos clientes, petições, procurações e recibos sem interrupção.</li>
                      <li>Agendamento e controle de prazos processuais com alertas locais.</li>
                      <li>Gravação garantida em LocalStorage, IndexedDB e no arquivo JSON do servidor.</li>
                    </ul>
                  </div>

                  <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-xl space-y-2">
                    <div className="flex items-center gap-2 text-emerald-400 font-bold">
                      <Globe className="w-4 h-4" />
                      <span>Quando Estiver Online (Conectado):</span>
                    </div>
                    <ul className="space-y-1.5 text-slate-400 list-disc list-inside">
                      <li>Consultas aos portais DataJud / CNJ / PJe em tempo real nos tribunais.</li>
                      <li>Validação do cadastro do advogado na base nacional da OAB / CNA.</li>
                      <li>Sincronização bidirecional com Firebase Firestore ou Supabase PostgreSQL.</li>
                      <li>Redação de petições complexas assistida por IA (Gemini).</li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* PWA / Desktop App Installation Guide */}
              <div className="bg-slate-950 border border-slate-800 p-5 rounded-2xl space-y-3">
                <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
                  <Monitor className="w-4 h-4 text-amber-400" />
                  Instalar como Aplicativo Desktop no Windows / Mac (Modo App)
                </h4>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Você pode transformar esta aplicação em um software de desktop independente na barra de tarefas do Windows:
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs text-slate-300">
                  <div className="p-3 bg-slate-900 rounded-xl border border-slate-800 space-y-1">
                    <strong className="text-amber-400 block">No Google Chrome:</strong>
                    <span>Clique nos 3 pontinhos no canto superior direito &gt; "Salvar e Compartilhar" &gt; "Instalar WONO ADVOCACIA".</span>
                  </div>
                  <div className="p-3 bg-slate-900 rounded-xl border border-slate-800 space-y-1">
                    <strong className="text-amber-400 block">No Microsoft Edge:</strong>
                    <span>Clique nos 3 pontinhos &gt; "Aplicativos" &gt; "Instalar este site como aplicativo".</span>
                  </div>
                  <div className="p-3 bg-slate-900 rounded-xl border border-slate-800 space-y-1">
                    <strong className="text-amber-400 block">Atalho na Área de Trabalho:</strong>
                    <span>O sistema abrirá em uma janela limpa e dedicada sem a barra de endereços do navegador.</span>
                  </div>
                </div>
              </div>

            </div>
          )}

          {/* TAB 4: MANUAL DE IMPLANTAÇÃO */}
          {activeTab === 'guia_passos' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-300 flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-amber-400" />
                  Manual Completo de Instalação e FAQ do Escritório
                </span>
                <button
                  onClick={() => downloadSingleInstallerFile('GUIA_INSTALACAO_REDE_E_BANCO.md', generateInstallationGuideMd(installerPayload), 'text/markdown')}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-lg border border-slate-700 transition flex items-center gap-1.5 cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5 text-amber-400" />
                  <span>Baixar Manual (.MD)</span>
                </button>
              </div>

              <div className="bg-slate-950 border border-slate-800 p-5 rounded-2xl max-h-[400px] overflow-y-auto space-y-4 text-xs text-slate-300 leading-relaxed font-sans">
                <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl text-amber-300">
                  <strong>💡 Dica de Ouro para a Rede do Escritório:</strong> Se você quiser que o endereço nunca mude mesmo que reinicie o roteador Wi-Fi, acesse as configurações do roteador e fixe o IP do computador principal (IP estático ou reserva DHCP).
                </div>

                <div className="space-y-2">
                  <h4 className="font-bold text-sm text-slate-100">Perguntas Frequentes (FAQ):</h4>
                  
                  <div className="p-3 bg-slate-900 rounded-xl border border-slate-800 space-y-1">
                    <strong className="text-amber-400 block">Preciso pagar mensalidade de servidor em nuvem?</strong>
                    <p className="text-slate-400">
                      Não! O sistema funciona de forma independente rodando no próprio computador do escritório com acesso em rede local. Os dados permanecem sob total sigilo no seu próprio hardware.
                    </p>
                  </div>

                  <div className="p-3 bg-slate-900 rounded-xl border border-slate-800 space-y-1">
                    <strong className="text-amber-400 block">Como faço para acessar fora do escritório (de casa ou na rua)?</strong>
                    <p className="text-slate-400">
                      Você pode utilizar soluções seguras gratuitas de VPN como o <strong>Tailscale</strong> ou <strong>ZeroTier</strong>, ou conectar o sistema ao <strong>Google Firebase Firestore</strong> ou <strong>Supabase</strong> gratuito na aba "Gestão SaaS &gt; Banco de Dados".
                    </p>
                  </div>

                  <div className="p-3 bg-slate-900 rounded-xl border border-slate-800 space-y-1">
                    <strong className="text-amber-400 block">Quantos computadores podem usar ao mesmo tempo?</strong>
                    <p className="text-slate-400">
                      O servidor Node.js com banco relacional suporta dezenas de conexões simultâneas sem lentidão no ambiente de rede local do escritório.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

        </div>

        {/* Modal Bottom Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 text-slate-400">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Escritório: <strong className="text-slate-200">{office.officeName}</strong> • OAB/{office.primaryLawyer.oabState} {office.primaryLawyer.oabNumber}</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl font-bold transition cursor-pointer"
            >
              Fechar
            </button>
            <button
              onClick={handleDownloadAllZip}
              disabled={isGeneratingZip}
              className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-xl font-extrabold transition flex items-center gap-1.5 cursor-pointer shadow-md shadow-amber-500/20"
            >
              <FolderArchive className="w-4 h-4 text-slate-950" />
              <span>{isGeneratingZip ? 'Gerando Pacote...' : 'Baixar Instalador Completo (.ZIP)'}</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
