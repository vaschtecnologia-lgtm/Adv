import React, { useState, useMemo, useEffect } from 'react';
import {
  Calculator,
  Scale,
  DollarSign,
  Copy,
  Check,
  Info,
  AlertTriangle,
  FileText,
  ChevronRight,
  HelpCircle
} from 'lucide-react';
import { LegalProcess } from '../types';
import { formatCurrencyBRL } from '../utils/documentGenerator';

interface CourtCostsCalculatorProps {
  processes: LegalProcess[];
  officeName?: string;
}

type CourtPreset = 'tjsp' | 'tjrj' | 'tjmg' | 'trf3' | 'trt2' | 'custom';

export const CourtCostsCalculator: React.FC<CourtCostsCalculatorProps> = ({
  processes,
  officeName = 'WONO ADVOCACIA'
}) => {
  // Input States
  const [selectedProcessId, setSelectedProcessId] = useState<string>('');
  const [valorCausa, setValorCausa] = useState<number>(50000);
  const [courtPreset, setCourtPreset] = useState<CourtPreset>('tjsp');
  const [numReus, setNumReus] = useState<number>(1);
  const [serviceMethod, setServiceMethod] = useState<'postal' | 'oficial' | 'none'>('postal');
  const [hasJusticeGratuita, setHasJusticeGratuita] = useState<boolean>(false);
  
  // Custom Preset States
  const [customInitialPercent, setCustomInitialPercent] = useState<number>(1);
  const [customInitialMin, setCustomInitialMin] = useState<number>(150);
  const [customInitialMax, setCustomInitialMax] = useState<number>(50000);
  const [customAppealPercent, setCustomAppealPercent] = useState<number>(4);
  const [customAppealMin, setCustomAppealMin] = useState<number>(150);
  const [customAppealMax, setCustomAppealMax] = useState<number>(50000);

  // Success copy feedback
  const [isCopied, setIsCopied] = useState<boolean>(false);

  // Auto-fill from selected process
  useEffect(() => {
    if (selectedProcessId) {
      const proc = processes.find(p => p.id === selectedProcessId);
      if (proc) {
        setValorCausa(proc.value || 0);
        // Deduce preset from court text
        const courtLower = proc.court.toLowerCase();
        if (courtLower.includes('tjsp')) {
          setCourtPreset('tjsp');
        } else if (courtLower.includes('tjrj')) {
          setCourtPreset('tjrj');
        } else if (courtLower.includes('tjmg')) {
          setCourtPreset('tjmg');
        } else if (courtLower.includes('trf3') || courtLower.includes('trf')) {
          setCourtPreset('trf3');
        } else if (courtLower.includes('trt') || courtLower.includes('trabalho')) {
          setCourtPreset('trt2');
        } else {
          setCourtPreset('custom');
        }
      }
    }
  }, [selectedProcessId, processes]);

  // Calculations Logic based on state presets
  const calculations = useMemo(() => {
    let initialFee = 0;
    let appealFee = 0;
    let mandateFee = 0;
    let serviceFee = 0;
    
    let initialFormula = '';
    let appealFormula = '';
    let mandateFormula = '';
    let serviceFormula = '';

    const ufespValue = 35.36; // SP unit for 2026 reference

    switch (courtPreset) {
      case 'tjsp':
        // TJSP: 1% of valorCausa. Min 5 UFESP (176.80), Max 3000 UFESP (106080)
        const tjspRawInit = valorCausa * 0.01;
        const tjspMinInit = 5 * ufespValue;
        const tjspMaxInit = 3000 * ufespValue;
        initialFee = Math.max(tjspMinInit, Math.min(tjspMaxInit, tjspRawInit));
        initialFormula = `1% do valor da causa (Mín. 5 UFESPs [${formatCurrencyBRL(tjspMinInit)}] e Máx. 3000 UFESPs [${formatCurrencyBRL(tjspMaxInit)}])`;

        // Appeal Preparo: 4% of valorCausa. Min 5 UFESP, Max 3000 UFESP
        const tjspRawAppeal = valorCausa * 0.04;
        appealFee = Math.max(tjspMinInit, Math.min(tjspMaxInit, tjspRawAppeal));
        appealFormula = `4% do valor da causa (Mín. 5 UFESPs [${formatCurrencyBRL(tjspMinInit)}] e Máx. 3000 UFESPs [${formatCurrencyBRL(tjspMaxInit)}])`;

        // Mandate: OAB mandate fee is R$ 33.00
        mandateFee = 33.00;
        mandateFormula = 'Taxa de Mandato Judicial (Carteira OAB - Lei Estadual)';

        // Service of process fees
        if (serviceMethod === 'postal') {
          serviceFee = numReus * 32.10;
          serviceFormula = `${numReus}x Carta AR Unificada Digital (R$ 32,10 cada)`;
        } else if (serviceMethod === 'oficial') {
          serviceFee = numReus * 99.00;
          serviceFormula = `${numReus}x Condução de Oficial de Justiça (R$ 99,00 cada)`;
        }
        break;

      case 'tjrj':
        // TJRJ: ~3% base combination of judicial tax (2%) plus civil funds (caixas) and surcharges
        const tjrjRawInit = valorCausa * 0.03;
        initialFee = Math.max(350.00, Math.min(80000.00, tjrjRawInit));
        initialFormula = 'Taxa Judiciária + Custas da Escrivania unificadas (~3% do valor da causa; Mín. R$ 350,00)';

        // Appeal (Preparo): 3% of cause value
        appealFee = Math.max(400.00, Math.min(50000.00, valorCausa * 0.03));
        appealFormula = 'Preparo de Apelação unificado (~3% do valor da causa; Mín. R$ 400,00)';

        // Mandate
        mandateFee = 25.00;
        mandateFormula = 'Taxa de Procuração / Distribuidor TJRJ';

        // Service
        if (serviceMethod === 'postal') {
          serviceFee = numReus * 28.00;
          serviceFormula = `${numReus}x Despesa Postal AR TJRJ (R$ 28,00 cada)`;
        } else if (serviceMethod === 'oficial') {
          serviceFee = numReus * 85.00;
          serviceFormula = `${numReus}x Diligência de Oficial de Justiça TJRJ (R$ 85,00 cada)`;
        }
        break;

      case 'tjmg':
        // TJmg: 1.5% average
        initialFee = Math.max(120.00, Math.min(40000.00, valorCausa * 0.015));
        initialFormula = 'Tabela progressiva TJMG (~1.5% do valor da causa; Mín. R$ 120,00)';

        // Appeal: fixed administrative preparo
        appealFee = 350.00;
        appealFormula = 'Preparo recursal integral fixo administrativo';

        mandateFee = 15.00;
        mandateFormula = 'Taxa de mandato / Prev. Social OAB MG';

        if (serviceMethod === 'postal') {
          serviceFee = numReus * 26.00;
          serviceFormula = `${numReus}x Envio Postal AR TJMG (R$ 26,00 cada)`;
        } else if (serviceMethod === 'oficial') {
          serviceFee = numReus * 90.00;
          serviceFormula = `${numReus}x Verba de Oficial de Justiça TJMG (R$ 90,00 cada)`;
        }
        break;

      case 'trf3':
        // TRF3 (Federal Regional SP/MS): 0.5% value. Min R$ 10.64, Max R$ 1,915.38 (Federal courts have low fixed caps)
        const trfRawInit = valorCausa * 0.005;
        initialFee = Math.max(10.64, Math.min(1915.38, trfRawInit));
        initialFormula = '0.5% do valor da causa (Mín. R$ 10,64 e Máx. R$ 1.915,38)';

        // Appeal
        appealFee = Math.max(10.64, Math.min(1915.38, valorCausa * 0.005));
        appealFormula = 'Preparo recursal de 0.5% (Mín. R$ 10,64 e Máx. R$ 1.915,38)';

        mandateFee = 0;
        mandateFormula = 'Isento de taxa de mandato judicial federal';

        if (serviceMethod === 'postal') {
          serviceFee = numReus * 22.00;
          serviceFormula = `${numReus}x Despesa AR Justiça Federal (R$ 22,00 cada)`;
        } else if (serviceMethod === 'oficial') {
          serviceFee = numReus * 75.00;
          serviceFormula = `${numReus}x Diligência de Oficial de Justiça Federal (R$ 75,00 cada)`;
        }
        break;

      case 'trt2':
        // TRT2 (Labor SP): 2% under CLT. Min R$ 10.64, Max R$ 4,000.00
        const trtRawInit = valorCausa * 0.02;
        initialFee = Math.max(10.64, Math.min(4000.00, trtRawInit));
        initialFormula = '2% do valor da causa - Art. 789 da CLT (Mín. R$ 10,64 e Máx. R$ 4.000,00)';

        // Appeal is Depósito Recursal (fixed cap guarantee)
        // Recurso Ordinário deposit limit in 2026 is around R$ 13,202.62, or up to the full amount of cause/sentence
        appealFee = Math.min(13202.62, valorCausa);
        appealFormula = 'Depósito Recursal de Recurso Ordinário (Garantia de Juízo - CLT Teto R$ 13.202,62)';

        mandateFee = 0;
        mandateFormula = 'Isento';

        serviceFee = 0;
        serviceFormula = 'Notificações trabalhistas são realizadas ex-officio e sem custos das partes';
        break;

      case 'custom':
      default:
        // Custom Formulas
        const customRawInit = valorCausa * (customInitialPercent / 100);
        initialFee = Math.max(customInitialMin, Math.min(customInitialMax, customRawInit));
        initialFormula = `${customInitialPercent}% do valor da causa (Mín. ${formatCurrencyBRL(customInitialMin)} / Máx. ${formatCurrencyBRL(customInitialMax)})`;

        const customRawAppeal = valorCausa * (customAppealPercent / 100);
        appealFee = Math.max(customAppealMin, Math.min(customAppealMax, customRawAppeal));
        appealFormula = `${customAppealPercent}% do valor da causa (Mín. ${formatCurrencyBRL(customAppealMin)} / Máx. ${formatCurrencyBRL(customAppealMax)})`;

        mandateFee = 30.00;
        mandateFormula = 'Taxa de Mandato Personalizada';

        if (serviceMethod === 'postal') {
          serviceFee = numReus * 30.00;
          serviceFormula = `${numReus}x Postal personalizado (R$ 30,00 cada)`;
        } else if (serviceMethod === 'oficial') {
          serviceFee = numReus * 95.00;
          serviceFormula = `${numReus}x Diligência personalizada (R$ 95,00 cada)`;
        }
        break;
    }

    // Totals
    const subtotalJudicial = initialFee + mandateFee + serviceFee;
    const totalWithAppeal = subtotalJudicial + appealFee;

    // Estimated opposing fees (sucumbência) - usually 10% to 20%
    const estSucumbencia = valorCausa * 0.10; // estimate 10% by default

    return {
      initialFee,
      appealFee,
      mandateFee,
      serviceFee,
      subtotalJudicial,
      totalWithAppeal,
      estSucumbencia,
      initialFormula,
      appealFormula,
      mandateFormula,
      serviceFormula
    };
  }, [
    courtPreset,
    valorCausa,
    numReus,
    serviceMethod,
    customInitialPercent,
    customInitialMin,
    customInitialMax,
    customAppealPercent,
    customAppealMin,
    customAppealMax
  ]);

  // Copy estimate text to clipboard
  const handleCopyCalculationReport = () => {
    const presetNames: Record<CourtPreset, string> = {
      tjsp: 'TJSP - Tribunal de Justiça de São Paulo',
      tjrj: 'TJRJ - Tribunal de Justiça do Rio de Janeiro',
      tjmg: 'TJMG - Tribunal de Justiça de Minas Gerais',
      trf3: 'TRF3 - Tribunal Regional Federal da 3ª Região',
      trt2: 'TRT2 - Tribunal Regional do Trabalho da 2ª Região',
      custom: 'Fórmula de Custas Personalizada'
    };

    const justiceText = hasJusticeGratuita 
      ? `\n[ATENÇÃO: Requerido Benefício de Justiça Gratuita]\nO cliente é beneficiário de Justiça Gratuita, portanto a exigibilidade das custas e despesas judiciais fica SUSPENSA, nos termos do art. 98, § 3º do CPC.\n`
      : '';

    const report = `=========================================================
MEMÓRIA DE CÁLCULO - ESTIMATIVA DE CUSTAS JUDICIAIS
ESCRITÓRIO: ${officeName}
=========================================================
Tribunal de Referência: ${presetNames[courtPreset]}
Valor da Causa (Atribuição): ${formatCurrencyBRL(valorCausa)}
Número de Réus para Citação: ${numReus}

---------------------------------------------------------
DETALHAMENTO DE CUSTAS PARA AJUIZAMENTO (PÓLO ATIVO):
---------------------------------------------------------
1. Custas Iniciais de Distribuição : ${formatCurrencyBRL(calculations.initialFee)}
   Formula: ${calculations.initialFormula}

2. Taxa de Mandato Judicial (OAB)  : ${formatCurrencyBRL(calculations.mandateFee)}
   Formula: ${calculations.mandateFormula}

3. Despesas de Citação das Partes  : ${formatCurrencyBRL(calculations.serviceFee)}
   Formula: ${calculations.serviceFormula}

---------------------------------------------------------
SUBTOTAL (Custas para Entrar com a Ação): ${formatCurrencyBRL(calculations.subtotalJudicial)}
---------------------------------------------------------

4. Custas de Preparo (Recurso/Apelação): ${formatCurrencyBRL(calculations.appealFee)}
   Formula: ${calculations.appealFormula}

---------------------------------------------------------
VALOR ESTIMADO TOTAL (Com Fase Recursal): ${formatCurrencyBRL(calculations.totalWithAppeal)}
=========================================================
* Estimativa de Honorários de Sucumbência (Risco de sucumbência se perder o processo): ~10% [${formatCurrencyBRL(calculations.estSucumbencia)}]${justiceText}
* Esta é uma estimativa aproximada com base no regimento de custas atualizado do respectivo tribunal. Valores exatos constarão nas guias (DARE/GRERJ/GRU) emitidas no ajuizamento.
=========================================================`;

    navigator.clipboard.writeText(report);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2500);
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-lg space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <h2 className="text-lg font-black text-slate-100 flex items-center gap-2">
            <Calculator className="w-5 h-5 text-amber-400" />
            Simulador de Custas & Riscos Processuais
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Calcule e preveja despesas de ajuizamento, taxas de mandato, preparo recursal e riscos de sucumbência para novos casos.
          </p>
        </div>

        {/* Process dropdown selector */}
        <div className="flex items-center gap-2">
          <label className="text-xs font-semibold text-slate-400 whitespace-nowrap">Vincular Processo:</label>
          <select
            value={selectedProcessId}
            onChange={(e) => setSelectedProcessId(e.target.value)}
            className="px-3 py-1.5 bg-slate-950 border border-slate-700 rounded-xl text-xs text-slate-300 focus:outline-none focus:border-amber-500 cursor-pointer"
          >
            <option value="">-- Preencher Manualmente --</option>
            {processes.map(p => (
              <option key={p.id} value={p.id}>
                {p.cnjNumber} - {p.activeParty.split(' ')[0]} vs {p.passiveParty.split(' ')[0]}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Settings Column */}
        <div className="lg:col-span-5 space-y-5 bg-slate-950/40 p-4 rounded-xl border border-slate-800">
          <h3 className="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
            Parâmetros do Processo
          </h3>

          <div className="space-y-4 text-xs">
            {/* Value (Valor da Causa) */}
            <div className="space-y-1.5">
              <label className="block text-slate-300 font-medium">Valor da Causa (R$):</label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-bold text-slate-500">R$</span>
                <input
                  type="number"
                  value={valorCausa}
                  onChange={(e) => setValorCausa(Math.max(0, Number(e.target.value)))}
                  placeholder="0,00"
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-sm font-semibold text-slate-100 placeholder-slate-600 focus:outline-none focus:border-amber-500"
                />
              </div>
              <p className="text-[10px] text-slate-500">Valor atribuído à causa como base para cálculo judicial.</p>
            </div>

            {/* Tribunal Preset Selector */}
            <div className="space-y-1.5">
              <label className="block text-slate-300 font-medium">Regimento do Tribunal / Competência:</label>
              <select
                value={courtPreset}
                onChange={(e) => setCourtPreset(e.target.value as CourtPreset)}
                className="w-full px-3 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-xs text-slate-300 focus:outline-none focus:border-amber-500 cursor-pointer"
              >
                <option value="tjsp">TJSP - Tribunal de Justiça de São Paulo</option>
                <option value="tjrj">TJRJ - Tribunal de Justiça do Rio de Janeiro</option>
                <option value="tjmg">TJMG - Tribunal de Justiça de Minas Gerais</option>
                <option value="trf3">TRF3 - Tribunal Regional Federal da 3ª Região</option>
                <option value="trt2">TRT2 - Tribunal Regional do Trabalho (CLT)</option>
                <option value="custom">Fórmula Customizada...</option>
              </select>
            </div>

            {/* If Custom selected, show custom percentile inputs */}
            {courtPreset === 'custom' && (
              <div className="p-3 bg-slate-900 border border-slate-800 rounded-xl space-y-3 animate-fade-in">
                <span className="font-bold text-[10px] text-amber-400 block uppercase">Configurar Fórmula de Custas</span>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <div>
                    <label className="text-[10px] text-slate-400 block">Iniciais %</label>
                    <input
                      type="number"
                      step="0.1"
                      value={customInitialPercent}
                      onChange={(e) => setCustomInitialPercent(Number(e.target.value))}
                      className="w-full px-2 py-1 bg-slate-950 border border-slate-700 rounded-lg text-xs"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-400 block">Iniciais Mín (R$)</label>
                    <input
                      type="number"
                      value={customInitialMin}
                      onChange={(e) => setCustomInitialMin(Number(e.target.value))}
                      className="w-full px-2 py-1 bg-slate-950 border border-slate-700 rounded-lg text-xs"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-400 block">Iniciais Máx (R$)</label>
                    <input
                      type="number"
                      value={customInitialMax}
                      onChange={(e) => setCustomInitialMax(Number(e.target.value))}
                      className="w-full px-2 py-1 bg-slate-950 border border-slate-700 rounded-lg text-xs"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <div>
                    <label className="text-[10px] text-slate-400 block">Preparo %</label>
                    <input
                      type="number"
                      step="0.1"
                      value={customAppealPercent}
                      onChange={(e) => setCustomAppealPercent(Number(e.target.value))}
                      className="w-full px-2 py-1 bg-slate-950 border border-slate-700 rounded-lg text-xs"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-400 block">Preparo Mín (R$)</label>
                    <input
                      type="number"
                      value={customAppealMin}
                      onChange={(e) => setCustomAppealMin(Number(e.target.value))}
                      className="w-full px-2 py-1 bg-slate-950 border border-slate-700 rounded-lg text-xs"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-400 block">Preparo Máx (R$)</label>
                    <input
                      type="number"
                      value={customAppealMax}
                      onChange={(e) => setCustomAppealMax(Number(e.target.value))}
                      className="w-full px-2 py-1 bg-slate-950 border border-slate-700 rounded-lg text-xs"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Notification and party configs */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="block text-slate-300 font-medium">Réus (Quantidade):</label>
                <input
                  type="number"
                  min="0"
                  value={numReus}
                  onChange={(e) => setNumReus(Math.max(0, Number(e.target.value)))}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-slate-100"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-slate-300 font-medium">Método de Citação:</label>
                <select
                  value={serviceMethod}
                  onChange={(e) => setServiceMethod(e.target.value as any)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-slate-300 cursor-pointer"
                >
                  <option value="postal">Carta AR (Correios)</option>
                  <option value="oficial">Oficial de Justiça</option>
                  <option value="none">Isento / Sem Custas</option>
                </select>
              </div>
            </div>

            {/* Is Justice Gratuita client */}
            <div className="pt-2 border-t border-slate-800">
              <label className="flex items-center gap-2.5 p-3.5 bg-slate-950 rounded-xl border border-slate-800 cursor-pointer hover:border-slate-700 transition">
                <input
                  type="checkbox"
                  checked={hasJusticeGratuita}
                  onChange={(e) => setHasJusticeGratuita(e.target.checked)}
                  className="w-4 h-4 rounded text-amber-500 bg-slate-900 border-slate-700 focus:ring-amber-500"
                />
                <div>
                  <span className="block font-bold text-slate-200 text-xs">Requer Justiça Gratuita?</span>
                  <span className="block text-[10px] text-slate-400 mt-0.5">Isenta o cliente do pagamento de custas (Lei nº 1.060/50 e CPC).</span>
                </div>
              </label>
            </div>
          </div>
        </div>

        {/* Results Columns */}
        <div className="lg:col-span-7 space-y-5">
          <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5 space-y-4 shadow-inner">
            <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center justify-between">
              <span>Resultado & Desmembramento Estimado</span>
              <span className="text-[10px] font-mono text-slate-500 font-normal">Valores em BRL (R$)</span>
            </h3>

            {/* Calculations items listing */}
            <div className="space-y-3.5 text-xs">
              <div className="flex items-center justify-between p-3 bg-slate-900/60 rounded-xl border border-slate-800/60">
                <div>
                  <span className="font-bold text-slate-200 block">1. Custas Iniciais de Distribuição</span>
                  <span className="text-[10px] text-slate-400 block mt-0.5 font-mono">{calculations.initialFormula}</span>
                </div>
                <span className={`font-black text-slate-100 ${hasJusticeGratuita ? 'line-through text-slate-500' : ''}`}>
                  {formatCurrencyBRL(calculations.initialFee)}
                </span>
              </div>

              <div className="flex items-center justify-between p-3 bg-slate-900/60 rounded-xl border border-slate-800/60">
                <div>
                  <span className="font-bold text-slate-200 block">2. Taxas de Mandato / Procuração</span>
                  <span className="text-[10px] text-slate-400 block mt-0.5">{calculations.mandateFormula}</span>
                </div>
                <span className={`font-black text-slate-100 ${hasJusticeGratuita ? 'line-through text-slate-500' : ''}`}>
                  {formatCurrencyBRL(calculations.mandateFee)}
                </span>
              </div>

              <div className="flex items-center justify-between p-3 bg-slate-900/60 rounded-xl border border-slate-800/60">
                <div>
                  <span className="font-bold text-slate-200 block">3. Despesas de Citação / Oficiais</span>
                  <span className="text-[10px] text-slate-400 block mt-0.5">{calculations.serviceFormula}</span>
                </div>
                <span className={`font-black text-slate-100 ${hasJusticeGratuita ? 'line-through text-slate-500' : ''}`}>
                  {formatCurrencyBRL(calculations.serviceFee)}
                </span>
              </div>

              <div className="pt-2 border-t border-slate-800 flex items-center justify-between">
                <span className="font-extrabold text-slate-300 text-sm">SUBTOTAL (Ajuizamento Inicial):</span>
                <span className={`text-base font-black ${hasJusticeGratuita ? 'text-slate-400 line-through' : 'text-amber-400'}`}>
                  {formatCurrencyBRL(calculations.subtotalJudicial)}
                </span>
              </div>

              <div className="flex items-center justify-between p-3 bg-slate-900/60 rounded-xl border border-slate-800/60 mt-3">
                <div>
                  <span className="font-bold text-slate-200 block">4. Preparo de Apelação (Fase Recursal)</span>
                  <span className="text-[10px] text-slate-400 block mt-0.5 font-mono">{calculations.appealFormula}</span>
                </div>
                <span className={`font-black text-slate-100 ${hasJusticeGratuita ? 'line-through text-slate-500' : ''}`}>
                  {formatCurrencyBRL(calculations.appealFee)}
                </span>
              </div>

              <div className="pt-3 border-t border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-slate-900/40 p-4 rounded-xl border border-slate-800/60">
                <div>
                  <span className="text-xs font-black text-slate-300 block">CUSTO JUDICIAL TOTAL ESTIMADO:</span>
                  <span className="text-[10px] text-slate-500 block mt-0.5">Considerando todo o rito de primeiro e segundo grau</span>
                </div>
                <div className="text-right">
                  {hasJusticeGratuita ? (
                    <div className="space-y-0.5">
                      <span className="text-xs font-extrabold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20 block text-center sm:text-right">R$ 0,00 (Gratuidade)</span>
                      <span className="text-[10px] text-slate-500 block line-through">{formatCurrencyBRL(calculations.totalWithAppeal)}</span>
                    </div>
                  ) : (
                    <span className="text-lg sm:text-xl font-black text-emerald-400">
                      {formatCurrencyBRL(calculations.totalWithAppeal)}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Gratuidade Banner if activated */}
            {hasJusticeGratuita && (
              <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 rounded-xl flex items-start gap-2.5 text-xs animate-fade-in">
                <Info className="w-4 h-4 mt-0.5 flex-shrink-0 text-emerald-400" />
                <p className="leading-relaxed">
                  <strong>Exigibilidade Suspensa (Justiça Gratuita):</strong> Conforme art. 98, §3º do CPC, as obrigações decorrentes de sua sucumbência ficarão sob condição suspensiva de exigibilidade e somente poderão ser executadas se, nos 5 anos subsequentes, credor demonstrar que deixou de existir a situação de insuficiência de recursos.
                </p>
              </div>
            )}

            {/* Risco de Sucumbencia block */}
            <div className="p-4 bg-slate-900/80 border border-slate-800 rounded-xl space-y-2 text-xs">
              <h4 className="font-bold text-rose-400 flex items-center gap-1.5 text-xs uppercase">
                <AlertTriangle className="w-4 h-4 text-rose-500" /> Risco Processual de Sucumbência (CPC, Art. 85)
              </h4>
              <p className="text-slate-400 text-[11px] leading-relaxed">
                Em caso de perda total do processo (rejeição integral dos pedidos), o autor poderá ser condenado a pagar honorários de sucumbência ao patrono da parte contrária, fixados normalmente entre <strong>10% e 20%</strong> sobre o valor da causa ou proveito econômico.
              </p>
              <div className="pt-1.5 flex items-center justify-between border-t border-slate-800/80 text-[11px]">
                <span className="text-slate-300 font-medium">Honorários Sucumbenciais Estimados (~10%):</span>
                <span className="font-extrabold text-rose-400 font-mono">{formatCurrencyBRL(calculations.estSucumbencia)}</span>
              </div>
            </div>

            {/* Actions: Export report */}
            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                onClick={handleCopyCalculationReport}
                className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold rounded-xl text-xs flex items-center gap-1.5 cursor-pointer transition shadow shadow-amber-500/20 whitespace-nowrap"
              >
                {isCopied ? (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    Copiado para Área de Transferência!
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    Copiar Memória de Cálculo
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
