
import { GoogleGenAI, Type } from "@google/genai";

// Robust initialization with fallback to avoid crashes if API_KEY is missing initially
const getAIClient = () => {
  const apiKey = process.env.API_KEY || "";
  try {
    return new GoogleGenAI({ apiKey });
  } catch (e) {
    console.error("Gemini SDK Init Error:", e);
    return null;
  }
};

const ai = getAIClient();

// AI-powered semantic search for materials
export const semanticSearchItems = async (query: string, itemsContext: string): Promise<string[]> => {
  if (!ai) return [];
  try {
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
        - Si el usuario pide "material para sol", devuelve SKUs de fotovoltaicos y tubería resistente.
        - Si pide "iluminación oficina", devuelve paneles LED.
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

// Benchmarking KPIs against Industry Standards
export const getKPIBenchmarks = async (currentMetrics: any): Promise<any> => {
  if (!ai) return null;
  try {
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
                itr: { type: Type.STRING, description: "Standard industry ITR (e.g. '4x - 6x')" },
                dsi: { type: Type.STRING, description: "Standard industry DSI (e.g. '30 - 45 días')" },
                str: { type: Type.STRING, description: "Standard industry STR percentage" },
                deadStock: { type: Type.STRING, description: "Standard industry Dead Stock percentage" },
                serviceLevel: { type: Type.STRING, description: "Standard industry Service Level percentage" }
              }
            },
            analysis: { type: Type.STRING, description: "Detailed markdown analysis of gaps" },
            actionPlan: { 
              type: Type.ARRAY, 
              items: { type: Type.STRING }, 
              description: "List of 3 specific actions to improve" 
            }
          },
          required: ["benchmarks", "analysis", "actionPlan"]
        }
      },
      contents: `
        Actúa como consultor experto en Logística de Construcción e Ingeniería Eléctrica (Construction Supply Chain).
        Analiza los siguientes KPIs de la empresa "PC Mejia" y compáralos con el ESTÁNDAR DE LA INDUSTRIA para contratistas eléctricos medianos/grandes.

        DATOS ACTUALES DE PC MEJIA:
        - Rotación (ITR): ${currentMetrics.itr}
        - Días de Inventario (DSI): ${currentMetrics.dsi}
        - Tasa de Venta (STR): ${currentMetrics.str}
        - Stock Muerto: ${currentMetrics.deadStock}
        - Nivel de Servicio: ${currentMetrics.serviceLevel}

        INSTRUCCIONES:
        1. Proporciona rangos de referencia realistas para este sector específico.
        2. Genera un análisis breve de las brechas (Gap Analysis).
        3. Da 3 recomendaciones tácticas para llegar al nivel óptimo.
      `
    });

    return JSON.parse(response.text || "{}");
  } catch (error) {
    console.error("Benchmark Error:", error);
    return null;
  }
};

export const parseCorteDeObra = async (rawText: string, catalogContext: string): Promise<any> => {
  if (!ai) throw new Error("AI not initialized");
  try {
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
                  itemName: { type: Type.STRING, description: "Nombre del material extraído del reporte" },
                  quantity: { type: Type.NUMBER, description: "Cantidad instalada/cobrada" },
                  matchedSku: { type: Type.STRING, description: "SKU del catálogo que más se le parece" },
                  confidence: { type: Type.NUMBER, description: "Nivel de confianza 0-1" }
                },
                required: ["itemName", "quantity", "matchedSku"]
              }
            },
            summary: { type: Type.STRING, description: "Breve análisis de lo encontrado" }
          },
          required: ["extractedItems", "summary"]
        }
      },
      contents: `
        Eres un experto en auditoría de obras eléctricas. Tu tarea es extraer datos de un "Corte de Obra" (reporte de avance).
        
        CATÁLOGO DE REFERENCIA (Usa estos SKUs para el match):
        ${catalogContext}

        TEXTO DEL REPORTE / EXCEL:
        ${rawText}

        INSTRUCCIONES:
        1. Identifica los materiales y sus cantidades instaladas/cobradas.
        2. Haz un match inteligente: si el reporte dice "Cable 12", búscalo en el catálogo (ej: CABLES-1234).
        3. Si no hay match claro, pon el SKU más probable pero baja la confianza.
      `
    });
    
    return JSON.parse(response.text || "{}");
  } catch (error) {
    console.error("Gemini Parsing Error:", error);
    throw new Error("No se pudo procesar el archivo con AI.");
  }
};

export const analyzeInventory = async (
  inventorySummary: string, 
  stagnantItems: string
): Promise<any> => {
  if (!ai) return null;
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      config: {
        responseMimeType: "application/json",
        responseSchema: {
            type: Type.OBJECT,
            properties: {
                generalStatus: { type: Type.STRING, description: "1 sentence impactful summary of inventory health." },
                criticalItems: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            name: { type: Type.STRING },
                            reason: { type: Type.STRING, description: "Short reason why it is critical (value, age)" }
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
      contents: `
        Actúa como Gerente de Operaciones Senior para "PC Mejia" (Ingeniería Eléctrica).
        Tu objetivo es liberar flujo de caja y reducir inventario obsoleto.

        Genera un análisis estructurado basado en los siguientes datos:

        Datos:
        ${inventorySummary}
        Items Estancados:
        ${stagnantItems}
      `,
    });
    return JSON.parse(response.text || "{}");
  } catch (error) {
    console.error("Analysis Error:", error);
    return null;
  }
};

export const chatWithInventory = async (
  history: any[], 
  message: string, 
  contextData: string
) => {
  if (!ai) return "AI no disponible.";
  try {
    const systemInstruction = `
      Eres "MejiaBot", un asistente experto en logística para PC Mejia.
      Basa tus respuestas en: ${contextData}
    `;

    const chat = ai.chats.create({
      model: 'gemini-3-flash-preview',
      config: {
        systemInstruction: systemInstruction,
        tools: [{ googleSearch: {} }]
      },
      history: history
    });

    const result = await chat.sendMessage({ message: message });
    const grounding = result.candidates?.[0]?.groundingMetadata?.groundingChunks;
    let finalText = result.text || "";
    if (grounding && grounding.length > 0) {
       finalText += "\n\n**Fuentes:**\n" + grounding.map((g: any) => `- [${g.web?.title}](${g.web?.uri})`).join('\n');
    }
    return finalText;
  } catch (error) {
    return "Lo siento, tuve un problema. Intenta nuevamente.";
  }
};
