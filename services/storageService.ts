
const PANTRY_KEY = 'nutri-flex-pantry';
const RECIPES_KEY = 'nutri-flex-recipes';
const HISTORY_KEY = 'nutri-flex-history';
const WATER_KEY = 'nutri-flex-water';
const WATER_HISTORY_KEY = 'nutri-flex-water-history'; // Map<DateString, Count>
const CHAT_HISTORY_KEY = 'nutri-flex-chat-history';

// V12 Keys
const SETTINGS_KEY = 'nutri-flex-settings';
const SLEEP_KEY = 'nutri-flex-sleep'; // Map<DateString, number>
const STEPS_KEY = 'nutri-flex-steps'; // Map<DateString, number>
const HABITS_KEY = 'nutri-flex-habits'; // Habit[]
const HABITS_LOG_KEY = 'nutri-flex-habits-log'; // HabitLog[]

import { UserRecipe, MealLog, ExerciseLog, Intensity, HistoryItem, WaterData, Streaks, DailyBreakdown, WeeklyStatsData, Message, WellnessSettings, Habit, HabitLog } from '../types';

// --- PANTRY ---

const DEFAULT_INGREDIENTS = [
  'Pan', 'huevo', 'jamón', 'salchicha', 'atún', 'nuggets', 
  'fresas congeladas', 'plátano', 'proteína en polvo', 'zucaritas', 'leche', 'galletas'
];

export const getPantry = (): string[] => {
  try {
    const stored = localStorage.getItem(PANTRY_KEY);
    if (!stored) {
      localStorage.setItem(PANTRY_KEY, JSON.stringify(DEFAULT_INGREDIENTS));
      return DEFAULT_INGREDIENTS;
    }
    return JSON.parse(stored);
  } catch (e) {
    console.error("Error reading pantry", e);
    return DEFAULT_INGREDIENTS;
  }
};

export const addToPantry = (item: string): string[] => {
  const current = getPantry();
  if (!current.includes(item)) {
    const updated = [...current, item];
    localStorage.setItem(PANTRY_KEY, JSON.stringify(updated));
    return updated;
  }
  return current;
};

export const removeFromPantry = (itemToRemove: string): string[] => {
  const current = getPantry();
  const updated = current.filter(item => item !== itemToRemove);
  localStorage.setItem(PANTRY_KEY, JSON.stringify(updated));
  return updated;
};

// --- USER RECIPES ---

export const getUserRecipes = (): UserRecipe[] => {
  try {
    const stored = localStorage.getItem(RECIPES_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (e) {
    return [];
  }
};

export const addUserRecipe = (recipe: UserRecipe): UserRecipe[] => {
  const current = getUserRecipes();
  const updated = [...current, recipe];
  localStorage.setItem(RECIPES_KEY, JSON.stringify(updated));
  return updated;
};

export const removeUserRecipe = (id: string): UserRecipe[] => {
  const current = getUserRecipes();
  const updated = current.filter(r => r.id !== id);
  localStorage.setItem(RECIPES_KEY, JSON.stringify(updated));
  return updated;
};

// --- UNIFIED HISTORY (Meals + Exercises) ---

export const getUnifiedHistory = (): HistoryItem[] => {
  try {
    const stored = localStorage.getItem(HISTORY_KEY);
    const items: any[] = stored ? JSON.parse(stored) : [];
    
    return items.map(item => {
        if (item.type) return item as HistoryItem;
        return { ...item, type: 'meal' } as MealLog;
    });
  } catch (e) {
    return [];
  }
};

export const saveUnifiedHistory = (items: HistoryItem[]) => {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(items));
};

// --- WATER LOGIC (Hydration) ---

const getTodayDateString = (d: Date = new Date()) => {
  return `${d.getFullYear()}-${d.getMonth()+1}-${d.getDate()}`;
};

const getWaterHistory = (): Record<string, number> => {
    try {
        const stored = localStorage.getItem(WATER_HISTORY_KEY);
        return stored ? JSON.parse(stored) : {};
    } catch {
        return {};
    }
};

export const getWaterData = (): WaterData => {
  const todayStr = getTodayDateString();
  try {
    const stored = localStorage.getItem(WATER_KEY);
    if (stored) {
      const data: WaterData = JSON.parse(stored);
      if (data.date === todayStr) {
        return data;
      }
    }
  } catch (e) {
    // ignore
  }
  return { date: todayStr, count: 0, lastSipTimestamp: Date.now() };
};

export const updateWater = (delta: number): WaterData => {
  const current = getWaterData();
  const newCount = Math.max(0, current.count + delta);
  
  // Save to Today's Key
  const newData: WaterData = {
    date: current.date,
    count: newCount,
    lastSipTimestamp: Date.now()
  };
  localStorage.setItem(WATER_KEY, JSON.stringify(newData));

  // Save to Historical Map
  const history = getWaterHistory();
  history[current.date] = newCount;
  localStorage.setItem(WATER_HISTORY_KEY, JSON.stringify(history));

  return newData;
};

// --- CHAT HISTORY PERSISTENCE ---

export const saveChatHistory = (messages: Message[]) => {
  try {
    localStorage.setItem(CHAT_HISTORY_KEY, JSON.stringify(messages));
  } catch (e) {
    console.error("Error saving chat history", e);
  }
};

export const loadChatHistory = (): Message[] => {
  try {
    const stored = localStorage.getItem(CHAT_HISTORY_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (e) {
    console.error("Error loading chat history", e);
    return [];
  }
};

// --- LOGGING HELPERS ---

export const logExercise = (
    name: string, 
    time: string, 
    intensity: Intensity, 
    duration: number,
    caloriesBurned: number
): HistoryItem[] => {
    const current = getUnifiedHistory();
    const newLog: ExerciseLog = {
        type: 'exercise',
        id: Date.now().toString(),
        name,
        time,
        intensity,
        duration,
        caloriesBurned,
        timestamp: Date.now(),
        status: 'completed'
    };
    const updated = [newLog, ...current];
    saveUnifiedHistory(updated);
    return updated;
};

export const getTodayExercises = (): ExerciseLog[] => {
    const all = getUnifiedHistory();
    const startOfDay = new Date();
    startOfDay.setHours(0,0,0,0);
    
    return all.filter((item): item is ExerciseLog => 
        item.type === 'exercise' && item.timestamp >= startOfDay.getTime()
    );
};

export const logMeal = (
    title: string, 
    status: 'pending' | 'completed', 
    isHealthy: boolean, 
    calories: number,
    notes: string = '',
    scoreValue?: number
): HistoryItem[] => {
  const current = getUnifiedHistory();
  const newLog: MealLog = {
    type: 'meal',
    id: Date.now().toString(),
    title,
    status,
    isHealthy,
    calories,
    userNotes: notes,
    timestamp: Date.now(),
    consumedAt: status === 'completed' ? Date.now() : undefined,
    scoreValue
  };
  
  const updated = [newLog, ...current];
  saveUnifiedHistory(updated);
  return updated;
};

export const confirmMeal = (id: string, notes: string): HistoryItem[] => {
    const current = getUnifiedHistory();
    const updated = current.map((item) => {
        if (item.id === id && item.type === 'meal') {
            return {
                ...item,
                status: 'completed',
                userNotes: notes,
                consumedAt: Date.now(),
                scoreValue: item.scoreValue !== undefined ? item.scoreValue : (item.isHealthy ? 100 : -50) // V11 Logic: +100 or -50
            } as MealLog;
        }
        return item;
    });
    saveUnifiedHistory(updated);
    return updated;
}

export const deleteItem = (id: string): HistoryItem[] => {
    const current = getUnifiedHistory();
    const updated = current.filter(m => m.id !== id);
    saveUnifiedHistory(updated);
    return updated;
}

export const getRecentHistoryAsString = (hours: number = 48): string => {
    const history = getUnifiedHistory();
    const cutoff = Date.now() - (hours * 60 * 60 * 1000);
    const recent = history.filter(h => h.timestamp > cutoff);
    
    if (recent.length === 0) return "No hay actividad registrada recientemente.";
    
    return recent.map(h => {
        if (h.type === 'exercise') {
             return `- [EJERCICIO] 🏃 ${h.name} (${h.duration}min, ${h.intensity}, ${h.caloriesBurned}kcal) a las ${h.time}`;
        } else {
            const status = h.status === 'completed' ? '✅' : '⏳';
            const notes = h.userNotes ? `(Notas: ${h.userNotes})` : '';
            return `- [COMIDA] ${status} ${h.title} [${h.isHealthy ? 'Saludable' : 'Antojo'}] ${notes}`;
        }
    }).join('\n');
};

// --- V12 WELLNESS MODULES ---

export const getWellnessSettings = (): WellnessSettings => {
    try {
        const stored = localStorage.getItem(SETTINGS_KEY);
        return stored ? JSON.parse(stored) : { enableSleep: false, enableSteps: false, enableHabits: false };
    } catch {
        return { enableSleep: false, enableSteps: false, enableHabits: false };
    }
};

export const saveWellnessSettings = (settings: WellnessSettings) => {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
};

// Sleep
export const logSleep = (hours: number) => {
    const today = getTodayDateString();
    const stored = localStorage.getItem(SLEEP_KEY);
    const map = stored ? JSON.parse(stored) : {};
    map[today] = hours;
    localStorage.setItem(SLEEP_KEY, JSON.stringify(map));
};

export const getTodaySleep = (): number | null => {
    const today = getTodayDateString();
    const stored = localStorage.getItem(SLEEP_KEY);
    const map = stored ? JSON.parse(stored) : {};
    return map[today] || null;
};

// Steps
export const logSteps = (count: number) => {
    const today = getTodayDateString();
    const stored = localStorage.getItem(STEPS_KEY);
    const map = stored ? JSON.parse(stored) : {};
    map[today] = count;
    localStorage.setItem(STEPS_KEY, JSON.stringify(map));
};

export const getTodaySteps = (): number => {
    const today = getTodayDateString();
    const stored = localStorage.getItem(STEPS_KEY);
    const map = stored ? JSON.parse(stored) : {};
    return map[today] || 0;
};

// Habits
export const getHabits = (): Habit[] => {
    const stored = localStorage.getItem(HABITS_KEY);
    return stored ? JSON.parse(stored) : [];
};

export const addHabit = (title: string) => {
    const habits = getHabits();
    const newHabit: Habit = { id: Date.now().toString(), title };
    localStorage.setItem(HABITS_KEY, JSON.stringify([...habits, newHabit]));
};

export const deleteHabit = (id: string) => {
    const habits = getHabits();
    localStorage.setItem(HABITS_KEY, JSON.stringify(habits.filter(h => h.id !== id)));
};

export const toggleHabitForToday = (habitId: string) => {
    const today = getTodayDateString();
    const stored = localStorage.getItem(HABITS_LOG_KEY);
    let logs: HabitLog[] = stored ? JSON.parse(stored) : [];
    
    const exists = logs.find(l => l.date === today && l.habitId === habitId);
    if (exists) {
        logs = logs.filter(l => !(l.date === today && l.habitId === habitId));
    } else {
        logs.push({ date: today, habitId });
    }
    localStorage.setItem(HABITS_LOG_KEY, JSON.stringify(logs));
    return !exists; // returns true if checked, false if unchecked
};

export const getTodayHabitLogs = (): string[] => { // returns habit IDs
    const today = getTodayDateString();
    const stored = localStorage.getItem(HABITS_LOG_KEY);
    const logs: HabitLog[] = stored ? JSON.parse(stored) : [];
    return logs.filter(l => l.date === today).map(l => l.habitId);
};

// --- V11 GAMIFICATION LOGIC ---

export const getDailyBreakdown = (): DailyBreakdown => {
    const history = getUnifiedHistory();
    const startOfDay = new Date();
    startOfDay.setHours(0,0,0,0);

    // 1. Nutrition XP
    const todayMeals = history.filter((h): h is MealLog => 
        h.type === 'meal' && h.status === 'completed' && h.consumedAt !== undefined && h.consumedAt >= startOfDay.getTime()
    );
    const nutritionXP = todayMeals.reduce((acc, meal) => {
        if (meal.scoreValue !== undefined) return acc + meal.scoreValue;
        return acc + (meal.isHealthy ? 100 : -50);
    }, 0);

    // 2. Exercise XP
    const todayExercises = history.filter((h): h is ExerciseLog => 
        h.type === 'exercise' && h.timestamp >= startOfDay.getTime()
    );
    const exerciseMins = todayExercises.reduce((acc, ex) => acc + ex.duration, 0);
    const exerciseXP = exerciseMins * 5;

    // 3. Hydration XP
    const waterData = getWaterData();
    const hydrationXP = waterData.count * 25;

    return {
        nutrition: { 
            current: Math.max(0, nutritionXP), // Don't show negative progress bars
            max: 500, 
            percent: Math.min(Math.max(0, nutritionXP) / 500, 1),
            label: `${Math.max(0, nutritionXP)} XP`
        },
        exercise: { 
            current: exerciseXP, 
            max: 300, 
            percent: Math.min(exerciseXP / 300, 1),
            label: `${exerciseXP} XP`
        },
        hydration: { 
            current: hydrationXP, 
            max: 200, 
            percent: Math.min(hydrationXP / 200, 1),
            label: `${waterData.count}/8 Vasos`
        },
        totalXP: Math.max(0, nutritionXP) + exerciseXP + hydrationXP
    };
};

export const getDailyScore = (): number => {
    return getDailyBreakdown().totalXP;
};

export const getStreaks = (): Streaks => {
    const history = getUnifiedHistory();
    const waterHistory = getWaterHistory();
    const storedHabitLogs = localStorage.getItem(HABITS_LOG_KEY);
    const habitLogs: HabitLog[] = storedHabitLogs ? JSON.parse(storedHabitLogs) : [];

    const getStreakFor = (predicate: (dStr: string) => boolean): number => {
        let streak = 0;
        const d = new Date();
        d.setHours(0,0,0,0);

        // Check today first
        const tStr = getTodayDateString(d);
        if (predicate(tStr)) {
             streak = 1;
        }
        
        // Check previous days
        d.setDate(d.getDate() - 1);
        while(true) {
            const dStr = getTodayDateString(d);
            if (predicate(dStr)) {
                streak++;
                d.setDate(d.getDate() - 1);
            } else {
                if (streak === 0) {
                     const yesterdayStr = getTodayDateString(d);
                     if (predicate(yesterdayStr)) {
                         streak = 1;
                         d.setDate(d.getDate() - 1);
                         continue;
                     }
                }
                break;
            }
        }
        return streak;
    };

    const nutritionStreak = getStreakFor((dateStr) => {
         const dStart = new Date(dateStr).setHours(0,0,0,0);
         const dEnd = new Date(dateStr).setHours(23,59,59,999);
         return history.some(h => h.type === 'meal' && h.status === 'completed' && h.consumedAt! >= dStart && h.consumedAt! <= dEnd);
    });

    const exerciseStreak = getStreakFor((dateStr) => {
         const dStart = new Date(dateStr).setHours(0,0,0,0);
         const dEnd = new Date(dateStr).setHours(23,59,59,999);
         return history.some(h => h.type === 'exercise' && h.timestamp >= dStart && h.timestamp <= dEnd);
    });

    const hydrationStreak = getStreakFor((dateStr) => {
         return (waterHistory[dateStr] || 0) > 0;
    });

    const habitStreak = getStreakFor((dateStr) => {
        return habitLogs.some(l => l.date === dateStr);
    });

    return {
        nutrition: nutritionStreak,
        exercise: exerciseStreak,
        hydration: hydrationStreak,
        habits: habitStreak
    };
};

// --- V11 STATS LOGIC ---

export const getWeeklyDetailedStats = (): WeeklyStatsData[] => {
    const history = getUnifiedHistory();
    const waterHistory = getWaterHistory();
    const days: WeeklyStatsData[] = [];
    
    for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        d.setHours(0,0,0,0);
        const dateStr = getTodayDateString(d);
        
        const dailyLogs = history.filter(h => {
            const time = h.type === 'meal' ? h.consumedAt! : h.timestamp;
            if (!time) return false;
            return new Date(time).setHours(0,0,0,0) === d.getTime();
        });
        
        const nutritionXP = dailyLogs.reduce((acc, h) => {
             if (h.type === 'meal' && h.status === 'completed') {
                 if (h.scoreValue !== undefined) return acc + h.scoreValue;
                 return acc + (h.isHealthy ? 100 : -50);
             }
             return acc;
        }, 0);

        const exerciseMins = dailyLogs.reduce((acc, h) => {
            if (h.type === 'exercise') return acc + h.duration;
            return acc;
        }, 0);

        const waterCups = waterHistory[dateStr] || 0;

        days.push({
            day: d.toLocaleDateString('es-ES', { weekday: 'short' }),
            nutritionXP: Math.max(0, nutritionXP),
            exerciseMins,
            waterCups
        });
    }
    return days;
};

// --- V13 WELLNESS HISTORY LOGIC ---
export const getWeeklyWellnessHistory = () => {
    const sleepStore = localStorage.getItem(SLEEP_KEY);
    const sleepMap: Record<string, number> = sleepStore ? JSON.parse(sleepStore) : {};

    const stepsStore = localStorage.getItem(STEPS_KEY);
    const stepsMap: Record<string, number> = stepsStore ? JSON.parse(stepsStore) : {};

    const logsStore = localStorage.getItem(HABITS_LOG_KEY);
    const habitLogs: HabitLog[] = logsStore ? JSON.parse(logsStore) : [];

    const history = [];
    for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const dateStr = getTodayDateString(d);
        const dayName = d.toLocaleDateString('es-ES', { weekday: 'short' });

        // Count habits for this date
        const habitsCount = habitLogs.filter(l => l.date === dateStr).length;

        history.push({
            date: dateStr,
            dayName: dayName.charAt(0).toUpperCase() + dayName.slice(1),
            sleep: sleepMap[dateStr] || 0,
            steps: stepsMap[dateStr] || 0,
            completedHabits: habitsCount
        });
    }
    return history;
};


// --- BACKUP & RESTORE ---

export const exportFullData = () => {
    return {
        pantry: localStorage.getItem(PANTRY_KEY),
        recipes: localStorage.getItem(RECIPES_KEY),
        history: localStorage.getItem(HISTORY_KEY),
        water: localStorage.getItem(WATER_KEY),
        waterHistory: localStorage.getItem(WATER_HISTORY_KEY),
        chatHistory: localStorage.getItem(CHAT_HISTORY_KEY),
        settings: localStorage.getItem(SETTINGS_KEY),
        sleep: localStorage.getItem(SLEEP_KEY),
        steps: localStorage.getItem(STEPS_KEY),
        habits: localStorage.getItem(HABITS_KEY),
        habitLogs: localStorage.getItem(HABITS_LOG_KEY),
        meta: {
            timestamp: Date.now(),
            version: '12.0'
        }
    };
};

export const importFullData = (jsonData: any): boolean => {
    if (!jsonData) return false;
    try {
        if (jsonData.pantry) localStorage.setItem(PANTRY_KEY, jsonData.pantry);
        if (jsonData.recipes) localStorage.setItem(RECIPES_KEY, jsonData.recipes);
        if (jsonData.history) localStorage.setItem(HISTORY_KEY, jsonData.history);
        if (jsonData.water) localStorage.setItem(WATER_KEY, jsonData.water);
        if (jsonData.waterHistory) localStorage.setItem(WATER_HISTORY_KEY, jsonData.waterHistory);
        if (jsonData.chatHistory) localStorage.setItem(CHAT_HISTORY_KEY, jsonData.chatHistory);
        
        // V12 Restore
        if (jsonData.settings) localStorage.setItem(SETTINGS_KEY, jsonData.settings);
        if (jsonData.sleep) localStorage.setItem(SLEEP_KEY, jsonData.sleep);
        if (jsonData.steps) localStorage.setItem(STEPS_KEY, jsonData.steps);
        if (jsonData.habits) localStorage.setItem(HABITS_KEY, jsonData.habits);
        if (jsonData.habitLogs) localStorage.setItem(HABITS_LOG_KEY, jsonData.habitLogs);
        
        return true;
    } catch (e) {
        console.error("Error restoring backup", e);
        return false;
    }
};

export const getLastNightSleepHours = (): number | null => {
    try {
        const d = new Date();
        d.setDate(d.getDate() - 1); // Ayer
        const year = d.getFullYear();
        const month = d.getMonth() + 1; // getMonth es 0-indexado
        const day = d.getDate();
        // Asegura formato "YYYY-M-D" que usas en logSleep
        const yesterdayStr = `${year}-${month}-${day}`; 
        
        const stored = localStorage.getItem('nutri-flex-sleep'); // Usa tu clave SLEEP_KEY
        const map = stored ? JSON.parse(stored) : {};
        return map[yesterdayStr] || null;
    } catch { return null; }
};

export const getStreak = (): number => getStreaks().nutrition; 
export const getWeeklySummary = () => [];
