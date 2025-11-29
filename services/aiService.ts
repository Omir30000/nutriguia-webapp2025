
import { AnamneseData, DietPlan } from "../types";

const GROQ_API_KEY = "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";

export const gerarPlanoNutricional = async (dados: AnamneseData): Promise<DietPlan> => {
  const promptSystem = `
    Você é um nutricionista esportivo de elite.
    Objetivo: criar planos personalizados baseados na estratégia correta (Low Carb, Cetogênica, Hiperproteica, Bulking, etc).
    
    REGRAS ESTRITAS DE SAÍDA:
    1. Responda APENAS com um JSON válido.
    2. Quantidades na lista de compras DEVEM ter peso estimado em gramas.
    3. TODOS os campos do JSON devem ser preenchidos.

    ESTRUTURA JSON:
    {
      "modelo_dieta": { "nome": "string", "explicacao": "string" },
      "resumo_nutricional": "string",
      "macros_totais": "string",
      "plano_semanal_texto": "string",
      "lista_compras_semana": [{ "item": "string", "quantidade_kg": 0.0, "quantidade_unidade": "string" }]
    }
  `;

  let detalheMeta = "";
  if (dados.metaPesoKg) {
    if (dados.objetivo.includes("Perder")) {
      detalheMeta = `META: Perder ${dados.metaPesoKg}kg em ${dados.tempoObjetivo}. Ajuste déficit calórico.`;
    } else if (dados.objetivo.includes("Ganhar")) {
      detalheMeta = `META: Ganhar ${dados.metaPesoKg}kg em ${dados.tempoObjetivo}. Ajuste superávit calórico.`;
    }
  }

  const promptUser = `
    PACIENTE: ${dados.nome}, ${dados.idade} anos, ${dados.peso}kg, ${dados.altura}cm, ${dados.genero}, ${dados.nivelAtividade}.
    Restrições: ${dados.restricoes || "Nenhuma"}. Preferências: ${dados.preferencias || "Nenhuma"}.
    OBJETIVO: ${dados.objetivo} (${dados.tempoObjetivo}). ${detalheMeta}
    
    TAREFA:
    1. Escolha estratégia nutricional.
    2. Calcule macros.
    3. Gere Lista de Compras completa.
    4. NÃO gere receitas agora.
  `;

  try {
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${GROQ_API_KEY}`
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

    if (!response.ok) throw new Error(`Erro API Groq: ${response.statusText}`);

    const jsonResponse = await response.json();
    let content = jsonResponse.choices?.[0]?.message?.content || "";
    content = content.replace(/```json/g, "").replace(/```/g, "").trim();

    const parsedData = JSON.parse(content);

    // Sanitização e formatação segura
    const listaComprasProcessada = (Array.isArray(parsedData.lista_compras_semana) ? parsedData.lista_compras_semana : []).map((item: any) => ({
      item: item.item || "Item desconhecido",
      quantidade_kg: typeof item.quantidade_kg === 'number' ? item.quantidade_kg : 0,
      quantidade_unidade: item.quantidade_unidade || ""
    }));

    return {
      resumo_nutricional: parsedData.resumo_nutricional || "Resumo não disponível.",
      macros_totais: parsedData.macros_totais || "Macros não calculados.",
      plano_semanal_texto: parsedData.plano_semanal_texto || "Texto indisponível.",
      lista_compras_semana: listaComprasProcessada,
      receitas_semana: [],
      observacoes: parsedData.observacoes || "Plano gerado via NutriGuia AI",
      geradoEm: new Date().toISOString(),
      conteudo: JSON.stringify(parsedData, null, 2),
      fonteModel: "groq-llama-3.1",
      modelo_dieta: {
        nome: parsedData.modelo_dieta?.nome || "Dieta Personalizada",
        explicacao: parsedData.modelo_dieta?.explicacao || "Estratégia baseada nos objetivos."
      }
    };

  } catch (error) {
    console.error("Erro na geração:", error);
    throw error;
  }
};
