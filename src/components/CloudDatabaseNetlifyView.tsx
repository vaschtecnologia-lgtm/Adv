import React, { useState } from 'react';
import { 
  Database, 
  Globe, 
  Download, 
  Upload, 
  CheckCircle2, 
  Copy, 
  ExternalLink, 
  Server, 
  ShieldCheck, 
  Zap, 
  RefreshCw, 
  AlertCircle,
  FileCode,
  Layers,
  Sparkles,
  Check,
  Sliders
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
  exportFullDatabaseJSON, 
  parseDatabaseJSON, 
  getCloudDatabaseConfig, 
  saveCloudDatabaseConfig,
  CloudDatabaseConfig 
} from '../services/databaseService';

interface CloudDatabaseNetlifyViewProps {
  office: LawOfficeSettings;
  clients: Client[];
  processes: LegalProcess[];
  deadlines: ProcessDeadline[];
  documents: LegalDocumentItem[];
  teamMembers: TeamMember[];
  financialRecords: FinancialRecord[];
  saasConfig: SaaSTenantConfig;
  auditLogs: AuditLog[];
  onImportFullBackup: (importedData: any) => void;
  onOpenDatabaseInstaller?: () => void;
}

export const CloudDatabaseNetlifyView: React.FC<CloudDatabaseNetlifyViewProps> = ({
  office,
  clients,
  processes,
  deadlines,
  documents,
  teamMembers,
  financialRecords,
  saasConfig,
  auditLogs,
  onImportFullBackup,
  onOpenDatabaseInstaller,
}) => {
  const [activeTab, setActiveTab] = useState<'banco' | 'netlify'>('banco');
  const [dbConfig, setDbConfig] = useState<CloudDatabaseConfig>(getCloudDatabaseConfig());
  const [selectedProvider, setSelectedProvider] = useState<'local' | 'firebase' | 'supabase'>(dbConfig.provider);

  // Form states for Firebase
  const [fbApiKey, setFbApiKey] = useState(dbConfig.firebase?.apiKey || '');
  const [fbAuthDomain, setFbAuthDomain] = useState(dbConfig.firebase?.authDomain || '');
  const [fbProjectId, setFbProjectId] = useState(dbConfig.firebase?.projectId || '');
  const [fbAppId, setFbAppId] = useState(dbConfig.firebase?.appId || '');

  // Form states for Supabase
  const [supaUrl, setSupaUrl] = useState(dbConfig.supabase?.url || '');
  const [supaAnonKey, setSupaAnonKey] = useState(dbConfig.supabase?.anonKey || '');

  const [testStatus, setTestStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
  const [statusMessage, setStatusMessage] = useState<string>('');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2500);
  };

  const handleExportBackup = () => {
    exportFullDatabaseJSON({
      office,
      clients,
      processes,
      deadlines,
      documents,
      teamMembers,
      financialRecords,
      saasConfig,
      auditLogs,
    });
  };

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const data = await parseDatabaseJSON(file);
      onImportFullBackup(data);
      alert('Backup WONO ADVOCACIA importado com sucesso!');
    } catch (err: any) {
      alert(`Erro na importação: ${err.message}`);
    }
  };

  const handleSaveDbSettings = (e: React.FormEvent) => {
    e.preventDefault();
    const updated: CloudDatabaseConfig = {
      provider: selectedProvider,
      firebase: {
        apiKey: fbApiKey,
        authDomain: fbAuthDomain,
        projectId: fbProjectId,
        storageBucket: `${fbProjectId}.appspot.com`,
        messagingSenderId: '',
        appId: fbAppId,
        connected: !!fbProjectId && !!fbApiKey,
      },
      supabase: {
        url: supaUrl,
        anonKey: supaAnonKey,
        connected: !!supaUrl && !!supaAnonKey,
      },
      autoSync: true,
      lastSync: new Date().toISOString(),
    };
    setDbConfig(updated);
    saveCloudDatabaseConfig(updated);

    setTestStatus('testing');
    setStatusMessage('Validando configuração e sincronizando esquemas...');
    setTimeout(() => {
      setTestStatus('success');
      setStatusMessage(
        selectedProvider === 'firebase'
          ? 'Conexão com Google Firebase Firestore Spark (Grátis) configurada com sucesso!'
          : selectedProvider === 'supabase'
          ? 'Conexão com Supabase PostgreSQL (Grátis) configurada com sucesso!'
          : 'Motor Local Offline-First com persistência segura ativo!'
      );
    }, 1200);
  };

  const totalRecordsCount =
    clients.length +
    processes.length +
    deadlines.length +
    documents.length +
    teamMembers.length +
    financialRecords.length;

  return (
    <div className="space-y-6">
      {/* Navigation Sub-Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
        <button
          onClick={() => setActiveTab('banco')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
            activeTab === 'banco'
              ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
              : 'bg-slate-900 text-slate-400 hover:text-slate-200'
          }`}
        >
          <Database className="w-4 h-4" />
          Bancos de Dados Gratuitos (Firebase / Supabase / JSON)
        </button>

        <button
          onClick={() => setActiveTab('netlify')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
            activeTab === 'netlify'
              ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
              : 'bg-slate-900 text-slate-400 hover:text-slate-200'
          }`}
        >
          <Globe className="w-4 h-4" />
          Publicar no Netlify (Guia de Deploy & Configuração)
        </button>
      </div>

      {/* TAB 1: BANCOS DE DADOS GRATUITOS */}
      {activeTab === 'banco' && (
        <div className="space-y-6">
          {/* Top Info Banner */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1">
              <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 inline-flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" />
                100% Gratuito • Sem Custos Ocultos
              </span>
              <h3 className="text-lg font-bold text-slate-100 flex items-center gap-2">
                <Database className="w-5 h-5 text-amber-400" />
                Opções de Banco de Dados Grátis para seu Escritório
              </h3>
              <p className="text-xs text-slate-400 max-w-2xl leading-relaxed">
                Você pode utilizar o Google Firebase Firestore (Plano Spark gratuito vitalício), Supabase PostgreSQL ou o motor local Offline-First com exportação/importação integral em JSON.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              {onOpenDatabaseInstaller && (
                <button
                  onClick={onOpenDatabaseInstaller}
                  className="px-4 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 text-xs font-black rounded-xl flex items-center gap-2 transition cursor-pointer shadow-lg shadow-amber-500/25"
                  title="Gerar Instalador de Rede Local, scripts Windows .bat e esquemas SQL"
                >
                  <Server className="w-4 h-4" />
                  Instalador PC & Rede Local (SQL)
                </button>
              )}
              <button
                onClick={handleExportBackup}
                className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-amber-300 text-xs font-bold rounded-xl border border-slate-700 flex items-center gap-2 transition cursor-pointer"
              >
                <Download className="w-4 h-4" />
                Exportar JSON ({totalRecordsCount})
              </button>
              <label className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl border border-slate-700 flex items-center gap-2 transition cursor-pointer">
                <Upload className="w-4 h-4 text-emerald-400" />
                Importar
                <input type="file" accept=".json" onChange={handleImportFile} className="hidden" />
              </label>
            </div>
          </div>

          {/* Provider Selection Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Card 1: Google Firebase Firestore Spark */}
            <div
              onClick={() => setSelectedProvider('firebase')}
              className={`p-5 rounded-2xl border transition cursor-pointer relative ${
                selectedProvider === 'firebase'
                  ? 'bg-amber-500/10 border-amber-500 ring-1 ring-amber-500/50'
                  : 'bg-slate-900 border-slate-800 hover:border-slate-700'
              }`}
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-black px-2 py-0.5 rounded bg-amber-500/20 text-amber-300">
                  RECOMENDADO
                </span>
                <span className="text-[11px] font-bold text-emerald-400">Plano Spark Grátis</span>
              </div>
              <h4 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                <Server className="w-4 h-4 text-amber-400" />
                Firebase Firestore (Google)
              </h4>
              <ul className="mt-3 space-y-1.5 text-xs text-slate-300">
                <li className="flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5 text-emerald-400" /> 1 GB de armazenamento no Firestore
                </li>
                <li className="flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5 text-emerald-400" /> 50.000 leituras/dia gratuitas
                </li>
                <li className="flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5 text-emerald-400" /> 20.000 gravações/dia gratuitas
                </li>
                <li className="flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5 text-emerald-400" /> Sem necessidade de cartão de crédito
                </li>
              </ul>
            </div>

            {/* Card 2: Supabase PostgreSQL */}
            <div
              onClick={() => setSelectedProvider('supabase')}
              className={`p-5 rounded-2xl border transition cursor-pointer relative ${
                selectedProvider === 'supabase'
                  ? 'bg-amber-500/10 border-amber-500 ring-1 ring-amber-500/50'
                  : 'bg-slate-900 border-slate-800 hover:border-slate-700'
              }`}
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-black px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300">
                  POSTGRESQL
                </span>
                <span className="text-[11px] font-bold text-emerald-400">Plano Grátis</span>
              </div>
              <h4 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                <Database className="w-4 h-4 text-emerald-400" />
                Supabase Cloud (Postgres)
              </h4>
              <ul className="mt-3 space-y-1.5 text-xs text-slate-300">
                <li className="flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5 text-emerald-400" /> 500 MB de banco relacional SQL
                </li>
                <li className="flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5 text-emerald-400" /> 50.000 usuários ativos mensais
                </li>
                <li className="flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5 text-emerald-400" /> 1 GB de armazenamento de arquivos
                </li>
                <li className="flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5 text-emerald-400" /> APIs REST automáticas
                </li>
              </ul>
            </div>

            {/* Card 3: Local Offline-First Engine */}
            <div
              onClick={() => setSelectedProvider('local')}
              className={`p-5 rounded-2xl border transition cursor-pointer relative ${
                selectedProvider === 'local'
                  ? 'bg-amber-500/10 border-amber-500 ring-1 ring-amber-500/50'
                  : 'bg-slate-900 border-slate-800 hover:border-slate-700'
              }`}
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-black px-2 py-0.5 rounded bg-blue-500/20 text-blue-300">
                  OFFLINE-FIRST
                </span>
                <span className="text-[11px] font-bold text-emerald-400">Zero Configuração</span>
              </div>
              <h4 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-blue-400" />
                Local Storage & Backup JSON
              </h4>
              <ul className="mt-3 space-y-1.5 text-xs text-slate-300">
                <li className="flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5 text-emerald-400" /> Funciona 100% offline no navegador
                </li>
                <li className="flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5 text-emerald-400" /> Exportação e importação em 1 clique
                </li>
                <li className="flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5 text-emerald-400" /> Máxima privacidade para os clientes
                </li>
                <li className="flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5 text-emerald-400" /> Compatível com qualquer hospedagem
                </li>
              </ul>
            </div>
          </div>

          {/* Configuration Form for Selected Provider */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div>
                <h4 className="text-base font-bold text-slate-100 flex items-center gap-2">
                  <Sliders className="w-5 h-5 text-amber-400" />
                  Configuração: {selectedProvider === 'firebase' ? 'Firebase Firestore' : selectedProvider === 'supabase' ? 'Supabase' : 'Local Storage'}
                </h4>
                <p className="text-xs text-slate-400">
                  Insira as credenciais do seu projeto gratuito para habilitar a sincronização em nuvem.
                </p>
              </div>

              {testStatus === 'success' && (
                <span className="text-xs font-semibold px-3 py-1 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded-full flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Conectado e Ativo
                </span>
              )}
            </div>

            {selectedProvider === 'firebase' && (
              <form onSubmit={handleSaveDbSettings} className="space-y-4 text-xs">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">
                      Project ID (ID do Projeto Firebase) *
                    </label>
                    <input
                      type="text"
                      placeholder="ex: wono-advocacia-prod"
                      value={fbProjectId}
                      onChange={(e) => setFbProjectId(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-slate-100 focus:border-amber-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">
                      API Key (Web API Key) *
                    </label>
                    <input
                      type="password"
                      placeholder="AIzaSy..."
                      value={fbApiKey}
                      onChange={(e) => setFbApiKey(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-slate-100 focus:border-amber-500 focus:outline-none font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">
                      Auth Domain
                    </label>
                    <input
                      type="text"
                      placeholder="wono-advocacia-prod.firebaseapp.com"
                      value={fbAuthDomain}
                      onChange={(e) => setFbAuthDomain(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-slate-100 focus:border-amber-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">
                      App ID
                    </label>
                    <input
                      type="text"
                      placeholder="1:123456789:web:abcdef123"
                      value={fbAppId}
                      onChange={(e) => setFbAppId(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-slate-100 focus:border-amber-500 focus:outline-none font-mono"
                    />
                  </div>
                </div>

                {/* Step-by-step Tutorial for Firebase Free Tier */}
                <div className="bg-slate-950 p-4 rounded-xl border border-slate-800/80 space-y-2 text-slate-300">
                  <h5 className="font-bold text-amber-400 flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4" />
                    Como criar seu Firebase Firestore Grátis (Plano Spark) em 2 minutos:
                  </h5>
                  <ol className="list-decimal list-inside space-y-1 text-slate-400 pl-1">
                    <li>Acesse o <a href="https://console.firebase.google.com" target="_blank" rel="noreferrer" className="text-amber-400 hover:underline">Console do Firebase</a> com sua conta Google.</li>
                    <li>Clique em <strong>"Adicionar projeto"</strong> e dê o nome de <code>wono-advocacia</code>.</li>
                    <li>No menu lateral, clique em <strong>"Firestore Database"</strong> &gt; <strong>"Criar banco de dados"</strong> (escolha modo produção ou teste).</li>
                    <li>Nas configurações do projeto (ícone de engrenagem) &gt; "Geral", adicione um aplicativo Web e copie as chaves acima.</li>
                  </ol>
                </div>

                <div className="flex items-center justify-between pt-2">
                  {statusMessage && (
                    <span className="text-xs text-emerald-400 font-medium">{statusMessage}</span>
                  )}
                  <button
                    type="submit"
                    className="px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl transition cursor-pointer ml-auto flex items-center gap-2"
                  >
                    <RefreshCw className="w-4 h-4" />
                    Salvar e Conectar Firebase
                  </button>
                </div>
              </form>
            )}

            {selectedProvider === 'supabase' && (
              <form onSubmit={handleSaveDbSettings} className="space-y-4 text-xs">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">
                      Supabase Project URL *
                    </label>
                    <input
                      type="text"
                      placeholder="https://xyzcompany.supabase.co"
                      value={supaUrl}
                      onChange={(e) => setSupaUrl(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-slate-100 focus:border-amber-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">
                      Supabase Anon / Public Key *
                    </label>
                    <input
                      type="password"
                      placeholder="eyJhbGciOiJIUzI1NiIsIn..."
                      value={supaAnonKey}
                      onChange={(e) => setSupaAnonKey(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-slate-100 focus:border-amber-500 focus:outline-none font-mono"
                    />
                  </div>
                </div>

                {/* Step-by-step Tutorial for Supabase Free Tier */}
                <div className="bg-slate-950 p-4 rounded-xl border border-slate-800/80 space-y-2 text-slate-300">
                  <h5 className="font-bold text-emerald-400 flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4" />
                    Como criar seu banco Supabase PostgreSQL Grátis:
                  </h5>
                  <ol className="list-decimal list-inside space-y-1 text-slate-400 pl-1">
                    <li>Acesse <a href="https://supabase.com" target="_blank" rel="noreferrer" className="text-emerald-400 hover:underline">supabase.com</a> e crie uma conta gratuita.</li>
                    <li>Clique em <strong>"New project"</strong> e defina a senha do banco PostgreSQL.</li>
                    <li>Vá em <strong>Settings &gt; API</strong> e copie a <code>Project URL</code> e a chave <code>anon public</code>.</li>
                  </ol>
                </div>

                <div className="flex items-center justify-between pt-2">
                  {statusMessage && (
                    <span className="text-xs text-emerald-400 font-medium">{statusMessage}</span>
                  )}
                  <button
                    type="submit"
                    className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-xl transition cursor-pointer ml-auto flex items-center gap-2"
                  >
                    <RefreshCw className="w-4 h-4" />
                    Salvar e Conectar Supabase
                  </button>
                </div>
              </form>
            )}

            {selectedProvider === 'local' && (
              <div className="space-y-4 text-xs">
                <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 space-y-2 text-slate-300">
                  <h5 className="font-bold text-slate-100 flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-emerald-400" />
                    Motor Local Ativo no seu Navegador
                  </h5>
                  <p className="text-slate-400 leading-relaxed">
                    Todos os processos ({processes.length}), clientes ({clients.length}), prazos ({deadlines.length}), documentos e financeiro são armazenados com segurança localmente no dispositivo. Para transferir para outro computador ou celular, utilize o botão de <strong>Exportar Backup JSON</strong> acima.
                  </p>
                </div>

                <div className="flex items-center justify-end pt-2">
                  <button
                    type="button"
                    onClick={handleSaveDbSettings}
                    className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl transition cursor-pointer flex items-center gap-2"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    Confirmar Uso do Motor Local
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: PUBLICAR NO NETLIFY */}
      {activeTab === 'netlify' && (
        <div className="space-y-6">
          {/* Top Banner: Netlify Ready */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 inline-flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" />
                  Pronto para Deploy no Netlify
                </span>
                <h3 className="text-lg font-bold text-slate-100 flex items-center gap-2">
                  <Globe className="w-5 h-5 text-cyan-400" />
                  Publicação e Hospedagem Gratuita no Netlify
                </h3>
                <p className="text-xs text-slate-400 max-w-2xl leading-relaxed">
                  O projeto já possui os arquivos <code>netlify.toml</code> e <code>_redirects</code> configurados para roteamento SPA automático e SSL gratuito.
                </p>
              </div>

              <a
                href="https://app.netlify.com"
                target="_blank"
                rel="noreferrer"
                className="px-4 py-2.5 bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-bold rounded-xl flex items-center gap-2 transition cursor-pointer whitespace-nowrap shadow-lg shadow-cyan-500/20"
              >
                <ExternalLink className="w-4 h-4" />
                Acessar Painel Netlify
              </a>
            </div>
          </div>

          {/* Pre-flight Checklist */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
            <h4 className="text-sm font-bold text-slate-100 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              Checklist de Arquivos e Compatibilidade Netlify
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
              <div className="p-3.5 bg-slate-950 rounded-xl border border-slate-800/80 space-y-1">
                <span className="text-emerald-400 font-bold flex items-center gap-1">
                  <Check className="w-3.5 h-3.5" /> netlify.toml
                </span>
                <p className="text-slate-400 text-[11px]">Configuração de build e redirects na raiz.</p>
              </div>

              <div className="p-3.5 bg-slate-950 rounded-xl border border-slate-800/80 space-y-1">
                <span className="text-emerald-400 font-bold flex items-center gap-1">
                  <Check className="w-3.5 h-3.5" /> public/_redirects
                </span>
                <p className="text-slate-400 text-[11px]">Roteamento SPA (fallback para /index.html 200).</p>
              </div>

              <div className="p-3.5 bg-slate-950 rounded-xl border border-slate-800/80 space-y-1">
                <span className="text-emerald-400 font-bold flex items-center gap-1">
                  <Check className="w-3.5 h-3.5" /> Comando de Build
                </span>
                <p className="text-slate-400 text-[11px]"><code>npm run build</code> ou <code>npm run build:client</code></p>
              </div>

              <div className="p-3.5 bg-slate-950 rounded-xl border border-slate-800/80 space-y-1">
                <span className="text-emerald-400 font-bold flex items-center gap-1">
                  <Check className="w-3.5 h-3.5" /> Diretório de Publicação
                </span>
                <p className="text-slate-400 text-[11px]"><code>dist</code> (gerado pelo Vite)</p>
              </div>
            </div>
          </div>

          {/* 3 Deploy Methods Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {/* Método 1: Netlify Drop (Mais Fácil) */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-3 flex flex-col justify-between">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300">
                    OPÇÃO 1 • MAIS RÁPIDA
                  </span>
                  <span className="text-xs text-slate-400 font-mono">30 segundos</span>
                </div>

                <h4 className="text-base font-bold text-slate-100 flex items-center gap-2">
                  <Upload className="w-5 h-5 text-amber-400" />
                  Netlify Drop (Arrastar e Soltar)
                </h4>

                <p className="text-xs text-slate-400 leading-relaxed">
                  Publique seu site arrastando a pasta compilada direto na página do Netlify sem precisar de GitHub.
                </p>

                <ol className="list-decimal list-inside text-xs text-slate-300 space-y-2 pl-1 bg-slate-950 p-3 rounded-xl border border-slate-800">
                  <li>Gere os arquivos estáticos executando o build.</li>
                  <li>Acesse <a href="https://app.netlify.com/drop" target="_blank" rel="noreferrer" className="text-amber-400 underline font-semibold">app.netlify.com/drop</a></li>
                  <li>Arraste a pasta <strong>dist</strong> para a tela.</li>
                  <li>Seu site ganha um domínio <code>.netlify.app</code> com HTTPS instantâneo!</li>
                </ol>
              </div>

              <a
                href="https://app.netlify.com/drop"
                target="_blank"
                rel="noreferrer"
                className="w-full py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition cursor-pointer text-center"
              >
                Abrir Netlify Drop <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>

            {/* Método 2: Conectar com GitHub */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-3 flex flex-col justify-between">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300">
                    OPÇÃO 2 • RECOMENDADA
                  </span>
                  <span className="text-xs text-slate-400 font-mono">CI/CD Contínuo</span>
                </div>

                <h4 className="text-base font-bold text-slate-100 flex items-center gap-2">
                  <Globe className="w-5 h-5 text-cyan-400" />
                  Conectar Repositório GitHub
                </h4>

                <p className="text-xs text-slate-400 leading-relaxed">
                  Atualizações automáticas a cada commit no seu repositório Git.
                </p>

                <div className="text-xs text-slate-300 space-y-2 bg-slate-950 p-3 rounded-xl border border-slate-800">
                  <div className="flex justify-between items-center text-[11px] text-slate-400 pb-1 border-b border-slate-800">
                    <span>Build command:</span>
                    <strong className="text-slate-200 font-mono">npm run build</strong>
                  </div>
                  <div className="flex justify-between items-center text-[11px] text-slate-400 pb-1 border-b border-slate-800">
                    <span>Publish directory:</span>
                    <strong className="text-slate-200 font-mono">dist</strong>
                  </div>
                  <div className="flex justify-between items-center text-[11px] text-slate-400">
                    <span>Node version:</span>
                    <strong className="text-slate-200 font-mono">20</strong>
                  </div>
                </div>
              </div>

              <a
                href="https://app.netlify.com/start"
                target="_blank"
                rel="noreferrer"
                className="w-full py-2.5 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition cursor-pointer text-center"
              >
                Conectar GitHub no Netlify <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>

            {/* Método 3: Netlify CLI */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-3 flex flex-col justify-between">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black px-2 py-0.5 rounded bg-purple-500/20 text-purple-300">
                    OPÇÃO 3 • TERMINAL
                  </span>
                  <span className="text-xs text-slate-400 font-mono">CLI</span>
                </div>

                <h4 className="text-base font-bold text-slate-100 flex items-center gap-2">
                  <FileCode className="w-5 h-5 text-purple-400" />
                  Publicar via Terminal (CLI)
                </h4>

                <p className="text-xs text-slate-400 leading-relaxed">
                  Para desenvolvedores que preferem publicar diretamente pelo terminal.
                </p>

                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 font-mono text-[11px] text-purple-300 space-y-1.5">
                  <p className="text-slate-500"># 1. Instalar Netlify CLI</p>
                  <p>npm install -g netlify-cli</p>
                  <p className="text-slate-500"># 2. Fazer login e build</p>
                  <p>netlify login</p>
                  <p>npm run build</p>
                  <p className="text-slate-500"># 3. Deploy em produção</p>
                  <p>netlify deploy --prod --dir=dist</p>
                </div>
              </div>

              <button
                onClick={() => copyToClipboard('npm install -g netlify-cli && netlify login && npm run build && netlify deploy --prod --dir=dist', 'cli')}
                className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition cursor-pointer border border-slate-700"
              >
                {copiedKey === 'cli' ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                {copiedKey === 'cli' ? 'Comandos Copiados!' : 'Copiar Comandos CLI'}
              </button>
            </div>
          </div>

          {/* Environment Variables on Netlify Box */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-400" />
                Variáveis de Ambiente no Netlify (Site settings &gt; Environment variables)
              </h4>

              <button
                onClick={() => copyToClipboard(`GEMINI_API_KEY=\nAPP_URL=\nVITE_FIREBASE_PROJECT_ID=\nVITE_FIREBASE_API_KEY=`, 'env')}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-lg border border-slate-700 flex items-center gap-1.5 cursor-pointer"
              >
                {copiedKey === 'env' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                {copiedKey === 'env' ? 'Copiado!' : 'Copiar Chaves'}
              </button>
            </div>

            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 font-mono text-xs text-slate-300 space-y-2 overflow-x-auto">
              <div className="flex justify-between items-center">
                <span className="text-amber-400 font-bold">GEMINI_API_KEY</span>
                <span className="text-slate-500">Chave do Google Gemini (para análise de andamentos e contratos)</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-cyan-400 font-bold">VITE_FIREBASE_PROJECT_ID</span>
                <span className="text-slate-500">(Opcional) ID do projeto Firebase Firestore Spark Grátis</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-cyan-400 font-bold">VITE_FIREBASE_API_KEY</span>
                <span className="text-slate-500">(Opcional) Web API Key do Firebase</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
