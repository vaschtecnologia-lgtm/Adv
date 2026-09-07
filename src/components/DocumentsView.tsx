import React, { useState } from 'react';
import { 
  FileText, 
  Plus, 
  Printer, 
  Eye, 
  Scale, 
  DollarSign, 
  ShieldCheck, 
  UserCheck, 
  Sparkles,
  Edit,
  Trash2,
  Download,
  Share2,
  FileCheck,
  CheckCircle2
} from 'lucide-react';
import { 
  LegalDocumentItem, 
  Client, 
  LegalProcess, 
  LawOfficeSettings, 
  DocumentType,
  DocumentPowers,
  ContractFeeOptions
} from '../types';
import { 
  generateProcuracaoText, 
  generateContratoHonorariosText, 
  generateDeclaracaoHipossuficienciaText,
  generateSubstabelecimentoText,
  generateReciboHonorariosText,
  formatCurrencyBRL 
} from '../utils/documentGenerator';
import { downloadDocumentAsWordDocx } from '../utils/docxExportService';
import { PrintDocumentModal } from './PrintDocumentModal';

interface DocumentsViewProps {
  documents: LegalDocumentItem[];
  clients: Client[];
  processes: LegalProcess[];
  office: LawOfficeSettings;
  onAddDocument: (doc: LegalDocumentItem) => void;
  onDeleteDocument: (id: string) => void;
}

export const DocumentsView: React.FC<DocumentsViewProps> = ({
  documents,
  clients,
  processes,
  office,
  onAddDocument,
  onDeleteDocument,
}) => {
  const fallbackClient: Client = {
    id: '',
    name: 'Cliente Não Informado',
    type: 'PF',
    cpfCnpj: '000.000.000-00',
    rgIe: '00.000.000-0',
    nationality: 'brasileiro(a)',
    maritalStatus: 'solteiro(a)',
    profession: 'Autônomo',
    email: 'contato@cliente.com.br',
    phone: '(11) 99999-9999',
    whatsapp: '(11) 99999-9999',
    address: {
      street: 'Av. Paulista',
      number: '1000',
      neighborhood: 'Bela Vista',
      city: 'São Paulo',
      state: 'SP',
      zipCode: '01310-100'
    },
    isGratuidadeJusticaEligible: false,
    notes: '',
    createdAt: new Date().toISOString().split('T')[0]
  };

  const [selectedTypeFilter, setSelectedTypeFilter] = useState<string>('todos');
  const [isGeneratorModalOpen, setIsGeneratorModalOpen] = useState(false);
  const [downloadingDocId, setDownloadingDocId] = useState<string | null>(null);
  const [isDownloadingAllWord, setIsDownloadingAllWord] = useState(false);
  const [downloadSuccessMsg, setDownloadSuccessMsg] = useState<string | null>(null);

  // Active print modal state
  const [activePrintDoc, setActivePrintDoc] = useState<{
    isOpen: boolean;
    title: string;
    text: string;
    type: string;
    clientName?: string;
  }>({
    isOpen: false,
    title: '',
    text: '',
    type: 'procuracao',
  });

  // Generator form state
  const [genDocType, setGenDocType] = useState<DocumentType>('procuracao');
  const [genClientId, setGenClientId] = useState<string>(clients[0]?.id || '');
  const [genProcessId, setGenProcessId] = useState<string>('');
  const [genSubject, setGenSubject] = useState<string>('');

  // Powers for Procuração
  const [powers, setPowers] = useState<DocumentPowers>({
    adJudiciaGeral: true,
    receberDarQuitacao: true,
    transigirAcordos: true,
    substabelecerComReserva: true,
    substabelecerSemReserva: false,
    levantarRpvPrecatório: true,
    reconhecerProcedencia: false,
    firmarCompromisso: true,
    extrajudicialAdmin: true,
  });

  // Fees for Contrato
  const [fees, setFees] = useState<ContractFeeOptions>({
    feeType: 'pro_labore_e_exito',
    fixedValue: 3500,
    installmentsCount: 3,
    installmentValue: 1166.67,
    contingencyPercent: 20,
    sucumbenceBelongsToLawyer: true,
    expensesPaidByClient: true,
    interestRateLate: 2.0,
    firstDueDate: new Date().toISOString().split('T')[0],
    forumCity: `${office.address.city} - ${office.address.state}`,
  });

  // Substabelecimento data
  const [substabelecidoNome, setSubstabelecidoNome] = useState('');
  const [substabelecidoOAB, setSubstabelecidoOAB] = useState('');
  const [substabelecidoUF, setSubstabelecidoUF] = useState('SP');
  const [substabComReserva, setSubstabComReserva] = useState(true);

  // Recibo data
  const [receiptValue, setReceiptValue] = useState(1500);
  const [receiptRef, setReceiptRef] = useState('Honorários advocatícios relativos à elaboração de petição inicial');

  const filteredDocs = documents.filter((d) => {
    if (selectedTypeFilter === 'todos') return true;
    return d.type === selectedTypeFilter;
  });

  const getRenderedTextForDoc = (docItem: LegalDocumentItem): string => {
    const client = clients.find((c) => c.id === docItem.clientId) || clients[0] || fallbackClient;
    const proc = processes.find((p) => p.id === docItem.processId);

    if (docItem.type === 'procuracao') {
      return generateProcuracaoText(
        client,
        office,
        docItem.powers || powers,
        proc?.subject
      );
    } else if (docItem.type === 'contrato_honorarios') {
      return generateContratoHonorariosText(
        client,
        office,
        docItem.fees || fees,
        proc?.subject
      );
    } else if (docItem.type === 'declaracao_hipossuficiencia') {
      return generateDeclaracaoHipossuficienciaText(client, office);
    } else if (docItem.type === 'substabelecimento') {
      return generateSubstabelecimentoText(
        office,
        {
          name: docItem.substabelecidoNome || 'Dr. Advogado Colega',
          oabNumber: docItem.substabelecidoOAB || '000.000',
          oabState: 'SP',
        },
        proc?.cnjNumber,
        true
      );
    } else if (docItem.type === 'recibo_honorarios') {
      return generateReciboHonorariosText(
        client,
        office,
        docItem.receiptValue || 1500,
        docItem.receiptReference || 'Serviços jurídicos'
      );
    }
    return '';
  };

  const handleOpenPrintView = (docItem: LegalDocumentItem) => {
    const client = clients.find((c) => c.id === docItem.clientId) || clients[0] || fallbackClient;
    const renderedText = getRenderedTextForDoc(docItem);

    setActivePrintDoc({
      isOpen: true,
      title: docItem.title,
      text: renderedText,
      type: docItem.type,
      clientName: client?.name,
    });
  };

  const handleDownloadDocAsWord = async (docItem: LegalDocumentItem) => {
    try {
      setDownloadingDocId(docItem.id);
      const text = getRenderedTextForDoc(docItem);
      const client = clients.find((c) => c.id === docItem.clientId) || fallbackClient;
      const cleanFileName = `${docItem.title.replace(/[^a-zA-Z0-9\s_-]/g, '').trim()}`;
      await downloadDocumentAsWordDocx(docItem.title, text, office, cleanFileName);
      setDownloadSuccessMsg(`Arquivo Word (${docItem.title}) gerado e pronto para abrir no Word!`);
      setTimeout(() => setDownloadSuccessMsg(null), 4000);
    } catch (err) {
      console.error('Erro ao baixar documento Word:', err);
    } finally {
      setDownloadingDocId(null);
    }
  };

  const handleDownloadAllWordDocs = async () => {
    if (filteredDocs.length === 0) return;
    try {
      setIsDownloadingAllWord(true);
      for (const doc of filteredDocs) {
        const text = getRenderedTextForDoc(doc);
        const cleanFileName = `${doc.title.replace(/[^a-zA-Z0-9\s_-]/g, '').trim()}`;
        await downloadDocumentAsWordDocx(doc.title, text, office, cleanFileName);
        // Small delay between downloads so the browser handles each cleanly
        await new Promise((r) => setTimeout(r, 400));
      }
      setDownloadSuccessMsg(`Todos os ${filteredDocs.length} documentos foram exportados em formato Word (.docx)!`);
      setTimeout(() => setDownloadSuccessMsg(null), 5000);
    } catch (err) {
      console.error('Erro no download em lote Word:', err);
    } finally {
      setIsDownloadingAllWord(false);
    }
  };

  const handleGenerateAndSaveDoc = (e?: React.FormEvent, exportToWordDirectly: boolean = false) => {
    if (e) e.preventDefault();
    const client = clients.find((c) => c.id === genClientId) || clients[0] || fallbackClient;
    const proc = processes.find((p) => p.id === genProcessId);

    const typeNames: Record<DocumentType, string> = {
      procuracao: 'Procuração Ad Judicia',
      contrato_honorarios: 'Contrato de Honorários',
      declaracao_hipossuficiencia: 'Declaração de Hipossuficiência',
      substabelecimento: 'Substabelecimento de Poderes',
      recibo_honorarios: 'Recibo de Honorários',
    };

    const newDoc: LegalDocumentItem = {
      id: `doc-${Date.now()}`,
      type: genDocType,
      title: `${typeNames[genDocType]} - ${client.name}`,
      clientId: client.id,
      processId: proc ? proc.id : undefined,
      createdAt: new Date().toISOString().split('T')[0],
      status: 'pronto',
      powers: genDocType === 'procuracao' ? powers : undefined,
      fees: genDocType === 'contrato_honorarios' ? fees : undefined,
      substabelecidoNome: genDocType === 'substabelecimento' ? substabelecidoNome : undefined,
      substabelecidoOAB: genDocType === 'substabelecimento' ? substabelecidoOAB : undefined,
      receiptValue: genDocType === 'recibo_honorarios' ? receiptValue : undefined,
      receiptReference: genDocType === 'recibo_honorarios' ? receiptRef : undefined,
    };

    onAddDocument(newDoc);
    setIsGeneratorModalOpen(false);

    if (exportToWordDirectly) {
      handleDownloadDocAsWord(newDoc);
    }

    // Immediately open print preview for the user
    handleOpenPrintView(newDoc);
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Success Notification Banner */}
      {downloadSuccessMsg && (
        <div className="bg-blue-950/80 border border-blue-500/50 text-blue-200 px-4 py-3 rounded-xl flex items-center justify-between text-xs shadow-lg animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span className="font-medium">{downloadSuccessMsg}</span>
          </div>
          <span className="text-[11px] text-blue-300/70 hidden sm:inline">Compatível com MS Word 2016+, Office 365 e Google Docs</span>
        </div>
      )}

      {/* Header & Quick Action */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-6 shadow-lg flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-lg sm:text-xl font-bold text-slate-100 flex items-center gap-2">
              <FileText className="w-5 h-5 sm:w-6 sm:h-6 text-amber-400 shrink-0" />
              <span>Central de Procurações, Contratos & Minutas OAB</span>
            </h2>
            <span className="text-[10px] sm:text-[11px] px-2.5 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30 font-bold hidden sm:inline-flex items-center gap-1">
              <FileText className="w-3 h-3 text-blue-400" />
              Exportação Word (.docx)
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1 max-w-2xl">
            Gere procurações, contratos de honorários, declarações de hipossuficiência e recibos com qualificação completa. Abra instantaneamente no Microsoft Word (.docx) para editar ou imprima em formato A4.
          </p>
        </div>

        <div className="flex items-stretch sm:items-center gap-2 sm:gap-2.5 flex-col sm:flex-row">
          {filteredDocs.length > 0 && (
            <button
              onClick={handleDownloadAllWordDocs}
              disabled={isDownloadingAllWord}
              className="px-3.5 sm:px-4 py-2.5 bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border border-blue-500/30 font-bold text-xs rounded-xl transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 whitespace-nowrap"
              title="Exportar todos os documentos filtrados em arquivos Word (.docx)"
            >
              <Download className="w-4 h-4 text-blue-400 shrink-0" />
              <span>{isDownloadingAllWord ? 'Gerando Pacote...' : 'Baixar no Word (.docx)'}</span>
            </button>
          )}

          <button
            onClick={() => setIsGeneratorModalOpen(true)}
            className="px-4 sm:px-5 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-extrabold text-xs sm:text-sm rounded-xl transition flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-amber-500/20 whitespace-nowrap"
          >
            <Plus className="w-4 h-4" />
            Gerar Novo Documento
          </button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-1.5 bg-slate-900 p-1.5 rounded-xl border border-slate-800">
          {[
            { id: 'todos', label: 'Todos os Documentos' },
            { id: 'procuracao', label: 'Procurações' },
            { id: 'contrato_honorarios', label: 'Contratos de Honorários' },
            { id: 'declaracao_hipossuficiencia', label: 'Justiça Gratuita' },
            { id: 'substabelecimento', label: 'Substabelecimentos' },
            { id: 'recibo_honorarios', label: 'Recibos' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setSelectedTypeFilter(tab.id)}
              className={`px-3 py-1.5 rounded-lg font-medium transition cursor-pointer ${
                selectedTypeFilter === tab.id
                  ? 'bg-amber-500 text-slate-950 font-bold shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <span className="text-slate-400 font-medium">
          {filteredDocs.length} documentos emitidos
        </span>
      </div>

      {/* Documents Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredDocs.map((doc) => {
          const client = clients.find((c) => c.id === doc.clientId);
          const proc = processes.find((p) => p.id === doc.processId);

          const getDocBadge = (type: DocumentType) => {
            switch (type) {
              case 'procuracao':
                return <span className="bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10px] px-2 py-0.5 rounded font-bold">Procuração</span>;
              case 'contrato_honorarios':
                return <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] px-2 py-0.5 rounded font-bold">Contrato de Honorários</span>;
              case 'declaracao_hipossuficiencia':
                return <span className="bg-blue-500/20 text-blue-300 border border-blue-500/30 text-[10px] px-2 py-0.5 rounded font-bold">Gratuidade da Justiça</span>;
              case 'substabelecimento':
                return <span className="bg-purple-500/20 text-purple-300 border border-purple-500/30 text-[10px] px-2 py-0.5 rounded font-bold">Substabelecimento</span>;
              case 'recibo_honorarios':
                return <span className="bg-teal-500/20 text-teal-300 border border-teal-500/30 text-[10px] px-2 py-0.5 rounded font-bold">Recibo</span>;
            }
          };

          const isThisDownloading = downloadingDocId === doc.id;

          return (
            <div
              key={doc.id}
              className="bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-xl p-5 shadow-sm space-y-4 flex flex-col justify-between transition group"
            >
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  {getDocBadge(doc.type)}
                  <span className="text-[11px] text-slate-500">
                    {new Date(doc.createdAt + 'T12:00:00').toLocaleDateString('pt-BR')}
                  </span>
                </div>

                <h3 className="text-sm font-bold text-slate-100 group-hover:text-amber-400 transition line-clamp-2">
                  {doc.title}
                </h3>

                <div className="text-xs text-slate-400 space-y-1 bg-slate-950/60 p-3 rounded-lg border border-slate-800/80">
                  <p>
                    <strong className="text-slate-300">Cliente:</strong> {client?.name || 'Cliente Cadastrado'}
                  </p>
                  <p>
                    <strong className="text-slate-300">CPF/CNPJ:</strong> {client?.cpfCnpj}
                  </p>
                  {proc && (
                    <p className="font-mono text-[11px] text-amber-400">
                      <strong>Proc.:</strong> {proc.cnjNumber}
                    </p>
                  )}
                  {doc.fees && (
                    <p className="text-emerald-400 font-semibold">
                      Fixo: {formatCurrencyBRL(doc.fees.fixedValue)} + {doc.fees.contingencyPercent}% de Êxito
                    </p>
                  )}
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex items-center justify-between pt-3 border-t border-slate-800/80 text-xs gap-1.5 flex-wrap">
                <button
                  onClick={() => onDeleteDocument(doc.id)}
                  className="p-1.5 text-slate-500 hover:text-rose-400 rounded-lg hover:bg-slate-800 transition cursor-pointer"
                  title="Excluir documento"
                >
                  <Trash2 className="w-4 h-4" />
                </button>

                <div className="flex items-center gap-1.5">
                  {/* Direct Word (.docx) Download Button */}
                  <button
                    onClick={() => handleDownloadDocAsWord(doc)}
                    disabled={isThisDownloading}
                    className="px-2.5 py-1.5 bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border border-blue-500/30 rounded-lg font-bold transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                    title="Baixar em formato Word (.docx) para abrir no Microsoft Word"
                  >
                    <FileText className="w-3.5 h-3.5 text-blue-400" />
                    <span>{isThisDownloading ? 'Gerando...' : 'Word'}</span>
                  </button>

                  <button
                    onClick={() => handleOpenPrintView(doc)}
                    className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg font-semibold transition flex items-center gap-1.5 cursor-pointer border border-slate-700"
                    title="Visualizar minuta na tela"
                  >
                    <Eye className="w-3.5 h-3.5 text-amber-400" />
                    Ver
                  </button>

                  <button
                    onClick={() => handleOpenPrintView(doc)}
                    className="px-2.5 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg transition flex items-center gap-1.5 cursor-pointer shadow"
                    title="Imprimir minuta ou salvar como PDF"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    Imprimir
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Generator Modal */}
      {isGeneratorModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/80 backdrop-blur-sm flex justify-center items-center p-3 sm:p-6">
          <div className="bg-slate-900 border border-slate-700 w-full max-w-3xl rounded-2xl p-6 shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-100">
                    Gerador de Minutas e Peças Jurídicas
                  </h3>
                  <p className="text-xs text-slate-400">
                    Selecione o tipo de instrumento e configure as cláusulas específicas
                  </p>
                </div>
              </div>

              <button
                onClick={() => setIsGeneratorModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleGenerateAndSaveDoc} className="space-y-5 text-xs">
              {/* Document Type Selector Grid */}
              <div>
                <label className="block text-slate-300 font-semibold mb-2">
                  Tipo de Documento Jurídico *
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                  {[
                    { id: 'procuracao', label: 'Procuração Ad Judicia', icon: UserCheck },
                    { id: 'contrato_honorarios', label: 'Contrato de Honorários', icon: Scale },
                    { id: 'declaracao_hipossuficiencia', label: 'Justiça Gratuita', icon: ShieldCheck },
                    { id: 'substabelecimento', label: 'Substabelecimento', icon: Share2 },
                    { id: 'recibo_honorarios', label: 'Recibo de Honorários', icon: DollarSign },
                  ].map((item) => {
                    const Icon = item.icon;
                    const isSelected = genDocType === item.id;
                    return (
                      <button
                        type="button"
                        key={item.id}
                        onClick={() => setGenDocType(item.id as DocumentType)}
                        className={`p-3 rounded-xl border text-left transition flex flex-col justify-between gap-2 cursor-pointer ${
                          isSelected
                            ? 'bg-amber-500/10 border-amber-500 text-amber-300 ring-1 ring-amber-500/40'
                            : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700'
                        }`}
                      >
                        <Icon className="w-4 h-4 text-amber-400" />
                        <span className="font-semibold text-xs">{item.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Client & Process Selection */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    Cliente (Outorgante / Contratante) *
                  </label>
                  <select
                    value={genClientId}
                    onChange={(e) => setGenClientId(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-slate-100 focus:border-amber-500 focus:outline-none"
                  >
                    {clients.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.type} - {c.cpfCnpj})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    Vincular a Processo Judicial (Opcional)
                  </label>
                  <select
                    value={genProcessId}
                    onChange={(e) => setGenProcessId(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-slate-100 focus:border-amber-500 focus:outline-none font-mono"
                  >
                    <option value="">Nenhum processo (Atuação Consultiva / Inicial)</option>
                    {processes.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.cnjNumber} - {p.activeParty}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Conditional options for Procuração */}
              {genDocType === 'procuracao' && (
                <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3">
                  <h4 className="font-bold text-amber-400 text-xs flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4" />
                    Poderes Especiais da Procuração (CPC Art. 105):
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-slate-300">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={powers.adJudiciaGeral}
                        onChange={(e) => setPowers({ ...powers, adJudiciaGeral: e.target.checked })}
                        className="rounded text-amber-500 focus:ring-amber-400 bg-slate-900 border-slate-700"
                      />
                      <span>Poderes Gerais para o Foro (Ad Judicia et Extra)</span>
                    </label>

                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={powers.receberDarQuitacao}
                        onChange={(e) => setPowers({ ...powers, receberDarQuitacao: e.target.checked })}
                        className="rounded text-amber-500 focus:ring-amber-400 bg-slate-900 border-slate-700"
                      />
                      <span>Receber Valores e Dar Quitação</span>
                    </label>

                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={powers.transigirAcordos}
                        onChange={(e) => setPowers({ ...powers, transigirAcordos: e.target.checked })}
                        className="rounded text-amber-500 focus:ring-amber-400 bg-slate-900 border-slate-700"
                      />
                      <span>Transigir, Firmar Acordos e Transações</span>
                    </label>

                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={powers.levantarRpvPrecatório}
                        onChange={(e) => setPowers({ ...powers, levantarRpvPrecatório: e.target.checked })}
                        className="rounded text-amber-500 focus:ring-amber-400 bg-slate-900 border-slate-700"
                      />
                      <span>Levantar Alvarás Judiciais, RPVs e Precatórios</span>
                    </label>

                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={powers.extrajudicialAdmin}
                        onChange={(e) => setPowers({ ...powers, extrajudicialAdmin: e.target.checked })}
                        className="rounded text-amber-500 focus:ring-amber-400 bg-slate-900 border-slate-700"
                      />
                      <span>Atuação Extrajudicial (INSS, Receita, Cartórios)</span>
                    </label>

                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={powers.substabelecerComReserva}
                        onChange={(e) => setPowers({ ...powers, substabelecerComReserva: e.target.checked })}
                        className="rounded text-amber-500 focus:ring-amber-400 bg-slate-900 border-slate-700"
                      />
                      <span>Substabelecer com Reserva de Poderes</span>
                    </label>
                  </div>
                </div>
              )}

              {/* Conditional options for Contrato de Honorários */}
              {genDocType === 'contrato_honorarios' && (
                <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3">
                  <h4 className="font-bold text-emerald-400 text-xs flex items-center gap-1.5">
                    <Scale className="w-4 h-4" />
                    Condições Financeiras & Honorários Advocatícios:
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-slate-300 font-medium mb-1">Modalidade de Cobrança</label>
                      <select
                        value={fees.feeType}
                        onChange={(e) => setFees({ ...fees, feeType: e.target.value as any })}
                        className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-slate-100"
                      >
                        <option value="pro_labore_e_exito">Fixo Inicial + Êxito (Ad Exitum)</option>
                        <option value="apenas_exito">Apenas Êxito (Quota Litis)</option>
                        <option value="apenas_fixo">Honorários Fixos</option>
                        <option value="mensalidade">Mensalidade / Partido</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-slate-300 font-medium mb-1">Valor Fixo (R$)</label>
                      <input
                        type="number"
                        value={fees.fixedValue}
                        onChange={(e) => setFees({ ...fees, fixedValue: Number(e.target.value) })}
                        className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-slate-100"
                      />
                    </div>

                    <div>
                      <label className="block text-slate-300 font-medium mb-1">Percentual de Êxito (%)</label>
                      <input
                        type="number"
                        value={fees.contingencyPercent}
                        onChange={(e) => setFees({ ...fees, contingencyPercent: Number(e.target.value) })}
                        className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-slate-100"
                      />
                    </div>

                    <div>
                      <label className="block text-slate-300 font-medium mb-1">Nº de Parcelas do Fixo</label>
                      <input
                        type="number"
                        value={fees.installmentsCount}
                        onChange={(e) => setFees({ ...fees, installmentsCount: Number(e.target.value) })}
                        className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-slate-100"
                      />
                    </div>

                    <div>
                      <label className="block text-slate-300 font-medium mb-1">Primeiro Vencimento</label>
                      <input
                        type="date"
                        value={fees.firstDueDate}
                        onChange={(e) => setFees({ ...fees, firstDueDate: e.target.value })}
                        className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-slate-100"
                      />
                    </div>

                    <div>
                      <label className="block text-slate-300 font-medium mb-1">Foro de Eleição (Comarca)</label>
                      <input
                        type="text"
                        value={fees.forumCity}
                        onChange={(e) => setFees({ ...fees, forumCity: e.target.value })}
                        className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-slate-100"
                      />
                    </div>
                  </div>

                  <div className="pt-2 flex flex-wrap items-center gap-4 text-slate-300">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={fees.sucumbenceBelongsToLawyer}
                        onChange={(e) => setFees({ ...fees, sucumbenceBelongsToLawyer: e.target.checked })}
                        className="rounded text-amber-500 focus:ring-amber-400 bg-slate-900 border-slate-700"
                      />
                      <span>Honorários Sucumbenciais pertencem exclusivamente ao Advogado (Lei 8.906/94)</span>
                    </label>

                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={fees.expensesPaidByClient}
                        onChange={(e) => setFees({ ...fees, expensesPaidByClient: e.target.checked })}
                        className="rounded text-amber-500 focus:ring-amber-400 bg-slate-900 border-slate-700"
                      />
                      <span>Custas e despesas processuais por conta do Contratante</span>
                    </label>
                  </div>
                </div>
              )}

              {/* Conditional options for Substabelecimento */}
              {genDocType === 'substabelecimento' && (
                <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3">
                  <h4 className="font-bold text-purple-400 text-xs">Dados do Colega Substabelecido:</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="sm:col-span-2">
                      <label className="block text-slate-300 font-medium mb-1">Nome do Advogado(a) Substabelecido</label>
                      <input
                        type="text"
                        required
                        value={substabelecidoNome}
                        onChange={(e) => setSubstabelecidoNome(e.target.value)}
                        placeholder="Dr(a). Nome Completo"
                        className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-slate-100"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-300 font-medium mb-1">OAB / UF</label>
                      <input
                        type="text"
                        required
                        value={substabelecidoOAB}
                        onChange={(e) => setSubstabelecidoOAB(e.target.value)}
                        placeholder="Ex: 345.980/SP"
                        className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-slate-100"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Conditional options for Recibo */}
              {genDocType === 'recibo_honorarios' && (
                <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3">
                  <h4 className="font-bold text-teal-400 text-xs">Dados do Recibo de Quitação:</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-slate-300 font-medium mb-1">Valor Recebido (R$)</label>
                      <input
                        type="number"
                        value={receiptValue}
                        onChange={(e) => setReceiptValue(Number(e.target.value))}
                        className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-slate-100"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-300 font-medium mb-1">Referência / Discriminação</label>
                      <input
                        type="text"
                        value={receiptRef}
                        onChange={(e) => setReceiptRef(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-slate-100"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Footer Buttons */}
              <div className="flex flex-wrap items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsGeneratorModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg font-semibold cursor-pointer text-xs"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={(e) => handleGenerateAndSaveDoc(e, true)}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-bold flex items-center gap-2 cursor-pointer shadow-lg shadow-blue-600/30 text-xs"
                >
                  <FileText className="w-4 h-4 text-blue-200" />
                  Gerar e Abrir no Word (.docx)
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-lg font-bold flex items-center gap-2 cursor-pointer shadow-lg shadow-amber-500/20 text-xs"
                >
                  <Printer className="w-4 h-4" />
                  Visualizar / Imprimir A4
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Global Printable Document Modal */}
      <PrintDocumentModal
        isOpen={activePrintDoc.isOpen}
        onClose={() => setActivePrintDoc({ ...activePrintDoc, isOpen: false })}
        title={activePrintDoc.title}
        documentText={activePrintDoc.text}
        office={office}
        documentType={activePrintDoc.type}
        clientName={activePrintDoc.clientName}
      />
    </div>
  );
};
