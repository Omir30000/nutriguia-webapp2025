
import { Receita } from "../types";

const GROQ_API_KEY = "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";

export async function chamarGroqReceita(ingredientes: string[], tipo: string): Promise<Receita> {
  const listaIngredientes = ingredientes.join(", ");
  
  const prompt = `
    Aja como um chef nutricionista técnico focado em precisão.
    Crie uma receita INDIVIDUAL (apenas 1 porção) do tipo: "${tipo}".
    
    Baseie-se prioritariamente nestes ingredientes disponíveis: [${listaIngredientes}].
    (Você pode adicionar temperos básicos e complementos essenciais se faltar algo).

    REGRAS OBRIGATÓRIAS DE FORMATAÇÃO (CRÍTICO):
    1. CADA INGREDIENTE DEVE TER QUANTIDADE EXPLÍCITA (g, ml, unidade, fatia).
       - NUNCA liste apenas o nome do ingrediente.
       - Exemplo CORRETO: "120g de peito de frango", "15ml de azeite", "2 ovos médios", "1 fatia de pão integral (25g)".
       - Exemplo ERRADO: "Frango", "Azeite a gosto", "Ovos".
    2. As quantidades devem ser realistas para uma única pessoa em uma dieta saudável.
    3. Calcule a estimativa de Calorias totais e Macros (Proteína, Carbo, Gordura).
    
    Responda APENAS com este objeto JSON (sem markdown):
    {
      "titulo": "Nome Criativo da Receita",
      "ingredientes": [
        "quantidade exata + nome do ingrediente",
        "quantidade exata + nome do ingrediente"
      ],
      "modo_preparo": [
        "Passo 1 detalhado",
        "Passo 2 detalhado"
      ],
      "calorias": "Ex: 450 kcal",
      "macros": {
        "proteinas": "Ex: 35g",
        "carboidratos": "Ex: 40g",
        "gorduras": "Ex: 12g"
      },
      "dificuldade": "Fácil",
      "porcoes": "1 pessoa",
      "tempo_minutos": "20",
      "tipo_refeicao": "${tipo}"
    }
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
          { role: "system", content: "Você é um nutricionista técnico. Responda APENAS com JSON válido. Nunca inclua texto fora do JSON." },
          { role: "user", content: prompt }
        ],
        temperature: 0.3,
        response_format: { type: "json_object" }
      })
    });

    const data = await response.json();
    const content = data.choices[0].message.content;
    const json = JSON.parse(content);

    return {
      titulo: json.titulo,
      ingredientes: json.ingredientes,
      modo_preparo: json.modo_preparo || json.preparo,
      calorias: json.calorias || "Calculando...",
      porcoes: json.porcoes || "1 pessoa",
      tempo_minutos: String(json.tempo_minutos || "20"),
      tipo_refeicao: tipo,
      dificuldade: json.dificuldade || "Médio",
      macros: json.macros || { proteinas: "-", carboidratos: "-", gorduras: "-" }
    };
  } catch (error) {
    console.error("Erro ao gerar receita no Groq:", error);
    throw new Error("Falha ao gerar receita.");
  }
}
