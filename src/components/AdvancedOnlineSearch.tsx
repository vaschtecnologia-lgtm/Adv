import React, { useState, useMemo, useEffect } from 'react';
import {
  Search,
  Building2,
  Scale,
  User,
  ShieldAlert,
  Calendar,
  Clock,
  ExternalLink,
  Plus,
  CheckCircle2,
  Copy,
  Sparkles,
  Filter,
  FileText,
  Gavel,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Info,
  Check,
  Hash,
  CreditCard,
  HelpCircle,
  BookOpen,
  Sliders,
} from 'lucide-react';
import { 
  ALL_BRAZILIAN_COURTS, 
  FEATURED_COURTS, 
  identifyCourtFromCNJ,
  BrazilianCourt 
} from '../data/brazilianCourts';
import { LegalProcess, Client } from '../types';

interface AdvancedOnlineSearchProps {
  onImportProcess: (processData: any) => void;
  clients: Client[];
  onClose?: () => void;
}

type SearchMode = 'pje_official' | 'smart_detector';

export const AdvancedOnlineSearch: React.FC<AdvancedOnlineSearchProps> = ({
  onImportProcess,
  clients,
  onClose,
}) => {
  // Theme and search mode selection
  const [searchMode, setSearchMode] = useState<SearchMode>('pje_official');

  // Unified query states
  const [smartQuery, setSmartQuery] = useState('');
  
  // PJe Split CNJ States
  const [cnjSeq, setCnjSeq] = useState(''); // 7 digits
  const [cnjDig, setCnjDig] = useState(''); // 2 digits
  const [cnjAno, setCnjAno] = useState(''); // 4 digits
  const [cnjJus, setCnjJus] = useState('8'); // 1 digit (8 = Justiça Estadual por padrão)
  const [cnjTrib, setCnjTrib] = useState('07'); // 2 digits (07 = TJDFT por padrão)
  const [cnjOrg, setCnjOrg] = useState('0001'); // 4 digits (0001 = Brasília por padrão)

  const [useSplitCNJ, setUseSplitCNJ] = useState(true);
  const [cnjUnified, setCnjUnified] = useState('');

  // General Search Fields
  const [partyQuery, setPartyQuery] = useState('');
  const [partyPolo, setPartyPolo] = useState<'todos' | 'active' | 'passive'>('todos');
  const [lawyerQuery, setLawyerQuery] = useState('');
  const [lawyerOabNumber, setLawyerOabNumber] = useState('');
  const [lawyerOabState, setLawyerOabState] = useState('DF');
  
  // Court details
  const [selectedTribunal, setSelectedTribunal] = useState('TODOS');
  const [selectedInstancia, setSelectedInstancia] = useState('TODAS');
  const [selectedClasse, setSelectedClasse] = useState('TODAS');

  // Action status
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<any[] | null>(null);
  const [searchSource, setSearchSource] = useState<string>('PJe - Consulta Pública Nacional');
  const [copiedCnj, setCopiedCnj] = useState<string | null>(null);
  const [importedCnjList, setImportedCnjList] = useState<string[]>([]);

  // Detailed Modal Process Viewer simulation
  const [activeViewerProcess, setActiveViewerProcess] = useState<any | null>(null);
  const [activeViewerMovementIdx, setActiveViewerMovementIdx] = useState<number>(0);

  // Auto-focus logic for Split CNJ input fields (PJe traditional style)
  const handleCnjPartChange = (
    val: string,
    maxLength: number,
    nextId: string | null,
    prevId: string | null,
    setter: (v: string) => void
  ) => {
    const clean = val.replace(/\D/g, '').slice(0, maxLength);
    setter(clean);
    
    if (clean.length === maxLength && nextId) {
      document.getElementById(nextId)?.focus();
    }
  };

  // Keyboard navigation backspace support for split CNJ fields
  const handleKeyDownSplit = (e: React.KeyboardEvent<HTMLInputElement>, prevId: string | null) => {
    if (e.key === 'Backspace' && (e.currentTarget.value === '') && prevId) {
      document.getElementById(prevId)?.focus();
    }
  };

  // Synchronize Split CNJ to Unified Search string
  const currentConcatenatedCNJ = useMemo(() => {
    if (!cnjSeq && !cnjDig && !cnjAno && !cnjJus && !cnjTrib && !cnjOrg) return '';
    return `${cnjSeq.padStart(7, '0')}-${cnjDig.padStart(2, '0')}.${cnjAno.padStart(4, '0')}.${cnjJus || '0'}.${cnjTrib.padStart(2, '0')}.${cnjOrg.padStart(4, '0')}`;
  }, [cnjSeq, cnjDig, cnjAno, cnjJus, cnjTrib, cnjOrg]);

  // Unified auto-detection values for smart tab
  const smartDetection = useMemo(() => {
    const raw = smartQuery.trim();
    if (!raw) {
      return {
        type: 'empty',
        label: 'Aguardando termo',
        badgeColor: 'bg-slate-800 text-slate-400 border-slate-700',
        hint: 'Digite Nome da Parte, CPF, CNPJ, OAB ou Número CNJ para busca direta.',
      };
    }

    const digitsOnly = raw.replace(/\D/g, '');
    const detectedCourt = identifyCourtFromCNJ(raw);

    if (detectedCourt || (digitsOnly.length === 20) || (/^\d{7}-?\d{2}\.?\d{4}\.?\d\.?\d{2}\.?\d{4}$/.test(raw))) {
      return {
        type: 'cnj',
        label: detectedCourt ? `CNJ (${detectedCourt.sigla})` : 'Número CNJ Detectado',
        badgeColor: 'bg-blue-600/20 text-blue-300 border-blue-500/30',
        hint: detectedCourt ? `Tribunal Localizado: ${detectedCourt.name}` : 'Formato de Processo CNJ reconhecido.',
        court: detectedCourt?.sigla,
      };
    }

    if ((/^\d{3}\.?\d{3}\.?\d{3}-?\d{2}$/.test(raw)) || (digitsOnly.length === 11 && !/[a-zA-Z]/.test(raw))) {
      return {
        type: 'cpf',
        label: 'CPF',
        badgeColor: 'bg-emerald-600/20 text-emerald-300 border-emerald-500/30',
        hint: 'Localizando processos vinculados a este CPF físico.',
      };
    }

    if ((/^\d{2}\.?\d{3}\.?\d{3}\/?\d{4}-?\d{2}$/.test(raw)) || (digitsOnly.length === 14 && !/[a-zA-Z]/.test(raw))) {
      return {
        type: 'cnpj',
        label: 'CNPJ',
        badgeColor: 'bg-indigo-600/20 text-indigo-300 border-indigo-500/30',
        hint: 'Varredura jurídica em nome do CNPJ empresarial fornecido.',
      };
    }

    const oabMatch = raw.match(/oab/i) || (digitsOnly.length >= 3 && digitsOnly.length <= 6 && /\b[A-Z]{2}\b/i.test(raw));
    if (oabMatch) {
      const stateMatch = raw.match(/\b(AC|AL|AP|AM|BA|CE|DF|ES|GO|MA|MT|MS|MG|PA|PB|PR|PE|PI|RJ|RN|RS|RO|RR|SC|SP|SE|TO)\b/i);
      const state = stateMatch ? stateMatch[1].toUpperCase() : 'DF';
      return {
        type: 'oab',
        label: `Inscrição OAB/${state}`,
        badgeColor: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
        hint: `Consultando carteira profissional do advogado no estado de ${state}.`,
        state,
      };
    }

    return {
      type: 'name',
      label: 'Nome da Parte',
      badgeColor: 'bg-teal-500/20 text-teal-300 border-teal-500/30',
      hint: 'Busca nominal direta nos polos ativo e passivo do judiciário.',
    };
  }, [smartQuery]);

  const handleCopyCNJ = (cnj: string) => {
    navigator.clipboard.writeText(cnj);
    setCopiedCnj(cnj);
    setTimeout(() => setCopiedCnj(null), 2000);
  };

  const handleClearForm = () => {
    setCnjSeq('');
    setCnjDig('');
    setCnjAno('');
    setCnjJus('8');
    setCnjTrib('07');
    setCnjOrg('0001');
    setCnjUnified('');
    setPartyQuery('');
    setLawyerQuery('');
    setLawyerOabNumber('');
    setSmartQuery('');
    setSelectedTribunal('TODOS');
    setSelectedInstancia('TODAS');
    setSelectedClasse('TODAS');
    setSearchResults(null);
  };

  const handleSearch = async (e?: React.FormEvent, queryOverride?: string, tribunalOverride?: string) => {
    if (e) e.preventDefault();

    let queryParam = queryOverride || '';
    let searchTypeParam = 'cnj';
    let autoTribunal = tribunalOverride || selectedTribunal;

    if (!queryOverride) {
      if (searchMode === 'smart_detector') {
        if (!smartQuery.trim()) return;
        queryParam = smartQuery.trim();
        
        if (smartDetection.type === 'cnj') {
          searchTypeParam = 'cnj';
          if (smartDetection.court) autoTribunal = smartDetection.court;
        } else if (smartDetection.type === 'cpf' || smartDetection.type === 'cnpj' || smartDetection.type === 'name') {
          searchTypeParam = 'party';
        } else if (smartDetection.type === 'oab') {
          searchTypeParam = 'lawyer';
        }
      } else {
        // PJe mode checks values
        const hasCnjInput = useSplitCNJ ? (cnjSeq || cnjDig || cnjAno) : cnjUnified.trim();
        
        if (hasCnjInput) {
          queryParam = useSplitCNJ ? currentConcatenatedCNJ : cnjUnified.trim();
          searchTypeParam = 'cnj';
          const detected = identifyCourtFromCNJ(queryParam);
          if (detected && selectedTribunal === 'TODOS') {
            autoTribunal = detected.sigla;
          }
        } else if (partyQuery.trim()) {
          queryParam = partyQuery.trim();
          searchTypeParam = 'party';
        } else if (lawyerQuery.trim() || lawyerOabNumber.trim()) {
          queryParam = lawyerQuery.trim() || lawyerOabNumber.trim();
          searchTypeParam = 'lawyer';
        } else {
          // Fallback if empty search
          return;
        }
      }
    } else {
      // Determine searchTypeParam based on override pattern
      const digitsOnly = queryOverride.replace(/\D/g, '');
      const detectedCourt = identifyCourtFromCNJ(queryOverride);
      if (detectedCourt || (digitsOnly.length === 20) || (/^\d{7}-?\d{2}\.?\d{4}\.?\d\.?\d{2}\.?\d{4}$/.test(queryOverride))) {
        searchTypeParam = 'cnj';
        if (detectedCourt) autoTribunal = detectedCourt.sigla;
      } else if ((/^\d{3}\.?\d{3}\.?\d{3}-?\d{2}$/.test(queryOverride)) || (digitsOnly.length === 11) || (/^\d{2}\.?\d{3}\.?\d{3}\/?\d{4}-?\d{2}$/.test(queryOverride)) || digitsOnly.length === 14) {
        searchTypeParam = 'party';
      } else {
        searchTypeParam = 'party';
      }
    }

    setIsSearching(true);
    setSearchResults(null);
    setActiveViewerProcess(null);

    try {
      const url = new URL('/api/online-search', window.location.origin);
      url.searchParams.set('query', queryParam);
      url.searchParams.set('searchType', searchTypeParam);
      url.searchParams.set('tribunal', autoTribunal);
      url.searchParams.set('instancia', selectedInstancia);
      
      if (partyQuery.trim() && partyPolo !== 'todos' && !queryOverride) {
        url.searchParams.set('polo', partyPolo);
      }
      if ((lawyerQuery.trim() || lawyerOabNumber.trim()) && !queryOverride) {
        url.searchParams.set('advogado', lawyerQuery);
        url.searchParams.set('oabNumber', lawyerOabNumber);
        url.searchParams.set('oabState', lawyerOabState);
      }

      const res = await fetch(url.toString());
      const data = await res.json();
      
      setSearchResults(data.results || []);
      setSearchSource(data.source || 'PJe - Consulta Pública Nacional (DataJud)');
      
      // Auto open first process details in viewer if found
      if (data.results && data.results.length > 0) {
        setActiveViewerProcess(data.results[0]);
        setActiveViewerMovementIdx(0);
      }
    } catch (err) {
      console.error('Erro na consulta oficial ao PJe:', err);
    } finally {
      setIsSearching(false);
    }
  };

  // Auto load query from localStorage on mount (deep linked from other tabs)
  useEffect(() => {
    const storedQuery = localStorage.getItem('wono_search_cnj_query');
    if (storedQuery) {
      setUseSplitCNJ(false);
      setCnjUnified(storedQuery);
      setSmartQuery(storedQuery);
      setSearchMode('pje_official');
      
      const detected = identifyCourtFromCNJ(storedQuery);
      let sigla = 'TODOS';
      if (detected) {
        setSelectedTribunal(detected.sigla);
        sigla = detected.sigla;
      }
      
      // Auto trigger search
      handleSearch(undefined, storedQuery, sigla);
      
      // Clean up to prevent re-triggering
      localStorage.removeItem('wono_search_cnj_query');
    }
  }, []);

  const handleImportWithFeedback = (proc: any) => {
    onImportProcess(proc);
    setImportedCnjList((prev) => [...prev, proc.cnjNumber]);
  };

  // Auto pre-populate fields when preset clicked
  const handleLoadPreset = (cnj: string) => {
    setUseSplitCNJ(false);
    setCnjUnified(cnj);
    setSearchMode('pje_official');
    const detected = identifyCourtFromCNJ(cnj);
    if (detected) {
      setSelectedTribunal(detected.sigla);
    }
  };

  return (
    <div className="w-full space-y-6">
      
      {/* Search Layout Mode Selector Tab */}
      <div className="flex items-center justify-between bg-slate-900/60 p-1.5 rounded-2xl border border-slate-800">
        <span className="text-xs text-slate-400 font-bold px-3 flex items-center gap-1.5">
          <Sliders className="w-3.5 h-3.5 text-blue-400" />
          Formatação e Modelo de Busca:
        </span>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setSearchMode('pje_official')}
            className={`px-4 py-2 rounded-xl text-xs font-black transition-all duration-200 flex items-center gap-2 cursor-pointer ${
              searchMode === 'pje_official'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-950/40 border border-blue-500/50'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <Building2 className="w-3.5 h-3.5" />
            Portal PJe Oficial (Clonado)
          </button>
          <button
            type="button"
            onClick={() => setSearchMode('smart_detector')}
            className={`px-4 py-2 rounded-xl text-xs font-black transition-all duration-200 flex items-center gap-2 cursor-pointer ${
              searchMode === 'smart_detector'
                ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-950/40 border border-amber-400/50'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            Busca Inteligente Inteligência Artificial
          </button>
        </div>
      </div>

      {/* ============================================== */}
      {/* CLONE OF THE OFFICIAL PJE PORTAL INTERFACE     */}
      {/* ============================================== */}
      {searchMode === 'pje_official' ? (
        <div id="pje-portal-container" className="bg-[#f0f2f5] border-2 border-slate-300 rounded-2xl overflow-hidden shadow-2xl text-slate-800">
          
          {/* Official PJe Blue Header */}
          <div className="bg-[#003366] text-white p-4 flex flex-col md:flex-row items-center justify-between gap-4 border-b-4 border-[#e2b13c]">
            <div className="flex items-center gap-3.5">
              {/* Brazilian coat of arms SVG (Brazilian Crest) */}
              <div className="bg-white/10 p-1.5 rounded-full border border-white/20 shrink-0">
                <svg viewBox="0 0 512 512" className="w-11 h-11">
                  <path d="M256,40 L290,140 L395,140 L310,205 L345,305 L256,240 L167,305 L202,205 L117,140 L222,140 Z" fill="#EAB308" stroke="#1E3A8A" strokeWidth="4"/>
                  <circle cx="256" cy="180" r="32" fill="#1E3A8A" stroke="#FFFFFF" strokeWidth="2"/>
                  <circle cx="256" cy="165" r="3" fill="#FFFFFF"/>
                  <circle cx="256" cy="195" r="3" fill="#FFFFFF"/>
                  <circle cx="241" cy="180" r="3" fill="#FFFFFF"/>
                  <circle cx="271" cy="180" r="3" fill="#FFFFFF"/>
                  <circle cx="266" cy="190" r="2.5" fill="#FFFFFF"/>
                  <path d="M190,260 C160,200 160,120 190,80" stroke="#10B981" strokeWidth="8" fill="none" strokeLinecap="round"/>
                  <path d="M322,260 C352,200 352,120 322,80" stroke="#10B981" strokeWidth="8" fill="none" strokeLinecap="round"/>
                  <circle cx="256" cy="180" r="50" fill="none" stroke="#EAB308" strokeWidth="3" strokeDasharray="5,3"/>
                  <path d="M140,320 L372,320 L350,350 L162,350 Z" fill="#1E3A8A" stroke="#FFFFFF" strokeWidth="1.5"/>
                  <text x="256" y="340" fill="#EAB308" fontSize="11" fontWeight="bold" textAnchor="middle">REPUBLICA FEDERATIVA DO BRASIL</text>
                  <text x="256" y="362" fill="#94A3B8" fontSize="8" fontWeight="bold" textAnchor="middle">15 de Novembro de 1889</text>
                </svg>
              </div>
              
              <div className="space-y-0.5 text-center md:text-left">
                <span className="text-[10px] sm:text-xs font-black tracking-widest text-[#e2b13c] block">
                  PODER JUDICIÁRIO BRASILEIRO
                </span>
                <h1 className="text-lg sm:text-xl font-extrabold flex items-center justify-center md:justify-start gap-1.5 leading-none">
                  PJe <span className="font-light text-slate-300">| Processo Judicial Eletrônico</span>
                </h1>
                <span className="text-xs text-blue-200 block font-semibold">
                  Consulta Pública Unificada de Processos Físicos e Digitais
                </span>
              </div>
            </div>

            {/* Production indicator badge */}
            <div className="text-center md:text-right space-y-1">
              <div className="inline-flex items-center gap-1.5 bg-emerald-950/50 border border-emerald-500/30 text-emerald-300 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                Servidor de Produção Ativo
              </div>
              <p className="text-[10px] text-blue-200 font-mono">Versão Oficial PJe: v2.4.1.3 - CNJ</p>
            </div>
          </div>

          {/* Legal Notice Banner */}
          <div className="bg-[#fff3cd] border-b border-[#ffeeba] text-[#856404] px-4 py-2.5 text-[11px] leading-normal font-semibold flex items-start gap-2">
            <Info className="w-4 h-4 shrink-0 text-amber-600 mt-0.5" />
            <div>
              <strong>Atenção:</strong> De acordo com a Resolução nº 121 do CNJ, o acesso público exibe dados básicos e movimentações de ações não protegidas por Segredo de Justiça. Os documentos oficiais anexos e peças processuais íntegras requerem assinatura eletrônica do advogado constituído com certificado digital OAB.
            </div>
          </div>

          {/* PJe Form Body */}
          <div className="p-4 sm:p-6 bg-white space-y-6">
            
            <form onSubmit={handleSearch} className="space-y-4">
              
              {/* Field 1: Número do Processo Grid (Official 6 Box Splitting or single input toggle) */}
              <div className="bg-slate-50 border border-slate-300 rounded-xl p-4 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 pb-2">
                  <span className="text-xs font-bold text-[#003366] flex items-center gap-1">
                    <Hash className="w-4 h-4" />
                    NÚMERO DO PROCESSO (PADRÃO CNJ DA RESOLUÇÃO 65)
                  </span>

                  <button
                    type="button"
                    onClick={() => {
                      setUseSplitCNJ(!useSplitCNJ);
                      handleClearForm();
                    }}
                    className="text-[11px] font-bold text-blue-700 hover:underline flex items-center gap-1"
                  >
                    {useSplitCNJ ? "Alternar para campo único (copiar/colar)" : "Alternar para caixas individuais (PJe padrão)"}
                  </button>
                </div>

                {useSplitCNJ ? (
                  /* Split Boxes layout with automatic focus shifting and labels */
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-1.5 font-mono">
                      
      // Seq (7)
                      <div className="space-y-1">
                        <span className="text-[9px] font-bold text-slate-500 uppercase block">Sequencial</span>
                        <input
                          id="cnj-seq"
                          type="text"
                          value={cnjSeq}
                          maxLength={7}
                          onChange={(e) => handleCnjPartChange(e.target.value, 7, 'cnj-dig', null, setCnjSeq)}
                          placeholder="0000000"
                          className="w-[85px] px-2 py-2 text-center bg-white border border-slate-400 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 rounded text-sm text-slate-900 font-extrabold shadow-inner"
                        />
                      </div>

                      <span className="text-slate-500 font-bold self-end mb-2">-</span>

                      {/* Digito (2) */}
                      <div className="space-y-1">
                        <span className="text-[9px] font-bold text-slate-500 uppercase block">Dígito</span>
                        <input
                          id="cnj-dig"
                          type="text"
                          value={cnjDig}
                          maxLength={2}
                          onChange={(e) => handleCnjPartChange(e.target.value, 2, 'cnj-ano', 'cnj-seq', setCnjDig)}
                          onKeyDown={(e) => handleKeyDownSplit(e, 'cnj-seq')}
                          placeholder="00"
                          className="w-[45px] px-2 py-2 text-center bg-white border border-slate-400 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 rounded text-sm text-slate-900 font-extrabold shadow-inner"
                        />
                      </div>

                      <span className="text-slate-500 font-bold self-end mb-2">.</span>

                      {/* Ano (4) */}
                      <div className="space-y-1">
                        <span className="text-[9px] font-bold text-slate-500 uppercase block">Ano</span>
                        <input
                          id="cnj-ano"
                          type="text"
                          value={cnjAno}
                          maxLength={4}
                          onChange={(e) => handleCnjPartChange(e.target.value, 4, 'cnj-jus', 'cnj-dig', setCnjAno)}
                          onKeyDown={(e) => handleKeyDownSplit(e, 'cnj-dig')}
                          placeholder="2024"
                          className="w-[60px] px-2 py-2 text-center bg-white border border-slate-400 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 rounded text-sm text-slate-900 font-extrabold shadow-inner"
                        />
                      </div>

                      <span className="text-slate-500 font-bold self-end mb-2">.</span>

                      {/* Justiça (1) */}
                      <div className="space-y-1">
                        <span className="text-[9px] font-bold text-slate-500 uppercase block">Jus</span>
                        <input
                          id="cnj-jus"
                          type="text"
                          value={cnjJus}
                          maxLength={1}
                          onChange={(e) => handleCnjPartChange(e.target.value, 1, 'cnj-trib', 'cnj-ano', setCnjJus)}
                          onKeyDown={(e) => handleKeyDownSplit(e, 'cnj-ano')}
                          placeholder="8"
                          className="w-[35px] px-2 py-2 text-center bg-white border border-slate-400 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 rounded text-sm text-slate-900 font-extrabold shadow-inner"
                        />
                      </div>

                      <span className="text-slate-500 font-bold self-end mb-2">.</span>

                      {/* Tribunal (2) */}
                      <div className="space-y-1">
                        <span className="text-[9px] font-bold text-slate-500 uppercase block">Trib</span>
                        <input
                          id="cnj-trib"
                          type="text"
                          value={cnjTrib}
                          maxLength={2}
                          onChange={(e) => handleCnjPartChange(e.target.value, 2, 'cnj-org', 'cnj-jus', setCnjTrib)}
                          onKeyDown={(e) => handleKeyDownSplit(e, 'cnj-jus')}
                          placeholder="07"
                          className="w-[45px] px-2 py-2 text-center bg-white border border-slate-400 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 rounded text-sm text-slate-900 font-extrabold shadow-inner"
                        />
                      </div>

                      <span className="text-slate-500 font-bold self-end mb-2">.</span>

                      {/* Org (4) */}
                      <div className="space-y-1">
                        <span className="text-[9px] font-bold text-slate-500 uppercase block">Foro / Origem</span>
                        <input
                          id="cnj-org"
                          type="text"
                          value={cnjOrg}
                          maxLength={4}
                          onChange={(e) => handleCnjPartChange(e.target.value, 4, null, 'cnj-trib', setCnjOrg)}
                          onKeyDown={(e) => handleKeyDownSplit(e, 'cnj-trib')}
                          placeholder="0001"
                          className="w-[60px] px-2 py-2 text-center bg-white border border-slate-400 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 rounded text-sm text-slate-900 font-extrabold shadow-inner"
                        />
                      </div>

                    </div>
                    {currentConcatenatedCNJ && (
                      <p className="text-[10px] text-slate-500 font-mono">
                        Consulta formatada: <strong className="text-blue-800 font-bold">{currentConcatenatedCNJ}</strong>
                      </p>
                    )}
                  </div>
                ) : (
                  /* Single unified input */
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold text-slate-500 block uppercase">Insira o número completo com hífens e pontos:</span>
                    <input
                      type="text"
                      value={cnjUnified}
                      onChange={(e) => setCnjUnified(e.target.value)}
                      placeholder="Ex: 0708912-44.2024.8.07.0001"
                      className="w-full sm:w-80 px-3 py-2 bg-white border border-slate-400 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 rounded text-sm text-slate-900 font-mono font-bold"
                    />
                  </div>
                )}
              </div>

              {/* Field 2: Nome da Parte, OAB, CPF/CNPJ Grid */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                
                {/* Nome Parte */}
                <div className="md:col-span-4 space-y-1">
                  <label className="text-[11px] font-bold text-[#003366] block uppercase">
                    Nome da Parte (Autor / Réu)
                  </label>
                  <input
                    type="text"
                    value={partyQuery}
                    onChange={(e) => setPartyQuery(e.target.value)}
                    placeholder="Nome completo ou termo empresarial..."
                    className="w-full px-3 py-2 bg-white border border-slate-400 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 rounded text-sm text-slate-900 font-medium"
                  />
                </div>

                {/* Polo */}
                <div className="md:col-span-2 space-y-1">
                  <label className="text-[11px] font-bold text-[#003366] block uppercase">
                    Polo da Parte
                  </label>
                  <select
                    value={partyPolo}
                    onChange={(e: any) => setPartyPolo(e.target.value)}
                    className="w-full px-2 py-2 bg-white border border-slate-400 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 rounded text-sm text-slate-900 font-medium cursor-pointer"
                  >
                    <option value="todos">Todos</option>
                    <option value="active">Polo Ativo (Autor)</option>
                    <option value="passive">Polo Passivo (Réu)</option>
                  </select>
                </div>

                {/* Advogado ou OAB */}
                <div className="md:col-span-3 space-y-1">
                  <label className="text-[11px] font-bold text-[#003366] block uppercase">
                    Nome do Advogado
                  </label>
                  <input
                    type="text"
                    value={lawyerQuery}
                    onChange={(e) => setLawyerQuery(e.target.value)}
                    placeholder="Ex: Dr. Vagner Schmidt..."
                    className="w-full px-3 py-2 bg-white border border-slate-400 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 rounded text-sm text-slate-900 font-medium"
                  />
                </div>

                {/* OAB Número + Estado */}
                <div className="md:col-span-3 space-y-1">
                  <label className="text-[11px] font-bold text-[#003366] block uppercase">
                    Inscrição OAB
                  </label>
                  <div className="flex gap-1.5">
                    <input
                      type="text"
                      value={lawyerOabNumber}
                      onChange={(e) => setLawyerOabNumber(e.target.value)}
                      placeholder="Ex: 55432"
                      className="w-full px-3 py-2 bg-white border border-slate-400 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 rounded text-sm text-slate-900 font-mono font-bold"
                    />
                    <select
                      value={lawyerOabState}
                      onChange={(e) => setLawyerOabState(e.target.value)}
                      className="px-2 py-2 bg-white border border-slate-400 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 rounded text-sm text-slate-900 font-bold cursor-pointer"
                    >
                      {['AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO'].map(state => (
                        <option key={state} value={state}>{state}</option>
                      ))}
                    </select>
                  </div>
                </div>

              </div>

              {/* Field 3: Tribunal Selector and Instancia */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 border-t border-slate-200 pt-3">
                
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-[#003366] block uppercase">
                    Tribunal Julgador / Seção
                  </label>
                  <select
                    value={selectedTribunal}
                    onChange={(e) => setSelectedTribunal(e.target.value)}
                    className="w-full px-2 py-2 bg-white border border-slate-400 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 rounded text-sm text-slate-900 font-semibold cursor-pointer"
                  >
                    <option value="TODOS">🌐 Todos os Tribunais (Abrangência Nacional)</option>
                    <option value="TJDFT">TJDFT - Distrito Federal e Territórios</option>
                    <option value="TRF1">TRF1 - Tribunal Regional Federal 1ª Região</option>
                    <option value="TRT10">TRT10 - Tribunal Regional do Trabalho 10ª Região</option>
                    <option value="STJ">STJ - Superior Tribunal de Justiça</option>
                    <option value="STF">STF - Supremo Tribunal Federal</option>
                    <option value="TST">TST - Tribunal Superior do Trabalho</option>
                    <option value="TJSP">TJSP - Tribunal de Justiça de São Paulo</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-[#003366] block uppercase">
                    Grau / Instância Jurisdicional
                  </label>
                  <select
                    value={selectedInstancia}
                    onChange={(e) => setSelectedInstancia(e.target.value)}
                    className="w-full px-2 py-2 bg-white border border-slate-400 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 rounded text-sm text-slate-900 font-semibold cursor-pointer"
                  >
                    <option value="TODAS">Qualquer Grau</option>
                    <option value="1ª Instância">1º Grau - Juízes de Primeira Instância</option>
                    <option value="2ª Instância">2º Grau - Desembargadores e Tribunais</option>
                    <option value="Tribunal Superior">Instância Especial - Tribunais Superiores</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-[#003366] block uppercase">
                    Classe Judicial / Procedimento
                  </label>
                  <select
                    value={selectedClasse}
                    onChange={(e) => setSelectedClasse(e.target.value)}
                    className="w-full px-2 py-2 bg-white border border-slate-400 focus:border-blue-600 focus:ring-1 focus:ring-blue-600 rounded text-sm text-slate-900 font-semibold cursor-pointer"
                  >
                    <option value="TODAS">Todas as Classes</option>
                    <option value="CIVEL">Procedimento Comum Cível</option>
                    <option value="TRABALHISTA">Ação Trabalhista (Rito Ordinário)</option>
                    <option value="MANDADO_SEGURANCA">Mandado de Segurança</option>
                    <option value="EXECUCAO">Execução de Título Extrajudicial</option>
                    <option value="APELACAO">Apelação Cível</option>
                  </select>
                </div>

              </div>

              {/* Presets in PJe Toolbar Style */}
              <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-slate-100 text-[11px]">
                <span className="text-slate-500 font-bold flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5 text-amber-500" /> Presets PJe de Simulação:
                </span>
                <button
                  type="button"
                  onClick={() => handleLoadPreset('0708912-44.2024.8.07.0001')}
                  className="px-2 py-0.5 bg-slate-100 hover:bg-slate-200 border border-slate-300 text-[#003366] font-bold rounded cursor-pointer"
                >
                  TJDFT: 0708912-44.2024
                </button>
                <button
                  type="button"
                  onClick={() => handleLoadPreset('1004523-88.2023.4.01.3400')}
                  className="px-2 py-0.5 bg-slate-100 hover:bg-slate-200 border border-slate-300 text-[#003366] font-bold rounded cursor-pointer"
                >
                  TRF1: 1004523-88.2023
                </button>
                <button
                  type="button"
                  onClick={() => handleLoadPreset('0000412-90.2024.5.10.0015')}
                  className="px-2 py-0.5 bg-slate-100 hover:bg-slate-200 border border-slate-300 text-[#003366] font-bold rounded cursor-pointer"
                >
                  TRT10: 0000412-90.2024
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSearchMode('pje_official');
                    setPartyQuery('Carlos Eduardo Silveira');
                    setSelectedTribunal('TJDFT');
                  }}
                  className="px-2 py-0.5 bg-slate-100 hover:bg-slate-200 border border-slate-300 text-[#003366] font-bold rounded cursor-pointer"
                >
                  Parte: Carlos Eduardo Silveira
                </button>
              </div>

              {/* Action Buttons Section (PJe style) */}
              <div className="flex items-center justify-between pt-4 border-t-2 border-[#003366]/20">
                <span className="text-[11px] text-slate-500 leading-none">
                  A criptografia SSL e o barramento do DataJud certificam o tráfego desta consulta pública.
                </span>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleClearForm}
                    className="px-4 py-2.5 bg-white hover:bg-slate-100 border border-slate-400 text-slate-700 font-bold text-xs rounded transition cursor-pointer"
                  >
                    Limpar Formulário
                  </button>
                  <button
                    type="submit"
                    disabled={isSearching}
                    className="px-6 py-2.5 bg-[#003366] hover:bg-[#002244] disabled:bg-slate-400 text-white font-black text-xs rounded transition flex items-center gap-2 cursor-pointer shadow shadow-[#003366]/35 uppercase tracking-wider"
                  >
                    {isSearching ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Processando busca PJe...
                      </>
                    ) : (
                      <>
                        <Search className="w-3.5 h-3.5" /> Pesquisar Processos
                      </>
                    )}
                  </button>
                </div>
              </div>

            </form>

          </div>

        </div>
      ) : (
        /* ============================================== */
        /* SMART UNIVERSAL DETECTOR MODE (SYSTEM ORIGINAL)*/
        /* ============================================== */
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-6 shadow-xl space-y-5 text-slate-100">
          <div className="flex items-center gap-3 border-b border-slate-800 pb-4">
            <span className="p-2 bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded-xl">
              <Sparkles className="w-5 h-5" />
            </span>
            <div>
              <h2 className="text-base sm:text-lg font-black text-slate-100 flex items-center gap-2">
                Consulta Inteligente com Inteligência Artificial
              </h2>
              <p className="text-xs text-slate-400">
                Um único campo de busca. Nosso mecanismo interpreta automaticamente se o dado é CPF, CNPJ, OAB, Nome ou CNJ.
              </p>
            </div>
          </div>

          <form onSubmit={handleSearch} className="space-y-4">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-300">
                  Campo de Busca Universal:
                </label>
                {smartQuery.trim() && (
                  <span className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold border flex items-center gap-1 ${smartDetection.badgeColor}`}>
                    {smartDetection.label}
                  </span>
                )}
              </div>

              <div className="relative">
                <Search className="w-4 h-4 text-amber-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={smartQuery}
                  onChange={(e) => setSmartQuery(e.target.value)}
                  placeholder="Ex: Carlos Eduardo Silveira, 284.912.388-44, OAB/DF 55432 ou 0708912-44.2024.8.07.0001..."
                  className="w-full pl-10 pr-4 py-3 bg-slate-950 border border-slate-700 focus:border-amber-500 rounded-xl text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
                />
              </div>

              <p className="text-[11px] text-slate-400 flex items-center gap-1">
                <Info className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                {smartDetection.hint}
              </p>
            </div>

            <div className="flex items-center justify-end pt-2">
              <button
                type="submit"
                disabled={isSearching || !smartQuery.trim()}
                className="px-6 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs uppercase tracking-wider rounded-xl transition flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {isSearching ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Consultando IA...
                  </>
                ) : (
                  <>
                    <Search className="w-3.5 h-3.5" /> Executar Varredura
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ============================================== */}
      {/* SEARCH RESULTS PANEL & PJE SYSTEM TABLE CLONE  */}
      {/* ============================================== */}
      {searchResults && (
        <div id="pje-results-container" className="bg-[#f8f9fa] border border-slate-300 rounded-2xl p-4 sm:p-5 text-slate-800 space-y-4 shadow-xl">
          
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-300 pb-3">
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded bg-blue-100 text-[#003366] border border-blue-200">
                <BookOpen className="w-4 h-4" />
              </span>
              <div>
                <h3 className="text-sm font-black text-[#003366] flex items-center gap-1.5">
                  Resultados Localizados ({searchResults.length})
                </h3>
                <p className="text-[10px] text-slate-500">
                  Origem dos Dados: <span className="text-blue-800 font-bold">{searchSource}</span>
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setSearchResults(null)}
              className="text-xs text-blue-700 hover:underline font-bold"
            >
              Limpar Busca
            </button>
          </div>

          {searchResults.length === 0 ? (
            <div className="py-12 text-center text-slate-500 space-y-2 border border-dashed border-slate-300 rounded-xl bg-white">
              <ShieldAlert className="w-10 h-10 text-amber-600/70 mx-auto" />
              <p className="text-xs font-bold text-slate-700">Nenhum processo foi localizado com as informações inseridas.</p>
              <p className="text-[11px]">Verifique a comarca, número da OAB do patrono ou os dígitos do CNJ.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
              
              {/* Left Column: PJe Process Table (Columns: Processo, Classe, Partes, Ações) (7 Cols) */}
              <div className="lg:col-span-6 space-y-2.5">
                <span className="text-[10px] font-extrabold text-slate-500 block uppercase">
                  Selecione um processo abaixo para abrir no visualizador oficial PJe:
                </span>
                
                <div className="space-y-2.5 max-h-[500px] overflow-y-auto pr-1">
                  {searchResults.map((proc, idx) => {
                    const isSelectedInViewer = activeViewerProcess?.cnjNumber === proc.cnjNumber;
                    const isAlreadyImported = importedCnjList.includes(proc.cnjNumber);

                    return (
                      <div
                        key={idx}
                        onClick={() => {
                          setActiveViewerProcess(proc);
                          setActiveViewerMovementIdx(0);
                        }}
                        className={`p-3.5 rounded-xl border text-left transition cursor-pointer flex flex-col justify-between gap-3 ${
                          isSelectedInViewer
                            ? 'bg-blue-50/70 border-blue-600 shadow-md ring-1 ring-blue-600/30'
                            : 'bg-white border-slate-300 hover:border-slate-400'
                        }`}
                      >
                        {/* Process Number & Court Badge */}
                        <div className="flex flex-wrap items-center justify-between gap-1.5">
                          <span className="font-mono font-black text-blue-900 text-xs sm:text-sm flex items-center gap-1">
                            <span className="text-[10px] px-1.5 py-0.2 rounded bg-blue-100 text-[#003366] border border-blue-300">PJe</span>
                            {proc.cnjNumber}
                          </span>

                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200 font-bold">
                            {proc.sigla || 'TJDFT'}
                          </span>
                        </div>

                        {/* Partes (Ativo/Passivo) formatted exactly like PJe table row */}
                        <div className="text-[11px] bg-slate-50 p-2.5 rounded border border-slate-200 space-y-1">
                          <p className="truncate text-slate-700">
                            <span className="text-[9px] font-extrabold px-1 py-0.1 bg-emerald-100 text-emerald-800 rounded border border-emerald-300 mr-1">AUTOR</span>
                            <strong>{proc.activeParty}</strong>
                          </p>
                          <p className="truncate text-slate-700">
                            <span className="text-[9px] font-extrabold px-1 py-0.1 bg-rose-100 text-rose-800 rounded border border-rose-300 mr-1">RÉU</span>
                            <strong>{proc.passiveParty}</strong>
                          </p>
                        </div>

                        {/* Sub-info: Class/Subject */}
                        <p className="text-[10px] text-slate-500 truncate">
                          <strong>Classe:</strong> {proc.lawsuitType} • <strong>Comarca:</strong> {proc.comarca}
                        </p>

                        {/* Action Bar inside item */}
                        <div className="flex items-center justify-between border-t border-slate-200/80 pt-2 text-[10px]" onClick={e => e.stopPropagation()}>
                          <span className="text-slate-400 font-semibold">
                            Distribuição: {new Date(proc.distributionDate + 'T12:00:00').toLocaleDateString('pt-BR')}
                          </span>

                          <button
                            type="button"
                            disabled={isAlreadyImported}
                            onClick={() => handleImportWithFeedback(proc)}
                            className={`px-2.5 py-1 text-[10px] font-extrabold rounded flex items-center gap-1 transition-all duration-150 cursor-pointer ${
                              isAlreadyImported
                                ? 'bg-emerald-100 text-emerald-700 border border-emerald-400/50'
                                : 'bg-[#e2b13c] hover:bg-[#cfa12f] text-slate-900 border border-[#b88c22]'
                            }`}
                          >
                            {isAlreadyImported ? (
                              <>
                                <Check className="w-3 h-3 text-emerald-600" /> Importado
                              </>
                            ) : (
                              <>
                                <Plus className="w-3 h-3" /> Importar para o Escritório
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>

              </div>

              {/* Right Column: Full PJe Virtual Document and Autos Timeline (5 Cols) */}
              <div className="lg:col-span-6">
                {activeViewerProcess ? (
                  <div className="bg-white border-2 border-slate-300 rounded-xl overflow-hidden shadow-md flex flex-col h-[538px]">
                    
                    {/* Header PJe Viewer */}
                    <div className="bg-[#002244] text-white p-3 border-b-2 border-[#e2b13c] flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Scale className="w-4 h-4 text-amber-400" />
                        <div>
                          <h4 className="text-xs font-black">Visualizador PJe de Autos Judiciais</h4>
                          <p className="text-[9px] font-mono text-blue-200">{activeViewerProcess.cnjNumber}</p>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleCopyCNJ(activeViewerProcess.cnjNumber)}
                        className="p-1 hover:bg-white/10 rounded transition text-blue-200 hover:text-white"
                        title="Copiar número do processo"
                      >
                        {copiedCnj === activeViewerProcess.cnjNumber ? (
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>

                    {/* Split viewer screen layout */}
                    <div className="grid grid-cols-12 flex-1 overflow-hidden">
                      
                      {/* Left: Movements list (Width 4/12) */}
                      <div className="col-span-5 border-r border-slate-300 bg-slate-50 flex flex-col h-full overflow-hidden">
                        <span className="p-2 bg-slate-200 text-[10px] font-black text-slate-700 uppercase border-b border-slate-300 block">
                          📑 Peças & Despachos
                        </span>
                        
                        <div className="flex-1 overflow-y-auto divide-y divide-slate-200">
                          {activeViewerProcess.movements?.map((mov: any, mIdx: number) => {
                            const isSelectedMov = activeViewerMovementIdx === mIdx;
                            return (
                              <button
                                key={mIdx}
                                type="button"
                                onClick={() => setActiveViewerMovementIdx(mIdx)}
                                className={`w-full p-2.5 text-left transition flex flex-col gap-1 ${
                                  isSelectedMov
                                    ? 'bg-blue-100/70 border-l-4 border-blue-700'
                                    : 'hover:bg-slate-100'
                                }`}
                              >
                                <div className="flex items-center justify-between w-full text-[9px] text-slate-500 font-bold">
                                  <span>{new Date(mov.date).toLocaleDateString('pt-BR')}</span>
                                  {mov.isJudicialDecision && (
                                    <span className="px-1 bg-amber-100 text-amber-800 rounded font-black border border-amber-300 uppercase scale-90">
                                      Decisão
                                    </span>
                                  )}
                                </div>
                                <h5 className="text-[10px] font-black text-slate-700 line-clamp-1 leading-tight">
                                  {mov.title}
                                </h5>
                                <p className="text-[9px] text-slate-500 line-clamp-1">
                                  {mov.description}
                                </p>
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Right: Document preview (Width 8/12) */}
                      <div className="col-span-7 bg-[#f4f4f4] p-3 overflow-y-auto flex flex-col h-full">
                        
                        {/* Legal Document Sheet Paper */}
                        <div className="bg-white border border-slate-300 p-5 rounded shadow-sm flex-1 font-serif text-slate-900 flex flex-col justify-between text-[11px] leading-relaxed text-justify space-y-4">
                          
                          {/* Heading stamp */}
                          <div className="border-b border-slate-300 pb-2 text-center font-sans space-y-0.5 not-italic text-slate-800 shrink-0">
                            <span className="text-[8px] tracking-wider font-extrabold text-blue-900 block">PODER JUDICIÁRIO DE BRASÍLIA</span>
                            <span className="text-[9px] font-extrabold block uppercase">{activeViewerProcess.court?.split('-')[0]}</span>
                            <span className="text-[8px] font-medium text-slate-500 block">{activeViewerProcess.branchVara || "Juízo de Direito Oficial"}</span>
                            <span className="text-[8px] font-mono text-slate-500 block">Autos Digitais nº {activeViewerProcess.cnjNumber}</span>
                          </div>

                          {/* Subject details */}
                          <div className="text-[9px] font-sans text-slate-600 bg-slate-50 p-2 rounded border border-slate-200 space-y-0.5 shrink-0">
                            <p><strong>Rito:</strong> {activeViewerProcess.lawsuitType}</p>
                            <p><strong>Autor:</strong> {activeViewerProcess.activeParty}</p>
                            <p><strong>Réu:</strong> {activeViewerProcess.passiveParty}</p>
                            {activeViewerProcess.value && (
                              <p><strong>Valor da Causa:</strong> R$ {new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2 }).format(activeViewerProcess.value)}</p>
                            )}
                          </div>

                          {/* Selected movement text body */}
                          <div className="flex-1 space-y-2 py-1">
                            <h4 className="font-sans font-bold text-[11px] uppercase tracking-wide text-center text-slate-800 border-b border-dashed border-slate-200 pb-1">
                              {activeViewerProcess.movements?.[activeViewerMovementIdx]?.title || "Movimento Processual"}
                            </h4>

                            <p className="indent-6 leading-relaxed">
                              {activeViewerProcess.movements?.[activeViewerMovementIdx]?.description || "Sem descrição disponível."}
                            </p>

                            {activeViewerProcess.movements?.[activeViewerMovementIdx]?.deadlineDays && (
                              <div className="font-sans text-[9px] text-[#856404] bg-[#fff3cd] border border-[#ffeeba] p-2 rounded mt-3">
                                ⚖️ <strong>ALERTA DE PRAZO:</strong> Identificado prazo de <strong>{activeViewerProcess.movements?.[activeViewerMovementIdx]?.deadlineDays} dias {activeViewerProcess.movements?.[activeViewerMovementIdx]?.deadlineType || "úteis"}</strong> para manifestação nos autos.
                              </div>
                            )}
                          </div>

                          {/* Cryptographic sign */}
                          <div className="border-t border-slate-300 pt-2 font-sans text-[8px] text-slate-500 text-center space-y-1 shrink-0">
                            <div className="bg-emerald-50 text-emerald-800 border border-emerald-300 p-1 rounded font-mono inline-block">
                              🔒 ASSINADO ELETRONICAMENTE POR MAGISTRADO NOS TERMOS DA LEI 11.419
                            </div>
                            <p className="font-mono text-[7px] text-slate-400">Código de Validação: {Math.random().toString(36).substring(2, 10).toUpperCase()}-{Math.random().toString(36).substring(2, 10).toUpperCase()}</p>
                          </div>

                        </div>

                      </div>

                    </div>

                    {/* Bottom Viewer Action bar */}
                    <div className="bg-slate-100 p-2.5 border-t border-slate-300 flex items-center justify-between shrink-0">
                      <span className="text-[10px] text-slate-500 font-bold">
                        Padrão Judiciário Brasileiro
                      </span>

                      <button
                        type="button"
                        onClick={() => handleImportWithFeedback(activeViewerProcess)}
                        className={`px-4 py-1.5 text-xs font-black rounded transition-all duration-150 cursor-pointer ${
                          importedCnjList.includes(activeViewerProcess.cnjNumber)
                            ? 'bg-emerald-100 text-emerald-700 border border-emerald-300'
                            : 'bg-blue-700 hover:bg-blue-800 text-white border border-blue-800 shadow'
                        }`}
                      >
                        {importedCnjList.includes(activeViewerProcess.cnjNumber) ? (
                          <>
                            ✓ Processo Importado com Sucesso
                          </>
                        ) : (
                          <>
                            Importar Tudo Para o Wono Advocacia
                          </>
                        )}
                      </button>
                    </div>

                  </div>
                ) : (
                  <div className="bg-white border border-slate-300 rounded-xl p-8 text-center text-slate-400 flex flex-col items-center justify-center h-[538px]">
                    <Scale className="w-12 h-12 text-slate-300 mb-2" />
                    <p className="text-xs font-bold text-slate-600">Selecione um processo à esquerda.</p>
                    <p className="text-[10px]">A tela abrirá o visualizador completo de autos públicos de forma simulada.</p>
                  </div>
                )}
              </div>

            </div>
          )}

        </div>
      )}

    </div>
  );
};
