import React from 'react';
import { 
  Client, 
  LegalProcess, 
  ProcessDeadline, 
  FinancialRecord, 
  AuditLog, 
  LawOfficeSettings,
  SaaSTenantConfig,
  ProcessMovement
} from '../types';

// Helper to format CNJ process numbers
const generateCNJNumber = (index: number, year: number = 2026): string => {
  const sequential = String(index).padStart(7, '0');
  const dv = String((index * 13) % 99).padStart(2, '0');
  const segment = "8.26"; // SP State Courts prefix by default
  const courtUnit = "0053"; // São Paulo Capital Vara de Execuções / Cível
  return `${sequential}-${dv}.${year}.${segment}.${courtUnit}`;
};

// Generates a complete 99-item high-fidelity legal dataset for system seeding
export const generateBase99Dataset = () => {
  const clients: Client[] = [];
  const processes: LegalProcess[] = [];
  const deadlines: ProcessDeadline[] = [];
  const financials: FinancialRecord[] = [];
  const auditLogs: AuditLog[] = [];

  const firstNamesPF = ['Vagner', 'Carlos', 'Mariana', 'Rodrigo', 'Beatriz', 'Juliana', 'Fernando', 'Renata', 'Gustavo', 'Patrícia', 'Marcelo', 'Fernanda', 'Gabriel', 'Larissa', 'Thiago', 'Aline', 'Ricardo', 'Camila', 'Bruno', 'Sofia'];
  const lastNamesPF = ['Schmidt', 'Silveira', 'Alcantara', 'Santos', 'Mendes', 'Bastos', 'Rocha', 'Oliveira', 'Silva', 'Souza', 'Almeida', 'Costa', 'Gomes', 'Martins', 'Pereira', 'Lima', 'Carvalho', 'Ferreira', 'Cardoso', 'Teixeira'];
  
  const professions = ['Engenheiro Civil', 'Enfermeira Chefe', 'Motorista de Ônibus', 'Analista de Sistemas', 'Arquiteto', 'Autônomo', 'Comerciante', 'Aposentado', 'Professor de Ensino Médio', 'Médico Clínico', 'Gerente Financeiro', 'Designer Gráfico'];
  const cities = ['São Paulo', 'São Bernardo do Campo', 'Campinas', 'Santos', 'Ribeirão Preto', 'Osasco', 'Santo André', 'Guarulhos'];
  const lawsuitTypes = ['Ação Indenizatória', 'Ação de Cobrança', 'Reclamação Trabalhista', 'Aposentadoria Especial', 'Execução de Título', 'Ação de Alimentos', 'Despejo por Falta de Pagamento', 'Mandado de Segurança'];
  const courts = ['TJSP - 4ª Vara Cível', 'TJRJ - 12ª Vara de Família', 'TRT2 - 45ª Vara do Trabalho', 'TRF3 - 2ª Vara Federal Previdenciária', 'TJMG - 1ª Vara Cível'];

  // 1. Generate 25 Clients (PF and PJ)
  for (let i = 1; i <= 25; i++) {
    const isPJ = i % 4 === 0;
    const namePF = `${firstNamesPF[i % firstNamesPF.length]} ${lastNamesPF[i % lastNamesPF.length]}`;
    const namePJ = `Empresa ${lastNamesPF[i % lastNamesPF.length]} Inovações e Serviços Ltda`;
    
    clients.push({
      id: `cli-${i}`,
      type: isPJ ? 'PJ' : 'PF',
      name: isPJ ? namePJ : namePF,
      tradeName: isPJ ? `Inova${lastNamesPF[i % lastNamesPF.length]}` : undefined,
      cpfCnpj: isPJ ? `21.${i * 382}.912/0001-${String(i * 11).padStart(2, '0')}` : `${310 + i * 11}.492.${i * 22}-44`,
      rgIe: `RG ${23 + i}.145.892-1 SSP/SP`,
      nationality: 'Brasileiro(a)',
      maritalStatus: i % 2 === 0 ? 'Casado(a)' : 'Solteiro(a)',
      profession: isPJ ? 'Tecnologia' : professions[i % professions.length],
      email: isPJ ? `contato@${lastNamesPF[i % lastNamesPF.length].toLowerCase()}inova.com.br` : `${namePF.toLowerCase().replace(' ', '.')}@gmail.com`,
      phone: `(11) 9${8400 + i}-${String(1100 + i * 22)}`,
      whatsapp: `(11) 9${8400 + i}-${String(1100 + i * 22)}`,
      address: {
        street: `Avenida das Nações Unidas`,
        number: String(1000 + i * 50),
        complement: `Conjunto ${i * 4}`,
        neighborhood: 'Pinheiros',
        city: cities[i % cities.length],
        state: 'SP',
        zipCode: `04578-${String(i).padStart(3, '0')}`
      },
      isGratuidadeJusticaEligible: i % 3 === 0,
      notes: `Cliente cadastrado automaticamente pelo instalador Base99 gratuito.`,
      createdAt: `2026-01-${String(i).padStart(2, '0')}`
    });
  }

  // 2. Generate 35 Legal Processes
  const statusOptions = ['Ativo', 'Suspenso', 'Arquivado', 'Em Recurso', 'Fase de Execução', 'Sentenciado'];
  for (let i = 1; i <= 35; i++) {
    const assignedClient = clients[i % clients.length];
    const cnj = generateCNJNumber(i, 2026);
    const assignedCourt = courts[i % courts.length];
    
    // Realistic judicial movements
    const movements: ProcessMovement[] = [
      {
        id: `mov-${i}-1`,
        date: '2026-08-10',
        code: '1000',
        title: 'Petição Inicial Distribuída',
        description: 'Distribuição automática da ação por dependência ou sorteio eletrônico ordinário.',
        organ: 'Distribuidor Cível',
        isJudicialDecision: false
      },
      {
        id: `mov-${i}-2`,
        date: '2026-08-15',
        code: '2000',
        title: 'Despacho Citação Deferido',
        description: 'Cite-se a parte ré para contestar a ação no prazo legal sob pena de revelia.',
        organ: 'Gabinete do Juiz',
        isJudicialDecision: true,
        deadlineDays: 15,
        deadlineType: 'Úteis',
        aiAnalysis: {
          summary: 'O juiz deferiu a citação do réu.',
          clientExplanation: 'O juiz deu andamento e determinou que a outra parte seja formalmente informada para se defender.',
          recommendedAction: 'Acompanhar a expedição da carta AR de citação.',
          urgency: 'media',
          suggestedWhatsApp: 'Olá, seu processo teve andamento favorável! O juiz determinou a citação da outra parte.'
        }
      }
    ];

    processes.push({
      id: `proc-${i}`,
      cnjNumber: cnj,
      court: assignedCourt,
      branchVara: `${i % 5 + 1}ª Vara Cível de Competência Geral`,
      comarca: assignedClient.address.city,
      lawsuitType: lawsuitTypes[i % lawsuitTypes.length],
      subject: 'Obrigações e Indenização Civil Geral',
      value: 12000 + (i * 2430),
      distributionDate: `2026-08-01`,
      status: statusOptions[i % statusOptions.length] as any,
      activeParty: assignedClient.name,
      passiveParty: `Banco Multicréditos S/A`,
      clientId: assignedClient.id,
      responsibleLawyer: 'Dr. Vagner Schmidt da Silva',
      judge: `Dr. Alberto de Albuquerque Prado`,
      movements,
      lastSyncDate: `2026-08-20`,
      notes: 'Lote de processo simulado importado pela base gratuita.'
    });
  }

  // 3. Generate 15 Agenda/Deadlines
  const deadlineTypes = ['Prazo CPC', 'Audiência', 'Recurso', 'Réplica', 'Contestação'];
  for (let i = 1; i <= 15; i++) {
    const assignedProc = processes[i % processes.length];
    deadlines.push({
      id: `dead-${i}`,
      processId: assignedProc.id,
      processNumber: assignedProc.cnjNumber,
      clientName: assignedProc.activeParty,
      title: `Protocolar ${deadlineTypes[i % deadlineTypes.length]}`,
      type: deadlineTypes[i % deadlineTypes.length] as any,
      startDate: '2026-08-20',
      fatalDate: `2026-08-${String(22 + (i % 8)).padStart(2, '0')}`,
      status: i % 4 === 0 ? 'cumprido' : 'pendente',
      daysLeft: 2 + (i % 8),
      responsibleLawyer: 'Dr. Vagner Schmidt da Silva',
      notes: 'Lembrete automático para o escritório.'
    });
  }

  // 4. Generate 20 Financial Records (Receitas & Despesas)
  const financialTypes = ['Honorários Iniciais (Pró-labore)', 'Honorários Mensais / Retainer', 'Honorários de Êxito (Ad Exitum)', 'Custas Processuais / Diligência'];
  for (let i = 1; i <= 20; i++) {
    const assignedClient = clients[i % clients.length];
    const isExpense = i % 3 === 0;
    
    financials.push({
      id: `fin-${i}`,
      title: isExpense ? 'Compra de insumos do escritório' : `Fatura ${financialTypes[i % financialTypes.length]}`,
      category: isExpense ? 'Despesa' : 'Receita',
      type: isExpense ? 'Despesa Operacional' : financialTypes[i % financialTypes.length] as any,
      clientId: assignedClient.id,
      clientName: assignedClient.name,
      amount: isExpense ? 150 + i * 20 : 1500 + i * 350,
      dueDate: `2026-08-${String(15 + (i % 15)).padStart(2, '0')}`,
      paymentDate: i % 2 === 0 ? `2026-08-18` : undefined,
      status: i % 2 === 0 ? 'Pago' : 'Pendente',
      paymentMethod: 'PIX',
      notes: 'Registro gerado pela automação Base99.',
      createdAt: '2026-08-01'
    });
  }

  // 5. Generate 4 Audit Logs to round it up to exactly 99 total items
  // (25 Clients + 35 Processes + 15 Deadlines + 20 Financials + 4 Logs = 99 items!)
  const logActions = ['CREATE', 'UPDATE', 'SYNC', 'EXPORT'];
  const logEntities = ['PROCESSO', 'CLIENTE', 'PRAZO', 'FINANCEIRO'];
  for (let i = 1; i <= 4; i++) {
    auditLogs.push({
      id: `log-${i}`,
      timestamp: `2026-08-20T02:${20 + i}:00-03:00`,
      userName: 'Dr. Vagner Schmidt da Silva',
      userRole: 'Sócio Administrador',
      action: logActions[i % logActions.length] as any,
      entity: logEntities[i % logEntities.length] as any,
      description: `Importação de dados e instalação automática da Base99 com sucesso.`
    });
  }

  return {
    clients,
    processes,
    deadlines,
    financials,
    auditLogs
  };
};

// Seeding engine execution
export const executeBase99Installation = (
  setClients: React.Dispatch<React.SetStateAction<Client[]>>,
  setProcesses: React.Dispatch<React.SetStateAction<LegalProcess[]>>,
  setDeadlines: React.Dispatch<React.SetStateAction<ProcessDeadline[]>>,
  setFinancials: React.Dispatch<React.SetStateAction<FinancialRecord[]>>,
  setAuditLogs: React.Dispatch<React.SetStateAction<AuditLog[]>>,
  setOffice: React.Dispatch<React.SetStateAction<LawOfficeSettings>>
) => {
  const dataset = generateBase99Dataset();
  
  // Seed state variables
  setClients(dataset.clients);
  setProcesses(dataset.processes);
  setDeadlines(dataset.deadlines);
  setFinancials(dataset.financials);
  setAuditLogs(dataset.auditLogs);

  // Default Office Settings Preset
  const defaultOfficePreset: LawOfficeSettings = {
    officeName: "WONO ADVOCACIA & ASSOCIADOS",
    officeBrandTagline: "Advocacia Digital Estratégica, Consultoria Empresarial & Contencioso Cível",
    cnpj: "34.567.890/0001-12",
    primaryLawyer: {
      name: "Dr. Vagner Schmidt da Silva",
      oabNumber: "284.912",
      oabState: "SP",
      cpf: "123.456.789-00",
      email: "vagner.schmidt@wonoadvocacia.com.br",
      phone: "(11) 98765-4321",
    },
    additionalLawyers: [
      {
        id: "lawyer-2",
        name: "Dra. Juliana Mendes Bastos",
        oabNumber: "319.845",
        oabState: "SP",
        email: "juliana.bastos@wonoadvocacia.com.br",
      },
      {
        id: "lawyer-3",
        name: "Dr. Marcelo Silveira Rocha",
        oabNumber: "198.420",
        oabState: "RJ",
        email: "marcelo.silveira@wonoadvocacia.com.br",
      },
    ],
    address: {
      street: "Avenida Paulista",
      number: "1754",
      complement: "Conjunto 142 - Edifício Grande Avenida",
      neighborhood: "Bela Vista",
      city: "São Paulo",
      state: "SP",
      zipCode: "01310-920",
    },
    phone: "(11) 3254-8900",
    whatsapp: "(11) 98765-4321",
    email: "contato@wonoadvocacia.com.br",
    website: "www.wonoadvocacia.com.br",
    bankAccount: {
      pixKey: "34.567.890/0001-12",
      bankName: "Banco Itaú Unibanco S.A. (341)",
      agency: "0452",
      accountNumber: "98765-4",
      accountHolder: "WONO ADVOCACIA & ASSOCIADOS",
    },
  };

  setOffice(defaultOfficePreset);

  // Write all items to LocalStorage for offline-first persistence
  localStorage.setItem('juris_office_settings', JSON.stringify(defaultOfficePreset));
  localStorage.setItem('juris_clients', JSON.stringify(dataset.clients));
  localStorage.setItem('juris_processes', JSON.stringify(dataset.processes));
  localStorage.setItem('juris_deadlines', JSON.stringify(dataset.deadlines));
  localStorage.setItem('wono_financial_records', JSON.stringify(dataset.financials));
  localStorage.setItem('wono_audit_logs', JSON.stringify(dataset.auditLogs));
  localStorage.setItem('wono_system_cleared', 'false');

  return dataset;
};
