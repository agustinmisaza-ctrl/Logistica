
import { GoogleGenAI, Type } from "@google/genai";

// Semantic search for materials
export const semanticSearchItems = async (query: string, itemsContext: string): Promise<string[]> => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) return [];
  
  try {
    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            recommendedSkus: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "List of SKUs that match the user's need or intent"
            }
          },
          required: ["recommendedSkus"]
        }
      },
      contents: `
        Eres un asistente técnico de almacén eléctrico. El usuario busca materiales usando lenguaje natural.
        Tu tarea es identificar qué SKUs del catálogo satisfacen mejor su necesidad.

        CATÁLOGO (SKU | Nombre | Categoría):
        ${itemsContext}

        CONSULTA DEL USUARIO: "${query}"

        INSTRUCCIONES:
        - Devuelve SOLO una lista de SKUs que existan en el catálogo proporcionado.
      `
    });
    
    const result = JSON.parse(response.text || '{"recommendedSkus": []}');
    return result.recommendedSkus;
  } catch (error) {
    console.error("Semantic Search Error:", error);
    return [];
  }
};

export const getKPIBenchmarks = async (currentMetrics: any): Promise<any> => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) return null;

  try {
    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            benchmarks: {
              type: Type.OBJECT,
              properties: {
                itr: { type: Type.STRING },
                dsi: { type: Type.STRING },
                str: { type: Type.STRING },
                deadStock: { type: Type.STRING },
                serviceLevel: { type: Type.STRING }
              }
            },
            analysis: { type: Type.STRING },
            actionPlan: { 
              type: Type.ARRAY, 
              items: { type: Type.STRING }
            }
          },
          required: ["benchmarks", "analysis", "actionPlan"]
        }
      },
      contents: `
        Analiza estos KPIs de PC Mejia vs estándar de industria eléctrica:
        ${JSON.stringify(currentMetrics)}
      `
    });

    return JSON.parse(response.text || "{}");
  } catch (error) {
    console.error("Benchmark Error:", error);
    return null;
  }
};

export const parseCorteDeObra = async (rawText: string, catalogContext: string): Promise<any> => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) throw new Error("API Key missing");

  try {
    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            extractedItems: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  itemName: { type: Type.STRING },
                  quantity: { type: Type.NUMBER },
                  matchedSku: { type: Type.STRING },
                  confidence: { type: Type.NUMBER }
                },
                required: ["itemName", "quantity", "matchedSku"]
              }
            },
            summary: { type: Type.STRING }
          },
          required: ["extractedItems", "summary"]
        }
      },
      contents: `
        Extrae datos de este corte de obra usando el catálogo:
        CATÁLOGO: ${catalogContext}
        TEXTO: ${rawText}
      `
    });
    
    return JSON.parse(response.text || "{}");
  } catch (error) {
    throw new Error("No se pudo procesar el reporte.");
  }
};

export const analyzeInventory = async (inventorySummary: string, stagnantItems: string): Promise<any> => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) return null;

  try {
    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      config: {
        responseMimeType: "application/json",
        responseSchema: {
            type: Type.OBJECT,
            properties: {
                generalStatus: { type: Type.STRING },
                criticalItems: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            name: { type: Type.STRING },
                            reason: { type: Type.STRING }
                        }
                    }
                },
                strategicActions: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            title: { type: Type.STRING },
                            detail: { type: Type.STRING }
                        }
                    }
                }
            }
        }
      },
      contents: `Analiza este inventario: ${inventorySummary}. Items estancados: ${stagnantItems}`,
    });
    return JSON.parse(response.text || "{}");
  } catch (error) {
    return null;
  }
};

export const chatWithInventory = async (
  history: { role: string; parts: { text: string }[] }[], 
  message: string, 
  contextData: string
) => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) return "Configuración de IA incompleta (API_KEY missing).";

  try {
    const ai = new GoogleGenAI({ apiKey });
    const chat = ai.chats.create({
      model: 'gemini-3-flash-preview',
      config: {
        systemInstruction: `Eres "MejiaBot", asistente experto en logística de PC Mejia. 
        Contexto del inventario actual: ${contextData}.
        Responde de forma profesional, breve y usa markdown para listas.
        Si te preguntan por precios de mercado, usa tu conocimiento general o búsqueda.`,
        tools: [{ googleSearch: {} }]
      },
      history: history
    });

    const result = await chat.sendMessage({ message: message });
    const grounding = result.candidates?.[0]?.groundingMetadata?.groundingChunks;
    let finalText = result.text || "No pude generar una respuesta.";
    
    if (grounding && grounding.length > 0) {
       finalText += "\n\n**Fuentes consultadas:**\n" + grounding
         .filter(g => g.web)
         .map((g: any) => `- [${g.web?.title}](${g.web?.uri})`)
         .join('\n');
    }
    return finalText;
  } catch (error: any) {
    console.error("Chat Error:", error);
    return "Tuve un problema conectando con mi cerebro digital. Por favor intenta en un momento.";
  }
};
