import { AnamneseData, DietPlan } from "../types";

// Chave da API definida diretamente para garantir o funcionamento
const API_KEY = "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";

// Função auxiliar para extrair JSON de texto misto (Markdown)
function extractJSON(text: string): Partial<DietPlan> {
  try {
    // 1. Tentar parse direto
    return JSON.parse(text);
  } catch (e) {
    // 2. Tentar extrair de blocos de código ```json ... ```
    const jsonMatch = text.match(/```json\s*([\s\S]*?)\s*```/) || text.match(/\{[\s\S]*\}/);
    
    if (jsonMatch) {
      try {
        return JSON.parse(jsonMatch[1] || jsonMatch[0]);
      } catch (innerError) {
        console.warn("Falha ao extrair JSON do bloco.", innerError);
      }
    }
  }
  return {};
}

export async function gerarPlanoComGroq(dados: AnamneseData): Promise<DietPlan> {
  const promptSystem = `Você é um nutricionista esportivo. Responda ESTRITAMENTE em JSON.
  Gere um plano para: ${dados.objetivo}, Prazo: ${dados.tempoObjetivo}.
  
  Estrutura JSON Obrigatória:
  {
    "resumo_nutricional": "string",
    "macros_totais": "string",
    "lista_compras_semana": [{ "item": "string", "quantidade_kg": number, "quantidade_unidade": "string" }],
    "receitas_semana": [{ "titulo": "string", "ingredientes": ["string"], "modo_preparo": ["string"], "tempo_minutos": "string", "tipo_refeicao": "string" }],
    "observacoes": "string"
  }`;

  const promptUser = `Perfil: ${dados.nome}, ${dados.idade} anos, ${dados.peso}kg, ${dados.altura}cm.
  Atividade: ${dados.nivelAtividade}. Restrições: ${dados.restricoes || "Nenhuma"}.`;

  let rawContent = "";
  let dietPlan: Partial<DietPlan> = {};

  try {
    // Chamada direta à API Groq com a chave hardcoded
    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${API_KEY}`
      },
      body: JSON.stringify({
        model: "llama-3.1-8b-instant",
        messages: [
          { role: "system", content: promptSystem },
          { role: "user", content: promptUser }
        ],
        temperature: 0.2,
        response_format: { type: "json_object" }
      })
    });

    if (!res.ok) throw new Error(`Groq API Error: ${res.statusText}`);
    const json = await res.json();
    
    // Acesso seguro ao conteúdo
    rawContent = json.choices?.[0]?.message?.content || "";
    
    // Processar Resposta
    try {
        dietPlan = JSON.parse(rawContent);
    } catch (e) {
        dietPlan = extractJSON(rawContent);
    }

  } catch (error: any) {
    console.error("Erro Groq:", error);
    rawContent = `Erro ao gerar: ${error.message}`;
    dietPlan = { resumo_nutricional: "Erro na geração. Tente novamente." };
  }

  // Normalização e Retorno
  return {
    resumo_nutricional: dietPlan.resumo_nutricional || "Resumo indisponível.",
    macros_totais: dietPlan.macros_totais || "Não calculado.",
    lista_compras_semana: Array.isArray(dietPlan.lista_compras_semana) ? dietPlan.lista_compras_semana : [],
    receitas_semana: Array.isArray(dietPlan.receitas_semana) ? dietPlan.receitas_semana : [],
    observacoes: dietPlan.observacoes || "",
    conteudo: rawContent, // Fundamental para o fallback visual
    geradoEm: new Date().toISOString(),
    fonteModel: "llama-3.1-8b-instant"
  };
}