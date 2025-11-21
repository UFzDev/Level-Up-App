// La referencia es necesaria para que TypeScript entienda el entorno Vite
/// <reference types="vite/client" />

import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai";
// Asumo que tienes un archivo types.ts que define estos modelos de datos
import { UserRecipe } from "../types"; 
import { getUnifiedHistory, getTodayExercises } from "./storageService";

// ========================================================================
// 1. GESTIÓN DE CLIENTE (Multi-Usuario)
// ========================================================================
let genAIInstance: GoogleGenerativeAI | null = null;
const MODEL_NAME = "gemini-2.5-flash"; // Usamos el modelo más estable y de alta cuota

// 1.1. Función de Inicialización (Llamada desde App.tsx al ingresar la clave)
export const initializeGemini = (apiKey: string) => {
  // Inicializa el cliente con la clave del usuario
  genAIInstance = new GoogleGenerativeAI(apiKey);
};

// 1.2. Función auxiliar para obtener el modelo (usada por todas las demás funciones)
const getModel = () => {
  // Si no está inicializado, intentamos recuperarlo del localStorage automáticamente
  if (!genAIInstance) {
    const storedKey = localStorage.getItem('user_api_key');
    if (storedKey) {
      // ¡Auto-recuperación! 🚑
      genAIInstance = new GoogleGenerativeAI(storedKey);
      console.log("🔄 Gemini recuperado automáticamente desde almacenamiento.");
    } else {
      // Si de verdad no hay llave, entonces sí lanzamos el error
      throw new Error("Gemini Client no inicializado. Clave no disponible.");
    }
  }
  
  // Ahora sí, regresamos el modelo
  return genAIInstance.getGenerativeModel({ model: MODEL_NAME });
};

// ========================================================================
// 2. FUNCIONES DE ANÁLISIS (Usando getModel())
// ========================================================================

export const generateDailyPlan = async (): Promise<string> => {
  try {
    const model = getModel();
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
    const model = getModel();
    // 1. Extraemos TODOS los datos (incluyendo los nuevos de Bienestar)
    const { pantry, recipes, score, streak, lastNightSleepHours, wellnessSettings } = contextData;

    // --- LÓGICA DE TIEMPO Y FASES NUTRICIONALES (TUYA, CONSERVADA) ---
    const currentTime = new Date();
    const currentHour = currentTime.getHours();
    const timeOfDay = currentTime.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
    const todayStart = new Date(currentTime.setHours(0, 0, 0, 0)).getTime();

    const allUnifiedHistory = getUnifiedHistory(); 
    
    // Filtramos comidas completadas HOY usando consumedAt si existe, o timestamp
    const todayCompletedMeals = allUnifiedHistory.filter((item: any) => {
        const t = item.consumedAt || item.timestamp;
        return item.type === 'meal' && item.status === 'completed' && t >= todayStart;
    });

    let mealContext = "Fase Nutricional: ";
    let missingMealPrompt = "";
    
    // Chequeo de comidas (Mejorado para usar timestamp real)
    const hasBreakfast = todayCompletedMeals.some((m: any) => new Date(m.consumedAt || m.timestamp).getHours() < 12);
    const hasLunch = todayCompletedMeals.some((m: any) => {
        const h = new Date(m.consumedAt || m.timestamp).getHours();
        return h >= 12 && h < 18;
    });
    const hasDinner = todayCompletedMeals.some((m: any) => new Date(m.consumedAt || m.timestamp).getHours() >= 18);

    // Tu lógica de horarios intacta
    if (currentHour >= 5 && currentHour < 12) {
        mealContext += "MAÑANA (Desayuno).";
        if (!hasBreakfast && currentHour >= 8) missingMealPrompt = "⚠️ INSTRUCCIÓN: No ha desayunado. Prioriza sugerir desayuno energético.";
        else if (hasBreakfast && currentHour >= 11) missingMealPrompt = "Ya desayunó. Sugiere snack ligero.";
    } else if (currentHour >= 12 && currentHour < 18) { // Ajusté a 18 para cubrir tarde
        mealContext += "MEDIODÍA (Comida).";
        if (!hasLunch && currentHour >= 14) missingMealPrompt = "⚠️ INSTRUCCIÓN: No ha comido. Prioriza sugerir plato fuerte.";
        else if (hasLunch) missingMealPrompt = "Ya comió. Sugiere snack o té.";
    } else if (currentHour >= 18 && currentHour < 22) {
        mealContext += "NOCHE (Cena).";
        if (!hasDinner && currentHour >= 20) missingMealPrompt = "⚠️ INSTRUCCIÓN: No ha cenado. Sugiere cena ligera con proteína.";
        else if (hasDinner) missingMealPrompt = "Ya cenó. Felicita y sugiere descanso.";
    } else {
        mealContext += "MADRUGADA/DESCANSO.";
        missingMealPrompt = "Promueve solo hidratación o descanso.";
    }

    const timeContextPrompt = `
    [CONTEXTO TEMPORAL]:
    - HORA: ${timeOfDay} | FASE: ${mealContext}
    - ${missingMealPrompt}
    `;

    // --- NUEVO: LÓGICA DE SUEÑO (INYECTADA) ---
    let sleepContext = "";
    if (wellnessSettings?.enableSleep) {
        if (lastNightSleepHours !== null) {
            if (lastNightSleepHours < 6) {
                sleepContext = `⚠️ ALERTA BIENESTAR: El usuario durmió solo ${lastNightSleepHours}h. Está cansado. SUGERIR: Energía sostenida, evitar comidas pesadas.`;
            } else {
                sleepContext = `✅ BIENESTAR: Sueño recuperador (${lastNightSleepHours}h).`;
            }
        }
    }

    // --- LÓGICA DE 48 HORAS (MEJORADA) ---
    const twoDaysAgo = Date.now() - (48 * 60 * 60 * 1000);
    const recentItems = allUnifiedHistory.filter((item: any) => {
        const t = item.consumedAt || item.timestamp;
        return t > twoDaysAgo;
    });

    const calculatedHistoryString = recentItems.length > 0 
        ? recentItems.map((h: any) => {
            const t = h.consumedAt || h.timestamp;
            const dateStr = new Date(t).toLocaleDateString('es-ES', { weekday: 'short', hour: '2-digit', minute: '2-digit' });
            if (h.type === 'exercise') return `- [EJERCICIO ${dateStr}] 🏃 ${h.name} (${h.duration}min, ${h.caloriesBurned}kcal)`;
            return `- [COMIDA ${dateStr}] ${h.title} (${h.calories} kcal)`;
        }).join('\n')
        : "Sin actividad reciente.";

    // --- SYSTEM PROMPT FINAL ---
    const systemText = `
    Eres 'Level Up Coach', experto en nutrición y fitness.
    
    [DATOS JUGADOR]: Score ${score} | Racha ${streak}.
    ${sleepContext}

    ${timeContextPrompt}

    [HISTORIAL RECIENTE 48H]:
    ${calculatedHistoryString}

    [INVENTARIO]: ${pantry.join(', ')}.

    [REGLAS]:
    1. Sé breve y motivador.
    2. Si sugieres receta, verifica ingredientes.
    3. Si das una receta completa, INCLUYE SIEMPRE este JSON al final:
    \`\`\`json
    { "type": "recipe_card", "title": "Nombre", "time": "15m", "ingredients": [], "instructions": [], "macros": {"calories": "0", "protein": "0", "carbs": "0", "fats": "0"} }
    \`\`\`
    `;

    // --- Limpieza y Envío ---
    let cleanHistory = history.map(h => ({
      role: h.role === 'user' ? 'user' : 'model',
      parts: [{ text: h.parts[0].text }]
    }));
    if (cleanHistory.length > 0 && cleanHistory[0].role === 'model') { cleanHistory.shift(); }

    const chat = model.startChat({
      history: cleanHistory,
      systemInstruction: { role: "system", parts: [{ text: systemText }] }
    });

    const result = await chat.sendMessage(message);
    return result.response.text();

  } catch (error) {
    console.error("Error en chat (FATAL):", error);
    if ((error as Error).message.includes("no inicializado")) {
        return "Gemini no está inicializado. Ingresa tu API Key en inicio.";
    }
    return "Error de conexión. Verifica tu API Key.";
  }
};

// --- EL RESTO DE FUNCIONES SE AJUSTAN IGUAL ---

export const analyzeFridgeImage = async (base64Image: string, mimeType: string) => {
  try {
    const model = getModel(); // Usando el modelo inicializado
    const result = await model.generateContent([
      { inlineData: { mimeType, data: base64Image } },
      "Analiza esta imagen. Sugiere 3 comidas saludables."
    ]);
    return result.response.text();
  } catch (e) { return "Error analizando imagen."; }
};

export const analyzeProductLabel = async (base64Image: string, mimeType: string) => {
    try {
      const model = getModel();
      const result = await model.generateContent([
        { inlineData: { mimeType, data: base64Image } },
        "Veredicto: '✅ Aprobado', '⚠️ Moderado', o '❌ Evitar'."
      ]);
      return result.response.text();
    } catch (e) { return "Error leyendo etiqueta."; }
};

// --- FUNCIONES FALTANTES QUE DASHBOARD NECESITA ---

export const analyzeFoodImpact = async (foodName: string) => {
  try {
    const model = getModel();
    // Prompt forzando JSON
    const prompt = `Analiza: "${foodName}". Actúa como Juez.
    Responde SOLO este JSON sin texto extra:
    { "isHealthy": boolean, "calories": number, "scoreImpact": number, "reason": "frase corta" }`;
    
    const result = await model.generateContent(prompt);
    const text = result.response.text().replace(/```json|```/g, "").trim(); 
    return JSON.parse(text);
  } catch (e) {
    return { isHealthy: true, calories: 200, scoreImpact: 10, reason: "Error de conexión" };
  }
};

export const estimateCaloriesBurned = async (activity: string, duration: number, intensity: string) => {
    try {
      const model = getModel();
      const prompt = `Calcula calorías para: ${activity}, ${duration} min, intensidad ${intensity}. 
      Responde SOLO JSON: { "calories": number }`;
      const result = await model.generateContent(prompt);
      const text = result.response.text().replace(/```json|```/g, "").trim();
      return JSON.parse(text).calories || duration * 5;
    } catch (e) { return duration * 5; }
};

// --- FUNCIONES UTILITY (Para que el archivo quede completo) ---

export const searchNutritionInfo = async (query: string) => {
    // Estas funciones no usan el modelo para ahorrar recursos
    return { text: "Búsqueda no disponible.", sources: [] };
};

export const estimateRecipeNutrition = async (t: string, i: string) => {
    return { calories: "0", protein: "0", carbs: "0", fats: "0" };
};