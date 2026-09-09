/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { 
  initialOfficeSettings, 
  initialClients, 
  initialProcesses, 
  initialDeadlines, 
  initialDocuments,
  initialTeamMembers,
  initialFinancialRecords,
  initialSaaSConfig,
  initialAuditLogs,
  initialTrashItems
} from './data/initialData';
import { 
  Client, 
  LawOfficeSettings, 
  LegalProcess, 
  ProcessDeadline, 
  LegalDocumentItem,
  TeamMember,
  FinancialRecord,
  SaaSTenantConfig,
  AuditLog,
  ProcessMovement,
  TrashItem
} from './types';
import { Navbar, TabType } from './components/Navbar';
import { DashboardView } from './components/DashboardView';
import { ProcessesAndamentosView } from './components/ProcessesAndamentosView';
import { DocumentsView } from './components/DocumentsView';
import { DeadlinesView } from './components/DeadlinesView';
import { ClientsView } from './components/ClientsView';
import { EquipeView } from './components/EquipeView';
import { SaasView } from './components/SaasView';
import { LixeiraView } from './components/LixeiraView';
import { SettingsModal } from './components/SettingsModal';
import { PrintDocumentModal } from './components/PrintDocumentModal';
import { AutoInstallerModal } from './components/AutoInstallerModal';
import { DatabaseAndNetworkInstallerModal } from './components/DatabaseAndNetworkInstallerModal';
import { MasterResetModal } from './components/MasterResetModal';
import { GlobalSearchModal } from './components/GlobalSearchModal';
import { 
  generateProcuracaoText, 
  generateContratoHonorariosText, 
  generateDeclaracaoHipossuficienciaText,
  generateReciboHonorariosText,
  generateSubstabelecimentoText
} from './utils/documentGenerator';

export default function App() {
  // Navigation State
  const [currentTab, setCurrentTab] = useState<TabType>('dashboard');

  // Persistence State
  const [office, setOffice] = useState<LawOfficeSettings>(() => {
    const saved = localStorage.getItem('juris_office_settings');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (!parsed.officeName || parsed.officeName.includes('Silveira, Bastos')) {
          parsed.officeName = 'WONO ADVOCACIA';
          parsed.officeBrandTagline = 'Sociedade de Advogados • Advocacia Estratégica, Consultoria & Contencioso';
          parsed.email = 'contato@wonoadvocacia.com.br';
          parsed.website = 'www.wonoadvocacia.com.br';
          if (parsed.bankAccount) {
            parsed.bankAccount.accountHolder = 'WONO ADVOCACIA';
          }
        }
        return parsed;
      } catch {
        return initialOfficeSettings;
      }
    }
    return initialOfficeSettings;
  });

  const [clients, setClients] = useState<Client[]>(() => {
    const saved = localStorage.getItem('juris_clients');
    if (saved !== null) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      } catch {}
    }
    const isCleared = localStorage.getItem('wono_system_cleared');
    return isCleared === 'true' ? [] : initialClients;
  });

  const [processes, setProcesses] = useState<LegalProcess[]>(() => {
    const isCleared = localStorage.getItem('wono_system_cleared');
    const saved = localStorage.getItem('juris_processes');
    if (saved !== null) {
      try {
        const parsed: LegalProcess[] = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          if (parsed.length === 0) return [];
          const seenMovementIds = new Set<string>();
          return parsed.map((proc, pIdx) => {
            let movements = Array.isArray(proc.movements) ? proc.movements : [];
            return {
              ...proc,
              id: proc.id || `proc-${pIdx + 1}`,
              movements: movements.map((mov, mIdx) => {
                let movId = mov.id;
                if (!movId || seenMovementIds.has(movId) || movId.startsWith('mov-live-')) {
                  movId = `mov-${proc.id || pIdx}-${mIdx + 1}-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`;
                }
                seenMovementIds.add(movId);
                return {
                  ...mov,
                  id: movId,
                };
              }),
            };
          });
        }
      } catch {
        return isCleared === 'true' ? [] : initialProcesses;
      }
    }
    return isCleared === 'true' ? [] : initialProcesses;
  });

  const [deadlines, setDeadlines] = useState<ProcessDeadline[]>(() => {
    const saved = localStorage.getItem('juris_deadlines');
    if (saved !== null) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      } catch {}
    }
    const isCleared = localStorage.getItem('wono_system_cleared');
    return isCleared === 'true' ? [] : initialDeadlines;
  });

  const [documents, setDocuments] = useState<LegalDocumentItem[]>(() => {
    const saved = localStorage.getItem('juris_documents');
    if (saved !== null) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      } catch {}
    }
    const isCleared = localStorage.getItem('wono_system_cleared');
    return isCleared === 'true' ? [] : initialDocuments;
  });

  // SaaS and Multi-Tenant Module State
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>(() => {
    const saved = localStorage.getItem('wono_team_members');
    return saved ? JSON.parse(saved) : initialTeamMembers;
  });

  // User Privileges & Deletion Security State
  const [activeUserId, setActiveUserId] = useState<string>(() => {
    return localStorage.getItem('wono_active_user_id') || 'team-1';
  });

  const [deletionPassword, setDeletionPassword] = useState<string>(() => {
    return localStorage.getItem('wono_deletion_password') || '123456';
  });

  const [deleteModalConfig, setDeleteModalConfig] = useState<{
    isOpen: boolean;
    type: 'processo' | 'cliente';
    itemId: string;
    itemTitle: string;
  }>({
    isOpen: false,
    type: 'processo',
    itemId: '',
    itemTitle: '',
  });

  const [enteredDeletePassword, setEnteredDeletePassword] = useState('');
  const [deletePasswordError, setDeletePasswordError] = useState('');

  const activeUser = useMemo(() => {
    return teamMembers.find((m) => m.id === activeUserId) || teamMembers[0] || {
      id: 'team-1',
      name: 'Dr. Vagner Schmidt da Silva',
      role: 'Sócio Administrador',
      privilege: 'total' as const
    };
  }, [teamMembers, activeUserId]);

  const [financialRecords, setFinancialRecords] = useState<FinancialRecord[]>(() => {
    const saved = localStorage.getItem('wono_financial_records');
    if (saved !== null) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      } catch {}
    }
    const isCleared = localStorage.getItem('wono_system_cleared');
    return isCleared === 'true' ? [] : initialFinancialRecords;
  });

  const [saasConfig, setSaasConfig] = useState<SaaSTenantConfig>(() => {
    const saved = localStorage.getItem('wono_saas_config');
    return saved ? JSON.parse(saved) : initialSaaSConfig;
  });

  const [auditLogs, setAuditLogs] = useState<AuditLog[]>(() => {
    const saved = localStorage.getItem('wono_audit_logs');
    if (saved !== null) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      } catch {}
    }
    const isCleared = localStorage.getItem('wono_system_cleared');
    return isCleared === 'true' ? [] : initialAuditLogs;
  });

  // Dark / Light Theme State with Persistence
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    const saved = localStorage.getItem('wono_advocacia_theme');
    return saved === 'light' || saved === 'dark' ? saved : 'dark';
  });

  // Recycle Bin (Lixeira) State with Persistence
  const [trashItems, setTrashItems] = useState<TrashItem[]>(() => {
    const saved = localStorage.getItem('wono_advocacia_trash_items');
    if (saved !== null) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      } catch {}
    }
    const isCleared = localStorage.getItem('wono_system_cleared');
    return isCleared === 'true' ? [] : initialTrashItems;
  });

  // UI States
  const [selectedProcessId, setSelectedProcessId] = useState<string | null>(processes[0]?.id || null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isInstallerOpen, setIsInstallerOpen] = useState(false);
  const [isDatabaseInstallerOpen, setIsDatabaseInstallerOpen] = useState(false);
  const [isMasterResetOpen, setIsMasterResetOpen] = useState(false);
  const [isGlobalSearchOpen, setIsGlobalSearchOpen] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncToastMessage, setSyncToastMessage] = useState<string | null>(null);

  // Native Browser Notifications Permission State
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>('default');

  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setNotificationPermission(Notification.permission);
    }
  }, []);

  const handleRequestNotificationPermission = async () => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      try {
        const permission = await Notification.requestPermission();
        setNotificationPermission(permission);
        if (permission === 'granted') {
          new Notification('🔔 Notificações Ativadas - Wono Advocacia', {
            body: 'As notificações nativas do sistema operacional para prazos urgentes foram ativadas com sucesso!',
            icon: '/favicon.ico',
          });
          setSyncToastMessage('🔔 Notificações do navegador ativadas!');
        } else if (permission === 'denied') {
          setSyncToastMessage('⚠️ Permissão para notificações negada pelo navegador.');
        }
        setTimeout(() => setSyncToastMessage(null), 4000);
      } catch (err) {
        console.error('Erro ao solicitar permissão de notificação:', err);
      }
    } else {
      setSyncToastMessage('❌ Seu navegador não suporta notificações nativas.');
      setTimeout(() => setSyncToastMessage(null), 4000);
    }
  };

  // Global Keyboard Shortcut for Search Lupa (Ctrl+K, Cmd+K or /)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsGlobalSearchOpen((prev) => !prev);
      } else if (
        e.key === '/' && 
        !['input', 'textarea', 'select'].includes((e.target as HTMLElement)?.tagName?.toLowerCase() || '')
      ) {
        e.preventDefault();
        setIsGlobalSearchOpen(true);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Active Alert Notifications (simulated 24-hour visual banners)
  const [activeAlerts, setActiveAlerts] = useState<Array<{ id: string; title: string; message: string; type: 'warning' | 'info' }>>([]);
  const [dismissedAlertIds, setDismissedAlertIds] = useState<string[]>([]);

  // Dynamically calculate and synchronize days left and statuses for all deadlines based on today's date
  const computedDeadlines = useMemo(() => {
    const today = new Date();
    const todayMidnight = new Date(today.getFullYear(), today.getMonth(), today.getDate());

    return deadlines.map((d) => {
      if (d.status === 'cumprido') return d;

      const targetDate = new Date(d.fatalDate + 'T12:00:00');
      const targetMidnight = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate());
      
      const diffTime = targetMidnight.getTime() - todayMidnight.getTime();
      const calculatedDaysLeft = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      let computedStatus = d.status;
      if (calculatedDaysLeft < 0) {
        computedStatus = 'atrasado';
      } else if (calculatedDaysLeft <= 3) {
        computedStatus = 'alerta';
      } else {
        computedStatus = 'pendente';
      }

      return {
        ...d,
        daysLeft: calculatedDaysLeft,
        status: computedStatus,
      };
    });
  }, [deadlines]);

  // Extract all pending uncompleted deadlines with 3 or fewer days remaining that aren't dismissed
  const urgentDeadlinesToAlert = useMemo(() => {
    return computedDeadlines.filter(
      (d) => d.status !== 'cumprido' && d.daysLeft <= 3 && !dismissedAlertIds.includes(d.id)
    );
  }, [computedDeadlines, dismissedAlertIds]);

  // Direct Print Modal State
  const [quickPrintDoc, setQuickPrintDoc] = useState<{
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

  // Sync to local storage
  useEffect(() => {
    localStorage.setItem('juris_office_settings', JSON.stringify(office));
  }, [office]);

  useEffect(() => {
    localStorage.setItem('juris_clients', JSON.stringify(clients));
  }, [clients]);

  useEffect(() => {
    localStorage.setItem('juris_processes', JSON.stringify(processes));
  }, [processes]);

  useEffect(() => {
    localStorage.setItem('juris_deadlines', JSON.stringify(deadlines));
  }, [deadlines]);

  useEffect(() => {
    localStorage.setItem('juris_documents', JSON.stringify(documents));
  }, [documents]);

  useEffect(() => {
    localStorage.setItem('wono_team_members', JSON.stringify(teamMembers));
  }, [teamMembers]);

  useEffect(() => {
    localStorage.setItem('wono_financial_records', JSON.stringify(financialRecords));
  }, [financialRecords]);

  useEffect(() => {
    localStorage.setItem('wono_saas_config', JSON.stringify(saasConfig));
  }, [saasConfig]);

  useEffect(() => {
    localStorage.setItem('wono_audit_logs', JSON.stringify(auditLogs));
  }, [auditLogs]);

  useEffect(() => {
    localStorage.setItem('wono_active_user_id', activeUserId);
  }, [activeUserId]);

  useEffect(() => {
    localStorage.setItem('wono_deletion_password', deletionPassword);
  }, [deletionPassword]);

  // Theme Sync Effect
  useEffect(() => {
    localStorage.setItem('wono_advocacia_theme', theme);
    if (theme === 'light') {
      document.documentElement.classList.add('light');
      document.documentElement.classList.remove('dark');
    } else {
      document.documentElement.classList.add('dark');
      document.documentElement.classList.remove('light');
    }
  }, [theme]);

  // Recycle Bin (Lixeira) Persistence
  useEffect(() => {
    localStorage.setItem('wono_advocacia_trash_items', JSON.stringify(trashItems));
  }, [trashItems]);

  const handleToggleTheme = (newTheme: 'dark' | 'light') => {
    setTheme(newTheme);
  };

  // Audit Log Helper
  const logAction = (
    action: AuditLog['action'], 
    entity: AuditLog['entity'], 
    description: string
  ) => {
    const newLog: AuditLog = {
      id: `log-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
      userName: activeUser?.name || 'Dr. Vagner Schmidt',
      userRole: activeUser?.role || 'Sócio Administrador',
      action,
      entity,
      description,
    };
    setAuditLogs((prev) => [newLog, ...prev.slice(0, 99)]);
  };

  // Recycle Bin (Lixeira) Handlers
  const handleRestoreTrashItem = (item: TrashItem) => {
    if (item.type === 'processo' && item.data) {
      setProcesses((prev) => {
        if (prev.some((p) => p.id === item.data.id)) return prev;
        return [item.data, ...prev];
      });
      setSelectedProcessId(item.data.id);
    } else if (item.type === 'cliente' && item.data) {
      setClients((prev) => {
        if (prev.some((c) => c.id === item.data.id)) return prev;
        return [item.data, ...prev];
      });
    } else if (item.type === 'prazo' && item.data) {
      setDeadlines((prev) => {
        if (prev.some((d) => d.id === item.data.id)) return prev;
        return [item.data, ...prev];
      });
    } else if (item.type === 'documento' && item.data) {
      setDocuments((prev) => {
        if (prev.some((d) => d.id === item.data.id)) return prev;
        return [item.data, ...prev];
      });
    }

    setTrashItems((prev) => prev.filter((i) => i.id !== item.id));
    logAction('RESTORE', 'LIXEIRA', `Item restaurado da lixeira: "${item.title}"`);
    setSyncToastMessage(`♻️ ${item.title} restaurado com sucesso!`);
    setTimeout(() => setSyncToastMessage(null), 4000);
  };

  const handlePermanentlyDeleteTrashItem = (item: TrashItem) => {
    setTrashItems((prev) => prev.filter((i) => i.id !== item.id));
    logAction('PURGE', 'LIXEIRA', `Item excluído permanentemente da lixeira: "${item.title}"`);
    setSyncToastMessage(`🗑️ Item expurgado permanentemente.`);
    setTimeout(() => setSyncToastMessage(null), 4000);
  };

  const handleEmptyTrash = () => {
    const count = trashItems.length;
    setTrashItems([]);
    logAction('PURGE', 'LIXEIRA', `Lixeira esvaziada por completo (${count} itens expurgados).`);
    setSyncToastMessage(`🧹 Lixeira esvaziada com sucesso (${count} itens removidos).`);
    setTimeout(() => setSyncToastMessage(null), 4000);
  };

  // Simulated Deadline Reminder Checker (scans deadlines and triggers logs/visual alerts)
  useEffect(() => {
    const checkDeadlines = () => {
      const now = Date.now();
      let updatedAny = false;

      const nextDeadlines = deadlines.map((d) => {
        if (d.status === 'cumprido') return d;

        // Parse fatal date (T12:00:00 local time)
        const fatalTime = new Date(d.fatalDate + 'T12:00:00').getTime();
        const msLeft = fatalTime - now;
        const hoursLeft = msLeft / (1000 * 60 * 60);
        const limitHours = d.reminderHours !== undefined ? d.reminderHours : 24;

        // If reminder is enabled (> 0) and current time is within the notification window, trigger alert
        if (limitHours > 0 && hoursLeft <= limitHours && hoursLeft > 0 && !d.reminderNotified) {
          updatedAny = true;

          // Write system audit log
          logAction('UPDATE', 'PRAZO', `⚠️ ALERTA DE LEMBRETE (${limitHours}h): O prazo "${d.title}" vence em menos de ${Math.ceil(hoursLeft)} horas!`);

          // Append to active visual alerts
          setActiveAlerts((prev) => {
            if (prev.some((a) => a.id === d.id)) return prev;
            return [
              ...prev,
              {
                id: d.id,
                title: `⚠️ Lembrete Prévio (${limitHours} horas)`,
                message: `O prazo "${d.title}" vinculado ao processo CNJ ${d.processNumber} vence em ${Math.ceil(hoursLeft)} horas! (Data Fatal: ${new Date(d.fatalDate + 'T12:00:00').toLocaleDateString('pt-BR')})`,
                type: 'warning',
              },
            ];
          });

          // DISPARAR ALERTA NATIVO DO SISTEMA OPERACIONAL (API de Notificações do Navegador)
          if (typeof window !== 'undefined' && 'Notification' in window) {
            if (Notification.permission === 'granted') {
              try {
                const title = `🚨 PRAZO URGENTE! (${Math.ceil(hoursLeft)}h restantes)`;
                const body = `O prazo "${d.title}" vinculado ao processo CNJ ${d.processNumber} vence em breve!\nCliente: ${d.clientName}\nData Fatal: ${new Date(d.fatalDate + 'T12:00:00').toLocaleDateString('pt-BR')}`;
                new Notification(title, {
                  body,
                  icon: '/favicon.ico',
                  tag: d.id, // impede spam de duplicados
                  requireInteraction: true,
                });
              } catch (err) {
                console.error('Erro ao disparar notificação nativa:', err);
              }
            }
          }

          return { ...d, reminderNotified: true };
        }
        return d;
      });

      if (updatedAny) {
        setDeadlines(nextDeadlines);
      }
    };

    checkDeadlines();
    const interval = setInterval(checkDeadlines, 10000);
    return () => clearInterval(interval);
  }, [deadlines]);

  // Handlers for Processes
  const handleAddProcess = (newProc: LegalProcess) => {
    setProcesses((prev) => [newProc, ...prev]);
    setSelectedProcessId(newProc.id);
    logAction('CREATE', 'PROCESSO', `Processo CNJ ${newProc.cnjNumber} autuado para ${newProc.activeParty}`);
  };

  const handleBulkImportProcesses = (
    importedProcesses: LegalProcess[],
    newClientsToImport?: Client[],
    newDeadlinesToImport?: ProcessDeadline[]
  ) => {
    if (!importedProcesses || importedProcesses.length === 0) return;

    // 1. Merge processes without duplicates
    setProcesses((prev) => {
      const existingCnjMap = new Map<string, LegalProcess>();
      prev.forEach((p) => {
        const clean = p.cnjNumber.replace(/[^a-zA-Z0-9]/g, '');
        existingCnjMap.set(clean, p);
      });

      const updatedList = [...prev];

      importedProcesses.forEach((newProc) => {
        const clean = newProc.cnjNumber.replace(/[^a-zA-Z0-9]/g, '');
        if (existingCnjMap.has(clean)) {
          // Update existing with new movements and sync date
          const existing = existingCnjMap.get(clean)!;
          const mergedMovements = [...(newProc.movements || [])];
          (existing.movements || []).forEach((em) => {
            if (!mergedMovements.some((nm) => nm.id === em.id || nm.title === em.title)) {
              mergedMovements.push(em);
            }
          });
          const index = updatedList.findIndex((p) => p.id === existing.id);
          if (index !== -1) {
            updatedList[index] = {
              ...existing,
              ...newProc,
              id: existing.id,
              movements: mergedMovements,
              lastSyncDate: new Date().toISOString(),
            };
          }
        } else {
          updatedList.unshift(newProc);
        }
      });

      return updatedList;
    });

    // 2. Add any new clients
    if (newClientsToImport && newClientsToImport.length > 0) {
      setClients((prevClients) => {
        const existingCpfs = new Set(prevClients.map((c) => c.cpfCnpj.replace(/[^a-zA-Z0-9]/g, '')));
        const existingNames = new Set(prevClients.map((c) => c.name.trim().toLowerCase()));
        const toAdd = newClientsToImport.filter((nc) => {
          const cleanCpf = nc.cpfCnpj.replace(/[^a-zA-Z0-9]/g, '');
          const cleanName = nc.name.trim().toLowerCase();
          return !existingCpfs.has(cleanCpf) && !existingNames.has(cleanName);
        });
        return [...toAdd, ...prevClients];
      });
    }

    // 3. Add any new deadlines
    if (newDeadlinesToImport && newDeadlinesToImport.length > 0) {
      setDeadlines((prevDeadlines) => {
        const existingKeys = new Set(
          prevDeadlines.map((d) => `${d.processNumber}_${d.title}_${d.fatalDate}`)
        );
        const toAdd = newDeadlinesToImport.filter(
          (nd) => !existingKeys.has(`${nd.processNumber}_${nd.title}_${nd.fatalDate}`)
        );
        return [...toAdd, ...prevDeadlines];
      });
    }

    if (importedProcesses[0]?.id) {
      setSelectedProcessId(importedProcesses[0].id);
    }

    setSyncToastMessage(`✅ ${importedProcesses.length} processos por OAB importados e sincronizados com sucesso!`);
    setTimeout(() => setSyncToastMessage(null), 5000);

    logAction(
      'SYNC',
      'PROCESSO',
      `Sincronização em lote por OAB: ${importedProcesses.length} processos incorporados ao sistema`
    );
  };

  const handleUpdateProcess = (updatedProc: LegalProcess) => {
    setProcesses((prev) => prev.map((p) => (p.id === updatedProc.id ? updatedProc : p)));
    logAction('UPDATE', 'PROCESSO', `Processo ${updatedProc.cnjNumber} atualizado`);
  };

  const handleDeleteProcess = (processId: string) => {
    const proc = processes.find((p) => p.id === processId);
    if (!proc) return;
    
    // Check if user is General Administrator (Sócio Administrador or total privilege)
    const isGeneralAdmin = activeUser?.role === 'Sócio Administrador' || activeUser?.privilege === 'total';
    if (!isGeneralAdmin) {
      setSyncToastMessage('⚠️ Acesso Negado: Apenas o Administrador Geral (Sócio Administrador) pode deletar processos.');
      setTimeout(() => setSyncToastMessage(null), 4000);
      return;
    }

    setDeleteModalConfig({
      isOpen: true,
      type: 'processo',
      itemId: processId,
      itemTitle: `Processo nº ${proc.cnjNumber} (${proc.activeParty} vs ${proc.passiveParty})`,
    });
  };

  const executeDeleteProcess = (processId: string) => {
    const proc = processes.find((p) => p.id === processId);
    if (proc) {
      const trashEntry: TrashItem = {
        id: `trash-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        originalId: proc.id,
        type: 'processo',
        title: `Processo nº ${proc.cnjNumber}`,
        subtitle: `${proc.activeParty} vs ${proc.passiveParty} • ${proc.court} (${proc.branchVara})`,
        deletedAt: new Date().toISOString().replace('T', ' ').substring(0, 19),
        deletedBy: activeUser?.name || 'Dr. Vagner Schmidt',
        data: proc,
      };
      setTrashItems((prev) => [trashEntry, ...prev]);
    }

    setProcesses((prev) => prev.filter((p) => p.id !== processId));
    if (selectedProcessId === processId) {
      const remaining = processes.filter((p) => p.id !== processId);
      setSelectedProcessId(remaining[0]?.id || null);
    }
    logAction('DELETE', 'PROCESSO', `Processo ${proc?.cnjNumber || processId} movido para a Lixeira`);
    setSyncToastMessage('🗑️ Processo movido para a Lixeira com sucesso!');
    setTimeout(() => setSyncToastMessage(null), 4000);
  };

  const handleAddMovement = (processId: string, movement: ProcessMovement) => {
    setProcesses((prev) =>
      prev.map((p) => {
        if (p.id === processId) {
          return {
            ...p,
            movements: [movement, ...p.movements],
            lastMovementDate: movement.date,
          };
        }
        return p;
      })
    );
    logAction('CREATE', 'PROCESSO', `Andamento "${movement.title}" registrado no processo`);
  };

  const handleDeleteMovement = (processId: string, movementId: string) => {
    setProcesses((prev) =>
      prev.map((p) => {
        if (p.id === processId) {
          return {
            ...p,
            movements: p.movements.filter((m) => m.id !== movementId),
          };
        }
        return p;
      })
    );
    logAction('DELETE', 'PROCESSO', `Andamento removido do processo`);
  };

  // Handlers for Deadlines
  const handleAddDeadline = (newDead: Omit<ProcessDeadline, 'id'>) => {
    const deadlineItem: ProcessDeadline = {
      ...newDead,
      id: `dead-${Date.now()}`,
    };
    setDeadlines((prev) => [deadlineItem, ...prev]);
    logAction('CREATE', 'PRAZO', `Prazo "${deadlineItem.title}" fatal em ${deadlineItem.fatalDate}`);
  };

  const handleUpdateDeadline = (updatedDead: ProcessDeadline) => {
    setDeadlines((prev) => prev.map((d) => (d.id === updatedDead.id ? updatedDead : d)));
    logAction('UPDATE', 'PRAZO', `Prazo "${updatedDead.title}" alterado`);
  };

  const handleDeleteDeadline = (id: string) => {
    // Check if user is General Administrator (Sócio Administrador or total privilege)
    const isGeneralAdmin = activeUser?.role === 'Sócio Administrador' || activeUser?.privilege === 'total';
    if (!isGeneralAdmin) {
      setSyncToastMessage('⚠️ Acesso Negado: Apenas o Administrador Geral (Sócio Administrador) pode deletar prazos.');
      setTimeout(() => setSyncToastMessage(null), 4000);
      return;
    }

    const dead = deadlines.find((d) => d.id === id);
    if (dead) {
      const trashEntry: TrashItem = {
        id: `trash-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        originalId: dead.id,
        type: 'prazo',
        title: `Prazo: ${dead.title}`,
        subtitle: `Proc: ${dead.processNumber} • Fatal: ${dead.fatalDate} (${dead.clientName})`,
        deletedAt: new Date().toISOString().replace('T', ' ').substring(0, 19),
        deletedBy: activeUser?.name || 'Dr. Vagner Schmidt',
        data: dead,
      };
      setTrashItems((prev) => [trashEntry, ...prev]);
    }
    setDeadlines((prev) => prev.filter((d) => d.id !== id));
    logAction('DELETE', 'PRAZO', `Prazo "${dead?.title || id}" movido para a Lixeira`);
    setSyncToastMessage('🗑️ Prazo movido para a Lixeira.');
    setTimeout(() => setSyncToastMessage(null), 4000);
  };

  const handleToggleDeadlineStatus = (id: string) => {
    setDeadlines((prev) =>
      prev.map((d) => {
        if (d.id === id) {
          const nextStatus = d.status === 'cumprido' ? 'pendente' : 'cumprido';
          return { ...d, status: nextStatus };
        }
        return d;
      })
    );
    logAction('UPDATE', 'PRAZO', `Status do prazo alterado`);
  };

  // Handlers for Clients
  const handleAddClient = (newClient: Client) => {
    setClients((prev) => [newClient, ...prev]);
    logAction('CREATE', 'CLIENTE', `Cliente ${newClient.name} (${newClient.cpfCnpj}) cadastrado`);
  };

  const handleUpdateClient = (updatedClient: Client) => {
    setClients((prev) => prev.map((c) => (c.id === updatedClient.id ? updatedClient : c)));
    logAction('UPDATE', 'CLIENTE', `Dados do cliente ${updatedClient.name} atualizados`);
  };

  const handleDeleteClient = (clientId: string) => {
    const client = clients.find((c) => c.id === clientId);
    if (!client) return;

    // Check if user is General Administrator (Sócio Administrador or total privilege)
    const isGeneralAdmin = activeUser?.role === 'Sócio Administrador' || activeUser?.privilege === 'total';
    if (!isGeneralAdmin) {
      setSyncToastMessage('⚠️ Acesso Negado: Apenas o Administrador Geral (Sócio Administrador) pode deletar clientes.');
      setTimeout(() => setSyncToastMessage(null), 4000);
      return;
    }

    setDeleteModalConfig({
      isOpen: true,
      type: 'cliente',
      itemId: clientId,
      itemTitle: `Cliente: ${client.name} (CPF/CNPJ: ${client.cpfCnpj})`,
    });
  };

  const executeDeleteClient = (clientId: string) => {
    const client = clients.find((c) => c.id === clientId);
    if (client) {
      const trashEntry: TrashItem = {
        id: `trash-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        originalId: client.id,
        type: 'cliente',
        title: `Cliente: ${client.name}`,
        subtitle: `CPF/CNPJ: ${client.cpfCnpj} • ${client.phone || client.email}`,
        deletedAt: new Date().toISOString().replace('T', ' ').substring(0, 19),
        deletedBy: activeUser?.name || 'Dr. Vagner Schmidt',
        data: client,
      };
      setTrashItems((prev) => [trashEntry, ...prev]);
    }

    setClients((prev) => prev.filter((c) => c.id !== clientId));
    logAction('DELETE', 'CLIENTE', `Cliente ${client?.name || clientId} movido para a Lixeira`);
    setSyncToastMessage('🗑️ Cliente movido para a Lixeira com sucesso!');
    setTimeout(() => setSyncToastMessage(null), 4000);
  };

  const handleConfirmDeleteWithPassword = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (enteredDeletePassword === deletionPassword) {
      // Correct password!
      if (deleteModalConfig.type === 'cliente') {
        executeDeleteClient(deleteModalConfig.itemId);
      } else {
        executeDeleteProcess(deleteModalConfig.itemId);
      }
      
      // Close and reset modal state
      setDeleteModalConfig({
        isOpen: false,
        type: 'processo',
        itemId: '',
        itemTitle: '',
      });
      setEnteredDeletePassword('');
      setDeletePasswordError('');
    } else {
      setDeletePasswordError('Senha de segurança incorreta! Tente novamente ou peça ao administrador master.');
    }
  };

  // Handlers for Documents
  const handleAddDocument = (newDoc: LegalDocumentItem) => {
    setDocuments((prev) => [newDoc, ...prev]);
    logAction('CREATE', 'DOCUMENTO', `Documento "${newDoc.title}" gerado para impressão`);
  };

  const handleDeleteDocument = (id: string) => {
    // Check if user is General Administrator (Sócio Administrador or total privilege)
    const isGeneralAdmin = activeUser?.role === 'Sócio Administrador' || activeUser?.privilege === 'total';
    if (!isGeneralAdmin) {
      setSyncToastMessage('⚠️ Acesso Negado: Apenas o Administrador Geral (Sócio Administrador) pode deletar documentos.');
      setTimeout(() => setSyncToastMessage(null), 4000);
      return;
    }

    const doc = documents.find((d) => d.id === id);
    if (doc) {
      const trashEntry: TrashItem = {
        id: `trash-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        originalId: doc.id,
        type: 'documento',
        title: `Documento: ${doc.title}`,
        subtitle: `${doc.clientName} • Emitido em: ${doc.createdAt}`,
        deletedAt: new Date().toISOString().replace('T', ' ').substring(0, 19),
        deletedBy: activeUser?.name || 'Dr. Vagner Schmidt',
        data: doc,
      };
      setTrashItems((prev) => [trashEntry, ...prev]);
    }
    setDocuments((prev) => prev.filter((d) => d.id !== id));
    logAction('DELETE', 'DOCUMENTO', `Documento "${doc?.title || id}" movido para a Lixeira`);
    setSyncToastMessage('🗑️ Documento movido para a Lixeira.');
    setTimeout(() => setSyncToastMessage(null), 4000);
  };

  // Handlers for Team
  const handleAddTeamMember = (newMember: Omit<TeamMember, 'id' | 'createdAt'>) => {
    const member: TeamMember = {
      ...newMember,
      id: `team-${Date.now()}`,
      createdAt: new Date().toISOString().split('T')[0],
    };
    setTeamMembers((prev) => [member, ...prev]);
    logAction('CREATE', 'EQUIPE', `Usuário ${member.name} (${member.role}) adicionado à banca`);
  };

  const handleUpdateTeamMember = (updatedMember: TeamMember) => {
    setTeamMembers((prev) => prev.map((m) => (m.id === updatedMember.id ? updatedMember : m)));
    logAction('UPDATE', 'EQUIPE', `Permissões de ${updatedMember.name} atualizadas`);
  };

  const handleDeleteTeamMember = (id: string) => {
    // Check if user is General Administrator (Sócio Administrador or total privilege)
    const isGeneralAdmin = activeUser?.role === 'Sócio Administrador' || activeUser?.privilege === 'total';
    if (!isGeneralAdmin) {
      setSyncToastMessage('⚠️ Acesso Negado: Apenas o Administrador Geral (Sócio Administrador) pode remover membros da equipe.');
      setTimeout(() => setSyncToastMessage(null), 4000);
      return;
    }

    const member = teamMembers.find((m) => m.id === id);
    setTeamMembers((prev) => prev.filter((m) => m.id !== id));
    logAction('DELETE', 'EQUIPE', `Membro ${member?.name || id} revogado da banca`);
  };

  // Handlers for Finance
  const handleAddFinancialRecord = (newRec: Omit<FinancialRecord, 'id' | 'createdAt'>) => {
    const record: FinancialRecord = {
      ...newRec,
      id: `fin-${Date.now()}`,
      createdAt: new Date().toISOString().split('T')[0],
    };
    setFinancialRecords((prev) => [record, ...prev]);
    logAction('CREATE', 'FINANCEIRO', `Lançamento de R$ ${record.amount.toFixed(2)} (${record.type}) - ${record.title}`);
  };

  const handleUpdateFinancialRecord = (updatedRec: FinancialRecord) => {
    setFinancialRecords((prev) => prev.map((r) => (r.id === updatedRec.id ? updatedRec : r)));
    logAction('UPDATE', 'FINANCEIRO', `Lançamento ${updatedRec.title} atualizado`);
  };

  const handleDeleteFinancialRecord = (id: string) => {
    // Check if user is General Administrator (Sócio Administrador or total privilege)
    const isGeneralAdmin = activeUser?.role === 'Sócio Administrador' || activeUser?.privilege === 'total';
    if (!isGeneralAdmin) {
      setSyncToastMessage('⚠️ Acesso Negado: Apenas o Administrador Geral (Sócio Administrador) pode deletar registros financeiros.');
      setTimeout(() => setSyncToastMessage(null), 4000);
      return;
    }

    const rec = financialRecords.find((r) => r.id === id);
    setFinancialRecords((prev) => prev.filter((r) => r.id !== id));
    logAction('DELETE', 'FINANCEIRO', `Lançamento "${rec?.title || id}" removido`);
  };

  // Handler for SaaS Tenant Config
  const handleUpdateSaasConfig = (updatedConfig: SaaSTenantConfig) => {
    setSaasConfig(updatedConfig);
    logAction('UPDATE', 'CONFIG', `Parâmetros e módulos do plano ${updatedConfig.plan} atualizados`);
  };

  // Handler for Full JSON Backup Import & Restore
  const handleImportFullBackup = (backupData: any) => {
    if (!backupData || typeof backupData !== 'object') return;
    if (backupData.office) setOffice(backupData.office);
    if (Array.isArray(backupData.clients)) setClients(backupData.clients);
    if (Array.isArray(backupData.processes)) {
      setProcesses(backupData.processes);
      if (backupData.processes.length > 0) {
        setSelectedProcessId(backupData.processes[0].id);
      }
    }
    if (Array.isArray(backupData.deadlines)) setDeadlines(backupData.deadlines);
    if (Array.isArray(backupData.documents)) setDocuments(backupData.documents);
    if (Array.isArray(backupData.teamMembers)) setTeamMembers(backupData.teamMembers);
    if (Array.isArray(backupData.financialRecords)) setFinancialRecords(backupData.financialRecords);
    if (backupData.saasConfig) setSaasConfig(backupData.saasConfig);
    if (Array.isArray(backupData.auditLogs)) setAuditLogs(backupData.auditLogs);
    if (Array.isArray(backupData.trashItems)) setTrashItems(backupData.trashItems);

    logAction('SYNC', 'CONFIG', 'Backup integral JSON restaurado no workspace WONO ADVOCACIA');
    localStorage.setItem('wono_system_cleared', 'false');
  };

  // Global Sync Simulation with DataJud and Diários Oficiais
  const handleTriggerGlobalSync = async () => {
    setIsSyncing(true);
    setSyncToastMessage('Conectando à base DataJud e Diários Oficiais...');

    setTimeout(() => {
      const now = new Date().toISOString();
      setProcesses((prev) =>
        prev.map((p) => ({
          ...p,
          lastSyncDate: now,
        }))
      );
      setIsSyncing(false);
      setSyncToastMessage('Todos os processos foram sincronizados com sucesso!');
      logAction('SYNC', 'PROCESSO', `Sincronização em lote com DataJud concluída`);
      setTimeout(() => setSyncToastMessage(null), 4000);
    }, 1800);
  };


  // Fast quick modal opening from any screen
  const handleOpenNewDocumentModal = (type: string = 'procuracao', clientId?: string) => {
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

    const client = clients.find((c) => c.id === clientId) || clients[0] || fallbackClient;
    let title = 'Procuração Ad Judicia';
    let text = '';

    if (type === 'procuracao') {
      title = `Procuração Ad Judicia - ${client.name}`;
      text = generateProcuracaoText(
        client,
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
        },
        'Ação Judicial e Defesa de Direitos'
      );
    } else if (type === 'contrato_honorarios') {
      title = `Contrato de Honorários Advocatícios - ${client.name}`;
      text = generateContratoHonorariosText(
        client,
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
        },
        'Defesa e patrocínio dos interesses jurídicos do contratante'
      );
    } else if (type === 'declaracao_hipossuficiencia') {
      title = `Declaração de Hipossuficiência - ${client.name}`;
      text = generateDeclaracaoHipossuficienciaText(client, office);
    } else if (type === 'recibo_honorarios') {
      title = `Recibo de Honorários - ${client.name}`;
      text = generateReciboHonorariosText(
        client,
        office,
        1500,
        'Honorários advocatícios relativos à elaboração de petição inicial'
      );
    }

    setQuickPrintDoc({
      isOpen: true,
      title,
      text,
      type,
      clientName: client.name,
    });
  };

  const handleOpenDocumentGeneratorForProcess = (proc: LegalProcess) => {
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

    const client = clients.find((c) => c.id === proc.clientId) || clients[0] || fallbackClient;
    const text = generateProcuracaoText(
      client,
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
      },
      `Processo nº ${proc.cnjNumber} - ${proc.subject}`
    );

    setQuickPrintDoc({
      isOpen: true,
      title: `Procuração - Proc. ${proc.cnjNumber}`,
      text,
      type: 'procuracao',
      clientName: client.name,
    });
  };

  const handleOpenDeclaracaoGeneratorForProcess = (proc: LegalProcess) => {
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

    const client = clients.find((c) => c.id === proc.clientId) || clients[0] || fallbackClient;
    const text = generateDeclaracaoHipossuficienciaText(client, office);

    setQuickPrintDoc({
      isOpen: true,
      title: `Declaração de Hipossuficiência - ${client.name}`,
      text,
      type: 'declaracao_hipossuficiencia',
      clientName: client.name,
    });
  };

  const handleSimulateUrgentDeadline = () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    // Set to 23 hours in the future
    const dateStr = tomorrow.toISOString().split('T')[0];

    const testItem: ProcessDeadline = {
      id: `dead-test-${Date.now()}`,
      processId: processes[0]?.id || 'proc-1',
      processNumber: processes[0]?.cnjNumber || '1024589-32.2024.8.26.0100',
      clientName: processes[0]?.activeParty || 'Carlos Eduardo Silveira',
      title: 'TESTE AUTOMÁTICO: Manifestação Urgente de 24 horas',
      type: 'Manifestação',
      startDate: new Date().toISOString().split('T')[0],
      fatalDate: dateStr,
      status: 'alerta',
      daysLeft: 1,
      responsibleLawyer: 'Dr. Vagner Schmidt da Silva',
      notes: 'Lembrete simulado de 24 horas. Este prazo de teste comprova o acionamento automático de alertas visuais e logs de sistema.',
      reminderHours: 24,
      reminderNotified: false,
    };

    setDeadlines((prev) => [testItem, ...prev]);
    logAction('CREATE', 'PRAZO', `🚨 Lançado prazo de teste para amanhã: "${testItem.title}" com lembrete de 24h.`);
    setSyncToastMessage('🚨 Prazo de teste de 24h lançado com sucesso! O lembrete visual disparará em segundos.');
    setTimeout(() => setSyncToastMessage(null), 5000);
  };

  const handleMasterSystemReset = () => {
    // 1. Wipe in-memory React states
    setProcesses([]);
    setClients([]);
    setDeadlines([]);
    setDocuments([]);
    setFinancialRecords([]);
    setTrashItems([]);
    setAuditLogs([]);
    setActiveAlerts([]);
    setSelectedProcessId(null);

    // 2. Set LocalStorage keys to empty JSON arrays and mark system as cleared
    localStorage.setItem('juris_processes', JSON.stringify([]));
    localStorage.setItem('juris_clients', JSON.stringify([]));
    localStorage.setItem('juris_deadlines', JSON.stringify([]));
    localStorage.setItem('juris_documents', JSON.stringify([]));
    localStorage.setItem('wono_financial_records', JSON.stringify([]));
    localStorage.setItem('wono_advocacia_trash_items', JSON.stringify([]));
    localStorage.setItem('wono_audit_logs', JSON.stringify([]));
    localStorage.setItem('wono_system_cleared', 'true');

    // 3. Trigger visual confirmation message
    setSyncToastMessage('✅ Sistema zerado com sucesso! Todos os prazos, processos, clientes e documentos foram limpos com sucesso.');
    setTimeout(() => {
      setSyncToastMessage(null);
    }, 8000);
  };

  const handleExportFullBackupJson = () => {
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
      link.download = `backup_completo_wono_${dateStr}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Erro ao gerar backup:', error);
    }
  };

  const activeDeadlinesCount = computedDeadlines.filter(
    (d) => d.status !== 'cumprido' && d.daysLeft <= 3
  ).length;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-amber-500 selection:text-slate-950">
      {/* Toast notification for sync */}
      {syncToastMessage && (
        <div className="fixed bottom-4 right-4 sm:bottom-5 sm:right-5 z-50 bg-slate-900 border border-amber-500/40 text-amber-300 text-xs px-4 py-3 rounded-xl shadow-2xl flex items-center gap-2 animate-fade-in no-print max-w-[calc(100vw-2rem)] sm:max-w-md">
          <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping shrink-0"></span>
          <span className="leading-snug">{syncToastMessage}</span>
        </div>
      )}

      {/* Main Navbar */}
      <Navbar
        currentTab={currentTab}
        onSelectTab={setCurrentTab}
        office={office}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onOpenGlobalSearch={() => setIsGlobalSearchOpen(true)}
        onOpenMasterReset={() => setIsMasterResetOpen(true)}
        onOpenDatabaseInstaller={() => setIsDatabaseInstallerOpen(true)}
        isSyncing={isSyncing}
        onTriggerGlobalSync={handleTriggerGlobalSync}
        activeDeadlinesCount={activeDeadlinesCount}
        teamMembers={teamMembers}
        activeUserId={activeUserId}
        onSelectActiveUser={setActiveUserId}
        trashCount={trashItems.length}
        theme={theme}
        onToggleTheme={handleToggleTheme}
      />

      {/* Main Body Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6">
        {/* Urgent Deadline Warnings Panel (Satisfies 3-day notice rule with direct action) */}
        {urgentDeadlinesToAlert.length > 0 && (
          <div className="mb-4 sm:mb-6 space-y-3 no-print">
            {urgentDeadlinesToAlert.map((dead) => {
              const isOverdue = dead.daysLeft < 0;
              return (
                <div
                  key={dead.id}
                  className={`border-l-4 ${
                    isOverdue ? 'border-red-500 bg-red-950/10' : 'border-amber-500 bg-amber-950/10'
                  } bg-slate-900/90 rounded-r-xl p-3.5 sm:p-4 flex flex-col md:flex-row md:items-center justify-between gap-3 sm:gap-4 shadow-xl border border-slate-800/80`}
                >
                  <div className="flex gap-2.5 sm:gap-3 items-start">
                    <span className={`p-1.5 rounded ${isOverdue ? 'bg-red-500/10 text-red-400' : 'bg-amber-500/10 text-amber-400'} mt-0.5 text-base shrink-0`}>
                      🚨
                    </span>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                        <span className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase ${
                          isOverdue ? 'bg-red-500/20 text-red-300' : 'bg-amber-500/20 text-amber-300'
                        }`}>
                          {isOverdue 
                            ? 'PRAZO EXCEDIDO / ATRASADO' 
                            : dead.daysLeft === 0 
                            ? 'FALTA APENAS HOJE (FATAL)' 
                            : dead.daysLeft === 1
                            ? 'VENCE AMANHÃ (URGENTE)'
                            : `ALERTA: VENCE EM ${dead.daysLeft} DIAS`}
                        </span>
                        <span className="text-slate-600 hidden sm:inline">•</span>
                        <span className="text-[11px] font-mono text-slate-400 truncate max-w-[200px] sm:max-w-none">Processo: {dead.processNumber}</span>
                      </div>
                      <h4 className="text-sm font-bold text-slate-100 mt-1 break-legal">
                        {dead.title}
                      </h4>
                      <p className="text-xs text-slate-300 mt-0.5 leading-relaxed">
                        Cliente: <strong className="text-slate-200">{dead.clientName}</strong> | Data Fatal: <strong className={isOverdue ? 'text-red-400' : 'text-amber-400'}>{new Date(dead.fatalDate + 'T12:00:00').toLocaleDateString('pt-BR')}</strong>
                      </p>
                      {dead.notes && (
                        <p className="text-[11px] text-slate-400 italic mt-1 bg-slate-950/50 px-2 py-1 rounded break-legal">
                          Nota: {dead.notes}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 self-start md:self-center pt-1 md:pt-0 w-full sm:w-auto justify-end">
                    <button
                      onClick={() => handleToggleDeadlineStatus(dead.id)}
                      className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-slate-950 text-xs font-bold rounded-lg transition cursor-pointer flex items-center gap-1 shadow-md shadow-emerald-500/10 whitespace-nowrap flex-1 sm:flex-initial justify-center"
                    >
                      ✓ Cumprido
                    </button>
                    <button
                      onClick={() => setDismissedAlertIds((prev) => [...prev, dead.id])}
                      className="px-2.5 py-1.5 text-slate-400 hover:text-slate-200 text-xs font-semibold cursor-pointer rounded-lg hover:bg-slate-800 transition border border-slate-800 whitespace-nowrap"
                    >
                      Dispensar
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Active Warning Alerts Panel */}
        {activeAlerts.length > 0 && (
          <div className="mb-6 space-y-3 no-print">
            {activeAlerts.map((alert) => (
              <div
                key={alert.id}
                className="bg-amber-950/20 border-l-4 border-amber-500 bg-slate-900 rounded-r-xl p-4 flex items-start justify-between gap-4 shadow-lg"
              >
                <div className="flex gap-3">
                  <span className="p-1.5 rounded bg-amber-500/10 text-amber-400 mt-0.5 text-base">
                    ⚠️
                  </span>
                  <div>
                    <h4 className="text-sm font-bold text-amber-300">
                      {alert.title}
                    </h4>
                    <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                      {alert.message}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setActiveAlerts((prev) => prev.filter((a) => a.id !== alert.id))}
                  className="text-amber-400 hover:text-amber-200 text-xs font-bold cursor-pointer px-2 py-1 rounded hover:bg-amber-500/10 transition border border-amber-500/20"
                >
                  Dispensar Alerta
                </button>
              </div>
            ))}
          </div>
        )}

        {currentTab === 'dashboard' && (
          <DashboardView
            processes={processes}
            deadlines={computedDeadlines}
            clients={clients}
            office={office}
            financialRecords={financialRecords}
            onNavigateTab={setCurrentTab}
            onSelectProcess={(id) => {
              setSelectedProcessId(id);
              setCurrentTab('andamentos');
            }}
            onOpenNewDocumentModal={handleOpenNewDocumentModal}
            onOpenGlobalSearch={() => setIsGlobalSearchOpen(true)}
            activeUser={activeUser}
          />
        )}

        {currentTab === 'andamentos' && (
          <ProcessesAndamentosView
            processes={processes}
            clients={clients}
            office={office}
            teamMembers={teamMembers}
            selectedProcessId={selectedProcessId}
            onSelectProcessId={setSelectedProcessId}
            onAddProcess={handleAddProcess}
            onBulkImportProcesses={handleBulkImportProcesses}
            onUpdateProcess={handleUpdateProcess}
            onDeleteProcess={handleDeleteProcess}
            onAddMovement={handleAddMovement}
            onDeleteMovement={handleDeleteMovement}
            onAddDeadlineToAgenda={handleAddDeadline}
            onOpenDocumentGeneratorForProcess={handleOpenDocumentGeneratorForProcess}
            onOpenDeclaracaoGeneratorForProcess={handleOpenDeclaracaoGeneratorForProcess}
            onAddDocument={handleAddDocument}
            onAddTeamMember={handleAddTeamMember}
            deadlines={deadlines}
            onUpdateDeadline={handleUpdateDeadline}
            activeUser={activeUser}
          />
        )}

        {currentTab === 'documentos' && (
          <DocumentsView
            documents={documents}
            clients={clients}
            processes={processes}
            office={office}
            onAddDocument={handleAddDocument}
            onDeleteDocument={handleDeleteDocument}
            activeUser={activeUser}
          />
        )}

        {currentTab === 'prazos' && (
          <DeadlinesView
            deadlines={computedDeadlines}
            processes={processes}
            clients={clients}
            onAddDeadline={handleAddDeadline}
            onUpdateDeadline={handleUpdateDeadline}
            onDeleteDeadline={handleDeleteDeadline}
            onToggleDeadlineStatus={handleToggleDeadlineStatus}
            onSelectProcess={(id) => {
              setSelectedProcessId(id);
              setCurrentTab('andamentos');
            }}
            onSimulateUrgentDeadline={handleSimulateUrgentDeadline}
            notificationPermission={notificationPermission}
            onRequestNotificationPermission={handleRequestNotificationPermission}
            activeUser={activeUser}
          />
        )}

        {currentTab === 'clientes' && (
          <ClientsView
            clients={clients}
            processes={processes}
            office={office}
            onAddClient={handleAddClient}
            onUpdateClient={handleUpdateClient}
            onDeleteClient={handleDeleteClient}
            onOpenDocumentGeneratorForClient={(clientId) => {
              handleOpenNewDocumentModal('procuracao', clientId);
            }}
            onSelectProcess={(id) => {
              setSelectedProcessId(id);
              setCurrentTab('andamentos');
            }}
            activeUser={activeUser}
          />
        )}

        {currentTab === 'equipe' && (
          <EquipeView
            teamMembers={teamMembers}
            processes={processes}
            onAddTeamMember={handleAddTeamMember}
            onUpdateTeamMember={handleUpdateTeamMember}
            onDeleteTeamMember={handleDeleteTeamMember}
            activeUser={activeUser}
          />
        )}

        {currentTab === 'saas' && (
          <SaasView
            office={office}
            teamMembers={teamMembers}
            financialRecords={financialRecords}
            saasConfig={saasConfig}
            tenantConfig={saasConfig}
            auditLogs={auditLogs}
            clients={clients}
            processes={processes}
            deadlines={deadlines}
            documents={documents}
            processesCount={processes.length}
            clientsCount={clients.length}
            onAddTeamMember={handleAddTeamMember}
            onUpdateTeamMember={handleUpdateTeamMember}
            onDeleteTeamMember={handleDeleteTeamMember}
            onAddFinancialRecord={handleAddFinancialRecord}
            onUpdateFinancialRecord={handleUpdateFinancialRecord}
            onDeleteFinancialRecord={handleDeleteFinancialRecord}
            onUpdateSaasConfig={handleUpdateSaasConfig}
            onUpdateTenantConfig={handleUpdateSaasConfig}
            onImportFullBackup={handleImportFullBackup}
            onOpenDatabaseInstaller={() => setIsDatabaseInstallerOpen(true)}
            activeUser={activeUser}
          />
        )}

        {currentTab === 'lixeira' && (
          <LixeiraView
            trashItems={trashItems}
            onRestoreItem={handleRestoreTrashItem}
            onPermanentlyDeleteItem={handlePermanentlyDeleteTrashItem}
            onEmptyTrash={handleEmptyTrash}
            onOpenMasterReset={() => setIsMasterResetOpen(true)}
            activeUser={activeUser}
            deletionPassword={deletionPassword}
            onClose={() => setCurrentTab('dashboard')}
          />
        )}
      </main>

      {/* Office Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        office={office}
        onSaveOffice={setOffice}
        onOpenInstaller={() => setIsInstallerOpen(true)}
        onOpenDatabaseInstaller={() => setIsDatabaseInstallerOpen(true)}
        onOpenMasterReset={() => setIsMasterResetOpen(true)}
        activeUser={activeUser}
        deletionPassword={deletionPassword}
        onSaveDeletionPassword={setDeletionPassword}
        theme={theme}
        onToggleTheme={handleToggleTheme}
      />

      {/* Database and Local Network PC Installer Modal (Postgres, SQLite, Windows Batch, Offline/Online) */}
      <DatabaseAndNetworkInstallerModal
        isOpen={isDatabaseInstallerOpen}
        onClose={() => setIsDatabaseInstallerOpen(false)}
        office={office}
        clients={clients}
        processes={processes}
        deadlines={deadlines}
        documents={documents}
        teamMembers={teamMembers}
        financialRecords={financialRecords}
        saasConfig={saasConfig}
        auditLogs={auditLogs}
        onImportFullBackup={handleImportFullBackup}
      />

      {/* Fast Direct Print Modal */}
      <PrintDocumentModal
        isOpen={quickPrintDoc.isOpen}
        onClose={() => setQuickPrintDoc({ ...quickPrintDoc, isOpen: false })}
        title={quickPrintDoc.title}
        documentText={quickPrintDoc.text}
        office={office}
        documentType={quickPrintDoc.type}
        clientName={quickPrintDoc.clientName}
      />

      {/* Auto-Installer Database Seeder Modal */}
      <AutoInstallerModal
        isOpen={isInstallerOpen}
        onClose={() => setIsInstallerOpen(false)}
        setClients={setClients}
        setProcesses={setProcesses}
        setDeadlines={setDeadlines}
        setFinancials={setFinancialRecords}
        setAuditLogs={setAuditLogs}
        setOffice={setOffice}
      />

      {/* Master Reset / Exclusão Geral (Zerar Todo o Sistema) Modal - Senha 1414 */}
      <MasterResetModal
        isOpen={isMasterResetOpen}
        onClose={() => setIsMasterResetOpen(false)}
        onConfirmReset={handleMasterSystemReset}
        stats={{
          processesCount: processes.length,
          clientsCount: clients.length,
          deadlinesCount: deadlines.length,
          documentsCount: documents.length,
          trashCount: trashItems.length,
          financialCount: financialRecords.length,
        }}
        onDownloadBackup={handleExportFullBackupJson}
        deletionPassword={deletionPassword}
      />

      {/* Secure Delete Confirmation Modal */}
      {deleteModalConfig.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-sm animate-fade-in no-print">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-amber-500">
              <span className="p-2 bg-amber-500/10 rounded-xl text-xl">⚠️</span>
              <div>
                <h3 className="text-lg font-bold text-slate-100">Confirmação de Exclusão</h3>
                <p className="text-xs text-slate-400">Operação de segurança monitorada</p>
              </div>
            </div>

            <div className="p-3.5 bg-slate-950 rounded-xl border border-slate-800 text-xs space-y-1.5">
              <span className="block text-slate-400 font-medium">Elemento a ser removido:</span>
              <strong className="block text-slate-200 text-sm">{deleteModalConfig.itemTitle}</strong>
              <span className="block text-[10px] text-rose-400 leading-normal font-semibold">
                * Atenção: Esta ação é irreversível e removerá todos os registros associados permanentemente do banco de dados local.
              </span>
            </div>

            <form onSubmit={handleConfirmDeleteWithPassword} className="space-y-3">
              <div>
                <label className="block text-slate-300 font-semibold mb-1 text-xs">
                  Digite a Senha de Exclusão para confirmar:
                </label>
                <input
                  type="password"
                  value={enteredDeletePassword}
                  onChange={(e) => {
                    setEnteredDeletePassword(e.target.value);
                    setDeletePasswordError('');
                  }}
                  placeholder="••••••••"
                  autoFocus
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-slate-100 focus:border-amber-500 focus:outline-none text-center font-mono tracking-widest text-lg"
                />
                {deletePasswordError && (
                  <p className="text-[11px] text-rose-400 font-medium mt-1.5 bg-rose-950/20 px-2 py-1 rounded border border-rose-950/30">
                    {deletePasswordError}
                  </p>
                )}
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setDeleteModalConfig({
                      isOpen: false,
                      type: 'processo',
                      itemId: '',
                      itemTitle: '',
                    });
                    setEnteredDeletePassword('');
                    setDeletePasswordError('');
                  }}
                  className="flex-1 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-lg cursor-pointer transition border border-slate-700 text-center"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 bg-rose-600 hover:bg-rose-500 text-slate-950 text-xs font-bold rounded-lg cursor-pointer transition text-center shadow-lg shadow-rose-600/10"
                >
                  Confirmar Exclusão
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Global Search Lupa & Command Palette Modal (Ctrl+K) */}
      <GlobalSearchModal
        isOpen={isGlobalSearchOpen}
        onClose={() => setIsGlobalSearchOpen(false)}
        processes={processes}
        clients={clients}
        deadlines={computedDeadlines}
        documents={documents}
        onSelectProcess={(id) => {
          setSelectedProcessId(id);
          setCurrentTab('andamentos');
        }}
        onNavigateTab={(tab) => setCurrentTab(tab)}
      />
    </div>
  );
}

