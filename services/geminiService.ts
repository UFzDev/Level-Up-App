// La referencia es necesaria para que TypeScript entienda el entorno Vite
/// <reference types="vite/client" />

import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai";
// Asumo que tienes un archivo types.ts que define estos modelos de datos
import { UserRecipe } from "../types"; 
import { getUnifiedHistory, getTodayExercises, getLastNightSleepHours, getWellnessSettings, getWaterData } from "./storageService";

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
  // 1. Si la instancia se borró (por recarga), intentamos recuperarla
  if (!genAIInstance) {
    const storedKey = localStorage.getItem('user_api_key'); // Busca la llave guardada
    
    if (storedKey) {
      genAIInstance = new GoogleGenerativeAI(storedKey);
      console.log("🔄 Conexión con Gemini recuperada silenciosamente.");
    } else {
      // 2. Solo si NO hay llave guardada, lanzamos el error
      throw new Error("Gemini no está inicializado. Por favor ingresa tu API Key en la pantalla de inicio o menú.");
    }
  }
  
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

// --- NUEVA FUNCIÓN HELPER (Pégala antes de chatWithChef) ---
const getGlobalContext = () => {
    const sleep = getLastNightSleepHours();
    const settings = getWellnessSettings();
    const exercises = getTodayExercises();
    const water = getWaterData(); // <--- Leemos tu agua actual
    const now = new Date();
    
    // 1. Contexto de Ejercicio
    let exerciseContext = "Actividad hoy: Sedentario/Bajo.";
    if (exercises.length > 0) {
        const last = exercises[exercises.length - 1];
        const [h, m] = last.time.split(':').map(Number);
        const exTime = new Date(now); exTime.setHours(h, m, 0, 0);
        const diffHours = (now.getTime() - exTime.getTime()) / 3600000;
        
        if (diffHours < 4) {
            exerciseContext = `🔥 ALERTA ENTRENAMIENTO: Entrenó hace ${diffHours.toFixed(1)}h (${last.intensity}). El cuerpo pide recuperación.`;
        } else {
            exerciseContext = `Entrenó hace ${diffHours.toFixed(1)}h.`;
        }
    }

    // 2. Contexto de Sueño
    let sleepContext = "Descanso: Normal.";
    if (settings?.enableSleep && sleep !== null) {
        sleepContext = sleep < 6 
            ? `⚠️ ALERTA SUEÑO: Durmió mal (${sleep}h). Cansancio acumulado.` 
            : `✅ SUEÑO: Descanso óptimo (${sleep}h).`;
    }

    // 3. Contexto de Hidratación (NUEVO)
    let waterContext = `Hidratación: ${water.count} vasos.`;
    const hour = now.getHours();
    if (hour >= 12 && water.count < 2) waterContext += " 🚨 ALERTA: Muy deshidratado para esta hora.";
    else if (hour >= 18 && water.count < 5) waterContext += " ⚠️ ALERTA: Bajo consumo de agua en el día.";
    else if (water.count >= 8) waterContext += " 🏆 Meta de agua cumplida.";

    // 4. Hora del día
    let timeContext = "Hora: Normal.";
    if (hour > 21 || hour < 5) timeContext = "⚠️ ALERTA: Es muy tarde/noche. Metabolismo lento.";

    return `
    [CONSTANTES VITALES]:
    - ${exerciseContext}
    - ${sleepContext}
    - ${waterContext}
    - ${timeContext}
    `;
};

export const chatWithChef = async (
  history: { role: string; parts: { text: string }[] }[], 
  message: string,
  contextData: any
) => {
  try {
    const model = getModel();
    // 1. Desempaquetamos TODOS los datos
    const { pantry, recipes, score, streak, lastNightSleepHours, wellnessSettings } = contextData;

    // --- A. LÓGICA DE TIEMPO Y FASES (La agresiva que sí funciona) ---
    const currentTime = new Date();
    const currentHour = currentTime.getHours();
    const timeOfDay = currentTime.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
    
    // Lógica rápida de fase del día
    let mealContext = "Madrugada";
    if (currentHour >= 5 && currentHour < 12) mealContext = "MAÑANA (Desayuno)";
    else if (currentHour >= 12 && currentHour < 18) mealContext = "MEDIODÍA (Comida)";
    else if (currentHour >= 18 && currentHour < 22) mealContext = "NOCHE (Cena)";
    else mealContext = "HORA DE DORMIR";

    const timeContextPrompt = `
    [RELOJ Y TIEMPO REAL (DATO MAESTRO)]:
    - HORA ACTUAL: ${timeOfDay}
    - FASE: ${mealContext}
    IMPORTANTE: SÍ tienes reloj. Úsalo para sugerir comidas apropiadas a la hora.
    `;

    // --- B. LÓGICA DE HISTORIAL (48H + SEMANAL) ---
    const now = Date.now();
    const twoDaysAgo = now - (48 * 60 * 60 * 1000);
    const sevenDaysAgo = now - (7 * 24 * 60 * 60 * 1000);
    const allUnifiedHistory = getUnifiedHistory(); 

    // 1. Memoria Inmediata (48h)
    const recentItems = allUnifiedHistory.filter((item: any) => {
        const t = item.consumedAt || item.timestamp;
        return t > twoDaysAgo;
    });
    const history48h = recentItems.length > 0 
        ? recentItems.map((h: any) => {
            const t = h.consumedAt || h.timestamp;
            const dateStr = new Date(t).toLocaleDateString('es-ES', { weekday: 'short', hour: '2-digit' });
            return `- ${h.title || h.name} (${h.calories || h.caloriesBurned} kcal)`;
        }).join('\n')
        : "Sin actividad reciente.";

    // 2. Memoria Semanal (Patrones)
    const weeklyItems = allUnifiedHistory.filter((item: any) => {
        const t = item.consumedAt || item.timestamp;
        return t > sevenDaysAgo && t <= twoDaysAgo; // Lo que pasó antes de las 48h
    });
    const historyWeekly = weeklyItems.length > 0
        ? weeklyItems.map((h: any) => h.title || h.name).join(', ')
        : "Sin registros antiguos.";

    // --- C. LÓGICA DE BIENESTAR (Sueño) ---
    let sleepContext = "";
    if (wellnessSettings?.enableSleep) {
        if (lastNightSleepHours !== null) {
            sleepContext = lastNightSleepHours < 6 
                ? `⚠️ ALERTA: Durmió mal (${lastNightSleepHours}h).` 
                : `✅ Descanso: Bien (${lastNightSleepHours}h).`;
        }
    }

    // --- D. SYSTEM PROMPT FINAL (CON TODO INTEGRADO) ---
    const systemText = `
    Eres 'Level Up Coach', consultor experto en salud y nutrición 80/20.
    
    ${timeContextPrompt}

    [ESTADO DEL USUARIO]:
    - Score: ${score} | Racha: ${streak}.
    - ${sleepContext}

    [MEMORIA INMEDIATA (Últimas 48h - Balance Químico)]:
    ${history48h}

    [PATRONES SEMANALES (Contexto General)]:
    ${historyWeekly}

    [INVENTARIO DISPONIBLE]:
    ${pantry.join(', ')}.

    [REGLAS ABSOLUTAS]:
    1. **LA LISTA DE [MEMORIA INMEDIATA] ES TU ÚNICA FUENTE DE VERDAD.**
    2. Si en el chat anterior confirmamos una comida, pero YA NO aparece en [MEMORIA INMEDIATA], significa que el usuario la BORRÓ. **Haz de cuenta que nunca existió.**
    3. Si el usuario te pregunta "¿Qué he comido?", lee SOLO la lista de [MEMORIA INMEDIATA]. No inventes ni recuerdes cosas viejas del chat.
    [OTRAS REGLAS]
    1. Sé breve y motivador.
    2. Usa el contexto para personalizar tu respuesta.
    3. **PROTOCOLO DE RECETAS (CRÍTICO):**
       SIEMPRE que sugieras una comida específica o des instrucciones de preparación, ES OBLIGATORIO incluir al final el bloque de código JSON para que la app genere la tarjeta interactiva.
       
       Si no incluyes el JSON, el usuario no podrá guardar su comida.
       
       Usa ESTRICTAMENTE este formato al final de tu respuesta:
       \`\`\`json
       { 
         "type": "recipe_card", 
         "title": "Título del Plato", 
         "time": "XX min", 
         "ingredients": ["Ingrediente 1", "Ingrediente 2"], 
         "instructions": ["Paso 1", "Paso 2"], 
         "isHealthy": true, 
         "scoreImpact": 100, 
         "healthTag": "Etiqueta (ej: Proteína Pura)", 
         "macros": {"calories": "0", "protein": "0", "carbs": "0", "fats": "0"} 
       }
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

// --- HELPER: Contexto para Jueces ---
const getJudgeContext = (customTimestamp?: number) => {
    // Si nos mandan una hora específica (ej: la que pusiste en el modal), usamos esa.
    // Si no, usamos "ahora mismo".
    const now = customTimestamp ? new Date(customTimestamp) : new Date();
    
    const sleep = getLastNightSleepHours();
    const exercises = getTodayExercises();
    const settings = getWellnessSettings();
    
    // 1. Contexto de Ejercicio (Comparado con la hora del registro)
    let exerciseContext = "Sedentario hasta este momento.";
    if (exercises.length > 0) {
        // Filtramos ejercicios que ocurrieron ANTES de la hora de la comida
        const exercisesBeforeMeal = exercises.filter((ex: any) => {
            const [h, m] = ex.time.split(':').map(Number);
            const exTime = new Date(now); 
            exTime.setHours(h, m, 0, 0);
            // Comparamos con la fecha del registro, no la actual
            return exTime.getTime() < now.getTime();
        });

        if (exercisesBeforeMeal.length > 0) {
            const last = exercisesBeforeMeal[exercisesBeforeMeal.length - 1];
            // Calculamos diferencia de horas
            const [h, m] = last.time.split(':').map(Number);
            const exTime = new Date(now); exTime.setHours(h, m, 0, 0);
            const diffHours = (now.getTime() - exTime.getTime()) / 3600000;

            if (diffHours < 3) {
                exerciseContext = `ALERTA FISIOLÓGICA: El usuario entrenó hace ${diffHours.toFixed(1)}h (${last.intensity}). Necesita recuperación.`;
            } else {
                exerciseContext = `Entrenó hace ${diffHours.toFixed(1)}h.`;
            }
        }
    }

    // 2. Contexto de Sueño
    let sleepContext = "Sueño normal.";
    if (settings?.enableSleep && sleep !== null && sleep < 6) {
        sleepContext = `ALERTA: Usuario durmió mal (${sleep}h). Propenso a antojos.`;
    }

    // 3. Hora del registro (Usamos la hora que tú elegiste)
    const hour = now.getHours();
    let timeContext = "Hora normal.";
    if (hour > 21 || hour < 5) timeContext = "ALERTA: Es muy tarde/noche. Penaliza comidas pesadas.";

    return `
    [CONTEXTO AL MOMENTO DE COMER (${now.toLocaleTimeString()})]:
    - ${exerciseContext}
    - ${sleepContext}
    - ${timeContext}
    `;
};

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

export const analyzeFoodImpact = async (foodName: string, customTimestamp?: number) => {
  try {
    const model = getModel();
    // Aquí le pasamos el contexto vital al Juez
    const context = getGlobalContext(); 

    const prompt = `
    Analiza: "${foodName}". Actúa como Juez Nutricional 80/20.
    ${context}
    
    INSTRUCCIONES:
    1. Ajusta veredicto según CONTEXTO VITAL. (Ej: Pizza post-entreno es mejor que pizza sedentaria).
    2. Responde SOLO JSON: { "isHealthy": boolean, "calories": number, "scoreImpact": number (-50 a +100), "reason": "frase corta" }
    `;
    
    const result = await model.generateContent(prompt);
    const text = result.response.text().replace(/```json|```/g, "").trim(); 
    return JSON.parse(text);
  } catch (e) {
    return { isHealthy: true, calories: 200, scoreImpact: 10, reason: "Registro manual" };
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

export const analyzeMealImage = async (base64Image: string, mimeType: string) => {
  try {
    const model = getModel(); 
    const context = getGlobalContext(); // Contexto vital para la foto también

    const prompt = `
      Actúa como Juez Nutricional. Analiza imagen.
      ${context}
      RESPONDE SOLO JSON:
      { "dishName": "Nombre", "calories": 0, "isHealthy": boolean, "description": "Descripción + Contexto" }
    `;

    const result = await model.generateContent([
      { inlineData: { mimeType, data: base64Image } },
      prompt
    ]);

    const text = result.response.text();
    const jsonMatch = text.match(/\{[\s\S]*\}/);

    if (jsonMatch) return JSON.parse(jsonMatch[0]);
    throw new Error("No JSON");

  } catch (error) {
    return { dishName: "Plato Detectado", calories: 0, isHealthy: true, description: "Error IA" };
  }
};