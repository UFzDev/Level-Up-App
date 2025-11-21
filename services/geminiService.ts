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
  if (!genAIInstance) {
    // Esto disparará la lógica de App.tsx para pedir la clave de nuevo
    throw new Error("Gemini Client no inicializado. Por favor ingrese su API Key.");
  }
  // Todas las funciones llaman al modelo de forma segura
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
        const { pantry, recipes, score, streak } = contextData;

        // --- LÓGICA DE TIEMPO Y FASES NUTRICIONALES ---
        const currentTime = new Date();
        const currentHour = currentTime.getHours();
        const timeOfDay = currentTime.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
        const today = new Date(currentTime.setHours(0, 0, 0, 0)).getTime();

        // Obtener el historial de hoy para verificar comidas completadas
        const allUnifiedHistory = getUnifiedHistory(); 
        const todayCompletedMeals = allUnifiedHistory.filter((item: any) => 
            item.type === 'meal' && 
            item.status === 'completed' && 
            item.timestamp >= today
        );

        let mealContext = "Fase Nutricional: ";
        let missingMealPrompt = "";
        
        // Determinar si ya se registraron las comidas principales
        const hasBreakfast = todayCompletedMeals.some((m: any) => new Date(m.timestamp).getHours() < 12);
        const hasLunch = todayCompletedMeals.some((m: any) => new Date(m.timestamp).getHours() >= 12 && new Date(m.timestamp).getHours() < 17);
        const hasDinner = todayCompletedMeals.some((m: any) => new Date(m.timestamp).getHours() >= 17);

        if (currentHour >= 5 && currentHour < 12) {
            // Mañana (5:00 - 11:59)
            mealContext += "MAÑANA (Desayuno/Media Mañana).";
            if (!hasBreakfast && currentHour >= 8) {
                missingMealPrompt = "¡CUIDADO! Aún no se ha registrado el DESAYUNO. **Prioriza recordar al usuario agregar su desayuno** o sugerir algo rápido y nutritivo.";
            } else if (hasBreakfast && currentHour >= 11) {
                missingMealPrompt = "Ya desayunó. Sugiere una MERIENDA o prepara el contexto para la COMIDA.";
            }
        } else if (currentHour >= 12 && currentHour < 17) {
            // Mediodía (12:00 - 16:59)
            mealContext += "MEDIODÍA (Comida/Almuerzo).";
            if (!hasLunch && currentHour >= 13) {
                missingMealPrompt = "¡CUIDADO! Aún no se ha registrado la COMIDA. **Prioriza recordar al usuario agregar su comida** o sugerir un PLATO FUERTE.";
            } else if (hasLunch && currentHour >= 15) {
                missingMealPrompt = "Ya comió. Sugiere un snack o postre ligero.";
            }
        } else if (currentHour >= 17 && currentHour < 22) {
            // Tarde/Noche (17:00 - 21:59)
            mealContext += "TARDE/NOCHE (Cena).";
            if (!hasDinner && currentHour >= 19) {
                missingMealPrompt = "¡CUIDADO! Aún no se ha registrado la CENA. **Prioriza recordar al usuario agregar su cena** o sugerir una cena ligera y rica en proteína.";
            } else if (hasDinner) {
                missingMealPrompt = "Ya cenó. Pregunta cómo le fue con su día o si necesita ayuda planificando mañana.";
            }
        } else {
            // Tarde/Noche (22:00 - 04:59)
            mealContext += "DESCANSO/VENTANA DE AYUNO. NO SUGERIR COMIDAS PESADAS.";
            missingMealPrompt = "Promueve la hidratación o el descanso. Solo sugiera si el usuario lo pide explícitamente.";
        }

        const timeContextPrompt = `
[CONTEXTO TEMPORAL]:
- HORA ACTUAL: ${timeOfDay}
- ${mealContext}
- INSTRUCCIÓN DE LA HORA: ${missingMealPrompt}
        `;


        // --- LÓGICA DE CONTEXTO DE 48 HORAS (Mantenida) ---
        const twoDaysAgo = Date.now() - (48 * 60 * 60 * 1000);
        
        const recentItems = allUnifiedHistory.filter((item: any) => {
            return item.timestamp > twoDaysAgo;
        });

        const calculatedHistoryString = recentItems.length > 0 
            ? recentItems.map((h: any) => {
                const dateStr = new Date(h.timestamp).toLocaleDateString('es-ES', { weekday: 'short', hour: '2-digit', minute: '2-digit' });
                if (h.type === 'exercise') {
                    return `- [EJERCICIO ${dateStr}] 🏃 ${h.name} (${h.duration}min)`;
                } else {
                    return `- [COMIDA ${dateStr}] ${h.title} (${h.calories} kcal)`;
                }
            }).join('\n')
            : "No hay actividad registrada en las últimas 48 horas.";

        const systemText = `
Eres 'Level Up Coach', experto en nutrición y fitness.
${timeContextPrompt} // ¡NUEVA INFORMACIÓN DE HORA INYECTADA!
[DATOS DEL JUGADOR]: Score ${score} | Racha ${streak} días.
[CONTEXTO RECIENTE (48h)]: ${calculatedHistoryString}
[INVENTARIO]: ${pantry.join(', ')}.

[REGLAS]: Sé breve, motivador, y si das una receta completa, INCLUYE SIEMPRE el JSON al final.
`;

        // Limpieza de historial para el API
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
        // Manejo de error de inicialización
        if ((error as Error).message.includes("no inicializado")) {
            return "El servicio de Gemini no está inicializado. Por favor, asegúrate de haber ingresado tu API Key en la pantalla de inicio.";
        }
        return "Error de conexión. Asegúrate de que tu llave API sea válida.";
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