import { Client, LawOfficeSettings, DocumentPowers, ContractFeeOptions, DocumentType } from '../types';

export function formatCurrencyBRL(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
}

export function formatDateExtenso(dateStr?: string): string {
  const date = dateStr ? new Date(dateStr + 'T12:00:00') : new Date();
  const meses = [
    'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
    'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'
  ];
  const dia = date.getDate();
  const mes = meses[date.getMonth()];
  const ano = date.getFullYear();
  return `${dia} de ${mes} de ${ano}`;
}

export function formatClientAddress(addr: Client['address']): string {
  const comp = addr.complement ? `, ${addr.complement}` : '';
  return `${addr.street}, nº ${addr.number}${comp}, Bairro ${addr.neighborhood}, ${addr.city}/${addr.state}, CEP ${addr.zipCode}`;
}

export function getClientQualification(client: Client): string {
  if (client.type === 'PJ') {
    const rep = client.representative;
    const repText = rep
      ? `, neste ato representada por seu ${rep.role || 'representante legal'}, ${rep.name}, ${rep.nationality}, ${rep.maritalStatus}, ${rep.profession}, portador(a) do RG nº ${rep.rg} e inscrito(a) no CPF/MF sob o nº ${rep.cpf}`
      : '';
    return `${client.name.toUpperCase()}${client.tradeName ? ` (${client.tradeName})` : ''}, pessoa jurídica de direito privado, inscrita no CNPJ/MF sob o nº ${client.cpfCnpj}, com sede e domicílio em ${formatClientAddress(client.address)}${repText}`;
  }

  return `${client.name.toUpperCase()}, ${client.nationality.toLowerCase()}, ${client.maritalStatus.toLowerCase()}, ${client.profession.toLowerCase()}, portador(a) da Cédula de Identidade RG nº ${client.rgIe}, inscrito(a) no CPF/MF sob o nº ${client.cpfCnpj}, residente e domiciliado(a) em ${formatClientAddress(client.address)}, telefone/WhatsApp ${client.whatsapp || client.phone}, e-mail: ${client.email}`;
}

export function getLawyerQualification(office: LawOfficeSettings): string {
  const lawyer = office.primaryLawyer;
  return `${lawyer.name.toUpperCase()}, advogado brasileiro, regularmente inscrito na Ordem dos Advogados do Brasil sob o nº OAB/${lawyer.oabState} ${lawyer.oabNumber}, e no CPF/MF sob o nº ${lawyer.cpf}, integrante da sociedade de advogados ${office.officeName.toUpperCase()} (CNPJ: ${office.cnpj}), com escritório profissional sediado em ${formatClientAddress(office.address)}, onde recebe intimações e notificações de estilo (art. 77, V, do CPC), e-mail: ${office.email}, telefone: ${office.phone}`;
}

export function generateProcuracaoText(
  client: Client,
  office: LawOfficeSettings,
  powers: DocumentPowers,
  specificSubject?: string
): string {
  const clientQual = getClientQualification(client);
  const lawyerQual = getLawyerQualification(office);

  const specialPowersList: string[] = [];
  if (powers.adJudiciaGeral) {
    specialPowersList.push("os amplos poderes gerais para o foro em geral, conferidos pela cláusula 'ad judicia et extra', em qualquer Juízo, Tribunal, Grau de Jurisdição ou Instância Administrativa");
  }
  if (powers.receberDarQuitacao) {
    specialPowersList.push("receber citações, intimações, notificações, receber valores e dar a respectiva quitação");
  }
  if (powers.transigirAcordos) {
    specialPowersList.push("transigir, firmar acordos judiciais e extrajudiciais, anuir, transacionar e firmar termos de compromisso");
  }
  if (powers.levantarRpvPrecatório) {
    specialPowersList.push("requerer e levantar alvarás judiciais de pagamento, emitir ordens de pagamento, efetuar levantamento de depósitos judiciais, Requisições de Pequeno Valor (RPVs) e Precatórios junto às instituições bancárias oficiais (Banco do Brasil, Caixa Econômica Federal e congêneres)");
  }
  if (powers.reconhecerProcedencia) {
    specialPowersList.push("reconhecer a procedência do pedido, renunciar ao direito sobre o qual se funda a ação, desistir e confessar");
  }
  if (powers.firmarCompromisso) {
    specialPowersList.push("firmar declarações de hipossuficiência econômica, termos de audiência e compromissos legais");
  }
  if (powers.extrajudicialAdmin) {
    specialPowersList.push("praticar todos os atos perante Órgãos Públicos Federais, Estaduais e Municipais, INSS, Receita Federal, Tabelionatos de Notas e Cartórios de Registro de Imóveis");
  }
  if (powers.substabelecerComReserva) {
    specialPowersList.push("substabelecer a presente com ou sem reserva dos poderes ora outorgados");
  } else if (powers.substabelecerSemReserva) {
    specialPowersList.push("substabelecer a presente sem reserva de poderes");
  }

  const finality = specificSubject
    ? `especialmente para representar o(a) OUTORGANTE em todas as fases da demanda referente a: ${specificSubject}`
    : `para propor as ações competentes, apresentar defesas, reconvenções, recursos em todas as instâncias e prestar consultoria jurídica integral nos assuntos de interesse do(a) OUTORGANTE`;

  return `
# PROCURAÇÃO "AD JUDICIA ET EXTRA"

---

### OUTORGANTE:
${clientQual}

---

### OUTORGADOS:
${lawyerQual}

---

### PODERES E CLÁUSULA "AD JUDICIA":
Pelo presente instrumento particular de mandato, o(a) OUTORGANTE nomeia e constitui o(s) OUTORGADO(S) como seu(s) bastante procurador(es), outorgando-lhe(s) ${specialPowersList.join(', ')}.

### FINALIDADE / OBJETO DO MANDATO:
O presente instrumento destina-se ${finality}, podendo os OUTORGADOS praticar todos os atos necessários e indispensáveis ao fiel e cabal cumprimento deste mandato, inclusive recorrer de despachos e sentenças, produzir provas, prestar depoimentos pessoais e requerer certidões, dando tudo por bom, firme e valioso, nos termos do artigo 105 da Lei Federal nº 13.105/2015 (Código de Processo Civil).

---

${office.address.city} - ${office.address.state}, ${formatDateExtenso()}.

<br/><br/>
____________________________________________________
${client.name.toUpperCase()}
${client.type === 'PJ' && client.representative ? `Por: ${client.representative.name} (${client.representative.role})` : `CPF: ${client.cpfCnpj}`}
Outorgante
  `.trim();
}

export function generateContratoHonorariosText(
  client: Client,
  office: LawOfficeSettings,
  fees: ContractFeeOptions,
  subjectMatter?: string
): string {
  const clientQual = getClientQualification(client);
  const lawyerQual = getLawyerQualification(office);

  let feeClauseDescription = '';

  if (fees.feeType === 'pro_labore_e_exito') {
    feeClauseDescription = `
a) Honorários Iniciais (Pró-labore): O valor fixo de ${formatCurrencyBRL(fees.fixedValue)}, a ser pago em ${fees.installmentsCount} parcelas de ${formatCurrencyBRL(fees.installmentValue || fees.fixedValue / fees.installmentsCount)}, com primeiro vencimento em ${fees.firstDueDate ? formatDateExtenso(fees.firstDueDate) : 'na data de assinatura'}, e as demais a cada 30 (trinta) dias subsequentes.
b) Honorários de Êxito (Quota Litis / Ad Exitum): O percentual de ${fees.contingencyPercent}% (${fees.contingencyPercent} por cento) incidente sobre o proveito econômico bruto total auferido pelo CONTRATANTE (inclusive condenações, acordos, valores levantados, precatórios, RPVs ou restituições), a ser pago na data do efetivo recebimento.
    `.trim();
  } else if (fees.feeType === 'apenas_exito') {
    feeClauseDescription = `
Honorários de Êxito Exclusivo (Ad Exitum / Quota Litis): O percentual de ${fees.contingencyPercent}% (${fees.contingencyPercent} por cento) sobre o benefício econômico e financeiro total auferido pelo CONTRATANTE na ação (englobando valores principais, juros, correção monetária, parcelas vencidas e vincendas acordadas), pagáveis no ato da disponibilização do numerário.
    `.trim();
  } else if (fees.feeType === 'apenas_fixo') {
    feeClauseDescription = `
Honorários Fixos: O valor total de ${formatCurrencyBRL(fees.fixedValue)}, a ser pago em ${fees.installmentsCount} parcelas de ${formatCurrencyBRL(fees.installmentValue || fees.fixedValue / fees.installmentsCount)}, com vencimento a partir de ${fees.firstDueDate ? formatDateExtenso(fees.firstDueDate) : 'na assinatura'}.
    `.trim();
  } else {
    feeClauseDescription = `
Assessoria Jurídica Mensal: O valor mensal fixo de ${formatCurrencyBRL(fees.fixedValue)}, com vencimento todo dia 10 de cada mês, mediante emissão de boleto ou PIX.
    `.trim();
  }

  const sucumbenceClause = fees.sucumbenceBelongsToLawyer
    ? `Parágrafo Primeiro: Fica expressamente pactuado que os eventuais Honorários Sucumbenciais fixados em Juízo pertencerão exclusiva e integralmente ao CONTRATADO, por expressa disposição dos artigos 22 e 23 da Lei Federal nº 8.906/1994 (Estatuto da Advocacia e da OAB), não se confundindo nem compensando com os honorários contratuais ora convencionados.`
    : '';

  const expensesClause = fees.expensesPaidByClient
    ? `Parágrafo Segundo: Todas as despesas processuais, inclusive custas iniciais, taxas judiciárias, preparo recursal, condução de oficiais de justiça, honorários periciais, certidões e autenticações, serão suportadas integralmente pelo CONTRATANTE, mediante prestação de contas prévia ou reembolso.`
    : '';

  const forumCity = fees.forumCity || `${office.address.city} - ${office.address.state}`;

  return `
# CONTRATO DE PRESTAÇÃO DE SERVIÇOS ADVOCATÍCIOS E HONORÁRIOS PROFISSIONAIS

Pelo presente instrumento particular, de um lado:

### CONTRATANTE:
${clientQual}

E, de outro lado:

### CONTRATADO:
${lawyerQual}

Têm entre si, justo e acordado, o presente Contrato de Prestação de Serviços Advocatícios, regido pelas cláusulas e condições seguintes:

---

### CLÁUSULA PRIMEIRA - DO OBJETO DOS SERVIÇOS
O CONTRATADO obriga-se a prestar seus serviços profissionais de assessoria, consultoria e representação jurídica no patrocínio dos interesses do CONTRATANTE, consistente em: ${subjectMatter || 'patrocínio judicial e extrajudicial em todas as instâncias competentes na defesa e propositura dos atos jurídicos pertinentes aos seus direitos'}.

### CLÁUSULA SEGUNDA - DA ATUAÇÃO PROFISSIONAL
A prestação dos serviços advocatícios constitui obrigação de meio, empenhando o CONTRATADO todo o seu conhecimento técnico, dedicação e zelo profissional, sem qualquer garantia ou vinculação a resultado predeterminado, cuja decisão compete exclusivamente ao Poder Judiciário.

### CLÁUSULA TERCEIRA - DOS HONORÁRIOS ADVOCATÍCIOS
Como contraprestação pelos serviços técnicos profissionais ora avençados, o CONTRATANTE pagará ao CONTRATADO os seguintes valores:

${feeClauseDescription}

${sucumbenceClause}

${expensesClause}

Parágrafo Terceiro - Da Mora e Inadimplemento: O atraso no pagamento de qualquer das parcelas de honorários sujeitará o CONTRATANTE à multa moratória de 2% (dois por cento) sobre o débito, juros de mora de 1% (um por cento) ao mês e atualização monetária pelo índice oficial (IPCA/INPC).

### CLÁUSULA QUARTA - DAS OBRIGAÇÕES DO CONTRATANTE
O CONTRATANTE compromete-se a fornecer com exatidão e tempestividade todos os documentos, certidões, informações e subsídios fáticos indispensáveis à instrução das peças e comparecimento nas audiências designadas.

### CLÁUSULA QUINTA - DA RESCISÃO E REVOGAÇÃO DO MANDATO
Havendo revogação unilateral do mandato pelo CONTRATANTE sem justa causa comprovada, ou desistência da ação pelo CONTRATANTE após ajuizada, serão devidos integralmente os honorários fixos contratados e o percentual de êxito proporcional aos serviços até então desempenhados.

### CLÁUSULA SEXTA - DOS DADOS BANCÁRIOS PARA PAGAMENTO
Os pagamentos devidos por força deste contrato deverão ser efetuados via PIX ou transferência na conta do CONTRATADO:
- Chave PIX: ${office.bankAccount.pixKey}
- Banco: ${office.bankAccount.bankName} | Agência: ${office.bankAccount.agency} | Conta: ${office.bankAccount.accountNumber}
- Titular: ${office.bankAccount.accountHolder}

### CLÁUSULA SÉTIMA - DAS COMUNICAÇÕES E NOTIFICAÇÕES
As partes convencionam que todas as notificações, avisos e prestação de contas poderão ser formalizadas via correio eletrônico ou mensagem de WhatsApp aos contatos informados no preâmbulo deste instrumento.

### CLÁUSULA OITAVA - DO FORO DE ELEIÇÃO
Para dirimir quaisquer controvérsias oriundas da execução ou interpretação deste contrato, as partes elegem o Foro da Comarca de ${forumCity}, com expressa renúncia a qualquer outro, por mais privilegiado que seja.

E, por estarem assim justas e contratadas, assinam o presente em 2 (duas) vias de igual teor e forma na presença das testemunhas abaixo.

---

${office.address.city} - ${office.address.state}, ${formatDateExtenso()}.

<br/><br/>

_____________________________________________
${client.name.toUpperCase()}
CONTRATANTE

<br/><br/>

_____________________________________________
${office.primaryLawyer.name.toUpperCase()}
CONTRATADO - OAB/${office.primaryLawyer.oabState} nº ${office.primaryLawyer.oabNumber}

<br/><br/>

TESTEMUNHAS:

1. ____________________________________ &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; 2. ____________________________________
   Nome: &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; Nome:
   CPF: &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; CPF:
  `.trim();
}

export function generateDeclaracaoHipossuficienciaText(
  client: Client,
  office: LawOfficeSettings
): string {
  const clientQual = getClientQualification(client);

  return `
# DECLARAÇÃO DE HIPOSSUFICIÊNCIA ECONÔMICA
### (PEDIDO DE GRATUIDADE DA JUSTIÇA - ART. 98 E 99 DO CPC C/C ART. 5º, LXXIV DA CF/88)

---

### DECLARANTE:
${clientQual}

---

DECLARO, para todos os fins de direito e sob as penas da lei (especialmente as disposições da Lei Federal nº 7.115/83 e do art. 299 do Código Penal Brasileiro), que NÃO POSSUO CONDIÇÕES FINANCEIRAS de arcar com o pagamento das custas processuais, taxas judiciárias, despesas com perícias, emolumentos e eventuais honorários advocatícios sucumbenciais decorrentes da presente lide sem prejuízo do sustento próprio e de minha família.

Por tais razões, requeiro expressamente a concessão dos benefícios da JUSTIÇA GRATUITA, com fulcro no artigo 5º, inciso LXXIV, da Constituição Federal da República de 1988, e nos artigos 98, 99 e seguintes da Lei Federal nº 13.105/2015 (Código de Processo Civil).

Por ser a mais lídima expressão da verdade, firmo o presente termo para que produza os seus regulares efeitos jurídicos e legais.

---

${office.address.city} - ${office.address.state}, ${formatDateExtenso()}.

<br/><br/>
____________________________________________________
${client.name.toUpperCase()}
CPF: ${client.cpfCnpj}
Declarante
  `.trim();
}

export function generateSubstabelecimentoText(
  office: LawOfficeSettings,
  substabelecido: { name: string; oabNumber: string; oabState: string; cpf?: string },
  processNumber?: string,
  withReserve: boolean = true
): string {
  const lawyerQual = getLawyerQualification(office);
  const reserveText = withReserve ? "COM RESERVA DE IGUAIS PODERES" : "SEM RESERVA DE PODERES";

  return `
# TERMO DE SUBSTABELECIMENTO (${reserveText})

---

### SUBSTABELECENTE:
${lawyerQual}

---

### SUBSTABELECIDO(A):
${substabelecido.name.toUpperCase()}, advogado(a) devidamente inscrito(a) na Ordem dos Advogados do Brasil sob o nº OAB/${substabelecido.oabState} ${substabelecido.oabNumber}${substabelecido.cpf ? `, inscrito no CPF/MF sob o nº ${substabelecido.cpf}` : ''}.

---

### SUBSTABELECIMENTO:
Pelo presente instrumento, o SUBSTABELECENTE substabelece no(a) ilustre colega SUBSTABELECIDO(A), ${reserveText}, todos os poderes que lhe foram outorgados na procuração constante dos autos do Processo nº ${processNumber || 'especificado nos autos judiciais'}, para que possa praticar todos os atos processuais necessários à defesa do constituinte.

---

${office.address.city} - ${office.address.state}, ${formatDateExtenso()}.

<br/><br/>
____________________________________________________
${office.primaryLawyer.name.toUpperCase()}
OAB/${office.primaryLawyer.oabState} nº ${office.primaryLawyer.oabNumber}
Substabelecente
  `.trim();
}

export function generateReciboHonorariosText(
  client: Client,
  office: LawOfficeSettings,
  value: number,
  reference: string
): string {
  return `
# RECIBO DE PAGAMENTO DE HONORÁRIOS ADVOCATÍCIOS
### VALOR: ${formatCurrencyBRL(value)}

---

Recebi de ${client.name.toUpperCase()}, inscrito(a) no CPF/CNPJ nº ${client.cpfCnpj}, a importância líquida de ${formatCurrencyBRL(value)}, referente a:

### DISCRIMINAÇÃO DOS SERVIÇOS / COMPETÊNCIA:
"${reference || 'Honorários advocatícios relativos à prestação de serviços jurídicos e consultoria contenciosa'}"

Declaro que, com o pagamento da referida quantia, dou plena, rasa e geral quitação em relação à parcela e/ou competência acima mencionada.

---

${office.address.city} - ${office.address.state}, ${formatDateExtenso()}.

<br/><br/>
____________________________________________________
${office.officeName.toUpperCase()}
Por: ${office.primaryLawyer.name} (OAB/${office.primaryLawyer.oabState} nº ${office.primaryLawyer.oabNumber})
CNPJ: ${office.cnpj}
  `.trim();
}
