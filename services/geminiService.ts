/// <reference types="vite/client" />

import { GoogleGenerativeAI } from "@google/generative-ai";
import { UserRecipe } from "../types";
import { getUnifiedHistory, getTodayExercises } from "./storageService";

// ========================================================================
// 1. CONFIGURACIÓN CENTRAL (Llave y Modelo)
// ========================================================================
const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

// Usamos una variable para que el modelo sea el mismo en TODO el código.
// Recomendado: "gemini-1.5-flash" (Rápido, 1500 req/día, estable).
// Si quieres probar el nuevo, cambia esto por: "gemini-2.0-flash-exp" o el que tengas activo.
const MODEL_NAME = "gemini-2.5-flash"; 

if (!API_KEY) {
  console.error("⚠️ ERROR: Falta la API KEY en geminiService.ts");
}

const genAI = new GoogleGenerativeAI(API_KEY);
const model = genAI.getGenerativeModel({ model: MODEL_NAME });

// ========================================================================
// 2. FUNCIONES
// ========================================================================

export const generateDailyPlan = async (): Promise<string> => {
  try {
    const prompt = "Genera un plan de comidas simple para hoy (Desayuno, Comida, Cena) siguiendo la regla 80/20. Usa formato Markdown (negritas para títulos).";
    const result = await model.generateContent(prompt);
    return result.response.text();
  } catch (error) {
    console.error("Error plan:", error);
    return "No pude conectar con el Chef. Intenta más tarde.";
  }
};

export const chatWithChef = async (
  history: { role: string; parts: { text: string }[] }[], 
  message: string,
  contextData: any
) => {
  try {
    const { pantry, recipes, historyString, score, streak } = contextData;

    // --- Contexto ---
    const systemText = `
    Eres 'Level Up Coach', experto en nutrición y fitness.
    Regla de Oro: 80/20 (Flexible).
    
    [ESTADO DEL JUGADOR]:
    - Score Nutrición: ${score} | Racha: ${streak} días.
    
    [INVENTARIO]:
    - Despensa: ${pantry.join(', ') || "Vacía"}.
    - Recetas guardadas: ${recipes.map((r:any) => r.title).join(', ') || "Ninguna"}.
    
    [HISTORIAL RECIENTE]:
    ${historyString}

    [INSTRUCCIONES DE RESPUESTA]:
    1. Sé breve, motivador y usa emojis.
    2. Si sugieres una receta, verifica si el usuario tiene los ingredientes.
    3. IMPORTANTE: Si el usuario pide una receta específica, al final de tu respuesta INCLUYE SIEMPRE un bloque JSON estrictamente con este formato para mostrar la tarjeta bonita:
    
    \`\`\`json
    {
      "type": "recipe_card",
      "title": "Nombre del Plato",
      "time": "XX min",
      "ingredients": ["Ingrediente 1", "Ingrediente 2"],
      "instructions": ["Paso 1", "Paso 2"],
      "macros": { "calories": "0", "protein": "0g", "carbs": "0g", "fats": "0g" }
    }
    \`\`\`
    `;

    // --- Limpieza de historial (Regla: User First) ---
    let cleanHistory = history.map(h => ({
      role: h.role === 'user' ? 'user' : 'model',
      parts: [{ text: h.parts[0].text }]
    }));

    if (cleanHistory.length > 0 && cleanHistory[0].role === 'model') {
      cleanHistory.shift(); 
    }

    const chat = model.startChat({
      history: cleanHistory,
      systemInstruction: { role: "system", parts: [{ text: systemText }] }
    });

    const result = await chat.sendMessage(message);
    return result.response.text();

  } catch (error) {
    console.error("Error chat:", error);
    return "Tu entrenador está descansando (Límite de cuota o error de red).";
  }
};

// --- FUNCIONES DE ANÁLISIS ---

export const analyzeFridgeImage = async (base64Image: string, mimeType: string) => {
  try {
    const result = await model.generateContent([
      { inlineData: { mimeType, data: base64Image } },
      "Analiza esta imagen. Identifica ingredientes y sugiere 3 comidas saludables."
    ]);
    return result.response.text();
  } catch (e) { return "Error analizando imagen."; }
};

export const analyzeProductLabel = async (base64Image: string, mimeType: string) => {
    try {
      const result = await model.generateContent([
        { inlineData: { mimeType, data: base64Image } },
        "Analiza etiqueta. Veredicto: '✅ Aprobado', '⚠️ Moderado', o '❌ Evitar'."
      ]);
      return result.response.text();
    } catch (e) { return "Error leyendo etiqueta."; }
};

export const analyzeFoodImpact = async (foodName: string) => {
  try {
    // Prompt forzando JSON
    const prompt = `Analiza: "${foodName}". Actúa como Juez.
    Responde SOLO este JSON sin texto extra:
    { "isHealthy": boolean, "calories": number, "scoreImpact": number, "reason": "frase corta" }`;
    
    const result = await model.generateContent(prompt);
    const text = result.response.text().replace(/```json|```/g, "").trim(); // Limpieza
    return JSON.parse(text);
  } catch (e) {
    return { isHealthy: true, calories: 200, scoreImpact: 10, reason: "Registro manual" };
  }
};

export const estimateCaloriesBurned = async (activity: string, duration: number, intensity: string) => {
    try {
      const prompt = `Calcula calorías para: ${activity}, ${duration} min, intensidad ${intensity}. 
      Responde SOLO JSON: { "calories": number }`;
      const result = await model.generateContent(prompt);
      const text = result.response.text().replace(/```json|```/g, "").trim();
      return JSON.parse(text).calories || duration * 5;
    } catch (e) { return duration * 5; }
};

// Dummies para evitar errores
export const searchNutritionInfo = async (query: string) => ({ text: "Búsqueda no disponible.", sources: [] });
export const estimateRecipeNutrition = async (t: string, i: string) => ({ calories: "0", protein: "0", carbs: "0", fats: "0" });