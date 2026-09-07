import { 
  Client, 
  LegalProcess, 
  ProcessDeadline, 
  LegalDocumentItem, 
  TeamMember, 
  FinancialRecord, 
  LawOfficeSettings, 
  SaaSTenantConfig, 
  AuditLog 
} from '../types';

export interface FullDatabaseBackup {
  version: string;
  timestamp: string;
  app: string;
  office: LawOfficeSettings;
  clients: Client[];
  processes: LegalProcess[];
  deadlines: ProcessDeadline[];
  documents: LegalDocumentItem[];
  teamMembers: TeamMember[];
  financialRecords: FinancialRecord[];
  saasConfig: SaaSTenantConfig;
  auditLogs: AuditLog[];
}

export interface CloudDatabaseConfig {
  provider: 'local' | 'firebase' | 'supabase';
  firebase?: {
    apiKey: string;
    authDomain: string;
    projectId: string;
    storageBucket: string;
    messagingSenderId: string;
    appId: string;
    connected: boolean;
  };
  supabase?: {
    url: string;
    anonKey: string;
    connected: boolean;
  };
  lastSync?: string;
  autoSync: boolean;
}

const CLOUD_CONFIG_KEY = 'wono_cloud_db_config';

export const getCloudDatabaseConfig = (): CloudDatabaseConfig => {
  try {
    const saved = localStorage.getItem(CLOUD_CONFIG_KEY);
    if (saved) return JSON.parse(saved);
  } catch (e) {
    console.error('Erro ao ler configuração do banco:', e);
  }
  return {
    provider: 'local',
    firebase: {
      apiKey: '',
      authDomain: '',
      projectId: '',
      storageBucket: '',
      messagingSenderId: '',
      appId: '',
      connected: false,
    },
    supabase: {
      url: '',
      anonKey: '',
      connected: false,
    },
    autoSync: true,
  };
};

export const saveCloudDatabaseConfig = (config: CloudDatabaseConfig) => {
  try {
    localStorage.setItem(CLOUD_CONFIG_KEY, JSON.stringify(config));
  } catch (e) {
    console.error('Erro ao salvar configuração do banco:', e);
  }
};

/**
 * Generates and downloads a complete JSON backup file of all law office data
 */
export const exportFullDatabaseJSON = (data: {
  office: LawOfficeSettings;
  clients: Client[];
  processes: LegalProcess[];
  deadlines: ProcessDeadline[];
  documents: LegalDocumentItem[];
  teamMembers: TeamMember[];
  financialRecords: FinancialRecord[];
  saasConfig: SaaSTenantConfig;
  auditLogs: AuditLog[];
}) => {
  const backup: FullDatabaseBackup = {
    version: '2.0.0',
    timestamp: new Date().toISOString(),
    app: 'WONO ADVOCACIA - Gestão Jurídica SaaS',
    ...data,
  };

  const jsonStr = JSON.stringify(backup, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const dateStr = new Date().toISOString().split('T')[0];
  const link = document.createElement('a');
  link.href = url;
  link.download = `backup_wono_advocacia_${dateStr}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

/**
 * Validates and parses an uploaded JSON backup file
 */
export const parseDatabaseJSON = async (file: File): Promise<FullDatabaseBackup> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const parsed = JSON.parse(text);
        if (!parsed || typeof parsed !== 'object') {
          throw new Error('Arquivo de backup inválido ou corrompido.');
        }
        resolve(parsed);
      } catch (err: any) {
        reject(new Error(err.message || 'Erro ao processar arquivo JSON'));
      }
    };
    reader.onerror = () => reject(new Error('Falha ao ler o arquivo selecionado.'));
    reader.readAsText(file);
  });
};
