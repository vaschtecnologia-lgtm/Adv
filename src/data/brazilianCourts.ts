export interface BrazilianCourt {
  sigla: string;
  name: string;
  instance: '1ª Instância' | '2ª Instância' | 'Tribunal Superior' | 'Conselho Nacional';
  branch: 'Estadual / Distrital' | 'Federal' | 'Trabalhista' | 'Eleitoral' | 'Militar' | 'Superior / Nacional';
  state?: string;
  codeCNJ?: string;
  pjeUrl: string;
  description: string;
  isFeatured?: boolean;
}

export interface CourtCategory {
  title: string;
  description: string;
  courts: BrazilianCourt[];
}

export const FEATURED_COURTS: BrazilianCourt[] = [
  {
    sigla: 'TJDFT',
    name: 'Tribunal de Justiça do Distrito Federal e dos Territórios',
    instance: '2ª Instância',
    branch: 'Estadual / Distrital',
    state: 'DF',
    codeCNJ: '8.07',
    pjeUrl: 'https://pje.tjdft.jus.br',
    description: 'Jurisdição distrital em Brasília e regiões administrativas do DF (1ª e 2ª Instâncias).',
    isFeatured: true,
  },
  {
    sigla: 'TRF1',
    name: 'Tribunal Regional Federal da 1ª Região',
    instance: '2ª Instância',
    branch: 'Federal',
    state: 'DF (Sede)',
    codeCNJ: '4.01',
    pjeUrl: 'https://pje1g.trf1.jus.br',
    description: 'Maior região da Justiça Federal: DF, GO, MT, BA, PI, MA, PA, AM, AC, RO, RR, AP, TO.',
    isFeatured: true,
  },
  {
    sigla: 'TRT10',
    name: 'Tribunal Regional do Trabalho da 10ª Região',
    instance: '2ª Instância',
    branch: 'Trabalhista',
    state: 'DF / TO',
    codeCNJ: '5.10',
    pjeUrl: 'https://pje.trt10.jus.br',
    description: 'Jurisdição trabalhista do Distrito Federal e do Estado do Tocantins.',
    isFeatured: true,
  },
  {
    sigla: 'STJ',
    name: 'Superior Tribunal de Justiça',
    instance: 'Tribunal Superior',
    branch: 'Superior / Nacional',
    state: 'Nacional (Brasília/DF)',
    codeCNJ: '3.00',
    pjeUrl: 'https://processo.stj.jus.br',
    description: 'Tribunal da Cidadania: uniformização da legislação infraconstitucional federal em todo o Brasil.',
    isFeatured: true,
  },
];

export const ALL_BRAZILIAN_COURTS: BrazilianCourt[] = [
  // --- TRIBUNAIS SUPERIORES & CONSELHOS ---
  {
    sigla: 'STJ',
    name: 'Superior Tribunal de Justiça',
    instance: 'Tribunal Superior',
    branch: 'Superior / Nacional',
    state: 'DF (Nacional)',
    codeCNJ: '3.00',
    pjeUrl: 'https://processo.stj.jus.br',
    description: 'Superior Tribunal de Justiça - Jurisdição Infraconstitucional Nacional.',
    isFeatured: true,
  },
  {
    sigla: 'STF',
    name: 'Supremo Tribunal Federal',
    instance: 'Tribunal Superior',
    branch: 'Superior / Nacional',
    state: 'DF (Nacional)',
    codeCNJ: '1.00',
    pjeUrl: 'https://portal.stf.jus.br',
    description: 'Guardião da Constituição Federal e cúpula do Poder Judiciário Brasileiro.',
    isFeatured: true,
  },
  {
    sigla: 'TST',
    name: 'Tribunal Superior do Trabalho',
    instance: 'Tribunal Superior',
    branch: 'Trabalhista',
    state: 'DF (Nacional)',
    codeCNJ: '5.00',
    pjeUrl: 'https://pje.tst.jus.br',
    description: 'Instância máxima da Justiça do Trabalho em todo o território nacional.',
    isFeatured: true,
  },
  {
    sigla: 'TSE',
    name: 'Tribunal Superior Eleitoral',
    instance: 'Tribunal Superior',
    branch: 'Eleitoral',
    state: 'DF (Nacional)',
    codeCNJ: '6.00',
    pjeUrl: 'https://pje.tse.jus.br',
    description: 'Cúpula da Justiça Eleitoral Brasileira.',
  },
  {
    sigla: 'STM',
    name: 'Superior Tribunal Militar',
    instance: 'Tribunal Superior',
    branch: 'Militar',
    state: 'DF (Nacional)',
    codeCNJ: '2.00',
    pjeUrl: 'https://eproc.stm.jus.br',
    description: 'Cúpula da Justiça Militar da União.',
  },
  {
    sigla: 'CNJ',
    name: 'Conselho Nacional de Justiça (DataJud Nacional)',
    instance: 'Conselho Nacional',
    branch: 'Superior / Nacional',
    state: 'DF (Nacional)',
    codeCNJ: '9.00',
    pjeUrl: 'https://datajud.cnj.jus.br',
    description: 'Base de dados processuais unificada de todo o Poder Judiciário Brasileiro.',
    isFeatured: true,
  },

  // --- JUSTIÇA FEDERAL (TRFs & Varas Federais) ---
  {
    sigla: 'TRF1',
    name: 'Tribunal Regional Federal da 1ª Região',
    instance: '2ª Instância',
    branch: 'Federal',
    state: 'DF, GO, MT, BA, PI, MA, PA, AM, AC, RO, RR, AP, TO',
    codeCNJ: '4.01',
    pjeUrl: 'https://pje1g.trf1.jus.br',
    description: 'Justiça Federal do Distrito Federal e 12 Estados do Norte, Centro-Oeste e Nordeste.',
    isFeatured: true,
  },
  {
    sigla: 'TRF2',
    name: 'Tribunal Regional Federal da 2ª Região',
    instance: '2ª Instância',
    branch: 'Federal',
    state: 'RJ, ES',
    codeCNJ: '4.02',
    pjeUrl: 'https://eproc.trf2.jus.br',
    description: 'Justiça Federal dos Estados do Rio de Janeiro e Espírito Santo.',
  },
  {
    sigla: 'TRF3',
    name: 'Tribunal Regional Federal da 3ª Região',
    instance: '2ª Instância',
    branch: 'Federal',
    state: 'SP, MS',
    codeCNJ: '4.03',
    pjeUrl: 'https://pje1g.trf3.jus.br',
    description: 'Justiça Federal dos Estados de São Paulo e Mato Grosso do Sul.',
    isFeatured: true,
  },
  {
    sigla: 'TRF4',
    name: 'Tribunal Regional Federal da 4ª Região',
    instance: '2ª Instância',
    branch: 'Federal',
    state: 'RS, SC, PR',
    codeCNJ: '4.04',
    pjeUrl: 'https://eproc.trf4.jus.br',
    description: 'Justiça Federal da Região Sul (Rio Grande do Sul, Santa Catarina e Paraná).',
  },
  {
    sigla: 'TRF5',
    name: 'Tribunal Regional Federal da 5ª Região',
    instance: '2ª Instância',
    branch: 'Federal',
    state: 'PE, CE, RN, PB, AL, SE',
    codeCNJ: '4.05',
    pjeUrl: 'https://pje.trf5.jus.br',
    description: 'Justiça Federal dos Estados do Nordeste Setentrional.',
  },
  {
    sigla: 'TRF6',
    name: 'Tribunal Regional Federal da 6ª Região',
    instance: '2ª Instância',
    branch: 'Federal',
    state: 'MG',
    codeCNJ: '4.06',
    pjeUrl: 'https://pje1g.trf6.jus.br',
    description: 'Justiça Federal do Estado de Minas Gerais.',
  },

  // --- JUSTIÇA DO TRABALHO (TRTs & Varas Trabalhistas) ---
  {
    sigla: 'TRT10',
    name: 'Tribunal Regional do Trabalho da 10ª Região',
    instance: '2ª Instância',
    branch: 'Trabalhista',
    state: 'DF / TO',
    codeCNJ: '5.10',
    pjeUrl: 'https://pje.trt10.jus.br',
    description: 'Varas do Trabalho e Tribunal Regional do Trabalho do Distrito Federal e Tocantins.',
    isFeatured: true,
  },
  {
    sigla: 'TRT1',
    name: 'Tribunal Regional do Trabalho da 1ª Região',
    instance: '2ª Instância',
    branch: 'Trabalhista',
    state: 'RJ',
    codeCNJ: '5.01',
    pjeUrl: 'https://pje.trt1.jus.br',
    description: 'Justiça do Trabalho do Estado do Rio de Janeiro.',
  },
  {
    sigla: 'TRT2',
    name: 'Tribunal Regional do Trabalho da 2ª Região',
    instance: '2ª Instância',
    branch: 'Trabalhista',
    state: 'SP (Capital/Litoral)',
    codeCNJ: '5.02',
    pjeUrl: 'https://pje.trt2.jus.br',
    description: 'Maior tribunal trabalhista do país (São Paulo e Região Metropolitana).',
    isFeatured: true,
  },
  {
    sigla: 'TRT3',
    name: 'Tribunal Regional do Trabalho da 3ª Região',
    instance: '2ª Instância',
    branch: 'Trabalhista',
    state: 'MG',
    codeCNJ: '5.03',
    pjeUrl: 'https://pje.trt3.jus.br',
    description: 'Justiça do Trabalho do Estado de Minas Gerais.',
  },
  {
    sigla: 'TRT4',
    name: 'Tribunal Regional do Trabalho da 4ª Região',
    instance: '2ª Instância',
    branch: 'Trabalhista',
    state: 'RS',
    codeCNJ: '5.04',
    pjeUrl: 'https://pje.trt4.jus.br',
    description: 'Justiça do Trabalho do Estado do Rio Grande do Sul.',
  },
  {
    sigla: 'TRT15',
    name: 'Tribunal Regional do Trabalho da 15ª Região',
    instance: '2ª Instância',
    branch: 'Trabalhista',
    state: 'SP (Interior/Campinas)',
    codeCNJ: '5.15',
    pjeUrl: 'https://pje.trt15.jus.br',
    description: 'Justiça do Trabalho do Interior de São Paulo.',
  },
  {
    sigla: 'TRT18',
    name: 'Tribunal Regional do Trabalho da 18ª Região',
    instance: '2ª Instância',
    branch: 'Trabalhista',
    state: 'GO',
    codeCNJ: '5.18',
    pjeUrl: 'https://pje.trt18.jus.br',
    description: 'Justiça do Trabalho do Estado de Goiás.',
  },

  // --- JUSTIÇA ESTADUAL E DISTRITAL (TJs & Varas Cíveis/Criminais) ---
  {
    sigla: 'TJDFT',
    name: 'Tribunal de Justiça do Distrito Federal e dos Territórios',
    instance: '2ª Instância',
    branch: 'Estadual / Distrital',
    state: 'DF',
    codeCNJ: '8.07',
    pjeUrl: 'https://pje.tjdft.jus.br',
    description: 'Tribunal de Justiça do Distrito Federal e dos Territórios (Brasília, Taguatinga, Ceilândia, etc.).',
    isFeatured: true,
  },
  {
    sigla: 'TJSP',
    name: 'Tribunal de Justiça de São Paulo',
    instance: '2ª Instância',
    branch: 'Estadual / Distrital',
    state: 'SP',
    codeCNJ: '8.26',
    pjeUrl: 'https://esaj.tjsp.jus.br',
    description: 'Maior tribunal de justiça estadual da América Latina.',
    isFeatured: true,
  },
  {
    sigla: 'TJRJ',
    name: 'Tribunal de Justiça do Rio de Janeiro',
    instance: '2ª Instância',
    branch: 'Estadual / Distrital',
    state: 'RJ',
    codeCNJ: '8.19',
    pjeUrl: 'https://tjrj.jus.br',
    description: 'Justiça Estadual do Rio de Janeiro.',
  },
  {
    sigla: 'TJMG',
    name: 'Tribunal de Justiça de Minas Gerais',
    instance: '2ª Instância',
    branch: 'Estadual / Distrital',
    state: 'MG',
    codeCNJ: '8.13',
    pjeUrl: 'https://pje.tjmg.jus.br',
    description: 'Justiça Estadual de Minas Gerais.',
  },
  {
    sigla: 'TJGO',
    name: 'Tribunal de Justiça do Estado de Goiás',
    instance: '2ª Instância',
    branch: 'Estadual / Distrital',
    state: 'GO',
    codeCNJ: '8.09',
    pjeUrl: 'https://projudi.tjgo.jus.br',
    description: 'Justiça Estadual de Goiás.',
  },
  {
    sigla: 'TJBA',
    name: 'Tribunal de Justiça do Estado da Bahia',
    instance: '2ª Instância',
    branch: 'Estadual / Distrital',
    state: 'BA',
    codeCNJ: '8.05',
    pjeUrl: 'https://pje.tjba.jus.br',
    description: 'Justiça Estadual da Bahia.',
  },
  {
    sigla: 'TJRS',
    name: 'Tribunal de Justiça do Rio Grande do Sul',
    instance: '2ª Instância',
    branch: 'Estadual / Distrital',
    state: 'RS',
    codeCNJ: '8.21',
    pjeUrl: 'https://eproc.tjrs.jus.br',
    description: 'Justiça Estadual do Rio Grande do Sul.',
  },
  {
    sigla: 'TJPR',
    name: 'Tribunal de Justiça do Paraná',
    instance: '2ª Instância',
    branch: 'Estadual / Distrital',
    state: 'PR',
    codeCNJ: '8.16',
    pjeUrl: 'https://projudi.tjpr.jus.br',
    description: 'Justiça Estadual do Paraná.',
  },
  {
    sigla: 'TJSC',
    name: 'Tribunal de Justiça de Santa Catarina',
    instance: '2ª Instância',
    branch: 'Estadual / Distrital',
    state: 'SC',
    codeCNJ: '8.24',
    pjeUrl: 'https://eproc.tjsc.jus.br',
    description: 'Justiça Estadual de Santa Catarina.',
  },
  {
    sigla: 'TJPE',
    name: 'Tribunal de Justiça de Pernambuco',
    instance: '2ª Instância',
    branch: 'Estadual / Distrital',
    state: 'PE',
    codeCNJ: '8.17',
    pjeUrl: 'https://pje.tjpe.jus.br',
    description: 'Justiça Estadual de Pernambuco.',
  },
  {
    sigla: 'TJCE',
    name: 'Tribunal de Justiça do Ceará',
    instance: '2ª Instância',
    branch: 'Estadual / Distrital',
    state: 'CE',
    codeCNJ: '8.06',
    pjeUrl: 'https://esaj.tjce.jus.br',
    description: 'Justiça Estadual do Ceará.',
  },

  // --- 1ª INSTÂNCIA (ESTRUTURA GERAL DE VARAS E JUIZADOS) ---
  {
    sigla: '1ª INSTÂNCIA - TJDFT',
    name: 'Varas Cíveis, Família, Fazenda e Juizados do DF (TJDFT)',
    instance: '1ª Instância',
    branch: 'Estadual / Distrital',
    state: 'DF (Brasília e Fóruns Regionais)',
    codeCNJ: '8.07',
    pjeUrl: 'https://pje.tjdft.jus.br',
    description: 'Varas Cíveis, Criminais, de Família, Fazenda Pública e Juizados Especiais do Distrito Federal.',
    isFeatured: true,
  },
  {
    sigla: '1ª INSTÂNCIA - TRF1',
    name: 'Varas Federais da Seção Judiciária do DF e Região (TRF1)',
    instance: '1ª Instância',
    branch: 'Federal',
    state: 'DF e Estados da 1ª Região',
    codeCNJ: '4.01',
    pjeUrl: 'https://pje1g.trf1.jus.br',
    description: 'Varas Federais Cíveis, Previdenciárias, Tributárias, Criminais e Juizados Federais (JEF/TRF1).',
    isFeatured: true,
  },
  {
    sigla: '1ª INSTÂNCIA - TRT10',
    name: 'Varas do Trabalho de Brasília e Tocantins (TRT10)',
    instance: '1ª Instância',
    branch: 'Trabalhista',
    state: 'DF e TO',
    codeCNJ: '5.10',
    pjeUrl: 'https://pje.trt10.jus.br',
    description: 'Varas Trabalhistas do Distrito Federal (Fórum Trabalhista de Brasília e Taguatinga) e Tocantins.',
    isFeatured: true,
  },
  {
    sigla: '1ª INSTÂNCIA - ESTADUAL GERAL',
    name: 'Varas Cíveis, Família e Juizados Especiais Estaduais',
    instance: '1ª Instância',
    branch: 'Estadual / Distrital',
    state: 'Nacional',
    codeCNJ: '8.00',
    pjeUrl: 'https://datajud.cnj.jus.br',
    description: 'Varas Cíveis, Família, Órfãos, Fazenda Pública e Juizados Especiais Cíveis (JEC) em todo o Brasil.',
  },
];

export const COURT_CATEGORIES: CourtCategory[] = [
  {
    title: 'Tribunais Superiores & Cúpula Nacional',
    description: 'Instâncias superiores de uniformização jurisprudencial e controle constitucional.',
    courts: ALL_BRAZILIAN_COURTS.filter((c) => c.instance === 'Tribunal Superior' || c.instance === 'Conselho Nacional'),
  },
  {
    title: 'Justiça do Distrito Federal & Tribunais em Destaque',
    description: 'TJDFT, TRF1, TRT10 e principais tribunais de atuação do escritório.',
    courts: ALL_BRAZILIAN_COURTS.filter((c) => ['TJDFT', 'TRF1', 'TRT10', 'STJ'].includes(c.sigla)),
  },
  {
    title: 'Justiça Federal (TRFs & Varas Federais)',
    description: 'Tribunais Regionais Federais da 1ª à 6ª Região em todo o território nacional.',
    courts: ALL_BRAZILIAN_COURTS.filter((c) => c.branch === 'Federal'),
  },
  {
    title: 'Justiça do Trabalho (TRTs & Varas Trabalhistas)',
    description: 'Tribunais Regionais do Trabalho da 10ª, 1ª, 2ª, 3ª, 4ª, 15ª e 18ª Regiões.',
    courts: ALL_BRAZILIAN_COURTS.filter((c) => c.branch === 'Trabalhista' && c.instance !== 'Tribunal Superior'),
  },
  {
    title: 'Justiça Estadual & Distrital (TJs)',
    description: 'Tribunais de Justiça dos Estados e do Distrito Federal.',
    courts: ALL_BRAZILIAN_COURTS.filter((c) => c.branch === 'Estadual / Distrital' && c.instance === '2ª Instância'),
  },
  {
    title: '1ª Instância (Varas & Juizados Especiais)',
    description: 'Varas Cíveis, Federais, Trabalhistas, de Família e Juizados Especiais.',
    courts: ALL_BRAZILIAN_COURTS.filter((c) => c.instance === '1ª Instância'),
  },
];

/**
 * Detects court from CNJ format NNNNNNN-DD.AAAA.J.TR.OOOO
 */
export function identifyCourtFromCNJ(cnj: string): BrazilianCourt | null {
  const clean = cnj.replace(/[^0-9]/g, '');
  if (clean.length < 16) return null;

  // J is branch (1=STF, 2=CNJ/Militar, 3=STJ, 4=Federal, 5=Trabalho, 6=Eleitoral, 7=Militar, 8=Estadual)
  // TR is Tribunal code
  const j = clean.charAt(13);
  const tr = clean.substring(14, 16);
  const code = `${j}.${tr}`;

  const match = ALL_BRAZILIAN_COURTS.find((c) => c.codeCNJ === code);
  return match || null;
}
