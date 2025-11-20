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

// --- NUEVO: LÓGICA DE CONTEXTO DE 48 HORAS Y PERFIL ATLÉTICO ---
    const twoDaysAgo = Date.now() - (48 * 60 * 60 * 1000);
    const allUnifiedHistory = getUnifiedHistory(); // Asumo que esta función trae Comidas y Ejercicios
    
    // Filtramos los ítems consumidos/registrados en las últimas 48 horas
    const recentItems = allUnifiedHistory.filter((item: any) => {
        // Usamos el timestamp como base para la hora del registro
        return item.timestamp > twoDaysAgo;
    });

    const calculatedHistoryString = recentItems.length > 0 
        ? recentItems.map((h: any) => {
            const dateStr = new Date(h.timestamp).toLocaleDateString('es-ES', { weekday: 'short', hour: '2-digit', minute: '2-digit' });
            if (h.type === 'exercise') {
                return `- [EJERCICIO ${dateStr}] 🏃 ${h.name} (${h.duration}min, ${h.caloriesBurned}kcal)`;
            } else {
                const status = h.status === 'completed' ? '✅' : '⏳';
                const notes = h.userNotes ? `(Notas: ${h.userNotes})` : '';
                return `- [COMIDA ${dateStr}] ${status} ${h.title} (${h.calories} kcal) ${notes}`;
            }
        }).join('\n')
        : "No hay actividad registrada en las últimas 48 horas.";

    // --- LÓGICA DE PERFIL ATLÉTICO (14 días) ---
    const twoWeeksAgo = Date.now() - (14 * 24 * 60 * 60 * 1000);
    const longTermExercises = allUnifiedHistory.filter((h: any) => h.type === 'exercise' && h.timestamp > twoWeeksAgo);
    const isAthletic = longTermExercises.length >= 6;
    
    const profilePrompt = isAthletic 
        ? "PERFIL DETECTADO: Usuario Atlético/Activo. Aumentar ligeramente las porciones."
        : "PERFIL DETECTADO: Sedentario/Moderado. Mantener porciones estándar.";
    
    // --- CONTEXTO DE EJERCICIO INMEDIATO (Hoy) ---
    const exercises = getTodayExercises();
    let exercisePrompt = "Sin ejercicio registrado hoy.";
    if (exercises.length > 0) {
        const lastExercise = exercises[exercises.length - 1];
        exercisePrompt = `[EVENTO RECIENTE]: Ejercicio a las ${lastExercise.time} - Tiempo de recuperación crítico.`;
    }

    // --- System Instruction (Reglas para la IA) ---
    const recipeList = recipes.map((r: any) => r.title).join('; ');
    
    const systemText = `
    Eres 'Mi Asistente Nutri-Flex', un coach amable y motivador (Regla 80/20).
    
    [DATOS DEL JUGADOR]:
    - Puntaje Hoy: ${score} | Racha: ${streak} días.
    - ${profilePrompt}
    - ${exercisePrompt}

    [CONTEXTO ACTUAL]:
    1. INVENTARIO: ${pantry.join(', ')}.
    2. RECETAS PROPIAS: ${recipeList || "Ninguna"}.
    3. HISTORIAL RECIENTE (Últimas 48h):
    ${calculatedHistoryString}

    [REGLAS]:
    1. Sé breve, motivador y usa emojis.
    2. Si sugieres una receta, verifica si los ingredientes son del inventario. Si faltan, ponlos como "[Compra Rápida]".
    3. Si das una receta completa, INCLUYE SIEMPRE este JSON al final:
    
    \`\`\`json
    {
      "type": "recipe_card",
      "title": "Nombre Receta",
      "time": "XX min",
      "ingredients": ["ingrediente 1", "ingrediente 2 [Compra Rápida]"],
      "instructions": ["Paso 1", "Paso 2"],
      "macros": { "calories": "0", "protein": "0g", "carbs": "0g", "fats": "0g" }
    }
    \`\`\`
    `;
    // --- Fin System Instruction ---

    // --- Limpieza de historial y Envío a Chat ---
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
    console.error("Error en chat (FATAL):", error);
    return "Error de conexión o datos. Asegúrate de que tu llave API sea válida.";
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