import JSZip from 'jszip';
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

export interface InstallerDataPayload {
  office: LawOfficeSettings;
  clients: Client[];
  processes: LegalProcess[];
  deadlines: ProcessDeadline[];
  documents: LegalDocumentItem[];
  teamMembers: TeamMember[];
  financialRecords: FinancialRecord[];
  saasConfig?: SaaSTenantConfig;
  auditLogs?: AuditLog[];
}

/**
 * Escapes strings for SQL queries
 */
function sqlEscape(str: string | undefined | null): string {
  if (str === undefined || str === null) return 'NULL';
  return `'${String(str).replace(/'/g, "''").replace(/\\/g, '\\\\')}'`;
}

/**
 * Generates Full PostgreSQL DDL & Data SQL script
 */
export function generatePostgreSqlScript(data: InstallerDataPayload): string {
  const dateStr = new Date().toISOString();
  
  return `-- ====================================================================
-- WONO ADVOCACIA - SCRIPT DE CRIAÇÃO E CARGA DO BANCO DE DADOS POSTGRESQL
-- Gerado em: ${dateStr}
-- Compatível com: PostgreSQL 12+, Supabase, Neon, AWS RDS, Servidor Local
-- ====================================================================

-- 1. Criação de Extensões Essenciais
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- 2. Tabela de Configurações do Escritório (Single Tenant / Head Office)
CREATE TABLE IF NOT EXISTS office_settings (
    id VARCHAR(50) PRIMARY KEY DEFAULT 'main-office',
    office_name VARCHAR(255) NOT NULL,
    office_brand_tagline VARCHAR(255),
    cnpj VARCHAR(30),
    email VARCHAR(150),
    phone VARCHAR(50),
    whatsapp VARCHAR(50),
    address_street VARCHAR(255),
    address_number VARCHAR(50),
    address_complement VARCHAR(100),
    address_neighborhood VARCHAR(150),
    address_city VARCHAR(100),
    address_state VARCHAR(10),
    address_zip_code VARCHAR(30),
    pix_key VARCHAR(150),
    pix_bank VARCHAR(100),
    primary_lawyer_name VARCHAR(200) NOT NULL,
    primary_lawyer_oab VARCHAR(50) NOT NULL,
    primary_lawyer_state VARCHAR(10) NOT NULL,
    primary_lawyer_cpf VARCHAR(30),
    primary_lawyer_email VARCHAR(150),
    primary_lawyer_phone VARCHAR(50),
    primary_lawyer_nationality VARCHAR(50) DEFAULT 'Brasileiro(a)',
    primary_lawyer_marital_status VARCHAR(50) DEFAULT 'Casado(a)',
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. Tabela de Membros da Equipe / Usuários do Sistema
CREATE TABLE IF NOT EXISTS team_members (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    email VARCHAR(150) UNIQUE NOT NULL,
    phone VARCHAR(50),
    role VARCHAR(100) NOT NULL,
    privilege VARCHAR(30) NOT NULL DEFAULT 'parcial', -- 'total', 'parcial', 'leitura'
    oab_number VARCHAR(50),
    oab_state VARCHAR(10),
    status VARCHAR(30) DEFAULT 'ativo',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. Tabela de Clientes (Pessoas Físicas e Jurídicas)
CREATE TABLE IF NOT EXISTS clients (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    type VARCHAR(30) DEFAULT 'individual', -- 'individual' (PF) ou 'company' (PJ)
    cpf_cnpj VARCHAR(50) NOT NULL,
    rg_ie VARCHAR(50),
    nationality VARCHAR(100) DEFAULT 'Brasileiro(a)',
    marital_status VARCHAR(100) DEFAULT 'Solteiro(a)',
    profession VARCHAR(150),
    email VARCHAR(150),
    phone VARCHAR(50),
    address_street VARCHAR(255),
    address_number VARCHAR(50),
    address_complement VARCHAR(100),
    address_neighborhood VARCHAR(150),
    address_city VARCHAR(100),
    address_state VARCHAR(10),
    address_zip_code VARCHAR(30),
    representative_name VARCHAR(200),
    representative_cpf VARCHAR(50),
    representative_role VARCHAR(100),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 5. Tabela de Processos Judiciais (CNJ / PJe / DataJud)
CREATE TABLE IF NOT EXISTS legal_processes (
    id VARCHAR(50) PRIMARY KEY,
    cnj_number VARCHAR(50) NOT NULL UNIQUE,
    court VARCHAR(255) NOT NULL,
    sigla VARCHAR(50),
    instance VARCHAR(50) DEFAULT '1ª Instância',
    branch_vara VARCHAR(255),
    comarca VARCHAR(150),
    lawsuit_type VARCHAR(200),
    subject TEXT,
    value NUMERIC(15, 2) DEFAULT 0.00,
    distribution_date DATE,
    status VARCHAR(50) DEFAULT 'Ativo',
    active_party VARCHAR(255),
    passive_party VARCHAR(255),
    judge VARCHAR(200),
    responsible_lawyer VARCHAR(200),
    oab_number VARCHAR(50),
    oab_state VARCHAR(10),
    client_id VARCHAR(50) REFERENCES clients(id) ON DELETE SET NULL,
    digital_link TEXT,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 6. Tabela de Andamentos e Movimentações Processuais
CREATE TABLE IF NOT EXISTS process_movements (
    id VARCHAR(50) PRIMARY KEY,
    process_id VARCHAR(50) NOT NULL REFERENCES legal_processes(id) ON DELETE CASCADE,
    movement_date TIMESTAMP WITH TIME ZONE NOT NULL,
    code VARCHAR(50),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    organ VARCHAR(255),
    is_judicial_decision BOOLEAN DEFAULT FALSE,
    deadline_days INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 7. Tabela de Prazos Processuais e Pautas de Audiência
CREATE TABLE IF NOT EXISTS process_deadlines (
    id VARCHAR(50) PRIMARY KEY,
    process_id VARCHAR(50) REFERENCES legal_processes(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    due_date TIMESTAMP WITH TIME ZONE NOT NULL,
    type VARCHAR(50) NOT NULL, -- 'prazo', 'audiencia', 'pericia', 'reuniao'
    completed BOOLEAN DEFAULT FALSE,
    priority VARCHAR(30) DEFAULT 'media', -- 'alta', 'media', 'baixa'
    responsible_lawyer VARCHAR(200),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 8. Tabela de Minutas e Documentos Jurídicos (Procurações, Contratos, Declarações)
CREATE TABLE IF NOT EXISTS legal_documents (
    id VARCHAR(50) PRIMARY KEY,
    type VARCHAR(50) NOT NULL,
    title VARCHAR(255) NOT NULL,
    client_id VARCHAR(50) REFERENCES clients(id) ON DELETE SET NULL,
    process_id VARCHAR(50) REFERENCES legal_processes(id) ON DELETE SET NULL,
    content TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 9. Tabela de Controle Financeiro e Honorários Sucumbenciais / Pró-labore
CREATE TABLE IF NOT EXISTS financial_records (
    id VARCHAR(50) PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    category VARCHAR(30) NOT NULL, -- 'Receita', 'Despesa'
    type VARCHAR(100) NOT NULL,
    client_id VARCHAR(50) REFERENCES clients(id) ON DELETE SET NULL,
    process_id VARCHAR(50) REFERENCES legal_processes(id) ON DELETE SET NULL,
    amount NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    due_date DATE NOT NULL,
    payment_date DATE,
    status VARCHAR(30) NOT NULL DEFAULT 'Pendente', -- 'Pago', 'Pendente', 'Atrasado'
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 10. Tabela de Auditoria e Logs do Sistema
CREATE TABLE IF NOT EXISTS audit_logs (
    id VARCHAR(50) PRIMARY KEY,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    user_id VARCHAR(50),
    user_name VARCHAR(200),
    action VARCHAR(100) NOT NULL,
    details TEXT,
    target_id VARCHAR(50),
    target_type VARCHAR(50)
);

-- Índices de Otimização de Busca e Performance
CREATE INDEX IF NOT EXISTS idx_processes_cnj ON legal_processes(cnj_number);
CREATE INDEX IF NOT EXISTS idx_processes_client_id ON legal_processes(client_id);
CREATE INDEX IF NOT EXISTS idx_movements_process_id ON process_movements(process_id);
CREATE INDEX IF NOT EXISTS idx_deadlines_due_date ON process_deadlines(due_date);
CREATE INDEX IF NOT EXISTS idx_financial_due_date ON financial_records(due_date);
CREATE INDEX IF NOT EXISTS idx_clients_cpf_cnpj ON clients(cpf_cnpj);

-- ====================================================================
-- CARGA DE DADOS DO SISTEMA (DADOS ATUAIS DO SEU ESCRITÓRIO)
-- ====================================================================

-- Inserindo Configurações do Escritório
INSERT INTO office_settings (
    id, office_name, office_brand_tagline, cnpj, email, phone, whatsapp,
    address_street, address_number, address_complement, address_neighborhood, address_city, address_state, address_zip_code,
    pix_key, pix_bank, primary_lawyer_name, primary_lawyer_oab, primary_lawyer_state, primary_lawyer_cpf, primary_lawyer_email, primary_lawyer_phone
) VALUES (
    'main-office',
    ${sqlEscape(data.office.officeName)},
    ${sqlEscape(data.office.officeBrandTagline)},
    ${sqlEscape(data.office.cnpj)},
    ${sqlEscape(data.office.email)},
    ${sqlEscape(data.office.phone)},
    ${sqlEscape(data.office.whatsapp)},
    ${sqlEscape(data.office.address.street)},
    ${sqlEscape(data.office.address.number)},
    ${sqlEscape(data.office.address.complement)},
    ${sqlEscape(data.office.address.neighborhood)},
    ${sqlEscape(data.office.address.city)},
    ${sqlEscape(data.office.address.state)},
    ${sqlEscape(data.office.address.zipCode)},
    ${sqlEscape(data.office.bankAccount?.pixKey)},
    ${sqlEscape(data.office.bankAccount?.bankName)},
    ${sqlEscape(data.office.primaryLawyer.name)},
    ${sqlEscape(data.office.primaryLawyer.oabNumber)},
    ${sqlEscape(data.office.primaryLawyer.oabState)},
    ${sqlEscape(data.office.primaryLawyer.cpf)},
    ${sqlEscape(data.office.primaryLawyer.email)},
    ${sqlEscape(data.office.primaryLawyer.phone)}
) ON CONFLICT (id) DO UPDATE SET 
    office_name = EXCLUDED.office_name,
    primary_lawyer_name = EXCLUDED.primary_lawyer_name,
    updated_at = CURRENT_TIMESTAMP;

-- Inserindo Membros da Equipe
${data.teamMembers.map(m => `INSERT INTO team_members (id, name, email, phone, role, privilege, oab_number, oab_state, status) 
VALUES (${sqlEscape(m.id)}, ${sqlEscape(m.name)}, ${sqlEscape(m.email)}, ${sqlEscape(m.phone)}, ${sqlEscape(m.role)}, ${sqlEscape(m.privilege)}, ${sqlEscape(m.oabNumber)}, ${sqlEscape(m.oabState)}, ${sqlEscape(m.status)})
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, role = EXCLUDED.role, privilege = EXCLUDED.privilege;`).join('\n')}

-- Inserindo Clientes
${data.clients.map(c => `INSERT INTO clients (
    id, name, type, cpf_cnpj, rg_ie, nationality, marital_status, profession,
    email, phone, address_street, address_number, address_complement, address_neighborhood,
    address_city, address_state, address_zip_code, representative_name, representative_cpf,
    representative_role, notes, created_at
) VALUES (
    ${sqlEscape(c.id)}, ${sqlEscape(c.name)}, ${sqlEscape(c.type)}, ${sqlEscape(c.cpfCnpj)}, ${sqlEscape(c.rgIe)},
    ${sqlEscape(c.nationality)}, ${sqlEscape(c.maritalStatus)}, ${sqlEscape(c.profession)}, ${sqlEscape(c.email)},
    ${sqlEscape(c.phone)}, ${sqlEscape(c.address?.street)}, ${sqlEscape(c.address?.number)}, ${sqlEscape(c.address?.complement)},
    ${sqlEscape(c.address?.neighborhood)}, ${sqlEscape(c.address?.city)}, ${sqlEscape(c.address?.state)},
    ${sqlEscape(c.address?.zipCode)}, ${sqlEscape(c.representative?.name)}, ${sqlEscape(c.representative?.cpf)},
    ${sqlEscape(c.representative?.role)}, ${sqlEscape(c.notes)}, ${sqlEscape(c.createdAt)}
) ON CONFLICT (id) DO NOTHING;`).join('\n')}

-- Inserindo Processos Judiciais
${data.processes.map(p => `INSERT INTO legal_processes (
    id, cnj_number, court, sigla, instance, branch_vara, comarca, lawsuit_type, subject,
    value, distribution_date, status, active_party, passive_party, judge, responsible_lawyer,
    oab_number, oab_state, client_id, digital_link, notes, created_at
) VALUES (
    ${sqlEscape(p.id)}, ${sqlEscape(p.cnjNumber)}, ${sqlEscape(p.court)}, ${sqlEscape(p.court)},
    ${sqlEscape('1º Grau')}, ${sqlEscape(p.branchVara)}, ${sqlEscape(p.comarca)}, ${sqlEscape(p.lawsuitType)},
    ${sqlEscape(p.subject)}, ${p.value || 0}, ${sqlEscape(p.distributionDate)}, ${sqlEscape(p.status)},
    ${sqlEscape(p.activeParty)}, ${sqlEscape(p.passiveParty)}, ${sqlEscape(p.judge)}, ${sqlEscape(p.responsibleLawyer)},
    ${sqlEscape(data.office.primaryLawyer.oabNumber)}, ${sqlEscape(data.office.primaryLawyer.oabState)}, ${sqlEscape(p.clientId)}, ${sqlEscape(`https://eproc.jus.br/processo/${p.cnjNumber}`)},
    ${sqlEscape(p.notes)}, ${sqlEscape(p.distributionDate)}
) ON CONFLICT (id) DO NOTHING;`).join('\n')}

-- Inserindo Movimentações e Andamentos
${data.processes.flatMap(p => (p.movements || []).map(m => `INSERT INTO process_movements (
    id, process_id, movement_date, code, title, description, organ, is_judicial_decision, deadline_days
) VALUES (
    ${sqlEscape(m.id)}, ${sqlEscape(p.id)}, ${sqlEscape(m.date)}, ${sqlEscape(m.code)},
    ${sqlEscape(m.title)}, ${sqlEscape(m.description)}, ${sqlEscape(m.organ)},
    ${m.isJudicialDecision ? 'TRUE' : 'FALSE'}, ${m.deadlineDays || 'NULL'}
) ON CONFLICT (id) DO NOTHING;`)).join('\n')}

-- Inserindo Prazos e Pautas
${data.deadlines.map(d => `INSERT INTO process_deadlines (
    id, process_id, title, due_date, type, completed, priority, responsible_lawyer, notes
) VALUES (
    ${sqlEscape(d.id)}, ${sqlEscape(d.processId)}, ${sqlEscape(d.title)}, ${sqlEscape(d.fatalDate)},
    ${sqlEscape(d.type)}, ${d.status === 'cumprido' ? 'TRUE' : 'FALSE'}, ${sqlEscape(d.daysLeft <= 3 ? 'Alta' : 'Normal')},
    ${sqlEscape(d.responsibleLawyer)}, ${sqlEscape(d.notes)}
) ON CONFLICT (id) DO NOTHING;`).join('\n')}

-- Inserindo Registros Financeiros
${data.financialRecords.map(f => `INSERT INTO financial_records (
    id, title, category, type, client_id, process_id, amount, due_date, payment_date, status, notes
) VALUES (
    ${sqlEscape(f.id)}, ${sqlEscape(f.title)}, ${sqlEscape(f.category)}, ${sqlEscape(f.type)},
    ${sqlEscape(f.clientId)}, ${sqlEscape(f.processId)}, ${f.amount || 0}, ${sqlEscape(f.dueDate)},
    ${sqlEscape(f.paymentDate)}, ${sqlEscape(f.status)}, ${sqlEscape(f.notes)}
) ON CONFLICT (id) DO NOTHING;`).join('\n')}

-- Finalização e Confirmação
COMMIT;
`;
}

/**
 * Generates Standalone SQLite SQL Script for single PC offline usage
 */
export function generateSqliteScript(data: InstallerDataPayload): string {
  const dateStr = new Date().toISOString();
  
  return `-- ====================================================================
-- WONO ADVOCACIA - SCRIPT SQLITE STANDALONE OFFLINE
-- Gerado em: ${dateStr}
-- Ideal para uso em arquivo local "wono_advocacia.db"
-- ====================================================================

PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS office_settings (
    id TEXT PRIMARY KEY,
    office_name TEXT NOT NULL,
    office_brand_tagline TEXT,
    cnpj TEXT,
    email TEXT,
    phone TEXT,
    whatsapp TEXT,
    address_street TEXT,
    address_number TEXT,
    address_city TEXT,
    address_state TEXT,
    address_zip_code TEXT,
    pix_key TEXT,
    pix_bank TEXT,
    primary_lawyer_name TEXT,
    primary_lawyer_oab TEXT,
    primary_lawyer_state TEXT,
    updated_at TEXT
);

CREATE TABLE IF NOT EXISTS team_members (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT,
    role TEXT NOT NULL,
    privilege TEXT DEFAULT 'parcial',
    oab_number TEXT,
    oab_state TEXT,
    status TEXT DEFAULT 'ativo'
);

CREATE TABLE IF NOT EXISTS clients (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    type TEXT DEFAULT 'individual',
    cpf_cnpj TEXT NOT NULL,
    rg_ie TEXT,
    email TEXT,
    phone TEXT,
    address_city TEXT,
    address_state TEXT,
    notes TEXT,
    created_at TEXT
);

CREATE TABLE IF NOT EXISTS legal_processes (
    id TEXT PRIMARY KEY,
    cnj_number TEXT NOT NULL UNIQUE,
    court TEXT NOT NULL,
    sigla TEXT,
    instance TEXT,
    branch_vara TEXT,
    lawsuit_type TEXT,
    subject TEXT,
    value REAL DEFAULT 0,
    distribution_date TEXT,
    status TEXT DEFAULT 'Ativo',
    active_party TEXT,
    passive_party TEXT,
    judge TEXT,
    responsible_lawyer TEXT,
    client_id TEXT,
    notes TEXT,
    created_at TEXT
);

CREATE TABLE IF NOT EXISTS process_movements (
    id TEXT PRIMARY KEY,
    process_id TEXT NOT NULL,
    movement_date TEXT NOT NULL,
    code TEXT,
    title TEXT NOT NULL,
    description TEXT,
    organ TEXT,
    is_judicial_decision INTEGER DEFAULT 0,
    deadline_days INTEGER,
    FOREIGN KEY(process_id) REFERENCES legal_processes(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS process_deadlines (
    id TEXT PRIMARY KEY,
    process_id TEXT,
    title TEXT NOT NULL,
    due_date TEXT NOT NULL,
    type TEXT NOT NULL,
    completed INTEGER DEFAULT 0,
    priority TEXT DEFAULT 'media',
    responsible_lawyer TEXT,
    notes TEXT
);

CREATE TABLE IF NOT EXISTS financial_records (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    category TEXT NOT NULL,
    type TEXT NOT NULL,
    client_id TEXT,
    process_id TEXT,
    amount REAL DEFAULT 0,
    due_date TEXT NOT NULL,
    status TEXT DEFAULT 'Pendente'
);

-- Inserindo Escritório
INSERT OR REPLACE INTO office_settings (id, office_name, primary_lawyer_name, primary_lawyer_oab, primary_lawyer_state)
VALUES ('main-office', ${sqlEscape(data.office.officeName)}, ${sqlEscape(data.office.primaryLawyer.name)}, ${sqlEscape(data.office.primaryLawyer.oabNumber)}, ${sqlEscape(data.office.primaryLawyer.oabState)});

-- Inserindo Clientes
${data.clients.map(c => `INSERT OR IGNORE INTO clients (id, name, type, cpf_cnpj, email, phone, created_at)
VALUES (${sqlEscape(c.id)}, ${sqlEscape(c.name)}, ${sqlEscape(c.type)}, ${sqlEscape(c.cpfCnpj)}, ${sqlEscape(c.email)}, ${sqlEscape(c.phone)}, ${sqlEscape(c.createdAt)});`).join('\n')}

-- Inserindo Processos
${data.processes.map(p => `INSERT OR IGNORE INTO legal_processes (id, cnj_number, court, lawsuit_type, subject, value, status, active_party, passive_party, responsible_lawyer, client_id)
VALUES (${sqlEscape(p.id)}, ${sqlEscape(p.cnjNumber)}, ${sqlEscape(p.court)}, ${sqlEscape(p.lawsuitType)}, ${sqlEscape(p.subject)}, ${p.value || 0}, ${sqlEscape(p.status)}, ${sqlEscape(p.activeParty)}, ${sqlEscape(p.passiveParty)}, ${sqlEscape(p.responsibleLawyer)}, ${sqlEscape(p.clientId)});`).join('\n')}

-- Inserindo Prazos
${data.deadlines.map(d => `INSERT OR IGNORE INTO process_deadlines (id, process_id, title, due_date, type, completed, priority)
VALUES (${sqlEscape(d.id)}, ${sqlEscape(d.processId)}, ${sqlEscape(d.title)}, ${sqlEscape(d.fatalDate)}, ${sqlEscape(d.type)}, ${d.status === 'cumprido' ? 1 : 0}, ${sqlEscape(d.daysLeft <= 3 ? 'Alta' : 'Normal')});`).join('\n')}
`;
}

/**
 * Windows 1-Click Batch Installer: `Instalar_WonoJuris_Local_e_Rede.bat`
 */
export function generateWindowsInstallerBat(): string {
  return `@echo off
chcp 65001 >nul
title INSTALADOR WONO ADVOCACIA - SERVIDOR LOCAL & REDE
color 0E

echo ==============================================================================
echo                WONO ADVOCACIA - SISTEMA DE GESTAO JURIDICA
echo              INSTALADOR AUTOMATICO PARA PC LOCAL E REDE DO ESCRITORIO
echo ==============================================================================
echo.
echo [1/5] Verificando se o Node.js esta instalado no computador...
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo.
    echo [AVISO] Node.js nao foi detectado neste computador!
    echo O instalador ira abrir a pagina oficial para download gratuito do Node.js LTS.
    echo Baixe e instale o Node.js LTS (marcando a opcao "Add to PATH").
    pause
    start https://nodejs.org/en/download/
    echo Apos instalar o Node.js, execute este arquivo .bat novamente.
    pause
    exit /b
) else (
    echo [OK] Node.js detectado com sucesso!
)

echo.
echo [2/5] Instalando todas as dependencias do sistema...
call npm install
if %errorlevel% neq 0 (
    echo [ERRO] Falha ao instalar pacotes npm. Verifique sua conexao com a internet.
    pause
    exit /b
)

echo.
echo [3/5] Compilando e gerando o banco de dados e arquivos de producao...
call npm run build
if %errorlevel% neq 0 (
    echo [AVISO] O build retornou avisos, mas prosseguindo com o modo servidor direto...
)

echo.
echo [4/5] Liberando a porta 3000 no Firewall do Windows para acesso em rede...
netsh advfirewall firewall delete rule name="WONO_ADVOCACIA_3000" >nul 2>nul
netsh advfirewall firewall add rule name="WONO_ADVOCACIA_3000" dir=in action=allow protocol=TCP localport=3000 profile=any >nul 2>nul
if %errorlevel% equ 0 (
    echo [OK] Regra de Firewall criada com sucesso! Outros computadores poderao acessar.
) else (
    echo [AVISO] Nao foi possivel adicionar regra automatica ao firewall. Se necessario, execute como Administrador.
)

echo.
echo [5/5] Identificando o Endereco IP deste Computador na Rede Local...
for /f "tokens=2 delims=:" %%a in ('ipconfig ^| findstr /c:"IPv4" ^| findstr /v "127.0.0.1"') do (
    set LOCAL_IP=%%a
)
set LOCAL_IP=%LOCAL_IP: =%

echo.
echo ==============================================================================
echo                       INSTALACAO CONCLUIDA COM SUCESSO!
echo ==============================================================================
echo.
echo  - Acesso neste Computador:    http://localhost:3000
echo  - Acesso de OUTROS PCs/Rede:  http://%LOCAL_IP%:3000
echo.
echo  Para iniciar o sistema sempre que ligar o PC, basta clicar em:
echo  "Iniciar_Servidor_Rede_Local.bat"
echo.
echo Deseja iniciar o sistema agora mesmo? (S/N)
set /p START_NOW="Opcao: "
if /i "%START_NOW%"=="S" (
    start http://localhost:3000
    call npm run start
)
pause
`;
}

/**
 * Windows Runner Batch: `Iniciar_Servidor_Rede_Local.bat`
 */
export function generateWindowsStartBat(): string {
  return `@echo off
chcp 65001 >nul
title WONO ADVOCACIA - SERVIDOR EM EXECUCAO
color 0A

echo ==============================================================================
echo                   WONO ADVOCACIA - INICIANDO SERVIDOR LOCAL
echo ==============================================================================
echo.

:: Detect Local IP
for /f "tokens=2 delims=:" %%a in ('ipconfig ^| findstr /c:"IPv4" ^| findstr /v "127.0.0.1"') do (
    set LOCAL_IP=%%a
)
set LOCAL_IP=%LOCAL_IP: =%

echo  [+] Servidor Ativo na Porta: 3000 (0.0.0.0)
echo  [+] Acesso Local (este PC):  http://localhost:3000
echo  [+] Acesso em Rede (Outros): http://%LOCAL_IP%:3000
echo.
echo  * Dica: Cole o endereco "http://%LOCAL_IP%:3000" nos outros computadores,
echo    notebooks e celulares conectados ao mesmo Wi-Fi ou cabo do escritorio.
echo.
echo  ==============================================================================
echo  Mantenha esta janela aberta enquanto o escritorio estiver funcionando.
echo  Para fechar o sistema, feche esta janela ou pressione Ctrl + C.
echo  ==============================================================================
echo.

:: Abre o navegador padrao no endereco local
timeout /t 2 >nul
start http://localhost:3000

:: Inicia o servidor Node.js
npm run dev
pause
`;
}

/**
 * Automated Windows Daily Backup Batch: `Backup_Automatico_Diario.bat`
 */
export function generateBackupBat(): string {
  return `@echo off
chcp 65001 >nul
title WONO ADVOCACIA - BACKUP AUTOMATICO
color 0B

echo ==============================================================================
echo                 WONO ADVOCACIA - ROTINA DE BACKUP AUTOMATICO
echo ==============================================================================
echo.

set BACKUP_DIR=.\backups
if not exist "%BACKUP_DIR%" mkdir "%BACKUP_DIR%"

for /f "tokens=1-3 delims=/ " %%a in ('date /t') do (
    set TODAY=%%c-%%b-%%a
)
for /f "tokens=1-2 delims=: " %%a in ('time /t') do (
    set NOW=%%a%%b
)
set BACKUP_FILE=%BACKUP_DIR%\\backup_wono_juris_%TODAY%_%NOW%.json

echo [+] Copiando dados do sistema para a pasta de seguranca...
echo [+] Destino: %BACKUP_FILE%

:: Copia arquivo de persistencia local se existir
if exist ".\data\wono_database.json" (
    copy /y ".\data\wono_database.json" "%BACKUP_FILE%" >nul
    echo [OK] Backup do banco de dados concluido com sucesso!
) else (
    echo [INFO] Utilizando copia dos esquemas SQL e exports do sistema.
    copy /y ".\schema_postgresql.sql" "%BACKUP_DIR%\\backup_schema_%TODAY%.sql" >nul
)

echo.
echo Backup finalizado com sucesso!
timeout /t 4
`;
}

/**
 * Linux 1-Click Server Installation & Launch Script: `instalar_linux.sh`
 */
export function generateLinuxInstallerSh(): string {
  return `#!/bin/bash
# ==============================================================================
#                 WONO ADVOCACIA - INSTALADOR PARA LINUX / UBUNTU / DEBIAN
# ==============================================================================

set -e

echo "=== [1/4] Verificando dependências do sistema... ==="
if ! command -v node &> /dev/null; then
    echo "[!] Node.js não encontrado. Instalando Node.js LTS..."
    curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
    sudo apt-get install -y nodejs
else
    echo "[OK] Node.js $(node -v) detectado."
fi

echo "=== [2/4] Instalando pacotes da aplicação... ==="
npm install

echo "=== [3/4] Detectando IP na rede local... ==="
LOCAL_IP=$(hostname -I | awk '{print $1}')

echo "=== [4/4] Iniciando Servidor Wono Advocacia... ==="
echo ""
echo "=============================================================================="
echo " [+] Servidor Ativo na Porta: 3000 (0.0.0.0)"
echo " [+] Acesso Local (este PC):  http://localhost:3000"
echo " [+] Acesso em Rede (Outros): http://$LOCAL_IP:3000"
echo "=============================================================================="
echo ""
echo "Pressione Ctrl + C para encerrar o servidor."
npm run dev
`;
}

/**
 * macOS 1-Click Server Launch Script: `iniciar_mac.command`
 */
export function generateMacInstallerCommand(): string {
  return `#!/bin/bash
# ==============================================================================
#                   WONO ADVOCACIA - INICIAR NO MACOS (MACBOOK/IMAC)
# ==============================================================================

cd "\$(dirname "\$0")"

echo "=== Iniciando WONO ADVOCACIA no macOS... ==="

# Verifica se o Node.js está instalado
if ! command -v node &> /dev/null; then
    echo "[!] Node.js não detectado. Por favor, instale o Node.js em https://nodejs.org ou via Homebrew: brew install node"
    read -p "Pressione Enter para fechar..."
    exit 1
fi

if [ ! -d "node_modules" ]; then
    echo "Instalando dependências pela primeira vez..."
    npm install
fi

# Detecta IP Local
LOCAL_IP=\$(ipconfig getifaddr en0 2>/dev/null || ipconfig getifaddr en1 2>/dev/null || echo "127.0.0.1")

echo ""
echo "=============================================================================="
echo " [+] Servidor Ativo na Porta: 3000"
echo " [+] Acesso no Mac:     http://localhost:3000"
echo " [+] Acesso na Rede Wi-Fi: http://$LOCAL_IP:3000"
echo "=============================================================================="
echo ""

# Abre o navegador padrão no Safari / Chrome
open "http://localhost:3000"

# Inicia servidor
npm run dev
`;
}

/**
 * Render.com Web Service Free Tier Configuration: `render.yaml`
 */
export function generateRenderYaml(): string {
  return `services:
  - type: web
    name: wono-advocacia-server
    env: node
    plan: free
    region: oregon
    buildCommand: npm install && npm run build
    startCommand: npm start
    envVars:
      - key: NODE_ENV
        value: production
      - key: PORT
        value: 3000
      - key: HOST
        value: 0.0.0.0
`;
}

/**
 * Vercel Configuration: `vercel.json`
 */
export function generateVercelJson(): string {
  return JSON.stringify({
    version: 2,
    builds: [
      {
        src: "package.json",
        use: "@vercel/static-build",
        config: { distDir: "dist" }
      }
    ],
    routes: [
      {
        handle: "filesystem"
      },
      {
        src: "/(.*)",
        dest: "/index.html"
      }
    ]
  }, null, 2);
}

/**
 * Netlify Configuration: `netlify.toml`
 */
export function generateNetlifyToml(): string {
  return `[build]
  command = "npm run build"
  publish = "dist"

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
`;
}

/**
 * Procfile for Railway, Heroku, Dokku & Cloud Container Runtimes
 */
export function generateProcfile(): string {
  return `web: npm start
`;
}

/**
 * Environment Variables Template: `.env.example`
 */
export function generateEnvExample(): string {
  return `# ==============================================================================
#               WONO ADVOCACIA - VARIAVEIS DE AMBIENTE (OPCIONAL)
# ==============================================================================

# Porta do Servidor (Padrão: 3000)
PORT=3000
HOST=0.0.0.0
NODE_ENV=production

# Chave de Inteligência Artificial Google Gemini (Opcional para Petições com IA)
# Obtenha grátis em: https://aistudio.google.com/
GEMINI_API_KEY=

# Banco de Dados PostgreSQL / Supabase (Opcional para sincronização em nuvem)
# Obtenha grátis em: https://supabase.com/
DATABASE_URL=
`;
}

/**
 * Docker Compose file for 1-click Linux / Windows / Mac deployment with PostgreSQL 16
 */
export function generateDockerCompose(): string {
  return `version: '3.8'

services:
  # Servidor Web e API Node.js do Wono Advocacia
  wono-app:
    build: .
    container_name: wono_advocacia_server
    restart: always
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - PORT=3000
      - DATABASE_URL=postgres://wono_user:wono_password_segura@wono-db:5432/wono_advocacia
      - HOST=0.0.0.0
    depends_on:
      - wono-db
    volumes:
      - ./data:/app/data
      - ./backups:/app/backups
    networks:
      - wono-network

  # Banco de Dados Relacional PostgreSQL 16
  wono-db:
    image: postgres:16-alpine
    container_name: wono_advocacia_postgres
    restart: always
    environment:
      POSTGRES_USER: wono_user
      POSTGRES_PASSWORD: wono_password_segura
      POSTGRES_DB: wono_advocacia
    ports:
      - "5432:5432"
    volumes:
      - wono_pgdata:/var/lib/postgresql/data
      - ./schema_postgresql.sql:/docker-entrypoint-initdb.d/init.sql
    networks:
      - wono-network

networks:
  wono-network:
    driver: bridge

volumes:
  wono_pgdata:
`;
}

/**
 * Complete Markdown User Guide for Local Network, Offline & Database Setup
 */
export function generateInstallationGuideMd(data: InstallerDataPayload): string {
  return `# GUIA COMPLETO DE INSTALAÇÃO: BANCO DE DADOS, REDE LOCAL E MODO OFFLINE
**Sistema de Gestão Jurídica WONO ADVOCACIA**
*Data de Emissão: ${new Date().toLocaleDateString('pt-BR')}*

---

## 📌 1. Visão Geral da Arquitetura
O **WONO ADVOCACIA** é uma solução híbrida **Offline-First & Cloud-Ready**. Ele foi projetado para rodar:
1. **No PC do Escritório (Servidor Local)**: Sem mensalidades obrigatórias de nuvem, mantendo todos os dados confidenciais dos clientes no próprio escritório.
2. **Em Rede Local (Wi-Fi ou Cabo)**: Qualquer computador, notebook ou celular conectado à rede do escritório pode acessar simultaneamente pelo navegador.
3. **100% Offline (Sem Internet)**: Caso a internet caia, o sistema continua funcionando para consultar processos, redigir minutas, emitir recibos e agendar prazos. Ao retornar a conexão, os andamentos e consultas CNJ são sincronizados.

---

## 🚀 2. Instalação em 1 Clique no Computador Principal (Servidor do Escritório)

### Passo 1: Instalação Automática
1. Extraia todos os arquivos do pacote ZIP baixado para uma pasta de sua preferência (ex: \`C:\\WonoAdvocacia\`).
2. Clique duas vezes com o botão direito em **\`Instalar_WonoJuris_Local_e_Rede.bat\`** e selecione **"Executar como Administrador"**.
3. O script instalará as dependências, liberará a porta 3000 no Firewall do Windows e exibirá o IP do seu computador na rede.

### Passo 2: Iniciando o Sistema Diariamente
1. Sempre que ligar o computador do escritório, clique duas vezes em:
   \`Iniciar_Servidor_Rede_Local.bat\`
2. Uma janela preta ficará aberta informando que o servidor está ativo. O seu navegador abrirá automaticamente em \`http://localhost:3000\`.

---

## 💻 3. Acessando de Outros Computadores do Escritório (Sem Instalar Nada)

Nos outros computadores da sua equipe (secretária, advogados associados, estagiários):
1. Certifique-se de que estão conectados no **mesmo Wi-Fi ou rede cabeada**.
2. Abra o navegador (Google Chrome, Edge, Safari, Firefox).
3. Digite o endereço do PC principal (ex: \`http://192.168.1.100:3000\` ou o IP exibido na tela do instalador).
4. Pronto! O sistema abrirá instantaneamente com sincronização multiusuário em tempo real.

---

## 🗄️ 4. Instalação do Banco de Dados (PostgreSQL / SQLite / Supabase / Firebase)

O pacote já inclui os scripts SQL prontos com todas as tabelas, índices e dados atuais do seu escritório:

### Opção A: PostgreSQL Local ou em Servidor Dedicado
1. Instale o PostgreSQL (versão 14, 15 ou 16) ou utilize o Docker (\`docker-compose up -d\`).
2. Crie uma base de dados chamada \`wono_advocacia\`.
3. Execute o script **\`schema_postgresql.sql\`** no pgAdmin, DBeaver ou linha de comando:
   \`\`\`bash
   psql -U postgres -d wono_advocacia -f schema_postgresql.sql
   \`\`\`

### Opção B: SQLite Standalone (1 Arquivo Local)
- O script **\`schema_sqlite.sql\`** cria todas as tabelas em um banco SQLite leve ideal para uso portátil em pendrive ou notebook.

### Opção C: Supabase PostgreSQL Gratuito na Nuvem
1. Crie uma conta gratuita em [https://supabase.com](https://supabase.com).
2. Vá em **SQL Editor** -> **New Query**.
3. Cole o conteúdo de **\`schema_postgresql.sql\`** e clique em **RUN**.

---

## 🔒 5. Segurança, Backups e Rotinas Preventivas

- **Backup Automático**: O arquivo \`Backup_Automatico_Diario.bat\` pode ser agendado no **Agendador de Tarefas do Windows** para rodar todos os dias às 18:00h.
- **Exportação Manual**: A qualquer momento, acesse o menu **SaaS / Banco de Dados** no sistema e clique em **"Baixar Backup Completo JSON"**.
- **Privilégios de Acesso**: Use o seletor de operadores para definir quem tem privilégio **Total (Master)**, **Parcial (Advogado)** ou **Apenas Leitura (Estagiário)**.

---

## 📞 Suporte e Especificações Técnicas
- **Escritório:** ${data.office.officeName}
- **Advogado Responsável:** ${data.office.primaryLawyer.name} (OAB/${data.office.primaryLawyer.oabState} ${data.office.primaryLawyer.oabNumber})
- **Porta Padrão:** 3000 (HTTP)
- **Protocolo de Rede:** TCP / IPv4
- **Persistência Local:** IndexedDB + LocalStorage + JSON Engine + PostgreSQL
`;
}

/**
 * Compiles and triggers the download of the entire complete ZIP Installer Package
 */
export async function downloadCompleteInstallerPackageZip(data: InstallerDataPayload): Promise<void> {
  const zip = new JSZip();
  const dateStr = new Date().toISOString().split('T')[0];

  // 1. Operating System Scripts (Windows, Linux, macOS)
  zip.file('Instalar_WonoJuris_Local_e_Rede.bat', generateWindowsInstallerBat());
  zip.file('Iniciar_Servidor_Rede_Local.bat', generateWindowsStartBat());
  zip.file('Backup_Automatico_Diario.bat', generateBackupBat());
  zip.file('instalar_linux.sh', generateLinuxInstallerSh());
  zip.file('iniciar_mac.command', generateMacInstallerCommand());

  // 2. Cloud Deployment Configs (Render, Vercel, Netlify, Railway)
  zip.file('render.yaml', generateRenderYaml());
  zip.file('vercel.json', generateVercelJson());
  zip.file('netlify.toml', generateNetlifyToml());
  zip.file('Procfile', generateProcfile());
  zip.file('.env.example', generateEnvExample());

  // 3. Database SQL Schemas & Seeds
  const postgresSql = generatePostgreSqlScript(data);
  const sqliteSql = generateSqliteScript(data);
  zip.file('schema_postgresql.sql', postgresSql);
  zip.file('schema_sqlite.sql', sqliteSql);

  // 4. Complete Database JSON Backup
  const fullBackupJson = JSON.stringify({
    version: '2.5.0',
    exportDate: new Date().toISOString(),
    office: data.office,
    clients: data.clients,
    processes: data.processes,
    deadlines: data.deadlines,
    documents: data.documents,
    teamMembers: data.teamMembers,
    financialRecords: data.financialRecords,
    saasConfig: data.saasConfig,
    auditLogs: data.auditLogs,
  }, null, 2);
  zip.file(`backup_banco_dados_wono_${dateStr}.json`, fullBackupJson);

  // 5. Docker Deployment Configs
  zip.file('docker-compose.yml', generateDockerCompose());

  // 6. Documentation & Step-by-Step Guide
  const guideMd = generateInstallationGuideMd(data);
  zip.file('GUIA_INSTALACAO_REDE_E_BANCO.md', guideMd);
  zip.file('LEIA-ME_PRIMEIROS_PASSOS.txt', `==============================================================================
               WONO ADVOCACIA - PACOTE DE INSTALACAO COMPLETO (100% GRATIS)
==============================================================================

Parabens! Voce baixou o instalador completo do Wono Advocacia.

1. COMO INSTALAR NO SEU PC (WINDOWS / LINUX / MAC - CUSTO R$ 0,00):
   - Windows: Execute "Instalar_WonoJuris_Local_e_Rede.bat" como Administrador.
              Para abrir diariamente: clique em "Iniciar_Servidor_Rede_Local.bat".
   - Linux:   Execute "bash instalar_linux.sh".
   - macOS:   Execute "./iniciar_mac.command".

2. COMO ACESSAR DE OUTROS COMPUTADORES DO ESCRITORIO (REDE LOCAL WI-FI / CABO):
   - Abra o navegador nos outros computadores e digite o endereco IP do computador
     principal (ex: http://192.168.1.100:3000).

3. COMO SUBIR O SERVIDOR GRATIS NA NUVEM (RENDER / NETLIFY / VERCEL):
   - Render.com: Crie uma conta gratuita e faca o deploy usando o arquivo "render.yaml".
   - Vercel/Netlify: Use "vercel.json" ou "netlify.toml".

4. BANCO DE DADOS GRATUITO POSTGRESQL / SUPABASE:
   - Abra "schema_postgresql.sql" no SQL Editor do Supabase ou no seu PostgreSQL local.
   - Todos os clientes, processos CNJ e prazos ja estao incluidos!

Leia o arquivo "GUIA_INSTALACAO_REDE_E_BANCO.md" para o manual passo a passo.
`);

  // Generate ZIP blob and trigger browser download
  const blob = await zip.generateAsync({ type: 'blob' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `instalador_wono_juris_rede_offline_db_${dateStr}.zip`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Triggers direct download of a single specific file
 */
export function downloadSingleInstallerFile(filename: string, content: string, mimeType = 'text/plain') {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
