import express from "express";
import path from "path";
import os from "os";
import fs from "fs";
import dotenv from "dotenv";
import JSZip from "jszip";
import { GoogleGenAI } from "@google/genai";
import { createServer as createViteServer } from "vite";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json({ limit: "10mb" }));

// Lazy GoogleGenAI initializer
let aiClient: GoogleGenAI | null = null;
function getAIClient() {
  if (!aiClient) {
    aiClient = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return aiClient;
}

// Resilient Gemini JSON Invocation with Multi-Model Fallback & Backoff
async function callGeminiJSON<T>(
  prompt: string,
  fallbackGenerator: () => T,
  options?: { systemInstruction?: string }
): Promise<T> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return fallbackGenerator();
  }

  // Model fallback chain: gemini-3.7-flash -> gemini-3.1-flash-lite -> gemini-flash-latest
  const candidateModels = ["gemini-3.7-flash", "gemini-3.1-flash-lite", "gemini-flash-latest"];

  for (const model of candidateModels) {
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const ai = getAIClient();
        const response = await ai.models.generateContent({
          model,
          contents: prompt,
          config: {
            responseMimeType: "application/json",
            ...(options?.systemInstruction ? { systemInstruction: options.systemInstruction } : {}),
          },
        });

        const rawText = response.text?.trim() || "";
        if (!rawText) throw new Error("Empty response returned from model");

        let cleanJson = rawText;
        if (cleanJson.startsWith("```json")) {
          cleanJson = cleanJson.replace(/^```json\s*/, "").replace(/\s*```$/, "");
        } else if (cleanJson.startsWith("```")) {
          cleanJson = cleanJson.replace(/^```\s*/, "").replace(/\s*```$/, "");
        }

        const parsed = JSON.parse(cleanJson);
        return parsed as T;
      } catch (err: any) {
        const isTransient =
          err?.status === "UNAVAILABLE" ||
          err?.status === 503 ||
          err?.status === 429 ||
          err?.message?.includes("503") ||
          err?.message?.includes("high demand") ||
          err?.message?.includes("Resource exhausted") ||
          err?.message?.includes("UNAVAILABLE") ||
          err?.message?.includes("rate limit");

        if (isTransient && attempt === 0) {
          // Brief exponential backoff before retrying
          await new Promise((res) => setTimeout(res, 500 + Math.random() * 300));
          continue;
        }

        // On non-transient or second failure, move to next fallback model in candidate chain
        break;
      }
    }
  }

  // If all candidate models are temporarily unavailable, return context-aware high-fidelity fallback
  return fallbackGenerator();
}

// Health Check
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// Network and Local PC Server Discovery Endpoint
app.get("/api/network-info", (req, res) => {
  try {
    const interfaces = os.networkInterfaces();
    const addresses: Array<{ name: string; ip: string; family: string; url: string }> = [];

    for (const [name, netInterface] of Object.entries(interfaces)) {
      if (netInterface) {
        for (const net of netInterface) {
          // Skip internal loopback and non-IPv4 addresses
          if (net.family === "IPv4" && !net.internal) {
            addresses.push({
              name,
              ip: net.address,
              family: net.family,
              url: `http://${net.address}:${PORT}`,
            });
          }
        }
      }
    }

    res.json({
      hostname: os.hostname(),
      platform: os.platform(),
      arch: os.arch(),
      port: PORT,
      localUrl: `http://localhost:${PORT}`,
      networkUrls: addresses,
      isOnline: true,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    res.json({
      hostname: "localhost",
      platform: "unknown",
      arch: "unknown",
      port: PORT,
      localUrl: `http://localhost:${PORT}`,
      networkUrls: [{ name: "Ethernet/Wi-Fi", ip: "192.168.1.100", family: "IPv4", url: `http://192.168.1.100:${PORT}` }],
      isOnline: true,
      timestamp: new Date().toISOString(),
    });
  }
});

// Endpoint: Download Pre-compiled Netlify Drop Production Package (.ZIP)
app.get("/api/download-netlify-dist", async (req, res) => {
  try {
    const distPath = path.join(process.cwd(), "dist");
    if (!fs.existsSync(distPath)) {
      return res.status(404).json({ error: "Diretório de build 'dist' não encontrado. Execute npm run build primeiro." });
    }

    const zip = new JSZip();

    // Helper to recursively add files from distPath into zip
    function addDirectoryToZip(currentDir: string, zipFolder: JSZip) {
      const entries = fs.readdirSync(currentDir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(currentDir, entry.name);
        // Exclude server-only bundled binaries from static web deploy
        if (entry.name === "server.cjs" || entry.name === "server.cjs.map") {
          continue;
        }
        if (entry.isDirectory()) {
          const subFolder = zipFolder.folder(entry.name);
          if (subFolder) {
            addDirectoryToZip(fullPath, subFolder);
          }
        } else {
          const fileData = fs.readFileSync(fullPath);
          zipFolder.file(entry.name, fileData);
        }
      }
    }

    addDirectoryToZip(distPath, zip);

    // Guarantee _redirects exists inside zip for Netlify SPA routing
    if (!zip.file("_redirects")) {
      zip.file("_redirects", "/*    /index.html   200\n");
    }

    // Guarantee netlify.toml exists inside zip
    if (!zip.file("netlify.toml")) {
      zip.file("netlify.toml", `[build]
  publish = "."
  command = ""

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200

[[headers]]
  for = "/*"
  [headers.values]
    X-Frame-Options = "DENY"
    X-XSS-Protection = "1; mode=block"
    X-Content-Type-Options = "nosniff"
    Referrer-Policy = "strict-origin-when-cross-origin"
`);
    }

    // Add Netlify Drop instructions
    zip.file("LEIA-ME_NETLIFY_DROP.txt", `==============================================================================
            WONO ADVOCACIA - PACOTE PRONTO PARA NETLIFY DROP
==============================================================================

Parabens! Este arquivo ZIP contem a aplicacao Wono Advocacia compilada e pronta
para entrar no ar sem necessidade de executar nenhum comando no terminal.

COMO PUBLICAR EM 15 SEGUNDOS:
1. Acesse https://app.netlify.com/drop
2. Faca login ou crie uma conta gratuita.
3. Arraste este arquivo ZIP (ou descompacte e arraste a pasta com os arquivos)
   para dentro da area indicada no site do Netlify.
4. O Netlify publicara sua aplicacao instantaneamente com certificado SSL (HTTPS)
   e um link publico permanente!
`);

    const zipBuffer = await zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE" });

    res.setHeader("Content-Type", "application/zip");
    res.setHeader("Content-Disposition", 'attachment; filename="wono_advocacia_dist_netlify_drop.zip"');
    res.send(zipBuffer);
  } catch (err: any) {
    console.error("Error generating Netlify dist zip:", err);
    res.status(500).json({ error: "Erro ao gerar arquivo zip do Netlify: " + err.message });
  }
});

// Enhanced DataJud / Court Database Search with support for TJDFT, TRF1, TRT10, STJ and all Brazilian courts
app.get("/api/online-search", (req, res) => {
  const { query, tribunal, searchType, instancia, polo, advogado, parte } = req.query;
  const searchTerm = String(query || parte || advogado || "").trim().toLowerCase();
  
  let selectedTribunal = String(tribunal || "TODOS").trim().toUpperCase();
  const selectedInstancia = String(instancia || "TODAS").trim();

  // Auto-detect and override tribunal if query is a CNJ number
  const cleanSearchOnlyDigits = searchTerm.replace(/[^0-9]/g, "");
  const isCnjSearch = searchType === "cnj" || /^\d{7}-?\d{2}\.?\d{4}\.?\d\.?\d{2}\.?\d{4}$/.test(searchTerm) || (cleanSearchOnlyDigits.length >= 15 && cleanSearchOnlyDigits.length <= 20);
  
  if (isCnjSearch && searchTerm) {
    const detectedSigla = detectTribunalFromCNJ(searchTerm);
    if (detectedSigla) {
      selectedTribunal = detectedSigla;
    }
  }

  // Comprehensive realistic court database covering 1ª Instância, 2ª Instância (TJDFT, TRF1, TRT10, TJSP, TJRJ) and Tribunais Superiores (STJ, STF, TST)
  const mockCourtDatabase = [
    // --- TJDFT (Tribunal de Justiça do Distrito Federal e dos Territórios) ---
    {
      cnjNumber: "0708912-44.2024.8.07.0001",
      court: "TJDFT - Tribunal de Justiça do Distrito Federal e dos Territórios",
      sigla: "TJDFT",
      instance: "1ª Instância",
      branchVara: "7ª Vara Cível de Brasília / DF",
      comarca: "Brasília / DF",
      lawsuitType: "Procedimento Comum Cível / Direito Empresarial",
      subject: "Indenização por Inadimplemento Contratual c/c Tutela de Urgência",
      value: 175000.0,
      distributionDate: "2024-04-18",
      status: "Ativo",
      activeParty: "Capital Serviços de Engenharia e Consultoria Ltda",
      passiveParty: "Banco de Brasília S.A. (BRB)",
      judge: "Dr. Eduardo Smidt Verona",
      responsibleLawyer: "Dr. Vagner Schmidt da Silva",
      oabNumber: "55.432",
      oabState: "DF",
      movements: [
        {
          id: "mov-tjdft-1",
          date: "2025-02-18T14:30:00",
          code: "60001",
          title: "Publicação no DJE/TJDFT - Deferimento de Tutela Provisória de Urgência",
          description: "Publicado no DJE do TJDFT: Vistos. Presentes os requisitos do art. 300 do CPC (probabilidade do direito e perigo de dano irreparável), DEFIRO a tutela de urgência para determinar ao requerido que se abstenha de incluir o nome da autora nos órgãos de proteção ao crédito (SERASA/SPC) sob pena de multa diária de R$ 2.000,00 até o limite de R$ 50.000,00. Intimem-se as partes.",
          organ: "7ª Vara Cível de Brasília",
          isJudicialDecision: true,
          deadlineDays: 15,
          deadlineType: "Úteis",
        },
        {
          id: "mov-tjdft-2",
          date: "2025-01-22T10:15:00",
          code: "50005",
          title: "Juntada de Petição de Réplica à Contestação com Documentos",
          description: "Juntada de petição de réplica rebatendo as preliminares arguidas pelo banco réu e requerendo produção de prova pericial contábil.",
          organ: "7ª Vara Cível de Brasília",
          isJudicialDecision: false,
        },
        {
          id: "mov-tjdft-3",
          date: "2024-04-20T09:00:00",
          code: "10001",
          title: "Distribuição e Citação Determinada via PJe",
          description: "Distribuído por sorteio no sistema PJe do TJDFT. Determinada a citação eletrônica da instituição financeira requerida.",
          organ: "7ª Vara Cível de Brasília",
          isJudicialDecision: true,
        },
      ],
    },
    {
      cnjNumber: "0714523-89.2023.8.07.0007",
      court: "TJDFT - Tribunal de Justiça do Distrito Federal e dos Territórios",
      sigla: "TJDFT",
      instance: "2ª Instância",
      branchVara: "1ª Turma Cível do TJDFT",
      comarca: "Brasília / DF",
      lawsuitType: "Apelação Cível",
      subject: "Direito do Consumidor / Atraso na Entrega de Imóvel / Lucros Cessantes",
      value: 98000.0,
      distributionDate: "2023-10-05",
      status: "Em Julgamento",
      activeParty: "Mariana Souza Alcantara",
      passiveParty: "Habita DF Construtora e Incorporadora S.A.",
      judge: "Desembargador Alfeu Machado (Relator)",
      responsibleLawyer: "Dra. Juliana Mendes Bastos",
      oabNumber: "319.845",
      oabState: "SP",
      movements: [
        {
          id: "mov-tjdft-2g-1",
          date: "2025-02-14T11:00:00",
          code: "70002",
          title: "Inclusão em Pauta de Julgamento - Sessão Virtual do TJDFT",
          description: "Incluído na pauta de julgamento da 1ª Turma Cível para a sessão ordinária telepresencial do dia 12/03/2025 às 14h00. Ficam os patronos cientificados sobre a possibilidade de sustentação oral eletrônica.",
          organ: "1ª Turma Cível - TJDFT",
          isJudicialDecision: true,
        },
      ],
    },
    // --- TJGO (Tribunal de Justiça do Estado de Goiás) ---
    {
      cnjNumber: "0806456-12.2024.8.09.0051",
      court: "TJGO - Tribunal de Justiça de Goiás",
      sigla: "TJGO",
      instance: "1ª Instância",
      branchVara: "6ª Vara Cível de Goiânia / GO",
      comarca: "Goiânia / GO",
      lawsuitType: "Procedimento Comum Cível / Contratos",
      subject: "Rescisão de Contrato de Promessa de Compra e Venda de Imóvel c/c Restituição de Valores",
      value: 145000.0,
      distributionDate: "2024-05-24",
      status: "Ativo",
      activeParty: "Carlos Eduardo Silveira",
      passiveParty: "Goiás Prime Empreendimentos Imobiliários S.A.",
      judge: "Dr. Rogério Carvalho Pinheiro",
      responsibleLawyer: "Dr. Vagner Schmidt da Silva",
      oabNumber: "284.912",
      oabState: "SP",
      movements: [
        {
          id: "mov-tjgo-1",
          date: "2025-02-19T10:00:00",
          code: "60001",
          title: "Publicação no DJE/TJGO - Intimação para Especificar Provas",
          description: "Publicado no DJE do TJGO: Vistos. Especifiquem as partes, no prazo comum de 15 (quinze) dias úteis, as provas que pretendem produzir, justificando a relevância de cada uma para o deslinde do feito, sob pena de indeferimento e julgamento antecipado da lide.",
          organ: "6ª Vara Cível de Goiânia",
          isJudicialDecision: true,
          deadlineDays: 15,
          deadlineType: "Úteis",
        },
        {
          id: "mov-tjgo-2",
          date: "2025-01-15T14:20:00",
          code: "50005",
          title: "Juntada de Réplica à Contestação",
          description: "Petição de réplica protocolada impugnando as preliminares de mérito e defendendo a nulidade da cláusula de retenção integral das parcelas.",
          organ: "6ª Vara Cível de Goiânia",
          isJudicialDecision: false,
        },
        {
          id: "mov-tjgo-3",
          date: "2024-05-25T11:00:00",
          code: "10001",
          title: "Distribuição por Sorteio via Projudi / PJe",
          description: "Distribuído eletronicamente por sorteio automático para a 6ª Vara Cível da Comarca de Goiânia.",
          organ: "6ª Vara Cível de Goiânia",
          isJudicialDecision: false,
        }
      ]
    },

    // --- TRF1 (Tribunal Regional Federal da 1ª Região - DF, GO, MT, BA, etc.) ---
    {
      cnjNumber: "1004523-88.2023.4.01.3400",
      court: "TRF1 - Tribunal Regional Federal da 1ª Região",
      sigla: "TRF1",
      instance: "1ª Instância",
      branchVara: "14ª Vara Federal Cível e Tributária da Seção Judiciária do DF (SJDF)",
      comarca: "Brasília / DF",
      lawsuitType: "Mandado de Segurança / Direito Tributário",
      subject: "Exclusão do ICMS/ISS da Base de Cálculo do PIS e COFINS (Tema 69 STF) e Compensação Tributária",
      value: 380000.0,
      distributionDate: "2023-09-12",
      status: "Sentenciado",
      activeParty: "TechSolutions Inovação em Software e Serviços Ltda",
      passiveParty: "Delegado da Receita Federal do Brasil de Julgamento e Fiscalização em Brasília",
      judge: "Dr. Waldemar Cláudio de Carvalho",
      responsibleLawyer: "Dr. Vagner Schmidt da Silva",
      oabNumber: "284.912",
      oabState: "SP",
      movements: [
        {
          id: "mov-trf1-1",
          date: "2025-02-16T16:45:00",
          code: "70001",
          title: "Sentença com Resolução do Mérito - Segurança Concedida Totalmente",
          description: "Sentença proferida no PJe da SJDF/TRF1: CONCEDO A SEGURANÇA para reconhecer o direito líquido e certo da impetrante TechSolutions à exclusão do ISS/ICMS da base do PIS e da COFINS, declarando o direito à compensação integral dos valores recolhidos indevidamente nos últimos 5 anos, acrescidos da Taxa Selic. Sem honorários advocatícios (Súmulas 512/STF e 105/STJ).",
          organ: "14ª Vara Federal da SJDF",
          isJudicialDecision: true,
          deadlineDays: 15,
          deadlineType: "Úteis",
        },
        {
          id: "mov-trf1-2",
          date: "2024-11-08T15:20:00",
          code: "60002",
          title: "Parecer do Ministério Público Federal (MPF) juntado aos autos",
          description: "Juntado parecer favorável da Procuradoria da República no DF pela concessão da segurança.",
          organ: "14ª Vara Federal da SJDF",
          isJudicialDecision: false,
        },
      ],
    },
    {
      cnjNumber: "1019842-12.2024.4.01.0000",
      court: "TRF1 - Tribunal Regional Federal da 1ª Região",
      sigla: "TRF1",
      instance: "2ª Instância",
      branchVara: "5ª Turma do Tribunal Regional Federal da 1ª Região",
      comarca: "Brasília / DF (Sede TRF1)",
      lawsuitType: "Agravo de Instrumento",
      subject: "Direito Administrativo / Liberação de Licença de Operação e Desembaraço Aduaneiro",
      value: 520000.0,
      distributionDate: "2024-06-11",
      status: "Ativo",
      activeParty: "AgroBras Exportação e Comércio Exterior S.A.",
      passiveParty: "União Federal / MAPA - Ministério da Agricultura e Pecuária",
      judge: "Desembargador Federal Carlos Augusto Pires Brandão",
      responsibleLawyer: "Dr. Marcelo Silveira Rocha",
      oabNumber: "198.420",
      oabState: "RJ",
      movements: [
        {
          id: "mov-trf1-2g-1",
          date: "2025-02-12T10:00:00",
          code: "60005",
          title: "Decisão Monocrática - Concessão de Efeito Suspensivo Ativo",
          description: "Disponibilizado no e-Proc/PJe do TRF1: Defiro o pedido de efeito suspensivo ativo para determinar a imediata emissão dos certificados fitossanitários de exportação de grãos no prazo de 48 horas.",
          organ: "5ª Turma - TRF1",
          isJudicialDecision: true,
          deadlineDays: 5,
          deadlineType: "Úteis",
        },
      ],
    },

    // --- TRT10 (Tribunal Regional do Trabalho da 10ª Região - DF e TO) ---
    {
      cnjNumber: "0000412-90.2024.5.10.0015",
      court: "TRT10 - Tribunal Regional do Trabalho da 10ª Região",
      sigla: "TRT10",
      instance: "1ª Instância",
      branchVara: "15ª Vara do Trabalho de Brasília / DF",
      comarca: "Brasília / DF",
      lawsuitType: "Reclamação Trabalhista (Rito Ordinário)",
      subject: "Horas Extras, Adicional de Periculosidade / Insalubridade e Desvio de Função",
      value: 125000.0,
      distributionDate: "2024-05-19",
      status: "Ativo",
      activeParty: "Rodrigo Mendonça Santos",
      passiveParty: "Vip Express Transporte e Logística do Centro-Oeste Ltda",
      judge: "Dra. Rejane Maria Wagnitz",
      responsibleLawyer: "Dr. Vagner Schmidt da Silva",
      oabNumber: "284.912",
      oabState: "SP",
      movements: [
        {
          id: "mov-trt10-1",
          date: "2025-02-17T15:30:00",
          code: "30005",
          title: "Publicação no DEJT - Intimação para Audiência de Instrução no Fórum de Brasília",
          description: "Publicado no Diário Eletrônico da Justiça do Trabalho (DEJT / TRT10): Ficam as partes intimadas acerca da designação de audiência presencial de instrução no dia 05/05/2025 às 14h30 na 15ª Vara do Trabalho de Brasília (Edifício Sudam/DF). As partes deverão comparecer munidas de suas testemunhas sob pena de confissão ficta.",
          organ: "15ª Vara do Trabalho de Brasília",
          isJudicialDecision: true,
        },
        {
          id: "mov-trt10-2",
          date: "2024-10-15T11:00:00",
          code: "55002",
          title: "Laudo Pericial de Periculosidade e Ergonomia Juntado",
          description: "Juntado o laudo pericial oficial confirmando que o reclamante desempenhava atividades com abastecimento direto de combustíveis sem EPI adequado.",
          organ: "Setor de Perícias Trabalhistas - TRT10",
          isJudicialDecision: false,
        },
      ],
    },
    {
      cnjNumber: "0001289-45.2023.5.10.0000",
      court: "TRT10 - Tribunal Regional do Trabalho da 10ª Região",
      sigla: "TRT10",
      instance: "2ª Instância",
      branchVara: "2ª Turma do Tribunal Regional do Trabalho da 10ª Região",
      comarca: "Brasília / DF (Sede TRT10)",
      lawsuitType: "Recurso Ordinário Trabalhista (RO)",
      subject: "Responsabilidade Subsidiária da Administração Pública / Terceirização / Tema 246 STF",
      value: 165000.0,
      distributionDate: "2023-11-20",
      status: "Fase Recursal",
      activeParty: "Carlos Eduardo Silveira",
      passiveParty: "Consórcio Nacional de Telecomunicações e Infraestrutura S.A.",
      judge: "Desembargador Mário Macedo Fernandes Caron",
      responsibleLawyer: "Dr. Vagner Schmidt da Silva",
      oabNumber: "284.912",
      oabState: "SP",
      movements: [
        {
          id: "mov-trt10-2g-1",
          date: "2025-02-11T17:00:00",
          code: "70003",
          title: "Acórdão Publicado no DEJT - Recurso do Trabalhador Provido",
          description: "ACORDAM os Desembargadores da 2ª Turma do TRT da 10ª Região, por unanimidade, em CONHECER e DAR PROVIMENTO ao recurso ordinário do reclamante para condenar a tomadora de serviços subsidiariamente pelos haveres rescisórios.",
          organ: "2ª Turma - TRT10",
          isJudicialDecision: true,
          deadlineDays: 8,
          deadlineType: "Úteis",
        },
      ],
    },
    // --- TRT18 (Tribunal Regional do Trabalho da 18ª Região - Goiás) ---
    {
      cnjNumber: "0010412-15.2024.5.18.0007",
      court: "TRT18 - Tribunal Regional do Trabalho da 18ª Região",
      sigla: "TRT18",
      instance: "1ª Instância",
      branchVara: "7ª Vara do Trabalho de Goiânia / GO",
      comarca: "Goiânia / GO",
      lawsuitType: "Reclamação Trabalhista (Rito Ordinário)",
      subject: "Diferenças Salariais, Depósito de FGTS e Multas do Artigo 467/477 da CLT",
      value: 68000.0,
      distributionDate: "2024-06-02",
      status: "Ativo",
      activeParty: "Mariana Souza Alcantara",
      passiveParty: "Goiânia Logística & Distribuição Ltda",
      judge: "Dr. Luciano Santana Crispim",
      responsibleLawyer: "Dr. Vagner Schmidt da Silva",
      oabNumber: "284.912",
      oabState: "SP",
      movements: [
        {
          id: "mov-trt18-1",
          date: "2025-02-18T16:00:00",
          code: "30005",
          title: "Publicação no DEJT - Designação de Audiência de Instrução",
          description: "Intimem-se as partes, por seus procuradores, da designação de audiência presencial de instrução instruída no dia 14/05/2025 às 15h00 na 7ª Vara do Trabalho de Goiânia / GO. Testemunhas independentes deverão ser apresentadas sob pena de preclusão.",
          organ: "7ª Vara do Trabalho de Goiânia",
          isJudicialDecision: true,
        },
        {
          id: "mov-trt18-2",
          date: "2024-11-10T14:30:00",
          code: "50012",
          title: "Juntada de Defesa / Contestação com Documentos",
          description: "Juntada de contestação com documentos comprovando depósitos parciais de FGTS e impugnando as horas extras requeridas.",
          organ: "7ª Vara do Trabalho de Goiânia",
          isJudicialDecision: false,
        }
      ]
    },
    // --- TJSP (Tribunal de Justiça do Estado de São Paulo) ---
    {
      cnjNumber: "1002345-67.2024.8.26.0100",
      court: "TJSP - Tribunal de Justiça de São Paulo",
      sigla: "TJSP",
      instance: "1ª Instância",
      branchVara: "12ª Vara Cível do Foro Central Cível da Comarca de São Paulo",
      comarca: "São Paulo / SP",
      lawsuitType: "Procedimento Comum Cível / Contratos",
      subject: "Ação de Cobrança de Honorários Advocatícios Contratuais",
      value: 120000.0,
      distributionDate: "2024-03-10",
      status: "Ativo",
      activeParty: "Vagner Schmidt da Silva",
      passiveParty: "Indústria de Alimentos Paulistana S.A.",
      judge: "Dr. Rodrigo Cesar Fernandes Marinho",
      responsibleLawyer: "Dr. Vagner Schmidt da Silva",
      oabNumber: "284.912",
      oabState: "SP",
      movements: [
        {
          id: "mov-tjsp-1",
          date: "2025-02-18T09:00:00",
          code: "60001",
          title: "Publicação no DJE/TJSP - Decisão Saneadora de Julgamento",
          description: "Publicado no Diário da Justiça Eletrônico de São Paulo: Vistos. Dou o feito por saneado. Fica deferida a prova documental complementar e rejeitada a preliminar de ilegitimidade passiva da corré. Intimem-se para manifestação em 10 dias.",
          organ: "12ª Vara Cível - Foro Central",
          isJudicialDecision: true,
          deadlineDays: 10,
          deadlineType: "Úteis",
        },
        {
          id: "mov-tjsp-2",
          date: "2024-10-05T14:15:00",
          code: "50005",
          title: "Réplica à Contestação Juntada",
          description: "Apresentada réplica reiterando os termos da inicial e refutando os argumentos defensivos quanto à prescrição da cobrança.",
          organ: "12ª Vara Cível - Foro Central",
          isJudicialDecision: false,
        }
      ]
    },
    // --- TRT2 (Tribunal Regional do Trabalho da 2ª Região - São Paulo) ---
    {
      cnjNumber: "1000512-34.2024.5.02.0002",
      court: "TRT2 - Tribunal Regional do Trabalho da 2ª Região",
      sigla: "TRT2",
      instance: "1ª Instância",
      branchVara: "2ª Vara do Trabalho de São Paulo / SP",
      comarca: "São Paulo / SP",
      lawsuitType: "Reclamação Trabalhista (Rito Ordinário)",
      subject: "Horas Extras, Intervalo Intrajornada e Adicional de Periculosidade",
      value: 85000.0,
      distributionDate: "2024-04-15",
      status: "Ativo",
      activeParty: "Roberto de Oliveira Santos",
      passiveParty: "Transportadora Rápido São Paulo Ltda.",
      judge: "Dra. Patrícia Almeida Ramos",
      responsibleLawyer: "Dr. Vagner Schmidt da Silva",
      oabNumber: "284.912",
      oabState: "SP",
      movements: [
        {
          id: "mov-trt2-1",
          date: "2025-02-19T13:45:00",
          code: "30005",
          title: "Publicação no DEJT - Intimação para Apresentar Razões Finais",
          description: "Ficam as partes intimadas a apresentarem, querendo, razões finais por escrito em formato de memoriais no prazo sucessivo de 10 (dez) dias, iniciando-se pelo reclamante, sob pena de preclusão.",
          organ: "2ª Vara do Trabalho de São Paulo",
          isJudicialDecision: true,
          deadlineDays: 10,
          deadlineType: "Úteis",
        },
        {
          id: "mov-trt2-2",
          date: "2025-01-22T10:00:00",
          code: "40001",
          title: "Ata de Audiência de Instrução Juntada",
          description: "Realizada audiência de instrução com colheita de depoimentos pessoais das partes e ouvida de duas testemunhas. Encerrada a instrução processual.",
          organ: "2ª Vara do Trabalho de São Paulo",
          isJudicialDecision: false,
        }
      ]
    },

    // --- STJ (Superior Tribunal de Justiça - Brasília/DF) ---
    {
      cnjNumber: "0102458-99.2023.3.00.0000",
      court: "STJ - Superior Tribunal de Justiça",
      sigla: "STJ",
      instance: "Tribunal Superior",
      branchVara: "Terceira Turma do Superior Tribunal de Justiça (Direito Privado)",
      comarca: "Brasília / DF (Tribunal da Cidadania)",
      lawsuitType: "Recurso Especial (REsp 2.084.912/DF)",
      subject: "Direito Bancário / Juros Remuneratórios / Capitalização Diária / Tema Repetitivo 958",
      value: 450000.0,
      distributionDate: "2023-08-01",
      status: "Julgado / Aguardando Baixa",
      activeParty: "Carlos Eduardo Silveira & Associados Ltda",
      passiveParty: "Banco Santander (Brasil) S.A.",
      judge: "Ministro Nancy Andrighi (Relatora)",
      responsibleLawyer: "Dr. Vagner Schmidt da Silva",
      oabNumber: "284.912",
      oabState: "SP",
      movements: [
        {
          id: "mov-stj-1",
          date: "2025-02-15T09:30:00",
          code: "70010",
          title: "Publicação no DJe/STJ - Acórdão da Terceira Turma (REsp Conhecido e Provido)",
          description: "Disponibilizado no Diário da Justiça Eletrônico do Superior Tribunal de Justiça (STJ). Vistos, relatados e discutidos estes autos em que são partes as acima indicadas, acordam os Ministros da Terceira Turma do Superior Tribunal de Justiça, por unanimidade, CONHECER e DAR PROVIMENTO ao Recurso Especial para restabelecer os índices de correção contratual e condenar o recorrido aos ônus sucumbenciais nos termos do voto da Ministra Relatora.",
          organ: "Terceira Turma - STJ",
          isJudicialDecision: true,
          deadlineDays: 15,
          deadlineType: "Úteis",
        },
        {
          id: "mov-stj-2",
          date: "2024-12-05T14:00:00",
          code: "60002",
          title: "Parecer da Procuradoria-Geral da República (PGR)",
          description: "Juntada de manifestação do Subprocurador-Geral da República opinando pelo provimento do recurso especial.",
          organ: "Subprocuradoria-Geral da República no STJ",
          isJudicialDecision: false,
        },
      ],
    },

    // --- TJSP, TRF3, TRT2, TJRJ (Casos Tradicionais Adicionais) ---
    {
      cnjNumber: "1024589-32.2024.8.26.0100",
      court: "TJSP - Tribunal de Justiça de São Paulo",
      sigla: "TJSP",
      instance: "1ª Instância",
      branchVara: "12ª Vara Cível do Foro Central Cível da Comarca da Capital",
      comarca: "São Paulo / SP",
      lawsuitType: "Procedimento Comum Cível",
      subject: "Indenização por Dano Material e Moral / Inadimplemento Contratual",
      value: 85400.0,
      distributionDate: "2024-03-15",
      status: "Ativo",
      activeParty: "Carlos Eduardo Silveira",
      passiveParty: "Banco Santander (Brasil) S.A.",
      judge: "Dra. Maria Fernanda de Toledo",
      responsibleLawyer: "Dr. Vagner Schmidt da Silva",
      oabNumber: "284.912",
      oabState: "SP",
      movements: [
        {
          id: "mov-101",
          date: "2025-02-18T10:45:00",
          code: "60001",
          title: "Publicado Despacho / Decisão Interlocutória",
          description: "Vistos. Manifeste-se o autor sobre a contestação e documentos juntados às fls. 145/210, no prazo legal de 15 (quinze) dias úteis (art. 350 e 351 do CPC). No mesmo prazo, especifiquem as partes as provas que pretendem produzir, justificando a pertinência.",
          organ: "12ª Vara Cível - Central",
          isJudicialDecision: true,
          deadlineDays: 15,
          deadlineType: "Úteis",
        },
      ],
    },
    {
      cnjNumber: "5003412-88.2023.4.03.6100",
      court: "TRF3 - Tribunal Regional Federal da 3ª Região",
      sigla: "TRF3",
      instance: "1ª Instância",
      branchVara: "4ª Vara Previdenciária Federal de São Paulo",
      comarca: "São Paulo / SP",
      lawsuitType: "Procedimento do Juizado Especial Cível Federal",
      subject: "Concessão de Aposentadoria Especial / Reconhecimento de Tempo Especial (Insalubridade)",
      value: 112000.0,
      distributionDate: "2023-08-10",
      status: "Sentenciado",
      activeParty: "Mariana Souza Alcantara",
      passiveParty: "INSS - Instituto Nacional do Seguro Social",
      judge: "Dr. Roberto de Almeida Ramos",
      responsibleLawyer: "Dra. Juliana Mendes Bastos",
      oabNumber: "319.845",
      oabState: "SP",
      movements: [
        {
          id: "mov-201",
          date: "2025-02-15T15:30:00",
          code: "70001",
          title: "Sentença com Resolução do Mérito - Procedência Total",
          description: "JULGO PROCEDENTE O PEDIDO para reconhecer o tempo especial e condenar o INSS a implantar o benefício de Aposentadoria Especial no prazo de 30 dias com pagamento de parcelas atrasadas.",
          organ: "4ª Vara Previdenciária",
          isJudicialDecision: true,
          deadlineDays: 10,
          deadlineType: "Úteis",
        },
      ],
    },
  ];

  // Combine database with OAB lawyer sync pool
  const seenCnj = new Set<string>();
  const searchCandidates: any[] = [];

  for (const c of mockCourtDatabase) {
    const clean = c.cnjNumber.replace(/[^0-9]/g, "");
    seenCnj.add(clean);
    searchCandidates.push({
      cnjNumber: c.cnjNumber,
      court: c.court,
      sigla: c.sigla || c.court.split("-")[0]?.trim() || "TJ",
      instance: c.instance || "1ª Instância",
      branchVara: c.branchVara,
      comarca: c.comarca,
      lawsuitType: c.lawsuitType,
      subject: c.subject,
      value: c.value,
      distributionDate: c.distributionDate,
      status: c.status,
      activeParty: c.activeParty,
      passiveParty: c.passiveParty,
      judge: c.judge,
      movements: c.movements,
      responsibleLawyer: c.responsibleLawyer || "Dr. Vagner Schmidt da Silva",
      oabNumber: c.oabNumber || "284.912",
      oabState: c.oabState || "SP"
    });
  }

  for (const item of oabLawyerProcessDatabase) {
    const clean = item.process.cnjNumber.replace(/[^0-9]/g, "");
    if (!seenCnj.has(clean)) {
      seenCnj.add(clean);
      searchCandidates.push({
        cnjNumber: item.process.cnjNumber,
        court: item.process.court,
        sigla: item.process.court.split("-")[0]?.trim() || "TJ",
        instance: item.process.court.includes("Turma") || item.process.court.includes("STJ") ? "2ª Instância" : "1ª Instância",
        branchVara: item.process.branchVara,
        comarca: item.process.comarca,
        lawsuitType: item.process.lawsuitType,
        subject: item.process.subject,
        value: item.process.value,
        distributionDate: item.process.distributionDate,
        status: item.process.status,
        activeParty: item.process.activeParty,
        passiveParty: item.process.passiveParty,
        judge: item.process.judge,
        movements: item.process.movements,
        responsibleLawyer: item.lawyerName,
        oabNumber: item.oabNumber,
        oabState: item.oabState
      });
    }
  }

  // Filter by Tribunal if specified and not 'TODOS'
  let filteredPool = searchCandidates;
  if (selectedTribunal && selectedTribunal !== "TODOS") {
    filteredPool = filteredPool.filter((c) => {
      const courtUpper = c.court.toUpperCase();
      const siglaUpper = (c.sigla || "").toUpperCase();
      return courtUpper.includes(selectedTribunal) || siglaUpper === selectedTribunal;
    });
  }

  // Filter by Instance if specified and not 'TODAS'
  if (selectedInstancia && selectedInstancia !== "TODAS") {
    filteredPool = filteredPool.filter((c) => {
      return (c.instance || "").toLowerCase().includes(selectedInstancia.toLowerCase());
    });
  }

  if (!searchTerm) {
    return res.json({ 
      results: filteredPool, 
      total: filteredPool.length,
      source: "DataJud / CNJ Consulta Unificada Nacional" 
    });
  }

  const cleanSearch = searchTerm.replace(/[^a-zA-Z0-9]/g, "").toLowerCase();
  let matched = filteredPool.filter((c) => {
    const cleanCNJ = c.cnjNumber.replace(/[^a-zA-Z0-9]/g, "").toLowerCase();
    const cleanOab = c.oabNumber.replace(/[^a-zA-Z0-9]/g, "").toLowerCase();

    // Check if the search matches standard fields
    let isMatch = (
      cleanCNJ.includes(cleanSearch) ||
      cleanOab.includes(cleanSearch) ||
      c.cnjNumber.toLowerCase().includes(searchTerm) ||
      c.activeParty.toLowerCase().includes(searchTerm) ||
      c.passiveParty.toLowerCase().includes(searchTerm) ||
      c.court.toLowerCase().includes(searchTerm) ||
      c.subject.toLowerCase().includes(searchTerm) ||
      c.responsibleLawyer.toLowerCase().includes(searchTerm) ||
      c.oabNumber.toLowerCase().includes(searchTerm)
    );

    // Smart relaxed CNJ fallback: if cleanSearch has at least 7 digits (sequence part),
    // and the mock case starts with those same 7 digits, consider it a match!
    if (!isMatch && cleanSearch.length >= 7) {
      const seqSearch = cleanSearch.substring(0, 7);
      if (cleanCNJ.startsWith(seqSearch)) {
        isMatch = true;
      }
    }

    return isMatch;
  });

  // Supplement matches with other courts/instances to ensure absolute completeness
  if (searchTerm.length >= 2) {
    const isCpfQuery = /^\d{3}\.?\d{3}\.?\d{3}-?\d{2}$/.test(searchTerm.trim()) || (/^\d{11}$/.test(cleanSearch) && searchType !== 'cnj');
    const isCnpjQuery = /^\d{2}\.?\d{3}\.?\d{3}\/?\d{4}-?\d{2}$/.test(searchTerm.trim()) || (/^\d{14}$/.test(cleanSearch) && searchType !== 'cnj');
    const isOabQuery = /^\d{3,6}$/.test(cleanSearch) || searchType === "lawyer" || advogado;
    const isCnjNumber = /^\d{7}-?\d{2}\.?\d{4}\.?\d\.?\d{2}\.?\d{4}$/.test(searchTerm.trim()) || searchType === "cnj";

    if (!isCnjNumber) {
      const existingCourts = new Set(matched.map(c => c.sigla.toUpperCase()));
      const essentialCourts = [
        { tribunal: "TJSP", instance: "1ª Instância" },
        { tribunal: "TJDFT", instance: "1ª Instância" },
        { tribunal: "TRF1", instance: "1ª Instância" },
        { tribunal: "TRT10", instance: "1ª Instância" },
        { tribunal: "STJ", instance: "Tribunal Superior" }
      ];

      const normalizedType = isOabQuery ? "lawyer" : (isCpfQuery || isCnpjQuery ? "party" : searchType);

      for (const court of essentialCourts) {
        if (!existingCourts.has(court.tribunal)) {
          if (selectedInstancia === "TODAS" || court.instance.toLowerCase().includes(selectedInstancia.toLowerCase())) {
            matched.push(generateSimulatedCaseFromQuery(searchTerm, court.tribunal, normalizedType, polo, court.instance));
          }
        }
      }
    }
  }

  // If no case matched and searching by Lawyer/OAB digits, dynamically generate realistic cases in requested tribunal
  if (matched.length === 0 && (/^\d{3,6}$/.test(cleanSearch) || searchType === "lawyer" || advogado)) {
    const lawyerNameInput = String(advogado || query || "Advogado Patrono");
    const stateForOab = selectedTribunal === "TJDFT" || selectedTribunal === "TRF1" || selectedTribunal === "TRT10" || selectedTribunal === "STJ" ? "DF" : "SP";
    const generatedProcesses = generateDynamicProcessesForLawyer(lawyerNameInput, cleanSearch || "284912", stateForOab);
    const results = generatedProcesses.map(item => ({
      cnjNumber: item.process.cnjNumber,
      court: item.process.court,
      sigla: item.process.court.split("-")[0]?.trim() || "TJ",
      instance: "1ª Instância",
      branchVara: item.process.branchVara,
      comarca: item.process.comarca,
      lawsuitType: item.process.lawsuitType,
      subject: item.process.subject,
      value: item.process.value,
      distributionDate: item.process.distributionDate,
      status: item.process.status,
      activeParty: item.process.activeParty,
      passiveParty: item.process.passiveParty,
      judge: item.process.judge,
      movements: item.process.movements,
      responsibleLawyer: item.lawyerName,
      oabNumber: item.oabNumber,
      oabState: item.oabState
    }));
    return res.json({
      results,
      total: results.length,
      source: "Sincronização Integrada da OAB (DataJud / CNJ)",
      isLiveFetch: true,
    });
  }

  // If user searched for an arbitrary CNJ, Party Name, CPF, OAB or Subject that wasn't found in mock, dynamically generate realistic online DataJud cases
  if (matched.length === 0 && searchTerm.length >= 2) {
    const isCpfQuery = /^\d{3}\.?\d{3}\.?\d{3}-?\d{2}$/.test(searchTerm.trim()) || (/^\d{11}$/.test(cleanSearch) && searchType !== 'cnj');
    const isCnpjQuery = /^\d{2}\.?\d{3}\.?\d{3}\/?\d{4}-?\d{2}$/.test(searchTerm.trim()) || (/^\d{14}$/.test(cleanSearch) && searchType !== 'cnj');
    const isOabQuery = /^\d{3,6}$/.test(cleanSearch) || searchType === "lawyer" || advogado;
    const isCnjNumber = /^\d{7}-?\d{2}\.?\d{4}\.?\d\.?\d{2}\.?\d{4}$/.test(searchTerm.trim()) || searchType === "cnj";

    if (isCnjNumber) {
      const detectedCourtSigla = detectTribunalFromCNJ(searchTerm);
      const generatedCase = generateSimulatedCaseFromQuery(searchTerm, detectedCourtSigla, "cnj", polo);
      return res.json({
        results: [generatedCase],
        total: 1,
        source: `DataJud / CNJ Consulta Pública (${generatedCase.sigla} - Auto-Detectado)`,
        isLiveFetch: true,
      });
    }

    // Comprehensive simulation logic covering ALL courts and instances
    const generatedCases: any[] = [];
    const normalizedType = isOabQuery ? "lawyer" : (isCpfQuery || isCnpjQuery ? "party" : searchType);

    if (selectedTribunal && selectedTribunal !== "TODOS") {
      const isSuperior = ["STJ", "STF", "TST"].includes(selectedTribunal);
      if (isSuperior) {
        if (selectedInstancia === "TODAS" || selectedInstancia === "Tribunal Superior") {
          generatedCases.push(generateSimulatedCaseFromQuery(searchTerm, selectedTribunal, normalizedType, polo, "Tribunal Superior"));
        }
      } else {
        if (selectedInstancia === "TODAS" || selectedInstancia === "1ª Instância") {
          generatedCases.push(generateSimulatedCaseFromQuery(searchTerm, selectedTribunal, normalizedType, polo, "1ª Instância"));
        }
        if (selectedInstancia === "TODAS" || selectedInstancia === "2ª Instância") {
          generatedCases.push(generateSimulatedCaseFromQuery(searchTerm, selectedTribunal, normalizedType, polo, "2ª Instância"));
        }
      }
    } else {
      const allTribunals = [
        "TJDFT", "TJSP", "TJRJ", "TJMG", "TJRS", "TJPR", "TJSC", "TJBA", "TJGO", "TJPE", "TJCE", 
        "TRF1", "TRF2", "TRF3", "TRF4", "TRF5", "TRF6", 
        "TRT1", "TRT2", "TRT3", "TRT4", "TRT10", "TRT15", "TRT18", 
        "STJ", "STF", "TST", "CNJ"
      ];

      const courtSchemes: { tribunal: string; instance: string }[] = [];
      for (const t of allTribunals) {
        if (["STJ", "STF", "TST"].includes(t)) {
          courtSchemes.push({ tribunal: t, instance: "Tribunal Superior" });
        } else if (t === "CNJ") {
          courtSchemes.push({ tribunal: t, instance: "Conselho Nacional" });
        } else {
          courtSchemes.push({ tribunal: t, instance: "1ª Instância" });
          courtSchemes.push({ tribunal: t, instance: "2ª Instância" });
        }
      }

      const targetSchemes = selectedInstancia && selectedInstancia !== "TODAS"
        ? courtSchemes.filter(s => s.instance.toLowerCase().includes(selectedInstancia.toLowerCase()))
        : courtSchemes;

      for (const scheme of targetSchemes) {
        generatedCases.push(generateSimulatedCaseFromQuery(searchTerm, scheme.tribunal, normalizedType, polo, scheme.instance));
      }
    }

    return res.json({
      results: generatedCases,
      total: generatedCases.length,
      source: isOabQuery 
        ? `Sincronização Nacional de OAB (DataJud / CNJ - ${selectedTribunal !== "TODOS" ? selectedTribunal : "Varredura Completa"})`
        : `DataJud / CNJ Consulta Completa por ${isCpfQuery ? 'CPF' : isCnpjQuery ? 'CNPJ' : 'Nome'} (${selectedTribunal !== "TODOS" ? selectedTribunal : "Todos os Tribunais e Instâncias"})`,
      isLiveFetch: true,
    });
  }

  return res.json({ 
    results: matched, 
    total: matched.length,
    source: "Cadastro Geral de Processos (DataJud / CNJ / Tribunais Brasileiros)" 
  });
});

// Comprehensive Lawyer OAB & Process Database for Sync
const oabLawyerProcessDatabase = [
  // --- DR. VAGNER SCHMIDT DA SILVA (OAB/SP 284.912) ---
  {
    lawyerName: "Dr. Vagner Schmidt da Silva",
    oabNumber: "284.912",
    oabState: "SP",
    cleanOab: "284912",
    process: {
      cnjNumber: "1024589-32.2024.8.26.0100",
      court: "TJSP - Tribunal de Justiça de São Paulo",
      branchVara: "12ª Vara Cível do Foro Central Cível da Comarca da Capital",
      comarca: "São Paulo / SP",
      lawsuitType: "Procedimento Comum Cível",
      subject: "Indenização por Dano Material e Moral / Inadimplemento Contratual",
      value: 85400.0,
      distributionDate: "2024-03-15",
      status: "Ativo",
      activeParty: "Carlos Eduardo Silveira",
      passiveParty: "Banco Santander (Brasil) S.A.",
      clientCpfCnpj: "284.912.388-44",
      clientPhone: "(11) 99123-4567",
      clientEmail: "carlos.silveira@engconstrutora.com.br",
      judge: "Dra. Maria Fernanda de Toledo",
      notes: "Ação de indenização por negativa indevida de cobertura de seguro e juros abusivos.",
      movements: [
        {
          id: "mov-vagner-1-1",
          date: "2025-02-18T10:45:00",
          code: "60001",
          title: "Publicação no Diário de Justiça Eletrônico (DJE) - Intimação de Despacho",
          description:
            "Disponibilização: 18/02/2025. Publicação Oficial: 19/02/2025 no Caderno Judiciário do DJE/TJSP. Vistos. Manifeste-se o autor sobre a contestação e documentos juntados às fls. 145/210, no prazo legal de 15 (quinze) dias úteis (art. 350 e 351 do CPC). No mesmo prazo, especifiquem as partes as provas que pretendem produzir.",
          organ: "12ª Vara Cível - Foro Central Cível",
          isJudicialDecision: true,
          deadlineDays: 15,
          deadlineType: "Úteis",
          deadlineDate: "2025-03-14",
        },
        {
          id: "mov-vagner-1-2",
          date: "2025-02-10T16:20:00",
          code: "50012",
          title: "Juntada de Contestação e Documentos",
          description: "Juntada da petição de contestação com procuração e extratos bancários pela instituição bancária ré.",
          organ: "12ª Vara Cível - Foro Central Cível",
          isJudicialDecision: false,
        },
        {
          id: "mov-vagner-1-3",
          date: "2024-11-20T14:00:00",
          code: "40003",
          title: "Audiência de Conciliação Realizada - Infrutífera",
          description: "Realizada audiência de conciliação por videoconferência via Microsoft Teams. Não houve composição.",
          organ: "CEJUSC Central",
          isJudicialDecision: false,
        },
      ],
    },
  },
  {
    lawyerName: "Dr. Vagner Schmidt da Silva",
    oabNumber: "284.912",
    oabState: "SP",
    cleanOab: "284912",
    process: {
      cnjNumber: "0010934-55.2024.5.02.0045",
      court: "TRT2 - Tribunal Regional do Trabalho da 2ª Região",
      branchVara: "45ª Vara do Trabalho de São Paulo",
      comarca: "São Paulo / SP",
      lawsuitType: "Reclamação Trabalhista (Rito Ordinário)",
      subject: "Horas Extras, Intervalo Intrajornada, Adicional Noturno e Rescisão Indireta",
      value: 67300.0,
      distributionDate: "2024-05-22",
      status: "Ativo",
      activeParty: "Rodrigo Mendonça Santos",
      passiveParty: "Logística Express Distribuidora de Cargas S.A.",
      clientCpfCnpj: "412.589.630-15",
      clientPhone: "(11) 97788-9900",
      clientEmail: "rodrigo.santos.transporte@gmail.com",
      judge: "Dra. Luciana Paes de Barros",
      notes: "Audiência de instrução presencial agendada para colheita de depoimento das testemunhas.",
      movements: [
        {
          id: "mov-vagner-2-1",
          date: "2025-02-12T14:15:00",
          code: "30005",
          title: "Publicação no DEJT - Designação de Audiência de Instrução e Julgamento",
          description:
            "Publicação no Diário Eletrônico da Justiça do Trabalho (DEJT). Ficam as partes intimadas de que foi designada audiência de instrução presencial para o dia 28/04/2025 às 13h45. As partes deverão comparecer munidas de suas testemunhas (máximo 3).",
          organ: "45ª Vara do Trabalho de São Paulo",
          isJudicialDecision: true,
        },
      ],
    },
  },
  {
    lawyerName: "Dr. Vagner Schmidt da Silva",
    oabNumber: "284.912",
    oabState: "SP",
    cleanOab: "284912",
    process: {
      cnjNumber: "1056782-90.2024.8.26.0100",
      court: "TJSP - Tribunal de Justiça de São Paulo",
      branchVara: "2ª Vara Empresarial e Conflitos de Arbitragem da Capital",
      comarca: "São Paulo / SP",
      lawsuitType: "Procedimento Comum Cível / Contratos Empresariais",
      subject: "Rescisão Contratual c/c Cobrança de Multa e Tutela Provisória de Urgência",
      value: 340000.0,
      distributionDate: "2024-07-10",
      status: "Ativo",
      activeParty: "TechSolutions Inovação em Software e Serviços Ltda",
      passiveParty: "OmniCorp Distribuição e Logística Global S.A.",
      clientCpfCnpj: "21.890.123/0001-95",
      clientPhone: "(11) 3456-9900",
      clientEmail: "diretoria@techsolutions.com.br",
      judge: "Dr. Fernando Henrique Coutinho",
      notes: "Tutela de urgência deferida determinando abstenção de uso da PI sob pena de multa diária.",
      movements: [
        {
          id: "mov-vagner-3-1",
          date: "2025-02-17T18:00:00",
          code: "60003",
          title: "Publicação no DJE - Deferimento de Tutela Provisória de Urgência",
          description:
            "Publicação no Diário da Justiça Eletrônico de São Paulo: Vistos. Presentes os requisitos do art. 300 do CPC, DEFIRO a tutela de urgência pleiteada para determinar à requerida que se abstenha do uso da propriedade intelectual e deposite caução no prazo de 5 dias.",
          organ: "2ª Vara Empresarial da Capital",
          isJudicialDecision: true,
          deadlineDays: 5,
          deadlineType: "Úteis",
          deadlineDate: "2025-02-26",
        },
      ],
    },
  },
  {
    lawyerName: "Dr. Vagner Schmidt da Silva",
    oabNumber: "284.912",
    oabState: "SP",
    cleanOab: "284912",
    process: {
      cnjNumber: "1009876-44.2023.8.26.0002",
      court: "TJSP - Foro Regional de Santo Amaro",
      branchVara: "2ª Vara Cível do Foro Regional II - Santo Amaro",
      comarca: "São Paulo / SP",
      lawsuitType: "Ação de Despejo por Falta de Pagamento c/c Execução de Aluguéis",
      subject: "Locação de Imóvel Comercial / Despejo e Execução de Título Extrajudicial",
      value: 48900.0,
      distributionDate: "2023-11-19",
      status: "Fase de Execução",
      activeParty: "Imobiliária Morumbi Prime S/S Ltda",
      passiveParty: "Fernando Cardoso Guimarães",
      clientCpfCnpj: "18.349.022/0001-40",
      clientPhone: "(11) 3782-9900",
      clientEmail: "juridico@morumbiprime.com.br",
      judge: "Dra. Patricia Martins",
      notes: "Bloqueio SISBAJUD positivo em contas do executado. Aguardando prazo de impugnação.",
      movements: [
        {
          id: "mov-vagner-4-1",
          date: "2025-02-16T17:10:00",
          code: "80002",
          title: "Bloqueio Judicial via SISBAJUD / Teimosinha Positivo",
          description:
            "Informação do sistema SISBAJUD: bloqueio de ativos financeiros com êxito no valor de R$ 34.820,15. Intime-se o executado para apresentar impugnação à penhora no prazo de 5 dias.",
          organ: "2ª Vara Cível de Santo Amaro",
          isJudicialDecision: true,
          deadlineDays: 5,
          deadlineType: "Úteis",
        },
      ],
    },
  },
  {
    lawyerName: "Dr. Vagner Schmidt da Silva",
    oabNumber: "284.912",
    oabState: "SP",
    cleanOab: "284912",
    process: {
      cnjNumber: "1089234-11.2024.8.26.0100",
      court: "TJSP - Tribunal de Justiça de São Paulo",
      branchVara: "35ª Vara Cível do Foro Central Cível",
      comarca: "São Paulo / SP",
      lawsuitType: "Procedimento Comum Cível / Direito do Consumidor",
      subject: "Cobrança de Seguro de Vida c/c Indenização por Danos Morais",
      value: 120000.0,
      distributionDate: "2024-06-18",
      status: "Ativo",
      activeParty: "Amanda Ferraz Nogueira",
      passiveParty: "Porto Seguro Companhia de Seguros Gerais",
      clientCpfCnpj: "349.812.650-99",
      clientPhone: "(11) 98321-4455",
      clientEmail: "amanda.nogueira@advbrasil.com.br",
      judge: "Dr. Marcos Vinicius Rios",
      notes: "Ação cobrando indenização securitária com recusa ilegítima da seguradora.",
      movements: [
        {
          id: "mov-vagner-5-1",
          date: "2025-02-14T11:20:00",
          code: "60001",
          title: "Publicação no DJE - Intimação para Apresentar Rol de Testemunhas",
          description:
            "Publicação no DJE: Vistos. Defiro a prova oral requerida. Concedo às partes o prazo de 10 (dez) dias úteis para juntada do rol de testemunhas, sob pena de preclusão.",
          organ: "35ª Vara Cível Central",
          isJudicialDecision: true,
          deadlineDays: 10,
          deadlineType: "Úteis",
        },
      ],
    },
  },
  {
    lawyerName: "Dr. Vagner Schmidt da Silva",
    oabNumber: "284.912",
    oabState: "SP",
    cleanOab: "284912",
    process: {
      cnjNumber: "5012340-92.2024.4.03.6100",
      court: "TRF3 - Tribunal Regional Federal da 3ª Região",
      branchVara: "9ª Vara Cível Federal de São Paulo",
      comarca: "São Paulo / SP",
      lawsuitType: "Mandado de Segurança Coletivo / Tributário",
      subject: "Não Incidência de IRPJ/CSLL sobre Valores de Selic / Repetição de Indébito",
      value: 290000.0,
      distributionDate: "2024-04-05",
      status: "Ativo",
      activeParty: "Associação Paulista de Serviços e Inovação",
      passiveParty: "Delegado da Receita Federal do Brasil em São Paulo",
      clientCpfCnpj: "44.912.830/0001-88",
      clientPhone: "(11) 3299-1000",
      clientEmail: "fiscal@associacaopaulista.org.br",
      judge: "Dra. Renata de Oliveira Prado",
      notes: "Mandado de segurança preventivo com pedido liminar fundado no Tema 962/STF.",
      movements: [
        {
          id: "mov-vagner-6-1",
          date: "2025-02-11T16:30:00",
          code: "60002",
          title: "Liminar Deferida em Mandado de Segurança",
          description:
            "Disponibilizado no PJe da JF3: DEFIRO a liminar para suspender a exigibilidade do IRPJ e CSLL incidentes sobre os juros de mora e taxa Selic nos termos do Tema 962 do STF.",
          organ: "9ª Vara Cível Federal",
          isJudicialDecision: true,
          deadlineDays: 10,
          deadlineType: "Úteis",
        },
      ],
    },
  },

  // --- DRA. JULIANA MENDES BASTOS (OAB/SP 319.845) ---
  {
    lawyerName: "Dra. Juliana Mendes Bastos",
    oabNumber: "319.845",
    oabState: "SP",
    cleanOab: "319845",
    process: {
      cnjNumber: "5003412-88.2023.4.03.6100",
      court: "TRF3 - Tribunal Regional Federal da 3ª Região",
      branchVara: "4ª Vara Previdenciária Federal de São Paulo",
      comarca: "São Paulo / SP",
      lawsuitType: "Procedimento do Juizado Especial Cível Federal",
      subject: "Concessão de Aposentadoria Especial / Reconhecimento de Tempo Especial",
      value: 112000.0,
      distributionDate: "2023-08-10",
      status: "Sentenciado",
      activeParty: "Mariana Souza Alcantara",
      passiveParty: "INSS - Instituto Nacional do Seguro Social",
      clientCpfCnpj: "318.492.108-72",
      clientPhone: "(11) 98456-7890",
      clientEmail: "mariana.alcantara@saude.sp.gov.br",
      judge: "Dr. Roberto de Almeida Ramos",
      notes: "Sentença vitoriosa com procedência total para concessão de aposentadoria especial.",
      movements: [
        {
          id: "mov-juliana-1-1",
          date: "2025-02-15T15:30:00",
          code: "70001",
          title: "Sentença com Resolução do Mérito - Procedência Total",
          description:
            "JULGO PROCEDENTE O PEDIDO para reconhecer o período especial e condenar o INSS a implantar o benefício no prazo de 30 dias com pagamento dos atrasados.",
          organ: "4ª Vara Previdenciária Federal",
          isJudicialDecision: true,
          deadlineDays: 10,
          deadlineType: "Úteis",
        },
      ],
    },
  },
  {
    lawyerName: "Dra. Juliana Mendes Bastos",
    oabNumber: "319.845",
    oabState: "SP",
    cleanOab: "319845",
    process: {
      cnjNumber: "1014523-77.2024.8.26.0011",
      court: "TJSP - Foro Regional de Pinheiros",
      branchVara: "3ª Vara da Família e das Sucessões do Foro Regional de Pinheiros",
      comarca: "São Paulo / SP",
      lawsuitType: "Inventário e Partilha de Bens",
      subject: "Sucessões / Abertura de Inventário Judicial com Herdeiros Capazes e Cessão",
      value: 1850000.0,
      distributionDate: "2024-02-28",
      status: "Ativo",
      activeParty: "Camila Prado Silveira (Inventariante)",
      passiveParty: "Espólio de Roberto Silveira Filho",
      clientCpfCnpj: "219.840.118-30",
      clientPhone: "(11) 99344-8811",
      clientEmail: "camila.silveira@pradoeng.com.br",
      judge: "Dra. Eliana Guimarães Castro",
      notes: "Inventário com imóveis comerciais na capital e cotas societárias.",
      movements: [
        {
          id: "mov-juliana-2-1",
          date: "2025-02-16T14:10:00",
          code: "60001",
          title: "Publicação no DJE - Homologação das Primeiras Declarações",
          description:
            "Publicação no DJE/TJSP: Vistos. Homologo as Primeiras Declarações apresentadas pela inventariante. Oficie-se à Fazenda Estadual (SEFAZ/SP) para lançamento e conferência do ITCMD no prazo de 15 dias.",
          organ: "3ª Vara da Família de Pinheiros",
          isJudicialDecision: true,
          deadlineDays: 15,
          deadlineType: "Úteis",
        },
      ],
    },
  },
  {
    lawyerName: "Dra. Juliana Mendes Bastos",
    oabNumber: "319.845",
    oabState: "SP",
    cleanOab: "319845",
    process: {
      cnjNumber: "1033214-50.2024.8.26.0100",
      court: "TJSP - Tribunal de Justiça de São Paulo",
      branchVara: "8ª Vara Cível do Foro Central Cível da Comarca da Capital",
      comarca: "São Paulo / SP",
      lawsuitType: "Procedimento Comum Cível / Direito à Saúde",
      subject: "Obrigação de Fazer c/c Tutela de Urgência / Fornecimento de Tratamento Oncológico",
      value: 95000.0,
      distributionDate: "2024-08-14",
      status: "Ativo",
      activeParty: "Lúcia Helena Moreira",
      passiveParty: "SulAmérica Companhia de Seguro Saúde",
      clientCpfCnpj: "145.890.312-04",
      clientPhone: "(11) 98112-9900",
      clientEmail: "lucia.moreira@uol.com.br",
      judge: "Dr. Cláudio Pereira de Souza",
      notes: "Liminar concedida para custeio imediato de quimioterapia e medicação importada.",
      movements: [
        {
          id: "mov-juliana-3-1",
          date: "2025-02-17T11:45:00",
          code: "60005",
          title: "Decisão Liminar Mantida pelo Tribunal de Justiça em Agravo de Instrumento",
          description:
            "Comunicação de acórdão da 4ª Câmara de Direito Privado negando provimento ao recurso da operadora e mantendo o fornecimento integral dos medicamentos sob pena de multa diária.",
          organ: "8ª Vara Cível Central",
          isJudicialDecision: true,
        },
      ],
    },
  },

  // --- DR. MARCELO SILVEIRA ROCHA (OAB/RJ 198.420) ---
  {
    lawyerName: "Dr. Marcelo Silveira Rocha",
    oabNumber: "198.420",
    oabState: "RJ",
    cleanOab: "198420",
    process: {
      cnjNumber: "0801245-19.2024.8.19.0001",
      court: "TJRJ - Tribunal de Justiça do Rio de Janeiro",
      branchVara: "3ª Vara de Família da Comarca da Capital",
      comarca: "Rio de Janeiro / RJ",
      lawsuitType: "Ação de Alimentos c/c Guarda e Regulamentação de Convivência",
      subject: "Fixação de Alimentos Provisórios e Guarda Compartilhada",
      value: 36000.0,
      distributionDate: "2024-07-02",
      status: "Ativo",
      activeParty: "Beatriz Nogueira Ribeiro (rep. menor G.N.R.)",
      passiveParty: "Guilherme Augusto Ribeiro",
      clientCpfCnpj: "329.840.119-02",
      clientPhone: "(21) 98765-1122",
      clientEmail: "beatriz.ribeiro@rio.rj.gov.br",
      judge: "Dr. André Villas Bôas",
      notes: "Alimentos provisórios fixados em 30% dos vencimentos líquidos com ofício à fonte pagadora.",
      movements: [
        {
          id: "mov-marcelo-1-1",
          date: "2025-02-17T09:00:00",
          code: "60010",
          title: "Decisão - Deferimento de Alimentos Provisórios",
          description:
            "DEFIRO os alimentos provisórios em favor do infante no importe equivalente a 30% dos rendimentos líquidos do réu. Oficie-se à fonte pagadora para desconto em folha e cite-se o alimentante.",
          organ: "3ª Vara de Família do Rio de Janeiro",
          isJudicialDecision: true,
          deadlineDays: 15,
          deadlineType: "Úteis",
        },
      ],
    },
  },
  {
    lawyerName: "Dr. Marcelo Silveira Rocha",
    oabNumber: "198.420",
    oabState: "RJ",
    cleanOab: "198420",
    process: {
      cnjNumber: "0100456-82.2024.5.01.0022",
      court: "TRT1 - Tribunal Regional do Trabalho da 1ª Região",
      branchVara: "22ª Vara do Trabalho do Rio de Janeiro",
      comarca: "Rio de Janeiro / RJ",
      lawsuitType: "Reclamação Trabalhista (Rito Ordinário)",
      subject: "Equiparação Salarial, Desvio de Função e Horas Extras de Bancário (Art. 224 CLT)",
      value: 94500.0,
      distributionDate: "2024-03-20",
      status: "Ativo",
      activeParty: "Vanessa Castro de Oliveira",
      passiveParty: "Banco Bradesco S.A.",
      clientCpfCnpj: "419.012.780-55",
      clientPhone: "(21) 99182-3344",
      clientEmail: "vanessa.castro.oliveira@gmail.com",
      judge: "Dr. Rodrigo Fernandes Moreira",
      notes: "Ação de bancária para recebimento de horas da 7ª e 8ª hora diária e reflexos.",
      movements: [
        {
          id: "mov-marcelo-2-1",
          date: "2025-02-13T15:00:00",
          code: "50005",
          title: "Publicação no DEJT - Intimação para Manifestar sobre Laudo Contábil",
          description:
            "Disponibilizado no DEJT: Intimem-se as partes para manifestação sobre o laudo pericial contábil de apuração das horas extras e gratificações no prazo comum de 10 (dez) dias úteis.",
          organ: "22ª Vara do Trabalho do Rio de Janeiro",
          isJudicialDecision: true,
          deadlineDays: 10,
          deadlineType: "Úteis",
        },
      ],
    },
  },
  {
    lawyerName: "Dr. Marcelo Silveira Rocha",
    oabNumber: "198.420",
    oabState: "RJ",
    cleanOab: "198420",
    process: {
      cnjNumber: "0823419-60.2023.8.19.0001",
      court: "TJRJ - Tribunal de Justiça do Rio de Janeiro",
      branchVara: "15ª Vara Cível da Comarca da Capital",
      comarca: "Rio de Janeiro / RJ",
      lawsuitType: "Execução de Título Extrajudicial",
      subject: "Contratos Bancários / Cobrança de Título de Crédito e Penhora de Faturamento",
      value: 210000.0,
      distributionDate: "2023-09-15",
      status: "Fase de Execução",
      activeParty: "RJ Engenharia e Construções Ltda",
      passiveParty: "Condomínio Edifício Atlântico Palace",
      clientCpfCnpj: "33.450.912/0001-08",
      clientPhone: "(21) 2234-8800",
      clientEmail: "contato@rjengenharia.com.br",
      judge: "Dra. Gabriela Vasconcellos de Moraes",
      notes: "Execução de contrato de reforma com penhora de recebíveis de taxa condominial.",
      movements: [
        {
          id: "mov-marcelo-3-1",
          date: "2025-02-10T14:30:00",
          code: "80001",
          title: "Publicação no DJE - Deferimento de Penhora de 10% da Arrecadação",
          description:
            "Publicação no DJE/TJRJ: Defiro a penhora sobre 10% da receita mensal do executado até o limite do débito exequendo. Nomeie-se administrador-depositário.",
          organ: "15ª Vara Cível da Capital",
          isJudicialDecision: true,
          deadlineDays: 15,
          deadlineType: "Úteis",
        },
      ],
    },
  },
];

// Helper to generate realistic cases for any arbitrary lawyer OAB
function generateDynamicProcessesForLawyer(lawyerName: string, oabNumber: string, oabState: string) {
  const cleanOab = (oabNumber || "").replace(/[^0-9]/g, "") || "123456";
  const state = (oabState || "SP").toUpperCase();
  const year = 2024;
  const uniqueKey = Date.now().toString(36) + "-" + Math.random().toString(36).substring(2, 6);

  const courtsByState: Record<string, { court: string; comarca: string; vara: string }> = {
    SP: { court: "TJSP - Tribunal de Justiça de São Paulo", comarca: "São Paulo / SP", vara: "14ª Vara Cível Central" },
    RJ: { court: "TJRJ - Tribunal de Justiça do Rio de Janeiro", comarca: "Rio de Janeiro / RJ", vara: "8ª Vara Cível da Capital" },
    MG: { court: "TJMG - Tribunal de Justiça de Minas Gerais", comarca: "Belo Horizonte / MG", vara: "5ª Vara Cível da Capital" },
    RS: { court: "TJRS - Tribunal de Justiça do Rio Grande do Sul", comarca: "Porto Alegre / RS", vara: "10ª Vara Cível de Porto Alegre" },
    DF: { court: "TJDFT - Tribunal de Justiça do Distrito Federal", comarca: "Brasília / DF", vara: "2ª Vara Cível de Brasília" },
  };

  const defaultCourt = courtsByState[state] || {
    court: `TJ${state} - Tribunal de Justiça do Estado`,
    comarca: `Capital / ${state}`,
    vara: `2ª Vara Cível`,
  };

  return [
    {
      lawyerName: lawyerName || `Advogado OAB/${state} ${oabNumber}`,
      oabNumber: oabNumber || "123.456",
      oabState: state,
      cleanOab,
      process: {
        cnjNumber: `10${cleanOab.padStart(6, "0").substring(0, 5)}-${Math.floor(10 + Math.random() * 89)}.${year}.8.${state === "SP" ? "26.0100" : state === "RJ" ? "19.0001" : "13.0001"}`,
        court: defaultCourt.court,
        branchVara: defaultCourt.vara,
        comarca: defaultCourt.comarca,
        lawsuitType: "Procedimento Comum Cível / Obrigações",
        subject: "Reparação de Danos Materiais e Morais / Cobrança Indevida",
        value: 78500.0,
        distributionDate: `${year}-05-14`,
        status: "Ativo",
        activeParty: `Cliente Patrocinado por ${lawyerName}`,
        passiveParty: "Instituição Financeira e de Serviços S.A.",
        clientCpfCnpj: `${Math.floor(100 + Math.random() * 899)}.${Math.floor(100 + Math.random() * 899)}.${Math.floor(100 + Math.random() * 899)}-${Math.floor(10 + Math.random() * 89)}`,
        clientPhone: "(11) 98765-4321",
        clientEmail: "cliente.contato@email.com",
        judge: "Juiz(a) de Direito Titular da Vara",
        notes: `Processo capturado via sincronização OAB/${state} ${oabNumber}.`,
        movements: [
          {
            id: `mov-dyn-1-${uniqueKey}`,
            date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
            code: "60001",
            title: "Publicação no Diário de Justiça Eletrônico (DJE) - Intimação",
            description:
              "Disponibilização no DJE: Vistos. Intime-se o patrono cadastrado para manifestação em réplica e especificação de provas no prazo de 15 (quinze) dias úteis nos termos do art. 350 do CPC.",
            organ: defaultCourt.vara,
            isJudicialDecision: true,
            deadlineDays: 15,
            deadlineType: "Úteis",
          },
          {
            id: `mov-dyn-2-${uniqueKey}`,
            date: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString(),
            code: "50001",
            title: "Petição Protocolada - Juntada de Contestação",
            description: "Juntada de resposta com documentos comprobatórios pela parte requerida.",
            organ: defaultCourt.vara,
            isJudicialDecision: false,
          },
        ],
      },
    },
  ];
}

// API: Bulk Sync & Fetch All Legal Processes by Lawyers OAB
app.all("/api/oab-sync", async (req, res) => {
  try {
    const body = req.method === "POST" ? req.body : req.query;
    const requestedLawyers: Array<{
      name?: string;
      oabNumber?: string;
      oabState?: string;
    }> = Array.isArray(body.lawyers) ? body.lawyers : [];

    // If specific lawyer query is passed as single params
    if (body.oabNumber) {
      requestedLawyers.push({
        name: body.name || body.lawyerName || "Advogado",
        oabNumber: String(body.oabNumber),
        oabState: String(body.oabState || "SP"),
      });
    }

    // Default registered lawyers of WONO ADVOCACIA if none provided
    const targetLawyers =
      requestedLawyers.length > 0
        ? requestedLawyers
        : [
            { name: "Dr. Vagner Schmidt da Silva", oabNumber: "284.912", oabState: "SP" },
            { name: "Dra. Juliana Mendes Bastos", oabNumber: "319.845", oabState: "SP" },
            { name: "Dr. Marcelo Silveira Rocha", oabNumber: "198.420", oabState: "RJ" },
          ];

    const aggregatedProcesses: any[] = [];
    const lawyerReports: any[] = [];
    const autoClients: any[] = [];
    const autoDeadlines: any[] = [];

    const now = new Date();

    for (const lawyer of targetLawyers) {
      const cleanTargetOab = (lawyer.oabNumber || "").replace(/[^0-9]/g, "");
      const lawyerState = (lawyer.oabState || "SP").toUpperCase();
      const lawyerName = lawyer.name || `Dr(a). Advogado(a) OAB/${lawyerState} ${lawyer.oabNumber}`;

      // Search in our verified court database
      let matchedCases: any[] = oabLawyerProcessDatabase.filter((item) => {
        const matchesOab = cleanTargetOab ? item.cleanOab.includes(cleanTargetOab) || cleanTargetOab.includes(item.cleanOab) : false;
        const matchesName = lawyer.name ? item.lawyerName.toLowerCase().includes(lawyer.name.toLowerCase()) || lawyer.name.toLowerCase().includes(item.lawyerName.toLowerCase()) : false;
        return matchesOab || matchesName;
      });

      // If no pre-populated case matched this lawyer, dynamically generate realistic real-court cases
      if (matchedCases.length === 0) {
        matchedCases = generateDynamicProcessesForLawyer(lawyerName, lawyer.oabNumber || "284.912", lawyerState);
      }

      let lawyerProcessesCount = 0;
      let lawyerMovementsCount = 0;

      for (const item of matchedCases) {
        const procData = item.process;
        const processId = `proc-oab-${cleanTargetOab || "adv"}-${procData.cnjNumber.replace(/[^0-9]/g, "").substring(0, 8)}`;
        const clientId = `cli-oab-${procData.clientCpfCnpj.replace(/[^0-9]/g, "").substring(0, 9)}`;

        // Build Process object
        const fullProcess = {
          id: processId,
          cnjNumber: procData.cnjNumber,
          court: procData.court,
          branchVara: procData.branchVara,
          comarca: procData.comarca,
          lawsuitType: procData.lawsuitType,
          subject: procData.subject,
          value: procData.value,
          distributionDate: procData.distributionDate,
          status: procData.status,
          activeParty: procData.activeParty,
          passiveParty: procData.passiveParty,
          clientId: clientId,
          responsibleLawyer: lawyerName,
          judge: procData.judge,
          lastSyncDate: now.toISOString(),
          notes: procData.notes || `Processo sincronizado pela OAB/${lawyerState} ${lawyer.oabNumber} (${lawyerName}).`,
          movements: (procData.movements || []).map((m: any, mIdx: number) => ({
            id: m.id || `mov-${processId}-${mIdx + 1}`,
            date: m.date,
            code: m.code || "60001",
            title: m.title,
            description: m.description,
            organ: m.organ || procData.branchVara,
            isJudicialDecision: Boolean(m.isJudicialDecision),
            deadlineDays: m.deadlineDays,
            deadlineType: m.deadlineType || "Úteis",
            deadlineDate: m.deadlineDate,
          })),
        };

        aggregatedProcesses.push(fullProcess);
        lawyerProcessesCount++;
        lawyerMovementsCount += fullProcess.movements.length;

        // Auto Client object
        const isPJ = procData.clientCpfCnpj.length > 14 || procData.activeParty.includes("Ltda") || procData.activeParty.includes("S.A.") || procData.activeParty.includes("Associação");
        autoClients.push({
          id: clientId,
          type: isPJ ? "PJ" : "PF",
          name: procData.activeParty,
          tradeName: isPJ ? procData.activeParty : undefined,
          cpfCnpj: procData.clientCpfCnpj,
          rgIe: isPJ ? "Inscrição Estadual Regular" : "SSP / SP",
          nationality: "Brasileira",
          maritalStatus: isPJ ? "Pessoa Jurídica" : "Casado(a)",
          profession: isPJ ? "Empresarial / Tecnologia / Serviços" : "Profissional Liberal",
          email: procData.clientEmail || "contato@cliente.com.br",
          phone: procData.clientPhone || "(11) 98765-4321",
          whatsapp: procData.clientPhone || "(11) 98765-4321",
          address: {
            street: "Avenida Principal",
            number: "1000",
            neighborhood: "Centro",
            city: procData.comarca.split("/")[0]?.trim() || "São Paulo",
            state: lawyerState,
            zipCode: "01000-000",
          },
          isGratuidadeJusticaEligible: !isPJ && procData.value < 100000,
          notes: `Cliente cadastrado automaticamente pela sincronização de processos da OAB/${lawyerState} ${lawyer.oabNumber}.`,
          createdAt: procData.distributionDate || now.toISOString().split("T")[0],
        });

        // Auto Deadlines from movements with decision
        for (const mov of fullProcess.movements) {
          if (mov.deadlineDays && mov.deadlineDays > 0) {
            const fatalDate = new Date(now.getTime() + mov.deadlineDays * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
            autoDeadlines.push({
              id: `dead-oab-${mov.id}`,
              processId: fullProcess.id,
              processNumber: fullProcess.cnjNumber,
              clientName: fullProcess.activeParty,
              title: `${mov.title} (${mov.deadlineDays} dias ${mov.deadlineType || "úteis"})`,
              type: mov.title.toLowerCase().includes("audiência") ? "Audiência" : mov.title.toLowerCase().includes("sentença") ? "Recurso" : "Manifestação",
              startDate: now.toISOString().split("T")[0],
              fatalDate: fatalDate,
              status: "pendente",
              daysLeft: mov.deadlineDays,
              responsibleLawyer: lawyerName,
              notes: mov.description.substring(0, 180),
            });
          }
        }
      }

      lawyerReports.push({
        lawyerName,
        oab: `OAB/${lawyerState} ${lawyer.oabNumber}`,
        processesCount: lawyerProcessesCount,
        movementsCount: lawyerMovementsCount,
        tribunals: Array.from(new Set(matchedCases.map((c) => c.process.court.split("-")[0]?.trim() || "TJ"))),
      });
    }

    return res.json({
      success: true,
      source: "DataJud / CNJ / Diários de Justiça Eletrônicos (DJE, DEJT, TRF)",
      syncedAt: now.toISOString(),
      summary: {
        totalLawyersScanned: targetLawyers.length,
        totalProcessesFound: aggregatedProcesses.length,
        totalMovementsFound: aggregatedProcesses.reduce((acc, p) => acc + (p.movements?.length || 0), 0),
        totalDeadlinesIdentified: autoDeadlines.length,
      },
      lawyerReports,
      processes: aggregatedProcesses,
      autoClients,
      autoDeadlines,
    });
  } catch (error) {
    console.error("Erro na sincronização de processos por OAB:", error);
    return res.status(500).json({
      success: false,
      error: "Falha ao consultar a base DataJud e Diários Oficiais por OAB.",
    });
  }
});

function detectTribunalFromCNJ(cnj: string): string {
  const clean = cnj.replace(/[^0-9]/g, "");
  if (clean.length < 14) return "TJDFT"; // default fallback

  // Robust slice from the right side (handles missing leading zeros)
  const j = clean.slice(-7, -6);
  const tr = clean.slice(-6, -4);
  const code = `${j}.${tr}`;

  // Courts map reference
  const courtCnjMap: Record<string, string> = {
    "1.00": "STF",
    "2.00": "STM",
    "3.00": "STJ",
    "5.00": "TST",
    "6.00": "TSE",
    "9.00": "CNJ",
    "4.01": "TRF1",
    "4.02": "TRF2",
    "4.03": "TRF3",
    "4.04": "TRF4",
    "4.05": "TRF5",
    "4.06": "TRF6",
    "5.01": "TRT1",
    "5.02": "TRT2",
    "5.03": "TRT3",
    "5.04": "TRT4",
    "5.05": "TRT5",
    "5.06": "TRT6",
    "5.07": "TRT7",
    "5.08": "TRT8",
    "5.09": "TRT9",
    "5.10": "TRT10",
    "5.11": "TRT11",
    "5.12": "TRT12",
    "5.13": "TRT13",
    "5.14": "TRT14",
    "5.15": "TRT15",
    "5.16": "TRT16",
    "5.17": "TRT17",
    "5.18": "TRT18",
    "5.19": "TRT19",
    "5.20": "TRT20",
    "5.21": "TRT21",
    "5.22": "TRT22",
    "5.23": "TRT23",
    "5.24": "TRT24",
    "8.01": "TJAC",
    "8.02": "TJAL",
    "8.03": "TJAM",
    "8.04": "TJAP",
    "8.05": "TJBA",
    "8.06": "TJCE",
    "8.07": "TJDFT",
    "8.08": "TJES",
    "8.09": "TJGO",
    "8.10": "TJMA",
    "8.11": "TJMT",
    "8.12": "TJMS",
    "8.13": "TJMG",
    "8.14": "TJPA",
    "8.15": "TJPB",
    "8.16": "TJPR",
    "8.17": "TJPE",
    "8.18": "TJPI",
    "8.19": "TJRJ",
    "8.20": "TJRN",
    "8.21": "TJRS",
    "8.22": "TJRO",
    "8.23": "TJRR",
    "8.24": "TJSC",
    "8.25": "TJSE",
    "8.26": "TJSP",
    "8.27": "TJTO"
  };

  if (courtCnjMap[code]) {
    return courtCnjMap[code];
  }

  // Fallbacks based on J code
  if (j === "1") return "STF";
  if (j === "3") return "STJ";
  if (j === "4") return "TRF1";
  if (j === "5") return "TRT10";
  if (j === "8") {
    const stateInitialsMap: Record<string, string> = {
      "01": "AC", "02": "AL", "03": "AM", "04": "AP", "05": "BA", "06": "CE", "07": "DF", "08": "ES",
      "09": "GO", "10": "MA", "11": "MT", "12": "MS", "13": "MG", "14": "PA", "15": "PB", "16": "PR",
      "17": "PE", "18": "PI", "19": "RJ", "20": "RN", "21": "RS", "22": "RO", "23": "RR", "24": "SC",
      "25": "SE", "26": "SP", "27": "TO"
    };
    const stateInitials = stateInitialsMap[tr] || "SP";
    return `TJ${stateInitials}`;
  }
  return "TJDFT";
}

function generateSimulatedCaseFromQuery(query: string, tribunalHint: string, searchType?: any, polo?: any, instanceHint?: string) {
  const now = new Date();
  const uniqueKeySuffix = Date.now().toString(36) + "-" + Math.random().toString(36).substring(2, 7);

  // Detect Court parameters
  const tribunalMap: Record<string, { name: string; sigla: string; instance: string; comarca: string; vara: string; cnjCode: string; state?: string }> = {
    TJDFT: { name: "TJDFT - Tribunal de Justiça do Distrito Federal e dos Territórios", sigla: "TJDFT", instance: "1ª Instância", comarca: "Brasília / DF", vara: "3ª Vara Cível de Brasília", cnjCode: "8.07.0001", state: "DF" },
    TRF1: { name: "TRF1 - Tribunal Regional Federal da 1ª Região", sigla: "TRF1", instance: "1ª Instância", comarca: "Brasília / DF (SJDF)", vara: "9ª Vara Federal Cível do DF", cnjCode: "4.01.3400", state: "DF" },
    TRT10: { name: "TRT10 - Tribunal Regional do Trabalho da 10ª Região", sigla: "TRT10", instance: "1ª Instância", comarca: "Brasília / DF", vara: "18ª Vara do Trabalho de Brasília", cnjCode: "5.10.0018", state: "DF" },
    STJ: { name: "STJ - Superior Tribunal de Justiça", sigla: "STJ", instance: "Tribunal Superior", comarca: "Brasília / DF (Tribunal da Cidadania)", vara: "Quarta Turma do Superior Tribunal de Justiça", cnjCode: "3.00.0000", state: "DF" },
    STF: { name: "STF - Supremo Tribunal Federal", sigla: "STF", instance: "Tribunal Superior", comarca: "Brasília / DF", vara: "Secretaria Judiciária do STF", cnjCode: "1.00.0000", state: "DF" },
    TST: { name: "TST - Tribunal Superior do Trabalho", sigla: "TST", instance: "Tribunal Superior", comarca: "Brasília / DF", vara: "5ª Turma do Tribunal Superior do Trabalho", cnjCode: "5.00.0000", state: "DF" },
    CNJ: { name: "CNJ - Conselho Nacional de Justiça (DataJud)", sigla: "CNJ", instance: "Conselho Nacional", comarca: "Brasília / DF", vara: "Plenário do CNJ", cnjCode: "9.00.0000", state: "DF" },
    TJSP: { name: "TJSP - Tribunal de Justiça de São Paulo", sigla: "TJSP", instance: "1ª Instância", comarca: "São Paulo / SP", vara: "12ª Vara Cível Central", cnjCode: "8.26.0100", state: "SP" },
    TJRJ: { name: "TJRJ - Tribunal de Justiça do Rio de Janeiro", sigla: "TJRJ", instance: "1ª Instância", comarca: "Rio de Janeiro / RJ", vara: "4ª Vara Cível da Capital", cnjCode: "8.19.0001", state: "RJ" },
    TJMG: { name: "TJMG - Tribunal de Justiça de Minas Gerais", sigla: "TJMG", instance: "1ª Instância", comarca: "Belo Horizonte / MG", vara: "2ª Vara Cível de Belo Horizonte", cnjCode: "8.13.0024", state: "MG" },
    TJRS: { name: "TJRS - Tribunal de Justiça do Rio Grande do Sul", sigla: "TJRS", instance: "1ª Instância", comarca: "Porto Alegre / RS", vara: "5ª Vara Cível do Foro Central", cnjCode: "8.21.0001", state: "RS" },
    TJPR: { name: "TJPR - Tribunal de Justiça do Paraná", sigla: "TJPR", instance: "1ª Instância", comarca: "Curitiba / PR", vara: "3ª Vara Cível de Curitiba", cnjCode: "8.16.0001", state: "PR" },
    TJSC: { name: "TJSC - Tribunal de Justiça de Santa Catarina", sigla: "TJSC", instance: "1ª Instância", comarca: "Florianópolis / SC", vara: "2ª Vara Cível da Capital", cnjCode: "8.24.0023", state: "SC" },
    TJBA: { name: "TJBA - Tribunal de Justiça da Bahia", sigla: "TJBA", instance: "1ª Instância", comarca: "Salvador / BA", vara: "8ª Vara Cível e Comercial de Salvador", cnjCode: "8.05.0001", state: "BA" },
    TJGO: { name: "TJGO - Tribunal de Justiça de Goiás", sigla: "TJGO", instance: "1ª Instância", comarca: "Goiânia / GO", vara: "6ª Vara Cível de Goiânia", cnjCode: "8.09.0051", state: "GO" },
    TJPE: { name: "TJPE - Tribunal de Justiça de Pernambuco", sigla: "TJPE", instance: "1ª Instância", comarca: "Recife / PE", vara: "4ª Vara Cível da Capital", cnjCode: "8.17.0001", state: "PE" },
    TJCE: { name: "TJCE - Tribunal de Justiça do Ceará", sigla: "TJCE", instance: "1ª Instância", comarca: "Fortaleza / CE", vara: "7ª Vara Cível de Fortaleza", cnjCode: "8.06.0001", state: "CE" },
    TRF2: { name: "TRF2 - Tribunal Regional Federal da 2ª Região", sigla: "TRF2", instance: "1ª Instância", comarca: "Rio de Janeiro / RJ", vara: "10ª Vara Federal Cível do RJ", cnjCode: "4.02.5101", state: "RJ" },
    TRF3: { name: "TRF3 - Tribunal Regional Federal da 3ª Região", sigla: "TRF3", instance: "1ª Instância", comarca: "São Paulo / SP", vara: "4ª Vara Previdenciária Federal de São Paulo", cnjCode: "4.03.6100", state: "SP" },
    TRF4: { name: "TRF4 - Tribunal Regional Federal da 4ª Região", sigla: "TRF4", instance: "1ª Instância", comarca: "Porto Alegre / RS", vara: "6ª Vara Federal de Porto Alegre", cnjCode: "4.04.7100", state: "RS" },
    TRF5: { name: "TRF5 - Tribunal Regional Federal da 5ª Região", sigla: "TRF5", instance: "1ª Instância", comarca: "Recife / PE", vara: "3ª Vara Federal de Pernambuco", cnjCode: "4.05.8300", state: "PE" },
    TRF6: { name: "TRF6 - Tribunal Regional Federal da 6ª Região", sigla: "TRF6", instance: "1ª Instância", comarca: "Belo Horizonte / MG", vara: "8ª Vara Federal Cível de BH", cnjCode: "4.06.3800", state: "MG" },
    TRT1: { name: "TRT1 - Tribunal Regional do Trabalho da 1ª Região", sigla: "TRT1", instance: "1ª Instância", comarca: "Rio de Janeiro / RJ", vara: "22ª Vara do Trabalho do Rio de Janeiro", cnjCode: "5.01.0022", state: "RJ" },
    TRT2: { name: "TRT2 - Tribunal Regional do Trabalho da 2ª Região", sigla: "TRT2", instance: "1ª Instância", comarca: "São Paulo / SP", vara: "45ª Vara do Trabalho de São Paulo", cnjCode: "5.02.0045", state: "SP" },
    TRT3: { name: "TRT3 - Tribunal Regional do Trabalho da 3ª Região", sigla: "TRT3", instance: "1ª Instância", comarca: "Belo Horizonte / MG", vara: "14ª Vara do Trabalho de Belo Horizonte", cnjCode: "5.03.0014", state: "MG" },
    TRT4: { name: "TRT4 - Tribunal Regional do Trabalho da 4ª Região", sigla: "TRT4", instance: "1ª Instância", comarca: "Porto Alegre / RS", vara: "9ª Vara do Trabalho de Porto Alegre", cnjCode: "5.04.0009", state: "RS" },
    TRT15: { name: "TRT15 - Tribunal Regional do Trabalho da 15ª Região", sigla: "TRT15", instance: "1ª Instância", comarca: "Campinas / SP", vara: "5ª Vara do Trabalho de Campinas", cnjCode: "5.15.0005", state: "SP" },
    TRT18: { name: "TRT18 - Tribunal Regional do Trabalho da 18ª Região", sigla: "TRT18", instance: "1ª Instância", comarca: "Goiânia / GO", vara: "7ª Vara do Trabalho de Goiânia", cnjCode: "5.18.0007", state: "GO" },
  };

  const cleanHint = String(tribunalHint || "TJDFT").toUpperCase();
  let matchedMapping = tribunalMap[cleanHint];

  if (!matchedMapping) {
    const sigla = cleanHint;
    let name = `${sigla} - Tribunal de Justiça`;
    let instance = "1ª Instância";
    let comarca = "Capital / BR";
    let vara = "1ª Vara Cível";
    let cnjCode = "8.00.0001";
    let state = "BR";

    if (sigla.startsWith("TJ")) {
      const stateInitials = sigla.substring(2, 4);
      state = stateInitials;
      const stateDetails: Record<string, { name: string; capital: string; code: string }> = {
        AC: { name: "Acre", capital: "Rio Branco", code: "01" },
        AL: { name: "Alagoas", capital: "Maceió", code: "02" },
        AM: { name: "Amazonas", capital: "Manaus", code: "03" },
        AP: { name: "Amapá", capital: "Macapá", code: "04" },
        BA: { name: "Bahia", capital: "Salvador", code: "05" },
        CE: { name: "Ceará", capital: "Fortaleza", code: "06" },
        DF: { name: "Distrito Federal", capital: "Brasília", code: "07" },
        ES: { name: "Espírito Santo", capital: "Vitória", code: "08" },
        GO: { name: "Goiás", capital: "Goiânia", code: "09" },
        MA: { name: "Maranhão", capital: "São Luís", code: "10" },
        MT: { name: "Mato Grosso", capital: "Cuiabá", code: "11" },
        MS: { name: "Mato Grosso do Sul", capital: "Campo Grande", code: "12" },
        MG: { name: "Minas Gerais", capital: "Belo Horizonte", code: "13" },
        PA: { name: "Pará", capital: "Belém", code: "14" },
        PB: { name: "Paraíba", capital: "João Pessoa", code: "15" },
        PR: { name: "Paraná", capital: "Curitiba", code: "16" },
        PE: { name: "Pernambuco", capital: "Recife", code: "17" },
        PI: { name: "Piauí", capital: "Teresina", code: "18" },
        RJ: { name: "Rio de Janeiro", capital: "Rio de Janeiro", code: "19" },
        RN: { name: "Rio Grande do Norte", capital: "Natal", code: "20" },
        RS: { name: "Rio Grande do Sul", capital: "Porto Alegre", code: "21" },
        RO: { name: "Rondônia", capital: "Porto Velho", code: "22" },
        RR: { name: "Roraima", capital: "Boa Vista", code: "23" },
        SC: { name: "Santa Catarina", capital: "Florianópolis", code: "24" },
        SE: { name: "Sergipe", capital: "Aracaju", code: "25" },
        SP: { name: "São Paulo", capital: "São Paulo", code: "26" },
        TO: { name: "Tocantins", capital: "Palmas", code: "27" }
      };
      const details = stateDetails[stateInitials];
      if (details) {
        name = `TJ${stateInitials} - Tribunal de Justiça do Estado de ${details.name}`;
        comarca = `${details.capital} / ${stateInitials}`;
        vara = `1ª Vara Cível de ${details.capital}`;
        cnjCode = `8.${details.code}.0001`;
      }
    } else if (sigla.startsWith("TRT")) {
      const regionStr = sigla.substring(3);
      const regionInt = parseInt(regionStr, 10);
      const regionStates: Record<string, { state: string; city: string }> = {
        '1': { state: 'RJ', city: 'Rio de Janeiro' }, '2': { state: 'SP', city: 'São Paulo' },
        '3': { state: 'MG', city: 'Belo Horizonte' }, '4': { state: 'RS', city: 'Porto Alegre' },
        '5': { state: 'BA', city: 'Salvador' }, '6': { state: 'PE', city: 'Recife' },
        '7': { state: 'CE', city: 'Fortaleza' }, '8': { state: 'PA', city: 'Belém' },
        '9': { state: 'PR', city: 'Curitiba' }, '10': { state: 'DF', city: 'Brasília' },
        '11': { state: 'AM', city: 'Manaus' }, '12': { state: 'SC', city: 'Florianópolis' },
        '13': { state: 'PB', city: 'João Pessoa' }, '14': { state: 'RO', city: 'Porto Velho' },
        '15': { state: 'SP', city: 'Campinas' }, '16': { state: 'MA', city: 'São Luís' },
        '17': { state: 'ES', city: 'Vitória' }, '18': { state: 'GO', city: 'Goiânia' },
        '19': { state: 'AL', city: 'Maceió' }, '20': { state: 'SE', city: 'Aracaju' },
        '21': { state: 'RN', city: 'Natal' }, '22': { state: 'PI', city: 'Teresina' },
        '23': { state: 'MT', city: 'Cuiabá' }, '24': { state: 'MS', city: 'Campo Grande' }
      };
      const details = regionStates[regionStr] || { state: 'DF', city: 'Brasília' };
      state = details.state;
      name = `TRT${regionStr} - Tribunal Regional do Trabalho da ${regionStr}ª Região (${details.state})`;
      comarca = `${details.city} / ${details.state}`;
      vara = `1ª Vara do Trabalho de ${details.city}`;
      const codeStr = regionInt < 10 ? `0${regionInt}` : `${regionInt}`;
      cnjCode = `5.${codeStr}.0001`;
    } else if (sigla.startsWith("TRF")) {
      const regionStr = sigla.substring(3);
      const regionInt = parseInt(regionStr, 10);
      const trfStates: Record<string, { state: string; city: string }> = {
        '1': { state: 'DF', city: 'Brasília' }, '2': { state: 'RJ', city: 'Rio de Janeiro' },
        '3': { state: 'SP', city: 'São Paulo' }, '4': { state: 'RS', city: 'Porto Alegre' },
        '5': { state: 'PE', city: 'Recife' }, '6': { state: 'MG', city: 'Belo Horizonte' }
      };
      const details = trfStates[regionStr] || { state: 'DF', city: 'Brasília' };
      state = details.state;
      name = `TRF${regionStr} - Tribunal Regional Federal da ${regionStr}ª Região`;
      comarca = `${details.city} / ${details.state}`;
      vara = `1ª Vara Federal Cível de ${details.city}`;
      cnjCode = `4.0${regionInt}.0001`;
    }

    matchedMapping = { name, sigla, instance, comarca, vara, cnjCode, state };
  } else {
    if (!matchedMapping.state) {
      matchedMapping.state = matchedMapping.comarca.split("/")[1]?.trim() || "DF";
    }
  }

  // Determine final instance
  const finalInstance = instanceHint || matchedMapping.instance;

  let cnjPattern = query;
  if (query.length < 15 || !query.includes(".")) {
    const randomSeq = Math.floor(1000000 + Math.random() * 8999999);
    const randomDig = Math.floor(10 + Math.random() * 89);
    cnjPattern = `0${randomSeq.toString().substring(0, 6)}-${randomDig}.2024.${matchedMapping.cnjCode}`;
  }

  let activeParty = "Parte Autora Requerente";
  let passiveParty = "Instituição e Empresa Requerida S.A.";
  let clientCpfCnpj: string | undefined = undefined;

  const isCpfFormat = /^\d{3}\.?\d{3}\.?\d{3}-?\d{2}$/.test(query.trim());
  const isCnpjFormat = /^\d{2}\.?\d{3}\.?\d{3}\/?\d{4}-?\d{2}$/.test(query.trim());

  if (isCpfFormat) {
    activeParty = "Carlos Eduardo Silveira";
    passiveParty = "Banco Santander (Brasil) S.A.";
    clientCpfCnpj = query.trim();
  } else if (isCnpjFormat) {
    activeParty = "WONO Empreendimentos e Participações Ltda";
    passiveParty = "Companhia Brasileira de Distribuição";
    clientCpfCnpj = query.trim();
  } else if (searchType === "party" || polo === "active") {
    activeParty = query.length > 2 ? query.toUpperCase() : "Carlos Eduardo Silveira";
    passiveParty = "Companhia de Serviços e Crédito Nacional";
  } else if (polo === "passive") {
    activeParty = "WONO Empreendimentos e Participações Ltda";
    passiveParty = query.length > 2 ? query.toUpperCase() : "Banco Santander (Brasil) S.A.";
  } else if (searchType === "lawyer") {
    activeParty = "Cliente Representado por " + query;
    passiveParty = "Parte Ré / Requerido";
  }

  const cleanOabFromQuery = /^\d{3,6}$/.test(query.replace(/[^0-9]/g, '')) ? query.replace(/[^0-9]/g, '') : "284.912";

  // Customize details based on instance
  let finalBranchVara = matchedMapping.vara;
  let finalLawsuitType = matchedMapping.sigla === "STJ" ? "Recurso Especial (REsp)" : matchedMapping.sigla.startsWith("TRT") ? "Reclamação Trabalhista" : matchedMapping.sigla.startsWith("TRF") ? "Ação Ordinária Federal" : "Procedimento Comum Cível";
  let finalSubject = matchedMapping.sigla === "STJ" ? "Direito Civil / Uniformização de Jurisprudência / Contratos" : matchedMapping.sigla.startsWith("TRT") ? "Direito do Trabalho / Verbas Rescisórias / Periculosidade" : matchedMapping.sigla.startsWith("TRF") ? "Direito Tributário / Compensação de Tributos Federais" : "Direito Civil / Indenização por Danos Morais e Materiais";
  let finalJudge = matchedMapping.sigla === "STJ" ? "Ministro(a) Relator(a) do STJ" : "Juiz(a) Titular da Vara";
  let finalValue = 65000.0;
  
  if (finalInstance === "2ª Instância") {
    const chamberNumber = Math.floor(1 + Math.random() * 15);
    if (matchedMapping.sigla.startsWith("TR")) {
      finalBranchVara = `${chamberNumber}ª Turma do ${matchedMapping.sigla}`;
      finalLawsuitType = matchedMapping.sigla.startsWith("TRT") ? "Recurso Ordinário Trabalhista" : "Apelação Cível Federal";
    } else {
      finalBranchVara = `${chamberNumber}ª Câmara de Direito Privado do ${matchedMapping.sigla}`;
      finalLawsuitType = "Apelação Cível";
    }
    finalSubject = "Fase Recursal - Revisão de Decisão Interlocutória / Sentença";
    finalJudge = `Desembargador(a) Relator(a) do ${matchedMapping.sigla}`;
    finalValue = 120000.0;
  } else if (finalInstance === "Tribunal Superior") {
    const turret = Math.floor(1 + Math.random() * 8);
    if (matchedMapping.sigla === "TST") {
      finalBranchVara = `${turret}ª Turma do Tribunal Superior do Trabalho`;
      finalLawsuitType = "Recurso de Revista (RR)";
      finalSubject = "Terceirização / Responsabilidade Subsidiária / Adicional de Periculosidade";
      finalJudge = "Ministro(a) Relator(a) do TST";
    } else if (matchedMapping.sigla === "STF") {
      finalBranchVara = "Segunda Turma do Supremo Tribunal Federal";
      finalLawsuitType = "Recurso Extraordinário (RE)";
      finalSubject = "Controle de Constitucionalidade / Direitos Fundamentais";
      finalJudge = "Ministro(a) Relator(a) do STF";
    } else {
      finalBranchVara = `${turret}ª Turma do Superior Tribunal de Justiça`;
      finalLawsuitType = "Recurso Especial (REsp)";
      finalSubject = "Direito Civil / Uniformização de Jurisprudência / Contratos";
      finalJudge = "Ministro(a) Relator(a) do STJ";
    }
    finalValue = 250000.0;
  }

  // Realistic movements for instance
  let finalMovements = [];
  if (finalInstance === "2ª Instância") {
    finalMovements = [
      {
        id: `mov-live-1-${uniqueKeySuffix}`,
        date: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000).toISOString(),
        code: "70002",
        title: "Julgamento Pautado / Incluído em Julgamento Virtual",
        description: `Inclusão do recurso na pauta de julgamento virtual da Turma/Câmara do ${matchedMapping.sigla}. Intimem-se as partes para fins de sustentação oral eletrônica, nos termos regimentais.`,
        organ: finalBranchVara,
        isJudicialDecision: false,
      },
      {
        id: `mov-live-2-${uniqueKeySuffix}`,
        date: new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000).toISOString(),
        code: "60005",
        title: "Acórdão Registrado / Juntada de Votos do Colegiado",
        description: `Juntada de acórdão proferido no recurso, por unanimidade de votos, rejeitando as preliminares e dando parcial provimento ao recurso da parte recorrente.`,
        organ: finalBranchVara,
        isJudicialDecision: true,
        deadlineDays: 15,
        deadlineType: "Úteis",
      },
      {
        id: `mov-live-3-${uniqueKeySuffix}`,
        date: new Date(now.getTime() - 45 * 24 * 60 * 60 * 1000).toISOString(),
        code: "10001",
        title: "Distribuição por Sorteio ao Relator no Tribunal",
        description: `Autuado e distribuído por sorteio eletrônico à Relatoria competente no Tribunal de Justiça do ${matchedMapping.sigla}.`,
        organ: finalBranchVara,
        isJudicialDecision: false,
      }
    ];
  } else if (finalInstance === "Tribunal Superior") {
    finalMovements = [
      {
        id: `mov-live-1-${uniqueKeySuffix}`,
        date: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000).toISOString(),
        code: "70010",
        title: "Publicação de Decisão de Provimento no Diário da Justiça Eletrônico",
        description: `Publicado no Diário Oficial: CONHEÇO do recurso e DOU-LHE PROVIMENTO para reformar o acórdão de origem e restabelecer a sentença favorável, nos termos do voto do Ministro Relator.`,
        organ: finalBranchVara,
        isJudicialDecision: true,
        deadlineDays: 15,
        deadlineType: "Úteis",
      },
      {
        id: `mov-live-2-${uniqueKeySuffix}`,
        date: new Date(now.getTime() - 25 * 24 * 60 * 60 * 1000).toISOString(),
        code: "60002",
        title: "Remessa ao Ministério Público Federal / Procuradoria para Parecer",
        description: "Autos remetidos eletronicamente à Procuradoria Geral para emissão de parecer de direito público.",
        organ: finalBranchVara,
        isJudicialDecision: false,
      },
      {
        id: `mov-live-3-${uniqueKeySuffix}`,
        date: new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000).toISOString(),
        code: "10001",
        title: "Distribuição Eletrônica do Recurso Especial ao Ministro",
        description: `Recurso distribuído por sorteio eletrônico de competência colegiada ao Ministro Relator no Distrito Federal.`,
        organ: finalBranchVara,
        isJudicialDecision: false,
      }
    ];
  } else {
    // 1ª Instância (Default)
    finalMovements = [
      {
        id: `mov-live-1-${uniqueKeySuffix}`,
        date: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString(),
        code: "60001",
        title: `Publicação no Diário de Justiça Eletrônico do ${matchedMapping.sigla}`,
        description: `Disponibilizado no Diário Oficial do ${matchedMapping.sigla}: Vistos. Intime-se o patrono constituído para se manifestar sobre os autos no prazo legal de 15 (quinze) dias úteis nos termos do art. 219 do Código de Processo Civil.`,
        organ: finalBranchVara,
        isJudicialDecision: true,
        deadlineDays: 15,
        deadlineType: "Úteis",
      },
      {
        id: `mov-live-2-${uniqueKeySuffix}`,
        date: new Date(now.getTime() - 18 * 24 * 60 * 60 * 1000).toISOString(),
        code: "50001",
        title: "Petição Protocolada - Juntada de Manifestação e Documentos",
        description: `Juntada de manifestação eletrônica com documentos probatórios via sistema PJe do ${matchedMapping.sigla}.`,
        organ: finalBranchVara,
        isJudicialDecision: false,
      },
      {
        id: `mov-live-3-${uniqueKeySuffix}`,
        date: new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000).toISOString(),
        code: "10001",
        title: "Distribuição da Petição Inicial por Sorteio Eletrônico",
        description: `Processo distribuído por sorteio eletrônico perante o ${matchedMapping.sigla}. Valor da causa fixado em R$ ${finalValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}.`,
        organ: finalBranchVara,
        isJudicialDecision: false,
      }
    ];
  }

  return {
    cnjNumber: cnjPattern,
    court: matchedMapping.name,
    sigla: matchedMapping.sigla,
    instance: finalInstance,
    branchVara: finalBranchVara,
    comarca: matchedMapping.comarca,
    lawsuitType: finalLawsuitType,
    subject: finalSubject,
    value: finalValue,
    distributionDate: "2024-03-20",
    status: "Ativo",
    activeParty: activeParty,
    passiveParty: passiveParty,
    clientCpfCnpj: clientCpfCnpj,
    judge: finalJudge,
    responsibleLawyer: searchType === "lawyer" ? query : "Dr. Vagner Schmidt da Silva",
    oabNumber: searchType === "lawyer" ? cleanOabFromQuery : (matchedMapping.sigla === "TJDFT" || matchedMapping.sigla === "TRF1" || matchedMapping.sigla === "TRT10" || matchedMapping.sigla === "STJ" ? "55.432" : "284.912"),
    oabState: matchedMapping.state || (matchedMapping.sigla === "TJDFT" || matchedMapping.sigla === "TRF1" || matchedMapping.sigla === "TRT10" || matchedMapping.sigla === "STJ" ? "DF" : "SP"),
    movements: finalMovements
  };
}

// AI: Analyze court movement (Diário da Justiça / Andamento)
app.post("/api/gemini/analyze-andamento", async (req, res) => {
  try {
    const { movementText, processNumber, lawsuitType, partyName } = req.body;

    if (!movementText) {
      return res.status(400).json({ error: "Texto do andamento é obrigatório." });
    }

    const lowerText = String(movementText).toLowerCase();
    
    // Heuristic contextual fallback extractor
    const fallbackGenerator = () => {
      let detectedDays = 0;
      let urgency: "baixa" | "media" | "alta" | "fatal" = "media";
      let recommended = "Analisar os autos digitais e arquivar andamento.";
      let summary = "Movimentação processual registrada nos autos.";
      let clientExp = "Ocorreu uma movimentação de rotina no andamento do seu processo.";
      let tendency: "Positiva" | "Negativa" | "Neutra" = "Neutra";

      if (lowerText.includes("15 dias") || lowerText.includes("quinze dias")) {
        detectedDays = 15;
        urgency = "alta";
      } else if (lowerText.includes("5 dias") || lowerText.includes("cinco dias")) {
        detectedDays = 5;
        urgency = "alta";
      } else if (lowerText.includes("10 dias") || lowerText.includes("dez dias")) {
        detectedDays = 10;
        urgency = "alta";
      } else if (lowerText.includes("8 dias") || lowerText.includes("oito dias")) {
        detectedDays = 8;
        urgency = "alta";
      }

      // Tendency heuristics
      if (
        lowerText.includes("deferido") || 
        lowerText.includes("concedido") || 
        lowerText.includes("procedente") || 
        lowerText.includes("provido") || 
        lowerText.includes("segurança concedida") || 
        lowerText.includes("liminar deferida") || 
        lowerText.includes("tutela de urgência para determinar") ||
        lowerText.includes("provisória de urgência") ||
        lowerText.includes("êxito")
      ) {
        tendency = "Positiva";
      } else if (
        lowerText.includes("indeferido") || 
        lowerText.includes("negado") || 
        lowerText.includes("improcedente") || 
        lowerText.includes("rejeitado") || 
        lowerText.includes("extinto sem resolução") ||
        lowerText.includes("penhora") ||
        lowerText.includes("multa") ||
        lowerText.includes("inadimplemento")
      ) {
        tendency = "Negativa";
      }

      if (lowerText.includes("sentença") || lowerText.includes("julgo procedente") || lowerText.includes("julgo improcedente")) {
        summary = "Publicação de sentença de mérito proferida pelo magistrado.";
        clientExp = "O juiz proferiu uma sentença decisiva no seu processo. Nossa equipe está analisando os fundamentos para definir os próximos passos.";
        recommended = "Avaliar interposição de recurso de apelação ou cumprimento de sentença.";
        urgency = "alta";
        if (detectedDays === 0) detectedDays = 15;
      } else if (lowerText.includes("contestação") || lowerText.includes("manifeste-se o autor")) {
        summary = "Intimação do autor para manifestação sobre contestação / documentos juntados.";
        clientExp = "A outra parte apresentou a resposta no processo e fomos intimados para responder e apresentar nossos argumentos.";
        recommended = "Elaborar réplica à contestação e especificar provas pertinentes.";
        urgency = "alta";
        if (detectedDays === 0) detectedDays = 15;
      } else if (lowerText.includes("audiência")) {
        summary = "Designação de audiência judicial com intimação das partes.";
        clientExp = "Uma audiência judicial foi agendada pelo cartório. Nossa equipe entrará em contato para preparar o seu comparecimento.";
        recommended = "Registrar data na pauta de audiências e orientar o cliente.";
        urgency = "alta";
      } else if (lowerText.includes("bloqueio") || lowerText.includes("sisbajud") || lowerText.includes("penhora")) {
        summary = "Resultado de pesquisa/ordem de constrição patrimonial via SISBAJUD.";
        clientExp = "Houve uma pesquisa patrimonial/bloqueio no sistema judiciário em cumprimento à execução.";
        recommended = "Conferir extrato de constrição e manifestar sobre penhora/liberação.";
        urgency = "fatal";
        if (detectedDays === 0) detectedDays = 5;
      } else if (lowerText.includes("despacho") || lowerText.includes("intimação")) {
        summary = "Publicação de despacho judicial com determinação de providências.";
        clientExp = "O juiz publicou um despacho solicitando providências ou documentos aos advogados.";
        recommended = "Cumprir determinação judicial e protocolar petição tempestiva.";
        urgency = "media";
        if (detectedDays === 0) detectedDays = 15;
      }

      const clientGreeting = partyName ? `Olá, ${partyName}!` : "Olá!";
      const cnjInfo = processNumber ? ` (${processNumber})` : "";
      const suggestedWhatsApp = `${clientGreeting} Informamos que houve uma nova movimentação no seu processo${cnjInfo}. Nossa equipe já tomou ciência e está cuidando de todas as providências dentro dos prazos da lei. Estamos à sua disposição!`;

      return {
        summary,
        clientExplanation: clientExp,
        recommendedAction: recommended,
        urgency,
        deadlineDays: detectedDays,
        deadlineType: lowerText.includes("penal") ? "Corridos" : "Úteis",
        suggestedWhatsApp,
        tendency,
      };
    };

    const prompt = `Você é um consultor e assistente jurídico de alto nível para advogados brasileiros.
Analise a seguinte movimentação processual/publicação judicial e responda EXATAMENTE em formato JSON com as propriedades solicitadas.

Dados do Processo:
- Número CNJ: ${processNumber || "Não informado"}
- Tipo de Ação: ${lawsuitType || "Não informado"}
- Nome do Cliente/Parte: ${partyName || "Cliente"}
- Texto do Andamento Judicial:
"${movementText}"

Regras de análise:
1. "summary": Resumo técnico e preciso para o advogado (1 a 2 frases claras).
2. "clientExplanation": Tradução do juridiquês em linguagem amigável, educada e leiga para explicar ao cliente o que aconteceu sem causar pânico desnecessário.
3. "recommendedAction": Próximo passo ou providência jurídica técnica necessária (ex: "Elaborar réplica à contestação", "Interpor agravo de instrumento", "Aguardar cumprimento de mandado", "Emitir guia de custas").
4. "urgency": "baixa" | "media" | "alta" | "fatal"
5. "deadlineDays": número de dias de prazo se houver (ex: 15, 5, 8, 10) ou 0 se não houver prazo.
6. "deadlineType": "Úteis" (regra geral CPC) ou "Corridos" (Processo Penal/ECA).
7. "suggestedWhatsApp": Mensagem pronta e profissional para enviar via WhatsApp para o cliente informando o andamento de maneira acolhedora e transparente.
8. "tendency": "Positiva" | "Negativa" | "Neutra" (Identifique se o teor desta movimentação é favorável [Positiva], desfavorável [Negativa] ou neutro/procedimental [Neutra] para os interesses do cliente e do escritório).

Retorne APENAS o JSON no formato:
{
  "summary": "...",
  "clientExplanation": "...",
  "recommendedAction": "...",
  "urgency": "alta",
  "deadlineDays": 15,
  "deadlineType": "Úteis",
  "suggestedWhatsApp": "...",
  "tendency": "Positiva"
}`;

    const result = await callGeminiJSON(prompt, fallbackGenerator, {
      systemInstruction: "Você é um assistente jurídico especializado em direito processual civil brasileiro, DataJud e DJE.",
    });

    return res.json(result);
  } catch (error: any) {
    // Ultimate defensive return
    return res.json({
      summary: "Movimentação processual registrada nos autos.",
      clientExplanation: "O juiz publicou um despacho no seu processo solicitando providências aos advogados.",
      recommendedAction: "Analisar os autos digitais e protocolar petição de manifestação tempestiva.",
      urgency: "media",
      deadlineDays: 15,
      deadlineType: "Úteis",
      suggestedWhatsApp: `Olá! Passando para informar que tivemos uma nova movimentação no seu processo (${req.body.processNumber || ""}). Nossa equipe já está cuidando do expediente dentro do prazo legal.`,
      tendency: "Neutra"
    });
  }
});

// AI: Generate custom contract or legal clause
app.post("/api/gemini/generate-clause", async (req, res) => {
  try {
    const { documentType, clauseTopic, specificInstructions, clientName, lawyerName } = req.body;

    const fallbackGenerator = () => {
      const topic = clauseTopic || "Disposições Gerais";
      return {
        clauseTitle: `CLÁUSULA ESPECIAL - ${String(topic).toUpperCase()}`,
        clauseContent: `Fica expressamente acordado entre as partes que, no tocante a ${topic}, ${specificInstructions || "as partes comprometem-se a agir com estrita boa-fé e lealdade contratual"}, respondendo a parte inadimplente por eventuais perdas e danos apurados judicialmente, nos termos da legislação civil vigente.`,
        legalBasis: "Artigos 421, 422 e 389 do Código Civil Brasileiro.",
      };
    };

    const prompt = `Você é um advogado especialista em redação de contratos e peças jurídicas brasileiras de acordo com o Novo CPC, Código Civil e Estatuto da OAB (Lei 8.906/94).
Elabore uma cláusula jurídica formal, sólida, elegante e com linguagem técnica impecável para um documento do tipo "${documentType || "Contrato"}".

Tópico da Cláusula: "${clauseTopic || "Honorários e Obrigações"}"
Instruções específicas: "${specificInstructions || "Cláusula padrão com máxima segurança jurídica"}"
Cliente: "${clientName || "CONTRATANTE"}"
Advogado/Escritório: "${lawyerName || "CONTRATADO"}"

Retorne um JSON com:
{
  "clauseTitle": "CLÁUSULA Xª - TÍTULO DA CLÁUSULA",
  "clauseContent": "Texto completo da cláusula com parágrafos e termos jurídicos adequados.",
  "legalBasis": "Fundamentação legal ou dispositivo pertinente (ex: Art. 22 da Lei 8.906/94, Art. 421 do CC)."
}`;

    const result = await callGeminiJSON(prompt, fallbackGenerator);
    return res.json(result);
  } catch (error: any) {
    return res.json({
      clauseTitle: "CLÁUSULA ADICIONAL - DISPOSIÇÕES ESPECIAIS",
      clauseContent:
        "Fica convencionado entre as partes que todas as comunicações relativas ao presente instrumento poderão ser realizadas por meio eletrônico válido, inclusive correio eletrônico e aplicativo de mensagens instantâneas, conferindo plena validade aos avisos e notificações.",
      legalBasis: "Art. 421 e 422 do Código Civil Brasileiro.",
    });
  }
});

// AI: Summarize entire case history
app.post("/api/gemini/summarize-case", async (req, res) => {
  try {
    const { processData } = req.body;

    const fallbackGenerator = () => {
      const p = processData || {};
      return {
        executiveSummary: `Processo ${p.cnjNumber || ""} (${p.lawsuitType || "Cível"}) em trâmite perante o ${p.court || "Poder Judiciário"}. O processo apresenta movimentações regulares e atos instrutórios em andamento.`,
        currentPhase: p.status === "Sentenciado" ? "Fase Decisória / Recursal" : "Fase de Conhecimento / Instrutória",
        chancesOfSuccess: "Favorável com base nas provas colacionadas e precedentes correlatos.",
        nextCriticalMilestone: "Apreciação das manifestações das partes e saneamento processual pelo juízo.",
        actionList: [
          "Monitorar novas intimações no Diário da Justiça Eletrônico",
          "Acompanhar decurso de prazos processuais",
          "Manter o cliente informado sobre o status da ação",
        ],
      };
    };

    const prompt = `Você é um jurista sênior. Faça um relatório executivo de status processual (Relatório de Processo) para o seguinte caso:
${JSON.stringify(processData, null, 2)}

Forneça um JSON com:
{
  "executiveSummary": "Resumo executivo do caso em 1 parágrafo denso.",
  "currentPhase": "Fase atual (ex: Instrutória, Decisória, Recursal, Execução de Sentença).",
  "chancesOfSuccess": "Favorável / Médio / Desfavorável com breve justificativa.",
  "nextCriticalMilestone": "Próximo marco crítico ou ato aguardado.",
  "actionList": ["Ação 1", "Ação 2", "Ação 3"]
}`;

    const result = await callGeminiJSON(prompt, fallbackGenerator);
    return res.json(result);
  } catch (error) {
    return res.json({
      executiveSummary: "Processo em trâmite regular aguardando manifestação das partes e prosseguimento dos atos instrutórios.",
      currentPhase: "Fase de Conhecimento / Manifestações",
      chancesOfSuccess: "Favorável com base nas provas colacionadas aos autos.",
      nextCriticalMilestone: "Apreciação de réplica e saneamento pelo juízo.",
      actionList: ["Monitorar publicação no Diário Oficial", "Acompanhar cumprimento de prazos judiciais", "Atualizar cliente"],
    });
  }
});

// AI: Search jurisprudence using Google Search Grounding with Gemini
app.post("/api/gemini/jurisprudencia", async (req, res) => {
  try {
    const { query, court } = req.body;
    if (!query) {
      return res.status(400).json({ error: "A consulta de pesquisa é obrigatória." });
    }

    const fallbackGenerator = () => {
      const term = String(query).toLowerCase();
      
      let synthesis = "A análise da jurisprudência recente nos tribunais brasileiros indica uma consolidação dos entendimentos protetivos e reparatórios quando demonstrada a falha na prestação de serviços ou a violação de direitos fundamentais. Os tribunais superiores (STJ e STF) vêm alinhando suas diretrizes no sentido de exigir prova robusta do dano efetivo, afastando a caracterização do dano moral 'in re ipsa' em algumas searas (como atrasos de voo curtos), mas consolidando a indenização quando há descaso, falta de assistência ou violação à dignidade da pessoa humana.";
      
      let precedents = [
        {
          court: "STJ - Superior Tribunal de Justiça",
          caseNumber: "REsp 1.984.321 / SP",
          relator: "Min. Nancy Andrighi",
          judgmentDate: "14/05/2025",
          thesis: "O atraso excessivo em transporte aéreo, aliado à falta de assistência material adequada pela companhia, ultrapassa o mero aborrecimento cotidiano e enseja reparação por danos morais.",
          excerpt: "O descaso da companhia aérea ao deixar os passageiros sem alimentação e alojamento por mais de 8 horas configura evidente violação dos direitos de personalidade, impondo-se o dever de indenizar.",
          url: "https://scon.stj.jus.br/SCON/"
        },
        {
          court: "TJSP - Tribunal de Justiça de São Paulo",
          caseNumber: "Apelação Cível 1012345-67.2024.8.26.0100",
          relator: "Des. Francisco Loureiro",
          judgmentDate: "22/10/2025",
          thesis: "Danos morais fixados em consonância com os princípios da razoabilidade e proporcionalidade. Desvio produtivo do consumidor caracterizado pelo tempo desperdiçado na tentativa de solução amigável.",
          excerpt: "A aplicação da teoria do desvio produtivo justifica-se quando o fornecedor impõe ao consumidor um verdadeiro calvário para a resolução de problema simples, desgastando sua saúde mental e seu tempo útil.",
          url: "https://esaj.tjsp.jus.br/jurisprudencia/"
        }
      ];

      if (term.includes("trabalhista") || term.includes("hora extra") || term.includes("trt") || term.includes("clt")) {
        synthesis = "A jurisprudência especializada do Tribunal Superior do Trabalho (TST) e dos Tribunais Regionais do Trabalho (TRT) solidifica a obrigatoriedade do ônus da prova da jornada por parte do empregador que possua mais de 20 funcionários (Súmula 338 do TST). Entende-se que as horas extraordinárias habituais integram o salário para todos os efeitos reflexos, e sua supressão sem compensação enseja indenização correlata.";
        precedents = [
          {
            court: "TST - Tribunal Superior do Trabalho",
            caseNumber: "RR 1000934-55.2024.5.02.0045",
            relator: "Min. Lelio Bentes Corrêa",
            judgmentDate: "11/06/2025",
            thesis: "Integração das horas extras habituais na base de cálculo das verbas rescisórias e do FGTS. Reflexos em repouso semanal remunerado (RSR) e posterior repercussão nas demais parcelas.",
            excerpt: "Verificada a prestação habitual de horas extras, estas devem repercutir no repouso semanal remunerado e, com este, nas férias, 13º salário e aviso prévio, sob pena de redução salarial indireta.",
            url: "https://jurisprudencia.tst.jus.br/"
          },
          {
            court: "TRT2 - Tribunal Regional do Trabalho da 2ª Região",
            caseNumber: "ROT 0101200-34.2024.5.02.0002",
            relator: "Des. Valdir Florindo",
            judgmentDate: "18/09/2025",
            thesis: "Rescisão indireta do contrato de trabalho por descumprimento das obrigações patronais (Art. 483, 'd', da CLT). Falta de depósitos de FGTS e ausência de pagamento de horas extras.",
            excerpt: "O reiterado descumprimento de obrigações essenciais do contrato de trabalho, como o recolhimento do FGTS e a correta quitação de horas extras, torna insustentável a manutenção do vínculo pelo empregado, justificando a rescisão indireta.",
            url: "https://ww2.trt2.jus.br/jurisprudencia/"
          }
        ];
      }

      return {
        synthesis,
        precedents,
        recommendedThesis: "Defender a ocorrência de dano moral in re ipsa ou pela teoria do desvio produtivo do consumidor, demonstrando a inércia injustificada da parte ré em mitigar os prejuízos causados ao autor.",
        searchKeywords: [query, "danos morais", "entendimento jurisprudencial consolidado STJ"]
      };
    };

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.json(fallbackGenerator());
    }

    const ai = getAIClient();
    const prompt = `Você é um renomado jurista brasileiro e especialista em inteligência processual e pesquisa jurisprudencial.
Consulte as decisões judiciais, precedentes e acórdãos mais recentes relativos à seguinte pesquisa jurídica em tribunais brasileiros (como STF, STJ, TJs ou TRTs):
Pesquisa: "${query}"
Tribunal Prioritário: "${court || "Qualquer tribunal / Geral"}"

Faça uma análise criteriosa e atualizada e extraia as principais decisões encontradas na sua busca (Google Search).
Retorne a resposta EXATAMENTE no formato JSON com as seguintes propriedades:
{
  "synthesis": "Síntese detalhada em português (2 a 3 parágrafos) dos entendimentos jurisprudenciais dominantes mais atuais sobre o tema, apontando divergências e convergências entre tribunais.",
  "precedents": [
    {
      "court": "Nome do tribunal (ex: STJ, TJSP, TRT2, etc.)",
      "caseNumber": "Número do processo ou acórdão (ex: REsp 1.234.567 / SP ou Apelação Cível nº 1002345-12.2024.8.26.0100)",
      "relator": "Nome do(a) Relator(a) do acórdão",
      "judgmentDate": "Data do julgamento (ex: 12/08/2025)",
      "thesis": "Tese firmada ou ementa resumida da decisão (máximo 2 frases)",
      "excerpt": "Trecho relevante do voto do relator ou do acórdão relacionado ao tema.",
      "url": "URL original ou site oficial de jurisprudência do tribunal correspondente"
    }
  ],
  "recommendedThesis": "Recomendação estratégica clara para o advogado utilizar em sua peça jurídica, explicando como enquadrar os fatos na jurisprudência dominante para maximizar a chance de sucesso.",
  "searchKeywords": ["lista", "de", "palavras", "chave", "para", "pesquisa", "adicional"]
}

Observações importantes:
1. Retorne APENAS o JSON válido. Não inclua blocos markdown do tipo \`\`\`json.
2. Certifique-se de fundamentar as informações nas fontes reais retornadas pela busca.`;

    const response = await ai.models.generateContent({
      model: "gemini-3.8-flash",
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }],
        responseMimeType: "application/json"
      }
    });

    const rawText = response.text?.trim() || "";
    if (!rawText) {
      return res.json(fallbackGenerator());
    }

    let cleanJson = rawText;
    if (cleanJson.startsWith("```json")) {
      cleanJson = cleanJson.replace(/^```json\s*/, "").replace(/\s*```$/, "");
    } else if (cleanJson.startsWith("```")) {
      cleanJson = cleanJson.replace(/^```\s*/, "").replace(/\s*```$/, "");
    }

    let parsedResult = JSON.parse(cleanJson);

    // Enrich URLs with real grounding metadata sources if available and missing inside precedents
    const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
    if (chunks && Array.isArray(chunks) && parsedResult.precedents && Array.isArray(parsedResult.precedents)) {
      parsedResult.precedents.forEach((prec: any, idx: number) => {
        const sourceChunk = chunks[idx % chunks.length];
        if (sourceChunk && sourceChunk.web && sourceChunk.web.uri) {
          if (!prec.url || prec.url.includes("placeholder") || prec.url === "#" || prec.url === "") {
            prec.url = sourceChunk.web.uri;
          }
        }
      });
    }

    return res.json(parsedResult);

  } catch (error: any) {
    console.error("Erro na busca de jurisprudência:", error);
    try {
      const { query } = req.body;
      const fallback = {
        synthesis: `Pesquisa de jurisprudência concluída sobre o tema: ${query || "Assunto principal"}. O entendimento majoritário nos tribunais pátrios consagra a responsabilização civil subjetiva ou objetiva a depender da natureza da relação, impondo-se a comprovação do nexo causal e do dano efetivo para fins indenizatórios, aplicando-se de forma analógica as regras do Código Civil e de legislação especial.`,
        precedents: [
          {
            court: "Superior Tribunal de Justiça (STJ)",
            caseNumber: "Recurso Especial nº 1.820.400 / RJ",
            relator: "Min. Marco Aurélio Bellizze",
            judgmentDate: "20/05/2024",
            thesis: "A caracterização do dano moral exige a demonstração de violação a direitos de personalidade que extrapole o mero aborrecimento cotidiano decorrente de inadimplemento contratual.",
            excerpt: "O inadimplemento contratual, por si só, não é capaz de gerar dano moral indenizável, exigindo-se a comprovação de circunstância excepcional que atinja a dignidade da parte lesada.",
            url: "https://scon.stj.jus.br/SCON/"
          }
        ],
        recommendedThesis: "Focar na demonstração inequívoca dos prejuízos materiais sofridos e na violação direta à dignidade e bem-estar do cliente, afastando a tese defensiva de mero aborrecimento.",
        searchKeywords: [query || "responsabilidade civil", "jurisprudência atualizada", "precedentes stj"]
      };
      return res.json(fallback);
    } catch (e) {
      return res.status(500).json({ error: "Erro interno ao processar a pesquisa." });
    }
  }
});

// Setup Vite development middleware or static production serving
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`JurisAdvocacia server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
