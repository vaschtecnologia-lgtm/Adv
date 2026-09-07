import { 
  Document, 
  Packer, 
  Paragraph, 
  TextRun, 
  AlignmentType, 
  HeadingLevel, 
  BorderStyle, 
  Table, 
  TableRow, 
  TableCell, 
  WidthType, 
  convertInchesToTwip,
  Header,
  Footer,
  PageNumber,
  NumberFormat
} from 'docx';
import { LawOfficeSettings, Client, DocumentPowers, ContractFeeOptions } from '../types';
import { 
  generateProcuracaoText, 
  generateContratoHonorariosText, 
  generateDeclaracaoHipossuficienciaText, 
  generateSubstabelecimentoText, 
  generateReciboHonorariosText,
  formatDateExtenso,
  formatCurrencyBRL
} from './documentGenerator';

/**
 * Parses text into docx TextRuns with Arial font and 14pt size (size 28 in half-points)
 * Bold is only applied if explicitly forced or on headings; body text defaults to bold: false
 */
function parseTextToTextRuns(
  text: string, 
  defaultFontSize: number = 28, 
  defaultFont: string = 'Arial',
  allowBold: boolean = false
): TextRun[] {
  const runs: TextRun[] = [];
  // Clean tags like <br/>
  const cleanText = text.replace(/<br\s*\/?>/gi, ' ');
  
  if (!allowBold) {
    // Strip markdown bold markers and return clean regular text
    const stripped = cleanText.replace(/\*\*/g, '').replace(/\*/g, '');
    runs.push(
      new TextRun({
        text: stripped,
        bold: false,
        font: defaultFont,
        size: defaultFontSize,
        color: '000000',
      })
    );
    return runs;
  }

  // If bold is allowed (e.g. titles)
  const parts = cleanText.split(/(\*\*.*?\*\*|\*.*?\*)/g);
  for (const part of parts) {
    if (!part) continue;

    if (part.startsWith('**') && part.endsWith('**')) {
      const boldText = part.slice(2, -2);
      runs.push(
        new TextRun({
          text: boldText,
          bold: true,
          font: defaultFont,
          size: defaultFontSize,
          color: '000000',
        })
      );
    } else {
      runs.push(
        new TextRun({
          text: part,
          bold: false,
          font: defaultFont,
          size: defaultFontSize,
          color: '000000',
        })
      );
    }
  }

  return runs;
}

/**
 * Core function that builds a complete Microsoft Word (.docx) Document with Arial 14pt, Justified text and Bold only on Titles
 */
export async function createWordDocumentBlob(
  title: string,
  markdownContent: string,
  office: LawOfficeSettings,
  includeLetterhead: boolean = true
): Promise<Blob> {
  const paragraphs: Paragraph[] = [];
  const primaryFont = 'Arial';
  const fontSize14pt = 28; // 14pt in docx half-points

  // 1. Office Letterhead / Timbre in Arial
  if (includeLetterhead) {
    paragraphs.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 60 },
        children: [
          new TextRun({
            text: office.officeName.toUpperCase(),
            bold: true,
            size: fontSize14pt, // 14pt
            color: '000000',
            font: primaryFont,
          }),
        ],
      })
    );

    if (office.officeBrandTagline) {
      paragraphs.push(
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 60 },
          children: [
            new TextRun({
              text: office.officeBrandTagline,
              italics: true,
              size: 20, // 10pt
              color: '475569',
              font: primaryFont,
            }),
          ],
        })
      );
    }

    paragraphs.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 240 },
        border: {
          bottom: {
            color: '334155',
            space: 4,
            style: BorderStyle.SINGLE,
            size: 12,
          },
        },
        children: [
          new TextRun({
            text: `${office.address.street}, ${office.address.number}${office.address.complement ? ` - ${office.address.complement}` : ''} • ${office.address.city}/${office.address.state} • CEP ${office.address.zipCode} | Tel: ${office.phone} | OAB/${office.primaryLawyer.oabState} ${office.primaryLawyer.oabNumber}`,
            size: 18, // 9pt
            color: '334155',
            font: primaryFont,
          }),
        ],
      })
    );
  }

  // 2. Parse Markdown paragraphs into docx Paragraphs
  const rawParagraphs = markdownContent.split('\n\n');

  for (const raw of rawParagraphs) {
    const trimmed = raw.trim();
    if (!trimmed) continue;

    // Divider line
    if (trimmed === '---') {
      paragraphs.push(
        new Paragraph({
          spacing: { before: 120, after: 120 },
          border: {
            bottom: {
              color: 'CBD5E1',
              space: 1,
              style: BorderStyle.SINGLE,
              size: 6,
            },
          },
          children: [],
        })
      );
      continue;
    }

    // Main Heading 1: # TITLE (Bold only in title, Arial 14pt / size 28)
    if (trimmed.startsWith('# ')) {
      const headingText = trimmed.replace(/^#\s+/, '').replace(/\*\*/g, '');
      paragraphs.push(
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { before: 240, after: 200 },
          heading: HeadingLevel.HEADING_1,
          children: [
            new TextRun({
              text: headingText.toUpperCase(),
              bold: true, // NEGRITO APENAS NO TITULO
              size: fontSize14pt, // Fonte Arial 14
              color: '000000',
              font: primaryFont,
            }),
          ],
        })
      );
      continue;
    }

    // Sub Heading 2 or 3: ### SECTION (Bold section titles, Arial 14pt / size 28)
    if (trimmed.startsWith('### ') || trimmed.startsWith('## ')) {
      const headingText = trimmed.replace(/^###?\s+/, '').replace(/\*\*/g, '');
      paragraphs.push(
        new Paragraph({
          alignment: AlignmentType.LEFT,
          spacing: { before: 200, after: 100 },
          heading: HeadingLevel.HEADING_2,
          children: [
            new TextRun({
              text: headingText.toUpperCase(),
              bold: true, // NEGRITO NO TITULO DA SEÇÃO
              size: fontSize14pt, // Fonte Arial 14
              color: '000000',
              font: primaryFont,
            }),
          ],
        })
      );
      continue;
    }

    // Signature Block Detection (e.g., contains underlines ____________)
    if (trimmed.includes('________') || trimmed.includes('Outorgante') || trimmed.includes('CONTRATANTE') || trimmed.includes('CONTRATADO') || trimmed.includes('TESTEMUNHAS:')) {
      const lines = trimmed.split('\n');
      for (const line of lines) {
        const isUnderline = line.includes('_____');
        const isCenter = isUnderline || line.includes('CONTRATANTE') || line.includes('CONTRATADO') || line.includes('Outorgante') || line.includes('Declarante') || line.includes('Substabelecente');
        const cleanLine = line.replace(/<br\s*\/?>/gi, '').replace(/\*\*/g, '').trim();
        
        paragraphs.push(
          new Paragraph({
            alignment: isCenter ? AlignmentType.CENTER : AlignmentType.LEFT,
            spacing: { before: isUnderline ? 280 : 40, after: 40 },
            children: [
              new TextRun({
                text: cleanLine,
                bold: false, // Regular, unbolded
                size: fontSize14pt, // Arial 14
                font: primaryFont,
                color: '000000',
              }),
            ],
          })
        );
      }
      continue;
    }

    // Standard Body Paragraph: strictly JUSTIFIED, Arial 14pt, NO bold (bold only on titles)
    paragraphs.push(
      new Paragraph({
        alignment: AlignmentType.JUSTIFIED, // TEXTO JUSTIFICADO
        spacing: {
          line: 360, // 1.5x entrelinhas ABNT
          after: 180,
        },
        children: parseTextToTextRuns(trimmed, fontSize14pt, primaryFont, false),
      })
    );
  }

  // 3. Document Footer Notice
  paragraphs.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 360, after: 60 },
      border: {
        top: {
          color: 'CBD5E1',
          space: 3,
          style: BorderStyle.SINGLE,
          size: 6,
        },
      },
      children: [
        new TextRun({
          text: `Documento emitido eletronicamente por ${office.officeName} • CNPJ: ${office.cnpj}`,
          size: 18, // 9pt
          color: '64748B',
          font: primaryFont,
          italics: true,
        }),
      ],
    })
  );

  // 4. Construct docx Document with A4 page margins and Arial 14 default
  const doc = new Document({
    title,
    creator: office.primaryLawyer.name,
    description: `Documento Jurídico gerado por ${office.officeName}`,
    styles: {
      default: {
        document: {
          run: {
            font: primaryFont,
            size: fontSize14pt, // Arial 14pt
            color: '000000',
            bold: false,
          },
          paragraph: {
            alignment: AlignmentType.JUSTIFIED,
            spacing: { line: 360, after: 180 },
          },
        },
      },
    },
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: convertInchesToTwip(1.0), // ~2.54 cm
              right: convertInchesToTwip(0.9), // ~2.3 cm
              bottom: convertInchesToTwip(1.0), // ~2.54 cm
              left: convertInchesToTwip(1.1), // ~2.8 cm
            },
          },
        },
        footers: {
          default: new Footer({
            children: [
              new Paragraph({
                alignment: AlignmentType.RIGHT,
                children: [
                  new TextRun({
                    text: 'Página ',
                    size: 18,
                    color: '64748B',
                    font: primaryFont,
                  }),
                  new TextRun({
                    children: [PageNumber.CURRENT],
                    size: 18,
                    color: '64748B',
                    font: primaryFont,
                  }),
                  new TextRun({
                    text: ' de ',
                    size: 18,
                    color: '64748B',
                    font: primaryFont,
                  }),
                  new TextRun({
                    children: [PageNumber.TOTAL_PAGES],
                    size: 18,
                    color: '64748B',
                    font: primaryFont,
                  }),
                ],
              }),
            ],
          }),
        },
        children: paragraphs,
      },
    ],
  });

  return await Packer.toBlob(doc);
}

/**
 * Triggers direct browser download of the Word (.docx) file
 */
export async function downloadDocumentAsWordDocx(
  title: string,
  markdownContent: string,
  office: LawOfficeSettings,
  fileName?: string
): Promise<void> {
  const blob = await createWordDocumentBlob(title, markdownContent, office, true);
  const cleanFileName = (fileName || `${title.replace(/[^a-zA-Z0-9\s_-]/g, '').trim()}`) + '.docx';

  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = cleanFileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(link.href);
}

/**
 * Direct exporter for Procuração
 */
export async function downloadProcuracaoWordDocx(
  client: Client,
  office: LawOfficeSettings,
  powers: DocumentPowers,
  subject?: string
): Promise<void> {
  const text = generateProcuracaoText(client, office, powers, subject);
  const title = `Procuracao_Ad_Judicia_${client.name.replace(/\s+/g, '_')}`;
  await downloadDocumentAsWordDocx('PROCURAÇÃO "AD JUDICIA ET EXTRA"', text, office, title);
}

/**
 * Direct exporter for Contrato de Honorários
 */
export async function downloadContratoHonorariosWordDocx(
  client: Client,
  office: LawOfficeSettings,
  fees: ContractFeeOptions,
  subject?: string
): Promise<void> {
  const text = generateContratoHonorariosText(client, office, fees, subject);
  const title = `Contrato_Honorarios_${client.name.replace(/\s+/g, '_')}`;
  await downloadDocumentAsWordDocx('CONTRATO DE PRESTAÇÃO DE SERVIÇOS ADVOCATÍCIOS', text, office, title);
}

/**
 * Direct exporter for Declaração de Hipossuficiência (Gratuidade da Justiça)
 */
export async function downloadDeclaracaoHipossuficienciaWordDocx(
  client: Client,
  office: LawOfficeSettings
): Promise<void> {
  const text = generateDeclaracaoHipossuficienciaText(client, office);
  const title = `Declaracao_Hipossuficiencia_${client.name.replace(/\s+/g, '_')}`;
  await downloadDocumentAsWordDocx('DECLARAÇÃO DE HIPOSSUFICIÊNCIA ECONÔMICA', text, office, title);
}

/**
 * Direct exporter for Substabelecimento
 */
export async function downloadSubstabelecimentoWordDocx(
  office: LawOfficeSettings,
  substabelecido: { name: string; oabNumber: string; oabState: string; cpf?: string },
  processNumber?: string,
  withReserve: boolean = true
): Promise<void> {
  const text = generateSubstabelecimentoText(office, substabelecido, processNumber, withReserve);
  const title = `Substabelecimento_${substabelecido.name.replace(/\s+/g, '_')}`;
  await downloadDocumentAsWordDocx('TERMO DE SUBSTABELECIMENTO', text, office, title);
}

/**
 * Direct exporter for Recibo de Honorários
 */
export async function downloadReciboHonorariosWordDocx(
  client: Client,
  office: LawOfficeSettings,
  value: number,
  reference: string
): Promise<void> {
  const text = generateReciboHonorariosText(client, office, value, reference);
  const title = `Recibo_Honorarios_${client.name.replace(/\s+/g, '_')}_${value}`;
  await downloadDocumentAsWordDocx('RECIBO DE PAGAMENTO DE HONORÁRIOS ADVOCATÍCIOS', text, office, title);
}
