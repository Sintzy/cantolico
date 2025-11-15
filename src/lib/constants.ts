
export enum LiturgicalMoment {
    ENTRADA = "ENTRADA",
    ATO_PENITENCIAL = "ATO_PENITENCIAL",
    GLORIA = "GLORIA",
    SALMO = "SALMO",
    ACLAMACAO = "ACLAMACAO",
    OFERTORIO = "OFERTORIO",
    SANTO = "SANTO",
    COMUNHAO = "COMUNHAO",
    ACAO_DE_GRACAS = "ACAO_DE_GRACAS",
    FINAL = "FINAL",
    ADORACAO = "ADORACAO",
    ASPERSAO = "ASPERSAO",
    BAPTISMO = "BAPTISMO",
    BENCAO_DAS_ALIANCAS = "BENCAO_DAS_ALIANCAS",
    CORDEIRO_DE_DEUS = "CORDEIRO_DE_DEUS",
    CRISMA = "CRISMA",
    INTRODUCAO_DA_PALAVRA = "INTRODUCAO_DA_PALAVRA",
    LOUVOR = "LOUVOR",
    PAI_NOSSO = "PAI_NOSSO",
    REFLEXAO = "REFLEXAO",
    TERCO_MISTERIO = "TERCO_MISTERIO",
    OUTROS = "OUTROS",
  }
  
  // Display labels for liturgical moments
  export const LiturgicalMomentLabels: Record<LiturgicalMoment, string> = {
    [LiturgicalMoment.ENTRADA]: "Entrada",
    [LiturgicalMoment.ATO_PENITENCIAL]: "Ato Penitencial",
    [LiturgicalMoment.GLORIA]: "Glória",
    [LiturgicalMoment.SALMO]: "Salmo",
    [LiturgicalMoment.ACLAMACAO]: "Aclamação",
    [LiturgicalMoment.OFERTORIO]: "Ofertório",
    [LiturgicalMoment.SANTO]: "Santo",
    [LiturgicalMoment.COMUNHAO]: "Comunhão",
    [LiturgicalMoment.ACAO_DE_GRACAS]: "Ação de Graças",
    [LiturgicalMoment.FINAL]: "Final",
    [LiturgicalMoment.ADORACAO]: "Adoração",
    [LiturgicalMoment.ASPERSAO]: "Aspersão",
    [LiturgicalMoment.BAPTISMO]: "Baptismo",
    [LiturgicalMoment.BENCAO_DAS_ALIANCAS]: "Bênção das Alianças",
    [LiturgicalMoment.CORDEIRO_DE_DEUS]: "Cordeiro de Deus",
    [LiturgicalMoment.CRISMA]: "Crisma",
    [LiturgicalMoment.INTRODUCAO_DA_PALAVRA]: "Introdução da Palavra",
    [LiturgicalMoment.LOUVOR]: "Louvor",
    [LiturgicalMoment.PAI_NOSSO]: "Pai Nosso",
    [LiturgicalMoment.REFLEXAO]: "Reflexão",
    [LiturgicalMoment.TERCO_MISTERIO]: "Terço Mistério",
    [LiturgicalMoment.OUTROS]: "Outros",
  };
  
  // Helper function to get moment label
  export function getLiturgicalMomentLabel(moment: string): string {
    return LiturgicalMomentLabels[moment as LiturgicalMoment] || moment;
  }
    
  export enum Instrument {
    ORGAO = "ORGAO",
    GUITARRA = "GUITARRA",
    PIANO = "PIANO",
    CORO = "CORO",
    OUTRO = "OUTRO",
  }
  
  // Display labels for instruments
  export const InstrumentLabels: Record<Instrument, string> = {
    [Instrument.ORGAO]: "Órgão",
    [Instrument.GUITARRA]: "Guitarra",
    [Instrument.PIANO]: "Piano",
    [Instrument.CORO]: "Coro",
    [Instrument.OUTRO]: "Outro",
  };
  
  // Helper function to get instrument label
  export function getInstrumentLabel(instrument: string): string {
    return InstrumentLabels[instrument as Instrument] || instrument;
  }
  
  export enum SongType {
    ACORDES = "Acordes",
    PARTITURA = "Partitura",
  }
  
  export enum SourceType {
    PDF = "PDF",
    MARKDOWN = "MARKDOWN",
  }
  