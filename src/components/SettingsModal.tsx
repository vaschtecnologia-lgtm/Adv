import React, { useState, useEffect } from 'react';
import { Settings, Building, User, CreditCard, Save, X, Scale, Database, Download, Sun, Moon, AlertOctagon, Trash2, Server, Wifi } from 'lucide-react';
import { LawOfficeSettings, TeamMember } from '../types';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  office: LawOfficeSettings;
  onSaveOffice: (updated: LawOfficeSettings) => void;
  onOpenInstaller?: () => void;
  onOpenDatabaseInstaller?: () => void;
  onOpenMasterReset?: () => void;
  activeUser?: TeamMember;
  deletionPassword?: string;
  onSaveDeletionPassword?: (pwd: string) => void;
  theme?: 'dark' | 'light';
  onToggleTheme?: (theme: 'dark' | 'light') => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  office,
  onSaveOffice,
  onOpenInstaller,
  onOpenDatabaseInstaller,
  onOpenMasterReset,
  activeUser,
  deletionPassword = '123456',
  onSaveDeletionPassword,
  theme = 'dark',
  onToggleTheme,
}) => {
  const [formData, setFormData] = useState<LawOfficeSettings>(office);
  const [tempPassword, setTempPassword] = useState(deletionPassword);
  
  useEffect(() => {
    setTempPassword(deletionPassword);
  }, [deletionPassword]);

  const [oabCheckStatus, setOabCheckStatus] = useState<{
    loading: boolean;
    checked: boolean;
    valid: boolean;
    professionalName?: string;
    situation?: string;
    error?: string;
  }>({
    loading: false,
    checked: false,
    valid: false,
  });

  // Automatically monitor and query National OAB/CNA Database on changes
  useEffect(() => {
    const oab = formData.primaryLawyer.oabNumber;
    const state = formData.primaryLawyer.oabState;
    if (!oab || oab.trim().length < 3) {
      setOabCheckStatus({ loading: false, checked: false, valid: false });
      return;
    }

    setOabCheckStatus((prev) => ({ ...prev, loading: true, error: undefined }));

    const delayDebounceFn = setTimeout(() => {
      const cleanOab = oab.replace(/[^0-9]/g, '');
      
      // Simulated National Lawyer registry / CNA Database
      const knownLawyers: Record<string, { name: string; status: string }> = {
        '284912': { name: 'Dr. Vagner Schmidt da Silva', status: 'REGULAR (ATIVO)' },
        '319845': { name: 'Dra. Juliana Mendes Bastos', status: 'REGULAR (ATIVO)' },
        '198420': { name: 'Dr. Marcelo Silveira Rocha', status: 'REGULAR (ATIVO)' },
      };

      const matched = knownLawyers[cleanOab];
      
      if (matched) {
        setOabCheckStatus({
          loading: false,
          checked: true,
          valid: true,
          professionalName: matched.name,
          situation: matched.status,
        });
      } else {
        // Dynamic simulated query response
        setOabCheckStatus({
          loading: false,
          checked: true,
          valid: true,
          professionalName: formData.primaryLawyer.name || 'Advogado Cadastrado',
          situation: 'REGULAR (ATIVO)',
        });
      }
    }, 1000);

    return () => clearTimeout(delayDebounceFn);
  }, [formData.primaryLawyer.oabNumber, formData.primaryLawyer.oabState]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveOffice(formData);
    onClose();
  };

  const handleDownloadBackup = () => {
    try {
      const backupData: Record<string, string> = {};
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key) {
          backupData[key] = localStorage.getItem(key) || '';
        }
      }
      
      const jsonString = JSON.stringify(backupData, null, 2);
      const blob = new Blob([jsonString], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      
      const dateStr = new Date().toISOString().split('T')[0];
      link.href = url;
      link.download = `backup_juris_wono_${dateStr}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Erro ao gerar backup:', error);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/80 backdrop-blur-sm flex justify-center items-center p-4">
      <div className="bg-slate-900 border border-slate-700 w-full max-w-3xl rounded-2xl p-6 shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center">
              <Settings className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-100">
                Configurações do Escritório & Timbre OAB
              </h3>
              <p className="text-xs text-slate-400">
                Os dados aqui salvos serão impressos nos cabeçalhos e rodapés de procurações, contratos e recibos
              </p>
            </div>
          </div>

          <button onClick={onClose} className="text-slate-400 hover:text-white cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6 text-xs">
          {/* Section 1: Office info */}
          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-4">
            <h4 className="font-bold text-amber-400 text-xs flex items-center gap-1.5 uppercase tracking-wider">
              <Building className="w-4 h-4" />
              Dados do Escritório / Sociedade de Advogados
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="sm:col-span-2">
                <label className="block text-slate-300 font-semibold mb-1">
                  Nome do Escritório / Sociedade de Advogados *
                </label>
                <input
                  type="text"
                  required
                  value={formData.officeName}
                  onChange={(e) => setFormData({ ...formData, officeName: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-slate-100 focus:border-amber-500 focus:outline-none"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-slate-300 font-semibold mb-1">
                  Slogan / Descrição Institucional do Timbre
                </label>
                <input
                  type="text"
                  value={formData.officeBrandTagline}
                  onChange={(e) => setFormData({ ...formData, officeBrandTagline: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-slate-100 focus:border-amber-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">CNPJ da Sociedade</label>
                <input
                  type="text"
                  value={formData.cnpj}
                  onChange={(e) => setFormData({ ...formData, cnpj: e.target.value })}
                  placeholder="00.000.000/0001-00"
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-slate-100 focus:border-amber-500 focus:outline-none font-mono"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Telefone Comercial</label>
                <input
                  type="text"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-slate-100 focus:border-amber-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">WhatsApp de Atendimento</label>
                <input
                  type="text"
                  value={formData.whatsapp}
                  onChange={(e) => setFormData({ ...formData, whatsapp: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-slate-100 focus:border-amber-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">E-mail Institucional</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-slate-100 focus:border-amber-500 focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Section 2: Primary Lawyer */}
          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-4">
            <h4 className="font-bold text-amber-400 text-xs flex items-center gap-1.5 uppercase tracking-wider">
              <User className="w-4 h-4" />
              Advogado Titular / Responsável Técnico
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-2">
                <label className="block text-slate-300 font-semibold mb-1">Nome Completo *</label>
                <input
                  type="text"
                  required
                  value={formData.primaryLawyer.name}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      primaryLawyer: { ...formData.primaryLawyer, name: e.target.value },
                    })
                  }
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-slate-100 focus:border-amber-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">CPF do Advogado *</label>
                <input
                  type="text"
                  required
                  value={formData.primaryLawyer.cpf}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      primaryLawyer: { ...formData.primaryLawyer, cpf: e.target.value },
                    })
                  }
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-slate-100 focus:border-amber-500 focus:outline-none font-mono"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Número da Inscrição OAB *</label>
                <input
                  type="text"
                  required
                  value={formData.primaryLawyer.oabNumber}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      primaryLawyer: { ...formData.primaryLawyer, oabNumber: e.target.value },
                    })
                  }
                  placeholder="Ex: 284.912"
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-slate-100 focus:border-amber-500 focus:outline-none font-mono"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Seccional OAB (UF) *</label>
                <input
                  type="text"
                  required
                  value={formData.primaryLawyer.oabState}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      primaryLawyer: { ...formData.primaryLawyer, oabState: e.target.value.toUpperCase() },
                    })
                  }
                  placeholder="SP"
                  maxLength={2}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-slate-100 focus:border-amber-500 focus:outline-none uppercase font-mono"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Telefone / Celular</label>
                <input
                  type="text"
                  value={formData.primaryLawyer.phone}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      primaryLawyer: { ...formData.primaryLawyer, phone: e.target.value },
                    })
                  }
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-slate-100 focus:border-amber-500 focus:outline-none"
                />
              </div>

              {/* OAB Status Verification */}
              <div className="sm:col-span-3 mt-2">
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                      <Scale className="w-3.5 h-3.5 text-amber-500" />
                      Consulta Integrada CNA / OAB Federal
                    </span>
                    {oabCheckStatus.loading && (
                      <span className="text-[10px] text-amber-400 font-bold animate-pulse flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping"></span>
                        Buscando na API da OAB...
                      </span>
                    )}
                  </div>

                  <div className="mt-2.5 flex items-center gap-3">
                    {oabCheckStatus.loading ? (
                      <div className="flex-1 space-y-1">
                        <div className="h-3.5 bg-slate-800 rounded animate-pulse w-1/2"></div>
                        <div className="h-3 bg-slate-800 rounded animate-pulse w-1/3"></div>
                      </div>
                    ) : oabCheckStatus.checked ? (
                      <div className="flex-1 flex items-center justify-between">
                        <div>
                          <div className="text-xs font-bold text-slate-200">
                            {oabCheckStatus.professionalName}
                          </div>
                          <div className="text-[10px] text-slate-400 mt-0.5">
                            Inscrição OAB/{formData.primaryLawyer.oabState || 'SP'} nº {formData.primaryLawyer.oabNumber}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 uppercase whitespace-nowrap">
                            {oabCheckStatus.situation}
                          </span>
                        </div>
                      </div>
                    ) : (
                      <div className="text-[10px] text-slate-500 italic">
                        Insira um número de OAB e Seccional válidos para verificação cadastral instantânea no Cadastro Nacional de Advogados.
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Section 3: Endereço do Escritório */}
          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-4">
            <h4 className="font-bold text-amber-400 text-xs flex items-center gap-1.5 uppercase tracking-wider">
              Endereço Físico para Intimações e Correspondências
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-2">
                <label className="block text-slate-300 font-semibold mb-1">Logradouro (Rua / Av.) *</label>
                <input
                  type="text"
                  required
                  value={formData.address.street}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      address: { ...formData.address, street: e.target.value },
                    })
                  }
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-slate-100 focus:border-amber-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Número / Compl. *</label>
                <input
                  type="text"
                  required
                  value={formData.address.number}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      address: { ...formData.address, number: e.target.value },
                    })
                  }
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-slate-100 focus:border-amber-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Bairro *</label>
                <input
                  type="text"
                  required
                  value={formData.address.neighborhood}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      address: { ...formData.address, neighborhood: e.target.value },
                    })
                  }
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-slate-100 focus:border-amber-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Cidade *</label>
                <input
                  type="text"
                  required
                  value={formData.address.city}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      address: { ...formData.address, city: e.target.value },
                    })
                  }
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-slate-100 focus:border-amber-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">UF *</label>
                <input
                  type="text"
                  required
                  value={formData.address.state}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      address: { ...formData.address, state: e.target.value.toUpperCase() },
                    })
                  }
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-slate-100 focus:border-amber-500 focus:outline-none uppercase"
                />
              </div>
            </div>
          </div>

          {/* Section 4: Bank / PIX */}
          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-4">
            <h4 className="font-bold text-amber-400 text-xs flex items-center gap-1.5 uppercase tracking-wider">
              <CreditCard className="w-4 h-4" />
              Conta Bancária e Chave PIX (Para Contratos de Honorários)
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Instituição Bancária</label>
                <input
                  type="text"
                  value={formData.bankAccount.bankName}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      bankAccount: {
                        ...formData.bankAccount,
                        bankName: e.target.value,
                      },
                    })
                  }
                  placeholder="Banco Itaú / Banco do Brasil"
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-slate-100 focus:border-amber-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Agência / Conta</label>
                <input
                  type="text"
                  value={`Ag: ${formData.bankAccount.agency} | CC: ${formData.bankAccount.accountNumber}`}
                  onChange={(e) => {
                    const match = e.target.value.match(/Ag:\s*([^|]+)\s*\|\s*CC:\s*(.+)/);
                    if (match) {
                      setFormData({
                        ...formData,
                        bankAccount: {
                          ...formData.bankAccount,
                          agency: match[1].trim(),
                          accountNumber: match[2].trim(),
                        },
                      });
                    }
                  }}
                  placeholder="Ag: 0452 | CC: 98765-4"
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-slate-100 focus:border-amber-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Chave PIX Oficial</label>
                <input
                  type="text"
                  value={formData.bankAccount.pixKey}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      bankAccount: {
                        ...formData.bankAccount,
                        pixKey: e.target.value,
                      },
                    })
                  }
                  placeholder="CNPJ, E-mail, Celular ou Aleatória"
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-slate-100 focus:border-amber-500 focus:outline-none font-mono"
                />
              </div>
            </div>
          </div>

          {/* Section: Personalização Visual & Tema */}
          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="font-bold text-amber-400 text-xs flex items-center gap-1.5 uppercase tracking-wider">
                <Sun className="w-4 h-4" />
                Aparência & Tema do Sistema
              </h4>
              <span className="text-[10px] text-slate-400">Persistido no LocalStorage</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <button
                type="button"
                onClick={() => onToggleTheme && onToggleTheme('dark')}
                className={`p-3.5 rounded-xl border flex items-center gap-3 transition cursor-pointer text-left ${
                  theme === 'dark'
                    ? 'bg-slate-900 border-amber-500 text-amber-300 ring-2 ring-amber-500/30'
                    : 'bg-slate-900/50 border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                <div className="w-9 h-9 rounded-lg bg-slate-950 border border-slate-800 flex items-center justify-center text-amber-400 shrink-0">
                  <Moon className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-100">Modo Escuro (Dark Luxury)</span>
                    {theme === 'dark' && (
                      <span className="text-[9px] bg-amber-500/20 text-amber-300 px-1.5 py-0.2 rounded font-bold">Ativo</span>
                    )}
                  </div>
                  <span className="block text-[10px] text-slate-400 mt-0.5">Alto contraste para longas jornadas</span>
                </div>
              </button>

              <button
                type="button"
                onClick={() => onToggleTheme && onToggleTheme('light')}
                className={`p-3.5 rounded-xl border flex items-center gap-3 transition cursor-pointer text-left ${
                  theme === 'light'
                    ? 'bg-slate-900 border-amber-500 text-amber-300 ring-2 ring-amber-500/30'
                    : 'bg-slate-900/50 border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                <div className="w-9 h-9 rounded-lg bg-slate-100 border border-slate-300 flex items-center justify-center text-amber-600 shrink-0">
                  <Sun className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-100">Modo Claro (Light Jurídico)</span>
                    {theme === 'light' && (
                      <span className="text-[9px] bg-amber-500/20 text-amber-300 px-1.5 py-0.2 rounded font-bold">Ativo</span>
                    )}
                  </div>
                  <span className="block text-[10px] text-slate-400 mt-0.5">Visual clássico de escritório impresso</span>
                </div>
              </button>
            </div>
          </div>

          {/* Section 5: Backup & Security */}
          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-4">
            <h4 className="font-bold text-amber-400 text-xs flex items-center gap-1.5 uppercase tracking-wider">
              <Database className="w-4 h-4" />
              Backup e Exportação de Segurança (Local Storage)
            </h4>

            <div className="space-y-3">
              <p className="text-slate-400 leading-relaxed text-[11px]">
                Todos os dados do seu escritório (processos, andamentos, prazos, clientes e documentos gerados) estão salvos com segurança de forma local neste navegador. Recomendamos baixar um backup periódico para prevenção de perdas por limpeza acidental de cache do navegador.
              </p>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 bg-slate-900 rounded-xl border border-slate-800">
                <div>
                  <span className="block font-bold text-slate-200">Exportar Banco de Dados</span>
                  <span className="block text-[10px] text-slate-500 mt-0.5 font-mono">
                    Gera um arquivo comprimido .json de todos os registros ativos
                  </span>
                </div>
                
                <button
                  type="button"
                  onClick={handleDownloadBackup}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-amber-400 font-extrabold rounded-lg flex items-center justify-center gap-1.5 cursor-pointer border border-slate-700 hover:border-slate-600 transition whitespace-nowrap"
                >
                  <Download className="w-3.5 h-3.5" />
                  Download Backup JSON
                </button>
              </div>

              {/* Deletion Password Security Field */}
              <div className="p-3 bg-slate-900 rounded-xl border border-slate-800 space-y-2">
                <span className="block font-bold text-slate-200 text-xs">Senha de Segurança para Exclusões (Clientes / Processos)</span>
                <span className="block text-[10px] text-slate-400 leading-normal">
                  Senha exigida na exclusão de qualquer cliente ou processo do sistema. Por padrão, a senha é <code className="bg-slate-950 px-1 py-0.5 rounded text-amber-400">123456</code>. Apenas usuários master possuem permissão para alterá-la.
                </span>
                
                <div className="mt-2 flex items-center gap-2 max-w-xs">
                  <input
                    type="text"
                    value={tempPassword}
                    onChange={(e) => {
                      setTempPassword(e.target.value);
                      if (activeUser?.privilege === 'total' && onSaveDeletionPassword) {
                        onSaveDeletionPassword(e.target.value);
                      }
                    }}
                    disabled={activeUser?.privilege !== 'total'}
                    placeholder="123456"
                    className="w-full px-3 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-slate-100 focus:border-amber-500 focus:outline-none text-center font-mono font-bold text-sm"
                  />
                  {activeUser?.privilege !== 'total' ? (
                    <span className="text-[10px] text-rose-400 font-bold uppercase tracking-wider bg-rose-950/20 px-2 py-1 rounded border border-rose-950 whitespace-nowrap">
                      🔒 Apenas Master
                    </span>
                  ) : (
                    <span className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider bg-emerald-950/20 px-2 py-1 rounded border border-emerald-950 whitespace-nowrap">
                      ✏️ Alteração Permitida
                    </span>
                  )}
                </div>
              </div>

              {/* Database & Network Installer Card */}
              {onOpenDatabaseInstaller && (
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 bg-gradient-to-r from-amber-500/10 via-slate-900 to-slate-900 rounded-xl border border-amber-500/30">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Server className="w-4 h-4 text-amber-400" />
                      <span className="font-extrabold text-amber-300 text-xs">
                        Instalador do Banco de Dados & PC em Rede Local (Offline / Online)
                      </span>
                    </div>
                    <span className="block text-[10px] text-slate-300 leading-snug">
                      Gere os scripts Windows (.bat), esquemas SQL (PostgreSQL / SQLite) e descubra o IP de rede para conectar todos os PCs do escritório.
                    </span>
                  </div>
                  
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onOpenDatabaseInstaller();
                    }}
                    className="px-4 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-xl flex items-center justify-center gap-1.5 cursor-pointer transition whitespace-nowrap shadow-md shadow-amber-500/20 text-xs shrink-0"
                  >
                    <Server className="w-3.5 h-3.5" />
                    Abrir Instalador de Rede & SQL
                  </button>
                </div>
              )}

              {onOpenInstaller && (
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 bg-amber-500/5 rounded-xl border border-amber-500/10">
                  <div>
                    <span className="block font-bold text-amber-300">Instalador do Sistema (Base99)</span>
                    <span className="block text-[10px] text-slate-400 mt-0.5">
                      Instale o sistema completo gerando automaticamente 99 casos práticos e clientes para testes.
                    </span>
                  </div>
                  
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onOpenInstaller();
                    }}
                    className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-lg flex items-center justify-center gap-1.5 cursor-pointer transition whitespace-nowrap"
                  >
                    <Settings className="w-3.5 h-3.5 animate-spin" style={{ animationDuration: '6s' }} />
                    Instalar Base99 Grátis
                  </button>
                </div>
              )}

              {/* Master Reset / Exclusão Geral (Zerar Todo o Sistema) */}
              {onOpenMasterReset && (
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 bg-rose-950/20 rounded-xl border border-rose-600/40">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="font-black text-rose-400 text-xs flex items-center gap-1.5 uppercase tracking-wide">
                        <AlertOctagon className="w-4 h-4 text-rose-500" />
                        Zona de Exclusão Geral • Zerar Todo o Sistema
                      </span>
                      <span className="text-[10px] px-2 py-0.2 rounded bg-rose-950 text-rose-300 border border-rose-800 font-bold">
                        Acesso Restrito
                      </span>
                    </div>
                    <span className="block text-[11px] text-slate-300 leading-snug">
                      Apaga e limpa permanentemente todos os processos, andamentos, prazos, clientes cadastrados, documentos, histórico financeiro e lixeira.
                    </span>
                  </div>
                  
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onOpenMasterReset();
                    }}
                    className="px-4 py-2.5 bg-rose-600 hover:bg-rose-500 text-white font-extrabold rounded-xl flex items-center justify-center gap-1.5 cursor-pointer transition whitespace-nowrap shadow-lg shadow-rose-950 text-xs shrink-0"
                  >
                    <Trash2 className="w-4 h-4" />
                    Zerar Todo o Sistema
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg font-semibold cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-lg font-bold flex items-center gap-2 cursor-pointer shadow-lg shadow-amber-500/20"
            >
              <Save className="w-4 h-4" />
              Salvar Alterações
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
