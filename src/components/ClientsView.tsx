import React, { useState } from 'react';
import { 
  Users, 
  Plus, 
  Search, 
  MessageSquare, 
  FileText, 
  Scale, 
  MapPin, 
  Phone, 
  Mail, 
  Building2, 
  User, 
  Check, 
  Edit3,
  ExternalLink,
  DollarSign,
  Download,
  CheckCircle2
} from 'lucide-react';
import { Client, LegalProcess, LawOfficeSettings } from '../types';
import { 
  downloadProcuracaoWordDocx, 
  downloadContratoHonorariosWordDocx,
  downloadDeclaracaoHipossuficienciaWordDocx 
} from '../utils/docxExportService';

interface ClientsViewProps {
  clients: Client[];
  processes: LegalProcess[];
  office: LawOfficeSettings;
  onAddClient: (client: Client) => void;
  onUpdateClient: (client: Client) => void;
  onDeleteClient: (id: string) => void;
  onOpenDocumentGeneratorForClient: (clientId: string) => void;
  onSelectProcess: (processId: string) => void;
}

export const ClientsView: React.FC<ClientsViewProps> = ({
  clients,
  processes,
  office,
  onAddClient,
  onUpdateClient,
  onDeleteClient,
  onOpenDocumentGeneratorForClient,
  onSelectProcess,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedClientId, setSelectedClientId] = useState<string | null>(clients[0]?.id || null);
  const [isClientModalOpen, setIsClientModalOpen] = useState(false);
  const [editingClientId, setEditingClientId] = useState<string | null>(null);
  const [downloadingDocType, setDownloadingDocType] = useState<string | null>(null);
  const [wordExportSuccess, setWordExportSuccess] = useState<string | null>(null);

  // Astrea-style WhatsApp Communication Hub States
  const [selectedTemplate, setSelectedTemplate] = useState<'welcome' | 'update' | 'hearing' | 'signature'>('welcome');
  const [customMsgText, setCustomMsgText] = useState('');

  const getTemplateText = (tpl: 'welcome' | 'update' | 'hearing' | 'signature', clientName: string): string => {
    const officeName = office?.officeName || 'WONO ADVOCACIA';
    const lawyerName = office?.primaryLawyer?.name || 'Dr. Vagner Schmidt';
    
    switch (tpl) {
      case 'welcome':
        return `Olá, ${clientName}! Tudo bem?\n\nBoas-vindas ao nosso escritório *${officeName}*. Estamos muito felizes em poder representar você.\n\nPara iniciarmos a elaboração da sua Procuração e Contrato de Honorários, solicitamos a gentileza de nos enviar fotos legíveis dos seguintes documentos:\n• RG e CPF (ou CNH)\n• Comprovante de residência recente\n• Comprovante de renda (opcional para gratuidade)\n\nFicamos à disposição para esclarecer qualquer dúvida!\n\nAtenciosamente,\n*${lawyerName}*`;
      case 'update':
        return `Olá, ${clientName}!\n\nPassando para informar que tivemos uma movimentação importante em seu processo judicial recente.\n\nNossa banca de advogados já está acompanhando o caso e tomando as medidas processuais cabíveis dentro do prazo oficial. Não se preocupe, continuaremos cuidando de tudo por aqui!\n\nQualquer novidade relevante, entraremos em contato.\n\nAtenciosamente,\n*${officeName}*`;
      case 'hearing':
        return `Olá, ${clientName}!\n\nInformamos que foi agendada uma audiência judicial para o seu caso.\n\n• Data: ____/____/2026\n• Horário: ____:____\n\nPor favor, guarde esta data com atenção. Nossa equipe agendará uma reunião preparatória com você alguns dias antes para passar todas as orientações e treinar seu depoimento.\n\nAtenciosamente,\n*${officeName}*`;
      case 'signature':
        return `Olá, ${clientName}!\n\nAs minutas oficiais da sua Procuração e do seu Contrato de Honorários já estão prontas para a sua assinatura.\n\nPrecisamos coletar sua assinatura para que possamos protocolar a ação judicial em seu nome o quanto antes.\n\nVocê pode assinar diretamente via documento digital que enviamos ou agendar um horário para assinar em nossa recepção física.\n\nAtenciosamente,\n*${officeName}*`;
      default:
        return '';
    }
  };

  // Delete Confirmation Modal State
  const [deleteConfirmModal, setDeleteConfirmModal] = useState<{
    isOpen: boolean;
    client: Client | null;
  }>({
    isOpen: false,
    client: null,
  });

  // Client Form State
  const [clientType, setClientType] = useState<'PF' | 'PJ'>('PF');
  const [name, setName] = useState('');
  const [cpfCnpj, setCpfCnpj] = useState('');
  const [rgIe, setRgIe] = useState('');
  const [nationality, setNationality] = useState('brasileiro(a)');
  const [maritalStatus, setMaritalStatus] = useState('solteiro(a)');
  const [profession, setProfession] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [street, setStreet] = useState('');
  const [number, setNumber] = useState('');
  const [neighborhood, setNeighborhood] = useState('');
  const [city, setCity] = useState('São Paulo');
  const [state, setState] = useState('SP');
  const [zipCode, setZipCode] = useState('');
  const [representativeName, setRepresentativeName] = useState('');
  const [representativeCpf, setRepresentativeCpf] = useState('');
  const [isGratuidadeJusticaEligible, setIsGratuidadeJusticaEligible] = useState(false);
  const [notes, setNotes] = useState('');
  const [isCepLoading, setIsCepLoading] = useState(false);

  const handleCepChange = async (val: string) => {
    const rawVal = val.replace(/\D/g, '');
    let formatted = rawVal;
    if (rawVal.length > 5) {
      formatted = `${rawVal.slice(0, 5)}-${rawVal.slice(5, 8)}`;
    } else {
      formatted = rawVal;
    }
    setZipCode(formatted);

    if (rawVal.length === 8) {
      setIsCepLoading(true);
      try {
        const res = await fetch(`https://viacep.com.br/ws/${rawVal}/json/`);
        if (res.ok) {
          const data = await res.json();
          if (!data.erro) {
            setStreet(data.logradouro || '');
            setNeighborhood(data.bairro || '');
            setCity(data.localidade || '');
            setState(data.uf || '');
          }
        }
      } catch (err) {
        console.error('Erro ao buscar CEP:', err);
      } finally {
        setIsCepLoading(false);
      }
    }
  };

  const selectedClient = clients.find((c) => c.id === selectedClientId) || clients[0];
  const clientProcesses = processes.filter((p) => p.clientId === selectedClient?.id);

  // Sync draft message text with client selection and selected template (Astrea Style)
  React.useEffect(() => {
    if (selectedClient) {
      setCustomMsgText(getTemplateText(selectedTemplate, selectedClient.name));
    }
  }, [selectedClientId, selectedTemplate, office]);

  const filteredClients = clients.filter((c) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      c.name.toLowerCase().includes(q) ||
      c.cpfCnpj.toLowerCase().includes(q) ||
      c.email.toLowerCase().includes(q) ||
      c.phone.toLowerCase().includes(q)
    );
  });

  // Open modal for NEW client
  const handleOpenNewClientModal = () => {
    setEditingClientId(null);
    setClientType('PF');
    setName('');
    setCpfCnpj('');
    setRgIe('');
    setNationality('brasileiro(a)');
    setMaritalStatus('solteiro(a)');
    setProfession('');
    setEmail('');
    setPhone('');
    setWhatsapp('');
    setStreet('');
    setNumber('');
    setNeighborhood('');
    setCity('São Paulo');
    setState('SP');
    setZipCode('');
    setRepresentativeName('');
    setRepresentativeCpf('');
    setIsGratuidadeJusticaEligible(false);
    setNotes('');
    setIsClientModalOpen(true);
  };

  // Open modal for EDIT client
  const handleOpenEditClientModal = (client: Client) => {
    setEditingClientId(client.id);
    setClientType(client.type);
    setName(client.name);
    setCpfCnpj(client.cpfCnpj);
    setRgIe(client.rgIe || '');
    setNationality(client.nationality || 'brasileiro(a)');
    setMaritalStatus(client.maritalStatus || 'solteiro(a)');
    setProfession(client.profession || '');
    setEmail(client.email || '');
    setPhone(client.phone || '');
    setWhatsapp(client.whatsapp || '');
    setStreet(client.address.street || '');
    setNumber(client.address.number || '');
    setNeighborhood(client.address.neighborhood || '');
    setCity(client.address.city || 'São Paulo');
    setState(client.address.state || 'SP');
    setZipCode(client.address.zipCode || '');
    setRepresentativeName(client.representative?.name || '');
    setRepresentativeCpf(client.representative?.cpf || '');
    setIsGratuidadeJusticaEligible(client.isGratuidadeJusticaEligible || false);
    setNotes(client.notes || '');
    setIsClientModalOpen(true);
  };

  const handleSaveClient = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !cpfCnpj) return;

    if (editingClientId) {
      const existing = clients.find((c) => c.id === editingClientId);
      if (!existing) return;

      const updatedClient: Client = {
        ...existing,
        type: clientType,
        name,
        cpfCnpj,
        rgIe,
        nationality,
        maritalStatus,
        profession: clientType === 'PF' ? profession : 'Pessoa Jurídica',
        email,
        phone,
        whatsapp: whatsapp || phone,
        isGratuidadeJusticaEligible,
        notes,
        representative:
          clientType === 'PJ' && representativeName
            ? {
                name: representativeName,
                cpf: representativeCpf,
                rg: existing.representative?.rg || 'SSP/SP',
                role: 'Sócio Administrador',
                nationality: 'brasileiro(a)',
                maritalStatus: 'casado(a)',
                profession: 'Empresário',
              }
            : undefined,
        address: {
          street,
          number,
          neighborhood,
          city,
          state,
          zipCode,
        },
      };

      onUpdateClient(updatedClient);
    } else {
      const newClient: Client = {
        id: `cli-${Date.now()}`,
        type: clientType,
        name,
        cpfCnpj,
        rgIe,
        nationality,
        maritalStatus,
        profession: clientType === 'PF' ? profession : 'Empresa / Pessoa Jurídica',
        representative:
          clientType === 'PJ' && representativeName
            ? {
                name: representativeName,
                cpf: representativeCpf,
                rg: 'SSP/SP',
                role: 'Sócio Administrador',
                nationality: 'brasileiro(a)',
                maritalStatus: 'casado(a)',
                profession: 'Empresário',
              }
            : undefined,
        email,
        phone,
        whatsapp: whatsapp || phone,
        isGratuidadeJusticaEligible,
        createdAt: new Date().toISOString().split('T')[0],
        address: {
          street,
          number,
          neighborhood,
          city,
          state,
          zipCode,
        },
        notes,
      };

      onAddClient(newClient);
      setSelectedClientId(newClient.id);
    }

    setIsClientModalOpen(false);
  };


  const handleOpenWhatsApp = (phoneNum: string) => {
    const clean = phoneNum.replace(/[^0-9]/g, '');
    window.open(`https://wa.me/55${clean}`, '_blank');
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-6 shadow-lg flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg sm:text-xl font-bold text-slate-100 flex items-center gap-2">
            <Users className="w-5 h-5 sm:w-6 sm:h-6 text-amber-400 shrink-0" />
            <span>Gestão de Clientes & Qualificação Civil</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1 max-w-2xl">
            Cadastro de Pessoa Física e Jurídica com dados para outorga de procurações, contratos de honorários, edição cadastral e exclusão.
          </p>
        </div>

        <button
          onClick={handleOpenNewClientModal}
          className="px-4 sm:px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs sm:text-sm rounded-xl transition flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-amber-500/20 whitespace-nowrap self-stretch sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          Cadastrar Novo Cliente
        </button>
      </div>

      {/* Master Detail Split */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6">
        {/* Left List (5 cols) */}
        <div className="lg:col-span-5 space-y-3">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar por nome, CPF/CNPJ ou telefone..."
              className="w-full pl-10 pr-4 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-500"
            />
          </div>

          <div className="space-y-2.5 max-h-[700px] overflow-y-auto pr-1">
            {filteredClients.map((c) => {
              const isSelected = c.id === selectedClient?.id;
              const clientProcs = processes.filter((p) => p.clientId === c.id);
              const countProc = clientProcs.length;

              return (
                <div
                  key={c.id}
                  onClick={() => {
                    setSelectedClientId(c.id);
                    if (countProc > 0) {
                      // Navigate straight to the first process of this client
                      onSelectProcess(clientProcs[0].id);
                    }
                  }}
                  className={`p-4 rounded-xl border transition cursor-pointer space-y-2 ${
                    isSelected
                      ? 'bg-slate-850 border-amber-500/60 shadow-md shadow-amber-950/20 ring-1 ring-amber-500/20'
                      : 'bg-slate-900 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-slate-100 line-clamp-1">{c.name}</span>
                    <span className="text-[10px] px-2 py-0.5 rounded font-bold bg-slate-800 text-slate-300">
                      {c.type}
                    </span>
                  </div>

                  <div className="text-[11px] text-slate-400 space-y-0.5">
                    <div>CPF/CNPJ: {c.cpfCnpj}</div>
                    <div className="truncate">{c.address.city} / {c.address.state} • {c.phone}</div>
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-amber-400 font-semibold pt-1 border-t border-slate-800/80">
                    <span>{countProc} processo(s) vinculado(s)</span>
                    <span className="text-slate-400 text-[10px] bg-amber-500/10 px-1.5 py-0.5 rounded text-amber-300">
                      {countProc > 0 ? 'Acessar Andamentos ➔' : 'Sem processos'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Detail Card (7 cols) */}
        <div className="lg:col-span-7">
          {selectedClient ? (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-lg space-y-6">
              {/* Client Title & Actions */}
              <div className="flex flex-wrap items-start justify-between gap-4 pb-4 border-b border-slate-800">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-bold border border-amber-500/30">
                      {selectedClient.type === 'PF' ? 'Pessoa Física' : 'Pessoa Jurídica'}
                    </span>
                    <span className="text-xs text-slate-400 font-mono">{selectedClient.cpfCnpj}</span>
                  </div>
                  <h3 className="text-xl font-extrabold text-slate-100">
                    {selectedClient.name}
                  </h3>
                  {selectedClient.profession && (
                    <p className="text-xs text-slate-400 mt-0.5">
                      {selectedClient.profession} • {selectedClient.nationality} • {selectedClient.maritalStatus}
                    </p>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={() => handleOpenEditClientModal(selectedClient)}
                    className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition"
                    title="Editar dados cadastrais"
                  >
                    <Edit3 className="w-3.5 h-3.5 text-amber-400" />
                    Editar
                  </button>

                  <button
                    onClick={() => setDeleteConfirmModal({ isOpen: true, client: selectedClient })}
                    className="px-3 py-1.5 bg-red-950/30 hover:bg-red-900/50 text-red-400 border border-red-800/40 rounded-lg text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition"
                    title="Excluir cliente"
                  >
                    Excluir
                  </button>

                  {selectedClient.whatsapp && (
                    <button
                      onClick={() => handleOpenWhatsApp(selectedClient.whatsapp!)}
                      className="px-3 py-1.5 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 rounded-lg text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition"
                    >
                      <MessageSquare className="w-3.5 h-3.5 text-emerald-400" />
                      WhatsApp
                    </button>
                  )}
                  <button
                    onClick={() => onOpenDocumentGeneratorForClient(selectedClient.id)}
                    className="px-3.5 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer transition shadow"
                  >
                    <FileText className="w-3.5 h-3.5" />
                    Gerador de Minutas
                  </button>
                </div>
              </div>

              {/* Quick Word (.docx) Generation Bar for Client */}
              <div className="bg-slate-950 p-3.5 rounded-xl border border-blue-500/30 flex flex-wrap items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-blue-400 shrink-0" />
                  <div>
                    <span className="font-bold text-slate-200">Gerar Documentos em Arquivo Word (.docx):</span>
                    <p className="text-[11px] text-slate-400">Qualificação completa do cliente preenchida automaticamente no Word</p>
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    disabled={downloadingDocType === 'procuracao'}
                    onClick={async () => {
                      try {
                        setDownloadingDocType('procuracao');
                        await downloadProcuracaoWordDocx(
                          selectedClient,
                          office,
                          {
                            adJudiciaGeral: true,
                            receberDarQuitacao: true,
                            transigirAcordos: true,
                            substabelecerComReserva: true,
                            substabelecerSemReserva: false,
                            levantarRpvPrecatório: true,
                            reconhecerProcedencia: false,
                            firmarCompromisso: true,
                            extrajudicialAdmin: true,
                          }
                        );
                        setWordExportSuccess(`Procuração de ${selectedClient.name} baixada em Word (.docx)!`);
                        setTimeout(() => setWordExportSuccess(null), 4000);
                      } finally {
                        setDownloadingDocType(null);
                      }
                    }}
                    className="px-2.5 py-1.5 bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border border-blue-500/40 rounded-lg font-bold flex items-center gap-1 cursor-pointer disabled:opacity-50 transition"
                  >
                    <Download className="w-3 h-3 text-blue-400" />
                    {downloadingDocType === 'procuracao' ? 'Gerando...' : 'Procuração (.docx)'}
                  </button>

                  <button
                    disabled={downloadingDocType === 'contrato'}
                    onClick={async () => {
                      try {
                        setDownloadingDocType('contrato');
                        await downloadContratoHonorariosWordDocx(
                          selectedClient,
                          office,
                          {
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
                          }
                        );
                        setWordExportSuccess(`Contrato de Honorários de ${selectedClient.name} baixado em Word (.docx)!`);
                        setTimeout(() => setWordExportSuccess(null), 4000);
                      } finally {
                        setDownloadingDocType(null);
                      }
                    }}
                    className="px-2.5 py-1.5 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/40 rounded-lg font-bold flex items-center gap-1 cursor-pointer disabled:opacity-50 transition"
                  >
                    <Download className="w-3 h-3 text-emerald-400" />
                    {downloadingDocType === 'contrato' ? 'Gerando...' : 'Contrato (.docx)'}
                  </button>

                  <button
                    disabled={downloadingDocType === 'declaracao'}
                    onClick={async () => {
                      try {
                        setDownloadingDocType('declaracao');
                        await downloadDeclaracaoHipossuficienciaWordDocx(selectedClient, office);
                        setWordExportSuccess(`Declaração de Gratuidade de ${selectedClient.name} baixada em Word (.docx)!`);
                        setTimeout(() => setWordExportSuccess(null), 4000);
                      } finally {
                        setDownloadingDocType(null);
                      }
                    }}
                    className="px-2.5 py-1.5 bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 border border-purple-500/40 rounded-lg font-bold flex items-center gap-1 cursor-pointer disabled:opacity-50 transition"
                  >
                    <Download className="w-3 h-3 text-purple-400" />
                    {downloadingDocType === 'declaracao' ? 'Gerando...' : 'Gratuidade (.docx)'}
                  </button>
                </div>
              </div>

              {/* Word Export Toast Feedback */}
              {wordExportSuccess && (
                <div className="bg-emerald-950/80 border border-emerald-500/50 text-emerald-200 px-4 py-2.5 rounded-xl flex items-center gap-2 text-xs animate-in fade-in">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span className="font-semibold">{wordExportSuccess}</span>
                </div>
              )}

              {/* Qualification Details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
                  <h4 className="font-bold text-slate-200 flex items-center gap-2">
                    <User className="w-4 h-4 text-amber-400" />
                    Qualificação Civil Completa
                  </h4>
                  <div className="space-y-1 text-slate-300 leading-relaxed">
                    <p><strong>Nome/Razão:</strong> {selectedClient.name}</p>
                    <p><strong>Documento:</strong> {selectedClient.cpfCnpj} {selectedClient.rgIe && `(RG: ${selectedClient.rgIe})`}</p>
                    {selectedClient.profession && <p><strong>Profissão:</strong> {selectedClient.profession}</p>}
                    <p><strong>Nacionalidade / Estado Civil:</strong> {selectedClient.nationality}, {selectedClient.maritalStatus}</p>
                    {selectedClient.representative && (
                      <div className="pt-2 border-t border-slate-800 text-[11px] text-slate-400">
                        <strong className="text-slate-300">Representante Legal:</strong> {selectedClient.representative.name} (CPF: {selectedClient.representative.cpf})
                      </div>
                    )}
                  </div>
                </div>

                <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
                  <h4 className="font-bold text-slate-200 flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-emerald-400" />
                    Endereço & Contatos
                  </h4>
                  <div className="space-y-1 text-slate-300 leading-relaxed">
                    <p><strong>Logradouro:</strong> {selectedClient.address.street}, nº {selectedClient.address.number}</p>
                    <p><strong>Bairro:</strong> {selectedClient.address.neighborhood}</p>
                    <p><strong>Cidade/UF:</strong> {selectedClient.address.city} - {selectedClient.address.state}</p>
                    <p><strong>CEP:</strong> {selectedClient.address.zipCode}</p>
                    <p className="pt-1 border-t border-slate-800">
                      <strong>E-mail:</strong> {selectedClient.email || 'Não informado'}
                    </p>
                    <p><strong>Telefone:</strong> {selectedClient.phone}</p>
                  </div>
                </div>
              </div>

              {/* Linked Processes */}
              <div className="space-y-3">
                <h4 className="font-bold text-slate-200 text-sm flex items-center gap-2">
                  <Scale className="w-4 h-4 text-amber-400" />
                  Processos Judiciais Vinculados ({clientProcesses.length})
                </h4>

                {clientProcesses.length === 0 ? (
                  <p className="text-xs text-slate-400 bg-slate-950 p-4 rounded-xl border border-slate-800 text-center">
                    Nenhum processo judicial cadastrado para este cliente ainda.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {clientProcesses.map((p) => (
                      <div
                        key={p.id}
                        onClick={() => onSelectProcess(p.id)}
                        className="p-3.5 bg-slate-950 hover:bg-slate-850 border border-slate-800 rounded-xl flex items-center justify-between gap-3 text-xs transition cursor-pointer"
                      >
                        <div className="space-y-0.5">
                          <div className="font-mono font-bold text-amber-400">{p.cnjNumber}</div>
                          <div className="text-slate-300 font-medium">{p.subject}</div>
                          <div className="text-slate-500 text-[11px]">{p.court} • {p.branchVara}</div>
                        </div>

                        <div className="text-right">
                          <span className="text-emerald-400 font-semibold">{p.status}</span>
                          <div className="text-[10px] text-slate-400 mt-1">Ver autos →</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Central de Comunicação WhatsApp (Astrea Style) */}
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-3.5 text-xs">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-slate-200 text-sm flex items-center gap-2">
                    <MessageSquare className="w-4 h-4 text-emerald-400" />
                    Central de Comunicação (WhatsApp) Astrea Style
                  </h4>
                  <span className="text-[10px] bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 font-bold px-2 py-0.5 rounded-full uppercase">
                    Modelos Rápidos
                  </span>
                </div>
                
                <p className="text-[11px] text-slate-400 leading-normal">
                  Selecione um modelo de aviso corporativo profissional para o seu cliente, revise o texto abaixo e dispare diretamente para o WhatsApp dele em um clique.
                </p>

                <div className="space-y-3">
                  <div>
                    <label className="block text-slate-400 font-semibold mb-1">
                      Escolha o Assunto / Modelo de Mensagem:
                    </label>
                    <select
                      value={selectedTemplate}
                      onChange={(e) => setSelectedTemplate(e.target.value as any)}
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-slate-100 focus:outline-none focus:border-emerald-500"
                    >
                      <option value="welcome">👋 Boas-vindas & Solicitação de Documentos Iniciais</option>
                      <option value="update">⚖️ Atualização de Andamento Favorável no Processo</option>
                      <option value="hearing">📅 Notificação de Agendamento de Audiência</option>
                      <option value="signature">✍️ Solicitação de Assinatura de Procuração/Contrato</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-slate-400 font-semibold mb-1">
                      Pré-visualização e Edição do Texto:
                    </label>
                    <textarea
                      rows={6}
                      value={customMsgText}
                      onChange={(e) => setCustomMsgText(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-slate-100 placeholder-slate-500 font-sans focus:outline-none focus:border-emerald-500 leading-relaxed text-[11px]"
                    />
                  </div>

                  <div className="flex items-center justify-between gap-3 pt-1 border-t border-slate-900">
                    <div className="text-slate-400 text-[11px]">
                      Destinatário: <strong className="text-slate-200">{selectedClient.name}</strong> ({selectedClient.phone})
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        const cleanPhone = selectedClient.phone.replace(/\D/g, '');
                        const fullPhone = cleanPhone.length === 11 || cleanPhone.length === 10 ? `55${cleanPhone}` : cleanPhone;
                        const url = `https://api.whatsapp.com/send?phone=${fullPhone}&text=${encodeURIComponent(customMsgText)}`;
                        window.open(url, '_blank');
                      }}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-bold flex items-center gap-1.5 transition cursor-pointer shadow shadow-emerald-950/40 focus:outline-none"
                    >
                      <MessageSquare className="w-4 h-4" />
                      Disparar no WhatsApp
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center text-slate-400">
              Selecione um cliente para visualizar a ficha completa.
            </div>
          )}
        </div>
      </div>

      {/* Modal: Client Form (Create / Edit) */}
      {isClientModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/80 backdrop-blur-sm flex justify-center items-center p-4">
          <div className="bg-slate-900 border border-slate-700 w-full max-w-2xl rounded-2xl p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                <Users className="w-5 h-5 text-amber-400" />
                {editingClientId ? 'Editar Dados do Cliente' : 'Cadastrar Novo Cliente'}
              </h3>
              <button
                onClick={() => setIsClientModalOpen(false)}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveClient} className="space-y-4 text-xs">
              {/* Type toggle */}
              <div className="flex items-center gap-4 bg-slate-950 p-2 rounded-xl border border-slate-800">
                <button
                  type="button"
                  onClick={() => setClientType('PF')}
                  className={`flex-1 py-1.5 rounded-lg font-bold transition cursor-pointer ${
                    clientType === 'PF' ? 'bg-amber-500 text-slate-950' : 'text-slate-400'
                  }`}
                >
                  Pessoa Física (PF)
                </button>
                <button
                  type="button"
                  onClick={() => setClientType('PJ')}
                  className={`flex-1 py-1.5 rounded-lg font-bold transition cursor-pointer ${
                    clientType === 'PJ' ? 'bg-amber-500 text-slate-950' : 'text-slate-400'
                  }`}
                >
                  Pessoa Jurídica (PJ)
                </button>
              </div>

              {/* Name & Docs */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-slate-300 font-semibold mb-1">
                    {clientType === 'PF' ? 'Nome Completo *' : 'Razão Social / Nome Fantasia *'}
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-slate-100 focus:border-amber-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    {clientType === 'PF' ? 'CPF *' : 'CNPJ *'}
                  </label>
                  <input
                    type="text"
                    required
                    value={cpfCnpj}
                    onChange={(e) => setCpfCnpj(e.target.value)}
                    placeholder={clientType === 'PF' ? '000.000.000-00' : '00.000.000/0001-00'}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-slate-100 focus:border-amber-500 focus:outline-none font-mono"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    {clientType === 'PF' ? 'RG e Órgão Emissor' : 'Inscrição Estadual'}
                  </label>
                  <input
                    type="text"
                    value={rgIe}
                    onChange={(e) => setRgIe(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-slate-100 focus:border-amber-500 focus:outline-none"
                  />
                </div>

                {clientType === 'PF' && (
                  <>
                    <div>
                      <label className="block text-slate-300 font-semibold mb-1">Profissão</label>
                      <input
                        type="text"
                        value={profession}
                        onChange={(e) => setProfession(e.target.value)}
                        placeholder="Ex: Engenheiro, Professor, Aposentado..."
                        className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-slate-100 focus:border-amber-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-300 font-semibold mb-1">Estado Civil</label>
                      <input
                        type="text"
                        value={maritalStatus}
                        onChange={(e) => setMaritalStatus(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-slate-100 focus:border-amber-500 focus:outline-none"
                      />
                    </div>
                  </>
                )}

                {clientType === 'PJ' && (
                  <>
                    <div>
                      <label className="block text-slate-300 font-semibold mb-1">Nome do Representante Legal</label>
                      <input
                        type="text"
                        value={representativeName}
                        onChange={(e) => setRepresentativeName(e.target.value)}
                        placeholder="Nome do sócio administrador"
                        className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-slate-100 focus:border-amber-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-300 font-semibold mb-1">CPF do Representante</label>
                      <input
                        type="text"
                        value={representativeCpf}
                        onChange={(e) => setRepresentativeCpf(e.target.value)}
                        placeholder="000.000.000-00"
                        className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-slate-100 focus:border-amber-500 focus:outline-none font-mono"
                      />
                    </div>
                  </>
                )}

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">E-mail</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-slate-100 focus:border-amber-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Telefone / WhatsApp</label>
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => {
                      setPhone(e.target.value);
                      setWhatsapp(e.target.value);
                    }}
                    placeholder="(11) 98765-4321"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-slate-100 focus:border-amber-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Address */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-slate-800">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1 flex items-center justify-between">
                    <span>CEP *</span>
                    {isCepLoading && (
                      <span className="text-[10px] text-amber-400 font-normal animate-pulse">Buscando...</span>
                    )}
                  </label>
                  <input
                    type="text"
                    value={zipCode}
                    onChange={(e) => handleCepChange(e.target.value)}
                    placeholder="00000-000"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-slate-100 focus:border-amber-500 focus:outline-none font-mono"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-slate-300 font-semibold mb-1">Endereço (Rua/Avenida)</label>
                  <input
                    type="text"
                    value={street}
                    onChange={(e) => setStreet(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-slate-100 focus:border-amber-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Número / Compl.</label>
                  <input
                    type="text"
                    value={number}
                    onChange={(e) => setNumber(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-slate-100 focus:border-amber-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Bairro</label>
                  <input
                    type="text"
                    value={neighborhood}
                    onChange={(e) => setNeighborhood(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-slate-100 focus:border-amber-500 focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-3 gap-2 sm:col-span-1">
                  <div className="col-span-2">
                    <label className="block text-slate-300 font-semibold mb-1">Cidade</label>
                    <input
                      type="text"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-slate-100 focus:border-amber-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">UF</label>
                    <input
                      type="text"
                      maxLength={2}
                      value={state}
                      onChange={(e) => setState(e.target.value.toUpperCase())}
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-slate-100 focus:border-amber-500 focus:outline-none font-mono text-center"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Notas e Observações Internas</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                  placeholder="Informações adicionais do cliente..."
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-slate-100 focus:border-amber-500 focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsClientModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg font-semibold cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-lg font-bold cursor-pointer"
                >
                  {editingClientId ? 'Atualizar Cliente' : 'Salvar Cliente'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Client Confirmation Modal */}
      {deleteConfirmModal.isOpen && deleteConfirmModal.client && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/80 backdrop-blur-sm flex justify-center items-center p-4">
          <div className="bg-slate-900 border border-slate-700 w-full max-w-md rounded-2xl p-6 shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
              Excluir Cliente
            </h3>
            <p className="text-xs text-slate-300 leading-relaxed">
              Tem certeza que deseja excluir o cadastro de <strong>{deleteConfirmModal.client.name}</strong>?
            </p>
            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
              <button
                onClick={() => setDeleteConfirmModal({ isOpen: false, client: null })}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-semibold cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  onDeleteClient(deleteConfirmModal.client!.id);
                  setDeleteConfirmModal({ isOpen: false, client: null });
                  if (selectedClientId === deleteConfirmModal.client!.id) {
                    setSelectedClientId(clients.find((c) => c.id !== deleteConfirmModal.client!.id)?.id || null);
                  }
                }}
                className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-lg text-xs font-bold cursor-pointer"
              >
                Confirmar Exclusão
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
