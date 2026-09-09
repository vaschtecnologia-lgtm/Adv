import React, { useState, useMemo, useEffect } from 'react';
import { 
  Search, 
  RefreshCw, 
  Scale, 
  Calendar, 
  Sparkles, 
  Plus, 
  Building, 
  User, 
  Clock, 
  AlertCircle, 
  CheckCircle, 
  MessageSquare, 
  FileText, 
  ChevronRight, 
  ExternalLink,
  Filter,
  DollarSign,
  Briefcase,
  SlidersHorizontal,
  FileSpreadsheet,
  Edit3,
  Trash2,
  Copy,
  Check,
  BookOpen,
  Eye,
  Gavel,
  Radio,
  Layers,
  Users,
  Zap,
  CheckSquare,
  Square,
  ArrowRight,
  ShieldCheck,
  AlertTriangle,
  Download,
  Building2,
  BookmarkCheck,
  RotateCw,
  Calculator,
  Brain,
  TrendingUp,
  TrendingDown
} from 'lucide-react';
import { LegalProcess, ProcessMovement, Client, ProcessDeadline, LawOfficeSettings, TeamMember, LegalDocumentItem } from '../types';
import { formatCurrencyBRL, generateSubstabelecimentoText } from '../utils/documentGenerator';
import { CourtCostsCalculator } from './CourtCostsCalculator';
import { AdvancedOnlineSearch } from './AdvancedOnlineSearch';

export const classifyMovementTendencyLocal = (title: string, description: string): 'Positiva' | 'Negativa' | 'Neutra' => {
  const combined = `${title} ${description}`.toLowerCase();
  if (
    combined.includes("deferido") || 
    combined.includes("concedido") || 
    combined.includes("procedente") || 
    combined.includes("provido") || 
    combined.includes("segurança concedida") || 
    combined.includes("liminar deferida") || 
    combined.includes("tutela de urgência para determinar") ||
    combined.includes("provisória de urgência") ||
    combined.includes("êxito") ||
    combined.includes("favorável")
  ) {
    return "Positiva";
  }
  if (
    combined.includes("indeferido") || 
    combined.includes("negado") || 
    combined.includes("improcedente") || 
    combined.includes("rejeitado") || 
    combined.includes("extinto sem resolução") ||
    combined.includes("penhora") ||
    combined.includes("multa") ||
    combined.includes("inadimplemento") ||
    combined.includes("desfavorable") ||
    combined.includes("desfavorável")
  ) {
    return "Negativa";
  }
  return "Neutra";
};

interface ProcessesAndamentosViewProps {
  processes: LegalProcess[];
  clients: Client[];
  office?: LawOfficeSettings;
  teamMembers?: TeamMember[];
  selectedProcessId: string | null;
  onSelectProcessId: (id: string | null) => void;
  onAddProcess: (process: LegalProcess) => void;
  onBulkImportProcesses?: (processes: LegalProcess[], newClients?: Client[], newDeadlines?: ProcessDeadline[]) => void;
  onUpdateProcess: (process: LegalProcess) => void;
  onDeleteProcess: (id: string) => void;
  onAddMovement: (processId: string, movement: ProcessMovement) => void;
  onDeleteMovement: (processId: string, movementId: string) => void;
  onAddDeadlineToAgenda: (deadline: Omit<ProcessDeadline, 'id'>) => void;
  onOpenDocumentGeneratorForProcess: (process: LegalProcess) => void;
  onOpenDeclaracaoGeneratorForProcess?: (process: LegalProcess) => void;
  onAddDocument?: (doc: LegalDocumentItem) => void;
  onAddTeamMember?: (member: Omit<TeamMember, 'id' | 'createdAt'>) => void;
  deadlines?: ProcessDeadline[];
  onUpdateDeadline?: (deadline: ProcessDeadline) => void;
  activeUser?: any;
}

export const ProcessesAndamentosView: React.FC<ProcessesAndamentosViewProps> = ({
  processes,
  clients,
  office,
  teamMembers,
  selectedProcessId,
  onSelectProcessId,
  onAddProcess,
  onBulkImportProcesses,
  onUpdateProcess,
  onDeleteProcess,
  onAddMovement,
  onDeleteMovement,
  onAddDeadlineToAgenda,
  onOpenDocumentGeneratorForProcess,
  onOpenDeclaracaoGeneratorForProcess,
  onAddDocument,
  onAddTeamMember,
  deadlines,
  onUpdateDeadline,
  activeUser,
}) => {
  // Main view mode: 'feed' (all movements & publications), 'process' (by process), 'search' (datajud online search), 'oab_sync' (batch OAB sync), 'calculator' (costs calculator)
  const [viewMode, setViewMode] = useState<'feed' | 'process' | 'search' | 'oab_sync' | 'calculator'>('feed');

  const handleDeepLinkSearch = (cnj: string) => {
    localStorage.setItem('wono_search_cnj_query', cnj);
    setViewMode('search');
  };

  // Synchronize viewMode with localStorage so other parts of the application can trigger specific modes
  useEffect(() => {
    const stored = localStorage.getItem('wono_andamentos_view_mode');
    if (stored && ['feed', 'process', 'search', 'oab_sync', 'calculator'].includes(stored)) {
      setViewMode(stored as any);
      // Consume the value so next time they open the tab, it doesn't force this mode unless set again
      localStorage.removeItem('wono_andamentos_view_mode');
    }
  }, [selectedProcessId]);

  // Filter for feed
  const [feedCategoryFilter, setFeedCategoryFilter] = useState<'all' | 'decisions' | 'publications' | 'petitions' | 'hearings'>('all');
  const [feedSearchTerm, setFeedSearchTerm] = useState('');
  const [feedProcessFilter, setFeedProcessFilter] = useState('ALL');

  // Online Search State
  const [onlineSearchQuery, setOnlineSearchQuery] = useState('');
  const [selectedTribunal, setSelectedTribunal] = useState('TODOS');
  const [isSearchingOnline, setIsSearchingOnline] = useState(false);
  const [onlineResults, setOnlineResults] = useState<any[] | null>(null);

  // Subtab for individual process
  const [activeProcessTab, setActiveProcessTab] = useState<'movements' | 'details' | 'jurisprudence'>('movements');

  // Jurisprudence Search State (Google Grounded Search)
  const [jurisprudenceQuery, setJurisprudenceQuery] = useState('');
  const [jurisprudenceCourt, setJurisprudenceCourt] = useState('');
  const [isSearchingJurisprudence, setIsSearchingJurisprudence] = useState(false);
  const [jurisprudenceResults, setJurisprudenceResults] = useState<{
    synthesis: string;
    precedents: Array<{
      court: string;
      caseNumber: string;
      relator?: string;
      judgmentDate: string;
      thesis: string;
      excerpt: string;
      url?: string;
    }>;
    recommendedThesis: string;
    searchKeywords: string[];
  } | null>(null);
  const [jurisprudenceError, setJurisprudenceError] = useState<string | null>(null);

  // Auto-populate jurisprudence search query when selected process changes
  useEffect(() => {
    if (currentProcess) {
      setJurisprudenceQuery(currentProcess.subject || '');
      // Try to extract court abbreviation (e.g. "TJSP" or "TRT2")
      const courtPart = currentProcess.court ? currentProcess.court.split(' ')[0] : '';
      setJurisprudenceCourt(courtPart);
      setJurisprudenceResults(null);
      setJurisprudenceError(null);
    }
  }, [selectedProcessId]);

  const handleSearchJurisprudence = async () => {
    if (!jurisprudenceQuery.trim()) return;

    setIsSearchingJurisprudence(true);
    setJurisprudenceError(null);
    try {
      const response = await fetch('/api/gemini/jurisprudencia', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          query: jurisprudenceQuery,
          court: jurisprudenceCourt
        })
      });

      if (!response.ok) {
        throw new Error('Falha ao consultar jurisprudência no servidor.');
      }

      const data = await response.json();
      setJurisprudenceResults(data);
    } catch (err: any) {
      console.error(err);
      setJurisprudenceError(err.message || 'Erro inesperado ao pesquisar jurisprudência.');
    } finally {
      setIsSearchingJurisprudence(false);
    }
  };

  // Status Tags (Etiquetas) & Quick Filter States
  const [selectedTagFilter, setSelectedTagFilter] = useState<string | null>(null);

  // Extract all unique status tags across all processes dynamically
  const allUniqueTags = useMemo(() => {
    const tagsSet = new Set<string>(['Aguardando Sentença', 'Em Recurso', 'Petição Inicial', 'Cumprimento de Sentença']);
    processes.forEach((p) => {
      if (p.tags && Array.isArray(p.tags)) {
        p.tags.forEach((t) => {
          if (t && t.trim()) tagsSet.add(t.trim());
        });
      }
    });
    return Array.from(tagsSet);
  }, [processes]);

  // Filter processes list based on active selected tag filter
  const filteredProcessesByTag = useMemo(() => {
    return processes.filter((proc) => {
      if (selectedTagFilter) {
        return proc.tags && proc.tags.includes(selectedTagFilter);
      }
      return true;
    });
  }, [processes, selectedTagFilter]);

  // AI analysis state for specific movement
  const [analyzingMovementId, setAnalyzingMovementId] = useState<string | null>(null);
  const [copiedMovementId, setCopiedMovementId] = useState<string | null>(null);

  // ==========================================
  // OAB Batch Synchronization State & Logic
  // ==========================================
  const [isOabSyncModalOpen, setIsOabSyncModalOpen] = useState(false);
  const [selectedLawyerIdsForSync, setSelectedLawyerIdsForSync] = useState<string[]>([]);
  const [isSyncingOab, setIsSyncingOab] = useState(false);
  const [oabSyncStep, setOabSyncStep] = useState<string>('');
  const [oabSyncResults, setOabSyncResults] = useState<{
    processes: LegalProcess[];
    autoClients: Client[];
    autoDeadlines: ProcessDeadline[];
    summary: {
      lawyersQueried: number;
      totalProcessesFound: number;
      totalMovements: number;
      totalDeadlines: number;
      tribunalsChecked: string[];
    };
  } | null>(null);
  const [selectedOabProcessCnjSet, setSelectedOabProcessCnjSet] = useState<Set<string>>(new Set());
  const [oabFilterLawyer, setOabFilterLawyer] = useState<string>('ALL');
  const [oabSuccessToast, setOabSuccessToast] = useState<string | null>(null);

  // Registered Lawyers roster extracted dynamically
  const registeredLawyers = useMemo(() => {
    const list: Array<{ id: string; name: string; oabNumber: string; oabState: string; role?: string; avatarColor?: string }> = [];

    // 1. Primary lawyer
    if (office?.primaryLawyer?.name && office?.primaryLawyer?.oabNumber) {
      list.push({
        id: 'lawyer-primary',
        name: office.primaryLawyer.name,
        oabNumber: office.primaryLawyer.oabNumber,
        oabState: office.primaryLawyer.oabState || 'SP',
        role: 'Sócio Titular / Fundador',
        avatarColor: 'bg-amber-500 text-slate-950',
      });
    } else {
      list.push({
        id: 'lawyer-vagner',
        name: 'Dr. Vagner Schmidt da Silva',
        oabNumber: '284.912',
        oabState: 'SP',
        role: 'Sócio Fundador',
        avatarColor: 'bg-amber-500 text-slate-950',
      });
    }

    // 2. Additional lawyers in office
    if (office?.additionalLawyers && office.additionalLawyers.length > 0) {
      office.additionalLawyers.forEach((l, idx) => {
        if (l.name && l.oabNumber) {
          const cleanOab = l.oabNumber.replace(/[^0-9]/g, '');
          if (!list.some((existing) => existing.oabNumber.replace(/[^0-9]/g, '') === cleanOab)) {
            list.push({
              id: l.id || `lawyer-add-${idx}`,
              name: l.name,
              oabNumber: l.oabNumber,
              oabState: l.oabState || 'SP',
              role: 'Advogada Associada',
              avatarColor: idx % 2 === 0 ? 'bg-emerald-500 text-slate-950' : 'bg-blue-500 text-white',
            });
          }
        }
      });
    }

    // 3. Team members with OAB
    if (teamMembers && teamMembers.length > 0) {
      teamMembers.forEach((tm, idx) => {
        if (tm.oabNumber) {
          const cleanOab = tm.oabNumber.replace(/[^0-9]/g, '');
          if (!list.some((existing) => existing.oabNumber.replace(/[^0-9]/g, '') === cleanOab)) {
            list.push({
              id: tm.id,
              name: tm.name,
              oabNumber: tm.oabNumber,
              oabState: tm.oabState || 'SP',
              role: tm.role || 'Advogado',
              avatarColor: tm.avatarColor || (idx % 2 === 0 ? 'bg-purple-500 text-white' : 'bg-rose-500 text-white'),
            });
          }
        }
      });
    }

    // Ensure default core office lawyers exist if list is compact
    if (!list.some((l) => l.name.toLowerCase().includes('juliana') || l.oabNumber.includes('319.845'))) {
      list.push({
        id: 'lawyer-juliana',
        name: 'Dra. Juliana Mendes Bastos',
        oabNumber: '319.845',
        oabState: 'SP',
        role: 'Sócia / Especialista Cível',
        avatarColor: 'bg-emerald-500 text-slate-950',
      });
    }
    if (!list.some((l) => l.name.toLowerCase().includes('marcelo') || l.oabNumber.includes('198.420'))) {
      list.push({
        id: 'lawyer-marcelo',
        name: 'Dr. Marcelo Silveira Rocha',
        oabNumber: '198.420',
        oabState: 'RJ',
        role: 'Advogado Trabalhista & Previdenciário',
        avatarColor: 'bg-blue-500 text-white',
      });
    }

    return list;
  }, [office, teamMembers]);

  // Execute OAB search against /api/oab-sync
  const handleExecuteOabSync = async (specificLawyerIds?: string[]) => {
    setIsSyncingOab(true);
    setOabSyncResults(null);
    const targetLawyerIds = specificLawyerIds && specificLawyerIds.length > 0
      ? specificLawyerIds
      : (selectedLawyerIdsForSync.length > 0 ? selectedLawyerIdsForSync : registeredLawyers.map((l) => l.id));
    
    const lawyersToQuery = registeredLawyers.filter((l) => targetLawyerIds.includes(l.id));

    setOabSyncStep(`Conectando aos servidores do CNJ e DataJud para ${lawyersToQuery.length} advogado(s)...`);

    try {
      const response = await fetch('/api/oab-sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lawyers: lawyersToQuery }),
      });

      if (!response.ok) {
        throw new Error('Falha ao comunicar com o serviço de sincronização OAB.');
      }

      const data = await response.json();
      setOabSyncResults(data);

      // Select all found processes by default
      const allCnjs = new Set<string>((data.processes || []).map((p: LegalProcess) => p.cnjNumber));
      setSelectedOabProcessCnjSet(allCnjs);
      setOabSyncStep(`✅ Varredura concluída! ${data.processes?.length || 0} processos e ${data.summary?.totalMovements || 0} andamentos localizados.`);
    } catch (err: any) {
      console.error('Erro na sincronização por OAB:', err);
      setOabSyncStep(`Erro na busca: ${err.message || 'Tente novamente.'}`);
    } finally {
      setIsSyncingOab(false);
    }
  };

  // Confirm Bulk Import from OAB Sync Results
  const handleConfirmImportFromOabSync = () => {
    if (!oabSyncResults || !onBulkImportProcesses) return;

    const toImport = oabSyncResults.processes.filter((p) => selectedOabProcessCnjSet.has(p.cnjNumber));
    if (toImport.length === 0) return;

    const importedCnjSet = new Set(toImport.map((p) => p.cnjNumber));
    const relevantClients = (oabSyncResults.autoClients || []).filter((c) =>
      toImport.some((p) => 
        p.activeParty.toLowerCase().includes(c.name.toLowerCase()) || 
        p.passiveParty.toLowerCase().includes(c.name.toLowerCase()) || 
        p.clientId === c.id
      )
    );
    const relevantDeadlines = (oabSyncResults.autoDeadlines || []).filter((d) =>
      importedCnjSet.has(d.processNumber)
    );

    onBulkImportProcesses(toImport, relevantClients, relevantDeadlines);

    setOabSuccessToast(`✅ Sucesso! ${toImport.length} processos por OAB colocados no sistema com andamentos, clientes e prazos.`);
    setTimeout(() => {
      setOabSuccessToast(null);
      setIsOabSyncModalOpen(false);
      setViewMode('feed');
    }, 2000);
  };

  // Process Modal State (Create / Edit)
  const [isProcessModalOpen, setIsProcessModalOpen] = useState(false);
  const [editingProcessId, setEditingProcessId] = useState<string | null>(null);
  const [processCnjNumber, setProcessCnjNumber] = useState('');
  const [processCourt, setProcessCourt] = useState('TJGO - Tribunal de Justiça do Estado de Goiás');
  const [processBranchVara, setProcessBranchVara] = useState('1ª Vara Cível');
  const [processComarca, setProcessComarca] = useState('Goiânia / GO');
  const [processLawsuitType, setProcessLawsuitType] = useState('Procedimento Comum Cível');
  const [processSubject, setProcessSubject] = useState('Indenização por Danos Morais e Materiais');
  const [processValue, setProcessValue] = useState(50000);
  const [processStatus, setProcessStatus] = useState<LegalProcess['status']>('Ativo');
  const [processActiveParty, setProcessActiveParty] = useState('');
  const [processPassiveParty, setProcessPassiveParty] = useState('');
  const [processClientId, setProcessClientId] = useState(clients[0]?.id || '');
  const [processLawyer, setProcessLawyer] = useState('Dr. Vagner Schmidt da Silva');
  const [processNotes, setProcessNotes] = useState('');

  // Delete Process Confirmation
  const [deleteProcessConfirm, setDeleteProcessConfirm] = useState<{
    isOpen: boolean;
    process: LegalProcess | null;
  }>({
    isOpen: false,
    process: null,
  });

  // New Movement Modal
  const [isAddMovementModalOpen, setIsAddMovementModalOpen] = useState(false);
  const [movementTargetProcessId, setMovementTargetProcessId] = useState<string>('');
  const [newMovTitle, setNewMovTitle] = useState('');
  const [newMovDescription, setNewMovDescription] = useState('');
  const [newMovCode, setNewMovCode] = useState('99999');
  const [newMovOrgan, setNewMovOrgan] = useState('');
  const [newMovIsDecision, setNewMovIsDecision] = useState(false);

  // Substabelecimento States
  const [isSubstabelecimentoModalOpen, setIsSubstabelecimentoModalOpen] = useState(false);
  const [substabLawyerType, setSubstabLawyerType] = useState<'banca' | 'custom'>('banca');
  const [substabSelectedMemberId, setSubstabSelectedMemberId] = useState<string>('');
  const [substabCustomName, setSubstabCustomName] = useState('');
  const [substabCustomOAB, setSubstabCustomOAB] = useState('');
  const [substabCustomUF, setSubstabCustomUF] = useState('GO');
  const [substabCustomEmail, setSubstabCustomEmail] = useState('');
  const [substabCustomPhone, setSubstabCustomPhone] = useState('');
  const [substabWithReserve, setSubstabWithReserve] = useState(true);
  const [substabGenerateDoc, setSubstabGenerateDoc] = useState(true);
  const [substabAddToTeam, setSubstabAddToTeam] = useState(true);
  const [substabSuccessMessage, setSubstabSuccessMessage] = useState<string | null>(null);

  const handleOpenSubstabelecerModal = (proc: LegalProcess) => {
    setSubstabSuccessMessage(null);
    setSubstabCustomName('');
    setSubstabCustomOAB('');
    setSubstabCustomUF('SP');
    setSubstabCustomEmail('');
    setSubstabCustomPhone('');
    setSubstabWithReserve(true);
    setSubstabGenerateDoc(true);
    setSubstabAddToTeam(true);
    
    // Find first available lawyer in registeredLawyers that is not the primary lawyer or current responsible lawyer
    const firstOther = registeredLawyers.find(l => l.name !== proc.responsibleLawyer);
    setSubstabSelectedMemberId(firstOther?.id || registeredLawyers[0]?.id || '');
    setIsSubstabelecimentoModalOpen(true);
  };

  const handleConfirmSubstabelecimento = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentProcess) return;

    let substName = '';
    let substOAB = '';
    let substUF = 'SP';

    if (substabLawyerType === 'banca') {
      const selected = registeredLawyers.find(l => l.id === substabSelectedMemberId);
      if (!selected) return;
      substName = selected.name;
      substOAB = selected.oabNumber;
      substUF = selected.oabState;
    } else {
      if (!substabCustomName || !substabCustomOAB) return;
      substName = substabCustomName;
      substOAB = substabCustomOAB;
      substUF = substabCustomUF;

      // Add to team if requested
      if (substabAddToTeam && onAddTeamMember) {
        onAddTeamMember({
          name: substabCustomName,
          email: substabCustomEmail || `${substabCustomName.toLowerCase().replace(/\s+/g, '')}@escritorio.com`,
          phone: substabCustomPhone || '(00) 00000-0000',
          role: 'Advogado Associado',
          oabNumber: substabCustomOAB,
          oabState: substabCustomUF,
          status: 'Ativo',
          casesAssignedCount: 1,
        });
      }
    }

    // Generate Document
    if (substabGenerateDoc && onAddDocument && office) {
      const docId = `doc-${Date.now()}`;
      const newDoc: LegalDocumentItem = {
        id: docId,
        type: 'substabelecimento',
        title: `Substabelecimento ${substabWithReserve ? 'Com Reserva' : 'Sem Reserva'} - Proc. ${currentProcess.cnjNumber}`,
        clientId: currentProcess.clientId,
        processId: currentProcess.id,
        createdAt: new Date().toISOString().split('T')[0],
        status: 'pronto',
        substabelecidoNome: substName,
        substabelecidoOAB: substOAB,
      };
      onAddDocument(newDoc);
    }

    // Update Process with logs or new responsible lawyer
    const dateStr = new Date().toLocaleDateString('pt-BR');
    const substLabel = `\n[SUBSTABELECIMENTO] Em ${dateStr}: substabelecido ${substabWithReserve ? 'com' : 'sem'} reserva de poderes para Dr(a). ${substName} (OAB/${substUF} ${substOAB}).`;
    
    const updatedProcess: LegalProcess = {
      ...currentProcess,
      notes: (currentProcess.notes || '') + substLabel,
    };

    if (!substabWithReserve) {
      // Transfer responsibility completely
      updatedProcess.responsibleLawyer = substName;

      // Update deadlines under this process
      if (deadlines && onUpdateDeadline) {
        deadlines.forEach(d => {
          if (d.processId === currentProcess.id && d.status !== 'cumprido') {
            onUpdateDeadline({
              ...d,
              responsibleLawyer: substName,
            });
          }
        });
      }
    }

    onUpdateProcess(updatedProcess);

    setSubstabSuccessMessage(`Substabelecimento realizado com sucesso para ${substName}!`);
    setTimeout(() => {
      setIsSubstabelecimentoModalOpen(false);
      setSubstabSuccessMessage(null);
    }, 2500);
  };

  // Selected process object
  const currentProcess = processes.find((p) => p.id === selectedProcessId) || processes[0];

  // Consolidated all movements with metadata
  const allConsolidatedMovements = useMemo(() => {
    return processes
      .flatMap((proc) =>
        (proc.movements || []).map((mov, idx) => {
          const titleLower = mov.title.toLowerCase();
          const descLower = mov.description.toLowerCase();
          const isPublication = titleLower.includes('publicaç') || titleLower.includes('publicado') || titleLower.includes('dje') || titleLower.includes('dejt') || descLower.includes('diário') || descLower.includes('publicação oficial');
          const isDecision = mov.isJudicialDecision || titleLower.includes('decisão') || titleLower.includes('despacho') || titleLower.includes('sentença') || titleLower.includes('acórdão') || titleLower.includes('tutela');
          const isHearing = titleLower.includes('audiência') || descLower.includes('audiência');
          const isPetition = titleLower.includes('petição') || titleLower.includes('juntada') || titleLower.includes('contestação') || titleLower.includes('réplica');

          return {
            ...mov,
            uniqueKey: `${proc.id}-${mov.id}-${idx}`,
            processId: proc.id,
            processCnj: proc.cnjNumber,
            processCourt: proc.court,
            processVara: proc.branchVara,
            processActiveParty: proc.activeParty,
            processPassiveParty: proc.passiveParty,
            processLawsuitType: proc.lawsuitType,
            isPublication,
            isDecision,
            isHearing,
            isPetition,
          };
        })
      )
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [processes]);

  // Filtered movements for Feed
  const filteredFeedMovements = useMemo(() => {
    return allConsolidatedMovements.filter((mov) => {
      // Process filter
      if (feedProcessFilter !== 'ALL' && mov.processId !== feedProcessFilter) {
        return false;
      }

      // Category filter
      if (feedCategoryFilter === 'decisions' && !mov.isDecision) return false;
      if (feedCategoryFilter === 'publications' && !mov.isPublication) return false;
      if (feedCategoryFilter === 'petitions' && !mov.isPetition) return false;
      if (feedCategoryFilter === 'hearings' && !mov.isHearing) return false;

      // Text search filter
      if (feedSearchTerm.trim()) {
        const query = feedSearchTerm.toLowerCase();
        const matchesTitle = mov.title.toLowerCase().includes(query);
        const matchesDesc = mov.description.toLowerCase().includes(query);
        const matchesCnj = mov.processCnj.toLowerCase().includes(query);
        const matchesParty = mov.processActiveParty.toLowerCase().includes(query) || mov.processPassiveParty.toLowerCase().includes(query);
        const matchesCourt = mov.processCourt.toLowerCase().includes(query);
        const matchesOrgan = mov.organ.toLowerCase().includes(query);
        if (!matchesTitle && !matchesDesc && !matchesCnj && !matchesParty && !matchesCourt && !matchesOrgan) {
          return false;
        }
      }

      return true;
    });
  }, [allConsolidatedMovements, feedProcessFilter, feedCategoryFilter, feedSearchTerm]);

  // Statistics counters
  const stats = useMemo(() => {
    const totalMovements = allConsolidatedMovements.length;
    const totalPublications = allConsolidatedMovements.filter((m) => m.isPublication).length;
    const totalDecisions = allConsolidatedMovements.filter((m) => m.isDecision).length;
    const totalHearings = allConsolidatedMovements.filter((m) => m.isHearing).length;
    const totalDeadlines = allConsolidatedMovements.filter((m) => m.deadlineDays || m.aiAnalysis?.deadlineDays).length;

    return {
      totalMovements,
      totalPublications,
      totalDecisions,
      totalHearings,
      totalDeadlines,
    };
  }, [allConsolidatedMovements]);

  const handleOpenNewProcessModal = () => {
    setEditingProcessId(null);
    setProcessCnjNumber('');
    setProcessCourt('TJGO - Tribunal de Justiça do Estado de Goiás');
    setProcessBranchVara('1ª Vara Cível');
    setProcessComarca('Goiânia / GO');
    setProcessLawsuitType('Procedimento Comum Cível');
    setProcessSubject('Indenização por Danos Morais e Materiais');
    setProcessValue(50000);
    setProcessStatus('Ativo');
    setProcessActiveParty('');
    setProcessPassiveParty('');
    setProcessClientId(clients[0]?.id || '');
    setProcessLawyer('Dr. Vagner Schmidt da Silva');
    setProcessNotes('');
    setIsProcessModalOpen(true);
  };

  const handleOpenEditProcessModal = (proc: LegalProcess) => {
    setEditingProcessId(proc.id);
    setProcessCnjNumber(proc.cnjNumber);
    setProcessCourt(proc.court);
    setProcessBranchVara(proc.branchVara);
    setProcessComarca(proc.comarca);
    setProcessLawsuitType(proc.lawsuitType);
    setProcessSubject(proc.subject);
    setProcessValue(proc.value);
    setProcessStatus(proc.status);
    setProcessActiveParty(proc.activeParty);
    setProcessPassiveParty(proc.passiveParty);
    setProcessClientId(proc.clientId);
    setProcessLawyer(proc.responsibleLawyer);
    setProcessNotes(proc.notes || '');
    setIsProcessModalOpen(true);
  };

  // Online Search Trigger
  const handleSearchOnline = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!onlineSearchQuery.trim()) return;

    setIsSearchingOnline(true);
    setOnlineResults(null);

    try {
      const response = await fetch(
        `/api/online-search?query=${encodeURIComponent(onlineSearchQuery)}&tribunal=${encodeURIComponent(
          selectedTribunal
        )}`
      );
      const data = await response.json();
      setOnlineResults(data.results || []);
    } catch (err) {
      console.error('Erro na busca de andamentos online:', err);
    } finally {
      setIsSearchingOnline(false);
    }
  };

  // Import online result into office processes
  const handleImportProcess = (result: any) => {
    const matchedClient = clients.find((c) =>
      result.activeParty?.toLowerCase().includes(c.name.toLowerCase())
    ) || clients[0];

    const newProc: LegalProcess = {
      id: `proc-imported-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      cnjNumber: result.cnjNumber,
      court: result.court,
      branchVara: result.branchVara,
      comarca: result.comarca,
      lawsuitType: result.lawsuitType,
      subject: result.subject,
      value: result.value || 0,
      distributionDate: result.distributionDate || new Date().toISOString().split('T')[0],
      status: result.status || 'Ativo',
      activeParty: result.activeParty,
      passiveParty: result.passiveParty,
      clientId: matchedClient ? matchedClient.id : 'cli-1',
      responsibleLawyer: result.responsibleLawyer || 'Dr. Vagner Schmidt da Silva',
      judge: result.judge,
      lastSyncDate: new Date().toISOString(),
      notes: 'Processo importado da busca online do Tribunal/DataJud.',
      movements: (result.movements || []).map((m: any, idx: number) => {
        const autoTendency = classifyMovementTendencyLocal(m.title, m.description);
        return {
          ...m,
          id: `mov-imp-${Date.now()}-${idx}-${Math.random().toString(36).substring(2, 7)}`,
          tendency: m.tendency || autoTendency,
        };
      }),
    };

    onAddProcess(newProc);
    onSelectProcessId(newProc.id);
    setViewMode('process');
    setOnlineResults(null);
    setOnlineSearchQuery('');
  };

  // Trigger Gemini analysis for a single movement
  const handleAnalyzeMovement = async (processId: string, movement: ProcessMovement) => {
    const targetProc = processes.find((p) => p.id === processId);
    if (!targetProc) return;

    setAnalyzingMovementId(movement.id);

    try {
      const response = await fetch('/api/gemini/analyze-andamento', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          movementText: movement.description,
          processNumber: targetProc.cnjNumber,
          lawsuitType: targetProc.lawsuitType,
          partyName: targetProc.activeParty,
        }),
      });

      const data = await response.json();

      // Update process movement with AI analysis
      const updatedMovements = targetProc.movements.map((m) => {
        if (m.id === movement.id) {
          const mTendency = data.tendency || classifyMovementTendencyLocal(m.title, m.description);
          return {
            ...m,
            tendency: mTendency,
            aiAnalysis: {
              summary: data.summary,
              clientExplanation: data.clientExplanation,
              recommendedAction: data.recommendedAction,
              urgency: data.urgency,
              suggestedWhatsApp: data.suggestedWhatsApp,
              deadlineDays: data.deadlineDays,
              deadlineType: data.deadlineType,
              tendency: data.tendency,
            },
          };
        }
        return m;
      });

      onUpdateProcess({
        ...targetProc,
        movements: updatedMovements,
      });
    } catch (error) {
      console.error('Erro ao analisar andamento com IA:', error);
    } finally {
      setAnalyzingMovementId(null);
    }
  };

  // Add deadline to agenda from movement
  const handleCreateDeadlineFromMovement = (processId: string, movement: ProcessMovement) => {
    const targetProc = processes.find((p) => p.id === processId);
    if (!targetProc) return;

    const days = movement.deadlineDays || movement.aiAnalysis?.deadlineDays || 15;
    const now = new Date();
    const fatal = new Date();
    fatal.setDate(now.getDate() + days);

    onAddDeadlineToAgenda({
      processId: targetProc.id,
      processNumber: targetProc.cnjNumber,
      clientName: targetProc.activeParty,
      title: `${movement.title.replace('Publicado ', '').replace('Publicação no DJE - ', '')} (${targetProc.cnjNumber})`,
      type: movement.isJudicialDecision ? 'Manifestação' : 'Diligência',
      startDate: now.toISOString().split('T')[0],
      fatalDate: movement.deadlineDate || fatal.toISOString().split('T')[0],
      status: 'alerta',
      daysLeft: days,
      responsibleLawyer: targetProc.responsibleLawyer,
      notes: movement.aiAnalysis?.recommendedAction || movement.description.slice(0, 160),
    });
  };

  // Copy publication text to clipboard
  const handleCopyText = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedMovementId(id);
    setTimeout(() => setCopiedMovementId(null), 2500);
  };

  // Send WhatsApp message to client
  const handleSendWhatsApp = (customMessage: string) => {
    const encoded = encodeURIComponent(customMessage);
    window.open(`https://wa.me/?text=${encoded}`, '_blank');
  };

  // Save process (Create or Edit)
  const handleSaveProcess = (e: React.FormEvent) => {
    e.preventDefault();
    if (!processCnjNumber || !processActiveParty) return;

    if (editingProcessId) {
      const existing = processes.find((p) => p.id === editingProcessId);
      if (!existing) return;

      const updated: LegalProcess = {
        ...existing,
        cnjNumber: processCnjNumber,
        court: processCourt,
        branchVara: processBranchVara,
        comarca: processComarca,
        lawsuitType: processLawsuitType,
        subject: processSubject,
        value: Number(processValue) || 0,
        status: processStatus,
        activeParty: processActiveParty,
        passiveParty: processPassiveParty,
        clientId: processClientId,
        responsibleLawyer: processLawyer,
        notes: processNotes,
      };

      onUpdateProcess(updated);
    } else {
      const newProc: LegalProcess = {
        id: `proc-${Date.now()}`,
        cnjNumber: processCnjNumber,
        court: processCourt,
        branchVara: processBranchVara,
        comarca: processComarca,
        lawsuitType: processLawsuitType,
        subject: processSubject,
        value: Number(processValue) || 0,
        distributionDate: new Date().toISOString().split('T')[0],
        status: processStatus,
        activeParty: processActiveParty,
        passiveParty: processPassiveParty,
        clientId: processClientId,
        responsibleLawyer: processLawyer,
        lastSyncDate: new Date().toISOString(),
        notes: processNotes,
        movements: [
          {
            id: `mov-init-${Date.now()}`,
            date: new Date().toISOString(),
            code: '10001',
            title: 'Cadastro no Sistema do Escritório',
            description: 'Processo cadastrado com sucesso no WONO ADVOCACIA. Sincronização ativada.',
            organ: processBranchVara,
            isJudicialDecision: false,
          },
        ],
      };

      onAddProcess(newProc);
      onSelectProcessId(newProc.id);
    }

    setIsProcessModalOpen(false);
  };

  const handleOpenAddMovementModal = (procId?: string) => {
    setMovementTargetProcessId(procId || currentProcess?.id || processes[0]?.id || '');
    setNewMovTitle('');
    setNewMovDescription('');
    setNewMovCode('99999');
    setNewMovOrgan('');
    setNewMovIsDecision(false);
    setIsAddMovementModalOpen(true);
  };

  const handleSaveMovement = (e: React.FormEvent) => {
    e.preventDefault();
    const targetProc = processes.find((p) => p.id === movementTargetProcessId) || currentProcess;
    if (!targetProc || !newMovTitle) return;

    const autoTendency = classifyMovementTendencyLocal(newMovTitle, newMovDescription);
    const newMov: ProcessMovement = {
      id: `mov-manual-${Date.now()}`,
      date: new Date().toISOString(),
      code: newMovCode || '99999',
      title: newMovTitle,
      description: newMovDescription,
      organ: newMovOrgan || targetProc.branchVara,
      isJudicialDecision: newMovIsDecision,
      tendency: autoTendency,
    };

    onAddMovement(targetProc.id, newMov);
    setIsAddMovementModalOpen(false);
  };

  return (
    <div className="space-y-6">
      {/* Warning Banner for Read-Only Mode */}
      {activeUser?.privilege === 'leitura' && (
        <div className="bg-amber-500/10 border border-amber-500/30 text-amber-300 rounded-xl p-4 text-xs flex items-center gap-3">
          <span className="text-base">⚠️</span>
          <span>
            <strong>Modo de Leitura Ativo:</strong> Seu operador atual (<strong>{activeUser?.name}</strong>) possui privilégio de acesso restrito (<em>Leitura</em>). 
            Você pode consultar e realizar buscas em Diários de Justiça, mas lançar andamentos, cadastrar processos, ou alterar dados está bloqueado.
          </span>
        </div>
      )}

      {/* Top Banner with Stats & Navigation Controls */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1.5">
                <Radio className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
                DataJud / CNJ & Diários Oficiais
              </span>
              <span className="text-xs text-slate-400">
                TJSP • TRF3 • TRT2 • TJRJ • STJ
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-100 tracking-tight">
              Andamentos Processuais & Publicações Oficiais
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
              Visualização completa de todos os andamentos, decisões e publicações no Diário de Justiça (DJE/DEJT).
            </p>
          </div>

          {/* Top Quick Actions */}
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              id="btn-top-busca-automatica"
              onClick={() => setViewMode('search')}
              className={`px-4 py-2 rounded-xl text-xs font-black flex items-center gap-2 cursor-pointer transition shadow-md ${
                viewMode === 'search'
                  ? 'bg-amber-400 text-slate-950 ring-2 ring-amber-300 shadow-amber-500/30'
                  : 'bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 shadow-amber-500/20'
              }`}
            >
              <Brain className="w-4 h-4" />
              <span>Busca Automática CNJ</span>
            </button>
            <button
              onClick={() => handleOpenAddMovementModal()}
              disabled={activeUser?.privilege === 'leitura'}
              className={`px-3.5 py-2 border rounded-xl text-xs font-semibold flex items-center gap-1.5 transition shadow-sm ${
                activeUser?.privilege === 'leitura'
                  ? 'bg-slate-850 border-slate-800 text-slate-500 cursor-not-allowed'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700 cursor-pointer'
              }`}
              title={activeUser?.privilege === 'leitura' ? 'Ação indisponível em modo leitura' : 'Lançar novo andamento'}
            >
              <Plus className={`w-4 h-4 ${activeUser?.privilege === 'leitura' ? 'text-slate-600' : 'text-amber-400'}`} />
              Lançar Andamento
            </button>
            <button
              onClick={handleOpenNewProcessModal}
              disabled={activeUser?.privilege === 'leitura'}
              className={`px-3.5 py-2 border rounded-xl text-xs font-bold flex items-center gap-1.5 transition shadow-sm ${
                activeUser?.privilege === 'leitura'
                  ? 'bg-slate-850 border-slate-800 text-slate-500 cursor-not-allowed'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700 cursor-pointer'
              }`}
              title={activeUser?.privilege === 'leitura' ? 'Ação indisponível em modo leitura' : 'Cadastrar novo processo judicial'}
            >
              <Plus className={`w-4 h-4 ${activeUser?.privilege === 'leitura' ? 'text-slate-600' : 'text-amber-400'}`} />
              Cadastrar Processo
            </button>
          </div>
        </div>

        {/* Live Counters Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 pt-2 border-t border-slate-800/80">
          <div className="bg-slate-950/70 border border-slate-800 p-2.5 sm:p-3 rounded-xl">
            <span className="text-[10px] sm:text-[11px] text-slate-400 block font-medium truncate">Total de Andamentos</span>
            <span className="text-lg sm:text-xl font-extrabold text-amber-400">{stats.totalMovements}</span>
            <span className="text-[9px] sm:text-[10px] text-slate-500 block mt-0.5 truncate">coletados nos autos</span>
          </div>

          <div className="bg-slate-950/70 border border-slate-800 p-2.5 sm:p-3 rounded-xl">
            <span className="text-[10px] sm:text-[11px] text-slate-400 block font-medium truncate">Publicações DJE</span>
            <span className="text-lg sm:text-xl font-extrabold text-emerald-400">{stats.totalPublications}</span>
            <span className="text-[9px] sm:text-[10px] text-slate-500 block mt-0.5 truncate">intimações e diários</span>
          </div>

          <div className="bg-slate-950/70 border border-slate-800 p-2.5 sm:p-3 rounded-xl">
            <span className="text-[10px] sm:text-[11px] text-slate-400 block font-medium truncate">Decisões & Despachos</span>
            <span className="text-lg sm:text-xl font-extrabold text-blue-400">{stats.totalDecisions}</span>
            <span className="text-[9px] sm:text-[10px] text-slate-500 block mt-0.5 truncate">com providências</span>
          </div>

          <div className="bg-slate-950/70 border border-slate-800 p-2.5 sm:p-3 rounded-xl">
            <span className="text-[10px] sm:text-[11px] text-slate-400 block font-medium truncate">Processos Monitorados</span>
            <span className="text-lg sm:text-xl font-extrabold text-slate-100">{processes.length}</span>
            <span className="text-[9px] sm:text-[10px] text-slate-500 block mt-0.5 truncate">em tempo real</span>
          </div>
        </div>

        {/* View Mode Switcher */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 pt-2 border-t border-slate-800/80">
          <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800 overflow-x-auto no-scrollbar">
            <button
              onClick={() => setViewMode('feed')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0 ${
                viewMode === 'feed'
                  ? 'bg-amber-500 text-slate-950 shadow-md'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Layers className="w-3.5 h-3.5 shrink-0" />
              <span>Andamentos ({allConsolidatedMovements.length})</span>
            </button>

            <button
              onClick={() => setViewMode('process')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0 ${
                viewMode === 'process'
                  ? 'bg-amber-500 text-slate-950 shadow-md'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Scale className="w-3.5 h-3.5 shrink-0" />
              <span>Por Processo ({processes.length})</span>
            </button>

            <button
              id="tab-busca-automatica-cnj"
              onClick={() => setViewMode('search')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0 ${
                viewMode === 'search'
                  ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 shadow-md font-extrabold ring-1 ring-amber-300'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Brain className="w-3.5 h-3.5 shrink-0 text-amber-400" />
              <span>Busca Automática CNJ</span>
              <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                Online
              </span>
            </button>

            <button
              onClick={() => setViewMode('calculator')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0 ${
                viewMode === 'calculator'
                  ? 'bg-amber-500 text-slate-950 shadow-md'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Calculator className="w-3.5 h-3.5 shrink-0" />
              <span>Custas</span>
            </button>
          </div>

          <div className="text-[11px] text-slate-400 flex items-center gap-1.5 shrink-0 justify-end">
            <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
            <span className="truncate">Sincronização contínua com Diários</span>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* MODE 1: FEED GERAL DE TODOS OS ANDAMENTOS & PUBLICAÇÕES                   */}
      {/* ========================================================================= */}
      {viewMode === 'feed' && (
        <div className="space-y-4">
          {/* Feed Filter Bar */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-md space-y-3">
            <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
              {/* Category Pills */}
              <div className="flex flex-wrap items-center gap-1.5 w-full sm:w-auto">
                <button
                  onClick={() => setFeedCategoryFilter('all')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                    feedCategoryFilter === 'all'
                      ? 'bg-slate-100 text-slate-950'
                      : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  Todos ({allConsolidatedMovements.length})
                </button>

                <button
                  onClick={() => setFeedCategoryFilter('publications')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer flex items-center gap-1 ${
                    feedCategoryFilter === 'publications'
                      ? 'bg-emerald-500 text-slate-950 font-bold'
                      : 'bg-slate-800 text-emerald-400 hover:bg-slate-700'
                  }`}
                >
                  <BookOpen className="w-3 h-3" />
                  Publicações DJE ({stats.totalPublications})
                </button>

                <button
                  onClick={() => setFeedCategoryFilter('decisions')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer flex items-center gap-1 ${
                    feedCategoryFilter === 'decisions'
                      ? 'bg-amber-500 text-slate-950 font-bold'
                      : 'bg-slate-800 text-amber-300 hover:bg-slate-700'
                  }`}
                >
                  <Gavel className="w-3 h-3" />
                  Decisões & Despachos ({stats.totalDecisions})
                </button>

                <button
                  onClick={() => setFeedCategoryFilter('hearings')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer flex items-center gap-1 ${
                    feedCategoryFilter === 'hearings'
                      ? 'bg-purple-500 text-white font-bold'
                      : 'bg-slate-800 text-purple-300 hover:bg-slate-700'
                  }`}
                >
                  <Calendar className="w-3 h-3" />
                  Audiências ({stats.totalHearings})
                </button>

                <button
                  onClick={() => setFeedCategoryFilter('petitions')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer flex items-center gap-1 ${
                    feedCategoryFilter === 'petitions'
                      ? 'bg-blue-500 text-white font-bold'
                      : 'bg-slate-800 text-blue-300 hover:bg-slate-700'
                  }`}
                >
                  <FileText className="w-3 h-3" />
                  Petições & Juntadas
                </button>
              </div>

              {/* Process Select Dropdown */}
              <div className="w-full sm:w-auto">
                <select
                  value={feedProcessFilter}
                  onChange={(e) => setFeedProcessFilter(e.target.value)}
                  className="w-full sm:w-64 px-3 py-1.5 bg-slate-950 border border-slate-700 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-amber-500 cursor-pointer"
                >
                  <option value="ALL">Filtrar por Processo: Todos ({processes.length})</option>
                  {processes.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.cnjNumber} - {p.activeParty}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Keyword Search Input & Automatic Search Shortcut */}
            <div className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-center">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={feedSearchTerm}
                  onChange={(e) => setFeedSearchTerm(e.target.value)}
                  placeholder="Pesquisar nos andamentos por palavra-chave (ex: contestação, tutela, sentença, réplica, perícia, intimação, número CNJ)..."
                  className="w-full pl-10 pr-4 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs sm:text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-500"
                />
                {feedSearchTerm && (
                  <button
                    onClick={() => setFeedSearchTerm('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-white"
                  >
                    Limpar
                  </button>
                )}
              </div>

              <button
                onClick={() => setViewMode('search')}
                className="px-3.5 py-2 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0 shadow-sm"
                title="Consultar processos novos por CPF, Nome, OAB ou CNJ nos tribunais"
              >
                <Brain className="w-3.5 h-3.5 text-amber-400" />
                <span>Busca Automática CNJ</span>
              </button>
            </div>
          </div>

          {/* Feed List Items */}
          {filteredFeedMovements.length === 0 ? (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center text-slate-400 space-y-3">
              <Search className="w-10 h-10 text-slate-600 mx-auto" />
              <p className="text-sm font-semibold text-slate-300">Nenhum andamento ou publicação localizado para os filtros selecionados.</p>
              <p className="text-xs text-slate-500">Tente ajustar o termo de busca ou redefinir a categoria.</p>
              
              {feedSearchTerm.trim() && (
                <div className="pt-2">
                  <button
                    onClick={() => handleDeepLinkSearch(feedSearchTerm.trim())}
                    className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-2 mx-auto cursor-pointer shadow-lg shadow-blue-600/30"
                  >
                    <Search className="w-4 h-4" /> Consultar "{feedSearchTerm.trim()}" no DataJud / CNJ Online
                  </button>
                </div>
              )}

              <button
                onClick={() => {
                  setFeedCategoryFilter('all');
                  setFeedSearchTerm('');
                  setFeedProcessFilter('ALL');
                }}
                className="px-4 py-2 bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 border border-amber-500/40 rounded-xl text-xs font-semibold transition cursor-pointer"
              >
                Limpar Todos os Filtros
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between text-xs text-slate-400 px-1">
                <span>Exibindo <strong>{filteredFeedMovements.length}</strong> andamentos e publicações</span>
                <span>Ordenação: Mais recentes primeiro</span>
              </div>

              <div className="space-y-4">
                {filteredFeedMovements.map((mov) => {
                  const isAnalyzing = analyzingMovementId === mov.id;
                  const isCopied = copiedMovementId === mov.id;

                  return (
                    <div
                      key={mov.uniqueKey}
                      className={`bg-slate-900 border rounded-2xl p-5 transition space-y-3.5 shadow-md ${
                        mov.isDecision
                          ? 'border-amber-500/40 hover:border-amber-500/70 bg-gradient-to-r from-slate-900 via-slate-900 to-amber-950/10'
                          : mov.isPublication
                          ? 'border-emerald-500/40 hover:border-emerald-500/70'
                          : 'border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      {/* Header of Movement */}
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="space-y-1">
                          {/* Badges */}
                          <div className="flex flex-wrap items-center gap-2">
                            {mov.isPublication && (
                              <span className="text-[10px] px-2.5 py-0.5 rounded-md font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                                <BookOpen className="w-3 h-3" /> Publicação no DJE / Diário Oficial
                              </span>
                            )}
                            {mov.isDecision && (
                              <span className="text-[10px] px-2.5 py-0.5 rounded-md font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1">
                                <Gavel className="w-3 h-3" /> Decisão Judicial / Despacho
                              </span>
                            )}
                            {mov.isHearing && (
                              <span className="text-[10px] px-2.5 py-0.5 rounded-md font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30 flex items-center gap-1">
                                <Calendar className="w-3 h-3" /> Audiência Designada
                              </span>
                            )}
                            {(() => {
                              const tendency = mov.tendency || mov.aiAnalysis?.tendency || classifyMovementTendencyLocal(mov.title, mov.description);
                              if (tendency === 'Positiva') {
                                return (
                                  <span className="text-[10px] px-2.5 py-0.5 rounded-md bg-emerald-500/15 text-emerald-400 font-bold border border-emerald-500/30 flex items-center gap-1">
                                    <TrendingUp className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                                    Tendência: Positiva
                                  </span>
                                );
                              } else if (tendency === 'Negativa') {
                                return (
                                  <span className="text-[10px] px-2.5 py-0.5 rounded-md bg-rose-500/15 text-rose-400 font-bold border border-rose-500/30 flex items-center gap-1">
                                    <TrendingDown className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                                    Tendência: Negativa
                                  </span>
                                );
                              } else {
                                return (
                                  <span className="text-[10px] px-2.5 py-0.5 rounded bg-slate-800 text-slate-300 font-bold border border-slate-700 flex items-center gap-1">
                                    <Scale className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                    Tendência: Neutra
                                  </span>
                                );
                              }
                            })()}
                            <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-400 font-mono">
                              Código: {mov.code}
                            </span>
                            <span className="text-xs text-slate-400 flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {new Date(mov.date).toLocaleDateString('pt-BR', {
                                day: '2-digit',
                                month: 'long',
                                year: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </span>
                          </div>

                          <h3 className="text-base font-bold text-slate-100">
                            {mov.title}
                          </h3>

                          {/* Process Metadata Subheader */}
                          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400 pt-0.5">
                            <button
                              onClick={() => {
                                onSelectProcessId(mov.processId);
                                setViewMode('process');
                              }}
                              className="font-mono font-bold text-amber-400 hover:text-amber-300 flex items-center gap-1 cursor-pointer bg-slate-950 px-2 py-0.5 rounded border border-slate-800 transition"
                              title="Ver autos internos e linha do tempo"
                            >
                              <Scale className="w-3 h-3 text-amber-400" />
                              CNJ: {mov.processCnj}
                            </button>
                            <button
                              onClick={() => handleDeepLinkSearch(mov.processCnj)}
                              className="font-mono font-bold text-blue-400 hover:text-blue-300 flex items-center gap-1 cursor-pointer bg-slate-950 px-2 py-0.5 rounded border border-slate-800 transition"
                              title="Pesquisar este processo em tempo real nos tribunais via DataJud/PJe"
                            >
                              <Search className="w-3 h-3 text-blue-400" />
                              Buscar no Tribunal
                            </button>
                            <span>•</span>
                            <span className="text-slate-300 font-medium">
                              <strong>Autor:</strong> {mov.processActiveParty} x <strong>Réu:</strong> {mov.processPassiveParty}
                            </span>
                            <span>•</span>
                            <span className="text-slate-400">
                              {mov.processCourt} • {mov.organ || mov.processVara}
                            </span>
                          </div>
                        </div>

                        {/* Top Right Actions */}
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleCopyText(mov.id, `${mov.title}\n\n${mov.description}\n\nProcesso CNJ: ${mov.processCnj}`)}
                            className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition border border-slate-700"
                            title="Copiar texto oficial da publicação"
                          >
                            {isCopied ? (
                              <>
                                <Check className="w-3.5 h-3.5 text-emerald-400" />
                                <span className="text-emerald-400 font-bold">Copiado!</span>
                              </>
                            ) : (
                              <>
                                <Copy className="w-3.5 h-3.5" />
                                <span>Copiar Texto</span>
                              </>
                            )}
                          </button>

                          <button
                            onClick={() => {
                              onSelectProcessId(mov.processId);
                              setViewMode('process');
                            }}
                            className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-amber-400 rounded-lg text-xs font-semibold flex items-center gap-1 cursor-pointer transition border border-slate-700"
                            title="Abrir linha do tempo do processo"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>Ver Autos</span>
                          </button>
                        </div>
                      </div>

                      {/* Official Text Content Box */}
                      <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
                        <div className="flex items-center justify-between text-[11px] text-slate-500 font-semibold uppercase tracking-wider">
                          <span>Texto Oficial dos Autos / Publicação Diário de Justiça:</span>
                          <span>Órgão: {mov.organ || mov.processVara}</span>
                        </div>
                        <p className="text-xs sm:text-sm text-slate-200 leading-relaxed text-justify whitespace-pre-wrap font-sans">
                          {mov.description}
                        </p>
                      </div>

                      {/* AI Analysis Box */}
                      {mov.aiAnalysis ? (
                        <div className="bg-slate-950/90 border border-amber-500/30 rounded-xl p-4 space-y-3 text-xs">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-amber-400 flex items-center gap-1.5 text-xs sm:text-sm">
                              <Sparkles className="w-4 h-4" /> Inteligência Jurídica & Providências:
                            </span>
                            {mov.aiAnalysis.urgency && (
                              <span className={`text-[10px] px-2.5 py-0.5 rounded font-extrabold uppercase tracking-wide ${
                                mov.aiAnalysis.urgency === 'fatal' || mov.aiAnalysis.urgency === 'alta'
                                  ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30 animate-pulse'
                                  : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                              }`}>
                                Urgência: {mov.aiAnalysis.urgency}
                              </span>
                            )}
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1">
                            <div className="bg-slate-900 p-3 rounded-lg border border-slate-800 space-y-1">
                              <span className="font-bold text-amber-300 text-[11px] block">Resumo Técnico Processual:</span>
                              <p className="text-slate-300 text-xs leading-relaxed">{mov.aiAnalysis.summary}</p>
                            </div>

                            <div className="bg-slate-900 p-3 rounded-lg border border-slate-800 space-y-1">
                              <span className="font-bold text-emerald-300 text-[11px] block">Explicação em Linguagem Simples:</span>
                              <p className="text-slate-300 text-xs leading-relaxed">{mov.aiAnalysis.clientExplanation}</p>
                            </div>

                            <div className="bg-slate-900 p-3 rounded-lg border border-slate-800 space-y-1">
                              <span className="font-bold text-blue-300 text-[11px] block">Providência & Próximo Passo:</span>
                              <p className="text-slate-300 text-xs leading-relaxed">{mov.aiAnalysis.recommendedAction}</p>
                            </div>
                          </div>

                          {/* Quick Action Footer Buttons */}
                          <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-800/80">
                            <div className="flex flex-wrap items-center gap-2">
                              <button
                                onClick={() => handleCreateDeadlineFromMovement(mov.processId, mov)}
                                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg font-semibold text-xs flex items-center gap-1.5 cursor-pointer shadow-sm"
                              >
                                <Calendar className="w-3.5 h-3.5 text-amber-400" />
                                Lançar Prazo Fatal na Agenda ({mov.aiAnalysis.deadlineDays || 15} dias)
                              </button>

                              <button
                                onClick={() => {
                                  const proc = processes.find((p) => p.id === mov.processId);
                                  if (proc) onOpenDocumentGeneratorForProcess(proc);
                                }}
                                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-amber-300 border border-slate-700 rounded-lg font-semibold text-xs flex items-center gap-1.5 cursor-pointer shadow-sm"
                              >
                                <FileText className="w-3.5 h-3.5 text-amber-400" />
                                Gerar Peça / Procuração
                              </button>
                            </div>

                            {mov.aiAnalysis.suggestedWhatsApp && (
                              <button
                                onClick={() => handleSendWhatsApp(mov.aiAnalysis!.suggestedWhatsApp)}
                                className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-md shadow-emerald-950/40"
                              >
                                <MessageSquare className="w-3.5 h-3.5" />
                                Notificar Cliente no WhatsApp
                              </button>
                            )}
                          </div>
                        </div>
                      ) : (
                        <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-slate-800/60">
                          <button
                            onClick={() => handleAnalyzeMovement(mov.processId, mov)}
                            disabled={isAnalyzing}
                            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-amber-300 border border-amber-500/30 rounded-lg text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition"
                          >
                            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                            {isAnalyzing ? 'Analisando Publicação com IA...' : 'Interpretar com IA & Sugerir Providência'}
                          </button>

                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleCreateDeadlineFromMovement(mov.processId, mov)}
                              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-medium flex items-center gap-1 cursor-pointer"
                            >
                              <Calendar className="w-3.5 h-3.5 text-amber-400" /> Lançar Prazo
                            </button>

                            <button
                              onClick={() => onDeleteMovement(mov.processId, mov.id)}
                              className="text-slate-600 hover:text-red-400 p-1.5 rounded transition cursor-pointer"
                              title="Excluir andamento"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODE 2: VISÃO POR PROCESSO INDIVIDUAL                                    */}
      {/* ========================================================================= */}
      {viewMode === 'process' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Side: Process List (4 cols) */}
          <div className="lg:col-span-4 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                <Scale className="w-4 h-4 text-amber-400" />
                Processos Cadastrados ({processes.length})
              </h3>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setViewMode('search')}
                  className="text-xs bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2.5 py-1 rounded-lg font-bold flex items-center gap-1 cursor-pointer transition shadow-sm"
                  title="Executar busca automática no CNJ / Tribunais"
                >
                  <Brain className="w-3.5 h-3.5 text-amber-400" /> Busca Automática
                </button>
                <button
                  onClick={handleOpenNewProcessModal}
                  className="text-xs text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 px-2.5 py-1 rounded-lg font-semibold flex items-center gap-1 cursor-pointer border border-slate-700"
                >
                  <Plus className="w-3 h-3 text-amber-400" /> Novo
                </button>
              </div>
            </div>

            {/* Quick Status Tag Filter Panel */}
            <div className="bg-slate-905 border border-slate-800 p-3 rounded-xl space-y-2">
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider flex items-center gap-1">
                <Filter className="w-3.5 h-3.5 text-amber-400" /> Filtro Rápido por Etiqueta
              </span>
              <div className="flex flex-wrap gap-1.5">
                <button
                  onClick={() => setSelectedTagFilter(null)}
                  className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition cursor-pointer ${
                    selectedTagFilter === null
                      ? 'bg-amber-500 text-slate-950 font-extrabold'
                      : 'bg-slate-950 text-slate-400 hover:bg-slate-800 border border-slate-850'
                  }`}
                >
                  Todas ({processes.length})
                </button>
                {allUniqueTags.map((tag) => {
                  const count = processes.filter((p) => p.tags && p.tags.includes(tag)).length;
                  return (
                    <button
                      key={tag}
                      onClick={() => setSelectedTagFilter(tag)}
                      className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition cursor-pointer flex items-center gap-1 ${
                        selectedTagFilter === tag
                          ? 'bg-amber-500 text-slate-950 font-extrabold'
                          : 'bg-slate-950 text-slate-400 hover:bg-slate-800 border border-slate-850'
                      }`}
                    >
                      🏷️ {tag} {count > 0 && `(${count})`}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-2.5 max-h-[750px] overflow-y-auto pr-1">
              {filteredProcessesByTag.length === 0 ? (
                <div className="p-8 text-center text-slate-500 text-xs italic">
                  Nenhum processo com esta etiqueta cadastrada.
                </div>
              ) : (
                filteredProcessesByTag.map((proc) => {
                  const isSelected = proc.id === currentProcess?.id;
                  const lastMov = proc.movements[0];

                  return (
                    <div
                      key={proc.id}
                      onClick={() => onSelectProcessId(proc.id)}
                      className={`p-4 rounded-xl border transition cursor-pointer space-y-2.5 ${
                        isSelected
                          ? 'bg-slate-850 border-amber-500/60 shadow-md shadow-amber-950/30 ring-1 ring-amber-500/20'
                          : 'bg-slate-900 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <span 
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeepLinkSearch(proc.cnjNumber);
                          }}
                          className="font-mono text-xs font-bold text-amber-400 hover:text-amber-300 hover:underline cursor-pointer flex items-center gap-1 group transition"
                          title="Clique para pesquisar este processo em tempo real nos tribunais"
                        >
                          {proc.cnjNumber}
                          <Search className="w-3 h-3 text-amber-400 opacity-0 group-hover:opacity-100 transition" />
                        </span>
                        <span className={`text-[10px] px-2 py-0.5 rounded font-semibold ${
                          proc.status === 'Ativo'
                            ? 'bg-emerald-500/20 text-emerald-300'
                            : proc.status === 'Sentenciado'
                            ? 'bg-blue-500/20 text-blue-300'
                            : 'bg-slate-800 text-slate-400'
                        }`}>
                          {proc.status}
                        </span>
                      </div>

                      <div>
                        <h4 className="text-xs font-bold text-slate-100 line-clamp-1">
                          {proc.activeParty} <span className="text-slate-500 font-normal">vs</span> {proc.passiveParty}
                        </h4>
                        <p className="text-[11px] text-slate-400 line-clamp-1 mt-0.5">
                          {proc.court}
                        </p>
                      </div>

                      {/* Display tags inside card */}
                      {proc.tags && proc.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {proc.tags.map((t) => (
                            <span key={t} className="px-1.5 py-0.5 rounded bg-amber-500/10 border border-amber-500/20 text-[8px] font-bold text-amber-300 uppercase">
                              {t}
                            </span>
                          ))}
                        </div>
                      )}

                      {lastMov && (
                        <div className="bg-slate-950/70 p-2 rounded-lg border border-slate-800/80 text-[11px] space-y-1">
                          <div className="flex items-center justify-between text-slate-400">
                            <span className="font-semibold text-slate-300 truncate max-w-[170px]">
                              {lastMov.title}
                            </span>
                          <span className="text-[10px]">
                            {new Date(lastMov.date).toLocaleDateString('pt-BR')}
                          </span>
                        </div>
                      </div>
                    )}

                    <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1 border-t border-slate-800/60">
                      <span>{formatCurrencyBRL(proc.value)}</span>
                      <span className="text-amber-400 font-semibold flex items-center gap-0.5">
                        {proc.movements.length} andamentos <ChevronRight className="w-3 h-3" />
                      </span>
                    </div>
                  </div>
                );
              })
            )}
            </div>
          </div>

          {/* Right Side: Selected Process Details & Movements (8 cols) */}
          <div className="lg:col-span-8 space-y-4">
            {currentProcess ? (
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-5">
                {/* Process Header & Actions */}
                <div className="flex flex-wrap items-start justify-between gap-4 pb-4 border-b border-slate-800">
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2.5">
                      <span className="text-sm sm:text-base font-mono font-extrabold text-amber-400">
                        {currentProcess.cnjNumber}
                      </span>
                      <button
                        onClick={() => handleDeepLinkSearch(currentProcess.cnjNumber)}
                        className="px-2 py-1 bg-amber-500 text-slate-950 font-black hover:bg-amber-400 rounded-lg text-[10px] flex items-center gap-1 transition cursor-pointer shadow-sm shadow-amber-950/20"
                        title="Buscar andamentos em tempo real nos Tribunais via DataJud/PJe"
                      >
                        <Search className="w-3 h-3 text-slate-950 font-extrabold" />
                        Buscar nos Tribunais (Ao Vivo)
                      </button>
                      <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-semibold border border-emerald-500/30">
                        {currentProcess.status}
                      </span>
                    </div>
                    <h3 className="text-base font-bold text-slate-100">
                      {currentProcess.activeParty} <span className="text-slate-500 font-normal">x</span> {currentProcess.passiveParty}
                    </h3>
                    <p className="text-xs text-slate-400">
                      {currentProcess.court} • {currentProcess.branchVara}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      onClick={() => handleOpenEditProcessModal(currentProcess)}
                      disabled={activeUser?.privilege === 'leitura'}
                      className={`px-3 py-1.5 border rounded-lg text-xs font-semibold flex items-center gap-1.5 transition ${
                        activeUser?.privilege === 'leitura'
                          ? 'bg-slate-850 text-slate-500 border-slate-800 cursor-not-allowed'
                          : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700 cursor-pointer'
                      }`}
                      title={activeUser?.privilege === 'leitura' ? 'Edição bloqueada' : 'Editar informações do processo'}
                    >
                      <Edit3 className={`w-3.5 h-3.5 ${activeUser?.privilege === 'leitura' ? 'text-slate-600' : 'text-amber-400'}`} />
                      Editar Processo
                    </button>

                    <button
                      onClick={() => handleOpenSubstabelecerModal(currentProcess)}
                      disabled={activeUser?.privilege === 'leitura'}
                      className={`px-3 py-1.5 border rounded-lg text-xs font-semibold flex items-center gap-1.5 transition ${
                        activeUser?.privilege === 'leitura'
                          ? 'bg-slate-850 text-slate-500 border-slate-800 cursor-not-allowed'
                          : 'bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 border-blue-500/40 cursor-pointer'
                      }`}
                      title={activeUser?.privilege === 'leitura' ? 'Substabelecimento bloqueado' : 'Mudar ou substabelecer advogado'}
                    >
                      <Users className={`w-3.5 h-3.5 ${activeUser?.privilege === 'leitura' ? 'text-slate-600' : 'text-blue-400'}`} />
                      Substabelecer Poderes
                    </button>

                    <button
                      onClick={() => setDeleteProcessConfirm({ isOpen: true, process: currentProcess })}
                      disabled={activeUser?.privilege === 'leitura'}
                      className={`px-3 py-1.5 border rounded-lg text-xs font-semibold flex items-center gap-1.5 transition ${
                        activeUser?.privilege === 'leitura'
                          ? 'bg-slate-850 text-slate-500 border-slate-800 cursor-not-allowed'
                          : 'bg-red-950/30 hover:bg-red-900/50 text-red-400 border-red-800/40 cursor-pointer'
                      }`}
                      title={activeUser?.privilege === 'leitura' ? 'Exclusão bloqueada' : 'Excluir este processo'}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Excluir
                    </button>

                    <button
                      onClick={() => onOpenDocumentGeneratorForProcess(currentProcess)}
                      disabled={activeUser?.privilege === 'leitura'}
                      className={`px-3 py-1.5 border rounded-lg text-xs font-semibold transition flex items-center gap-1.5 ${
                        activeUser?.privilege === 'leitura'
                          ? 'bg-slate-850 text-slate-500 border-slate-800 cursor-not-allowed'
                          : 'bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border-amber-500/40 cursor-pointer'
                      }`}
                      title={activeUser?.privilege === 'leitura' ? 'Ação bloqueada' : 'Emitir Procuração ou Contrato'}
                    >
                      <FileText className="w-3.5 h-3.5" />
                      Gerar Procuração / Contrato
                    </button>

                    <button
                      onClick={() => onOpenDeclaracaoGeneratorForProcess && onOpenDeclaracaoGeneratorForProcess(currentProcess)}
                      disabled={activeUser?.privilege === 'leitura'}
                      className={`px-3 py-1.5 border rounded-lg text-xs font-semibold transition flex items-center gap-1.5 ${
                        activeUser?.privilege === 'leitura'
                          ? 'bg-slate-850 text-slate-500 border-slate-800 cursor-not-allowed'
                          : 'bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border-emerald-500/40 cursor-pointer'
                      }`}
                      title={activeUser?.privilege === 'leitura' ? 'Ação bloqueada' : 'Gerar Declaração de Hipossuficiência'}
                    >
                      <ShieldCheck className={`w-3.5 h-3.5 ${activeUser?.privilege === 'leitura' ? 'text-slate-600' : 'text-emerald-400'}`} />
                      Gerar Declaração de Hipossuficiência
                    </button>
                  </div>
                </div>

                {/* Subtabs for process */}
                <div className="flex flex-wrap items-center gap-2 border-b border-slate-800 pb-2 text-xs">
                  <button
                    onClick={() => setActiveProcessTab('movements')}
                    className={`px-3 py-1.5 rounded-lg font-medium transition cursor-pointer ${
                      activeProcessTab === 'movements'
                        ? 'bg-amber-500 text-slate-950 font-bold'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    Linha do Tempo dos Andamentos ({currentProcess.movements.length})
                  </button>
                  <button
                    onClick={() => setActiveProcessTab('details')}
                    className={`px-3 py-1.5 rounded-lg font-medium transition cursor-pointer ${
                      activeProcessTab === 'details'
                        ? 'bg-amber-500 text-slate-950 font-bold'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    Dados Cadastrais & Partes
                  </button>
                  <button
                    onClick={() => setActiveProcessTab('jurisprudence')}
                    className={`px-3 py-1.5 rounded-lg font-medium transition cursor-pointer flex items-center gap-1 ${
                      activeProcessTab === 'jurisprudence'
                        ? 'bg-amber-500 text-slate-950 font-bold'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    Pesquisa de Jurisprudência IA
                  </button>
                </div>

                {/* Process tags and quick status manager */}
                <div className="flex flex-wrap items-center gap-2 py-2 bg-slate-950 px-3 rounded-xl border border-slate-800/80">
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider flex items-center gap-1">
                    🏷️ Etiquetas de Status:
                  </span>
                  {(currentProcess.tags || []).length === 0 ? (
                    <span className="text-[10px] text-slate-500 italic">Nenhuma etiqueta cadastrada</span>
                  ) : (
                    (currentProcess.tags || []).map((tag) => (
                      <span
                        key={tag}
                        className="inline-flex items-center gap-1 bg-amber-500/10 border border-amber-500/20 text-[10px] font-bold text-amber-300 px-2.5 py-0.5 rounded-full"
                      >
                        {tag}
                        <button
                          onClick={() => {
                            const updatedTags = (currentProcess.tags || []).filter((t) => t !== tag);
                            onUpdateProcess({ ...currentProcess, tags: updatedTags });
                          }}
                          className="hover:text-red-400 font-black cursor-pointer ml-1 text-[11px] focus:outline-none"
                          title="Remover etiqueta"
                        >
                          ×
                        </button>
                      </span>
                    ))
                  )}

                  {/* Add Tag Select / Form */}
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      const form = e.currentTarget;
                      const input = form.elements.namedItem('newTagInput') as HTMLInputElement;
                      const val = input.value.trim();
                      if (val) {
                        const existingTags = currentProcess.tags || [];
                        if (!existingTags.includes(val)) {
                          onUpdateProcess({ ...currentProcess, tags: [...existingTags, val] });
                        }
                        input.value = '';
                      }
                    }}
                    className="flex items-center gap-1.5 ml-auto w-full sm:w-auto mt-2 sm:mt-0"
                  >
                    <input
                      type="text"
                      name="newTagInput"
                      placeholder="Criar/Adicionar etiqueta..."
                      className="px-2 py-1 bg-slate-900 border border-slate-700 rounded-lg text-[10px] text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-500 w-full sm:w-44"
                    />
                    <button
                      type="submit"
                      className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg text-[10px] font-bold cursor-pointer transition whitespace-nowrap"
                    >
                      + Add
                    </button>
                  </form>
                </div>

                {/* Tab 1: Movements Timeline */}
                {activeProcessTab === 'movements' && (
                  <div className="space-y-4">
                    <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-400">
                      <span>Movimentações cronológicas oficiais da base de dados judicial</span>
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => handleOpenAddMovementModal(currentProcess.id)}
                          className="px-2.5 py-1 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 rounded-lg font-semibold text-xs flex items-center gap-1.5 cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          Lançar Andamento Manual
                        </button>
                        <span className="text-amber-400 font-medium hidden sm:inline">
                          Última sincronização: {new Date(currentProcess.lastSyncDate).toLocaleTimeString('pt-BR')}
                        </span>
                      </div>
                    </div>

                    <div className="space-y-4 relative before:absolute before:left-4 before:top-3 before:bottom-3 before:w-0.5 before:bg-slate-800">
                      {currentProcess.movements.map((mov, mIdx) => {
                        const isAnalyzing = analyzingMovementId === mov.id;

                        return (
                          <div key={`${currentProcess.id}-${mov.id}-${mIdx}`} className="relative pl-10 space-y-2.5">
                            {/* Timeline dot */}
                            <div className={`absolute left-2.5 top-1.5 -translate-x-1/2 w-3.5 h-3.5 rounded-full border-2 ${
                              mov.isJudicialDecision
                                ? 'bg-amber-500 border-slate-900 shadow-md shadow-amber-500/50 ring-2 ring-amber-500/30'
                                : 'bg-slate-700 border-slate-900'
                            }`}></div>

                            {/* Movement card */}
                            <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-3">
                              <div className="flex flex-wrap items-start justify-between gap-2">
                                <div>
                                  <div className="flex flex-wrap items-center gap-2">
                                    <span className="text-xs font-semibold text-slate-400">
                                      {new Date(mov.date).toLocaleDateString('pt-BR', {
                                        day: '2-digit',
                                        month: 'long',
                                        year: 'numeric',
                                        hour: '2-digit',
                                        minute: '2-digit',
                                      })}
                                    </span>
                                    {mov.isJudicialDecision && (
                                      <span className="text-[10px] px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 font-bold border border-amber-500/30">
                                        Decisão Judicial / Despacho
                                      </span>
                                    )}
                                    {(() => {
                                      const tendency = mov.tendency || mov.aiAnalysis?.tendency || classifyMovementTendencyLocal(mov.title, mov.description);
                                      if (tendency === 'Positiva') {
                                        return (
                                          <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-400 font-bold border border-emerald-500/30 flex items-center gap-1">
                                            <TrendingUp className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                                            Tendência: Positiva
                                          </span>
                                        );
                                      } else if (tendency === 'Negativa') {
                                        return (
                                          <span className="text-[10px] px-2 py-0.5 rounded bg-rose-500/15 text-rose-400 font-bold border border-rose-500/30 flex items-center gap-1">
                                            <TrendingDown className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                                            Tendência: Negativa
                                          </span>
                                        );
                                      } else {
                                        return (
                                          <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-bold border border-slate-700 flex items-center gap-1">
                                            <Scale className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                            Tendência: Neutra
                                          </span>
                                        );
                                      }
                                    })()}
                                  </div>
                                  <h4 className="text-sm font-bold text-slate-100 mt-1">
                                    {mov.title}
                                  </h4>
                                </div>

                                <div className="flex items-center gap-2">
                                  <span className="text-[10px] text-slate-500 font-mono">
                                    Código: {mov.code}
                                  </span>
                                  <button
                                    onClick={() => onDeleteMovement(currentProcess.id, mov.id)}
                                    className="text-slate-600 hover:text-red-400 p-1 rounded transition cursor-pointer"
                                    title="Excluir este andamento"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </div>

                              <p className="text-xs text-slate-300 bg-slate-900/80 p-3 rounded-lg border border-slate-800/80 leading-relaxed text-justify whitespace-pre-wrap">
                                {mov.description}
                              </p>

                              {/* AI analysis result if present */}
                              {mov.aiAnalysis ? (
                                <div className="bg-slate-900/90 border border-amber-500/30 rounded-xl p-3.5 space-y-2.5 text-xs">
                                  <div className="flex items-center justify-between">
                                    <span className="font-bold text-amber-400 flex items-center gap-1.5">
                                      <Sparkles className="w-3.5 h-3.5" /> Análise com IA Jurídica:
                                    </span>
                                    <div className="flex items-center gap-2">
                                      {mov.aiAnalysis.tendency && (
                                        <span className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase ${
                                          mov.aiAnalysis.tendency === 'Positiva'
                                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                            : mov.aiAnalysis.tendency === 'Negativa'
                                            ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                                            : 'bg-slate-800 text-slate-300 border border-slate-700'
                                        }`}>
                                          Tendência: {mov.aiAnalysis.tendency}
                                        </span>
                                      )}
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
                                  </div>

                                  <div className="space-y-1">
                                    <p className="text-slate-200">
                                      <strong>Resumo Técnico:</strong> {mov.aiAnalysis.summary}
                                    </p>
                                    <p className="text-slate-300 bg-slate-950 p-2 rounded border border-slate-800 text-[11px]">
                                      <strong>Explicação para o Cliente:</strong> {mov.aiAnalysis.clientExplanation}
                                    </p>
                                    <p className="text-amber-300 text-[11px]">
                                      <strong>Providência Recomendada:</strong> {mov.aiAnalysis.recommendedAction}
                                    </p>
                                  </div>

                                  {/* Quick WhatsApp & Calendar Buttons */}
                                  <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-800">
                                    <button
                                      onClick={() => handleCreateDeadlineFromMovement(currentProcess.id, mov)}
                                      className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded font-semibold text-xs flex items-center gap-1 cursor-pointer"
                                    >
                                      <Calendar className="w-3 h-3 text-amber-400" />
                                      Agendar Prazo na Pauta ({mov.aiAnalysis.deadlineDays || 15} dias)
                                    </button>

                                    <button
                                      onClick={() => handleSendWhatsApp(mov.aiAnalysis!.suggestedWhatsApp)}
                                      className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow"
                                      title="Enviar mensagem profissional gerada pela IA direto no WhatsApp do cliente"
                                    >
                                      <MessageSquare className="w-3.5 h-3.5" />
                                      Avisar Cliente no WhatsApp
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                <div className="flex items-center justify-between pt-1">
                                  <button
                                    onClick={() => handleAnalyzeMovement(currentProcess.id, mov)}
                                    disabled={isAnalyzing}
                                    className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-amber-300 border border-amber-500/30 rounded-lg text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition"
                                  >
                                    <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                                    {isAnalyzing ? 'Analisando Juridiquês com IA...' : 'Analisar com IA Jurídica'}
                                  </button>

                                  <button
                                    onClick={() => handleCreateDeadlineFromMovement(currentProcess.id, mov)}
                                    className="text-xs text-slate-400 hover:text-slate-200 flex items-center gap-1 cursor-pointer"
                                  >
                                    <Calendar className="w-3.5 h-3.5" /> Lançar Prazo
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Tab 2: Process Details & Parties */}
                {activeProcessTab === 'details' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                    <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3">
                      <h4 className="font-bold text-slate-200 text-sm flex items-center gap-2">
                        <Scale className="w-4 h-4 text-amber-400" />
                        Dados Judiciais
                      </h4>
                      <div className="space-y-1.5 text-slate-300">
                        <p><strong>Tribunal:</strong> {currentProcess.court}</p>
                        <p><strong>Vara/Órgão Julgador:</strong> {currentProcess.branchVara}</p>
                        <p><strong>Comarca:</strong> {currentProcess.comarca}</p>
                        <p><strong>Classe / Rito:</strong> {currentProcess.lawsuitType}</p>
                        <p><strong>Assunto Principal:</strong> {currentProcess.subject}</p>
                        <p><strong>Valor da Causa:</strong> {formatCurrencyBRL(currentProcess.value)}</p>
                        <p><strong>Data de Distribuição:</strong> {new Date(currentProcess.distributionDate + 'T12:00:00').toLocaleDateString('pt-BR')}</p>
                        {currentProcess.judge && <p><strong>Juiz(a) Titular:</strong> {currentProcess.judge}</p>}
                      </div>
                    </div>

                    <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3">
                      <h4 className="font-bold text-slate-200 text-sm flex items-center gap-2">
                        <User className="w-4 h-4 text-emerald-400" />
                        Partes e Advogado Responsável
                      </h4>
                      <div className="space-y-1.5 text-slate-300">
                        <p><strong>Polo Ativo (Autor):</strong> {currentProcess.activeParty}</p>
                        <p><strong>Polo Passivo (Réu):</strong> {currentProcess.passiveParty}</p>
                        <p><strong>Advogado Responsável:</strong> {currentProcess.responsibleLawyer}</p>
                        <p><strong>Observações Internas:</strong> {currentProcess.notes || 'Sem observações adicionais.'}</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Tab 3: Jurisprudence Search with Google Grounded Search */}
                {activeProcessTab === 'jurisprudence' && (
                  <div className="space-y-5">
                    <div className="bg-slate-950 p-5 rounded-2xl border border-slate-800 space-y-4">
                      <div>
                        <h4 className="text-sm font-bold text-slate-100 flex items-center gap-1.5">
                          <Brain className="w-4 h-4 text-amber-400" />
                          Pesquisa de Precedentes & Jurisprudência (Google Grounded Search)
                        </h4>
                        <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                          Consulte os entendimentos mais recentes do STF, STJ, TJs e TRTs em tempo real utilizando o buscador de IA.
                          Os resultados serão baseados em consultas ao vivo indexadas na web.
                        </p>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                        <div className="sm:col-span-3 space-y-1">
                          <label className="text-[10px] text-slate-400 font-bold uppercase">Termo / Assunto de Pesquisa</label>
                          <input
                            type="text"
                            value={jurisprudenceQuery}
                            onChange={(e) => setJurisprudenceQuery(e.target.value)}
                            placeholder="Ex: indenização por dano moral atraso de voo overbooking"
                            className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-500"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] text-slate-400 font-bold uppercase">Tribunal Alvo</label>
                          <input
                            type="text"
                            value={jurisprudenceCourt}
                            onChange={(e) => setJurisprudenceCourt(e.target.value)}
                            placeholder="Ex: TJSP, STJ, TRT2"
                            className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-500"
                          />
                        </div>
                      </div>

                      <div className="flex justify-end gap-2 pt-1">
                        <button
                          onClick={() => {
                            if (currentProcess) {
                              setJurisprudenceQuery(currentProcess.subject || '');
                              const courtPart = currentProcess.court ? currentProcess.court.split(' ')[0] : '';
                              setJurisprudenceCourt(courtPart);
                            }
                          }}
                          className="px-3 py-2 bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 rounded-xl text-xs font-semibold cursor-pointer transition"
                        >
                          Restaurar Original
                        </button>
                        <button
                          onClick={handleSearchJurisprudence}
                          disabled={isSearchingJurisprudence || !jurisprudenceQuery.trim()}
                          className="px-4 py-2 bg-amber-500 hover:bg-amber-400 disabled:bg-slate-800 disabled:text-slate-500 text-slate-950 font-bold rounded-xl text-xs flex items-center gap-1.5 cursor-pointer transition shadow-md shadow-amber-950/20"
                        >
                          {isSearchingJurisprudence ? (
                            <>
                              <div className="w-3.5 h-3.5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin"></div>
                              <span>Pesquisando no Google...</span>
                            </>
                          ) : (
                            <>
                              <Search className="w-3.5 h-3.5 text-slate-950 font-extrabold" />
                              <span>Buscar Jurisprudência Ao Vivo</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>

                    {isSearchingJurisprudence && (
                      <div className="bg-slate-950 border border-slate-800 rounded-2xl p-8 text-center space-y-3">
                        <div className="w-8 h-8 border-3 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
                        <p className="text-xs text-slate-300 font-semibold">Consultando base de dados do Google Search e Tribunais...</p>
                        <p className="text-[11px] text-slate-500">Mapeando acórdãos recentes, recursos especiais repetitivos, súmulas e ementas correlatas.</p>
                      </div>
                    )}

                    {jurisprudenceError && (
                      <div className="bg-rose-500/10 border border-rose-500/30 rounded-xl p-4 text-xs text-rose-300 flex items-start gap-2">
                        <div className="bg-rose-500/20 p-1 rounded">⚠️</div>
                        <div className="space-y-1">
                          <p className="font-bold">Erro ao realizar pesquisa de jurisprudência:</p>
                          <p>{jurisprudenceError}</p>
                          <button
                            onClick={handleSearchJurisprudence}
                            className="underline font-bold text-rose-400 hover:text-rose-300 block mt-1"
                          >
                            Tentar novamente
                          </button>
                        </div>
                      </div>
                    )}

                    {jurisprudenceResults && !isSearchingJurisprudence && (
                      <div className="space-y-5">
                        {/* Synthesis & Strategic Thesis */}
                        <div className="grid grid-cols-1 md:grid-cols-1 gap-4">
                          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2.5">
                            <span className="text-[10px] text-amber-400 font-bold uppercase tracking-wider flex items-center gap-1">
                              ⚖️ Entendimento Jurisprudencial Dominante (Síntese)
                            </span>
                            <div className="text-slate-300 text-xs leading-relaxed whitespace-pre-wrap font-sans text-justify">
                              {jurisprudenceResults.synthesis}
                            </div>
                          </div>

                          <div className="bg-gradient-to-r from-emerald-950/10 to-slate-950 p-4 rounded-xl border border-emerald-500/30 space-y-2">
                            <span className="text-[10px] text-emerald-400 font-extrabold uppercase tracking-wider flex items-center gap-1">
                              🛡️ Tese Jurídica e Estratégia Sugerida para Peça
                            </span>
                            <p className="text-slate-200 text-xs leading-relaxed font-medium">
                              {jurisprudenceResults.recommendedThesis}
                            </p>
                          </div>
                        </div>

                        {/* Precedents Section */}
                        <div className="space-y-3.5">
                          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
                            📂 Acórdãos e Precedentes Recentes Encontrados ({jurisprudenceResults.precedents?.length || 0})
                          </span>

                          <div className="space-y-4">
                            {jurisprudenceResults.precedents?.map((prec, pIdx) => (
                              <div key={pIdx} className="bg-slate-950 rounded-xl border border-slate-800/80 p-4 space-y-3">
                                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-900 pb-2">
                                  <div className="space-y-0.5">
                                    <span className="text-[10px] px-2 py-0.5 rounded bg-amber-500/10 text-amber-300 font-bold border border-amber-500/20 mr-2">
                                      {prec.court}
                                    </span>
                                    <span className="font-mono text-xs text-slate-200 font-extrabold">
                                      {prec.caseNumber}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-3 text-[10px] text-slate-400">
                                    {prec.relator && (
                                      <span><strong>Relator(a):</strong> {prec.relator}</span>
                                    )}
                                    <span>•</span>
                                    <span><strong>Julgamento:</strong> {prec.judgmentDate}</span>
                                  </div>
                                </div>

                                <div className="space-y-1">
                                  <span className="text-[10px] text-slate-500 font-bold uppercase block">Ementa / Tese Firmada:</span>
                                  <p className="text-slate-300 text-xs leading-relaxed">
                                    {prec.thesis}
                                  </p>
                                </div>

                                <div className="bg-slate-900/60 p-3 rounded-lg border border-slate-800 text-[11px] space-y-1">
                                  <span className="text-[9px] text-slate-500 font-bold uppercase block">Trecho de Destaque:</span>
                                  <p className="text-slate-400 italic leading-relaxed text-justify whitespace-pre-wrap">
                                    "{prec.excerpt}"
                                  </p>
                                </div>

                                {prec.url && (
                                  <div className="flex justify-end pt-1">
                                    <a
                                      href={prec.url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      referrerPolicy="no-referrer"
                                      className="inline-flex items-center gap-1 text-[10px] text-amber-400 hover:text-amber-300 font-bold transition hover:underline"
                                    >
                                      <span>Visualizar Acórdão / Fonte</span>
                                      <span className="text-xs">↗</span>
                                    </a>
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Suggested Keywords tags */}
                        {jurisprudenceResults.searchKeywords && jurisprudenceResults.searchKeywords.length > 0 && (
                          <div className="flex flex-wrap items-center gap-1.5 py-2 bg-slate-950 px-3 rounded-xl border border-slate-800/80">
                            <span className="text-[10px] text-slate-400 font-bold uppercase mr-1">Palavras-chave de Pesquisa Adicional:</span>
                            {jurisprudenceResults.searchKeywords.map((kw, kwIdx) => (
                              <span
                                key={kwIdx}
                                className="px-2 py-0.5 rounded-md bg-slate-900 border border-slate-800 text-[10px] text-slate-300 font-medium cursor-pointer hover:bg-slate-800 transition"
                                onClick={() => {
                                  setJurisprudenceQuery(kw);
                                }}
                                title="Clique para carregar termo de pesquisa"
                              >
                                {kw}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center text-slate-400 space-y-3">
                <Scale className="w-10 h-10 text-slate-600 mx-auto" />
                <p className="text-sm">Selecione um processo ao lado para visualizar os andamentos ou faça uma busca online.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODE 3: CONSULTA E COLETA ONLINE DATAJUD / CNJ & TRIBUNAIS (TJDFT, TRF1, TRT10, STJ, ETC) */}
      {/* ========================================================================= */}
      {viewMode === 'search' && (
        <AdvancedOnlineSearch
          onImportProcess={handleImportProcess}
          clients={clients}
          initialQuery={onlineSearchQuery}
        />
      )}

      {/* ========================================================================= */}
      {/* MODE 4: INTERACTIVE COURT COSTS & RISKS CALCULATOR                        */}
      {/* ========================================================================= */}
      {viewMode === 'calculator' && (
        <CourtCostsCalculator processes={processes} officeName={office?.officeName} />
      )}

      {/* Modal: Process Form (Create / Edit) */}
      {isProcessModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/80 backdrop-blur-sm flex justify-center items-center p-4">
          <div className="bg-slate-900 border border-slate-700 w-full max-w-2xl rounded-2xl p-6 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                <Scale className="w-5 h-5 text-amber-400" />
                {editingProcessId ? 'Editar Processo Judicial' : 'Cadastrar Novo Processo Judicial'}
              </h3>
              <button
                onClick={() => setIsProcessModalOpen(false)}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveProcess} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    Número do Processo (CNJ) *
                  </label>
                  <input
                    type="text"
                    required
                    value={processCnjNumber}
                    onChange={(e) => setProcessCnjNumber(e.target.value)}
                    placeholder="0000000-00.0000.0.00.0000"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-slate-100 focus:border-amber-500 focus:outline-none font-mono"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    Cliente Vinculado *
                  </label>
                  <select
                    value={processClientId}
                    onChange={(e) => {
                      setProcessClientId(e.target.value);
                      const c = clients.find((cli) => cli.id === e.target.value);
                      if (c) setProcessActiveParty(c.name);
                    }}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-slate-100 focus:border-amber-500 focus:outline-none"
                  >
                    {clients.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.cpfCnpj})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    Polo Ativo (Autor / Requerente) *
                  </label>
                  <input
                    type="text"
                    required
                    value={processActiveParty}
                    onChange={(e) => setProcessActiveParty(e.target.value)}
                    placeholder="Nome completo do autor"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-slate-100 focus:border-amber-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    Polo Passivo (Réu / Requerido) *
                  </label>
                  <input
                    type="text"
                    required
                    value={processPassiveParty}
                    onChange={(e) => setProcessPassiveParty(e.target.value)}
                    placeholder="Nome da parte ré"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-slate-100 focus:border-amber-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    Tribunal
                  </label>
                  <input
                    type="text"
                    value={processCourt}
                    onChange={(e) => setProcessCourt(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-slate-100 focus:border-amber-500 focus:outline-none"
                    placeholder="Ex: TJGO - Tribunal de Justiça do Estado de Goiás"
                  />
                  <div className="mt-1 flex flex-wrap gap-1">
                    <button
                      type="button"
                      onClick={() => {
                        setProcessCourt('TJGO - Tribunal de Justiça do Estado de Goiás');
                        setProcessComarca('Goiânia / GO');
                      }}
                      className="px-1.5 py-0.5 bg-slate-800 hover:bg-slate-700 text-[10px] text-amber-300 rounded border border-slate-700 hover:border-amber-500 transition cursor-pointer"
                    >
                      TJGO (Goiás)
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setProcessCourt('TJDFT - Tribunal de Justiça do Distrito Federal e dos Territórios');
                        setProcessComarca('Brasília / DF');
                      }}
                      className="px-1.5 py-0.5 bg-slate-800 hover:bg-slate-700 text-[10px] text-amber-300 rounded border border-slate-700 hover:border-amber-500 transition cursor-pointer"
                    >
                      TJDFT (DF)
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setProcessCourt('TRT10 - Tribunal Regional do Trabalho da 10ª Região (DF/TO)');
                        setProcessComarca('Brasília / DF');
                      }}
                      className="px-1.5 py-0.5 bg-slate-800 hover:bg-slate-700 text-[10px] text-amber-300 rounded border border-slate-700 hover:border-amber-500 transition cursor-pointer"
                    >
                      TRT10 (DF/TO)
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setProcessCourt('TRF1 - Tribunal Regional Federal da 1ª Região');
                        setProcessComarca('Goiânia / GO');
                      }}
                      className="px-1.5 py-0.5 bg-slate-800 hover:bg-slate-700 text-[10px] text-amber-300 rounded border border-slate-700 hover:border-amber-500 transition cursor-pointer"
                    >
                      TRF1
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setProcessCourt('STJ - Superior Tribunal de Justiça');
                        setProcessComarca('Brasília / DF');
                      }}
                      className="px-1.5 py-0.5 bg-slate-800 hover:bg-slate-700 text-[10px] text-amber-300 rounded border border-slate-700 hover:border-amber-500 transition cursor-pointer"
                    >
                      STJ
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setProcessCourt('STF - Supremo Tribunal Federal');
                        setProcessComarca('Brasília / DF');
                      }}
                      className="px-1.5 py-0.5 bg-slate-800 hover:bg-slate-700 text-[10px] text-amber-300 rounded border border-slate-700 hover:border-amber-500 transition cursor-pointer"
                    >
                      STF
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setProcessCourt('TJSP - Tribunal de Justiça de São Paulo');
                        setProcessComarca('São Paulo / SP');
                      }}
                      className="px-1.5 py-0.5 bg-slate-800 hover:bg-slate-700 text-[10px] text-amber-300 rounded border border-slate-700 hover:border-amber-500 transition cursor-pointer"
                    >
                      TJSP (SP)
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setProcessCourt('TRT2 - Tribunal Regional do Trabalho da 2ª Região (SP)');
                        setProcessComarca('São Paulo / SP');
                      }}
                      className="px-1.5 py-0.5 bg-slate-800 hover:bg-slate-700 text-[10px] text-amber-300 rounded border border-slate-700 hover:border-amber-500 transition cursor-pointer"
                    >
                      TRT2 (SP)
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    Vara / Órgão
                  </label>
                  <input
                    type="text"
                    value={processBranchVara}
                    onChange={(e) => setProcessBranchVara(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-slate-100 focus:border-amber-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    Comarca / Cidade
                  </label>
                  <input
                    type="text"
                    value={processComarca}
                    onChange={(e) => setProcessComarca(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-slate-100 focus:border-amber-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    Rito / Classe Processual
                  </label>
                  <input
                    type="text"
                    value={processLawsuitType}
                    onChange={(e) => setProcessLawsuitType(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-slate-100 focus:border-amber-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    Assunto Principal
                  </label>
                  <input
                    type="text"
                    value={processSubject}
                    onChange={(e) => setProcessSubject(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-slate-100 focus:border-amber-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    Valor da Causa (R$)
                  </label>
                  <input
                    type="number"
                    value={processValue}
                    onChange={(e) => setProcessValue(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-slate-100 focus:border-amber-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    Status do Processo
                  </label>
                  <select
                    value={processStatus}
                    onChange={(e) => setProcessStatus(e.target.value as any)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-slate-100 focus:border-amber-500 focus:outline-none"
                  >
                    <option value="Ativo">Ativo / Em Andamento</option>
                    <option value="Suspenso">Suspenso</option>
                    <option value="Sentenciado">Sentenciado</option>
                    <option value="Arquivado">Arquivado</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    Advogado Responsável
                  </label>
                  <input
                    type="text"
                    value={processLawyer}
                    onChange={(e) => setProcessLawyer(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-slate-100 focus:border-amber-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  Observações Internas e Estratégia
                </label>
                <textarea
                  rows={3}
                  value={processNotes}
                  onChange={(e) => setProcessNotes(e.target.value)}
                  placeholder="Informações estratégicas, teses jurídicas ou anotações..."
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-slate-100 focus:border-amber-500 focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsProcessModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg font-semibold cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-lg font-bold cursor-pointer"
                >
                  Salvar Processo
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: New Movement Form */}
      {isAddMovementModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/80 backdrop-blur-sm flex justify-center items-center p-4">
          <div className="bg-slate-900 border border-slate-700 w-full max-w-lg rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                <Plus className="w-5 h-5 text-amber-400" />
                Lançar Andamento ou Publicação nos Autos
              </h3>
              <button
                onClick={() => setIsAddMovementModalOpen(false)}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveMovement} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  Processo de Destino *
                </label>
                <select
                  value={movementTargetProcessId}
                  onChange={(e) => setMovementTargetProcessId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-slate-100 focus:border-amber-500 focus:outline-none"
                >
                  {processes.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.cnjNumber} ({p.activeParty})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  Título do Andamento / Tipo de Publicação *
                </label>
                <input
                  type="text"
                  required
                  value={newMovTitle}
                  onChange={(e) => setNewMovTitle(e.target.value)}
                  placeholder="Ex: Publicação no DJE - Intimação de Decisão Interlocutória"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-slate-100 focus:border-amber-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    Código CNJ / Movimento
                  </label>
                  <input
                    type="text"
                    value={newMovCode}
                    onChange={(e) => setNewMovCode(e.target.value)}
                    placeholder="Ex: 60001"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-slate-100 focus:border-amber-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    Órgão Prolator / Cartório
                  </label>
                  <input
                    type="text"
                    value={newMovOrgan}
                    onChange={(e) => setNewMovOrgan(e.target.value)}
                    placeholder="Ex: 12ª Vara Cível"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-slate-100 focus:border-amber-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  Descrição Completa / Texto da Publicação *
                </label>
                <textarea
                  rows={4}
                  required
                  value={newMovDescription}
                  onChange={(e) => setNewMovDescription(e.target.value)}
                  placeholder="Cole o teor completo da decisão, despacho, intimação ou publicação..."
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-slate-100 focus:border-amber-500 focus:outline-none leading-relaxed"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="chkDecision"
                  checked={newMovIsDecision}
                  onChange={(e) => setNewMovIsDecision(e.target.checked)}
                  className="rounded bg-slate-950 border-slate-700 text-amber-500 focus:ring-amber-500 h-4 w-4 cursor-pointer"
                />
                <label htmlFor="chkDecision" className="text-slate-300 font-medium cursor-pointer">
                  Este andamento é uma Decisão Judicial / Despacho / Publicação Oficial com prazo
                </label>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAddMovementModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg font-semibold cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-lg font-bold cursor-pointer"
                >
                  Salvar Andamento
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteProcessConfirm.isOpen && deleteProcessConfirm.process && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/80 backdrop-blur-sm flex justify-center items-center p-4">
          <div className="bg-slate-900 border border-red-800/40 w-full max-w-md rounded-2xl p-6 shadow-2xl space-y-4 text-center">
            <div className="w-12 h-12 rounded-full bg-red-500/20 text-red-400 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-100">
              Confirmar Exclusão de Processo
            </h3>
            <p className="text-xs text-slate-300">
              Tem certeza que deseja excluir o processo <strong className="text-amber-400">{deleteProcessConfirm.process.cnjNumber}</strong> ({deleteProcessConfirm.process.activeParty})? Esta ação removerá todos os andamentos vinculados.
            </p>
            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                onClick={() => setDeleteProcessConfirm({ isOpen: false, process: null })}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  onDeleteProcess(deleteProcessConfirm.process!.id);
                  setDeleteProcessConfirm({ isOpen: false, process: null });
                }}
                className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-bold cursor-pointer"
              >
                Sim, Excluir Processo
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Substabelecimento de Poderes */}
      {isSubstabelecimentoModalOpen && currentProcess && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/80 backdrop-blur-sm flex justify-center items-center p-4">
          <div className="bg-slate-900 border border-slate-700 w-full max-w-lg rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-blue-400" />
                <div>
                  <h3 className="text-base font-bold text-slate-100">
                    Substabelecimento de Poderes
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Processo CNJ: {currentProcess.cnjNumber}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsSubstabelecimentoModalOpen(false)}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                ✕
              </button>
            </div>

            {substabSuccessMessage ? (
              <div className="py-8 text-center space-y-3 animate-in fade-in zoom-in-95">
                <div className="w-12 h-12 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto">
                  <Check className="w-6 h-6 stroke-[3]" />
                </div>
                <h4 className="text-sm font-bold text-slate-100">
                  Substabelecimento Concluído!
                </h4>
                <p className="text-xs text-slate-300 px-4">
                  {substabSuccessMessage}
                </p>
                {substabGenerateDoc && (
                  <p className="text-[10px] text-amber-300 font-semibold uppercase tracking-wider">
                    📝 Termo oficial salvo na pasta "Procurações & Contratos"
                  </p>
                )}
              </div>
            ) : (
              <form onSubmit={handleConfirmSubstabelecimento} className="space-y-4 text-xs">
                {/* Substabelecimento Info Box */}
                <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 space-y-1 text-[11px] text-slate-300">
                  <p><strong>Advogado Atual (Substabelecente):</strong> {currentProcess.responsibleLawyer}</p>
                  <p><strong>Polo Ativo (Cliente):</strong> {currentProcess.activeParty}</p>
                </div>

                {/* Select Type of incoming lawyer */}
                <div className="space-y-1.5">
                  <label className="block text-slate-300 font-semibold">
                    Selecione o Advogado Substabelecido:
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setSubstabLawyerType('banca')}
                      className={`py-2 px-3 rounded-lg border text-center font-semibold transition cursor-pointer ${
                        substabLawyerType === 'banca'
                          ? 'bg-blue-600/20 border-blue-500 text-blue-300'
                          : 'bg-slate-950 border-slate-800 text-slate-400 hover:bg-slate-850'
                      }`}
                    >
                      Banca do Escritório
                    </button>
                    <button
                      type="button"
                      onClick={() => setSubstabLawyerType('custom')}
                      className={`py-2 px-3 rounded-lg border text-center font-semibold transition cursor-pointer ${
                        substabLawyerType === 'custom'
                          ? 'bg-blue-600/20 border-blue-500 text-blue-300'
                          : 'bg-slate-950 border-slate-800 text-slate-400 hover:bg-slate-850'
                      }`}
                    >
                      Outro Advogado / Externo
                    </button>
                  </div>
                </div>

                {substabLawyerType === 'banca' ? (
                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">
                      Escolha o Advogado Registrado *
                    </label>
                    <select
                      value={substabSelectedMemberId}
                      onChange={(e) => setSubstabSelectedMemberId(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-slate-100 focus:border-amber-500 focus:outline-none"
                    >
                      {registeredLawyers
                        .filter(l => l.name !== currentProcess.responsibleLawyer)
                        .map((l) => (
                          <option key={l.id} value={l.id}>
                            {l.name} (OAB/{l.oabState} {l.oabNumber}) - {l.role || 'Advogado'}
                          </option>
                        ))}
                      {registeredLawyers.filter(l => l.name !== currentProcess.responsibleLawyer).length === 0 && (
                        <option value="">Nenhum outro advogado cadastrado</option>
                      )}
                    </select>
                  </div>
                ) : (
                  <div className="space-y-2.5 border border-slate-800 bg-slate-950/40 p-3 rounded-xl">
                    <div className="grid grid-cols-3 gap-2">
                      <div className="col-span-2">
                        <label className="block text-slate-400 font-semibold mb-1">
                          Nome Completo *
                        </label>
                        <input
                          type="text"
                          required={substabLawyerType === 'custom'}
                          value={substabCustomName}
                          onChange={(e) => setSubstabCustomName(e.target.value)}
                          placeholder="Dr(a). ..."
                          className="w-full px-3 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-slate-100 focus:border-amber-500 focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-slate-400 font-semibold mb-1">
                          OAB Nº *
                        </label>
                        <input
                          type="text"
                          required={substabLawyerType === 'custom'}
                          value={substabCustomOAB}
                          onChange={(e) => setSubstabCustomOAB(e.target.value)}
                          placeholder="Ex: 123.456"
                          className="w-full px-3 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-slate-100 focus:border-amber-500 focus:outline-none"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <label className="block text-slate-400 font-semibold mb-1">
                          OAB Estado
                        </label>
                        <select
                          value={substabCustomUF}
                          onChange={(e) => setSubstabCustomUF(e.target.value)}
                          className="w-full px-3 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-slate-100 focus:border-amber-500 focus:outline-none cursor-pointer"
                        >
                          {['AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO'].map(uf => (
                            <option key={uf} value={uf}>{uf}</option>
                          ))}
                        </select>
                      </div>
                      <div className="col-span-2">
                        <label className="block text-slate-400 font-semibold mb-1">
                          E-mail Profissional
                        </label>
                        <input
                          type="email"
                          value={substabCustomEmail}
                          onChange={(e) => setSubstabCustomEmail(e.target.value)}
                          placeholder="exemplo@oab.org.br"
                          className="w-full px-3 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-slate-100 focus:border-amber-500 focus:outline-none"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <div>
                        <label className="block text-slate-400 font-semibold mb-1">
                          Telefone / WhatsApp
                        </label>
                        <input
                          type="text"
                          value={substabCustomPhone}
                          onChange={(e) => setSubstabCustomPhone(e.target.value)}
                          placeholder="(11) 99999-9999"
                          className="w-full px-3 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-slate-100 focus:border-amber-500 focus:outline-none"
                        />
                      </div>
                      <div className="flex items-center gap-1.5 pt-4">
                        <input
                          type="checkbox"
                          id="chkAddToTeam"
                          checked={substabAddToTeam}
                          onChange={(e) => setSubstabAddToTeam(e.target.checked)}
                          className="rounded bg-slate-950 border-slate-700 text-amber-500 focus:ring-amber-500 h-4 w-4 cursor-pointer"
                        />
                        <label htmlFor="chkAddToTeam" className="text-slate-300 font-medium cursor-pointer">
                          Registrar na Banca do Escritório
                        </label>
                      </div>
                    </div>
                  </div>
                )}

                {/* Powers reserve mode */}
                <div className="space-y-1.5">
                  <label className="block text-slate-300 font-semibold">
                    Reserva de Poderes:
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <button
                      type="button"
                      onClick={() => setSubstabWithReserve(true)}
                      className={`p-3 rounded-xl border text-left transition cursor-pointer flex flex-col justify-between h-20 ${
                        substabWithReserve
                          ? 'bg-amber-500/10 border-amber-500/60 text-amber-300 shadow-md shadow-amber-950/25'
                          : 'bg-slate-950 border-slate-800 text-slate-400 hover:bg-slate-850'
                      }`}
                    >
                      <div className="flex items-center justify-between w-full">
                        <span className="font-bold text-xs">Com reserva de poderes</span>
                        <span className={`w-3 h-3 rounded-full border ${substabWithReserve ? 'border-amber-500 bg-amber-500' : 'border-slate-600'}`}></span>
                      </div>
                      <span className="text-[10px] text-slate-400 leading-normal">
                        O advogado substabelecente continua no processo atuando em conjunto.
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setSubstabWithReserve(false)}
                      className={`p-3 rounded-xl border text-left transition cursor-pointer flex flex-col justify-between h-20 ${
                        !substabWithReserve
                          ? 'bg-amber-500/10 border-amber-500/60 text-amber-300 shadow-md shadow-amber-950/25'
                          : 'bg-slate-950 border-slate-800 text-slate-400 hover:bg-slate-850'
                      }`}
                    >
                      <div className="flex items-center justify-between w-full">
                        <span className="font-bold text-xs">Sem reserva de poderes</span>
                        <span className={`w-3 h-3 rounded-full border ${!substabWithReserve ? 'border-amber-500 bg-amber-500' : 'border-slate-600'}`}></span>
                      </div>
                      <span className="text-[10px] text-slate-400 leading-normal">
                        Os poderes são transmitidos integralmente e o advogado atual deixa o caso.
                      </span>
                    </button>
                  </div>
                </div>

                {/* Additional controls */}
                <div className="flex items-center gap-2 pt-1 border-t border-slate-800">
                  <input
                    type="checkbox"
                    id="chkGenerateDoc"
                    checked={substabGenerateDoc}
                    onChange={(e) => setSubstabGenerateDoc(e.target.checked)}
                    className="rounded bg-slate-950 border-slate-700 text-amber-500 focus:ring-amber-500 h-4 w-4 cursor-pointer"
                  />
                  <label htmlFor="chkGenerateDoc" className="text-slate-300 font-semibold cursor-pointer">
                    Gerar e salvar Termo de Substabelecimento oficial nos documentos
                  </label>
                </div>

                <div className="flex items-center justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsSubstabelecimentoModalOpen(false)}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg font-semibold cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-bold cursor-pointer flex items-center gap-1"
                  >
                    Confirmar Substabelecimento
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
