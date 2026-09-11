import React, { useState } from 'react';
import { 
  X, 
  Printer, 
  Copy, 
  Check, 
  Sparkles, 
  FileText, 
  Edit3, 
  Eye, 
  Download,
  ShieldCheck,
  Scale,
  FileCode,
  CheckCircle2
} from 'lucide-react';
import { LawOfficeSettings } from '../types';
import { downloadDocumentAsWordDocx } from '../utils/docxExportService';
import { formatDocumentToStandardTypography } from '../utils/documentGenerator';

interface PrintDocumentModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  documentText: string;
  office: LawOfficeSettings;
  documentType: string;
  clientName?: string;
  onSaveContent?: (content: string) => void;
}

export const PrintDocumentModal: React.FC<PrintDocumentModalProps> = ({
  isOpen,
  onClose,
  title,
  documentText,
  office,
  documentType,
  clientName,
  onSaveContent,
}) => {
  const [content, setContent] = useState(() => formatDocumentToStandardTypography(documentText));
  const [isEditing, setIsEditing] = useState(false);
  const [copied, setCopied] = useState(false);
  const [fontSize, setFontSize] = useState<'sm' | 'base' | 'lg'>('base');
  const [showLetterhead, setShowLetterhead] = useState(true);
  const [aiClausePrompt, setAiClausePrompt] = useState('');
  const [isGeneratingClause, setIsGeneratingClause] = useState(false);
  const [aiClauseResult, setAiClauseResult] = useState<string | null>(null);
  const [isDownloadingWord, setIsDownloadingWord] = useState(false);
  const [wordDownloaded, setWordDownloaded] = useState(false);

  // Signature States & Refs
  const canvasRef = React.useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [signatureImg, setSignatureImg] = useState<string | null>(null);
  const [hasDrawn, setHasDrawn] = useState(false);

  // Drawing helpers
  const getEventCoords = (
    e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>,
    canvas: HTMLCanvasElement
  ) => {
    const rect = canvas.getBoundingClientRect();
    if ('touches' in e) {
      if (e.touches.length === 0) return { x: 0, y: 0 };
      const touch = e.touches[0];
      return {
        x: touch.clientX - rect.left,
        y: touch.clientY - rect.top,
      };
    } else {
      return {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      };
    }
  };

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.strokeStyle = '#000000'; // Pure black ink
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    const coords = getEventCoords(e, canvas);
    ctx.beginPath();
    ctx.moveTo(coords.x, coords.y);
    setIsDrawing(true);
    setHasDrawn(true);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    if (e.cancelable) {
      e.preventDefault();
    }

    const coords = getEventCoords(e, canvas);
    ctx.lineTo(coords.x, coords.y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    if (isDrawing) {
      setIsDrawing(false);
      // Automatically update the preview image in real time as the client finishes drawing
      const canvas = canvasRef.current;
      if (canvas) {
        setSignatureImg(canvas.toDataURL('image/png'));
      }
    }
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setSignatureImg(null);
    setHasDrawn(false);
  };

  // Update content if prop changes
  React.useEffect(() => {
    setContent(formatDocumentToStandardTypography(documentText));
  }, [documentText]);

  if (!isOpen) return null;

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadWordDocx = async () => {
    try {
      setIsDownloadingWord(true);
      const formattedContent = formatDocumentToStandardTypography(content);
      const cleanFileName = `${title.replace(/[^a-zA-Z0-9\s_-]/g, '').trim()}_${clientName ? clientName.replace(/\s+/g, '_') : ''}`;
      await downloadDocumentAsWordDocx(title, formattedContent, office, cleanFileName);
      setWordDownloaded(true);
      setTimeout(() => setWordDownloaded(false), 3500);
    } catch (err) {
      console.error('Erro ao gerar arquivo Word:', err);
    } finally {
      setIsDownloadingWord(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(formatDocumentToStandardTypography(content));
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleGenerateClause = async () => {
    if (!aiClausePrompt.trim()) return;
    setIsGeneratingClause(true);
    setAiClauseResult(null);

    try {
      const response = await fetch('/api/gemini/generate-clause', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          documentType,
          clauseTopic: aiClausePrompt,
          clientName: clientName || 'CONTRATANTE',
          lawyerName: office.primaryLawyer.name,
        }),
      });

      const data = await response.json();
      if (data.clauseContent) {
        const fullClause = `\n\n### ${data.clauseTitle || 'CLÁUSULA ADICIONAL'}\n${data.clauseContent}\n*(${data.legalBasis || 'Dispositivo Legal'})*`;
        setAiClauseResult(fullClause);
      }
    } catch (err) {
      console.error('Erro ao gerar cláusula com IA:', err);
    } finally {
      setIsGeneratingClause(false);
    }
  };

  const handleInsertGeneratedClause = () => {
    if (aiClauseResult) {
      setContent((prev) => prev + '\n' + aiClauseResult);
      setAiClauseResult(null);
      setAiClausePrompt('');
      if (onSaveContent) onSaveContent(content + '\n' + aiClauseResult);
    }
  };

  const handleDownloadTxt = () => {
    const element = document.createElement('a');
    const file = new Blob([content], { type: 'text/plain;charset=utf-8' });
    element.href = URL.createObjectURL(file);
    element.download = `${title.replace(/[^a-zA-Z0-9]/g, '_')}.txt`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/80 backdrop-blur-sm flex justify-center p-2 sm:p-4 md:p-6">
      <div className="bg-slate-900 border border-slate-700 w-full max-w-5xl rounded-xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden">
        {/* Modal Header */}
        <div className="px-5 py-4 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3 bg-slate-950 no-print">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
                {title}
                <span className="text-xs px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-500/30 font-medium flex items-center gap-1">
                  <FileText className="w-3 h-3 text-blue-400" />
                  Formato Word (.docx) & A4
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Padrão Jurídico OAB / CPC 2015 • Compatível com Microsoft Word, Google Docs e LibreOffice
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => setIsEditing(!isEditing)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition cursor-pointer border ${
                isEditing
                  ? 'bg-amber-600 text-white border-amber-500'
                  : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
              }`}
            >
              {isEditing ? <Eye className="w-3.5 h-3.5" /> : <Edit3 className="w-3.5 h-3.5" />}
              {isEditing ? 'Visualizar Minuta' : 'Editar Texto'}
            </button>

            {/* Word (.docx) Button */}
            <button
              onClick={handleDownloadWordDocx}
              disabled={isDownloadingWord}
              className="px-3.5 py-1.5 rounded-lg text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white border border-blue-400/30 shadow-md shadow-blue-900/30 transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              title="Baixar arquivo Word (.docx) editável para abrir no Microsoft Word"
            >
              {wordDownloaded ? (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-300" />
                  <span>Word Baixado!</span>
                </>
              ) : (
                <>
                  <FileText className="w-3.5 h-3.5 text-blue-200" />
                  <span>{isDownloadingWord ? 'Gerando .docx...' : 'Abrir no Word (.docx)'}</span>
                </>
              )}
            </button>

            <button
              onClick={handleCopy}
              className="px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-800 text-slate-300 border border-slate-700 hover:bg-slate-700 transition flex items-center gap-1.5 cursor-pointer"
              title="Copiar texto formatado"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? 'Copiado!' : 'Copiar'}
            </button>

            <button
              onClick={handlePrint}
              className="px-3.5 py-1.5 rounded-lg text-xs font-bold bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 shadow-md shadow-amber-900/30 transition flex items-center gap-1.5 cursor-pointer"
              title="Imprimir documento ou salvar como PDF"
            >
              <Printer className="w-3.5 h-3.5" />
              Imprimir / PDF
            </button>

            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Toolbar controls (Screen only) */}
        <div className="px-5 py-2.5 bg-slate-800/60 border-b border-slate-800 flex flex-wrap items-center justify-between text-xs text-slate-300 gap-3 no-print">
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="checkbox"
                checked={showLetterhead}
                onChange={(e) => setShowLetterhead(e.target.checked)}
                className="rounded text-amber-500 focus:ring-amber-400 h-3.5 w-3.5 bg-slate-900 border-slate-700"
              />
              <span>Incluir Timbre do Escritório</span>
            </label>

            <div className="flex items-center gap-1.5">
              <span className="text-slate-400 font-medium">Fonte Arial:</span>
              <button
                onClick={() => setFontSize('sm')}
                className={`px-2 py-0.5 rounded text-xs transition cursor-pointer ${fontSize === 'sm' ? 'bg-amber-500 text-slate-950 font-bold shadow-sm' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'}`}
                title="Tamanho 12pt"
              >
                12pt
              </button>
              <button
                onClick={() => setFontSize('base')}
                className={`px-2.5 py-0.5 rounded text-xs transition cursor-pointer flex items-center gap-1 ${fontSize === 'base' ? 'bg-amber-500 text-slate-950 font-bold shadow-sm' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'}`}
                title="Tamanho 14pt (Padrão ABNT / Arial)"
              >
                <span>14pt (Padrão)</span>
              </button>
              <button
                onClick={() => setFontSize('lg')}
                className={`px-2 py-0.5 rounded text-xs transition cursor-pointer ${fontSize === 'lg' ? 'bg-amber-500 text-slate-950 font-bold shadow-sm' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'}`}
                title="Tamanho 16pt"
              >
                16pt
              </button>
            </div>
          </div>

          <div className="text-slate-400 text-right">
            Dica: No diálogo de impressão, selecione destino <strong>"Salvar como PDF"</strong> para gerar o arquivo assinado.
          </div>
        </div>

        {/* Modal Body & A4 Paper Container with Signature Sidebar */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-950 flex flex-col lg:flex-row justify-center gap-6">
          {/* Printable A4 Paper representation - Arial 14pt Justified */}
          <div
            className={`bg-white text-slate-900 shadow-2xl rounded-sm w-full max-w-[820px] transition-all border border-slate-200 ${
              fontSize === 'sm' ? 'text-xs' : fontSize === 'lg' ? 'text-base' : 'text-[14pt]'
            } p-8 sm:p-14 min-h-[1050px] flex flex-col justify-between legal-document-paper ${
              showLetterhead ? 'has-detailed-letterhead' : ''
            }`}
            style={{ 
              fontFamily: 'Arial, Helvetica, sans-serif', 
              fontSize: fontSize === 'sm' ? '12pt' : fontSize === 'lg' ? '16pt' : '14pt',
              lineHeight: '1.6',
              textAlign: 'justify',
              position: 'relative',
              overflow: 'hidden',
              ['--office-name' as any]: `"${(office.officeName || 'WONO ADVOCACIA').toUpperCase()}"`
            }}
          >
            {/* Elegant watermark background (Themis / Lady Justice / Balança da Justiça) */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none z-0 opacity-[0.035] print:opacity-[0.035]">
              <svg 
                viewBox="0 0 200 200" 
                className="w-[450px] h-[450px] sm:w-[500px] sm:h-[500px] text-slate-950" 
                fill="none" 
                stroke="currentColor" 
                strokeWidth="1.1"
              >
                {/* Circular crest lines */}
                <circle cx="100" cy="100" r="95" strokeWidth="0.5" strokeDasharray="3 3" />
                <circle cx="100" cy="100" r="88" strokeWidth="1" />
                <circle cx="100" cy="100" r="84" strokeWidth="0.5" />
                
                {/* Lady Justice (Thêmis) figure */}
                {/* Head */}
                <circle cx="100" cy="38" r="8" strokeWidth="1.5" />
                {/* Blindfold */}
                <path d="M92 38 L108 38" strokeWidth="2" strokeLinecap="round" />
                {/* Neck and shoulders */}
                <path d="M98 46 L102 46 M94 48 L106 48 M85 55 L115 55" strokeWidth="1.5" strokeLinecap="round" />
                {/* Gown / Dress */}
                <path d="M88 55 L75 145 L125 145 L112 55 Z" strokeWidth="1.5" strokeLinejoin="round" />
                {/* Gown folds */}
                <path d="M92 58 L85 140" strokeWidth="0.8" />
                <path d="M100 58 L100 142" strokeWidth="0.8" />
                <path d="M108 58 L115 140" strokeWidth="0.8" />
                
                {/* Right Arm holding scales */}
                <path d="M85 55 L55 50 L55 58" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                {/* Scale hanger */}
                <circle cx="55" cy="58" r="1.5" fill="currentColor" />
                <path d="M35 58 L75 58" strokeWidth="1.5" strokeLinecap="round" />
                {/* Left string & cup */}
                <path d="M35 58 L27 80 L43 80 Z" strokeWidth="0.8" />
                <path d="M25 80 L45 80" strokeWidth="1.5" />
                {/* Right string & cup */}
                <path d="M75 58 L67 80 L83 80 Z" strokeWidth="0.8" />
                <path d="M65 80 L85 80" strokeWidth="1.5" />

                {/* Left Arm holding sword pointing down */}
                <path d="M115 55 L140 70 L140 85" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                {/* Sword */}
                <path d="M140 82 L140 165" strokeWidth="2.5" strokeLinecap="round" />
                <path d="M134 88 L146 88" strokeWidth="2" strokeLinecap="round" />
                <path d="M140 82 L140 88" strokeWidth="2" />
                <circle cx="140" cy="167" r="1" fill="currentColor" />
                
                {/* Pedestal / Base */}
                <path d="M60 145 L140 145" strokeWidth="3" strokeLinecap="round" />
                <path d="M50 152 L150 152" strokeWidth="4" strokeLinecap="round" />
                <path d="M40 159 L160 159" strokeWidth="5" strokeLinecap="round" />
                
                {/* Decorative Sunburst Lines */}
                <path d="M100 12 L100 22" strokeWidth="0.5" />
                <path d="M172 100 L182 100" strokeWidth="0.5" />
                <path d="M18 100 L28 100" strokeWidth="0.5" strokeLinecap="round" />
              </svg>
            </div>

            <div className="relative z-10 w-full flex flex-col justify-between min-h-full">
              <div>
              {/* Official Office Letterhead / Timbre */}
              {showLetterhead && (
                <div className="border-b-2 border-slate-900 pb-4 mb-8 text-center" style={{ fontFamily: 'Arial, Helvetica, sans-serif' }}>
                  <div className="flex items-center justify-center gap-2 mb-1">
                    <Scale className="w-6 h-6 text-amber-700" />
                    <h1 className="font-bold text-[14pt] text-slate-900 tracking-wide uppercase">
                      {office.officeName}
                    </h1>
                  </div>
                  <p className="text-[10pt] text-slate-600 tracking-wide">
                    {office.officeBrandTagline}
                  </p>
                  <p className="text-[9pt] text-slate-600 mt-1">
                    {office.address.street}, {office.address.number}, {office.address.neighborhood} • {office.address.city}/{office.address.state} • CEP {office.address.zipCode} • Tel: {office.phone} • OAB/{office.primaryLawyer.oabState} nº {office.primaryLawyer.oabNumber}
                  </p>
                </div>
              )}

              {/* Document Text Body */}
              {isEditing ? (
                <div className="no-print">
                  <p className="text-xs text-amber-700 font-sans font-semibold mb-2">
                    Modo de Edição Direta: Você pode alterar qualquer trecho do documento abaixo.
                  </p>
                  <textarea
                    value={content}
                    onChange={(e) => {
                      setContent(e.target.value);
                      if (onSaveContent) onSaveContent(e.target.value);
                    }}
                    rows={26}
                    className="w-full p-4 border border-slate-300 rounded font-sans text-[14pt] bg-slate-50 text-slate-900 focus:ring-2 focus:ring-amber-500 focus:outline-none"
                    style={{ fontFamily: 'Arial, Helvetica, sans-serif' }}
                  />
                </div>
              ) : (
                <div className="whitespace-pre-wrap text-justify space-y-4" style={{ fontFamily: 'Arial, Helvetica, sans-serif' }}>
                  {content.split('\n\n').map((paragraph, idx) => {
                    const cleanP = paragraph.trim();
                    if (!cleanP) return null;

                    // Main Title: # TITLE (Bold only in title, Arial 14pt, Caixa Alta)
                    if (cleanP.startsWith('# ')) {
                      return (
                        <h2 key={idx} className="text-center font-bold text-[14pt] uppercase tracking-wider text-slate-950 border-b-2 border-slate-800 pb-2 mb-6" style={{ fontFamily: 'Arial, Helvetica, sans-serif' }}>
                          {cleanP.replace('# ', '').replace(/\*\*/g, '').toUpperCase()}
                        </h2>
                      );
                    }
                    // Section Title: ### SECTION (Bold section titles, Arial 14pt, Caixa Alta)
                    if (cleanP.startsWith('### ') || cleanP.startsWith('## ')) {
                      return (
                        <h3 key={idx} className="font-bold text-[14pt] uppercase text-slate-950 mt-5 mb-2 text-left" style={{ fontFamily: 'Arial, Helvetica, sans-serif' }}>
                          {cleanP.replace(/^###?\s+/, '').replace(/\*\*/g, '').toUpperCase()}
                        </h3>
                      );
                    }
                    // Horizontal separator
                    if (cleanP === '---') {
                      return <hr key={idx} className="border-slate-300 my-4" />;
                    }
                    // Signatures block
                    if (cleanP.includes('________') || cleanP.includes('Outorgante') || cleanP.includes('CONTRATANTE') || cleanP.includes('CONTRATADO') || cleanP.includes('TESTEMUNHAS:')) {
                      const lines = cleanP.split('\n');
                      const isClientSignatureParagraph = cleanP.toLowerCase().includes('outorgante') || 
                                                         cleanP.toLowerCase().includes('contratante') || 
                                                         cleanP.toLowerCase().includes('declarante') || 
                                                         cleanP.toLowerCase().includes('substabelecente');
                      return (
                        <div key={idx} className="my-6 space-y-1">
                          {lines.map((l, lIdx) => {
                            const isUnderline = l.includes('_____');
                            const isCenter = isUnderline || l.includes('CONTRATANTE') || l.includes('CONTRATADO') || l.includes('Outorgante') || l.includes('Declarante') || l.includes('Substabelecente');
                            const plainLine = l.replace(/<br\s*\/?>/gi, '').replace(/\*\*/g, '').trim();
                            return (
                              <div key={lIdx} className="relative flex flex-col items-center">
                                {isUnderline && isClientSignatureParagraph && signatureImg && (
                                  <div className="absolute -top-11 h-16 w-48 flex items-center justify-center pointer-events-none">
                                    <img 
                                      src={signatureImg} 
                                      alt="Assinatura Eletrônica" 
                                      className="h-16 object-contain mix-blend-multiply" 
                                    />
                                  </div>
                                )}
                                <p 
                                  className={`${isCenter ? 'text-center' : 'text-left'} font-normal text-[14pt] text-slate-900 ${isUnderline ? 'pt-4' : ''}`}
                                  style={{ fontFamily: 'Arial, Helvetica, sans-serif' }}
                                >
                                  {plainLine}
                                </p>
                              </div>
                            );
                          })}
                        </div>
                      );
                    }

                    // Standard Paragraph: Regular unbolded text, justified alignment, Arial 14pt
                    const strippedText = cleanP.replace(/<br\s*\/?>/gi, ' ').replace(/\*\*/g, '');
                    return (
                      <p 
                        key={idx} 
                        className="text-slate-900 font-normal text-[14pt] leading-relaxed text-justify"
                        style={{ fontFamily: 'Arial, Helvetica, sans-serif', textAlign: 'justify', textJustify: 'inter-word' }}
                      >
                        {strippedText}
                      </p>
                    );
                  })}
                </div>
              )}

              {/* Lawyer Formal Signature Block */}
              <div className="mt-16 mb-4 flex flex-col items-center justify-center text-center select-none" style={{ fontFamily: 'Arial, Helvetica, sans-serif' }}>
                <div className="w-72 border-t border-slate-900 mb-2"></div>
                <p className="font-bold text-[14pt] text-slate-950 uppercase leading-normal">
                  {office.primaryLawyer.name}
                </p>
                <p className="font-normal text-[14pt] text-slate-700">
                  Advogado • OAB/{office.primaryLawyer.oabState} nº {office.primaryLawyer.oabNumber}
                </p>
              </div>
            </div>

            {/* Document Footer with Official Digital Seal */}
            <div className="mt-12 pt-3 border-t border-slate-300 flex flex-col md:flex-row items-center justify-between gap-4 text-left" style={{ fontFamily: 'Arial, Helvetica, sans-serif' }}>
              {showLetterhead ? (
                <div className="text-[9pt] text-slate-500 max-w-[70%]">
                  Documento emitido eletronicamente por {office.officeName} • CNPJ: {office.cnpj} • Todos os direitos reservados.
                </div>
              ) : (
                <div />
              )}
              
              {/* Official Digital Seal (Selo Digital Oficial) */}
              <div className="flex items-center gap-2 pointer-events-none opacity-90 select-none print:opacity-100 shrink-0 self-end">
                <div className="text-[6pt] text-slate-500 text-right font-mono flex flex-col justify-center leading-tight">
                  <span className="font-bold">SELO DIGITAL</span>
                  <span>ID: {`WONO-BR-${String(office.primaryLawyer.oabNumber)}-${new Date().getFullYear()}`}</span>
                  <span className="text-[5pt]">VALIDADO VIA CNJ/DATAJUD</span>
                </div>
                <svg
                  viewBox="0 0 100 100"
                  className="w-14 h-14 text-slate-700"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.2"
                >
                  {/* Concentric decorative circles */}
                  <circle cx="50" cy="50" r="46" strokeDasharray="3 2" strokeWidth="1" />
                  <circle cx="50" cy="50" r="42" strokeWidth="1.5" />
                  <circle cx="50" cy="50" r="38" strokeWidth="0.8" strokeDasharray="1 1" />
                  
                  {/* Balance of Justice icon in center */}
                  <path d="M50 30 L50 70 M38 42 L62 42 M38 42 L33 58 L43 58 Z M62 42 L57 58 L67 58 Z" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
                  <circle cx="50" cy="30" r="1.5" fill="currentColor" />
                  <path d="M42 70 L58 70" strokeWidth="2.5" strokeLinecap="round" />

                  {/* Curving text simulated inside circular seal */}
                  <circle cx="50" cy="50" r="28" strokeWidth="0.5" strokeDasharray="2 2" />
                </svg>
              </div>
            </div>
            </div>
          </div>

          {/* Interactive Digital Manual Signature Pad Sidebar (Screen Only) */}
          <div className="w-full lg:w-80 shrink-0 no-print space-y-4">
            <div className="bg-slate-900 border border-slate-800 p-5 rounded-xl shadow-lg space-y-4 text-xs">
              <div className="flex items-center gap-2 border-b border-slate-800 pb-2.5">
                <Edit3 className="w-4 h-4 text-amber-400" />
                <h4 className="font-bold text-slate-100 text-sm">Assinatura Manual do Cliente</h4>
              </div>
              
              <p className="text-slate-400 leading-relaxed text-[11px]">
                Solicite que o cliente desenhe a assinatura dele diretamente no retângulo abaixo com o mouse ou tela touch do celular/tablet antes da impressão ou download.
              </p>

              {/* Drawing Canvas Area */}
              <div className="relative bg-white border border-slate-700 rounded-lg overflow-hidden h-36 flex flex-col justify-between">
                <canvas
                  ref={canvasRef}
                  width={320}
                  height={144}
                  onMouseDown={startDrawing}
                  onMouseMove={draw}
                  onMouseUp={stopDrawing}
                  onMouseLeave={stopDrawing}
                  onTouchStart={startDrawing}
                  onTouchMove={draw}
                  onTouchEnd={stopDrawing}
                  className="w-full h-full cursor-crosshair touch-none bg-white"
                />
                {!hasDrawn && (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none text-[11px] text-slate-400 font-sans italic select-none">
                    Assine aqui...
                  </div>
                )}
              </div>

              {/* Canvas Controls */}
              <div className="flex items-center justify-between gap-2 pt-1">
                <button
                  type="button"
                  onClick={clearCanvas}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium rounded-lg transition cursor-pointer"
                >
                  Limpar Traço
                </button>
                <div className="text-[10px] text-slate-500 font-sans italic">
                  {signatureImg ? 'Assinado ✓' : 'Aguardando desenho'}
                </div>
              </div>

              {/* Professional Notice */}
              <div className="bg-slate-950/60 p-3 rounded-lg border border-slate-800 space-y-1.5 text-[10.5px]">
                <span className="font-semibold text-emerald-400 block">✓ Integração no Documento</span>
                <p className="text-slate-400 leading-normal">
                  A assinatura manual é projetada em tempo real com transparência sobre a linha de assinatura do <strong>Outorgante / Contratante</strong> na visualização.
                </p>
                <span className="font-semibold text-blue-400 block pt-1">✓ Salvando PDF Assinado</span>
                <p className="text-slate-400 leading-normal">
                  Ao clicar em <strong>"Imprimir / PDF"</strong>, a assinatura manuscrita aparecerá em seu respectivo local, pronta para ser impressa ou salva em formato PDF oficial do sistema.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* AI Clause Generator Drawer (Screen only) */}
        <div className="p-4 bg-slate-900 border-t border-slate-800 no-print">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-xs font-semibold text-amber-300">
              <Sparkles className="w-4 h-4 text-amber-400" />
              <span>Adicionar Cláusula Personalizada com IA Jurídica:</span>
            </div>
            <div className="flex-1 w-full flex items-center gap-2">
              <input
                type="text"
                value={aiClausePrompt}
                onChange={(e) => setAiClausePrompt(e.target.value)}
                placeholder="Ex: Cláusula de mediação obrigatória antes do ajuizamento, ou retenção de 30% em precatório..."
                className="flex-1 px-3 py-1.5 text-xs bg-slate-950 border border-slate-700 rounded-lg text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-500"
                onKeyDown={(e) => e.key === 'Enter' && handleGenerateClause()}
              />
              <button
                onClick={handleGenerateClause}
                disabled={isGeneratingClause || !aiClausePrompt.trim()}
                className="px-3 py-1.5 bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-slate-950 font-bold text-xs rounded-lg transition flex items-center gap-1 cursor-pointer whitespace-nowrap"
              >
                <Sparkles className="w-3.5 h-3.5" />
                {isGeneratingClause ? 'Minutando...' : 'Gerar Cláusula'}
              </button>
            </div>
          </div>

          {/* AI generated clause preview box */}
          {aiClauseResult && (
            <div className="mt-3 p-3 bg-slate-950 border border-amber-500/40 rounded-lg text-xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-amber-400 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  Sugestão de Minuta Gerada pela IA:
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleInsertGeneratedClause}
                    className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded font-bold text-xs flex items-center gap-1 cursor-pointer"
                  >
                    <Check className="w-3 h-3" />
                    Inserir no Documento
                  </button>
                  <button
                    onClick={() => setAiClauseResult(null)}
                    className="text-slate-400 hover:text-slate-200 text-xs"
                  >
                    Descartar
                  </button>
                </div>
              </div>
              <p className="text-slate-200 whitespace-pre-wrap font-mono text-[11px] bg-slate-900 p-2.5 rounded border border-slate-800">
                {aiClauseResult}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
