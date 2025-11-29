
export interface UserProfile {
  uid: string;
  email: string | null;
  displayName?: string | null;
}

export interface AnamneseData {
  nome: string;
  idade: string;
  peso: string;
  altura: string;
  genero: string;
  objetivo: string;
  metaPesoKg?: string; // Novo campo para quantidade de KG a perder ou ganhar
  tempoObjetivo: string; // Ex: "8 semanas"
  nivelAtividade: string;
  restricoes: string;
  preferencias: string;
}

export interface IngredienteItem {
  item: string;
  quantidade_kg?: number; // Quantidade normalizada para cálculos
  quantidade_unidade?: string; // Ex: "2 unidades", "1 maço"
}

export interface Macros {
  proteinas?: string;
  carboidratos?: string;
  gorduras?: string;
}

export interface Receita {
  id?: string; // ID do documento no Firebase (opcional pois receitas do plano estático não tem ID de doc separado)
  titulo: string;
  ingredientes: string[]; // Lista formatada
  modo_preparo: string[];
  tempo_minutos: string;
  tipo_refeicao?: string; // Café, Almoço, Jantar
  calorias?: string;
  porcoes?: string;
  isNew?: boolean; // Flag para indicar se a receita foi recém gerada
  
  // Novos campos para filtros
  favorito?: boolean;
  dificuldade?: "Fácil" | "Médio" | "Difícil";
  macros?: Macros;
}

export interface DietPlan {
  resumo_nutricional: string;
  macros_totais: string;
  plano_semanal_texto?: string;
  lista_compras_semana: IngredienteItem[];
  receitas_semana: Receita[];
  observacoes?: string;
  conteudo?: string; // Campo para armazenar o texto bruto da resposta da IA
  
  // Metadados
  geradoEm?: string;
  fonteModel?: string;
  modelo_dieta?: {
    nome: string;
    explicacao: string;
  };
}

export interface UserData {
  anamnese?: AnamneseData;
  dietPlan?: DietPlan;
}
