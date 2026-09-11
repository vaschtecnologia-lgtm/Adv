import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import { LegalProcess, ProcessDeadline, LawOfficeSettings, FinancialRecord } from '../types';
import { formatCurrencyBRL } from './documentGenerator';

// Professional Colors for the PDF Report
const COLORS = {
  primary: '#0f172a',    // Dark Slate
  secondary: '#475569',  // Medium Slate
  accent: '#d97706',     // Amber
  background: '#f8fafc', // Light Gray
  border: '#cbd5e1',     // Soft Border
  text: '#1e293b',       // Deep Charcoal
  white: '#ffffff',
  green: '#16a34a',
  red: '#dc2626'
};

/**
 * Draws a professional header with the law office details on each page
 */
function drawPageHeader(doc: jsPDF, office: LawOfficeSettings, reportTitle: string, pageNum: number) {
  // Top Accent Bar
  doc.setFillColor(COLORS.primary);
  doc.rect(15, 12, 180, 2, 'F');

  // Office Name (Left side)
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(COLORS.primary);
  doc.text(office.officeName.toUpperCase(), 15, 22);

  // Office details (OAB, Address)
  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(COLORS.secondary);
  
  const oabText = `OAB/${office.primaryLawyer.oabState} nº ${office.primaryLawyer.oabNumber} | Advogado: ${office.primaryLawyer.name}`;
  doc.text(oabText, 15, 27);
  
  const addressText = `${office.address.street}, ${office.address.number} - ${office.address.city}/${office.address.state}`;
  doc.text(addressText, 15, 31);

  // Report Date & Generation Time (Right side)
  const today = new Date().toLocaleDateString('pt-BR');
  const nowTime = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(COLORS.secondary);
  doc.text(`Data: ${today} - ${nowTime}`, 195, 22, { align: 'right' });
  doc.text(`Relatório Oficial`, 195, 27, { align: 'right' });

  // Divider Line
  doc.setDrawColor(COLORS.border);
  doc.setLineWidth(0.3);
  doc.line(15, 34, 195, 34);

  // Subtitle / Report title
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(COLORS.accent);
  doc.text(reportTitle.toUpperCase(), 15, 41);

  // Reset font for body
  doc.setFont('Helvetica', 'normal');
}

/**
 * Draws a professional page footer with pagination and confidentiality
 */
function drawPageFooter(doc: jsPDF, totalPages: number, pageNum: number, officeName: string) {
  const y = 285;
  doc.setDrawColor(COLORS.border);
  doc.setLineWidth(0.3);
  doc.line(15, y - 5, 195, y - 5);

  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(COLORS.secondary);
  
  const systemText = `Gerado pelo Sistema Integrado de Gestão Jurídica - ${officeName}`;
  doc.text(systemText, 15, y);
  doc.text(`Confidencial - Uso Interno`, 105, y, { align: 'center' });
  doc.text(`Página ${pageNum} de ${totalPages}`, 195, y, { align: 'right' });
}

/**
 * Checks if we need to add a new page based on current Y position
 */
function checkPageBreak(doc: jsPDF, currentY: number, increment: number, office: LawOfficeSettings, title: string, pageState: { page: number }): number {
  if (currentY + increment > 275) {
    doc.addPage();
    pageState.page += 1;
    drawPageHeader(doc, office, title, pageState.page);
    return 48; // Reset Y position below header
  }
  return currentY + increment;
}

/**
 * Formats a given ISO date string into dd/mm/aaaa
 */
function formatDate(dateStr?: string): string {
  if (!dateStr) return '-';
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return dateStr;
    return date.toLocaleDateString('pt-BR');
  } catch {
    return dateStr;
  }
}

/**
 * EXPORT 1: EXPORT DASHBOARD AS DETAILED EXECUTIVO REPORT PDF
 */
export async function generateDashboardPDF(
  processes: LegalProcess[],
  deadlines: ProcessDeadline[],
  clients: any[],
  office: LawOfficeSettings,
  financialRecords: FinancialRecord[],
  metrics: {
    totalReceived: number;
    totalPending: number;
    totalOverdue: number;
    totalExpenses: number;
    netProfit: number;
    totalLitigation: number;
  }
): Promise<void> {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const pageState = { page: 1 };
  const reportTitle = "Relatório Executivo de Desempenho & KPIs";
  
  // Draw Page 1 Header
  drawPageHeader(doc, office, reportTitle, pageState.page);

  let y = 48;

  // 1. Executive Summary & Office Intro
  doc.setFillColor(COLORS.background);
  doc.rect(15, y, 180, 16, 'F');
  doc.setDrawColor(COLORS.primary);
  doc.setLineWidth(0.5);
  doc.line(15, y, 15, y + 16); // Left accent line

  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(COLORS.primary);
  doc.text("SUMÁRIO EXECUTIVO DA BANCA", 18, y + 5);

  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(COLORS.text);
  const activeProcesses = processes.filter(p => p.status === 'Ativo').length;
  const pendingDeadlines = deadlines.filter(d => d.status !== 'cumprido').length;
  const introText = `Este relatório compila os principais indicadores operacionais e de saúde financeira do escritório. Atualmente, a banca conta com ${processes.length} processos cadastrados (sendo ${activeProcesses} ativos), ${clients.length} clientes na base, e ${pendingDeadlines} prazos processuais em aberto.`;
  doc.text(doc.splitTextToSize(introText, 172), 18, y + 9);

  y += 22;

  // 2. Core Operational Metrics Dashboard Blocks (2x2 grid)
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(COLORS.primary);
  doc.text("INDICADORES OPERACIONAIS E PATRIMONIAIS", 15, y);
  
  y += 4;
  
  // Card 1: Processos Cadastrados
  doc.setFillColor(COLORS.background);
  doc.roundedRect(15, y, 87, 20, 2, 2, 'F');
  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(COLORS.secondary);
  doc.text("Total de Processos sob Gestão", 19, y + 6);
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(COLORS.primary);
  doc.text(`${processes.length}`, 19, y + 14);
  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(COLORS.green);
  doc.text(`${activeProcesses} Processos Ativos`, 48, y + 14);

  // Card 2: Valor sob Litígio
  doc.setFillColor(COLORS.background);
  doc.roundedRect(108, y, 87, 20, 2, 2, 'F');
  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(COLORS.secondary);
  doc.text("Valor Total sob Litígio (Patrimônio)", 112, y + 6);
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(COLORS.accent);
  doc.text(formatCurrencyBRL(metrics.totalLitigation), 112, y + 14);

  y += 24;

  // 3. Financial Metrics (KPI Cards)
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(COLORS.primary);
  doc.text("BALANÇO FINANCEIRO DE HONORÁRIOS", 15, y);

  y += 4;

  const colWidth = 42;
  const colSpacing = 4;
  const cards = [
    { label: 'Honorários Recebidos', value: formatCurrencyBRL(metrics.totalReceived), color: COLORS.green },
    { label: 'Projetado / A Receber', value: formatCurrencyBRL(metrics.totalPending), color: COLORS.accent },
    { label: 'Inadimplência / Atrasado', value: formatCurrencyBRL(metrics.totalOverdue), color: COLORS.red },
    { label: 'Resultado Líquido', value: formatCurrencyBRL(metrics.netProfit), color: COLORS.primary }
  ];

  cards.forEach((card, idx) => {
    const xPos = 15 + idx * (colWidth + colSpacing);
    doc.setFillColor(COLORS.background);
    doc.roundedRect(xPos, y, colWidth, 22, 1.5, 1.5, 'F');
    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(COLORS.secondary);
    doc.text(doc.splitTextToSize(card.label, colWidth - 6), xPos + 4, y + 5);
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(card.color);
    doc.text(card.value, xPos + 4, y + 16);
  });

  y += 28;

  // 4. Try capturing Dashboard Chart if present
  let chartAdded = false;
  try {
    const chartElements = document.querySelectorAll('.recharts-wrapper, [id^="recharts-"]');
    if (chartElements && chartElements.length > 0) {
      // Choose the first chart (Revenue Over Time or Case Distribution)
      const chartElement = chartElements[0] as HTMLElement;
      if (chartElement) {
        // Temporarily adjust some styles to make sure canvas captures correctly
        const canvas = await html2canvas(chartElement, {
          backgroundColor: '#0f172a', // Capture matching current theme or white
          scale: 2,
          logging: false
        });
        const chartImgData = canvas.toDataURL('image/png');
        
        y = checkPageBreak(doc, y, 75, office, reportTitle, pageState);
        
        doc.setFont('Helvetica', 'bold');
        doc.setFontSize(10);
        doc.setTextColor(COLORS.primary);
        doc.text("DISTRIBUIÇÃO GRÁFICA / EVOLUÇÃO FINANCEIRA", 15, y);
        
        y += 4;
        // Render chart box
        doc.setFillColor('#0f172a');
        doc.roundedRect(15, y, 180, 64, 2, 2, 'F');
        doc.addImage(chartImgData, 'PNG', 18, y + 3, 174, 58);
        chartAdded = true;
        y += 68;
      }
    }
  } catch (err) {
    console.error("Could not capture chart to PDF:", err);
  }

  // 5. Recent Deadlines and Actions (Table)
  y = checkPageBreak(doc, y, 40, office, reportTitle, pageState);
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(COLORS.primary);
  doc.text("PRAZOS E COMPROMISSOS EM ALERTA / ATRASADOS", 15, y);

  y += 4;
  
  // Table Header
  doc.setFillColor(COLORS.primary);
  doc.rect(15, y, 180, 7, 'F');
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(COLORS.white);
  doc.text("PROCESSO", 18, y + 4.5);
  doc.text("PRAZO / DESCRIÇÃO", 60, y + 4.5);
  doc.text("VENCIMENTO", 145, y + 4.5);
  doc.text("STATUS", 175, y + 4.5);

  y += 7;

  const urgentDeadlines = deadlines
    .filter(d => d.status === 'alerta' || d.status === 'atrasado')
    .slice(0, 5);

  if (urgentDeadlines.length === 0) {
    doc.setFillColor(COLORS.white);
    doc.rect(15, y, 180, 8, 'F');
    doc.setDrawColor(COLORS.border);
    doc.rect(15, y, 180, 8, 'S');
    doc.setFont('Helvetica', 'italic');
    doc.setFontSize(8);
    doc.setTextColor(COLORS.secondary);
    doc.text("Nenhum prazo urgente ou em atraso registrado.", 90, y + 5, { align: 'center' });
    y += 8;
  } else {
    urgentDeadlines.forEach((dl, idx) => {
      y = checkPageBreak(doc, y, 8.5, office, reportTitle, pageState);
      
      // Zebra striping
      doc.setFillColor(idx % 2 === 0 ? COLORS.background : COLORS.white);
      doc.rect(15, y, 180, 8, 'F');

      // Draw bottom border
      doc.setDrawColor(COLORS.border);
      doc.setLineWidth(0.2);
      doc.line(15, y + 8, 195, y + 8);

      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(7.5);
      doc.setTextColor(COLORS.text);
      doc.text(dl.processNumber || 'Não Vinculado', 18, y + 5);

      doc.setFont('Helvetica', 'normal');
      doc.setFontSize(7.5);
      const descText = dl.title.length > 55 ? dl.title.substring(0, 52) + '...' : dl.title;
      doc.text(descText, 60, y + 5);

      doc.text(formatDate(dl.fatalDate), 145, y + 5);

      // Status text colored
      doc.setFont('Helvetica', 'bold');
      if (dl.status === 'atrasado') {
        doc.setTextColor(COLORS.red);
        doc.text("ATRASADO ⚠️", 175, y + 5);
      } else {
        doc.setTextColor(COLORS.accent);
        doc.text("URGENTE ⏰", 175, y + 5);
      }
      doc.setTextColor(COLORS.text); // Reset
      y += 8;
    });
  }

  // 6. Recent Movements
  y = checkPageBreak(doc, y, 35, office, reportTitle, pageState);
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(COLORS.primary);
  doc.text("ÚLTIMOS MOVIMENTOS PROCESSUAIS COMPILADOS", 15, y);

  y += 4;

  // Table Header
  doc.setFillColor(COLORS.primary);
  doc.rect(15, y, 180, 7, 'F');
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(COLORS.white);
  doc.text("PROCESSO / PARTES", 18, y + 4.5);
  doc.text("MOVIMENTO / HISTÓRICO", 75, y + 4.5);
  doc.text("DATA MOV.", 168, y + 4.5);

  y += 7;

  // Flatten recent movements from all processes
  const recentMovements = processes
    .flatMap((proc) =>
      proc.movements.map((mov) => ({
        ...mov,
        cnjNumber: proc.cnjNumber,
        parties: `${proc.activeParty} vs ${proc.passiveParty}`,
      }))
    )
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 6);

  if (recentMovements.length === 0) {
    doc.setFillColor(COLORS.white);
    doc.rect(15, y, 180, 8, 'F');
    doc.setDrawColor(COLORS.border);
    doc.rect(15, y, 180, 8, 'S');
    doc.setFont('Helvetica', 'italic');
    doc.setFontSize(8);
    doc.setTextColor(COLORS.secondary);
    doc.text("Nenhum andamento ou publicação recente para listar.", 90, y + 5, { align: 'center' });
    y += 8;
  } else {
    recentMovements.forEach((mov, idx) => {
      y = checkPageBreak(doc, y, 10, office, reportTitle, pageState);

      // Zebra striping
      doc.setFillColor(idx % 2 === 0 ? COLORS.background : COLORS.white);
      doc.rect(15, y, 180, 10, 'F');

      // Draw bottom border
      doc.setDrawColor(COLORS.border);
      doc.setLineWidth(0.2);
      doc.line(15, y + 10, 195, y + 10);

      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(7);
      doc.setTextColor(COLORS.primary);
      doc.text(mov.cnjNumber, 18, y + 4);
      
      doc.setFont('Helvetica', 'normal');
      doc.setFontSize(6.5);
      doc.setTextColor(COLORS.secondary);
      const partyText = mov.parties.length > 38 ? mov.parties.substring(0, 36) + '...' : mov.parties;
      doc.text(partyText, 18, y + 7.5);

      // Movement details
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(7);
      doc.setTextColor(COLORS.text);
      const movTitle = mov.title.length > 60 ? mov.title.substring(0, 58) + '...' : mov.title;
      doc.text(movTitle, 75, y + 4);

      doc.setFont('Helvetica', 'normal');
      doc.setFontSize(6.5);
      doc.setTextColor(COLORS.secondary);
      const movDesc = mov.description.replace(/\n/g, ' ').trim();
      const movDescClean = movDesc.length > 70 ? movDesc.substring(0, 67) + '...' : movDesc;
      doc.text(movDescClean, 75, y + 7.5);

      doc.setFont('Helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(COLORS.text);
      doc.text(formatDate(mov.date), 168, y + 5.5);
      
      y += 10;
    });
  }

  // Add Footers to all pages
  const totalPages = pageState.page;
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    drawPageFooter(doc, totalPages, i, office.officeName);
  }

  // Trigger browser download
  const cleanOfficeName = office.officeName.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 15);
  doc.save(`Relatorio_Executivo_${cleanOfficeName}_${new Date().toISOString().substring(0, 10)}.pdf`);
}

/**
 * EXPORT 2: EXPORT FILTERED PROCESS LIST AS A FORMAL REPORT PDF
 */
export async function generateProcessListPDF(
  processes: LegalProcess[],
  office: LawOfficeSettings,
  filterInfo?: {
    tagFilter: string | null;
    statusFilter: string | null;
    searchQuery: string;
  }
): Promise<void> {
  const doc = new jsPDF({
    orientation: 'landscape', // Landcape orientation is much better for tabular process reports!
    unit: 'mm',
    format: 'a4'
  });

  // Since landscape has different width (297mm) and height (210mm), let's override standard drawer helpers
  const pageState = { page: 1 };
  const reportTitle = "Relatório Geral de Processos e Andamentos Judiciais";

  const drawLandscapeHeader = (doc: jsPDF, pageNum: number) => {
    // Top Accent Bar
    doc.setFillColor(COLORS.primary);
    doc.rect(15, 12, 267, 2, 'F');

    // Office Name (Left side)
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(13);
    doc.setTextColor(COLORS.primary);
    doc.text(office.officeName.toUpperCase(), 15, 21);

    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(COLORS.secondary);
    const oabText = `OAB/${office.primaryLawyer.oabState} nº ${office.primaryLawyer.oabNumber} | Advogado: ${office.primaryLawyer.name}`;
    doc.text(oabText, 15, 25.5);
    const addressText = `${office.address.street}, ${office.address.number} - ${office.address.city}/${office.address.state}`;
    doc.text(addressText, 15, 29.5);

    // Right Side Metadata
    const today = new Date().toLocaleDateString('pt-BR');
    const nowTime = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    doc.text(`Data: ${today} - ${nowTime}`, 282, 21, { align: 'right' });
    doc.text(`Relatório de Monitoramento Ativo`, 282, 25.5, { align: 'right' });

    // Divider Line
    doc.setDrawColor(COLORS.border);
    doc.setLineWidth(0.3);
    doc.line(15, 32, 282, 32);

    // Report Title
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(10.5);
    doc.setTextColor(COLORS.accent);
    doc.text(reportTitle.toUpperCase(), 15, 38);

    doc.setFont('Helvetica', 'normal');
  };

  const drawLandscapeFooter = (doc: jsPDF, totalPages: number, pageNum: number) => {
    const y = 198;
    doc.setDrawColor(COLORS.border);
    doc.setLineWidth(0.3);
    doc.line(15, y - 4, 282, y - 4);

    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(COLORS.secondary);
    
    const systemText = `Gerado pelo Sistema Integrado de Gestão Jurídica - ${office.officeName}`;
    doc.text(systemText, 15, y);
    doc.text(`Confidencial - Documentação de Controle Interno`, 148, y, { align: 'center' });
    doc.text(`Página ${pageNum} de ${totalPages}`, 282, y, { align: 'right' });
  };

  const checkLandscapePageBreak = (doc: jsPDF, currentY: number, increment: number): number => {
    if (currentY + increment > 190) {
      doc.addPage();
      pageState.page += 1;
      drawLandscapeHeader(doc, pageState.page);
      return 45; // Y position reset below header
    }
    return currentY + increment;
  };

  // Draw Page 1 Header
  drawLandscapeHeader(doc, pageState.page);

  let y = 44;

  // 1. Filter and Summary Details Block
  doc.setFillColor(COLORS.background);
  doc.rect(15, y, 267, 12, 'F');
  doc.setDrawColor(COLORS.border);
  doc.setLineWidth(0.2);
  doc.rect(15, y, 267, 12, 'S');

  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(COLORS.primary);
  doc.text("RESUMO DO FILTRO:", 18, y + 7.5);

  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(COLORS.text);
  
  let filterDesc = `Total sob Filtro: ${processes.length} processos.`;
  if (filterInfo) {
    const tagsApplied = filterInfo.tagFilter ? `Etiqueta: ${filterInfo.tagFilter}` : 'Todas Etiquetas';
    const statusApplied = filterInfo.statusFilter ? `Status: ${filterInfo.statusFilter}` : 'Todos Status';
    const searchApplied = filterInfo.searchQuery ? `Termo de busca: "${filterInfo.searchQuery}"` : 'Sem busca textual';
    filterDesc += ` | Filtros Ativos [ ${tagsApplied} | ${statusApplied} | ${searchApplied} ]`;
  }
  doc.text(filterDesc, 50, y + 7.5);

  // Litigation Value Summary on the right
  const totalLitValue = processes.reduce((acc, p) => acc + (p.value || 0), 0);
  doc.setFont('Helvetica', 'bold');
  doc.text(`Patrimônio Líquido sob Litígio: ${formatCurrencyBRL(totalLitValue)}`, 279, y + 7.5, { align: 'right' });

  y += 17;

  // 2. Tabular List of Processes
  doc.setFillColor(COLORS.primary);
  doc.rect(15, y, 267, 7, 'F');
  
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(COLORS.white);
  
  // Landscape columns width mapping (total = 267mm)
  doc.text("Nº PROCESSO (CNJ)", 18, y + 4.5); // x: 18
  doc.text("AUTOR / ATIVO", 65, y + 4.5); // x: 65
  doc.text("RÉU / PASSIVO", 115, y + 4.5); // x: 115
  doc.text("TRIBUNAL & COMARCA", 165, y + 4.5); // x: 165
  doc.text("TIPO DE AÇÃO", 215, y + 4.5); // x: 215
  doc.text("VALOR CAUSA", 248, y + 4.5); // x: 248
  doc.text("STATUS", 268, y + 4.5); // x: 268

  y += 7;

  if (processes.length === 0) {
    doc.setFillColor(COLORS.white);
    doc.rect(15, y, 267, 10, 'F');
    doc.setDrawColor(COLORS.border);
    doc.rect(15, y, 267, 10, 'S');
    doc.setFont('Helvetica', 'italic');
    doc.setFontSize(8.5);
    doc.setTextColor(COLORS.secondary);
    doc.text("Nenhum processo cadastrado para atender aos critérios de filtro aplicados.", 148, y + 6.5, { align: 'center' });
  } else {
    processes.forEach((proc, idx) => {
      y = checkLandscapePageBreak(doc, y, 9);

      // Zebra striping
      doc.setFillColor(idx % 2 === 0 ? COLORS.background : COLORS.white);
      doc.rect(15, y, 267, 9, 'F');

      // Bottom border
      doc.setDrawColor(COLORS.border);
      doc.setLineWidth(0.2);
      doc.line(15, y + 9, 282, y + 9);

      // CNJ Number (bold mono style)
      doc.setFont('Helvetica-Bold', 'bold');
      doc.setFontSize(7);
      doc.setTextColor(COLORS.primary);
      doc.text(proc.cnjNumber, 18, y + 5.5);

      // Active Party / Client
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(7);
      doc.setTextColor(COLORS.text);
      const activePartyTrunc = proc.activeParty.length > 25 ? proc.activeParty.substring(0, 23) + '...' : proc.activeParty;
      doc.text(activePartyTrunc, 65, y + 5.5);

      // Passive Party
      doc.setFont('Helvetica', 'normal');
      doc.setFontSize(7);
      doc.setTextColor(COLORS.text);
      const passivePartyTrunc = proc.passiveParty.length > 25 ? proc.passiveParty.substring(0, 23) + '...' : proc.passiveParty;
      doc.text(passivePartyTrunc, 115, y + 5.5);

      // Court/Tribunal
      doc.setFont('Helvetica', 'normal');
      doc.setFontSize(6.5);
      doc.setTextColor(COLORS.secondary);
      const courtTrunc = proc.court.length > 28 ? proc.court.substring(0, 26) + '...' : proc.court;
      doc.text(courtTrunc, 165, y + 5.5);

      // Lawsuit Type
      doc.setFont('Helvetica', 'normal');
      doc.setFontSize(6.5);
      const lawsuitTypeTrunc = (proc.lawsuitType || 'Cível').length > 18 ? (proc.lawsuitType || 'Cível').substring(0, 16) + '...' : (proc.lawsuitType || 'Cível');
      doc.text(lawsuitTypeTrunc, 215, y + 5.5);

      // Cause Value
      doc.setFont('Helvetica', 'normal');
      doc.setFontSize(7);
      doc.setTextColor(COLORS.text);
      doc.text(formatCurrencyBRL(proc.value || 0), 248, y + 5.5);

      // Status Badge
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(7);
      if (proc.status === 'Ativo') {
        doc.setTextColor(COLORS.green);
        doc.text("ATIVO", 268, y + 5.5);
      } else if (proc.status === 'Sentenciado') {
        doc.setTextColor('#3b82f6'); // blue
        doc.text("SENTENCIADO", 268, y + 5.5);
      } else {
        doc.setTextColor(COLORS.secondary);
        doc.text(proc.status.toUpperCase(), 268, y + 5.5);
      }
      doc.setTextColor(COLORS.text); // Reset

      y += 9;
    });
  }

  // Draw footer on all pages
  const totalPages = pageState.page;
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    drawLandscapeFooter(doc, totalPages, i);
  }

  // Download PDF
  const cleanOfficeName = office.officeName.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 15);
  doc.save(`Lista_Processos_${cleanOfficeName}_${new Date().toISOString().substring(0, 10)}.pdf`);
}
